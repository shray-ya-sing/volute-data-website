import Anthropic from '@anthropic-ai/sdk';
import type { VercelRequest, VercelResponse } from '@vercel/node';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

type SupportedMediaType = 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp';

interface ImageInput {
  /** Base64-encoded image data (without the data URI prefix) */
  data: string;
  /** MIME type of the image */
  mediaType?: SupportedMediaType;
}

// Vercel timeout handling - allows up to 5 minutes for generation (requires Pro or higher)
export const config = {
  maxDuration: 300,
};

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

  const {
    prompt,
    slideNumber = 1,
    context = '',
    theme = {},
    images = [] as ImageInput[],
  } = req.body;

  if (!prompt) {
    return res.status(400).json({ error: 'Prompt is required' });
  }

  if (!Array.isArray(images)) {
    return res.status(400).json({ error: '`images` must be an array' });
  }

  const SUPPORTED_MEDIA_TYPES: SupportedMediaType[] = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
  ];

  console.log(`[generate-slide] Generating slide ${slideNumber} with ${images.length} image(s)...`);

  try {
    const themePropsDoc = `
Theme Properties (use these as props — font sizes are NUMBERS, not strings):
- headingFont: "${theme.headingFont || "'Inter', sans-serif"}" (for titles and headings)
- bodyFont: "${theme.bodyFont || "'Inter', sans-serif"}" (for body text and paragraphs)
- accentColors: ${JSON.stringify(theme.accentColors || ['#667eea', '#764ba2'])} (array of accent colors for highlights, buttons, etc.)
- headingTextColor: "${theme.headingTextColor || '#000000'}" (color for heading text)
- bodyTextColor: "${theme.bodyTextColor || '#333333'}" (color for body text)
- headingFontSize: ${theme.headingFontSize || 36} (number — base px size for main headings, render as \`\${headingFontSize}px\`)
- bodyFontSize: ${theme.bodyFontSize || 14} (number — base px size for body text, render as \`\${bodyFontSize}px\`)`;

    const systemPrompt = `You are an expert at creating beautiful, professional presentation slides using React and TypeScript.

## Canvas Specification

**CRITICAL: Every slide MUST be exactly 960px × 540px (16:9 aspect ratio)**

\`\`\`tsx
<div style={{
  width: '960px',
  height: '540px',
  position: 'relative',
  overflow: 'hidden',
  fontFamily: bodyFont
}}>
  {/* ALL children use position: 'absolute' */}
</div>
\`\`\`

## Component Requirements

Generate a React component with this exact TypeScript interface:

\`\`\`tsx
import React from 'react';

interface SlideProps {
  headingFont: string;
  bodyFont: string;
  accentColors: string[];
  headingTextColor: string;
  bodyTextColor: string;
  headingFontSize: number;
  bodyFontSize: number;
}

export default function Slide${slideNumber}({
  headingFont,
  bodyFont,
  accentColors,
  headingTextColor,
  bodyTextColor,
  headingFontSize,
  bodyFontSize,
}: SlideProps) { ... }
\`\`\`

${themePropsDoc}

## Layout Rules — READ CAREFULLY

### 1. Root Container (MANDATORY)
- width: '960px', height: '540px'
- position: 'relative'
- overflow: 'hidden'
- Sets default fontFamily: bodyFont

### 2. ALL Child Elements (MANDATORY)
- MUST use position: 'absolute'
- MUST specify top, left, width, and height in pixels
- MUST NOT exceed canvas bounds (960px wide, 540px tall)
- DO NOT use flexbox, grid, or relative positioning on any element

### 3. Safe Zones
- Title area: top: 40–80px, left: 60px, width: 840px
- Content area: top: 140px, left: 60px, width: 840px, height: 340px
- Footer: top: 500px, left: 60px, width: 840px

### 4. Typography Scaling (font sizes are numbers)
\`\`\`tsx
const h1Size = headingFontSize;           // e.g. 36
const h2Size = headingFontSize * 0.7;     // e.g. ~25
const h3Size = headingFontSize * 0.5;     // e.g. 18
const bodySize = bodyFontSize;            // e.g. 14
const smallSize = bodyFontSize * 0.875;   // e.g. ~12

// Always render as:
fontSize: \`\${h1Size}px\`
\`\`\`

### 5. Styling Rules
- Use theme props for ALL fonts, colors, and sizes — never hardcode
- Headings: headingFont, headingTextColor, headingFontSize
- Body text: bodyFont, bodyTextColor, bodyFontSize
- Accents: accentColors[0] (primary), accentColors[1–5] (secondary)
- Transparency: template literal e.g. \`\${accentColors[0]}20\` for 20% opacity hex suffix

## Multi-Column Layouts

For 2-column layouts, calculate pixel widths explicitly:
\`\`\`tsx
// Two equal columns with gap, within 840px content width
const colWidth = 400;  // (840 - 40px gap) / 2
const col1Left = 60;
const col2Left = 60 + colWidth + 40;  // = 500

<div style={{ position: 'absolute', top: '140px', left: \`\${col1Left}px\`, width: \`\${colWidth}px\`, height: '340px' }}>
  {/* column 1 content */}
</div>
<div style={{ position: 'absolute', top: '140px', left: \`\${col2Left}px\`, width: \`\${colWidth}px\`, height: '340px' }}>
  {/* column 2 content */}
</div>
\`\`\`

## Charts (recharts)

Chart containers MUST have fixed pixel dimensions — never use percentages:
\`\`\`tsx
// CORRECT
<div style={{ position: 'absolute', top: '120px', left: '60px', width: '840px', height: '370px' }}>
  <ResponsiveContainer width="100%" height="100%">
    <BarChart data={data}>...</BarChart>
  </ResponsiveContainer>
</div>

// WRONG — do not do this
<ResponsiveContainer width="100%" height={300}>
\`\`\`

## Tables

Position tables absolutely. Use fixed column widths and compact padding for data-dense slides:
\`\`\`tsx
<div style={{ position: 'absolute', top: '140px', left: '60px', width: '840px', height: '340px', overflow: 'hidden' }}>
  <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
    <thead>
      <tr>
        <th style={{ fontFamily: headingFont, fontSize: \`\${bodyFontSize * 0.85}px\`, textAlign: 'left', padding: '6px 8px', borderBottom: '2px solid #333' }}>Label</th>
        <th style={{ fontFamily: headingFont, fontSize: \`\${bodyFontSize * 0.85}px\`, textAlign: 'right', padding: '6px 8px', borderBottom: '2px solid #333' }}>Value</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td style={{ fontFamily: bodyFont, fontSize: \`\${bodyFontSize * 0.8}px\`, padding: '4px 8px' }}>Row</td>
        <td style={{ fontFamily: bodyFont, fontSize: \`\${bodyFontSize * 0.8}px\`, textAlign: 'right', padding: '4px 8px' }}>$1,234</td>
      </tr>
    </tbody>
  </table>
</div>
\`\`\`

### Logos

Use the following URL pattern to include logos. Replace [TICKER] with the company ticker (ex. NVDA, AAPL, etc.) in all caps and without brackets and use process.env.LOGO_DEV_PUBLIC_KEY exactly as written for the token:
https://img.logo.dev/ticker/[TICKER]?token=process.env.LOGO_DEV_PUBLIC_KEY

## Common Mistakes to AVOID

❌ Using flexbox or grid on the root or major layout containers
❌ Using height: '100%' or width: '100%' on absolutely positioned children
❌ Omitting width or height on any absolutely positioned element
❌ Exceeding 960px width or 540px height with any element
❌ Hardcoding font sizes as strings like '16px' — use \`\${bodyFontSize}px\`
❌ Importing any package other than lucide-react and recharts

✅ Every element: position absolute, explicit top/left/width/height in px
✅ Font sizes: always \`\${headingFontSize}px\` or \`\${bodyFontSize * 0.8}px\` etc.
✅ Root div: exactly 960×540, position relative, overflow hidden

## Available Dependencies (USE ONLY THESE)

- lucide-react — icons: \`import { TrendingUp } from 'lucide-react'\`
- recharts — charts: \`import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'\`

DO NOT import any other packages. DO NOT use external images or assets.

## Output Requirements

- Return ONLY the TypeScript/TSX code — no markdown fences, no explanations
- Start directly with import statements or the export default function
- Code must be production-ready and immediately executable
- Use inline styles only — no CSS files, no styled-components, no Tailwind

## PPTX Export Annotations — MANDATORY

Every slide you generate will be parsed by a headless browser DOM extractor that converts it to PowerPoint. To ensure faithful conversion you MUST annotate elements with \`data-pptx-type\` and \`data-pptx-id\` attributes. This is not optional — slides without these attributes will produce degraded PowerPoint output.

### Rules

1. Every meaningful visible element MUST have \`data-pptx-type\` and a unique \`data-pptx-id\` (integer string, starting at 1).
2. Do NOT annotate the root 960×540 container — it is handled separately as the slide background.
3. Do NOT annotate purely structural wrapper divs that have no background, no border, and no direct text content.
4. Use the correct type value from this list:

| data-pptx-type | When to use |
|---|---|
| \`heading\` | Primary title / heading text |
| \`subheading\` | Secondary title or subtitle |
| \`text\` | Body text, labels, annotations, footnotes |
| \`shape\` | Div with a background color or border but no direct text |
| \`chart\` | The outermost div wrapping a Recharts component |
| \`table\` | The \`<table>\` element |
| \`divider\` | A thin horizontal or vertical line element |

### Shape and text annotation example
\`\`\`tsx
<div
  data-pptx-type="shape"
  data-pptx-id="3"
  style={{ position: 'absolute', top: '140px', left: '60px', width: '200px', height: '80px',
           backgroundColor: accentColors[0] }}
>
  <span
    data-pptx-type="text"
    data-pptx-id="4"
    style={{ position: 'absolute', top: '8px', left: '12px', fontSize: \`\${bodyFontSize}px\`, color: '#ffffff' }}
  >
    Label text
  </span>
</div>
\`\`\`

### Chart annotation — data-chart-json is MANDATORY for charts

For every chart, place \`data-pptx-type="chart"\` and \`data-chart-json\` on the outermost wrapper div. The \`data-chart-json\` attribute must contain a JSON string with the full chart data so the PPTX exporter can reconstruct native PowerPoint charts.

**The JSON must be serialised with \`JSON.stringify()\` assigned to the attribute — do not use a template literal for the JSON.**

\`\`\`tsx
{(() => {
  const revenueData = [
    { year: 'FY23A', mgmt: 1181, street: 1181 },
    { year: 'FY24A', mgmt: 1212, street: 1127 },
    { year: 'FY25E', mgmt: 1236, street: 1217 },
  ];

  const chartJson = JSON.stringify({
    chartType: 'lineChart',   // 'lineChart' | 'barChart' | 'pieChart'
    barDir: 'col',            // only relevant for barChart: 'col' | 'bar'
    series: [
      {
        name: 'Mgmt Plan',
        color: accentColors[0],
        smooth: true,
        markerSize: 4,
        points: revenueData.map(d => ({ label: d.year, value: d.mgmt })),
      },
      {
        name: 'Street Case',
        color: accentColors[1] || '#22c55e',
        smooth: true,
        markerSize: 4,
        points: revenueData.map(d => ({ label: d.year, value: d.street })),
      },
    ],
    axes: {
      catAx: { labelColor: '#ffffff', labelFontSize: 800 },
      valAx: { labelColor: '#ffffff', labelFontSize: 800 },
    },
    legend: { visible: true, position: 'b' },
    dataLabels: { visible: false },
  });

  return (
    <div
      data-pptx-type="chart"
      data-pptx-id="5"
      data-chart-json={chartJson}
      style={{ position: 'absolute', top: '120px', left: '60px', width: '840px', height: '370px' }}
    >
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={revenueData}>
          <XAxis dataKey="year" />
          <YAxis />
          <Line type="monotone" dataKey="mgmt"   stroke={accentColors[0]} strokeWidth={2} />
          <Line type="monotone" dataKey="street" stroke={accentColors[1] || '#22c55e'} strokeWidth={2} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
})()}
\`\`\`

### Key requirements for data-chart-json
- \`chartType\`: must be \`'lineChart'\`, \`'barChart'\`, or \`'pieChart'\`
- \`series[].points\`: every point needs \`label\` (string) and \`value\` (number)
- \`series[].color\`: must be a resolved hex string — use accentColors[0] etc., not a variable reference that will appear as \`"accentColors[0]"\` in the JSON. Compute the value first.
- The attribute value must be the result of \`JSON.stringify()\` called at render time — not a hardcoded string — so that dynamic values like accentColors are resolved correctly.

### IDs
- Assign \`data-pptx-id\` values as sequential integers starting from 1.
- Every annotated element in the slide must have a unique ID.
- Do not reuse IDs within a slide.

## Citation Markers

If the user's prompt contains citation markers in the format [cite:N] or [cite:N,M]:
- Render them as small interactive badges positioned near the cited data
- Use this pattern for each citation:

\`\`\`tsx
<span
  data-citation="1"
  style={{
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '16px',
    height: '16px',
    borderRadius: '50%',
    backgroundColor: accentColors[0] + '20',
    color: accentColors[0],
    fontSize: '9px',
    fontWeight: 700,
    fontFamily: bodyFont,
    cursor: 'pointer',
    marginLeft: '2px',
    verticalAlign: 'super',
    lineHeight: 1,
  }}
>
  1
</span>
\`\`\`

- For multiple citations [cite:1,3], render adjacent badges
- Place citation badges inline right after the specific number or fact they cite
- The data-citation attribute MUST contain the citation number as a string
- Keep badges small (16x16px) so they don't disrupt the layout
- Use accentColors[0] with 20% opacity for the badge background

## Slide Layout Examples

The examples below are compressed reference patterns derived from real investment banking presentations. Use them ONLY as structural and layout guidance.

⚠️ CRITICAL BRANDING RULE: These examples reference Goldman Sachs, Deutsche Bank, Morgan Stanley, Greenhill, and other banks purely as layout inspiration. You MUST NEVER mention, display, or allude to any of these banks (or any other bank/firm) in generated slides UNLESS the user explicitly names them in their prompt. Never render bank logos, names, color schemes associated with a specific bank, or any branding from these examples. Use only the layout patterns.

### Example 1 — Three-Column Layout
\`\`\`tsx
// ThreeColumnLayout: header + 3 equal columns + footer, all in a 960×540 absolute canvas
// col width = 260px each, gaps = 30px, left margin = 60px
// header: absolute top:40 left:60 w:840 — can contain logo block + title + subtitle bar
// leftColumn: absolute top:140 left:60 w:260 h:350 — text bullets with bottom-bordered lines
// centerColumn: absolute top:140 left:350 w:260 h:350 — large stat/highlight + supporting text
// rightColumn: absolute top:140 left:640 w:260 h:350 — 2 stacked BarCharts (w:240 h:150 each)
// footer: absolute top:500 left:60 w:840 — footnotes left, page number right
// Accent bar pattern: full-width colored div (h:32) directly under subtitle as a section divider
\`\`\`

### Example 2 — Multi-Chart Dashboard (4-up grid)
\`\`\`tsx
// 4 charts across top row + 4 metric panels across bottom row
// Top charts: each absolute, w:190 h:220, left offsets: 60,260,460,660, top:110
//   Each chart panel: colored background, title text, CAGR annotation, LineChart inside
//   LineChart: w:170 h:150, 2 series (mgmt plan vs street case), no legend inside panel
// Bottom panels: each absolute, w:190 h:180, left offsets same, top:340
//   Growth %: manual bar columns using div heights proportional to value
//   Margin table: 2-col grid (Mgmt / Street), rows for each forecast year
// Shared legend: absolute top:60 right:60, bordered box, two line samples + labels
// Page header: title left top:40, legend box right top:40
// Footer: source left, firm name center, page number right — all absolute top:510
\`\`\`

### Example 3 — Executive Summary (2×2 grid)
\`\`\`tsx
// Layout: title bar top:40, then 2 columns × 2 rows of content panels
// col1Left:60 w:390, col2Left:510 w:390, gap:60
// Top row top:110 h:190: [Business Overview bullets] [Financial table]
//   Bullets: 4 items, each ~36px tall, left-border accent line
//   Table: thead with year cols + CAGR col, tbody rows alternating white/gray
//     Bold rows: Revenue, Gross Profit, EBITDA; italic gray rows: growth/margin
// Bottom row top:320 h:170: [Stock LineChart dual-axis] [Stacked BarChart with total labels]
//   LineChart: left yAxis ($) right yAxis (x multiple), two lines different colors
//   BarChart: stackId groups, 3 series, total label above each bar
// Footer: absolute top:505, firm logo left, page number right
\`\`\`

### Example 4 — Comparables Bar Chart (ranked peers)
\`\`\`tsx
// Two stacked ChartSections, each ~220px tall, separated by a section header bar
// Section header: top border line + label text, full width
// Each BarChart: ResponsiveContainer w:100% h:200, barCategoryGap:20%
//   XAxis: custom MultiLineTick (split on \\n), no tick lines
//   YAxis: hidden, domain padded above max and below min for label room
//   ReferenceLine y=0: thin stroke for zero baseline
//   ReferenceLine y=peerMedian: dashed colored line + right-aligned italic label above chart
//   Bar: Cell per entry with individual fill colors; highlighted bars use accent, peers use base blue
//   LabelList: custom ValueLabel component — places value above bar (negative → below, wrapped in parens)
// Footer: firm branding left, disclaimer center (fontSize:7), page number right
\`\`\`

### Example 5 — Summary / Agenda Slide
\`\`\`tsx
// Two-column layout: left col w:260 top:120 — intro paragraph, centered vertically
// Right col w:540 top:80:
//   Header band: colored bg h:50, large title text inside
//   Agenda items: 3 items, each a flex row — colored label box w:130 h:70 + bullet list panel
//     Label box: centered multi-line bold text, same accent color as header
//     Bullet panel: top border line, 3-5 bullet items fontSize:13, lineHeight:1.6
//     Items spaced ~80px apart vertically
// Footer: absolute top:500, firm name serif italic left, page number right
\`\`\`

### Example 6 — Scorecard / Ratings Table
\`\`\`tsx
// Dark background slide (bg:#000 or dark navy), inner white content panel
// Header: disclaimer bar top:0 h:20 (red text), title h1 left, firm logo box right
// White panel: absolute top:80 left:40 w:880 h:430, padding inside
//   Grid layout (CSS grid columns: [labelCol] repeat(N, 1fr)):
//     Row 1: empty + N colored header cells (each agency/category gets its own accent color)
//     Row 2 "Considerations": left label cell (dark bg, white text) + N bordered content cells
//       Content cells: bold sub-label + bullet list items, fontSize:11
//     Row 3 "Current Metrics": left label cell + N metric stacks
//       Each metric stack: 3 rows of gray-bg pills showing metric name + bold value
//     Row 4 "Breakpoints": left label cell + N mini-tables
//       Mini-table: thead (Rating | Breakpoint), tbody rows, highlighted current row (blue-tinted bg)
//   All cells: border:1px solid #ccc, padding:8px, fontSize:11
// Footer inside white panel: sources line + 3 numbered footnotes, fontSize:9, top:410
\`\`\`

### Example 7 — Financial Model / DDM / Schedule
\`\`\`tsx
// Compact dense layout — many rows, small font (fontSize:9 body, fontSize:8.5 cells)
// Left panel: absolute left:40 w:160 h:460 — assumptions list + small bar chart (w:140 h:110)
//   Bar chart: 4 bars (dividends, terminal value, adjustments, total), top labels, no yAxis
// Right panel: absolute left:210 w:710 h:460
//   Main table: thead dark bg, year columns; tbody organized into labeled sections
//     Section headers: full-width row, light gray bg, bold text (e.g. "A. Cash flows")
//     Data rows: label cell w:38%, value cells text-right; base case row bold + heavier border
//     Special rows: "Present/Terminal value" header spans cols with centered label
//   Sensitivity section below main table (top border separator):
//     Two sensitivity tables side by side, each w:48%
//     Each table: header row dark bg + cost-of-equity row labels (rotated vertical text label beside)
//     Base case intersection cell: highlighted blue bg
//     Extra rows below tbody: implied ratio rows in lighter gray
// Footer: firm name left (small colored text), long disclaimer center (fontSize:7), page# right
\`\`\`

### Example 8 — Title / Section Divider Slide
\`\`\`tsx
// Minimal slide — mostly whitespace, 2 elements:
// Top-left: firm name line 1 + line 2 (colored, fontSize:18/14), absolute top:40 left:60
// Top-right: square logo placeholder (w:60 h:60, solid bg), absolute top:40 right:60
// Center: large section title h1 (fontSize:48 fontWeight:400), absolute top:240 left:60 w:840 textAlign:center
//          subtitle paragraph below title, fontSize:20 textAlign:center, muted color
// No footer, no decorative elements — clean open whitespace is intentional
\`\`\`

### Example 9 — Outreach / Process Summary Table
\`\`\`tsx
// Dark outer bg, centered white card w:900 aspectRatio:16/10
// Black top accent bar h:6 absolute top:0
// Title: absolute top:20, bold tracking-wide, fontSize:22
// Table layout: left group-label column (w:100) + main data table (flex-1)
//   Group label column: vertically stacked colored cells, each spanning N rows via explicit height
//     Cell contains: centered bold text + small circular count badge
//   Data table: thead dark gray bg (#4a4a4a), white text, columns: Counterparty | Date | NDA | Meeting | FollowUp | Status
//     Counterparty cell: black rectangle placeholder (h:20 w:90) — logos redacted
//     NDA cell: checkmark ✓ or empty
//     Status cell: short text label
//     Row height: 48px, alternating hover state
// Footnote: absolute bottom:60 left:40, fontSize:8, gray text
// Black footer bar: h:48 absolute bottom:0, centered italic colored confidentiality text
\`\`\`

### Example 10 — Metrics / Comparables Data Table
\`\`\`tsx
// White card centered on gray bg, aspectRatio:16/10
// Decorative header bar: short wide colored rectangle centered top (w:500 h:10)
// Title: centered bold fontSize:20, subtitle centered fontSize:12 below
// Sub-label: italic gray "($ in millions, except per share data)" fontSize:10
// Main table: w:full, complex multi-level headers
//   Header row 1: empty colspan:2, then grouped headers spanning multiple cols (dark green bg / lighter green bg)
//   Header row 2: sub-column labels (Low/Mid/High) under grouped headers
//   Tbody: each row may have a rowSpan category label cell on far left (vertical text)
//     Logo placeholder cell: black rectangle w:80 h:24
//     Superscript cell: small raised notation
//     Value cells: editable, text-right, alternating row bg
// Footer: absolute bottom:20, firm name italic serif left, page divider + number right
\`\`\`

Now generate the slide component based on the user's request.`;

    const userPromptText = context
      ? `${context}\n\nSlide ${slideNumber} requirements:\n${prompt}`
      : `Create slide ${slideNumber}:\n${prompt}`;

    // Build the content array — images first, then text prompt.
    const userContent: Anthropic.MessageParam['content'] = [];

    for (let i = 0; i < images.length; i++) {
      const img = images[i];

      let rawBase64 = img.data;
      let detectedMediaType: SupportedMediaType | undefined;

      const dataUriMatch = rawBase64.match(/^data:([^;]+);base64,(.+)$/);
      if (dataUriMatch) {
        detectedMediaType = dataUriMatch[1] as SupportedMediaType;
        rawBase64 = dataUriMatch[2];
      }

      const mediaType: SupportedMediaType = img.mediaType ?? detectedMediaType ?? 'image/png';

      if (!SUPPORTED_MEDIA_TYPES.includes(mediaType)) {
        return res.status(400).json({
          error: `Unsupported media type "${mediaType}" for image at index ${i}. Supported types: ${SUPPORTED_MEDIA_TYPES.join(', ')}`,
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

      console.log(`[generate-slide] Added image ${i + 1}/${images.length} (${mediaType}, ${rawBase64.length} base64 chars)`);
    }

    userContent.push({
      type: 'text',
      text: userPromptText,
    });

    const stream = await anthropic.messages.stream({
      model: 'claude-opus-4-6',
      max_tokens: 25000,
      temperature: 1.0,
      system: [
        {
          type: 'text',
          text: systemPrompt,
          cache_control: { type: 'ephemeral' },
        },
      ],
      messages: [{ role: 'user', content: userContent }],
    });

    const message = await stream.finalMessage();

    const responseText = message.content
      .filter(block => block.type === 'text')
      .map(block => 'text' in block ? block.text : '')
      .join('\n')
      .trim();

    let code = responseText;

    const codeBlockMatch = code.match(/```(?:typescript|tsx|ts|jsx|javascript)?\n?([\s\S]*?)```/);
    if (codeBlockMatch) {
      code = codeBlockMatch[1].trim();
    }

    if (!code.trimEnd().endsWith('}')) {
      console.error(`[generate-slide] WARNING: Output appears truncated! Last 100 chars: ${code.slice(-100)}`);
      return res.status(500).json({
        error: 'Generated code was truncated. Try simplifying the slide or increasing max_tokens.',
        truncated: true,
      });
    }

    if (!code.startsWith('export default function') && !code.startsWith('import')) {
      console.warn('[generate-slide] Response does not start with expected export/import statement');
      console.warn('[generate-slide] Raw response:', responseText.substring(0, 200));
    }

    const CHUNK_SIZE = 500;
    const totalChunks = Math.ceil(code.length / CHUNK_SIZE);
    console.log(`[generate-slide] Code output (${code.length} chars, ${totalChunks} chunks):`);
    for (let i = 0; i < totalChunks; i++) {
      console.log(`[chunk ${i + 1}/${totalChunks}]\n${code.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE)}`);
    }

    console.log(`[generate-slide] Successfully generated slide ${slideNumber} (${code.length} chars)`);

    return res.status(200).json({
      code,
      slideNumber,
      theme,
      imageCount: images.length,
      usage: {
        input_tokens: message.usage.input_tokens,
        output_tokens: message.usage.output_tokens,
      },
    });

  } catch (error: any) {
    console.error('[generate-slide] Error:', error.message);
    return res.status(500).json({
      error: error.message,
      details: error.stack,
    });
  }
}