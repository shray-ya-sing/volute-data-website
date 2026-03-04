import Anthropic from '@anthropic-ai/sdk';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { randomUUID } from 'crypto';
import * as http from 'http';
import * as https from 'https';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type SupportedMediaType = 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp';

interface ImageInput {
  data: string;
  mediaType?: SupportedMediaType;
}

interface RequestBody {
  prompt: string;
  sessionId?: string;
  images?: ImageInput[];
}

interface SearchResultItem {
  score: number;
  metadata?: {
    url?: string;
    title?: string;
    text_preview?: string;
  };
  url?: string;
  title?: string;
}

interface SearchApiResponse {
  results?: SearchResultItem[];
}

// ---------------------------------------------------------------------------
// Vercel config
// ---------------------------------------------------------------------------

export const config = { maxDuration: 300 };

// ---------------------------------------------------------------------------
// Anthropic client
// ---------------------------------------------------------------------------

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ---------------------------------------------------------------------------
// Conversation history store
// ---------------------------------------------------------------------------

type ConversationHistory = Anthropic.MessageParam[];

const conversationStore = new Map<string, ConversationHistory>();
const MAX_HISTORY_PAIRS = 20;

function getHistory(sessionId: string): ConversationHistory {
  return conversationStore.get(sessionId) ?? [];
}

function saveHistory(sessionId: string, history: ConversationHistory): void {
  const maxEntries = MAX_HISTORY_PAIRS * 2;
  const trimmed =
    history.length > maxEntries
      ? history.slice(history.length - maxEntries)
      : history;
  conversationStore.set(sessionId, trimmed);
}

// ---------------------------------------------------------------------------
// SSE helper
// ---------------------------------------------------------------------------

function sendSSE(res: VercelResponse, payload: Record<string, unknown>): void {
  const line = `data: ${JSON.stringify(payload)}\n\n`;
  try {
    if (typeof (res as any).write === 'function') {
      (res as any).write(line);
    } else {
      console.error(
        '[agent] sendSSE: res.write is not a function.',
        'Payload was:', JSON.stringify(payload),
      );
    }
  } catch (err: any) {
    console.error('[agent] sendSSE write error:', err.message);
  }
}

// ---------------------------------------------------------------------------
// Search URL — local in dev, relative internal in prod (Vercel)
// ---------------------------------------------------------------------------

function getSearchUrl(): { protocol: 'http' | 'https'; hostname: string; port: number | null; path: string } {
  // Explicit env var always wins
  if (process.env.SEARCH_API_URL) {
    const u = new URL(process.env.SEARCH_API_URL);
    return {
      protocol: u.protocol === 'https:' ? 'https' : 'http',
      hostname: u.hostname,
      port: u.port ? parseInt(u.port) : null,
      path: u.pathname,
    };
  }

  // In Vercel, call the search endpoint on the same deployment internally.
  // VERCEL_URL points to preview deployments which may have auth enabled,
  // so we use the production domain instead.
  if (process.env.VERCEL) {
    return {
      protocol: 'https',
      hostname: 'www.getvolute.com',
      port: null,
      path: '/api/search',
    };
  }

  // Local development
  return {
    protocol: 'http',
    hostname: 'localhost',
    port: 3001,
    path: '/api/search',
  };
}


// ---------------------------------------------------------------------------
// Vector search tool — uses http/https module to avoid Node fetch bugs
// ---------------------------------------------------------------------------

async function vectorSearch(query: string): Promise<string> {
  const target = getSearchUrl();
  const fullUrl = `${target.protocol}://${target.hostname}${target.port ? ':' + target.port : ''}${target.path}`;
  console.log(`[agent] 🔍 vectorSearch → "${query}" | endpoint: ${fullUrl}`);
  const t0 = Date.now();

  return new Promise((resolve) => {
    const bodyStr = JSON.stringify({
      query,
      topK: 10,
      useReranking: true,
    });
    const byteLen = Buffer.byteLength(bodyStr, 'utf8');

    console.log(`[agent] 🔍 body: ${bodyStr.length} chars | ${byteLen} bytes`);

    const requestOptions: http.RequestOptions = {
      hostname: target.hostname,
      port: target.port ?? (target.protocol === 'https' ? 443 : 80),
      path: target.path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': byteLen,
      },
    };

    const transport = target.protocol === 'https' ? https : http;

    const req = transport.request(requestOptions, (httpRes) => {
      const status = httpRes.statusCode ?? 0;

      // Handle redirects (301, 302, 307, 308)
      if ([301, 302, 307, 308].includes(status)) {
        const location = httpRes.headers['location'];
        httpRes.resume(); // drain response body

        console.log(`[agent] 🔍 ${status} redirect → ${location}`);

        if (!location) {
          resolve('Error searching database: redirect with no Location header');
          return;
        }

        // Follow the redirect with a fresh request
        followRedirect(location, bodyStr, byteLen, t0, query, 0)
          .then(resolve);
        return;
      }

      // Normal response
      let data = '';
      httpRes.setEncoding('utf8');
      httpRes.on('data', (chunk) => { data += chunk; });
      httpRes.on('end', () => {
        resolve(parseSearchResponse(data, status, t0, query));
      });
    });

    req.on('error', (err: any) => {
      console.error(
        `[agent] 🔍 request error: ${err.message}` +
        `\n         code:     ${err.code ?? 'none'}` +
        `\n         endpoint: ${fullUrl}` +
        `\n         query:    "${query}"`,
      );
      resolve(`Error searching database: ${err.message}`);
    });

    req.write(bodyStr, 'utf8');
    req.end();
  });
}

// ---------------------------------------------------------------------------
// Redirect follower (max 5 hops)
// ---------------------------------------------------------------------------

function followRedirect(
  location: string,
  bodyStr: string,
  byteLen: number,
  t0: number,
  query: string,
  depth: number,
): Promise<string> {
  const MAX_REDIRECTS = 5;

  if (depth >= MAX_REDIRECTS) {
    return Promise.resolve(`Error searching database: too many redirects (${MAX_REDIRECTS})`);
  }

  return new Promise((resolve) => {
    let targetUrl: URL;
    try {
      targetUrl = new URL(location);
    } catch {
      // Relative path redirect
      targetUrl = new URL(location, `https://www.getvolute.com`);
    }

    const proto = targetUrl.protocol === 'https:' ? 'https' : 'http';
    const transport = proto === 'https' ? https : http;

    console.log(
      `[agent] 🔍 following redirect ${depth + 1}/${MAX_REDIRECTS}: ${targetUrl.href}`,
    );

    const req = transport.request(
      {
        hostname: targetUrl.hostname,
        port: targetUrl.port || (proto === 'https' ? 443 : 80),
        path: targetUrl.pathname + targetUrl.search,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': byteLen,
        },
      },
      (httpRes) => {
        const status = httpRes.statusCode ?? 0;

        if ([301, 302, 307, 308].includes(status)) {
          const nextLocation = httpRes.headers['location'];
          httpRes.resume();

          console.log(`[agent] 🔍 ${status} redirect → ${nextLocation}`);

          if (!nextLocation) {
            resolve('Error searching database: redirect with no Location header');
            return;
          }

          followRedirect(nextLocation, bodyStr, byteLen, t0, query, depth + 1)
            .then(resolve);
          return;
        }

        let data = '';
        httpRes.setEncoding('utf8');
        httpRes.on('data', (chunk) => { data += chunk; });
        httpRes.on('end', () => {
          resolve(parseSearchResponse(data, status, t0, query));
        });
      },
    );

    req.on('error', (err: any) => {
      console.error(`[agent] 🔍 redirect request error: ${err.message}`);
      resolve(`Error searching database: ${err.message}`);
    });

    req.write(bodyStr, 'utf8');
    req.end();
  });
}

// ---------------------------------------------------------------------------
// Parse the search API JSON response into a formatted string
// ---------------------------------------------------------------------------

function parseSearchResponse(
  data: string,
  status: number,
  t0: number,
  query: string,
): string {
  try {
    console.log(`[agent] 🔍 HTTP ${status} | body: ${data.length} chars`);

    if (status !== 200) {
      console.error(`[agent] 🔍 Search API error ${status}: ${data.slice(0, 300)}`);
      return `Error searching database: HTTP ${status}`;
    }

    const result = JSON.parse(data) as SearchApiResponse;
    const results = result.results ?? [];

    console.log(
      `[agent] 🔍 vectorSearch ← ${results.length} results in ${Date.now() - t0}ms`,
    );

    if (results.length === 0) {
      return 'No results found for that query.';
    }

    const formatted = results
      .map((item, idx) => {
        const title   = item.metadata?.title        ?? item.title ?? 'Untitled';
        const url     = item.metadata?.url          ?? item.url   ?? '';
        const preview = item.metadata?.text_preview ?? '';
        const score   = ((item.score ?? 0) * 100).toFixed(1);

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

    console.log(
      `[agent] 🔍 first result: "${results[0]?.metadata?.title ?? 'n/a'}"` +
      ` | formatted: ${formatted.length} chars`,
    );

    return `Found ${results.length} relevant sources:\n\n${formatted}`;
  } catch (parseErr: any) {
    console.error(
      `[agent] 🔍 JSON parse error: ${parseErr.message}` +
      `\n         raw: ${data.slice(0, 300)}` +
      `\n         query: "${query}"`,
    );
    return `Error parsing search response: ${parseErr.message}`;
  }
}

// ---------------------------------------------------------------------------
// Tool definitions
// ---------------------------------------------------------------------------

const tools: Anthropic.Tool[] = [
  {
    name: 'vector_search',
    description:
      'Search the Volute IPO and SPAC news and financial data database. ' +
      'Returns relevant articles, filings, and research findings. ' +
      'Use this tool to gather data before performing any financial analysis ' +
      'or building any deliverable. Call it multiple times with different ' +
      'queries to build a complete picture.',
    input_schema: {
      type: 'object' as const,
      properties: {
        query: {
          type: 'string',
          description:
            'A precise search query to find relevant financial information, ' +
            'company data, market trends, or news.',
        },
      },
      required: ['query'],
    },
  },
];

// ---------------------------------------------------------------------------
// Tool executor
// ---------------------------------------------------------------------------

interface ToolInput {
  query?: string;
  [key: string]: unknown;
}

async function executeTool(name: string, input: ToolInput): Promise<string> {
  console.log(`[agent] ⚙️  executeTool: ${name}`, JSON.stringify(input));

  switch (name) {
    case 'vector_search': {
      if (!input.query || typeof input.query !== 'string') {
        return 'Error: vector_search requires a "query" string parameter.';
      }
      return vectorSearch(input.query);
    }
    default: {
      console.warn(`[agent] ⚠️  Unknown tool requested: ${name}`);
      return `Unknown tool: ${name}`;
    }
  }
}

// ---------------------------------------------------------------------------
// System prompt
// ---------------------------------------------------------------------------

const SYSTEM_PROMPT = `You are Volute's master financial analyst agent. Volute is a professional application for analyzing financial data and creating polished deliverables — reports, presentations, memos, and dashboards — for investment banking and private equity professionals.

## Your responsibilities
- Understand and interpret financial data, metrics, and documents shared by the user
- Use the vector_search tool to retrieve relevant data from the Volute database before answering analytical questions
- Help the user plan and create high-quality financial deliverables
- Ask clarifying questions when the user's intent is ambiguous
- Maintain context across a multi-turn conversation

## How to use vector_search
- Call it proactively whenever the user asks about a company, deal, market, or financial topic
- Run multiple searches with varied queries to triangulate complete information
- Synthesise results across multiple searches before responding
- Reference source titles or URLs when citing data so the user can verify

## Tone and style
Professional, concise, and analytical. Lead with the most important insight. Avoid filler phrases. Prioritise accuracy — if data is unavailable, say so clearly rather than speculating.

## Images
When the user shares images (charts, tables, screenshots of financial statements), describe what you observe and incorporate those observations into your analysis.`;

// ---------------------------------------------------------------------------
// Streaming agent loop
// ---------------------------------------------------------------------------

async function runStreamingAgentLoop(
  history: ConversationHistory,
  res: VercelResponse,
  sessionId: string,
  isNewSession: boolean,
): Promise<ConversationHistory> {
  let currentHistory = [...history];

  for (let iteration = 0; iteration < 10; iteration++) {
    console.log(
      `[agent] ── loop iteration ${iteration + 1} | ` +
      `history: ${currentHistory.length} msgs`,
    );

    console.log('[agent] 📡 Opening Claude stream...');
    const t0 = Date.now();

    const stream = anthropic.messages.stream({
      model: 'claude-sonnet-4-6',
      max_tokens: 8096,
      system: [
        {
          type: 'text',
          text: SYSTEM_PROMPT,
          cache_control: { type: 'ephemeral' },
        },
      ],
      tools,
      messages: currentHistory,
    });

    let textChunkCount = 0;
    stream.on('text', (delta) => {
      textChunkCount++;
      sendSSE(res, { type: 'text_delta', delta });
    });

    stream.on('error', (err) => {
      console.error('[agent] Stream error event:', err.message);
    });

    const message = await stream.finalMessage();

    console.log(
      `[agent] 📡 Stream complete in ${Date.now() - t0}ms | ` +
      `stop_reason: ${message.stop_reason} | ` +
      `text_chunks: ${textChunkCount} | ` +
      `input_tokens: ${message.usage.input_tokens} | ` +
      `output_tokens: ${message.usage.output_tokens}`,
    );

    currentHistory.push({ role: 'assistant', content: message.content });

    // End turn
    if (message.stop_reason === 'end_turn') {
      console.log(`[agent] ✅ end_turn after ${iteration + 1} iteration(s)`);

      sendSSE(res, {
        type: 'done',
        sessionId,
        isNewSession,
        historyLength: currentHistory.length,
      });

      return currentHistory;
    }

    // Tool use
    if (message.stop_reason === 'tool_use') {
      const toolUseBlocks = message.content.filter(
        (block): block is Anthropic.ToolUseBlock => block.type === 'tool_use',
      );

      console.log(
        `[agent] 🛠  tool_use: [${toolUseBlocks.map(b => b.name).join(', ')}]`,
      );

      if (toolUseBlocks.length === 0) {
        console.warn('[agent] stop_reason=tool_use but no tool_use blocks — breaking');
        break;
      }

      const toolResults = await Promise.all(
        toolUseBlocks.map(async (toolUse) => {
          console.log(`[agent] 🛠  executing: ${toolUse.name} | id: ${toolUse.id}`);

          sendSSE(res, {
            type: 'tool_start',
            name: toolUse.name,
            input: toolUse.input,
          });

          const t1 = Date.now();
          const result = await executeTool(toolUse.name, toolUse.input as ToolInput);

          console.log(
            `[agent] 🛠  ${toolUse.name} completed in ${Date.now() - t1}ms | ` +
            `result length: ${result.length} chars`,
          );

          sendSSE(res, {
            type: 'tool_result',
            name: toolUse.name,
            preview: result.slice(0, 150) + (result.length > 150 ? '…' : ''),
          });

          return {
            type: 'tool_result' as const,
            tool_use_id: toolUse.id,
            content: result,
          };
        }),
      );

      currentHistory.push({ role: 'user', content: toolResults });
      continue;
    }

    console.warn(`[agent] ⚠️  Unexpected stop_reason: ${message.stop_reason} — breaking`);
    break;
  }

  console.warn('[agent] ⚠️  Agent loop exited without end_turn');
  sendSSE(res, {
    type: 'done',
    sessionId,
    isNewSession,
    historyLength: currentHistory.length,
  });

  return currentHistory;
}

// ---------------------------------------------------------------------------
// Request handler
// ---------------------------------------------------------------------------

const SUPPORTED_MEDIA_TYPES: SupportedMediaType[] = [
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
];

export default async function handler(req: VercelRequest, res: VercelResponse) {
  console.log(`[agent] ${req.method} /api/agent`);

  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { prompt, sessionId: incomingSessionId, images = [] } =
    req.body as RequestBody;

  if (!prompt || typeof prompt !== 'string' || prompt.trim() === '') {
    return res.status(400).json({
      error: '`prompt` is required and must be a non-empty string.',
    });
  }

  if (!Array.isArray(images)) {
    return res.status(400).json({ error: '`images` must be an array.' });
  }

  const sessionId = incomingSessionId ?? randomUUID();
  const isNewSession = !incomingSessionId || !conversationStore.has(incomingSessionId);

  console.log(
    `[agent] Session: ${sessionId} (${isNewSession ? 'NEW' : 'existing'}) | ` +
    `prompt length: ${prompt.length} | images: ${images.length}`,
  );

  // SSE stream
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  if (typeof (res as any).flushHeaders === 'function') {
    (res as any).flushHeaders();
  }

  try {
    const history = getHistory(sessionId);

    const userContent: Anthropic.MessageParam['content'] = [];

    for (let i = 0; i < images.length; i++) {
      const img = images[i];
      let rawBase64 = img.data;
      let detectedMediaType: SupportedMediaType | undefined;

      const dataUriMatch = rawBase64.match(/^data:([^;]+);base64,(.+)$/s);
      if (dataUriMatch) {
        detectedMediaType = dataUriMatch[1] as SupportedMediaType;
        rawBase64 = dataUriMatch[2];
      }

      const mediaType: SupportedMediaType =
        img.mediaType ?? detectedMediaType ?? 'image/png';

      if (!SUPPORTED_MEDIA_TYPES.includes(mediaType)) {
        sendSSE(res, {
          type: 'error',
          message: `Unsupported media type "${mediaType}" for image at index ${i}.`,
        });
        return res.end();
      }

      console.log(
        `[agent] Image ${i + 1}/${images.length}: ${mediaType} | ` +
        `${rawBase64.length} base64 chars`,
      );

      userContent.push({
        type: 'image',
        source: { type: 'base64', media_type: mediaType, data: rawBase64 },
      });
    }

    userContent.push({ type: 'text', text: prompt.trim() });
    history.push({ role: 'user', content: userContent });

    const updatedHistory = await runStreamingAgentLoop(
      history,
      res,
      sessionId,
      isNewSession,
    );

    saveHistory(sessionId, updatedHistory);
    console.log(
      `[agent] ✅ Request complete | session: ${sessionId} | ` +
      `history: ${updatedHistory.length} msgs`,
    );

    return res.end();
  } catch (error: unknown) {
    const err = error as Error & { status?: number };
    console.error('[agent] ❌ Unhandled error:', err.message);
    console.error('[agent] Stack:', err.stack);

    sendSSE(res, {
      type: 'error',
      message: err.message ?? 'An unexpected error occurred.',
    });
    return res.end();
  }
}