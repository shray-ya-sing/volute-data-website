import Anthropic from '@anthropic-ai/sdk';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { randomUUID } from 'crypto';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type SupportedMediaType = 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp';

interface ImageInput {
  /** Base64-encoded image data (with or without the data URI prefix) */
  data: string;
  /** MIME type of the image */
  mediaType?: SupportedMediaType;
}

interface RequestBody {
  /** The user's message text */
  prompt: string;
  /**
   * Conversation session ID. If omitted a new session is created and the ID
   * is returned in the response so the client can pass it on subsequent calls.
   */
  sessionId?: string;
  /** Optional images to attach to this turn */
  images?: ImageInput[];
}

// ---------------------------------------------------------------------------
// Vercel config — allow up to 5 minutes (requires Pro plan or higher)
// ---------------------------------------------------------------------------

export const config = {
  maxDuration: 300,
};

// ---------------------------------------------------------------------------
// Anthropic client
// ---------------------------------------------------------------------------

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// ---------------------------------------------------------------------------
// Conversation history store
//
// In-memory store is fine for development and low-traffic deployments.
// Vercel Serverless Functions are stateless between cold starts, so for
// production persistence swap this out for:
//   - Upstash Redis  (https://upstash.com/)
//   - Vercel KV      (https://vercel.com/docs/storage/vercel-kv)
//   - Supabase / PlanetScale / any DB
// ---------------------------------------------------------------------------

type ConversationHistory = Anthropic.MessageParam[];

const conversationStore = new Map<string, ConversationHistory>();

/** Maximum number of message pairs (user + assistant) kept per session */
const MAX_HISTORY_PAIRS = 20;

function getHistory(sessionId: string): ConversationHistory {
  return conversationStore.get(sessionId) ?? [];
}

function saveHistory(sessionId: string, history: ConversationHistory): void {
  // Trim to prevent unbounded memory growth:
  // Each pair = 2 entries (user + assistant), so max entries = pairs * 2
  const maxEntries = MAX_HISTORY_PAIRS * 2;
  const trimmed =
    history.length > maxEntries ? history.slice(history.length - maxEntries) : history;

  conversationStore.set(sessionId, trimmed);
}

// ---------------------------------------------------------------------------
// Tool definitions
// (Stubs — implement handlers in the tool-execution loop below)
// ---------------------------------------------------------------------------

const tools: Anthropic.Tool[] = [
  // -------------------------------------------------------------------------
  // Placeholder tools — replace / extend these as Volute features are built
  // -------------------------------------------------------------------------
  {
    name: 'analyze_financial_data',
    description:
      'Analyzes structured financial data (e.g. income statements, balance sheets, cash flow) ' +
      'and returns key metrics, trends, and anomalies.',
    input_schema: {
      type: 'object' as const,
      properties: {
        data_description: {
          type: 'string',
          description: 'A plain-English description of the financial data to analyze.',
        },
        analysis_type: {
          type: 'string',
          enum: ['overview', 'profitability', 'liquidity', 'growth', 'comparison'],
          description: 'The type of analysis to perform.',
        },
      },
      required: ['data_description', 'analysis_type'],
    },
  },
  {
    name: 'create_deliverable',
    description:
      'Creates a financial deliverable (report, slide deck summary, memo, etc.) ' +
      'based on prior analysis results.',
    input_schema: {
      type: 'object' as const,
      properties: {
        deliverable_type: {
          type: 'string',
          enum: ['report', 'slide_summary', 'memo', 'dashboard_spec'],
          description: 'The type of deliverable to create.',
        },
        content_brief: {
          type: 'string',
          description: 'A brief describing the content and key points to include.',
        },
      },
      required: ['deliverable_type', 'content_brief'],
    },
  },
];

// ---------------------------------------------------------------------------
// Tool execution
// ---------------------------------------------------------------------------

interface ToolInput {
  data_description?: string;
  analysis_type?: string;
  deliverable_type?: string;
  content_brief?: string;
  [key: string]: unknown;
}

async function executeTool(
  toolName: string,
  toolInput: ToolInput,
): Promise<string> {
  console.log(`[agent] Executing tool: ${toolName}`, toolInput);

  switch (toolName) {
    case 'analyze_financial_data': {
      // TODO: wire up real financial analysis logic
      return JSON.stringify({
        status: 'stub',
        tool: 'analyze_financial_data',
        message: `Analysis stub for "${toolInput.data_description}" (type: ${toolInput.analysis_type}). Implement real logic here.`,
      });
    }

    case 'create_deliverable': {
      // TODO: wire up real deliverable generation (e.g. call generate-slide endpoint)
      return JSON.stringify({
        status: 'stub',
        tool: 'create_deliverable',
        message: `Deliverable stub for type "${toolInput.deliverable_type}". Implement real logic here.`,
      });
    }

    default: {
      console.warn(`[agent] Unknown tool requested: ${toolName}`);
      return JSON.stringify({ error: `Unknown tool: ${toolName}` });
    }
  }
}

// ---------------------------------------------------------------------------
// Agent loop — runs until Claude returns end_turn or text with no tool use
// ---------------------------------------------------------------------------

async function runAgentLoop(
  history: ConversationHistory,
): Promise<{ reply: string; updatedHistory: ConversationHistory }> {
  const SYSTEM_PROMPT = `You are Volute's master financial analyst agent. Volute is a professional application for analyzing financial data and creating polished deliverables (reports, presentations, memos, and dashboards).

Your responsibilities:
- Understand and interpret financial data, metrics, and documents shared by the user
- Perform or coordinate financial analysis using available tools
- Help the user plan and create high-quality deliverables
- Ask clarifying questions when the user's intent is ambiguous
- Maintain context across a multi-turn conversation

Tone: professional, concise, and analytical. Avoid filler. Prioritize accuracy.

When the user shares images (charts, tables, screenshots of financial data), describe what you observe and incorporate those observations into your analysis.

You have access to tools for financial analysis and deliverable creation. Use them when appropriate, but always explain to the user what you are doing and why.`;

  let currentHistory = [...history];

  // Agentic loop — continue until no more tool calls
  for (let iteration = 0; iteration < 10; iteration++) {
    console.log(`[agent] Loop iteration ${iteration + 1}, history length: ${currentHistory.length}`);

    const response = await anthropic.messages.create({
      model: 'claude-opus-4-5',
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

    console.log(`[agent] Stop reason: ${response.stop_reason}, content blocks: ${response.content.length}`);

    // Append Claude's response to history
    currentHistory.push({
      role: 'assistant',
      content: response.content,
    });

    // If Claude is done (no tool calls), extract the final text reply
    if (response.stop_reason === 'end_turn') {
      const replyText = response.content
        .filter((block): block is Anthropic.TextBlock => block.type === 'text')
        .map((block) => block.text)
        .join('\n')
        .trim();

      return { reply: replyText, updatedHistory: currentHistory };
    }

    // If Claude wants to use tools, execute them and feed results back
    if (response.stop_reason === 'tool_use') {
      const toolUseBlocks = response.content.filter(
        (block): block is Anthropic.ToolUseBlock => block.type === 'tool_use',
      );

      if (toolUseBlocks.length === 0) {
        // Shouldn't happen, but guard anyway
        break;
      }

      // Execute all requested tools (potentially in parallel for independent tools)
      const toolResults = await Promise.all(
        toolUseBlocks.map(async (toolUse) => {
          const result = await executeTool(toolUse.name, toolUse.input as ToolInput);
          return {
            type: 'tool_result' as const,
            tool_use_id: toolUse.id,
            content: result,
          };
        }),
      );

      // Append tool results as a user message so Claude can continue
      currentHistory.push({
        role: 'user',
        content: toolResults,
      });

      // Continue the loop — Claude will process tool results and may call more tools
      // or produce a final text response
      continue;
    }

    // Unexpected stop reason — break to avoid infinite loop
    console.warn(`[agent] Unexpected stop reason: ${response.stop_reason}`);
    break;
  }

  // Fallback if the loop somehow exits without a clean end_turn
  const lastAssistantMessage = currentHistory
    .filter((m) => m.role === 'assistant')
    .at(-1);

  const fallbackText =
    lastAssistantMessage && Array.isArray(lastAssistantMessage.content)
      ? (lastAssistantMessage.content as Anthropic.ContentBlock[])
          .filter((b): b is Anthropic.TextBlock => b.type === 'text')
          .map((b) => b.text)
          .join('\n')
          .trim()
      : 'I encountered an issue completing that request. Please try again.';

  return { reply: fallbackText, updatedHistory: currentHistory };
}

// ---------------------------------------------------------------------------
// Request handler
// ---------------------------------------------------------------------------

const SUPPORTED_MEDIA_TYPES: SupportedMediaType[] = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
];

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Parse & validate request body
  const { prompt, sessionId: incomingSessionId, images = [] } = req.body as RequestBody;

  if (!prompt || typeof prompt !== 'string' || prompt.trim() === '') {
    return res.status(400).json({ error: '`prompt` is required and must be a non-empty string.' });
  }

  if (!Array.isArray(images)) {
    return res.status(400).json({ error: '`images` must be an array.' });
  }

  // Resolve or create session
  const sessionId: string = incomingSessionId ?? randomUUID();
  const isNewSession = !incomingSessionId || !conversationStore.has(incomingSessionId);

  console.log(
    `[agent] Session: ${sessionId} (${isNewSession ? 'new' : 'existing'}), ` +
      `images: ${images.length}`,
  );

  try {
    // Load existing history
    const history = getHistory(sessionId);

    // Build multimodal user content
    const userContent: Anthropic.MessageParam['content'] = [];

    // Process images — place them before the text for better visual context
    for (let i = 0; i < images.length; i++) {
      const img = images[i];

      let rawBase64 = img.data;
      let detectedMediaType: SupportedMediaType | undefined;

      // Strip data URI prefix if present
      const dataUriMatch = rawBase64.match(/^data:([^;]+);base64,(.+)$/s);
      if (dataUriMatch) {
        detectedMediaType = dataUriMatch[1] as SupportedMediaType;
        rawBase64 = dataUriMatch[2];
      }

      const mediaType: SupportedMediaType =
        img.mediaType ?? detectedMediaType ?? 'image/png';

      if (!SUPPORTED_MEDIA_TYPES.includes(mediaType)) {
        return res.status(400).json({
          error:
            `Unsupported media type "${mediaType}" for image at index ${i}. ` +
            `Supported types: ${SUPPORTED_MEDIA_TYPES.join(', ')}`,
        });
      }

      userContent.push({
        type: 'image',
        source: {
          type: 'base64',
          media_type: mediaType,
          data: rawBase64,
        },
      });

      console.log(
        `[agent] Image ${i + 1}/${images.length}: ${mediaType}, ` +
          `${rawBase64.length} base64 chars`,
      );
    }

    // Append the text prompt
    userContent.push({ type: 'text', text: prompt.trim() });

    // Append the new user turn to history
    history.push({ role: 'user', content: userContent });

    // Run the agent loop
    const { reply, updatedHistory } = await runAgentLoop(history);

    // Persist updated history
    saveHistory(sessionId, updatedHistory);

    console.log(
      `[agent] Reply length: ${reply.length} chars, ` +
        `history depth: ${updatedHistory.length} messages`,
    );

    return res.status(200).json({
      reply,
      sessionId,
      isNewSession,
      historyLength: updatedHistory.length,
    });
  } catch (error: unknown) {
    const err = error as Error & { status?: number };
    console.error('[agent] Error:', err.message, err.stack);

    // Surface Anthropic API errors with their status code when available
    const statusCode = err.status && err.status >= 400 && err.status < 600
      ? err.status
      : 500;

    return res.status(statusCode).json({
      error: err.message ?? 'An unexpected error occurred.',
      ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
    });
  }
}