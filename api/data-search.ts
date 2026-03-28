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
// System prompt
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

WIKIPEDIA, RANDOM WEBSITES LIKE STOCKTWITS, ZOOMINFO, LINKEDIN, ETC ARE NOT RELIABLE SOURCES FOR ANY FINANCIAL DATA. DO NOT USE THEM.

## Search Execution Rules

1. For EACH entity in the request, search for its GROUND TRUTH source first.
   Do not move to secondary sources until you have checked the ground truth source.

2. For IPO queries: always start with SEC EDGAR 424B4 search for each company.
   Search: site:sec.gov "COMPANY NAME" 424B4

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
   Make queries specific — include source names like SEC filing, Wall Street Journal,
   Bloomberg, PRNewswire, BusinessWire, or the company website.

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
- Do not write anything before "Found N relevant sources:" or after the last "---"`;

// ---------------------------------------------------------------------------
// Agentic loop — web_search only
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

  // Web search only — no proprietary DB, no Perplexity
  const tools: Anthropic.Tool[] = [
    {
      name: 'web_search',
      type: 'web_search_20250305' as any,
    } as any,
  ];

  let finalText = '';
  let iteration = 0;
  const MAX_ITERATIONS = 15;

  while (iteration < MAX_ITERATIONS) {
    iteration++;
    console.log(
      `[data-search] ── loop iteration ${iteration} | history: ${messages.length} msgs`,
    );

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

    // ── Process content blocks ──────────────────────────────────────────────
    for (const block of response.content) {
      if (block.type === 'text') {
        console.log(`[data-search] 💬 TEXT: ${block.text.slice(0, 300)}`);
        finalText += block.text;

        sendSSE(res, {
          type: 'data_search_thinking',
          text: block.text.slice(0, 300),
        });
      }

      if ((block as any).type === 'server_tool_use') {
        const b = block as any;
        console.log(
          `[data-search] 🌐 WEB SEARCH: ${JSON.stringify(b.input).slice(0, 200)}`,
        );

        sendSSE(res, {
          type: 'data_search_tool_call',
          tool: 'web_search',
          input: b.input,
        });
      }
    }

    // ── Add assistant turn to history ───────────────────────────────────────
    messages.push({ role: 'assistant', content: response.content });

    // ── End turn ────────────────────────────────────────────────────────────
    if (response.stop_reason === 'end_turn') {
      console.log(`[data-search] ✅ end_turn after ${iteration} iteration(s)`);
      break;
    }

    // ── Tool use — web_search results are injected automatically by the API ─
    if (response.stop_reason === 'tool_use') {
      // web_search_20250305 is a server-side tool — the API handles fetching
      // and injects results as web_search_tool_result blocks automatically.
      // We just need to acknowledge and continue.
      messages.push({
        role: 'user',
        content: 'Continue your research based on the search results above.',
      });
      continue;
    }

    console.warn(
      `[data-search] ⚠️  Unexpected stop_reason: ${response.stop_reason}`,
    );
    break;
  }

  // Strip everything before "Found " and cut off after the last source block
  const foundIdx = finalText.indexOf('Found ');
  if (foundIdx === -1) return finalText;

  const trimmed = finalText.slice(foundIdx);
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
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { query: userQuery, context } = req.body as DataSearchRequest;

  if (!userQuery || typeof userQuery !== 'string' || userQuery.trim() === '') {
    return res
      .status(400)
      .json({ error: '`query` is required and must be a non-empty string.' });
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
    console.log(
      `[data-search] Loop done in ${elapsed}ms | result: ${agentResult.length} chars`,
    );

    if (!agentResult.trim()) {
      sendSSE(res, { type: 'error', message: 'Search returned no results.' });
      sendSSE(res, { type: 'done' });
      return res.end();
    }

    console.log(
      `[data-search] ✅ Result preview: ${agentResult.slice(0, 300)}`,
    );

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

    sendSSE(res, {
      type: 'error',
      message: error.message ?? 'An unexpected error occurred.',
    });
    sendSSE(res, { type: 'done' });
    return res.end();
  }
}