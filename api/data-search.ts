import * as http from 'http';
import * as https from 'https';
import Anthropic from '@anthropic-ai/sdk';
import type { VercelRequest, VercelResponse } from '@vercel/node';


// ---------------------------------------------------------------------------
// Vercel config
// ---------------------------------------------------------------------------

export const config = { maxDuration: 300 };

// ---------------------------------------------------------------------------
// Anthropic client
// ---------------------------------------------------------------------------

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DataSearchRequest {
  query: string;
  context?: string;
}

interface DataPoint {
  label: string;
  value: string;
  primarySource: {
    type: string;
    url: string;
    filingDate?: string;
    description: string;
  };
  supportingSources: Array<{
    type: string;
    url: string;
    description: string;
  }>;
  discrepancies: Array<{
    value: string;
    sourceUrl: string;
    note: string;
  }>;
  confidence: 'high' | 'medium' | 'low';
  asOfDate?: string;
  unit?: string;
}

interface EntityResult {
  entity: string;
  ticker?: string;
  dataPoints: DataPoint[];
}

interface DataSearchResult {
  entities: EntityResult[];
  searchSummary: string;
  totalSourcesConsulted: number;
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
// SSE helper
// ---------------------------------------------------------------------------

function sendSSE(res: VercelResponse, payload: Record<string, unknown>): void {
  const line = `data: ${JSON.stringify(payload)}\n\n`;
  try {
    if (typeof (res as any).write === 'function') {
      (res as any).write(line);
    }
  } catch (err: any) {
    console.error('[data-search] sendSSE error:', err.message);
  }
}


// ---------------------------------------------------------------------------
// Search URL
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
      path: '/api/websearch',
    };
  }

  return {
    protocol: 'http',
    hostname: 'localhost',
    port: 3001,
    path: '/api/websearch',
  };
}

function getDatabaseSearchUrl() {
  if (process.env.DATABASE_API_URL) {
    const u = new URL(process.env.DATABASE_API_URL);
    return {
      protocol: u.protocol === 'https:' ? 'https' : 'http',
      hostname: u.hostname,
      port: u.port ? parseInt(u.port) : null,
      path: u.pathname,
    };
  }

  if (process.env.VERCEL) {
    return { protocol: 'https' as const, hostname: 'www.getvolute.com', port: null, path: '/api/search' };
  }

  return { protocol: 'http' as const, hostname: 'localhost', port: 3001, path: '/api/search' };
}

// ---------------------------------------------------------------------------
// Vector search tool
// ---------------------------------------------------------------------------


async function databaseSearch(query: string): Promise<string> {
  const target = getDatabaseSearchUrl();
  const fullUrl = `${target.protocol}://${target.hostname}${target.port ? ':' + target.port : ''}${target.path}`;
  console.log(`[data-search] 🔍 databaseSearch → "${query}" | endpoint: ${fullUrl}`);
  const t0 = Date.now();

  return new Promise((resolve) => {
    const bodyStr = JSON.stringify({ query, topK: 10, useReranking: true });
    const byteLen = Buffer.byteLength(bodyStr, 'utf8');

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
      console.error(`[data-search] 🔍 request error: ${err.message}`);
      resolve(`Error searching database: ${err.message}`);
    });

    req.write(bodyStr, 'utf8');
    req.end();
  });
}


// ---------------------------------------------------------------------------
// Vector search tool
// ---------------------------------------------------------------------------

async function vectorSearch(query: string): Promise<string> {
  const target = getSearchUrl();
  const fullUrl = `${target.protocol}://${target.hostname}${target.port ? ':' + target.port : ''}${target.path}`;
  console.log(`[data-search] 🔍 vectorSearch → "${query}" | endpoint: ${fullUrl}`);
  const t0 = Date.now();

  return new Promise((resolve) => {
    const bodyStr = JSON.stringify({ query, topK: 10, useReranking: true });
    const byteLen = Buffer.byteLength(bodyStr, 'utf8');

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
      console.error(`[data-search] 🔍 request error: ${err.message}`);
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
      console.error(`[data-search] 🔍 redirect request error: ${err.message}`);
      resolve(`Error searching database: ${err.message}`);
    });

    req.write(bodyStr, 'utf8');
    req.end();
  });
}

// ---------------------------------------------------------------------------
// Parse search API JSON response
// ---------------------------------------------------------------------------

function parseSearchResponse(data: string, status: number, t0: number, query: string): string {
  try {
    if (status !== 200) {
      console.error(`[data-search] 🔍 Search API error ${status}: ${data.slice(0, 300)}`);
      return `Error searching database: HTTP ${status}`;
    }

    const result = JSON.parse(data) as SearchApiResponse;
    const results = result.results ?? [];

    console.log(`[data-search] 🔍 vectorSearch ← ${results.length} results in ${Date.now() - t0}ms`);

    if (results.length === 0) return 'No results found for that query.';

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

    return `Found ${results.length} relevant sources:\n\n${formatted}`;
  } catch (parseErr: any) {
    return `Error parsing search response: ${parseErr.message}`;
  }
}


// ---------------------------------------------------------------------------
// Prompts
// ---------------------------------------------------------------------------

const SYSTEM_PROMPT = `You are a financial data research specialist. Your task is to find accurate, sourced financial data from primary sources using web search.

## Source Reliability Hierarchy — Follow This Strictly

### IPO / Capital Markets Metrics (offer price, shares sold, proceeds, valuation at IPO)
1. SEC EDGAR 424B4 (final prospectus) — GROUND TRUTH. Must find and read this first.
2. SEC EDGAR 424B1 / 424B3 — preliminary prospectus, acceptable if 424B4 not available
3. SEC EDGAR S-1/A (latest amendment) — use for pre-IPO financials and business description
4. Company press release on BusinessWire / PR Newswire announcing IPO pricing — strong secondary
5. Financial news articles (Reuters, WSJ, FT, Bloomberg) covering the IPO — tertiary
6. Financial data aggregators (Yahoo Finance, Macrotrends) — lowest trust, cross-check only

### Earnings / Financial Statement Metrics (revenue, EBITDA, net income, EPS, guidance)
1. SEC EDGAR 10-K (annual) or 10-Q (quarterly) — GROUND TRUTH
2. Company earnings press release filed as 8-K exhibit — ground truth equivalent
3. Company investor relations page earnings presentations — strong secondary
4. Earnings call transcripts — secondary, useful for guidance and narrative
5. Financial news articles — tertiary

### M&A Transaction Metrics (deal value, EV/EBITDA multiples, structure)
1. SEC EDGAR merger proxy (DEFM14A) or S-4 registration statement — GROUND TRUTH
2. 8-K filing announcing the transaction — ground truth equivalent
3. Company press release announcing transaction — strong secondary
4. Financial news articles on deal announcement — tertiary

### Credit / Debt Metrics (coupon, maturity, covenants, ratings)
1. SEC EDGAR 424B filing (debt offering) or 8-K with indenture — GROUND TRUTH
2. Rating agency press releases (Moody's, S&P, Fitch sites) — strong secondary
3. Company press release on financing — secondary

### Company Background / Business Description
1. SEC EDGAR S-1 or 10-K Business section — GROUND TRUTH
2. Company investor relations page — strong secondary
3. Company website About/Products pages — secondary

## Aditional search tools
### proprietary_database_search
Use to search the Volute curated database of IPO and SPAC news articles and press releases from 2023 onwards. Call this when researching any IPO or SPAC from that period AS A SECONDARY SOURCE.

### perplexity_search  
Use for general web search across public webpages AS A SECONDARY SOURCE if you feel your websearch results are not complete. 

## Search Execution Rules

1. For EACH entity in the request, search for its GROUND TRUTH source first.
   Do not move to secondary sources until you have checked the ground truth source.

2. For IPO queries: always start with SEC EDGAR 424B4 search for each company.
   Search: site:sec.gov "COMPANY NAME" 424B4
   Or fetch: https://efts.sec.gov/LATEST/search-index?q=%22COMPANY+NAME%22&forms=424B4
   The 424B4 cover page has: offer price, number of shares, total proceeds, underwriters.
   The first 30 pages have: use of proceeds, dilution, capitalization, summary financials.

3. After finding the ground truth value, find at least one secondary source independently.
   Compare the values. If they differ, note the discrepancy and explain why.

4. Assign confidence:
   - "high" = found official filing AND at least one secondary source agrees
   - "medium" = found official filing but no secondary, OR secondaries agree but no filing
   - "low" = only news articles, no official filing, or sources contradict each other

5. For EACH data point record:
   - The exact value as stated in the source (do not round or restate)
   - The primary source type, URL, and filing date
   - All other URLs where this value appeared
   - Any values that contradicted the primary source

6. Search each entity fully before moving to the next.

## Output Format

Write your findings as plain text in exactly this format and nothing else:

Found N relevant sources:

[Source 1]
Title: Company Name — Metric Name
URL: https://exact-url-you-visited
Content: Metric name: exact value as found in source (unit) as of date. Source type. Confidence: high/medium/low. Any discrepancy notes.
Relevance: 95.0%
---

[Source 2]
...

Rules:
- N must equal the actual number of source blocks you write
- Every URL must be a real URL you actually fetched or found during this session — do not fabricate
- If you found the same metric from multiple sources, write a separate source block for each URL
- Put the highest-confidence source for each metric first
- The Content line must include the exact value as stated in the source, do not round or paraphrase
- If a metric was not found anywhere, still write a source block with Content: "Not found" and Relevance: 50.0%
- Do not write any prose, headers, tables, summaries, or markdown outside of this format
- Do not write anything before "Found N relevant sources:" or after the last "---"
- DO NOT WRITE A SIDE BY SIDE SUMMARY, OR SUMMATION PARAGRAPH AT THE END OF YOUR RESPONSE
`;

// ---------------------------------------------------------------------------
// Result parsers — identical to original
// ---------------------------------------------------------------------------

function parseAgentResult(result: string): DataSearchResult | null {
  for (const line of result.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed.startsWith('{')) continue;
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed.data_search_result) {
        return parsed.data_search_result as DataSearchResult;
      }
    } catch {
      // keep scanning
    }
  }

  // Fallback: scan for the JSON block anywhere in the text
  const jsonMatch = result.match(/\{"data_search_result":\s*\{[\s\S]*\}\s*\}/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]);
      if (parsed.data_search_result) return parsed.data_search_result as DataSearchResult;
    } catch {
      // malformed
    }
  }

  return null;
}

function buildSourcesList(result: DataSearchResult) {
  const seen = new Set<string>();
  const sources: Array<{ id: number; title: string; url: string; relevance: string; textPreview: string }> = [];
  let id = 1;

  for (const entity of result.entities) {
    for (const dp of entity.dataPoints) {
      if (dp.primarySource?.url && !seen.has(dp.primarySource.url)) {
        seen.add(dp.primarySource.url);
        sources.push({
          id: id++,
          title: `${entity.entity} — ${dp.primarySource.type}`,
          url: dp.primarySource.url,
          relevance: dp.confidence === 'high' ? '95' : dp.confidence === 'medium' ? '75' : '50',
          textPreview: `${dp.label}: ${dp.value}. ${dp.primarySource.description}`,
        });
      }
      for (const sup of dp.supportingSources ?? []) {
        if (sup.url && !seen.has(sup.url)) {
          seen.add(sup.url);
          sources.push({
            id: id++,
            title: `${entity.entity} — ${sup.type}`,
            url: sup.url,
            relevance: '70',
            textPreview: `${dp.label}: ${dp.value}. ${sup.description}`,
          });
        }
      }
    }
  }

  return sources;
}

function formatAsSearchResult(result: DataSearchResult): string {
  const sourceBlocks = result.entities.flatMap((entity) =>
    entity.dataPoints.map((dp, idx) => {
      const primaryUrl = dp.primarySource?.url ?? '';
      return [
        `[Source ${idx + 1}]`,
        `Title: ${entity.entity} — ${dp.label}`,
        primaryUrl ? `URL: ${primaryUrl}` : null,
        `Content: ${dp.label}: ${dp.value}${dp.unit ? ` (${dp.unit})` : ''}${dp.asOfDate ? ` as of ${dp.asOfDate}` : ''}. Source: ${dp.primarySource?.type ?? 'Unknown'}. Confidence: ${dp.confidence}.${dp.discrepancies?.length ? ` Note: ${dp.discrepancies[0].note}` : ''}`,
        `Relevance: ${dp.confidence === 'high' ? '95.0' : dp.confidence === 'medium' ? '75.0' : '50.0'}%`,
        '---',
      ].filter(Boolean).join('\n');
    })
  );

  return `Found ${sourceBlocks.length} relevant sources:\n\n${sourceBlocks.join('\n\n')}`;
}

// ---------------------------------------------------------------------------
// Agentic loop
// ---------------------------------------------------------------------------

async function runSearchLoop(
  userQuery: string,
  context: string | undefined,
  res: VercelResponse,
): Promise<string> {
  const messages: Anthropic.MessageParam[] = [
    {
      role: 'user',
      content: `${userQuery}${context ? `\n\nAdditional context: ${context}` : ''}`,
    },
  ];

    const tools: Anthropic.Tool[] = [
    {
        name: 'web_search',
        type: 'web_search_20250305' as any,
    } as any,
    {
        name: 'proprietary_database_search',
        description:
        'Search the Volute proprietary database of IPO and SPAC news articles and filings from 2023 onwards. ' +
        'Use this for recent IPO data, SPAC deals, and capital markets activity. ' +
        'Call this alongside web_search to get additional coverage from curated financial sources.',
        input_schema: {
        type: 'object' as const,
        properties: {
            query: {
            type: 'string',
            description: 'Search query for IPO/SPAC news and financial data.',
            },
        },
        required: ['query'],
        },
    },
    {
        name: 'perplexity_search',
        description:
        'General web search powered by Perplexity. Use for broad financial data, company information, ' +
        'press releases, and anything not covered by SEC EDGAR or the proprietary database.',
        input_schema: {
        type: 'object' as const,
        properties: {
            query: {
            type: 'string',
            description: 'Search query.',
            },
        },
        required: ['query'],
        },
    },
    ];

  let finalText = '';
  let iteration = 0;
  const MAX_ITERATIONS = 15;

  while (iteration < MAX_ITERATIONS) {
    iteration++;
    console.log(`[data-search] ── loop iteration ${iteration} | history: ${messages.length} msgs`);

    const t0 = Date.now();

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 16000,
      system: SYSTEM_PROMPT,
      tools,
      messages,
    });

    console.log(
      `[data-search] API response in ${Date.now() - t0}ms | ` +
      `stop_reason: ${response.stop_reason} | ` +
      `input_tokens: ${response.usage.input_tokens} | ` +
      `output_tokens: ${response.usage.output_tokens}`,
    );

    // ── Process content blocks ────────────────────────────────────────────
    for (const block of response.content) {

      if (block.type === 'text') {
        console.log(`[data-search] 💬 TEXT: ${block.text.slice(0, 300)}`);
        finalText += block.text;

        sendSSE(res, {
          type: 'data_search_thinking',
          text: block.text.slice(0, 300),
        });
      }

      // web_search_20250305 returns server_tool_use blocks with results
      // embedded as web_search_tool_result in the next user turn
      if ((block as any).type === 'server_tool_use') {
        const b = block as any;
        console.log(`[data-search] 🌐 WEB SEARCH: ${JSON.stringify(b.input).slice(0, 200)}`);

        sendSSE(res, {
          type: 'data_search_tool_call',
          tool: 'web_search',
          input: b.input,
        });
      }
    }

    // ── Add assistant turn to history ─────────────────────────────────────
    messages.push({ role: 'assistant', content: response.content });

    // ── End turn — we're done ─────────────────────────────────────────────
    if (response.stop_reason === 'end_turn') {
      console.log(`[data-search] ✅ end_turn after ${iteration} iteration(s)`);
      break;
    }

    // ── Tool use — build tool_result turn and continue ────────────────────
    if (response.stop_reason === 'tool_use') {
    const toolResultContent: Anthropic.ToolResultBlockParam[] = [];

    for (const block of response.content) {
            if (block.type === 'tool_use') {
            const input = block.input as { query?: string };

            sendSSE(res, { type: 'tool_start', name: block.name, input: block.input });

            let result = '';

            if (block.name === 'proprietary_database_search') {
                result = await databaseSearch(input.query ?? '');
            } else if (block.name === 'perplexity_search') {
                result = await vectorSearch(input.query ?? '');
            }

            sendSSE(res, {
                type: 'tool_result',
                name: block.name,
                preview: result.slice(0, 150),
            });

            toolResultContent.push({
                type: 'tool_result',
                tool_use_id: block.id,
                content: result || 'No results found.',
            });
            }
        }

        // web_search results are injected automatically by the API as
        // web_search_tool_result blocks — we just need to pass an empty
        // user turn to acknowledge and continue the loop.
        // If there were no client-side tool_use blocks, the API has already
        // appended the search results to the assistant message content and
        // we simply continue with an empty acknowledgement turn.
        
        if (toolResultContent.length > 0) {
            messages.push({ role: 'user', content: toolResultContent });
        } else {
            messages.push({
            role: 'user',
            content: 'Continue your research based on the search results above.',
            });
        }

        continue;
        }
        

    // Unexpected stop reason
    console.warn(`[data-search] ⚠️  Unexpected stop_reason: ${response.stop_reason}`);
    break;
  }

  // At the end of runSearchLoop, before returning, strip away the intermediate thinking
  // messages that were added to the history:
    const foundIdx = finalText.indexOf('Found ');

    if (foundIdx === -1) return finalText;

    const trimmed = finalText.slice(foundIdx);

    // Cut off anything after the last source block delimiter
    const lastDelimiter = trimmed.lastIndexOf('\n---');
    return lastDelimiter !== -1 ? trimmed.slice(0, lastDelimiter + 4) : trimmed;
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------

export default async function handler(req: VercelRequest, res: VercelResponse) {
  console.log(`[data-search] ${req.method} /api/data-search`);

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { query: userQuery, context } = req.body as DataSearchRequest;

  if (!userQuery || typeof userQuery !== 'string' || userQuery.trim() === '') {
    return res.status(400).json({ error: '`query` is required and must be a non-empty string.' });
  }

  console.log(`[data-search] Query: "${userQuery.slice(0, 120)}"`);

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  if (typeof (res as any).flushHeaders === 'function') {
    (res as any).flushHeaders();
  }

  const t0 = Date.now();

  try {
    sendSSE(res, {
      type: 'data_search_tool_call',
      tool: 'data_search',
      input: { query: userQuery },
    });

    const agentResult = await runSearchLoop(userQuery.trim(), context, res);

    const elapsed = Date.now() - t0;
    console.log(`[data-search] Loop done in ${elapsed}ms | result: ${agentResult.length} chars`);

    if (!agentResult.trim()) {
    sendSSE(res, { type: 'error', message: 'Search returned no results.' });
    sendSSE(res, { type: 'done' });
    return res.end();
    }

    console.log(`[data-search] ✅ Result preview: ${agentResult.slice(0, 300)}`);

    sendSSE(res, {
    type: 'tool_result',
    name: 'data_search',
    preview: agentResult.slice(0, 150),
    });

    sendSSE(res, {
    type: 'search_result',
    text: agentResult,
    });

    sendSSE(res, { type: 'done' });
    return res.end();

  } catch (error: any) {
    const elapsed = Date.now() - t0;
    console.error(`[data-search] ❌ Error after ${elapsed}ms:`, error.message);
    console.error(error.stack);

    sendSSE(res, { type: 'error', message: error.message ?? 'An unexpected error occurred.' });
    sendSSE(res, { type: 'done' });
    return res.end();
  }
}