import Anthropic from '@anthropic-ai/sdk';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { randomUUID } from 'crypto';
import * as http from 'http';
import * as https from 'https';

// Import the slide generation handler directly — no HTTP call needed
import generateSlideHandler from './generate-slide.js';

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

interface SlideTheme {
  headingFont?: string;
  bodyFont?: string;
  accentColors?: string[];
  headingTextColor?: string;
  bodyTextColor?: string;
  headingFontSize?: number;
  bodyFontSize?: number;
}

interface CreateOrEditSlideInput {
  prompt: string;
  slideNumber?: number;
  context?: string;
  theme?: SlideTheme;
  existingCode?: string;
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
// Source tracking — maps citation IDs to source metadata across tool calls
// ---------------------------------------------------------------------------

interface TrackedSource {
  id: number;
  title: string;
  url: string;
  relevance: string;
  textPreview: string;
}

// Per-session source tracking so citation IDs are stable across a conversation
const sessionSourcesStore = new Map<string, TrackedSource[]>();

function getSessionSources(sessionId: string): TrackedSource[] {
  return sessionSourcesStore.get(sessionId) ?? [];
}

function trackSourcesFromSearchResult(
  sessionId: string,
  searchResultText: string,
): TrackedSource[] {
  const existing = getSessionSources(sessionId);
  const seen = new Set(existing.map(s => s.url));
  let nextId = existing.length > 0 ? Math.max(...existing.map(s => s.id)) + 1 : 1;

  // Updated regex: URL line is optional (non-capturing group with ?)
  const sourceRegex =
    /\[Source \d+\]\nTitle: (.+)\n(?:URL: (.+)\n)?Content: ([\s\S]*?)\nRelevance: (.+)%/g;
  let match;

  while ((match = sourceRegex.exec(searchResultText)) !== null) {
    const url = match[2]?.trim() ?? '';
    const title = match[1]?.trim() ?? 'Untitled';

    // Skip entries with no URL — can't link to them
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

  sessionSourcesStore.set(sessionId, existing);
  return existing;
}
// ---------------------------------------------------------------------------
// Search URL — local in dev, production domain in Vercel
// ---------------------------------------------------------------------------

function getSearchUrl(): { protocol: 'http' | 'https'; hostname: string; port: number | null; path: string } {
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
    return {
      protocol: 'https',
      hostname: 'www.getvolute.com',
      port: null,
      path: '/api/search',
    };
  }

  return {
    protocol: 'http',
    hostname: 'localhost',
    port: 3001,
    path: '/api/search',
  };
}

// ---------------------------------------------------------------------------
// Vector search tool
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

      if ([301, 302, 307, 308].includes(status)) {
        const location = httpRes.headers['location'];
        httpRes.resume();
        console.log(`[agent] 🔍 ${status} redirect → ${location}`);

        if (!location) {
          resolve('Error searching database: redirect with no Location header');
          return;
        }

        followRedirect(location, bodyStr, byteLen, t0, query, 0).then(resolve);
        return;
      }

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
// Redirect follower
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

          followRedirect(nextLocation, bodyStr, byteLen, t0, query, depth + 1).then(resolve);
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
// Parse search API JSON response
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
// Slide generation/editing — calls generate-slide handler directly
// ---------------------------------------------------------------------------

async function createOrEditSlide(input: CreateOrEditSlideInput): Promise<string> {
  const isEdit = !!input.existingCode;
  const action = isEdit ? 'editing' : 'creating';

  console.log(
    `[agent] 🎨 createOrEditSlide (${action}) → prompt: "${input.prompt.slice(0, 80)}..." | ` +
    `slide: ${input.slideNumber ?? 1}`,
  );
  const t0 = Date.now();

  // When editing, prepend the existing code to the prompt so the slide
  // generator sees it as context and produces a modified version
  let fullPrompt = input.prompt;
  if (isEdit && input.existingCode) {
    fullPrompt =
      `EDIT THE FOLLOWING EXISTING SLIDE CODE. Apply the requested changes while preserving ` +
      `the overall structure, layout approach, and data that should remain unchanged. ` +
      `Return the COMPLETE updated component — do not return a partial diff.\n\n` +
      `## Existing slide code:\n\`\`\`tsx\n${input.existingCode}\n\`\`\`\n\n` +
      `## Requested changes:\n${input.prompt}`;
  }

  return new Promise((resolve) => {
    const mockReq = {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: {
        prompt: fullPrompt,
        slideNumber: input.slideNumber ?? 1,
        context: input.context ?? '',
        theme: input.theme ?? {},
        images: [],
      },
    } as any;

    const mockRes = {
      statusCode: 200,
      _headers: {} as Record<string, string>,

      setHeader(name: string, value: string) {
        this._headers[name] = value;
        return this;
      },

      status(code: number) {
        this.statusCode = code;
        return this;
      },

      json(data: any) {
        const elapsed = Date.now() - t0;

        if (this.statusCode !== 200 || data.error) {
          console.error(
            `[agent] 🎨 createOrEditSlide failed (${this.statusCode}) in ${elapsed}ms: ` +
            `${data.error ?? 'unknown error'}`,
          );
          resolve(`Error ${action} slide: ${data.error ?? 'Unknown error'}`);
          return;
        }

        console.log(
          `[agent] 🎨 createOrEditSlide ← ${data.code?.length ?? 0} chars in ${elapsed}ms | ` +
          `tokens: ${data.usage?.input_tokens ?? '?'}in / ${data.usage?.output_tokens ?? '?'}out`,
        );

        resolve(JSON.stringify({
          success: true,
          action: isEdit ? 'edited' : 'created',
          code: data.code,
          slideNumber: data.slideNumber,
          codeLength: data.code?.length ?? 0,
        }));
      },

      end() {},
    } as any;

    generateSlideHandler(mockReq, mockRes).catch((err: any) => {
      console.error(`[agent] 🎨 createOrEditSlide exception: ${err.message}`);
      resolve(`Error ${action} slide: ${err.message}`);
    });
  });
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
  {
    name: 'create_or_edit_slide',
    description:
      'Create a new presentation slide or edit an existing one. Generates a React/TypeScript ' +
      'component rendered at 960x540px (16:9). Supports charts (recharts: BarChart, LineChart, ' +
      'PieChart, AreaChart), tables, icons (lucide-react), and rich layouts.\n\n' +
      'FOR CREATING: Provide a detailed prompt with all data points, numbers, and layout preferences.\n\n' +
      'FOR EDITING: Provide the existing slide code in existingCode and describe the changes ' +
      'you want in the prompt. The tool returns the complete updated component.\n\n' +
      'CRITICAL: The slide generator has NO access to conversation history or search results. ' +
      'You MUST include ALL data (every number, label, metric, company name) directly in the prompt.',
    input_schema: {
      type: 'object' as const,
      properties: {
        prompt: {
          type: 'string',
          description:
            'For NEW slides: Detailed instructions including ALL data points, numbers, labels, ' +
            'and layout preferences (chart type, column layout, table structure, etc.).\n' +
            'For EDITING: Description of what to change (e.g. "change the bar chart to a line chart", ' +
            '"update the revenue figure to $2.4B", "add a footer with the source URL", ' +
            '"change accent color to blue", "make the title font larger").',
        },
        slideNumber: {
          type: 'number',
          description: 'Slide number in the deck (default: 1). Affects the component export name.',
        },
        context: {
          type: 'string',
          description:
            'Optional context about the overall presentation or prior slides for visual/narrative consistency.',
        },
        theme: {
          type: 'object',
          description: 'Optional theme overrides. If omitted, defaults are used.',
          properties: {
            headingFont:      { type: 'string', description: 'Font family for headings (e.g. "Inter, sans-serif")' },
            bodyFont:         { type: 'string', description: 'Font family for body text' },
            accentColors:     { type: 'array', items: { type: 'string' }, description: 'Array of hex colors for accents' },
            headingTextColor: { type: 'string', description: 'Hex color for heading text' },
            bodyTextColor:    { type: 'string', description: 'Hex color for body text' },
            headingFontSize:  { type: 'number', description: 'Base heading font size in px' },
            bodyFontSize:     { type: 'number', description: 'Base body font size in px' },
          },
        },
        existingCode: {
          type: 'string',
          description:
            'The FULL existing React/TypeScript component code to edit. ' +
            'When provided, the tool modifies this code based on the prompt instructions ' +
            'and returns the complete updated component. Omit this field to create a new slide.',
        },
      },
      required: ['prompt'],
    },
  },
];

// ---------------------------------------------------------------------------
// Tool executor
// ---------------------------------------------------------------------------

interface ToolInput {
  query?: string;
  prompt?: string;
  slideNumber?: number;
  context?: string;
  theme?: SlideTheme;
  existingCode?: string;
  [key: string]: unknown;
}

async function executeTool(name: string, input: ToolInput): Promise<string> {
  console.log(`[agent] ⚙️  executeTool: ${name}`, JSON.stringify(input).slice(0, 200));

  switch (name) {
    case 'vector_search': {
      if (!input.query || typeof input.query !== 'string') {
        return 'Error: vector_search requires a "query" string parameter.';
      }
      return vectorSearch(input.query);
    }

    case 'create_or_edit_slide': {
      if (!input.prompt || typeof input.prompt !== 'string') {
        return 'Error: create_or_edit_slide requires a "prompt" string parameter.';
      }
      return createOrEditSlide({
        prompt: input.prompt,
        slideNumber: input.slideNumber,
        context: input.context,
        theme: input.theme,
        existingCode: input.existingCode,
      });
    }

    default: {
      console.warn(`[agent] ⚠️  Unknown tool: ${name}`);
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
- Use the create_or_edit_slide tool to create new slides or modify existing ones when the user requests visual deliverables
- Help the user plan and create high-quality financial deliverables
- Ask clarifying questions when the user's intent is ambiguous
- Maintain context across a multi-turn conversation

## How to use vector_search
- Call it proactively whenever the user asks about a company, deal, market, or financial topic
- Run multiple searches with varied queries to triangulate complete information
- Synthesise results across multiple searches before responding
- Reference source titles or URLs when citing data so the user can verify

## How to use create_or_edit_slide

### Creating new slides
- Use this when the user asks for a slide, chart, visual, or presentation component
- CRITICAL: The slide generator has NO access to our conversation or search results. You MUST include ALL data directly in the prompt — every number, label, metric, company name, and data point
- First gather data via vector_search, then pass a comprehensive prompt to create_or_edit_slide with all the data embedded in the prompt text
- Specify layout preferences: chart types (bar, line, area, pie), table structures, column layouts
- You can generate multiple slides by calling the tool multiple times with different slideNumber values

### Citation embedding in slides
- When creating slides from vector_search data, include citation numbers with data points
- In your prompt to create_or_edit_slide, annotate data points like this:
  "Revenue: $3.1B (29% YoY growth) [cite:1]" or "IPO raised $880M at $15-$18 range [cite:3,5]"
- Use the source numbers from vector_search results: [Source 1] → [cite:1], [Source 2] → [cite:2], etc.
- The slide generator will embed these as interactive citation markers in the rendered component
- Place citations immediately after the specific data point they support, not at the end of sentences

### Editing existing slides
- When the user wants to modify a slide that was already generated, use the existingCode parameter
- Pass the COMPLETE existing component code in existingCode
- In the prompt, describe ONLY the changes to make — be specific: "change the bar chart to a line chart", "update revenue to $2.4B", "add a row to the table for EBITDA margin", "make heading font larger", "change accent color to navy blue"
- The tool returns the complete updated component with changes applied
- For minor tweaks (color, font, single value), keep the edit prompt focused and concise
- For major restructuring (different layout, different chart type, add/remove sections), provide more detailed instructions

### Workflow for data-driven slides
1. Use vector_search to gather relevant financial data
2. Synthesise the key data points you want to visualise
3. Call create_or_edit_slide with a detailed prompt that includes ALL the data
4. Describe the result to the user and ask if they want modifications
5. If they request changes, call create_or_edit_slide again with existingCode set to the previously generated code and the edit instructions in the prompt

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

          // ── Track sources from vector search ────────────────────────
          if (toolUse.name === 'vector_search' && result.startsWith('Found ')) {
            const sourcesBefore = getSessionSources(sessionId);
            const startId = sourcesBefore.length > 0
              ? Math.max(...sourcesBefore.map(s => s.id)) + 1
              : 1;

            const allSources = trackSourcesFromSearchResult(sessionId, result);

            // Emit updated source list to frontend
            sendSSE(res, {
              type: 'sources_updated',
              sources: allSources,
            });

            // Remap [Source N] → [Source globalId] in the result text
            // so the agent uses globally consistent citation numbers
            let remappedResult = result;
            const newSources = allSources.filter(s => s.id >= startId);
            
            // Replace in reverse order to avoid index shifting issues
            // e.g. [Source 10] before [Source 1]
            for (let i = newSources.length - 1; i >= 0; i--) {
              const localNum = i + 1; // [Source 1], [Source 2], etc.
              const globalId = newSources[i].id;
              if (localNum !== globalId) {
                remappedResult = remappedResult.replace(
                  new RegExp(`\\[Source ${localNum}\\]`, 'g'),
                  `[Source ${globalId}]`,
                );
              }
            }

            sendSSE(res, {
              type: 'tool_result',
              name: toolUse.name,
              preview: remappedResult.slice(0, 150) + (remappedResult.length > 150 ? '…' : ''),
            });

            return {
              type: 'tool_result' as const,
              tool_use_id: toolUse.id,
              content: remappedResult,  // agent sees globally consistent IDs
            };
          }

          // ── Slide tool: emit code + sources to frontend ─────────────
          if (toolUse.name === 'create_or_edit_slide') {
            try {
              const parsed = JSON.parse(result);
              if (parsed.success && parsed.code) {
                const allSources = getSessionSources(sessionId);

                sendSSE(res, {
                  type: 'slide_generated',
                  action: parsed.action ?? 'created',
                  code: parsed.code,
                  slideNumber: parsed.slideNumber ?? 1,
                  sources: allSources,
                });

                const summary = JSON.stringify({
                  success: true,
                  action: parsed.action,
                  slideNumber: parsed.slideNumber,
                  codeLength: parsed.codeLength,
                  sourceCount: allSources.length,
                  message: `Slide ${parsed.slideNumber} ${parsed.action} successfully (${parsed.codeLength} chars) with ${allSources.length} tracked sources.`,
                });

                sendSSE(res, {
                  type: 'tool_result',
                  name: toolUse.name,
                  preview: `Slide ${parsed.action} (${parsed.codeLength} chars)`,
                });

                return {
                  type: 'tool_result' as const,
                  tool_use_id: toolUse.id,
                  content: summary,
                };
              }
            } catch {
              // fall through
            }
          }

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