import Anthropic from '@anthropic-ai/sdk';
import type { VercelRequest, VercelResponse } from '@vercel/node';

// ---------------------------------------------------------------------------
// Vercel config
// ---------------------------------------------------------------------------

export const config = {
  maxDuration: 300,
};

// ---------------------------------------------------------------------------
// Anthropic client
// ---------------------------------------------------------------------------

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SlideInput {
  code: string;
  slideNumber?: number;
}

interface ThemeInput {
  headingFont?: string;
  bodyFont?: string;
  accentColors?: string[];
  headingTextColor?: string;
  bodyTextColor?: string;
  headingFontSize?: number;
  bodyFontSize?: number;
  backgroundColor?: string;
  slideBackgroundColor?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Recursively search the response content for file_id values.
 * The code_execution_result block structure may vary across SDK versions —
 * this is a defensive approach that finds file_ids regardless of nesting.
 */
function extractFileIds(content: unknown): string[] {
  const ids: string[] = [];

  const walk = (obj: unknown): void => {
    if (!obj || typeof obj !== 'object') return;

    if (Array.isArray(obj)) {
      for (const item of obj) walk(item);
      return;
    }

    const record = obj as Record<string, unknown>;

    if (typeof record.file_id === 'string' && record.file_id.length > 0) {
      ids.push(record.file_id);
    }

    for (const value of Object.values(record)) {
      walk(value);
    }
  };

  walk(content);
  return ids;
}

/**
 * Build the user prompt describing all slides for the pptx Skill.
 */
function buildPrompt(slides: SlideInput[], theme: ThemeInput): string {
  const themeBlock = `
## Presentation theme
- Heading font: "${theme.headingFont || 'Inter, sans-serif'}"
- Body font: "${theme.bodyFont || 'Inter, sans-serif'}"
- Accent colors: ${JSON.stringify(theme.accentColors || ['#667eea', '#764ba2'])}
- Heading text color: "${theme.headingTextColor || '#000000'}"
- Body text color: "${theme.bodyTextColor || '#333333'}"
- Heading font size: ${theme.headingFontSize || 36}pt
- Body font size: ${theme.bodyFontSize || 14}pt
- Background color: "${theme.backgroundColor || theme.slideBackgroundColor || '#ffffff'}"
`.trim();

  const slideBlocks = slides.map((slide, i) => {
    const num = slide.slideNumber ?? i + 1;
    return `## Slide ${num}\n\`\`\`tsx\n${slide.code}\n\`\`\``;
  }).join('\n\n');

  return `Convert the following React/TypeScript slide components into a PowerPoint presentation (.pptx).

Each component renders at 960×540 px (widescreen 16:9). The generated PPTX should be widescreen (13.33" × 7.5") and faithfully reproduce every slide's data, layout, typography, colors, tables, and charts.

${themeBlock}

---

${slideBlocks}

---

Important:
- Create one PPTX slide per component, in the order above.
- Preserve ALL text content, data values, tables, and chart data exactly as they appear in the code.
- Match colors, font sizes, font weights, and layout as closely as possible.
- For Recharts charts (BarChart, LineChart, PieChart, AreaChart), recreate equivalent native PowerPoint charts using the same data series and colors.
- For tables, recreate them as native PowerPoint tables with the same column/row structure, header styling, and data.
- Save the output as a .pptx file.`;
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const {
    slides,
    theme = {} as ThemeInput,
    filename = 'presentation',
  } = req.body;

  if (!slides) {
    return res.status(400).json({ error: '`slides` is required. Pass a single slide object or an array.' });
  }

  const slideArray: SlideInput[] = (Array.isArray(slides) ? slides : [slides])
    .sort((a: SlideInput, b: SlideInput) => (a.slideNumber ?? 0) - (b.slideNumber ?? 0));

  if (slideArray.some(s => !s.code)) {
    return res.status(400).json({ error: 'Every slide must have a `code` field.' });
  }

  console.log(
    `[export-pptx-code] Generating PPTX for ${slideArray.length} slide(s)...`,
  );
  const t0 = Date.now();

  try {
    // ── 1. Call Anthropic with the pptx Skill + code execution ────────────
    const userPrompt = buildPrompt(slideArray, theme);

    console.log(`[export-pptx-code] Prompt: ${userPrompt.length} chars`);

    const message = await (anthropic as any).beta.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 16000,
      betas: [
        'code-execution-2025-08-25',
        'skills-2025-10-02',
        'files-api-2025-04-14',
      ],
      container: {
        skills: [
          { type: 'anthropic', skill_id: 'pptx', version: 'latest' },
        ],
      },
      messages: [
        { role: 'user', content: userPrompt },
      ],
      tools: [
        { type: 'code_execution_20250825', name: 'code_execution' },
      ],
    });

    const elapsed = Date.now() - t0;
    console.log(
      `[export-pptx-code] API response in ${elapsed}ms | ` +
      `stop_reason: ${message.stop_reason} | ` +
      `input_tokens: ${message.usage?.input_tokens} | ` +
      `output_tokens: ${message.usage?.output_tokens}`,
    );

    // ── 2. Extract file_id from the response ─────────────────────────────
    const fileIds = extractFileIds(message.content);

    if (fileIds.length === 0) {
      // Log the full response shape for debugging
      const contentTypes = (message.content as any[]).map(
        (b: any) => `${b.type}${b.name ? '/' + b.name : ''}`,
      );
      console.error(
        `[export-pptx-code] No file_id found in response. ` +
        `Content block types: [${contentTypes.join(', ')}]`,
      );

      // Try to surface any text Claude returned (e.g. an error explanation)
      const textBlocks = (message.content as any[])
        .filter((b: any) => b.type === 'text')
        .map((b: any) => b.text)
        .join('\n');

      return res.status(500).json({
        error: 'PPTX generation did not produce a downloadable file.',
        details: textBlocks.slice(0, 1000) || 'No text in response.',
        usage: message.usage,
      });
    }

    const fileId = fileIds[0];
    console.log(`[export-pptx-code] File ID: ${fileId}`);

    // ── 3. Download the generated .pptx via Files API ────────────────────
    const fileResponse = await fetch(
      `https://api.anthropic.com/v1/files/${encodeURIComponent(fileId)}/content`,
      {
        headers: {
          'x-api-key': process.env.ANTHROPIC_API_KEY!,
          'anthropic-version': '2023-06-01',
          'anthropic-beta': 'files-api-2025-04-14',
        },
      },
    );

    if (!fileResponse.ok) {
      const errText = await fileResponse.text();
      console.error(
        `[export-pptx-code] Files API download failed (${fileResponse.status}): ${errText.slice(0, 300)}`,
      );
      return res.status(502).json({
        error: `Failed to download generated file: HTTP ${fileResponse.status}`,
        details: errText.slice(0, 500),
      });
    }

    const pptxBuffer = Buffer.from(await fileResponse.arrayBuffer());
    console.log(
      `[export-pptx-code] Downloaded PPTX: ${(pptxBuffer.length / 1024).toFixed(1)} KB | ` +
      `total: ${Date.now() - t0}ms`,
    );

    // ── 4. Return the .pptx file ─────────────────────────────────────────
    const safeName = filename.replace(/[^a-zA-Z0-9_-]/g, '_');

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.presentationml.presentation');
    res.setHeader('Content-Disposition', `attachment; filename="${safeName}.pptx"`);
    res.setHeader('Content-Length', pptxBuffer.length);
    return res.status(200).send(pptxBuffer);

  } catch (error: any) {
    const elapsed = Date.now() - t0;
    console.error(`[export-pptx-code] Error after ${elapsed}ms:`, error.message);
    console.error('[export-pptx-code] Stack:', error.stack);

    return res.status(500).json({
      error: error.message,
      details: error.stack,
    });
  }
}
