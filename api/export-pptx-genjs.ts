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
 * Build the user prompt with all slide codes and theme info.
 */
function buildPrompt(slides: SlideInput[], theme: ThemeInput): string {
  const themeBlock = `
## Presentation theme (use these values)
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

  return `Convert the following React/TypeScript slide components into a PowerPoint presentation using PptxGenJS.

Each component renders at 960×540 px (widescreen 16:9).

${themeBlock}

---

${slideBlocks}

---

Write a Node.js script that:
1. Imports pptxgenjs (CommonJS: const pptxgen = require("pptxgenjs"))
2. Creates a presentation with layout "LAYOUT_16x9" (10" × 5.625")
3. For each slide component above, adds one slide that faithfully reproduces the layout, text, data, colors, and typography
4. Saves the file to "/tmp/output.pptx" using pres.writeFile({ fileName: "/tmp/output.pptx" })

Then run the script.`;
}

// ---------------------------------------------------------------------------
// System prompt — PptxGenJS expert with reference patterns
// ---------------------------------------------------------------------------

const SYSTEM_PROMPT = `You are an expert at converting React/TypeScript slide components into PptxGenJS Node.js scripts that produce native .pptx PowerPoint files.

## Your task
1. Read the React slide code provided by the user
2. Write a complete Node.js script using PptxGenJS that recreates the slide as a native PowerPoint
3. Install pptxgenjs: npm install pptxgenjs
4. Run the script to produce the .pptx file at /tmp/output.pptx

## CRITICAL RULES
- NEVER take screenshots or render images. ONLY produce native PPTX elements.
- ALWAYS output a .pptx file. PptxGenJS's writeFile() always produces valid PPTX.
- ALWAYS save to /tmp/output.pptx
- Use CommonJS: const pptxgen = require("pptxgenjs");

## PptxGenJS reference

### Initialization
\`\`\`js
const pptxgen = require("pptxgenjs");
const pres = new pptxgen();
pres.layout = "LAYOUT_16x9"; // 10" × 5.625"
const W = 10;    // slide width in inches
const H = 5.625; // slide height in inches
\`\`\`

### Coordinate conversion (React 960×540 px → inches)
The React canvas is 960×540 px. The PPTX slide is 10" × 5.625".
- x_inches = x_px * (10 / 960)
- y_inches = y_px * (5.625 / 540)
- width_inches = width_px * (10 / 960)
- height_inches = height_px * (5.625 / 540)

### Colors
PptxGenJS uses 6-char hex WITHOUT the "#" prefix.
- "#667eea" → "667EEA"
- Strip all # prefixes. Tailwind colors must be resolved to hex.
- Tailwind reference: gray-50=F9FAFB, gray-100=F3F4F6, gray-200=E5E7EB, gray-300=D1D5DB, gray-400=9CA3AF, gray-500=6B7280, gray-600=4B5563, gray-700=374151, gray-800=1F2937, gray-900=111827, gray-950=030712
- blue-400=60A5FA, blue-500=3B82F6, blue-600=2563EB, blue-700=1D4ED8
- red-500=EF4444, red-600=DC2626, red-700=B91C1C
- green-500=22C55E, green-600=16A34A
- yellow-500=EAB308, purple-500=A855F7, indigo-500=6366F1

### Text boxes
\`\`\`js
slide.addText("Hello World", {
  x: 0.5, y: 0.3, w: 9, h: 0.5,
  fontSize: 24, bold: true, italic: false,
  color: "000000", fontFace: "Calibri",
  align: "left",   // "left" | "center" | "right"
  valign: "top",   // "top" | "middle" | "bottom"
  margin: 0,
});
\`\`\`

### Rich text (multiple styles in one text box)
\`\`\`js
slide.addText([
  { text: "Bold part ", options: { bold: true, fontSize: 14, color: "000000" } },
  { text: "normal part", options: { fontSize: 14, color: "666666" } },
], { x: 0.5, y: 1, w: 9, h: 0.3 });
\`\`\`

### Shapes (rectangles, lines, backgrounds)
\`\`\`js
// Filled rectangle
slide.addShape(pres.shapes.RECTANGLE, {
  x: 0, y: 0, w: 10, h: 0.8,
  fill: { color: "1F2937" },
  line: { color: "1F2937", width: 0 },
});

// Horizontal rule (thin rectangle)
slide.addShape(pres.shapes.RECTANGLE, {
  x: 0.5, y: 2, w: 9, h: 0.015,
  fill: { color: "D1D5DB" },
  line: { color: "D1D5DB", width: 0 },
});
\`\`\`

### Tables
\`\`\`js
const rows = [
  // Header row
  [
    { text: "Company", options: { bold: true, color: "FFFFFF", fill: { color: "1F2937" }, fontSize: 9, fontFace: "Calibri", align: "left" } },
    { text: "Revenue", options: { bold: true, color: "FFFFFF", fill: { color: "1F2937" }, fontSize: 9, fontFace: "Calibri", align: "right" } },
  ],
  // Data rows
  [
    { text: "Acme Corp", options: { fontSize: 8, color: "111827", fill: { color: "FFFFFF" } } },
    { text: "$1.2B",    options: { fontSize: 8, color: "111827", fill: { color: "FFFFFF" }, align: "right" } },
  ],
];

slide.addTable(rows, {
  x: 0.5, y: 1.5, w: 9,
  colW: [5, 4],          // column widths in inches
  border: { type: "solid", pt: 0.5, color: "D1D5DB" },
  margin: [3, 5, 3, 5],  // [top, right, bottom, left] in points
  rowH: [0.35, 0.3],     // row heights in inches
});
\`\`\`

### Charts
\`\`\`js
// Bar chart
slide.addChart(pres.charts.BAR, [
  { name: "Revenue", labels: ["Q1", "Q2", "Q3", "Q4"], values: [1.2, 1.5, 1.8, 2.1] },
], {
  x: 0.5, y: 1.5, w: 9, h: 3.5,
  showValue: false,
  showTitle: false,
  chartColors: ["3B82F6"],
  valAxisMinVal: 0,
  catAxisOrientation: "minMax",
});

// Line chart
slide.addChart(pres.charts.LINE, [
  { name: "Growth", labels: ["2020", "2021", "2022"], values: [10, 25, 45] },
], {
  x: 0.5, y: 1.5, w: 9, h: 3.5,
  showValue: false,
  lineSmooth: false,
  lineDataSymbol: "circle",
  lineDataSymbolSize: 6,
  chartColors: ["3B82F6"],
});

// Pie / Doughnut chart
slide.addChart(pres.charts.DOUGHNUT, [
  { name: "Share", labels: ["A", "B", "C"], values: [40, 35, 25] },
], {
  x: 3, y: 1, w: 4, h: 4,
  showPercent: true,
  chartColors: ["3B82F6", "10B981", "F59E0B"],
});
\`\`\`

### Images (logos etc.)
\`\`\`js
slide.addImage({
  path: "https://example.com/logo.png",
  x: 0.5, y: 0.3, w: 1.5, h: 0.5,
});
\`\`\`

### Slide background
\`\`\`js
const slide = pres.addSlide();
slide.background = { color: "FFFFFF" };
\`\`\`

## Translation strategy
1. Parse the React component to identify all visual elements: text, shapes, tables, charts, images
2. For positioned elements (position: absolute with top/left/width/height in px), convert px to inches using the formulas above
3. For flexbox/grid layouts, calculate the equivalent absolute positions in inches
4. For Tailwind classes, resolve to their CSS values first, then to PptxGenJS properties
5. For Recharts components, extract the data arrays and recreate as native PptxGenJS charts
6. For HTML tables, recreate as native PptxGenJS tables with proper column widths and cell styling
7. Preserve ALL text content exactly — do not summarize or omit any data
8. Layer elements back-to-front: backgrounds first, then shapes, then text on top`;

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
    `[export-pptx-genjs] Generating PPTX for ${slideArray.length} slide(s) via PptxGenJS...`,
  );
  const t0 = Date.now();

  try {
    // ── 1. Call Anthropic with code_execution (no Skill) ──────────────────
    const userPrompt = buildPrompt(slideArray, theme);

    console.log(`[export-pptx-genjs] Prompt: ${userPrompt.length} chars`);

    console.log(`[export-pptx-genjs] Calling Anthropic API...`);

    let message: any;
    try {
      message = await (anthropic as any).beta.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 16000,
        betas: [
          'code-execution-2025-08-25',
          'files-api-2025-04-14',
        ],
        system: SYSTEM_PROMPT,
        container: {},
        messages: [
          { role: 'user', content: userPrompt },
        ],
        tools: [
          { type: 'code_execution_20250825', name: 'code_execution' },
        ],
      });
    } catch (apiErr: any) {
      console.error(`[export-pptx-genjs] API call failed:`, apiErr.message);
      console.error(`[export-pptx-genjs] Status:`, apiErr.status ?? 'N/A');
      console.error(`[export-pptx-genjs] Body:`, JSON.stringify(apiErr.error ?? apiErr.body ?? '').slice(0, 500));
      throw apiErr;
    }

    const elapsed = Date.now() - t0;
    console.log(
      `[export-pptx-genjs] API response in ${elapsed}ms | ` +
      `stop_reason: ${message.stop_reason} | ` +
      `input_tokens: ${message.usage?.input_tokens} | ` +
      `output_tokens: ${message.usage?.output_tokens}`,
    );

    // ── 2. Extract file_id from the response ─────────────────────────────
    const fileIds = extractFileIds(message.content);

    if (fileIds.length === 0) {
      const contentTypes = (message.content as any[]).map(
        (b: any) => `${b.type}${b.name ? '/' + b.name : ''}`,
      );
      console.error(
        `[export-pptx-genjs] No file_id found. ` +
        `Content block types: [${contentTypes.join(', ')}]`,
      );

      // Surface any text or error output from Claude
      const textBlocks = (message.content as any[])
        .filter((b: any) => b.type === 'text')
        .map((b: any) => b.text)
        .join('\n');

      return res.status(500).json({
        error: 'PPTX generation did not produce a downloadable file.',
        details: textBlocks.slice(0, 2000) || 'No text in response.',
        usage: message.usage,
      });
    }

    const fileId = fileIds[0];
    console.log(`[export-pptx-genjs] File ID: ${fileId}`);

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
        `[export-pptx-genjs] Files API download failed (${fileResponse.status}): ${errText.slice(0, 300)}`,
      );
      return res.status(502).json({
        error: `Failed to download generated file: HTTP ${fileResponse.status}`,
        details: errText.slice(0, 500),
      });
    }

    const pptxBuffer = Buffer.from(await fileResponse.arrayBuffer());

    // ── 4. Validate magic bytes — must be a real PPTX (ZIP) ──────────────
    const isZip = pptxBuffer.length >= 4 &&
      pptxBuffer[0] === 0x50 && pptxBuffer[1] === 0x4B &&
      pptxBuffer[2] === 0x03 && pptxBuffer[3] === 0x04;

    if (!isZip) {
      const magicHex = pptxBuffer.slice(0, 4).toString('hex');
      console.error(
        `[export-pptx-genjs] Output is NOT a valid PPTX. ` +
        `Magic bytes: ${magicHex} | size: ${pptxBuffer.length}`,
      );
      return res.status(500).json({
        error: 'Generated file is not a valid PPTX.',
        details: `Magic bytes: ${magicHex}. Expected: 504b0304 (ZIP/PPTX).`,
        usage: message.usage,
      });
    }

    console.log(
      `[export-pptx-genjs] Downloaded PPTX: ${(pptxBuffer.length / 1024).toFixed(1)} KB | ` +
      `total: ${Date.now() - t0}ms`,
    );

    // ── 5. Return the .pptx file ─────────────────────────────────────────
    const safeName = filename.replace(/[^a-zA-Z0-9_-]/g, '_');

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.presentationml.presentation');
    res.setHeader('Content-Disposition', `attachment; filename="${safeName}.pptx"`);
    res.setHeader('Content-Length', pptxBuffer.length);
    return res.status(200).send(pptxBuffer);

  } catch (error: any) {
    const elapsed = Date.now() - t0;
    console.error(`[export-pptx-genjs] Error after ${elapsed}ms:`, error.message);
    console.error('[export-pptx-genjs] Stack:', error.stack);

    return res.status(500).json({
      error: error.message,
      details: error.stack,
    });
  }
}
