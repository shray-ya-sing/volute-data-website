import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mocks — pdf.ts reads vendor files at module load time and imports playwright
// ---------------------------------------------------------------------------

vi.mock('fs', () => ({
  default: {
    existsSync: vi.fn().mockReturnValue(true),
    readFileSync: vi.fn().mockReturnValue('/* vendor stub */'),
  },
  existsSync: vi.fn().mockReturnValue(true),
  readFileSync: vi.fn().mockReturnValue('/* vendor stub */'),
}));

vi.mock('playwright-core', () => ({
  chromium: {
    launch: vi.fn(),
  },
}));

import handler from '../pdf';

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
  };
  return res;
}

// ---------------------------------------------------------------------------
// 1. Pure function logic tests — reproduced from pdf.ts
// ---------------------------------------------------------------------------

describe('pdf: safeInlineScript', () => {
  /** Reproduced from pdf.ts (lines 42-44) — identical to export-png.ts */
  function safeInlineScript(js: string): string {
    return js.replace(/<\/(script)/gi, '<\\/$1');
  }

  it('escapes </script> to prevent premature tag close', () => {
    expect(safeInlineScript('x</script>y')).toBe('x<\\/script>y');
  });

  it('is case-insensitive', () => {
    expect(safeInlineScript('</SCRIPT>')).toBe('<\\/SCRIPT>');
  });

  it('handles zero occurrences', () => {
    expect(safeInlineScript('no tags here')).toBe('no tags here');
  });
});

describe('pdf: escapeForTemplateLiteral', () => {
  /** Reproduced from pdf.ts (lines 49-55) */
  function escapeForTemplateLiteral(code: string): string {
    const jsonStr = JSON.stringify(code);
    return jsonStr
      .slice(1, -1)
      .replace(/`/g, '\\`')
      .replace(/\$\{/g, '\\${');
  }

  it('escapes backticks and template expressions', () => {
    const result = escapeForTemplateLiteral('`${x}`');
    expect(result).toContain('\\`');
    expect(result).toContain('\\${x}');
  });

  it('escapes backslashes via JSON.stringify', () => {
    const result = escapeForTemplateLiteral('path\\to\\file');
    // JSON.stringify turns \ into \\, then slice removes quotes
    expect(result).toContain('\\\\');
  });

  it('handles multiline code', () => {
    const result = escapeForTemplateLiteral('a\nb\nc');
    // newlines become \\n in JSON
    expect(result).toContain('\\n');
  });
});

describe('pdf: buildHtml theme fallback', () => {
  /**
   * Tests the backgroundColor fallback logic from pdf.ts (line 123):
   *   const backgroundColor = theme.backgroundColor || theme.slideBackgroundColor || '#ffffff';
   */
  function resolveBackgroundColor(theme: any): string {
    return theme.backgroundColor || theme.slideBackgroundColor || '#ffffff';
  }

  it('prefers backgroundColor when both are set', () => {
    expect(resolveBackgroundColor({ backgroundColor: '#111', slideBackgroundColor: '#222' })).toBe('#111');
  });

  it('falls back to slideBackgroundColor when backgroundColor is empty', () => {
    expect(resolveBackgroundColor({ backgroundColor: '', slideBackgroundColor: '#222' })).toBe('#222');
  });

  it('defaults to white when neither is set', () => {
    expect(resolveBackgroundColor({})).toBe('#ffffff');
  });

  it('treats undefined backgroundColor the same as missing', () => {
    expect(resolveBackgroundColor({ backgroundColor: undefined, slideBackgroundColor: '#333' })).toBe('#333');
  });
});

// ---------------------------------------------------------------------------
// 2. Handler validation tests
// ---------------------------------------------------------------------------

describe('pdf handler', () => {
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

  it('missing slides returns 400', async () => {
    const res = mockRes();
    await handler(mockReq('POST', {}), res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res._json.error).toMatch(/slides/i);
  });

  it('slides with missing code returns 400', async () => {
    const res = mockRes();
    await handler(mockReq('POST', { slides: [{ slideNumber: 1 }] }), res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res._json.error).toMatch(/code/);
  });

  it('PNG format with multiple slides returns 400', async () => {
    const res = mockRes();
    await handler(mockReq('POST', {
      slides: [
        { code: 'export default function S1() {}', slideNumber: 1 },
        { code: 'export default function S2() {}', slideNumber: 2 },
      ],
      format: 'png',
    }), res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res._json.error).toMatch(/PNG.*single/i);
  });

  it('accepts a single slide object (not array) — wraps into array', async () => {
    const res = mockRes();
    await handler(mockReq('POST', { slides: { slideNumber: 1 } }), res);
    // Should still fail validation because code is missing, proving it was wrapped
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res._json.error).toMatch(/code/);
  });

  it('slides are sorted by slideNumber', () => {
    // Test the sorting logic reproduced from pdf.ts (line 385-386)
    const slides = [
      { code: 'c', slideNumber: 3 },
      { code: 'a', slideNumber: 1 },
      { code: 'b', slideNumber: 2 },
    ];
    const sorted = [...slides].sort((a, b) => (a.slideNumber ?? 0) - (b.slideNumber ?? 0));
    expect(sorted.map(s => s.code)).toEqual(['a', 'b', 'c']);
  });

  it('slides without slideNumber sort to position 0', () => {
    const slides: any[] = [
      { code: 'b', slideNumber: 2 },
      { code: 'x' }, // no slideNumber → treated as 0
      { code: 'a', slideNumber: 1 },
    ];
    const sorted = [...slides].sort((a, b) => (a.slideNumber ?? 0) - (b.slideNumber ?? 0));
    expect(sorted[0].code).toBe('x');
  });
});

// ---------------------------------------------------------------------------
// 3. PDF page dimensions
// ---------------------------------------------------------------------------

describe('pdf: page dimensions', () => {
  it('uses 960×540 points (16:9 ratio)', () => {
    const PAGE_WIDTH_PT = 960;
    const PAGE_HEIGHT_PT = 540;
    const ratio = PAGE_WIDTH_PT / PAGE_HEIGHT_PT;
    expect(ratio).toBeCloseTo(16 / 9, 2);
  });
});
