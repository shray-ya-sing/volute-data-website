import { query } from '@anthropic-ai/claude-agent-sdk';
import type { VercelRequest, VercelResponse } from '@vercel/node';

// ---------------------------------------------------------------------------
// Vercel config
// ---------------------------------------------------------------------------

export const config = { maxDuration: 300 };

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DataSearchRequest {
  query: string;
  context?: string; // optional — what kind of data is needed (e.g. "ipo metrics", "earnings")
}

interface DataPoint {
  label: string;
  value: string;
  primarySource: {
    type: string;       // e.g. "SEC 424B4", "10-K", "Press Release"
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

// ---------------------------------------------------------------------------
// SSE helper — same pattern as agent-websearch.ts
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
// Source hierarchy — encoded as prompt knowledge
// ---------------------------------------------------------------------------

const SOURCE_HIERARCHY_PROMPT = `
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

## How to Search SEC EDGAR
- Go to https://efts.sec.gov/LATEST/search-index?q="COMPANY NAME"&dateRange=custom&startdt=YYYY-01-01&enddt=YYYY-12-31&forms=424B4 to find 424B4 filings
- Or use https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&company=COMPANY+NAME&type=424B4&dateb=&owner=include&count=10
- Or search https://efts.sec.gov/LATEST/search-index?q="COMPANY+NAME"&forms=S-1 for S-1 filings
- EDGAR filing index pages list individual document sections — fetch the index first, then the relevant document
- For 424B4: offer price and shares are on the cover page; financial summary is in the first 30 pages

## How to Search for Press Releases
- Search site:businesswire.com "COMPANY NAME" IPO pricing
- Search site:prnewswire.com "COMPANY NAME" IPO
- Search site:ir.COMPANYDOMAIN.com for investor relations pages
`.trim();

const SEARCH_EXECUTION_PROMPT = `
## Search Execution Rules

1. For EACH entity in the request, search for its GROUND TRUTH source first based on the data type.
   Do not move to secondary sources until you have checked the ground truth source.

2. For IPO queries: always start with SEC EDGAR 424B4 search for each company.
   The 424B4 cover page has: offer price, number of shares, total proceeds, underwriters.
   The first 30 pages have: use of proceeds, dilution, capitalization, summary financials.

3. After finding the ground truth value, find at least one secondary source independently.
   Compare the values. If they differ, note the discrepancy and explain why
   (e.g. article may have included overallotment, or reported anticipated vs. final figures).

4. Assign confidence:
   - "high" = found 424B4 / 10-K / official filing AND at least one secondary source agrees
   - "medium" = found official filing but no secondary confirmation, OR secondary sources agree but no filing found
   - "low" = only news articles found, no official filing, or sources contradict each other

5. For EACH data point, record:
   - The exact value as stated in the source (do not round or restate)
   - The primary source type, URL, and filing date
   - All other URLs where this value appeared
   - Any values that contradicted the primary source

6. Search multiple entities IN PARALLEL where possible to reduce total time.
`.trim();

const OUTPUT_FORMAT_PROMPT = `
## Output Format

After completing your research, emit a single JSON object on its own line with no surrounding prose.
The JSON must match this exact structure:

{"data_search_result": {"entities": [{"entity": "Company Name", "ticker": "TICK", "dataPoints": [{"label": "IPO Offer Price", "value": "$18.00 per share", "unit": "USD per share", "asOfDate": "2024-04-25", "primarySource": {"type": "SEC 424B4", "url": "https://www.sec.gov/Archives/edgar/data/.../...", "filingDate": "2024-04-25", "description": "Final IPO prospectus filed with SEC"}, "supportingSources": [{"type": "Press Release", "url": "https://www.businesswire.com/...", "description": "BusinessWire IPO pricing announcement"}], "discrepancies": [], "confidence": "high"}]}], "searchSummary": "Brief summary of what was found and any notable issues", "totalSourcesConsulted": 12}}

Rules for the JSON:
- Every URL must be a real, working URL you actually visited during your search
- Do not fabricate URLs — if you could not find a source, say so in discrepancies or set confidence to "low"
- The label should be specific (e.g. "IPO Offer Price" not just "Price")
- The value should be the exact string as found in the source
- If a metric was not found anywhere, include it with value "Not found" and confidence "low"
- totalSourcesConsulted is the total number of distinct URLs you examined
`.trim();

// ---------------------------------------------------------------------------
// Build the full agent prompt
// ---------------------------------------------------------------------------

function buildAgentPrompt(userQuery: string, context?: string): string {
  return `You are a financial data research specialist with access to the web.
Your task is to find accurate, sourced financial data from primary sources.

${SOURCE_HIERARCHY_PROMPT}

${SEARCH_EXECUTION_PROMPT}

${OUTPUT_FORMAT_PROMPT}

---

## Data Request

${userQuery}
${context ? `\nAdditional context: ${context}` : ''}

Begin your research now. Search systematically, starting with ground truth sources.
When finished, emit the JSON result object as described above.`;
}

// ---------------------------------------------------------------------------
// Parse the agent result for the JSON payload
// Same pattern as export-pptx-claude.ts
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
      // not valid JSON on this line — keep scanning
    }
  }

  // Fallback: try to find JSON block anywhere in the result
  const jsonMatch = result.match(/\{"data_search_result":\s*\{[\s\S]*?\}\s*\}/);
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

// ---------------------------------------------------------------------------
// Convert DataSearchResult → sources array compatible with agent-websearch.ts
// TrackedSource shape: { id, title, url, relevance, textPreview }
// ---------------------------------------------------------------------------

function buildSourcesList(result: DataSearchResult): Array<{
  id: number;
  title: string;
  url: string;
  relevance: string;
  textPreview: string;
}> {
  const seen = new Set<string>();
  const sources: Array<{ id: number; title: string; url: string; relevance: string; textPreview: string }> = [];
  let id = 1;

  for (const entity of result.entities) {
    for (const dp of entity.dataPoints) {
      // Primary source first
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
      // Supporting sources
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

// ---------------------------------------------------------------------------
// Format result as readable text for agent-websearch.ts consumption
// agent-websearch.ts expects a "Found N relevant sources:\n\n..." string
// from its search tools — we match that format so it can be dropped in
// as a replacement for the vectorSearch() call with no changes upstream.
// ---------------------------------------------------------------------------

function formatAsSearchResult(result: DataSearchResult): string {
  const sources = buildSourcesList(result);

  const sourceBlocks = result.entities.flatMap((entity) =>
    entity.dataPoints.map((dp, idx) => {
      const primaryUrl = dp.primarySource?.url ?? '';
      const lines = [
        `[Source ${idx + 1}]`,
        `Title: ${entity.entity} — ${dp.label}`,
        primaryUrl ? `URL: ${primaryUrl}` : null,
        `Content: ${dp.label}: ${dp.value}${dp.unit ? ` (${dp.unit})` : ''}${dp.asOfDate ? ` as of ${dp.asOfDate}` : ''}. Source: ${dp.primarySource?.type ?? 'Unknown'}. Confidence: ${dp.confidence}.${dp.discrepancies?.length ? ` Note: ${dp.discrepancies[0].note}` : ''}`,
        `Relevance: ${dp.confidence === 'high' ? '95.0' : dp.confidence === 'medium' ? '75.0' : '50.0'}%`,
        '---',
      ].filter(Boolean).join('\n');
      return lines;
    })
  );

  return `Found ${sourceBlocks.length} relevant sources:\n\n${sourceBlocks.join('\n\n')}`;
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

  // ── SSE setup — same pattern as agent-websearch.ts ───────────────────────
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  if (typeof (res as any).flushHeaders === 'function') {
    (res as any).flushHeaders();
  }

  const t0 = Date.now();

  try {
    const agentPrompt = buildAgentPrompt(userQuery.trim(), context);

    console.log(`[data-search] Prompt: ${agentPrompt.length} chars`);

    // Signal to frontend that we are starting — tool_start event matches
    // the existing useAgentStream handler in the frontend hook
    sendSSE(res, {
      type: 'tool_start',
      name: 'data_search',
      input: { query: userQuery },
    });

    let agentResult = '';
    let messageCount = 0;

    // ── Agent SDK iteration ──────────────────────────────────────────────────
    // The async iterator yields message objects as the agent works.
    // We forward meaningful progress as SSE events so the frontend shows
    // activity rather than a blank spinner.

    for await (const message of query({
        prompt: agentPrompt,
        options: {
            model: 'claude-sonnet-4-6',
            maxTurns: 30,
            allowedTools: ['WebSearch', 'WebFetch'],
            permissionMode: 'acceptEdits',
        },
        })) {
        messageCount++;

        // ── Full message dump to server console ──────────────────────────────────
        const msgAny = message as any;
        const msgType = msgAny.type ?? msgAny.role ?? 'unknown';
        
        // Log every message with its full shape so we can see what the SDK yields
        console.log(`\n[data-search] ── Message ${messageCount} | type: ${msgType}`);
        
        // Dump the full message (truncated to avoid flooding the terminal)
        const fullDump = JSON.stringify(message, null, 2);
        console.log(fullDump.length > 1500 ? fullDump.slice(0, 1500) + '\n... [truncated]' : fullDump);

        // ── Surface tool calls specifically ──────────────────────────────────────
        if (msgAny.type === 'tool_use' || msgAny.name) {
            console.log(`[data-search] 🛠  TOOL CALL: ${msgAny.name}`);
            console.log(`[data-search] 🛠  INPUT: ${JSON.stringify(msgAny.input ?? {}).slice(0, 400)}`);
            
            sendSSE(res, {
            type: 'data_search_tool_call',
            tool: msgAny.name,
            input: msgAny.input ?? {},
            });
        }

        // ── Surface tool results ──────────────────────────────────────────────────
        if (msgAny.type === 'tool_result' || msgAny.type === 'tool_results') {
            console.log(`[data-search] ✅ TOOL RESULT for: ${msgAny.tool_use_id ?? 'unknown'}`);
            const resultContent = JSON.stringify(msgAny.content ?? msgAny.output ?? '').slice(0, 600);
            console.log(`[data-search] ✅ RESULT CONTENT: ${resultContent}`);

            sendSSE(res, {
            type: 'data_search_tool_result',
            toolUseId: msgAny.tool_use_id,
            preview: resultContent.slice(0, 200),
            });
        }

        // ── Surface any text Claude is producing mid-search ───────────────────────
        if (msgAny.type === 'text' || typeof msgAny.text === 'string') {
            const text = msgAny.text ?? msgAny.delta?.text ?? '';
            if (text.trim()) {
            console.log(`[data-search] 💬 TEXT: ${text.slice(0, 300)}`);
            sendSSE(res, {
                type: 'data_search_thinking',
                text: text.slice(0, 300),
            });
            }
        }

        // ── Surface assistant messages with content blocks ────────────────────────
        if (msgAny.role === 'assistant' && Array.isArray(msgAny.content)) {
            for (const block of msgAny.content) {
            if (block.type === 'text' && block.text?.trim()) {
                console.log(`[data-search] 💬 ASSISTANT BLOCK: ${block.text.slice(0, 300)}`);
            }
            if (block.type === 'tool_use') {
                console.log(`[data-search] 🛠  BLOCK TOOL CALL: ${block.name}`);
                console.log(`[data-search] 🛠  BLOCK INPUT: ${JSON.stringify(block.input ?? {}).slice(0, 400)}`);
                sendSSE(res, {
                type: 'data_search_tool_call',
                tool: block.name,
                input: block.input ?? {},
                });
            }
            }
        }

        // ── Surface user messages (tool results come back as user role) ───────────
        if (msgAny.role === 'user' && Array.isArray(msgAny.content)) {
            for (const block of msgAny.content) {
            if (block.type === 'tool_result') {
                const resultText = Array.isArray(block.content)
                ? block.content.map((c: any) => c.text ?? '').join(' ')
                : String(block.content ?? '');
                console.log(`[data-search] ✅ USER TOOL RESULT [${block.tool_use_id}]: ${resultText.slice(0, 400)}`);
                sendSSE(res, {
                type: 'data_search_tool_result',
                toolUseId: block.tool_use_id,
                preview: resultText.slice(0, 200),
                });
            }
            }
        }

        // ── Check if 'result' field appeared (final message) ─────────────────────
        if ('result' in message) {
            console.log(`\n[data-search] 🏁 FINAL RESULT found at message ${messageCount}`);
            agentResult = typeof msgAny.result === 'string'
            ? msgAny.result
            : JSON.stringify(msgAny.result ?? '');
            console.log(`[data-search] 🏁 Result length: ${agentResult.length} chars`);
            console.log(`[data-search] 🏁 Result tail: ${agentResult.slice(-400)}`);
        }

        // Heartbeat every 10 messages — but now with a more descriptive name
        if (messageCount % 10 === 0) {
            sendSSE(res, {
            type: 'data_search_progress',
            steps: messageCount,
            });
        }
        }

// ── Agent finished, now process the result ─────────────────────────────────
    const elapsed = Date.now() - t0;
    console.log(
      `[data-search] Agent done in ${elapsed}ms | ${messageCount} messages | ` +
      `result: ${agentResult.length} chars`,
    );

    // ── Parse structured result ──────────────────────────────────────────────
    const structured = parseAgentResult(agentResult);

    if (!structured) {
      console.error(
        `[data-search] Could not parse JSON result from agent.\n` +
        `Result tail (last 600 chars): ${agentResult.slice(-600)}`,
      );

      // Even without structured JSON, return the raw text as a search result
      // so agent-websearch.ts gets something useful rather than an error
      sendSSE(res, {
        type: 'tool_result',
        name: 'data_search',
        preview: 'Search completed (unstructured)',
      });

      sendSSE(res, {
        type: 'search_result',
        text: agentResult,
        structured: null,
      });

      sendSSE(res, { type: 'done' });
      return res.end();
    }

    console.log(
      `[data-search] ✅ Parsed result: ${structured.entities.length} entities | ` +
      `${structured.totalSourcesConsulted} sources consulted`,
    );

    // ── Build sources list compatible with agent-websearch.ts ────────────────
    const sourcesList = buildSourcesList(structured);

    // ── Emit sources_updated — picked up by useAgentStream hook ─────────────
    sendSSE(res, {
      type: 'sources_updated',
      sources: sourcesList,
    });

    // ── Emit tool_result — signals completion to frontend ────────────────────
    sendSSE(res, {
      type: 'tool_result',
      name: 'data_search',
      preview: `Found data for ${structured.entities.length} entities across ${structured.totalSourcesConsulted} sources`,
    });

    // ── Emit the structured result for agent-websearch.ts to consume ─────────
    // This is the primary payload. agent-websearch.ts reads `search_result.text`
    // which is formatted to match what vectorSearch() returns — so it drops
    // into the existing tool result handling with no upstream changes needed.
    const formattedText = formatAsSearchResult(structured);

    sendSSE(res, {
      type: 'search_result',
      text: formattedText,                // matches vectorSearch() output format
      structured,                         // full structured data for richer use
      sources: sourcesList,
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