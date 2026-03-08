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

// ---------------------------------------------------------------------------
// Template categories — blob files must follow the naming convention:
//   ${BLOB_BASE_URL}/slide-templates/${category}_1.jpg
//   ${BLOB_BASE_URL}/slide-templates/${category}_2.jpg
//   ${BLOB_BASE_URL}/slide-templates/${category}_3.jpg
// ---------------------------------------------------------------------------

export type TemplateCategory =
  | 'title'
  | 'table_of_contents'
  | 'section_divider'
  | 'executive_summary'
  | 'market_overview'
  | 'company_overview'
  | 'peer_benchmarking'
  | 'precedent_transactions'
  | 'strategic_alternatives'
  | 'valuation_football_field'
  | 'financial_model'
  | 'wacc_analysis'
  | 'process_timeline'
  | 'logo_splash'
  | 'stock_performance';

interface CachedReferenceImage {
  type: 'base64';
  media_type: 'image/jpeg';
  data: string;
}

// Module-level cache — persists across requests on a warm Vercel instance.
// On cold start, images are fetched once from Vercel Blob and cached for the
// lifetime of that instance. No TTL needed — blob URLs are stable.
const referenceImageCache = new Map<TemplateCategory, CachedReferenceImage[]>();

async function getReferenceImages(category: TemplateCategory): Promise<CachedReferenceImage[]> {
  if (referenceImageCache.has(category)) {
    console.log(`[generate-slide] 🖼  Reference cache hit: ${category}`);
    return referenceImageCache.get(category)!;
  }

  const baseUrl = process.env.BLOB_BASE_URL;
  if (!baseUrl) {
    console.warn('[generate-slide] ⚠️  BLOB_BASE_URL not set — skipping reference images');
    return [];
  }

  const urls = [1, 2, 3].map(
    (n) => `${baseUrl}/slide-templates/${category}_${n}.jpg`,
  );

  console.log(`[generate-slide] 🖼  Fetching reference images for category: ${category}`);

  const images = await Promise.all(
    urls.map(async (url, i) => {
      try {
        const res = await fetch(url);
        if (!res.ok) {
          console.warn(`[generate-slide] ⚠️  Reference image ${i + 1} not found (${res.status}): ${url}`);
          return null;
        }
        const buffer = await res.arrayBuffer();
        console.log(
          `[generate-slide] 🖼  Loaded reference ${i + 1} for ${category}: ` +
          `${(buffer.byteLength / 1024).toFixed(1)} KB`,
        );
        return {
          type: 'base64' as const,
          media_type: 'image/jpeg' as const,
          data: Buffer.from(buffer).toString('base64'),
        };
      } catch (err: any) {
        console.warn(`[generate-slide] ⚠️  Failed to fetch reference image ${i + 1}: ${err.message}`);
        return null;
      }
    }),
  );

  const valid = images.filter((img): img is CachedReferenceImage => img !== null);
  referenceImageCache.set(category, valid);
  console.log(`[generate-slide] 🖼  Cached ${valid.length}/3 reference images for ${category}`);
  return valid;
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
    templateCategory,   // optional: TemplateCategory — loads reference images for new slides
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

  console.log(`[generate-slide] Generating slide ${slideNumber} with ${images.length} user image(s)${templateCategory ? `, template category: ${templateCategory}` : ''}...`);

  try {
    // Load reference images for new slides when templateCategory is provided
    let referenceImages: CachedReferenceImage[] = [];
    if (templateCategory) {
      referenceImages = await getReferenceImages(templateCategory as TemplateCategory);
    }

    const themePropsDoc = `
Theme Properties (use these as props — font sizes are NUMBERS, not strings):
- headingFont: "${theme.headingFont || "'Inter', sans-serif"}" (for titles and headings)
- bodyFont: "${theme.bodyFont || "'Inter', sans-serif"}" (for body text and paragraphs)
- accentColors: ${JSON.stringify(theme.accentColors || ['#667eea', '#764ba2'])} (array of accent colors for highlights, buttons, etc.)
- headingTextColor: "${theme.headingTextColor || '#000000'}" (color for heading text)
- bodyTextColor: "${theme.bodyTextColor || '#333333'}" (color for body text)
- headingFontSize: ${theme.headingFontSize || 36} (number — base px size for main headings, render as \`\${headingFontSize}px\`)
- bodyFontSize: ${theme.bodyFontSize || 14} (number — base px size for body text, render as \`\${bodyFontSize}px\`)
- backgroundColor: "${theme.backgroundColor || '#ffffff'}" (background color for the slide, default white)  
    `;

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
  backgroundColor: string;
}

export default function Slide${slideNumber}({
  headingFont,
  bodyFont,
  accentColors,
  headingTextColor,
  bodyTextColor,
  headingFontSize,
  bodyFontSize,
  backgroundColor,
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
- Slide background color: backgroundColor (always use white as default unless specified otherwise) 
- DO NOT USE ANY ICONS UNLESS SPECIFIED BY USER
- USE SIMPLE BULLETED PARAGRAPHS FOR ALL TEXT PARAGRAPHS UNLESS USER SPECIFICALLY REQUESTS OTHERWISE 

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
❌ Including gradients and UI effects that cannot be faithfully rendered in PowerPoint (e.g. drop shadows, glows, blurs) — keep it simple and flat for best results. Slides usually have a flat white/light background, clean shapes, whitespace, bullets, and charts with solid colors and simple axes/labels.
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
  style={{ position: 'absolute', top: '140px', left: '60px', width: '200px', height: '80px'}}
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

### Example 11 — Stock Price Performance with Event Annotations
\`\`\`tsx
// Full-width LineChart (w:840 h:340) with floating annotation boxes overlaid
// Chart: XAxis type="number" domain=[yearStart,yearEnd], ticks at each year; YAxis tickFormatter="$N.00"
// Annotation boxes: position:absolute, left/top as % of chart container, zIndex:10
//   Each box: white bg, border:1px solid #ccc, padding:8px, maxWidth:140px, fontSize:9
//   Box contains: bold date line + description text; no connector lines needed
// Current price label: absolute right:~50px top:~30% fontSize:18 fontWeight:600 accent color
// Left panel (w:240): summary box with colored bg, h2 title, bullet list fontSize:11 lineHeight:1.6
// Layout: grid [240px 1fr], gap:32px; chart panel is relative-positioned container
// Footer: firm name serif left, page number right
\`\`\`
### Example 12 — Dual Line Chart Valuation Overview
\`\`\`tsx
// Header band: colored bg h:64, h1 title + subtitle inside, full width
// Layout: grid [280px 1fr], gap:32px
// Left panel (w:280):
//   Text block: 3 paragraphs fontSize:13, first bold; lineHeight:1.6
//   Summary table below text: bordered box, header cell centered (colored bg), then rows
//     Each row: grid grid-cols-2, left label / right value bold; highlighted row = yellow bg
//   Firm name serif at bottom left
// Right panel: grid grid-cols-2 gap:24 — two LineCharts side by side
//   Each chart: title h3 colored above, LineChart w:380 h:320
//   Chart 1: single line + dashed ReferenceLine (historical avg) with inline label right
//   Chart 2: single line, YAxis tickFormatter="%", optional second series
//   Legend below each chart: colored dash sample + label text fontSize:11
// Source note: text-xs gray below charts
// Page number: absolute bottom-right
\`\`\`
### Example 13 — Scatter / Dot Matrix (Certainty vs. Metric)
\`\`\`tsx
// Dark bg outer, white inner panel
// Header: disclaimer bar top (red text), large h1 title all-caps
// White panel: 4-column grid [200px 1fr 1fr 1fr 300px] (axis label + 3 metric cols + memo col)
// Left axis column: flex-col justify-between, "Greater Uncertainty" top (red italic) / "Greater Certainty" bottom (green italic)
// Each metric column:
//   Header cell: colored bg, white text, centered label (with optional superscript)
//   Chart area: relative h:500px, border left/right/bottom, bg gray-50
//     Top and bottom thin black bars (h:4) as axis bounds
//     Center vertical line (w:0.5 bg-black absolute left-50%)
//     Data points: absolute positioned by bottom:N%, centered on vertical line
//       Each point: colored circle (w:12 h:12 rounded-full border-2 border-black) + value label right + category label left (italic gray)
//       Highlighted subject company: different accent color circle + optional dashed oval callout above
// Memo column: same structure but right-side labels "Lower/Higher Multiple"; header split into 2 cells (gray top + colored bottom)
// Footer inside white panel: source line + 2-3 numbered notes, fontSize:11
\`\`\`
### Example 14 — Three-Column Chart Slide (Line Charts per column)
\`\`\`tsx
// Same ThreeColumnLayout pattern as Example 1
// Header: logo placeholder box left + h1 title + subtitle + optional right-aligned label
// Each column: section title with bottom border (2px colored) + LineChart (w:300 h:320)
//   XAxis: angled labels (-45deg, textAnchor:end, height:60)
//   Optional annotation box overlay (absolute top:0 left:N, bordered, fontSize:11, grid inside for key/value pairs)
//   Current value label: text-right bold colored fontSize:13 below chart
// Footer: italic source line left + page number right, separated by top border
\`\`\`
### Example 15 — Leverage / Ratings Bar Chart with Threshold Lines
\`\`\`tsx
// Dark bg outer, white inner panel
// Header: disclaimer bar (red text), h1 + subtitle left, firm logo box right
// White panel sections — grid [200px 1fr] for each row:
//   Row 1: 4-col header (empty + 3 agency colored header cells)
//   Row 2: label cell (dark bg, white text, centered) + grouped BarChart (3 bars per year cluster)
//     BarChart: w:1000 h:350, 3 Bar series different fill colors; CartesianGrid; legend below
//     Threshold annotations: absolute-positioned text labels at % positions showing rating level + leverage value
//       Red labels = downgrade triggers, green labels = current position
//     Legend strip below chart: dashed line samples for trigger vs. current
//   Row 3: label cell + 9-cell value grid (3 years × 3 agencies) text-center fontSize:12
//   Row 4: same pattern for EBITDAR values
// Footer: sources line + 6 numbered footnotes fontSize:11; page number right
\`\`\`
### Example 16 — Credit Rating Timeline (Arrow Chart)
\`\`\`tsx
// Dark bg outer, white inner panel rounded
// Legend top: two line samples (solid vs dashed) + labels "Change in Rating" / "Change in Outlook"
// Per rating agency — 3 stacked sections, each ~120px tall:
//   Agency box: absolute left, colored square w:96 h:96, white text centered, large font
//   Scale labels: absolute left:128, vertical list of rating strings (e.g. A-, BBB+, BB+), spaced 28px
//   Timeline area: ml:192, relative positioned, height = scale.length * 28 + 40
//     Time axis: absolute bottom-0, flex justify-between, year labels fontSize:11
//     Rating band arrows: absolute divs spanning position% to nextPosition%
//       Solid colored band (h:32 bg-accent) for rating change; dashed border for outlook change
//       Arrowhead: CSS border-trick triangle at right end of each band
//     Event labels: alternating above/below the band (top:-25px odd, top:75px even), italic colored date + rating text
// Footer: source + note below panel; page number absolute bottom-right
\`\`\`
### Example 17 — Waterfall Chart (Share Price / Value Bridge)
\`\`\`tsx
// Dark bg outer, white inner panel
// Header: disclaimer (red), h1 all-caps title
// White panel:
//   Section title bar: gray bg, white text, centered h2
//   Waterfall: relative h:384, flex items-end justify-around px:48
//     Each bar div: w:15%, flex-col items-center
//       Value label above bar: colored (blue=positive, red=negative) fontSize:13 fontWeight:600
//       Bar itself: absolute bottom:0 w:full, height = abs(value) * scaleFactor px
//         Floating bars (middle): bottom offset = cumulative running total * scaleFactor
//         Total bars (first/last): bottom:0, full blue fill
//       X-axis label: below bar, bold, whitespace-pre-line for multiline, superscript footnote
//   Metrics table: border-t-2, flex rows showing metric name / start value / arrow / delta / end value
//     Arrow: flex-1 border-t-2 border-black with ▶ at right end
// Footer: source + numbered footnotes + page number right
\`\`\`
### Example 18 — Title / Cover Slide
\`\`\`tsx
// Outer bg: dark gray or black, centered white card
// White card: w:full maxW:6xl, aspectRatio:16/10, flex-col
// Top bar: solid black h:32-40, centered disclaimer text (red, tracking-widest, fontSize:10, fontWeight:700)
// Body: flex-1, flex-col items-center justify-center, px:64
//   Main title: fontSize:48 fontWeight:700 text-center tracking-tight
//   Date/subtitle: mt:48 fontSize:13 tracking-wider text-gray-700 text-center
// Bottom bar: solid black h:96 w:full — firm logo area placeholder (no text unless specified by user)
\`\`\`
### Example 19 — Three-Column with Mixed Charts and Metric Blocks
\`\`\`tsx
// Same ThreeColumnLayout as Example 1
// Header: logo box left + h1 + subtitle + horizontal divider line below
// Left column: section title + BarChart (w:280 h:350) + arrow/delta annotation (SVG or absolute div)
//   Delta label: absolute positioned near top of chart, colored text + SVG curved arrow path
//   Value labels below chart: flex justify-around fontSize:11
// Center column: section title + 2×2 metric card grid
//   Each card: grid grid-cols-2 border border-gray-400
//     Left cell: gray bg, centered label text fontSize:13 fontWeight:600
//     Right cell: accent bg, white text, centered bold value fontSize:20 (can be negative with same style)
// Right column: section title + large stat (fontSize:48 bold) + supporting label + visual motif (triangle or shape)
//   Second large stat below: fontSize:48 bold + multi-line description fontSize:13
// Footer: footnotes numbered, summary bold statement, page number right
\`\`\`

### Example 20 — Strategic Alternatives Comparison (Simple 3-Column)
\`\`\`tsx
// White bg, top thick border (border-t-6 border-black) + bottom thick border as footer container
// Header: flex row, logo placeholder box (w:80 h:80 border-2 border-black) left + h1 bold navy fontSize:36 right
// Separator: border-t-4 border-black below header, mb:32
// 3-column grid gap:24, each column:
//   Header cell: colored bg (navy #000080) white text centered py:12 px:16 fontWeight:700 fontSize:18 mb:16
//   Bullet list: space-y:12, each item flex gap:8 — bold ■ square bullet + body text fontSize:14
//   No pros/cons split — single unified bullet list per column
// Footer: border-t-6 border-black pt:16, flex justify-end items-center gap:24
//   Status label text right + bold page number
// Column count flexible: works for 3 or 4 columns by adjusting grid-cols
\`\`\`

### Example 21 — Strategic Alternatives Pros/Cons (4-Column with Arrow Axis)
\`\`\`tsx
// White bg, serif title top-left + "STRICTLY CONFIDENTIAL" red bold top-right
// Title underline: border-t-2 border-gray-400, firm name serif italic right-aligned below
// Main layout: flex row gap:24
//   Left axis column (w:80px): visual PROS/CONS indicator
//     Top half: upward CSS triangle (border-trick, border-b solid black w:80) + beige box below (bg:#f5f5dc border-2 border-black py:80)
//       "PROS" text: writingMode vertical-rl, rotate-90, fontWeight:700 fontSize:20, centered in box
//     Bottom half: white box (border-2 border-black py:80) + downward CSS triangle below
//       "CONS" text: same vertical treatment
//   Right section: flex-1, grid grid-cols-4 gap:16
//     Each column:
//       Header cell: colored bg (varies per column — teal, green, gray, teal) white/dark text, centered fontSize:13 fontWeight:700 py:8 mb:16
//       Pros section: space-y:8 mb:32, each bullet: flex gap:4, green ▲ icon + text fontSize:11
//       Horizontal divider: border-t-2 border-gray-400 my:16
//       Cons section: space-y:8, each bullet: flex gap:4, red ▼ icon + text fontSize:11
//       Optional right border on penultimate column (border-r-2 border-gray-400 pr:16) to visually separate
// Footer: mt:48 flex justify-end, page number in brackets "[N]" fontSize:13 gray
\`\`\`

### Example 22 — Logo Splash: Pure Grid (Industry / Competitor Landscape)
// White bg, centered content maxW:1200px, no header or footer — logos only
// Layout: N rows of grid grid-cols-3 gap:48 mb:80 (adjust cols to 4 or 5 for more logos)
// Each logo cell: border-2 border-gray-300, flex items-center justify-center, p:24, h:140px
//   Inside: actual img tag using logo.dev URL pattern OR gray placeholder text
//   No labels, no text, no captions — pure logo boxes only
// Spacing: mb:80 between rows creates generous breathing room
// Variant: for denser grids use grid-cols-4 or grid-cols-5 with gap:24 and h:100px cells
// Optional title: if needed, single h1 centered above grid, fontSize:28 fontWeight:400 mb:48 — otherwise omit entirely

### Example 23 — Logo Splash: Scattered Artistic Layout (Credential / Tombstone Wall)
// White bg, full bleed, no padding constraints — logos placed via absolute positioning
// Canvas: relative div w:full maxW:1400px h:700px centered
// Logo boxes: each absolute, border-2 border-gray-300 (or colored bg for featured client)
//   Sizes vary — wide landscape boxes (w:280-380 h:65-110) for primary names
//   Smaller boxes (w:120-180 h:50-70) for secondary names
//   One or two accent boxes: solid colored bg (e.g. bg:#6b8fc2) for visual hierarchy
// Placement: stagger vertically and horizontally — avoid perfect alignment
//   Top band: 2-3 boxes roughly top:20-40px at varied left/right positions
//   Middle band: 3-4 boxes top:120-180px overlapping the vertical center
//   Lower band: 2-3 boxes top:280-320px
//   Bottom band: 2 wide boxes top:420-450px spanning most of width
//   Corner accent: 1 small box bottom-right or top-right as finishing detail
// No labels or captions — logos only, layout conveys scale through density

### Example 24 — Logo Splash: Experience / Deal History with Sidebar
// Dark gradient header (bg gradient gray-700→gray-600) h:80, white bold h1 title left + bordered logo box right
//   Bottom border of header: border-b-4 accent color (blue or brand color)
// Main body: flex row, no padding
//   Left sidebar (w:256px bg:gray-100 border-r border-gray-300 p:24 space-y:24):
//     Section label: small bold gray text mb:8
//     Deal items: each flex items-center gap:12
//       Text left (flex-1): description fontSize:11 text-gray-600, 1-2 lines
//       Logo box right (flex-shrink-0): border border-gray-400 w:48-64 h:32, placeholder inside
//     6-8 deal items stacked
//   Right main area (flex-1 p:32 bg:gradient gray-50→white):
//     Logos scattered absolutely across the area — same staggered pattern as Example 23
//     Denser grid (30-40 logos) at smaller sizes (w:64-96 h:40-64) to show breadth
//     Row-based loose grouping: ~6 logos per horizontal band, 5-6 bands
//     Each logo: border border-gray-400, flex items-center justify-center
// Footer bar: bg:gray-200 py:12 px:48 flex justify-between
//   Left: project name text; Right: section label + page number, gap:32

### Example 25 — Market Overview: Multi-Chart Dashboard (Issuance + Equity + Debt)
// Colored gradient header band (blue-700→blue-600) h:80, white h1 fontWeight:300 fontSize:36 inside
// Body: p:48 space-y:32
// Top section: section label h3 fontSize:13 fontWeight:600 mb:16 + wide stacked bar chart (h:256)
//   Chart area: bg:gray-50 border border-gray-300, flex items-end justify-around gap:16
//   Annual bars (wide w:96): stacked divs, top segment one color + bottom segment another color, value labels inside each segment
//   Vertical divider line between annual and quarterly bars (border-l-2 border-gray-300 h:192)
//   Quarterly bars (narrow w:64): single color, value label inside, x-axis label below
// Bottom section: grid grid-cols-2 gap:32
//   Each chart panel: h3 section title + bg:gray-50 border rounded h:256 relative
//     Legend: absolute top-right, flex-col gap:8, each row: colored line sample + label + bold % change
//     Chart body: placeholder or recharts LineChart
// Footer: flex justify-between items-end
//   Left: logo placeholder box (border-2 w:128 h:64) + source text fontSize:10 gray
//   Right: circular logo placeholder (border-2 rounded-full w:64 h:64)

### Example 26 — Market Overview: Single Large Chart + Annual Flow Boxes
// White bg p:48
// Header: flex justify-between items-start mb:24
//   Left: h1 bold fontSize:36 + h2 fontSize:18 text-gray-600
//   Right: logo placeholder box border-2 w:96 h:80
// Banner: bg:gray-300 py:12 px:24 mb:24 — italic bold fontSize:13 text summary statement
// Legend strip: flex gap:32 mb:16, each item: colored rect (w:32 h:12) + label fontSize:11
// Main chart: bg:gray-50 border-2 border-gray-300 rounded p:24 h:420 relative mb:24
//   Y-axis label: absolute top-left fontSize:11 fontWeight:700
//   Inset data box: absolute top:32 left:96, white bg border border-gray-400 p:12
//     Bold italic period label + 3 rows of metric / colored value pairs fontSize:11
//   Peak value labels: absolute right side, 3 colored values aligned to their respective lines
// Annual flow boxes row: flex items-start gap:8 flex-wrap, labeled with "Total Annual MLP Flows:"
//   Each box: border-2 border-gray-800 rounded px:12 py:8, year label bold fontSize:11 + value bold fontSize:13
//   Negative values shown in parentheses, same style — no color differentiation
// Footer: border-t border-gray-300 pt:16, source left fontSize:10 + page number right

### Example 27 — Market Overview: Bullets + Bond Yields + Volume Bars + Transaction Table
// White bg p:48
// Header: flex gap:24 mb:24
//   Logo box: border-4 border-gray-800 w:120 h:120 flex items-center justify-center
//   Title block: flex-1, border-t-8 border-black + h1 bold navy fontSize:28 + h2 bold navy fontSize:18 + border-t-8 border-black
// Main grid: grid grid-cols-2 gap:32 mt:32
// LEFT COLUMN space-y:24:
//   Bullet section: space-y:12, each bullet: flex gap:8, bold ■ + div with bold lead sentence + indented sub-bullets (ml:16 mt:4 space-y:4 fontSize:11 text-gray-700 — dashes)
//   Bond Yields chart panel: h3 bold navy + border-b-2 border-gray-400 mb:12
//     Chart area: bg:gray-50 border h:224 relative
//     Legend: flex gap:16 fontSize:11, colored line samples (w:16 h:0.5) + rating labels
//     Data table inset: absolute top-right, white bg border p:8, thead row bold + tbody rows with rating / date1 / date2 / Δ colored
//     Source: fontSize:9 gray bottom of panel
// RIGHT COLUMN space-y:24:
//   Volume bar chart: h3 bold navy + border-b + chart area h:224
//     Annual bars (w:48) + vertical divider + monthly bars (w:40), all navy bg, heights proportional
//     X-axis labels below each bar fontSize:10
//   Transaction table: h3 bold navy + border-b
//     Table: w:full fontSize:9, thead navy bg white text, 9 columns (Issuer/Amount/Tranche/Maturity/Mdy's/S&P/Coupon/Price/Yield)
//     Tbody: alternating white rows, border-b border-gray-300, p:4 per cell, numeric cols text-right
// Footer: flex justify-end, section label + bold page number fontSize:18

### Example 28 — Peer Benchmarking: Multi-Group Comparables Table with Valuation Summary
// White bg p:48
// Header: flex items-center gap:16 mb:32
//   Slide number badge: bg accent (navy) text-white fontWeight:700 px:16 py:8 fontSize:24
//   h1 fontWeight:300 fontSize:36 text-gray-800
// Main table: w:full fontSize:11 border-collapse mb:32
//   thead: border-b-2 border-gray-400
//     Multi-line header cells: each th has 2-3 stacked div lines — bold metric name + gray sub-label (year/period)
//     Columns: Company | Share Price | Equity Value | Ent. Value | EV/Rev CY23E | CY24E | EV/EBITDA CY23E | CY24E | CAGR Rev | CAGR EBITDA | EBITDA Margin CY23E | CY24E
//   tbody organized into labeled peer groups:
//     Group header row: bg accent (blue #4a7eba) text-white fontWeight:700, colSpan:all, py:8 px:8 fontSize:12
//     Data rows: hover:bg-gray-50, py:8 px:8 per cell, numeric cols text-right
//       NM values displayed as "NM" in same style — no special color
//       Negative values in parentheses
//     Mean/Median rows: bg:gray-100 fontWeight:700, label in first cell + colSpan:3 "Mean"/"Median" text-right
//   Overall summary rows at bottom: bg:gray-700 text-white fontWeight:700 border-t-2
//     "Overall Mean" and "Overall Median" rows same pattern
// Valuation summary section: mt:48 pt:24 border-t-2 border-gray-400
//   Second table: metric | selected multiple range (Low – High) | implied EV (Low – High) | implied equity value (Low – High) | implied per share (Low – High)
//   Sub-header row: gray labels "Low" / "–" / "High" repeated per group
// Footer notes: mt:24 fontSize:9 text-gray-600 space-y:4, source + 2-3 numbered notes
// Page number: flex justify-end fontSize:14 fontWeight:700

### Example 29 — Peer Benchmarking: Single Dense Comparables Table (Two Peer Groups)
// White bg p:48
// Header: mb:24 pb:16 border-b-4 border-accent (navy #1e4d7b)
//   h1 bold navy fontSize:28 mb:8 + h2 bold lighter-blue fontSize:20 + italic gray sub-label fontSize:11
// Main table: w:full fontSize:11 border-collapse mb:32
//   thead: bg accent (navy) text-white
//     Row 1: main column headers — left-aligned first col, right-aligned numerics, center-aligned grouped cols with colSpan
//       Grouped header "EV / EBITDA" spans 3 sub-cols; border-r border-white between all cells
//     Row 2: sub-headers for grouped cols — year labels (2022E / 2023E / 2024E) centered fontSize:10
//   tbody:
//     Group label row: bg:gray-100 italic text-gray-700 fontSize:13, colSpan:all, py:8 px:12
//     Data rows: border-b border-gray-200, py:12 px:12 per cell, numeric cols text-right
//       NM shown as "NM"; no color differentiation
//     Mean/Median rows: bg:gray-200 fontWeight:700 border-b-2 border-gray-400
//       Label in first cell (no colSpan), empty cells for price/equity/EV cols, values in metric cols
//     Second group: same pattern — group label row + data rows + mean/median rows
// Footer: mt:48 pt:24 border-t border-gray-300, flex justify-between items-end
//   Left: fontSize:9 text-gray-600 space-y:4 — source + note + numbered footnote
//   Right: flex items-end gap:24 — logo placeholder box (border-2 w:128 h:48) + page number bold fontSize:14

### Example 30 — Peer Benchmarking: Transaction Multiples Bar Chart (Ranked Chronological)
// Gray header band (bg:gray-500) text-white py:24 px:48, flex justify-between items-start
//   h1 bold fontSize:36 maxW:4xl lineHeight:tight (long title wraps to 2 lines)
//   Logo: circular white bg rounded-full p:12 w:112 h:112 shadow, centered text inside
// Accent stripe: h:12 bg:blue-700 full width below header
// Body: px:48 py:32
//   Chart label block mb:16: h2 bold fontSize:20 + italic gray fontSize:13 subtitle (metric label e.g. "LTM Revenue Multiple (x)")
//   Bar chart: relative div, h:384 border-b-2 border-gray-400
//     Average reference line: absolute top:N left:0 right:0, border-t-2 dashed red, label absolute right:48 -top:16 bold red fontSize:13 white bg px:8
//     Y-axis label: absolute left:0 top:0 fontSize:11 fontWeight:600
//     Bars container: flex items-end justify-start gap:4 h:full pb:8 overflow-x-auto
//       Each bar unit: flex-col items-center relative, minWidth:22px
//         Value label: absolute -top:16, fontSize:9 fontWeight:700 text-gray-700 centered
//         Bar body: bg accent (navy #1e4d7b) w:full, height proportional to value * scaleFactor px
//           Optional annotation for outlier bars: absolute -top:24 left:0 fontSize:8 text-gray-700 whitespace-nowrap (e.g. "Adjusted Multiple: X.Xx")
//         Date label: fontSize:8 mt:4 text-gray-600 below bar
//         Logo circle: w:20 h:20 mt:4 border border-gray-400 rounded-full bg-white — small placeholder per transaction
//   Notes: mt:24 fontSize:11 text-gray-600, "Notes:" bold + italic reference line
// Footer: absolute bottom:24 left:48 right:48 flex justify-between items-end fontSize:11 text-gray-700
//   Left: project name bold; Right: flex gap:16 section label + page number bold

### Example 31 — Strategic Buyers: Logo + Metrics + Rationale Strip Profiles
// White bg p:48
// Header: h1 bold fontSize:36 text-gray-900 mb:8 pb:12 border-b-2 border-gray-900 + italic subtitle fontSize:11
// Column headers: grid grid-cols-12 gap:16 mb:8
//   col-span-2 bg accent (navy #003366) text-white py:12 px:16 — "Company" centered bold fontSize:18
//   col-span-2 bg accent — "Key Metrics" centered bold
//   col-span-8 bg accent — "Strategic Rationale" centered bold
// Per-company strip: grid grid-cols-12 gap:16 mb:24 border-b border-gray-300 pb:24
//   Col 1 (col-span-2): flex items-start justify-center pt:16
//     Logo box: border-2 border-gray-400 p:12 w:160 h:80 centered — img.logo.dev or placeholder
//   Col 2 (col-span-2): fontSize:11 space-y:4
//     Key/value pairs: flex justify-between — label fontWeight:600 + right-aligned value
//     Rows: Market Cap / Enterprise Value / Cash / Debt / blank spacer / EV/CY__Rev / EV/CY__EBITDA
//     If private company with no data: centered "NA" fontSize:18 fontWeight:600 vertically centered
//   Col 3 (col-span-8): fontSize:11 space-y:8
//     Pros: flex gap:8 — blue "+" bold + text span
//     Cons: flex gap:8 — red "−" bold + text span
//     Typically 3-4 pros + 1-2 cons per company
// Footer: mt:32 border-t-2 border-gray-800 pt:16, flex justify-between items-end
//   Left: italic source fontSize:9 mb:12 + logo placeholder box border-2 w:160 h:64
//   Right: page number bold fontSize:24 text-gray-700

### Example 32 — Table of Contents: Logo Header + Roman Numeral List + Disclaimer
// White bg p:64
// Header: flex items-start gap:48 mb:64
//   Logo box: border-4 border-gray-800 w:120 h:120 flex items-center justify-center — centered text bold
//   Title block: flex-1, border-t-8 border-black mb:16 + h1 bold navy fontSize:48 mb:16 + border-t-8 border-black
// Contents list: ml:144 space-y:24 mb:96
//   Each row: flex gap:32 items-baseline — roman numeral bold fontSize:24 + label bold fontSize:24
//   Appendix rows: flex gap:16 items-baseline — "Appendix A:" bold fontSize:24 + label bold fontSize:24
// Disclaimer block: ml:144 mt:96
//   border-t-2 border-black pt:24 + italic fontSize:11 text-gray-700 leading-relaxed maxW:4xl
//   border-t-2 border-black mt:24

### Example 33 — Table of Contents: Right-Aligned Section Numbers + Sub-items
// White bg p:64
// Header: h1 bold navy fontSize:36 pb:8 border-b-4 border-navy mb:48
// Section header: flex justify-end mb:32 — "Section" label fontSize:18 text-gray-700
// Contents list: space-y:32 mb:64
//   Main rows: flex justify-between items-baseline py:12 border-b border-gray-200
//     Left: section title fontSize:20; Right: roman numeral fontSize:20
//   Sub-items block: ml:48 space-y:24, each: flex gap:16 items-baseline — letter label + title fontSize:18
//   Appendix block: mt:48 pt:32 — "Appendic" bold fontSize:20 mb:24 + ml:48 space-y:24 plain text items fontSize:18
// Footer: absolute bottom:64 left:64 right:64, border-t-2 border-gray-800 pt:24, flex justify-between items-center
//   Two logo placeholder boxes: border-2 w:128 h:64 each, centered bold text

### Example 34 — Table of Contents: Colored Number Tiles + Large Text
// White bg p:64 relative
// Title: h1 fontWeight:400 fontSize:48 text-gray-900 mb:64 (not bold — lighter weight)
// Contents list: space-y:48 mb:96
//   Each row: flex items-center gap:24
//     Number tile: bg accent (teal-700) text-white w:56 h:56 flex items-center justify-center flex-shrink-0
//       Bold fontSize:24 number inside
//     Label: fontSize:32 text-gray-900 (large, light weight)
//   Appendix row: plain fontSize:32 text-gray-900 no tile, mt:96 pt:32 (extra top spacing)
// Footer: absolute bottom:64 left:64 right:64 border-t border-gray-300 pt:24
//   flex justify-end — page number fontSize:20 text-gray-700

### Example 35 — Title Slide: Minimal Centered + Advisor Logo Top-Right
// White bg flex flex-col justify-between p:64
// Top: text-center — "- CONFIDENTIAL -" fontSize:13 tracking-wider text-gray-800
// Advisor logo: absolute top:64 right:64 — text-based wordmark (no box), tracking-wide fontSize:24
//   Style variant: split word with border-l-2 divider between words (e.g. "CENTER|VIEW PARTNERS")
// Main content: flex-1 flex flex-col items-center justify-center text-center maxW:4xl mx-auto
//   Project name: h1 fontWeight:300 fontSize:48 text-gray-900 mb:48
//   Subtitle lines: space-y:12 — 2 lines fontSize:24 text-gray-800 + date fontSize:20 text-gray-700 mt:32
// Bottom: h:64 spacer
// NOTE: advisor logo is text wordmark only — no image/box; client logo not shown on this variant

### Example 36 — Title Slide: Confidential Banner + Advisor Logo Box + Left-Aligned Project Name
// White bg p:48 flex flex-col
// Top block mb:32:
//   Confidential banner: flex justify-center mb:24 — border-4 border-red-700 px:32 py:8
//     Bold red uppercase tracking-wide text fontSize:13
//   Logo + division row: flex justify-between items-start mb:32
//     Advisor bank logo box: solid accent bg (blue-700) text-white w:100 h:100, centered bold text
//     Division label: text-right text-gray-600 fontSize:13 tracking-wide, 2 lines ("INVESTMENT BANKING / DIVISION")
//   Separator: border-t border-gray-400
// Main content: flex-1 flex flex-col justify-start pt:48
//   Project name: h1 fontWeight:300 fontSize:60 text-gray-900 mb:48
//   Subtitle: h2 fontWeight:300 fontSize:48 accent color (blue-400) mb:64
//   Advisor firm name: bold fontSize:20 text-gray-900 + date fontSize:20 text-gray-900 space-y:8
// Bottom: mt-auto
//   Separator border-t border-gray-400 mb:16
//   Disclaimer: fontSize:9 text-gray-600 leading-relaxed — full legal boilerplate paragraph
// NOTE: advisor logo box uses solid colored bg; client logo not shown on this variant

### Example 37 — Title Slide: Client Logo Block + Advisor Wordmark + Centered Title
// White bg p:64 flex flex-col
// Top-right: "STRICTLY CONFIDENTIAL" bold red fontSize:13 tracking-wider flex justify-end mb:64
// Main content: flex-1 flex flex-col justify-center
//   Client logo block: bg accent (client brand color e.g. red-600) text-white inline-flex items-center justify-center
//     w:180 h:180, large tracking-wider fontWeight:300 fontSize:28 — client name text inside colored square
//   Divider row: flex items-center mb:48 mt:48
//     flex-1 border-t border-gray-400 (line extends left)
//     Advisor wordmark: ml:32 text-gray-600 fontSize:13 tracking-widest — "ADVISORNAME & COMPANY" plain text (no box)
//   Title: h1 fontSize:28 text-gray-700 mb:96 maxW:3xl fontWeight:400
//   Date: fontSize:20 text-gray-600
// NOTE: client logo = colored filled square with name text; advisor = plain tracking wordmark after divider line

### Example 38 — Precedent Transactions: Logo + Title Header + Logo-Pair Table with Highlighted Duration
// White bg p:48
// Header: flex gap:32 mb:24 items-start
//   Advisor bank logo box: border-4 solid accent bg (blue-600) text-white w:100 h:100 centered bold text
//   Title block: flex-1 — h1 bold navy fontSize:36 mb:8 + h2 bold navy fontSize:20
//   Top-right division label: text-right fontSize:13 text-gray-600, 2 lines ("INVESTMENT BANKING / DIVISION")
// Separator: border-t-2 border-gray-400 mb:32
// Main table: w:full fontSize:13 — 5 columns: Buyer | Seller | Approach | Date of Announcement | Total Time
//   thead: border-b-2 border-gray-800, multi-line th cells (2 stacked divs for "Date of / Announcement")
//   tbody rows: border-b border-gray-300, py:24 px:16 per cell
//     Buyer cell: logo placeholder box border-2 border-gray-400 w:128 h:48 centered
//     Seller cell: same logo placeholder pattern
//     Approach / Date cols: text-center fontSize:13
//     Total Time cell — two variants:
//       Plain: "122 days" text-center
//       Highlighted fast deal: inline-block border-2 border-dashed border-red-600 rounded-full px:12 py:4
//         Bold red text inside (e.g. "31 days", "21 days", "10 days")
// Footer notes: mt:32 fontSize:10 text-gray-600 space-y:4 italic — source + numbered superscript footnotes
// Bottom footer: mt:32 border-t border-gray-300 pt:16 flex justify-between — section label left + page number bold right
// NOTE: buyer/seller logos use img.logo.dev for real companies; placeholder boxes as fallback

### Example 39 — Precedent Transactions: Dense Multi-Column Loan Table with Grouped Headers + Yellow Summary Rows
// White bg p:48
// Header: flex gap:32 mb:32 items-start
//   Advisor bank logo box: border-4 border-gray-800 w:100 h:100 centered bold text (outline style, no fill)
//   Title block: flex-1 — border-t-8 border-black mb:12 + h1 bold navy fontSize:36 + border-t-8 border-black mt:12
// Main table: w:full fontSize:9 border-collapse overflow-x-auto
//   thead: white bg, 2-row structure
//     Row 1: border-b-2 border-gray-800
//       rowSpan:2 cols (6 cols): Date Revised / Date Launched / Borrower / Rating / Arranger / Size — bold, border-r border-gray-300
//       colSpan:3 "Original Pricing" + colSpan:3 "Revised Pricing" — bold, border-b border-gray-300
//       rowSpan:2 "Delta" + rowSpan:2 "Other Changed Terms"
//     Row 2: border-b-2 border-gray-800 — sub-cols fontSize:8: Drawn Spread / Libor Floor / OID (×2 sets) + Yield
//   tbody: rows mapped from array, border-b border-gray-200 hover:bg-gray-50, fontSize:8-9, py:4 px:8
//     Numeric cols: text-center; date/text cols: text-left
//   Summary rows (Median + Mean): bg:yellow-200 border-y-2 border-gray-800
//     colSpan:9 label ("Median"/"Mean") bold left + sparse values in yield/delta cols only, bold centered
// Footer: mt:48 flex justify-between items-end
//   Left: fontSize:10 text-gray-600 — bold source + italic note
//   Right: flex items-center gap:16 — section label fontSize:13 + page number bold fontSize:20

### Example 40 — Precedent Transactions: Take-Private Table with Inline Bar Charts + Tiered Summary Rows
// White bg p:48
// Header: flex justify-between items-start mb:16
//   Left block: h1 bold fontSize:28 text-gray-800 mb:8 + h2 fontSize:18 text-gray-700 mb:12
//     Context banner: bg:gray-200 p:12 mb:16 — italic fontSize:11 text-gray-800 (key stat callout sentence)
//   Right: advisor/client logo placeholder box border-2 w:96 h:80 flex-shrink-0
// Main table: w:full fontSize:8 border-collapse overflow-x-auto
//   thead: border-b border-gray-400
//     Standard cols: bg:gray-100 — Announcement / Acquirer / Target / Consideration / Deal Size (text-right)
//     Grouped metric cols: bg:blue-100, colSpan:2 each — "Premium/(Discount) to Unaffected Price" + "10-Day Moving Median"
//   tbody: rows mapped from array, border-b border-gray-200 hover:bg-gray-50, py:8 px:4
//     Standard cols: text-left fontSize:8
//     Deal Size: text-right
//     Each metric cell (w:80px): conditional render — if value present: flex items-center gap:4
//       Colored bar div (h:12, width = parseFloat(value) + "%" scaled): blue-500 / blue-400 / blue-600 variants
//       Value label fontSize:7 beside bar
//       If no value: empty cell
//   Tiered summary rows (3 tiers × 2 rows each): bg:gray-700/gray-600/gray-500 text-white border-y-2
//     Row A: colSpan:5 category label bold text-center ("Publicly Negotiated" / "Uncontested..." / "Since 2015")
//       colSpan:2 per metric group: flex justify-center gap:4 — white bar sample + "Mean: X%" bold
//     Row B: colSpan:5 empty + colSpan:2 per group: white bar + "Median: X%" bold
// Footer notes: mt:24 fontSize:9 text-gray-600 space-y:4 — bold italic source + numbered footnotes
// Page number: flex justify-start mt:16 — bold fontSize:14

Now generate the slide component based on the user's request.`;

    const userPromptText = context
      ? `${context}\n\nSlide ${slideNumber} requirements:\n${prompt}`
      : `Create slide ${slideNumber}:\n${prompt}`;

    // Build the content array:
    // 1. Reference images (design templates, loaded from blob by category)
    // 2. User-attached images (data sources, style references passed from agent)
    // 3. Text prompt
    const userContent: Anthropic.MessageParam['content'] = [];

    // 1. Reference images — prepended so the model sees design context first
    if (referenceImages.length > 0) {
      for (let i = 0; i < referenceImages.length; i++) {
        userContent.push({
          type: 'image',
          source: referenceImages[i],
        });
      }
      // Bridge instruction so model understands the role of these images
      userContent.push({
        type: 'text',
        text: `The ${referenceImages.length} image(s) above are reference slides for the "${templateCategory}" slide type. Match their visual design language — layout density, typography hierarchy, color usage, table formatting, header/footer treatment, and spacing — but do NOT copy their content. Use only the structural and aesthetic patterns.\n\n`,
      });
      console.log(`[generate-slide] 🖼  Injected ${referenceImages.length} reference image(s) for category: ${templateCategory}`);
    }

    // 2. User-attached images
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
      referenceImageCount: referenceImages.length,
      templateCategory: templateCategory ?? null,
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