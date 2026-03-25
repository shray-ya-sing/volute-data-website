// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mocks — must be before imports
// ---------------------------------------------------------------------------

vi.mock('@anthropic-ai/sdk', () => ({
  default: class MockAnthropic {
    messages = { stream: vi.fn() };
  },
}));

vi.mock('../generate-slide', () => ({
  default: vi.fn(),
}));

import handler from '../agent-websearch';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mockReq(method: string, body?: any): any {
  return { method, headers: { 'content-type': 'application/json' }, body: body ?? {}, query: {} };
}

function mockRes(): any {
  const res: any = {
    _status: 200,
    _json: null as any,
    _headers: {} as Record<string, string>,
    setHeader: vi.fn().mockImplementation((_k: string, _v: string) => res),
    status: vi.fn().mockImplementation((code: number) => { res._status = code; return res; }),
    json: vi.fn().mockImplementation((data: any) => { res._json = data; return res; }),
    end: vi.fn().mockReturnValue(undefined),
    send: vi.fn().mockReturnValue(undefined),
    write: vi.fn(),
    flushHeaders: vi.fn(),
  };
  return res;
}

// ---------------------------------------------------------------------------
// 1. Internal logic tests — reproduced from agent-websearch.ts
// ---------------------------------------------------------------------------

describe('agent-websearch: saveHistory trimming logic', () => {
  const MAX_HISTORY_PAIRS = 20;

  /**
   * Reproduces saveHistory's trimming logic from agent-websearch.ts (lines 99-125).
   * Returns the trimmed history array.
   */
  function trimHistory(history: any[]): any[] {
    const maxEntries = MAX_HISTORY_PAIRS * 2;
    if (history.length <= maxEntries) return history;

    let startIdx = history.length - maxEntries;
    while (startIdx < history.length) {
      const msg = history[startIdx];
      const hasToolResult =
        Array.isArray(msg.content) &&
        msg.content.some((b: any) => b.type === 'tool_result');
      if (msg.role === 'user' && !hasToolResult) break;
      startIdx++;
    }
    return history.slice(startIdx);
  }

  it('does not trim when history is within the limit', () => {
    const history = Array.from({ length: 10 }, (_, i) => ({
      role: i % 2 === 0 ? 'user' : 'assistant',
      content: 'hello',
    }));
    expect(trimHistory(history)).toHaveLength(10);
  });

  it('trims from the front, preserving the most recent entries', () => {
    const history = Array.from({ length: 50 }, (_, i) => ({
      role: i % 2 === 0 ? 'user' : 'assistant',
      content: `msg-${i}`,
    }));
    const trimmed = trimHistory(history);
    expect(trimmed.length).toBeLessThanOrEqual(MAX_HISTORY_PAIRS * 2);
    expect(trimmed[trimmed.length - 1].content).toBe('msg-49');
  });

  it('skips messages with tool_result to avoid dangling tool results', () => {
    const history: any[] = [];
    // Build 42 messages where the first two after the trim point have tool_results
    for (let i = 0; i < 42; i++) {
      if (i === 2) {
        // This would be the trim start (42 - 40 = 2)
        history.push({
          role: 'user',
          content: [{ type: 'tool_result', tool_use_id: 'x' }],
        });
      } else if (i === 3) {
        history.push({
          role: 'assistant',
          content: [{ type: 'tool_use', id: 'y' }],
        });
      } else {
        history.push({
          role: i % 2 === 0 ? 'user' : 'assistant',
          content: `msg-${i}`,
        });
      }
    }
    const trimmed = trimHistory(history);
    // The first message should be a safe user message (no tool_result)
    const first = trimmed[0];
    if (Array.isArray(first.content)) {
      expect(first.content.some((b: any) => b.type === 'tool_result')).toBe(false);
    }
  });

  it('BUG: returns empty array if ALL remaining messages have tool_results', () => {
    // Edge case: if every message from trim point onward is assistant or
    // user-with-tool-result, startIdx reaches history.length and slice returns [].
    // This means the entire conversation history can be lost.
    const history: any[] = [];
    for (let i = 0; i < 42; i++) {
      history.push({
        role: i % 2 === 0 ? 'user' : 'assistant',
        content: [{ type: 'tool_result', tool_use_id: `t${i}` }],
      });
    }
    const trimmed = trimHistory(history);
    // This demonstrates the potential bug: all history lost
    expect(trimmed).toHaveLength(0);
  });
});

describe('agent-websearch: trackSourcesFromSearchResult', () => {
  /**
   * Reproduces the source tracking logic from agent-websearch.ts (lines 201-231).
   */
  function trackSources(existing: any[], searchResultText: string): any[] {
    const seen = new Set(existing.map((s: any) => s.url));
    let nextId = existing.length > 0
      ? existing.reduce((max: number, s: any) => (s.id > max ? s.id : max), 0) + 1
      : 1;

    const sourceRegex =
      /\[Source \d+\]\nTitle: (.+)\n(?:URL: (.+)\n)?Content: ([\s\S]*?)\nRelevance: (.+)%/g;
    let match;

    while ((match = sourceRegex.exec(searchResultText)) !== null) {
      const url = match[2]?.trim() ?? '';
      const title = match[1]?.trim() ?? 'Untitled';
      if (!url || seen.has(url)) continue;
      seen.add(url);
      existing.push({
        id: nextId++,
        title,
        url,
        relevance: match[4].trim(),
        textPreview: match[3].trim().slice(0, 300),
      });
    }
    return existing;
  }

  it('parses well-formed search results', () => {
    const text =
      '[Source 1]\nTitle: Company Report\nURL: https://example.com/report\n' +
      'Content: Some preview text here\nRelevance: 85.3%\n---';
    const sources = trackSources([], text);
    expect(sources).toHaveLength(1);
    expect(sources[0].title).toBe('Company Report');
    expect(sources[0].url).toBe('https://example.com/report');
    expect(sources[0].relevance).toBe('85.3');
  });

  it('skips entries without a URL', () => {
    const text =
      '[Source 1]\nTitle: No URL Entry\nContent: Just content\nRelevance: 50.0%\n---';
    const sources = trackSources([], text);
    expect(sources).toHaveLength(0);
  });

  it('deduplicates URLs across calls', () => {
    const existing = [{ id: 1, title: 'Existing', url: 'https://dup.com', relevance: '90', textPreview: '' }];
    const text =
      '[Source 1]\nTitle: Dup\nURL: https://dup.com\nContent: xxx\nRelevance: 80.0%\n---\n\n' +
      '[Source 2]\nTitle: New\nURL: https://new.com\nContent: yyy\nRelevance: 70.0%\n---';
    const sources = trackSources(existing, text);
    // Should add only the new one, not the duplicate
    expect(sources).toHaveLength(2);
    expect(sources[1].url).toBe('https://new.com');
    expect(sources[1].id).toBe(2);
  });

  it('truncates textPreview to 300 characters', () => {
    const longContent = 'A'.repeat(500);
    const text =
      `[Source 1]\nTitle: Long\nURL: https://long.com\nContent: ${longContent}\nRelevance: 60.0%\n---`;
    const sources = trackSources([], text);
    expect(sources[0].textPreview.length).toBeLessThanOrEqual(300);
  });
});

describe('agent-websearch: parseSearchResponse', () => {
  /**
   * Reproduces parseSearchResponse from agent-websearch.ts (lines 534-572).
   */
  function parseSearchResponse(data: string, status: number, _t0: number, _query: string): string {
    try {
      if (status !== 200) return `Error searching database: HTTP ${status}`;

      const result = JSON.parse(data);
      const results = result.results ?? [];

      if (results.length === 0) return 'No results found for that query.';

      const formatted = results
        .map((item: any, idx: number) => {
          const title = item.metadata?.title ?? item.title ?? 'Untitled';
          const url = item.metadata?.url ?? item.url ?? '';
          const preview = item.metadata?.text_preview ?? '';
          const score = ((item.score ?? 0) * 100).toFixed(1);

          return [
            `[Source ${idx + 1}]`,
            `Title: ${title}`,
            url ? `URL: ${url}` : null,
            `Content: ${preview}`,
            `Relevance: ${score}%`,
            '---',
          ]
            .filter(Boolean)
            .join('\n');
        })
        .join('\n\n');

      return `Found ${results.length} relevant sources:\n\n${formatted}`;
    } catch (parseErr: any) {
      return `Error parsing search response: ${parseErr.message}`;
    }
  }

  it('returns error for non-200 status', () => {
    expect(parseSearchResponse('{}', 500, 0, '')).toBe('Error searching database: HTTP 500');
  });

  it('returns "No results" for empty results array', () => {
    expect(parseSearchResponse('{"results":[]}', 200, 0, '')).toBe('No results found for that query.');
  });

  it('returns "No results" when results key is missing', () => {
    expect(parseSearchResponse('{}', 200, 0, '')).toBe('No results found for that query.');
  });

  it('formats results with title, URL, content, and relevance', () => {
    const data = JSON.stringify({
      results: [
        { metadata: { title: 'Test', url: 'https://t.com', text_preview: 'Preview' }, score: 0.85 },
      ],
    });
    const output = parseSearchResponse(data, 200, 0, '');
    expect(output).toContain('Found 1 relevant sources');
    expect(output).toContain('[Source 1]');
    expect(output).toContain('Title: Test');
    expect(output).toContain('URL: https://t.com');
    expect(output).toContain('Relevance: 85.0%');
  });

  it('omits URL line when URL is empty', () => {
    const data = JSON.stringify({ results: [{ score: 0.5 }] });
    const output = parseSearchResponse(data, 200, 0, '');
    expect(output).not.toContain('URL:');
    expect(output).toContain('Title: Untitled');
  });

  it('handles missing score gracefully (defaults to 0)', () => {
    const data = JSON.stringify({ results: [{ metadata: { title: 'X' } }] });
    const output = parseSearchResponse(data, 200, 0, '');
    expect(output).toContain('Relevance: 0.0%');
  });

  it('handles invalid JSON', () => {
    const output = parseSearchResponse('not json', 200, 0, '');
    expect(output).toContain('Error parsing search response');
  });
});

describe('agent-websearch: getSearchUrl logic', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  /**
   * Reproduces getSearchUrl from agent-websearch.ts (lines 237-263).
   */
  function getSearchUrl(): { protocol: string; hostname: string; port: number | null; path: string } {
    if (process.env.SEARCH_API_URL) {
      const u = new URL(process.env.SEARCH_API_URL);
      return {
        protocol: u.protocol === 'https:' ? 'https' : 'http',
        hostname: u.hostname,
        port: u.port ? parseInt(u.port) : null,
        path: u.pathname,
      };
    }
    if (process.env.VERCEL) {
      return { protocol: 'https', hostname: 'www.getvolute.com', port: null, path: '/api/websearch' };
    }
    return { protocol: 'http', hostname: 'localhost', port: 3001, path: '/api/websearch' };
  }

  it('uses SEARCH_API_URL when set', () => {
    process.env.SEARCH_API_URL = 'https://custom.host:8080/custom-path';
    const result = getSearchUrl();
    expect(result.protocol).toBe('https');
    expect(result.hostname).toBe('custom.host');
    expect(result.port).toBe(8080);
    expect(result.path).toBe('/custom-path');
  });

  it('returns null port when SEARCH_API_URL has no port', () => {
    process.env.SEARCH_API_URL = 'https://custom.host/api';
    const result = getSearchUrl();
    expect(result.port).toBeNull();
  });

  it('falls back to Vercel defaults when VERCEL env is set', () => {
    delete process.env.SEARCH_API_URL;
    process.env.VERCEL = '1';
    const result = getSearchUrl();
    expect(result.hostname).toBe('www.getvolute.com');
    expect(result.protocol).toBe('https');
  });

  it('falls back to localhost:3001 in dev', () => {
    delete process.env.SEARCH_API_URL;
    delete process.env.VERCEL;
    const result = getSearchUrl();
    expect(result.hostname).toBe('localhost');
    expect(result.port).toBe(3001);
  });
});

// ---------------------------------------------------------------------------
// 2. Handler validation tests
// ---------------------------------------------------------------------------

describe('agent-websearch handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('OPTIONS returns 200', async () => {
    const res = mockRes();
    await handler(mockReq('OPTIONS'), res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.end).toHaveBeenCalled();
  });

  it('GET returns 405', async () => {
    const res = mockRes();
    await handler(mockReq('GET'), res);
    expect(res.status).toHaveBeenCalledWith(405);
  });

  it('missing prompt returns 400', async () => {
    const res = mockRes();
    await handler(mockReq('POST', {}), res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res._json.error).toMatch(/prompt/);
  });

  it('empty string prompt returns 400', async () => {
    const res = mockRes();
    await handler(mockReq('POST', { prompt: '   ' }), res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('non-string prompt returns 400', async () => {
    const res = mockRes();
    await handler(mockReq('POST', { prompt: 123 }), res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('images as non-array returns 400', async () => {
    const res = mockRes();
    await handler(mockReq('POST', { prompt: 'test', images: 'not-array' }), res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res._json.error).toMatch(/images.*array/i);
  });

  it('imageRefs as non-array returns 400', async () => {
    const res = mockRes();
    await handler(mockReq('POST', { prompt: 'test', imageRefs: 'not-array' }), res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res._json.error).toMatch(/imageRefs.*array/i);
  });
});

// ---------------------------------------------------------------------------
// 3. SSE helper logic
// ---------------------------------------------------------------------------

describe('agent-websearch: sendSSE logic', () => {
  /**
   * Reproduces sendSSE from agent-websearch.ts (lines 131-142).
   */
  function sendSSE(res: any, payload: Record<string, unknown>): void {
    const line = `data: ${JSON.stringify(payload)}\n\n`;
    try {
      if (typeof res.write === 'function') {
        res.write(line);
      }
    } catch {
      // silently catch write errors
    }
  }

  it('writes data in SSE format', () => {
    const res = { write: vi.fn() };
    sendSSE(res, { type: 'text_delta', delta: 'hello' });
    expect(res.write).toHaveBeenCalledWith(
      expect.stringContaining('data: {"type":"text_delta","delta":"hello"}'),
    );
  });

  it('does not throw when res.write is not a function', () => {
    const res = { write: 'not-a-function' };
    expect(() => sendSSE(res, { type: 'test' })).not.toThrow();
  });
});
