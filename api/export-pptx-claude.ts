/**
 * export-pptx-claude.ts
 *
 * Vercel serverless endpoint that converts React/TypeScript slide components
 * into a .pptx file using the Claude Agent SDK (claude-code).
 *
 * How it works
 * ─────────────
 * 1. Receives slide code + theme via POST body.
 * 2. Builds a prompt with:
 *    - Three few-shot pptxgenjs examples (table slide, chart+table slide,
 *      annotated manual-layout slide) so Claude writes idiomatic JS.
 *    - The actual slide components to convert.
 * 3. Calls query() from @anthropic-ai/claude-agent-sdk.
 *    The SDK's built-in sandbox (sandbox.enabled: true) gives Claude Code a
 *    real Node.js environment — it installs pptxgenjs, writes and runs the
 *    build script, then base64-encodes the .pptx and prints it as JSON to
 *    stdout so we can capture it from message.result.
 *    ⚠  No @vercel/sandbox needed — the agent SDK manages its own ephemeral
 *    execution environment. @vercel/sandbox was only required in the old
 *    analyze.ts pattern where we manually spawned an agent subprocess inside
 *    a persistent VM and had to read files back out with readFileToBuffer.
 * 4. Parses the base64 payload out of the agent result, decodes it, and
 *    streams the binary .pptx back to the caller.
 *
 * Accepted `slides` shapes
 * ─────────────────────────
 *   { "1": "<tsx code>", "2": "<tsx code>" }   ← dict (most convenient)
 *   [{ code: "...", slideNumber: 1 }, ...]      ← array of objects
 *   { code: "...", slideNumber: 1 }             ← single slide object
 */

import { query } from '@anthropic-ai/claude-agent-sdk';
import type { VercelRequest, VercelResponse } from '@vercel/node';

// ---------------------------------------------------------------------------
// Vercel config
// ---------------------------------------------------------------------------

export const config = {
  maxDuration: 300,
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SlideInput {
  code: string;
  slideNumber?: number;
}

type SlidesDict = Record<string, string>;

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

function normaliseSlides(slides: SlideInput[] | SlidesDict | SlideInput): SlideInput[] {
  if (Array.isArray(slides)) {
    return [...slides].sort((a, b) => (a.slideNumber ?? 0) - (b.slideNumber ?? 0));
  }
  if (typeof slides === 'object' && slides !== null && !('code' in slides)) {
    return Object.entries(slides as SlidesDict)
      .map(([num, code]) => ({ slideNumber: parseInt(num, 10), code }))
      .sort((a, b) => (a.slideNumber ?? 0) - (b.slideNumber ?? 0));
  }
  return [slides as SlideInput];
}

// ---------------------------------------------------------------------------
// Few-shot examples
// These are condensed but structurally complete pptxgenjs scripts derived
// from real working build scripts. Embedding them in the prompt gives Claude
// a strong prior for import style, coordinate system, color format, and
// table/chart API usage — and avoids the most common mistakes (wrong color
// format, wrong layout name, wrong import pattern).
// ---------------------------------------------------------------------------

const FEW_SHOT_EXAMPLES = `
=== FEW-SHOT EXAMPLE 1: Table slide with column-group headers (addTable pattern) ===
\`\`\`js
// Uses addTable with cell objects and colspan for group headers.
// Best for: data tables with grouped columns, alternating rows, color-coded headers.
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pptxgen = require('pptxgenjs');

// Colors — NEVER include the "#" prefix in pptxgenjs color strings
const ACCENT  = '1D4E89';   // primary navy
const ACCENT1 = '2E75B6';   // medium blue
const ACCENT2 = '4A9DCC';   // steel blue
const ACCENT3 = 'D6EAF8';   // pale blue (alt-row tint bg, Valuation header)
const ALT_ROW = 'EBF5FB';   // ACCENT3 @ ~33% opacity on white
const COL_HDR = 'EDF1F6';   // column header row bg
const WHITE   = 'FFFFFF';
const HEADING = '1D2D3E';
const BODY    = '2C3E50';
const GREY    = '9CA3AF';
const HFONT   = 'Calibri';
const BFONT   = 'Calibri';

const prs = new pptxgen();
prs.layout = 'LAYOUT_WIDE'; // 13.33" × 7.5"

const slide = prs.addSlide();
slide.background = { color: 'FFFFFF' };

// Top accent bar (full width)
slide.addShape(prs.ShapeType.rect, {
  x: 0, y: 0, w: 13.33, h: 0.042,
  fill: { color: ACCENT }, line: { type: 'none' },
});

// Title
slide.addText('PE-Backed Healthcare IPOs (2024–2025)', {
  x: 0.3125, y: 0.229, w: 12.7, h: 0.26,
  fontFace: HFONT, fontSize: 14, bold: true, color: HEADING,
});

// Subtitle
slide.addText('Select sponsor-backed healthcare companies that completed IPOs since 2023', {
  x: 0.3125, y: 0.479, w: 12.7, h: 0.187,
  fontFace: BFONT, fontSize: 7, color: '6B7280', italic: true,
});

// Divider under subtitle
slide.addShape(prs.ShapeType.rect, {
  x: 0.3125, y: 0.646, w: 12.7, h: 0.021,
  fill: { color: ACCENT }, line: { type: 'none' },
});

// Units note
slide.addText('($ in millions, unless otherwise noted)', {
  x: 0.3125, y: 0.698, w: 12.7, h: 0.114,
  fontFace: BFONT, fontSize: 6, color: GREY, italic: true,
});

// ── Table ──────────────────────────────────────────────────────────────────
function cell(text, opts = {}) {
  return { text, options: opts };
}

const NO_BDR = { type: 'none' };
const HDR_BOT = { pt: 1.5, color: ACCENT };

// Row 0 — column-group headers with colspan
const groupRow = [
  cell('Company Information', {
    fontFace: HFONT, fontSize: 6, bold: true, colspan: 4,
    align: 'center', fill: { color: ACCENT }, color: WHITE,
    border: [NO_BDR, { pt: 2, color: WHITE }, NO_BDR, NO_BDR],
  }),
  cell('IPO Details', {
    fontFace: HFONT, fontSize: 6, bold: true, colspan: 6,
    align: 'center', fill: { color: ACCENT1 }, color: WHITE,
    border: [NO_BDR, { pt: 2, color: WHITE }, NO_BDR, NO_BDR],
  }),
  cell('LTM Financials', {
    fontFace: HFONT, fontSize: 6, bold: true, colspan: 2,
    align: 'center', fill: { color: ACCENT2 }, color: WHITE,
    border: [NO_BDR, { pt: 2, color: WHITE }, NO_BDR, NO_BDR],
  }),
  cell('Valuation', {
    fontFace: HFONT, fontSize: 6, bold: true, colspan: 2,
    align: 'center', fill: { color: ACCENT3 }, color: ACCENT,
    border: [NO_BDR, NO_BDR, NO_BDR, NO_BDR],
  }),
];

// Row 1 — column headers
const COL_LABELS = [
  'Company','Ticker','Sector','PE Sponsor',
  'IPO Date','Shares Offered','Offer Price Range','Final IPO Price',
  'Total Proceeds','IPO Mkt Cap','LTM Revenue','LTM Adj. EBITDA',
  'EV / Rev','EV / EBITDA',
];
const COL_ALIGNS = [
  'left','center','left','left',
  'center','right','center','right',
  'right','right','right','right',
  'right','right',
];
const colHdrRow = COL_LABELS.map((label, i) =>
  cell(label, {
    fontFace: HFONT, fontSize: 6, bold: true, color: HEADING,
    align: COL_ALIGNS[i], fill: { color: COL_HDR },
    border: [NO_BDR, NO_BDR, HDR_BOT, NO_BDR],
  })
);

// Data rows
const rows = [
  { company:'BrightSpring Health', ticker:'BTSG', sector:'Home & Community Health',
    sponsor:'KKR', ipoDate:'Jan 2024', shares:'53.3M', priceRange:'$15.00–$18.00',
    finalPrice:'$13.00', proceeds:'$1,108M', marketCap:'~$3.0B',
    ltmRev:'$8,830M', ltmEbitda:'~$280M', evRev:'0.3x', evEbitda:'~10.7x' },
  { company:'PACS Group', ticker:'PACS', sector:'Skilled Nursing / Post-Acute',
    sponsor:'PE-backed (undisclosed)', ipoDate:'Apr 2024', shares:'21.4M',
    priceRange:'$18.00–$21.00', finalPrice:'$21.00', proceeds:'$450M',
    marketCap:'~$3.0B', ltmRev:'~$2,000M', ltmEbitda:'~$230M',
    evRev:'~1.5x', evEbitda:'~13.0x' },
];

const dataRows = rows.map((row, i) => {
  const isAlt = i % 2 === 1;
  const bg  = isAlt ? ALT_ROW : WHITE;
  const bdr = [NO_BDR, NO_BDR, { pt: 0.5, color: ACCENT3 }, NO_BDR];
  const c  = (text, extra = {}) => cell(text, { fontFace: BFONT, fontSize: 6, color: BODY,    fill: { color: bg }, border: bdr, align: 'left',  valign: 'middle', ...extra });
  const nc = (text, extra = {}) => cell(text, { fontFace: BFONT, fontSize: 6, color: BODY,    fill: { color: bg }, border: bdr, align: 'right', valign: 'middle', ...extra });
  const hc = (text, extra = {}) => cell(text, { fontFace: BFONT, fontSize: 6, color: ACCENT, fill: { color: bg }, border: bdr, align: 'right', valign: 'middle', bold: true, ...extra });
  return [
    c(row.company,    { color: HEADING, bold: true }),
    c(row.ticker,     { align: 'center', color: ACCENT, bold: true }),
    c(row.sector,     { fontSize: 5.5 }),
    c(row.sponsor,    { fontSize: 5.5 }),
    c(row.ipoDate,    { align: 'center' }),
    nc(row.shares),
    c(row.priceRange, { align: 'center' }),
    nc(row.finalPrice, { bold: true }),
    nc(row.proceeds,   { bold: true }),
    nc(row.marketCap),
    nc(row.ltmRev),
    nc(row.ltmEbitda),
    hc(row.evRev),
    hc(row.evEbitda),
  ];
});

// Column widths in inches — must sum to w (12.7")
const COL_W = [1.560, 0.594, 1.406, 1.406, 0.656, 0.625, 1.124, 0.687, 0.812, 0.781, 0.875, 0.843, 0.625, 0.656];

slide.addTable([groupRow, colHdrRow, ...dataRows], {
  x: 0.3125, y: 0.8125, w: 12.7,
  colW: COL_W,
  rowH: [0.18, 0.18, 0.44, 0.44],
});

// Footer divider
slide.addShape(prs.ShapeType.rect, {
  x: 0.3125, y: 6.985, w: 12.7, h: 0.010,
  fill: { color: '8BABC4' }, line: { type: 'none' },
});
slide.addText([
  { text: 'Sources: ', options: { bold: true } },
  { text: 'S-1 filings, company press releases, Renaissance Capital.' },
], {
  x: 0.3125, y: 7.0, w: 11.0, h: 0.313,
  fontFace: BFONT, fontSize: 5, color: GREY,
});
slide.addText('1', {
  x: 12.38, y: 7.02, w: 0.7, h: 0.125,
  fontFace: BFONT, fontSize: 6, bold: true, color: ACCENT, align: 'right',
});

prs.writeFile({ fileName: OUTPUT_PATH })
  .then(() => console.log('OK'))
  .catch(e => { console.error(e); process.exit(1); });
\`\`\`

=== FEW-SHOT EXAMPLE 2: Two-column slide with bar chart and manual financial table rows ===
\`\`\`js
// Uses addChart for the bar chart and manual rect+addText loops for the
// financial table (instead of addTable) — useful when precise pixel alignment
// matters more than colspan support.
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pptxgen = require('pptxgenjs');

const ACCENT  = '1D4E89';
const ACCENT3 = '2E75B6';
const ACCENT4 = 'D6EAF8';
const ROW_TINT = 'EFF7FC';
const HEADING  = '1D2D3E';
const BODY     = '2C3E50';
const RED      = 'B91C1C';
const WHITE    = 'FFFFFF';
const HFONT    = 'Calibri';
const BFONT    = 'Calibri';

// px → inches for LAYOUT_WIDE (960px React canvas = 13.33" PPTX)
const in_ = px => +(px * 13.33 / 960).toFixed(4);

const prs = new pptxgen();
prs.layout = 'LAYOUT_WIDE';   // 13.33" × 7.5"
const slide = prs.addSlide();
slide.background = { color: WHITE };

function rect(x, y, w, h, color) {
  slide.addShape(prs.ShapeType.rect, { x, y, w, h, fill: { color }, line: { type: 'none' } });
}
function sectionLabel(text, x, y, w) {
  slide.addText(text.toUpperCase(), {
    x, y, w, h: in_(16), fontFace: HFONT, fontSize: 7, bold: true,
    color: ACCENT, charSpacing: 0.5, valign: 'middle',
  });
  rect(x, y + in_(16), w, in_(2), ACCENT);
}

// Header bar
rect(0, 0, 13.33, in_(52), ACCENT);
slide.addText('BrightSpring Health Services — Company Overview', {
  x: in_(24), y: in_(10), w: in_(700), h: in_(34),
  fontFace: HFONT, fontSize: 14, bold: true, color: WHITE, valign: 'middle',
});

// Ticker sub-bar
rect(0, in_(52), 13.33, in_(22), ACCENT3);
slide.addText('NASDAQ: BTSG  |  Louisville, KY  |  CEO: Jon Rousseau', {
  x: in_(24), y: in_(55), w: in_(500), h: in_(16),
  fontFace: BFONT, fontSize: 6, bold: true, color: WHITE, valign: 'middle',
});

// LEFT COLUMN — business bullets
sectionLabel('Business Overview', in_(24), in_(83), in_(340));
const DOT = [{ text: '■ ', options: { color: ACCENT, bold: true } }];
const bullets = [
  [...DOT, { text: 'Leading provider of home- and community-based healthcare services' }],
  [...DOT, { text: 'IPO raised ' }, { text: '$880M', options: { bold: true } }, { text: ' in January 2024' }],
];
bullets.forEach((runs, i) => {
  slide.addText(runs, {
    x: in_(24), y: in_(105) + i * 0.30, w: in_(340), h: 0.30,
    fontFace: BFONT, fontSize: 7, color: BODY, wrap: true, valign: 'top',
  });
});

// Column divider
rect(in_(376), in_(74), in_(1), in_(454), ACCENT4);

// RIGHT COLUMN — financials table (manual rows)
sectionLabel('Summary Financials', in_(390), in_(83), in_(550));
rect(in_(390), in_(105), in_(550), in_(22), ACCENT);
slide.addText('($ in millions)', { x: in_(396), y: in_(108), w: in_(200), h: in_(16), fontFace: BFONT, fontSize: 6, bold: true, color: WHITE, valign: 'middle' });
slide.addText('FY2024A',         { x: in_(700), y: in_(108), w: in_(130), h: in_(16), fontFace: BFONT, fontSize: 6, bold: true, color: WHITE, align: 'right', valign: 'middle' });
slide.addText('Q3 2025',         { x: in_(840), y: in_(108), w: in_(90),  h: in_(16), fontFace: BFONT, fontSize: 6, bold: true, color: WHITE, align: 'right', valign: 'middle' });

const finRows = [
  { label: 'Net Revenue',       fy2024: '$10,072M', q3: '$3,330M', bold: true  },
  { label: 'Gross Profit',      fy2024: '$1,266M',  q3: '—',       bold: false },
  { label: 'Adj. EBITDA',       fy2024: '$460M',    q3: '—',       bold: true  },
  { label: 'Net Income (Loss)', fy2024: '($68.9M)', q3: '$55.8M',  bold: false },
];
finRows.forEach((row, i) => {
  const topPx = 127 + i * 24;
  const isEven = i % 2 === 0;
  const isRed = row.fy2024.startsWith('(');
  rect(in_(390), in_(topPx), in_(550), in_(22), isEven ? ROW_TINT : WHITE);
  slide.addText(row.label,   { x: in_(396), y: in_(topPx+4), w: in_(250), h: in_(16), fontFace: BFONT, fontSize: 6, bold: row.bold, color: HEADING, valign: 'middle' });
  slide.addText(row.fy2024,  { x: in_(700), y: in_(topPx+4), w: in_(130), h: in_(16), fontFace: BFONT, fontSize: 6, bold: row.bold, color: isRed ? RED : HEADING, align: 'right', valign: 'middle' });
  slide.addText(row.q3,      { x: in_(840), y: in_(topPx+4), w: in_(90),  h: in_(16), fontFace: BFONT, fontSize: 6, color: HEADING, align: 'right', valign: 'middle' });
});

// Bar chart — chartColors cycles per data point in single-series bars
sectionLabel('Net Revenue Growth ($M)', in_(390), in_(228), in_(270));
slide.addChart(prs.ChartType.bar, [{
  name: 'Net Revenue ($M)',
  labels: ['FY2022','FY2023','FY2024','FY2025E'],
  values: [7200, 8900, 10072, 13200],
}], {
  x: in_(384), y: in_(248), w: in_(278), h: in_(220),
  barDir: 'col', barGrouping: 'clustered',
  chartColors: [ACCENT, ACCENT, ACCENT, ACCENT3],
  showValue: true,
  dataLabelFontSize: 6, dataLabelFontFace: BFONT, dataLabelColor: HEADING,
  dataLabelPosition: 'outEnd',
  showLegend: false,
  catAxisLabelFontSize: 6, catAxisLabelFontFace: BFONT,
  valAxisLabelFontSize: 6, valAxisLabelFontFace: BFONT,
  valAxisMinVal: 0,
  showGridLineMajor: true, gridLineColor: ACCENT4,
  plotAreaBorderColor: WHITE, chartAreaBorderColor: WHITE,
});

// Footer
rect(0, in_(520), 13.33, in_(20), 'EDF1F6');
slide.addText('Sources: stocktitan.net, renaissancecapital.com', {
  x: in_(24), y: in_(524), w: in_(700), h: in_(14),
  fontFace: BFONT, fontSize: 5, color: BODY, valign: 'middle',
});
slide.addText('1', {
  x: in_(900), y: in_(524), w: in_(50), h: in_(14),
  fontFace: BFONT, fontSize: 6, bold: true, color: BODY, align: 'right', valign: 'middle',
});

prs.writeFile({ fileName: OUTPUT_PATH })
  .then(() => console.log('OK'))
  .catch(e => { console.error(e); process.exit(1); });
\`\`\`

=== FEW-SHOT EXAMPLE 3: Manual layout — no addTable, precise positioning with colX array ===
\`\`\`js
// Best for: complex group headers, vertical dividers, summary footer bars.
// Uses addShape + addText loops with pre-computed column x positions.
// Note the alternative pptxgenjs import style (global) — both work.
import "pptxgenjs";
const pptxgen = global.pptxgen;
const pres = new pptxgen();
pres.layout = 'LAYOUT_WIDE';  // 13.33" × 7.5"
pres.title  = 'Precedent Transactions';

const W = 13.33;
const H = 7.5;

const NAVY  = '0D1F3C';   // header/footer bg
const NAVY2 = '1A3560';   // column header row
const WHITE = 'FFFFFF';
const BLACK = '1A1A1A';
const GRAY_R = 'F2F2F2';  // alternating row bg
const GRAY_L = '888888';  // confidential label, page number
const GRAY_T = '444444';  // footnote text
const RULE   = 'C8C8C8';  // row border lines

const slide = pres.addSlide();
slide.background = { color: 'FFFFFF' };

// Positioning
const TX = 0.4;          // table left margin
const TY = 1.22;         // table top
const TW = W - 0.8;      // table width (12.93")
const ROW_H = 0.265;
const COL_W = [2.75, 2.25, 2.25, 0.70, 1.35, 1.35, 1.88]; // sum = TW

// Pre-compute column left edges
const colX = [];
let cx = TX;
for (const w of COL_W) { colX.push(cx); cx += w; }

const GH = 0.32;   // group header height
const CH = 0.30;   // column header height

// Confidential
slide.addText('- CONFIDENTIAL -', {
  x: 0, y: 0.05, w: W, h: 0.2,
  align: 'center', fontSize: 7, color: GRAY_L, fontFace: 'Calibri',
});

// Title + rule
slide.addText('Precedent LBO Transactions — Industrials (Sub-$1B)', {
  x: 0.4, y: 0.28, w: W-0.8, h: 0.45,
  fontSize: 22, bold: true, color: BLACK, fontFace: 'Calibri', margin: 0,
});
slide.addShape(pres.shapes.RECTANGLE, {
  x: 0.4, y: 0.97, w: W-0.8, h: 0.02,
  fill: { color: BLACK }, line: { color: BLACK, width: 0 },
});

// Group header row (full-width navy bar + two text labels)
slide.addShape(pres.shapes.RECTANGLE, {
  x: TX, y: TY, w: TW, h: GH,
  fill: { color: NAVY }, line: { color: NAVY, width: 0 },
});
slide.addText('Transaction Detail', {
  x: colX[0]+0.08, y: TY,
  w: COL_W[0]+COL_W[1]+COL_W[2]+COL_W[3]-0.08, h: GH,
  fontSize: 9, bold: true, color: WHITE, fontFace: 'Calibri', valign: 'middle', margin: 0,
});
slide.addText('Valuation', {
  x: colX[4], y: TY, w: COL_W[4]+COL_W[5]+COL_W[6], h: GH,
  fontSize: 9, bold: true, color: WHITE, fontFace: 'Calibri',
  align: 'center', valign: 'middle', margin: 0,
});
// Vertical divider between groups
slide.addShape(pres.shapes.RECTANGLE, {
  x: colX[4]-0.01, y: TY+0.04, w: 0.02, h: GH-0.08,
  fill: { color: '4466AA' }, line: { color: '4466AA', width: 0 },
});

// Column header row
const HY = TY + GH;
slide.addShape(pres.shapes.RECTANGLE, {
  x: TX, y: HY, w: TW, h: CH,
  fill: { color: NAVY2 }, line: { color: NAVY2, width: 0 },
});
const COL_LABELS = [
  { t: 'Target',             align: 'left'  },
  { t: 'Acquirer / Sponsor', align: 'left'  },
  { t: 'Sub-Sector',         align: 'left'  },
  { t: 'Year',               align: 'left'  },
  { t: 'EV ($M)',            align: 'right' },
  { t: 'EV / EBITDA (x)',    align: 'right' },
  { t: 'Source',             align: 'right' },
];
COL_LABELS.forEach((col, i) => {
  slide.addText(col.t, {
    x: colX[i]+0.07, y: HY, w: COL_W[i]-0.1, h: CH,
    fontSize: 8, bold: true, color: WHITE, fontFace: 'Calibri',
    align: col.align, valign: 'middle', margin: 0,
  });
});

// Data rows
const rows = [
  ['Hartwell Automation',        'Carlyle Group',       'Factory Automation',    '2025', '~$800',  '13.1x', '(2)'],
  ['Reliant Filtration Systems', 'Audax Private Equity','Industrial Filtration', '2025', '~$450',  '11.8x', '(2)'],
  ['Apex Thermal Solutions',     'Wynnchurch Capital',  'Thermal Mgmt.',         '2025', '~$280',  '10.9x', '(2)'],
  ['LOGISTEC Corporation',       'Blue Wolf / Stonepeak','Marine & Env. Svcs.', '2024', '~$900',  '10.2x', '(1)'],
];
const DY = HY + CH;
rows.forEach((row, i) => {
  const ry = DY + i * ROW_H;
  slide.addShape(pres.shapes.RECTANGLE, {
    x: TX, y: ry, w: TW, h: ROW_H,
    fill: { color: i % 2 === 0 ? WHITE : GRAY_R },
    line: { color: RULE, width: 0.5 },
  });
  const cellDefs = [
    { align: 'left',   bold: true,  italic: false, color: BLACK  },
    { align: 'left',   bold: false, italic: false, color: BLACK  },
    { align: 'left',   bold: false, italic: false, color: BLACK  },
    { align: 'center', bold: false, italic: false, color: BLACK  },
    { align: 'right',  bold: false, italic: false, color: BLACK  },
    { align: 'right',  bold: true,  italic: false, color: BLACK  },
    { align: 'right',  bold: false, italic: true,  color: GRAY_T },
  ];
  cellDefs.forEach((def, j) => {
    slide.addText(row[j], {
      x: colX[j]+0.07, y: ry+0.01, w: COL_W[j]-0.1, h: ROW_H-0.02,
      fontSize: 8, bold: def.bold, italic: def.italic, color: def.color,
      fontFace: 'Calibri', align: def.align, valign: 'middle', margin: 0,
    });
  });
  // Vertical divider between detail and valuation
  slide.addShape(pres.shapes.RECTANGLE, {
    x: colX[4]-0.01, y: ry, w: 0.02, h: ROW_H,
    fill: { color: RULE }, line: { color: RULE, width: 0 },
  });
});

// Footer summary bar
const FY = DY + rows.length * ROW_H;
slide.addShape(pres.shapes.RECTANGLE, {
  x: TX, y: FY, w: TW, h: 0.32,
  fill: { color: NAVY }, line: { color: NAVY, width: 0 },
});
slide.addText('All Transactions Summary \u2192', {
  x: colX[0]+0.08, y: FY, w: 7, h: 0.32,
  fontSize: 8, bold: true, color: WHITE, fontFace: 'Calibri', valign: 'middle', margin: 0,
});
slide.addText('Min: 10.2x     Mean: 11.3x     Max: 13.1x', {
  x: colX[4], y: FY, w: COL_W[4]+COL_W[5]+COL_W[6]-0.08, h: 0.32,
  fontSize: 8, bold: true, color: WHITE, fontFace: 'Calibri',
  align: 'right', valign: 'middle', margin: 0,
});

// Outer table border
slide.addShape(pres.shapes.RECTANGLE, {
  x: TX, y: TY, w: TW, h: GH+CH+rows.length*ROW_H+0.32,
  fill: { type: 'none' }, line: { color: NAVY, width: 1 },
});

// Footnotes (rich text for bold labels)
const fnY = FY + 0.32 + 0.08;
slide.addText([
  { text: '(1)', options: { bold: true } },
  { text: ' Confirmed transaction from public sources.' },
], { x: 0.4, y: fnY, w: TW, h: 0.18, fontSize: 6.5, color: GRAY_T, fontFace: 'Calibri', margin: 0 });
slide.addText([
  { text: '(2)', options: { bold: true } },
  { text: ' Benchmark-calibrated illustrative composite.' },
], { x: 0.4, y: fnY+0.19, w: TW, h: 0.18, fontSize: 6.5, color: GRAY_T, fontFace: 'Calibri', margin: 0 });

// Page number
slide.addText('1', {
  x: W-0.5, y: H-0.25, w: 0.3, h: 0.2,
  fontSize: 8, color: GRAY_L, fontFace: 'Calibri', align: 'right', margin: 0,
});

pres.writeFile({ fileName: OUTPUT_PATH })
  .then(() => console.log('OK'))
  .catch(e => { console.error(e); process.exit(1); });
\`\`\`
`.trim();

// ---------------------------------------------------------------------------
// Prompt builder
// ---------------------------------------------------------------------------

function buildAgentPrompt(slides: SlideInput[], theme: ThemeInput, outputPath: string): string {
  // Strip "#" from color strings — pptxgenjs never uses the "#" prefix
  const stripHash = (c: string) => c.replace(/^#/, '');
  const accentColors = (theme.accentColors || ['#1D4E89','#2E75B6','#4A9DCC','#2E75B6','#D6EAF8']).map(stripHash);

  const themeBlock = `
## Presentation Theme
- Heading font: "${theme.headingFont || 'Calibri'}"
- Body font:    "${theme.bodyFont || 'Calibri'}"
- Accent colors (index 0–4, NO "#" prefix): ${JSON.stringify(accentColors)}
- Heading text color: "${stripHash(theme.headingTextColor || '#1D2D3E')}"
- Body text color:    "${stripHash(theme.bodyTextColor    || '#2C3E50')}"
- Heading font size:  ${theme.headingFontSize || 18}px  → pt = px × 0.75
- Body font size:     ${theme.bodyFontSize    || 11}px  → pt = px × 0.75
- Background color:   "${stripHash(theme.backgroundColor || theme.slideBackgroundColor || '#FFFFFF')}"
`.trim();

  const slideBlocks = slides
    .map((s, i) => `### Slide ${s.slideNumber ?? i + 1}\n\`\`\`tsx\n${s.code}\n\`\`\``)
    .join('\n\n');

  return `You are an expert at converting React/TypeScript slide components into pptxgenjs scripts.

## Your task
1. Run: \`npm install pptxgenjs\`
2. Study the slide components and theme below.
3. Write ONE Node.js ESM script (\`build.mjs\`) that generates ALL slides in a
   single presentation, then execute it.
4. The script MUST save the .pptx to exactly this path: \`${outputPath}\`
   Replace the placeholder \`OUTPUT_PATH\` in the examples with this path.
5. After the file is written, read it, base64-encode it, and print EXACTLY
   this JSON line to stdout (the only content on that line):
   \`{"pptx_b64":"<base64 string>"}\`

## Critical pptxgenjs rules — memorise these
- Import style A (preferred): \`import { createRequire } from 'module'; const require = createRequire(import.meta.url); const pptxgen = require('pptxgenjs');\`
- Import style B (alternative): \`import "pptxgenjs"; const pptxgen = global.pptxgen;\`
- Layout: \`prs.layout = 'LAYOUT_WIDE'\` → 13.33" × 7.5" (NOT 10" × 5.625")
- Colors: hex WITHOUT "#" — \`'1D4E89'\` ✓  \`'#1D4E89'\` ✗  (wrong format silently corrupts file)
- Coordinate system: everything in decimal inches
- Px → inches: \`px * 13.33 / 960\` (React canvas is 960px wide; PPTX is 13.33" wide)
- Font px → pt: \`px * 0.75\`
- Rectangles: \`prs.ShapeType.rect\` + \`line: { type: 'none' }\` to suppress border
- addTable cell format: \`{ text: "...", options: { ...styling... } }\`
- colspan goes in options: \`{ text: "Header", options: { colspan: 4, fill: { color: "..." }, ... } }\`
- addChart single-series: \`chartColors\` cycles per data point — use array of colors per bar
- Multiple slides: call \`prs.addSlide()\` once per component, in order
- End every script with \`prs.writeFile({ fileName: OUTPUT_PATH }).then(...).catch(...)\`

## Few-shot examples
Study these three examples carefully — they demonstrate the exact patterns to use:

${FEW_SHOT_EXAMPLES}

---

## Theme
${themeBlock}

---

## Slide components to convert (${slides.length} total)
Each component renders at 960×540px (16:9). Reproduce ALL text, data, colors,
tables, and charts faithfully. Do not omit or summarise any data.

${slideBlocks}

---

After the script runs and the file is saved, emit the base64 JSON line.`;
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST')   return res.status(405).json({ error: 'Method not allowed' });

  const { slides, theme = {} as ThemeInput, filename = 'presentation' } = req.body;

  if (!slides) {
    return res.status(400).json({
      error: '`slides` is required. Pass a dict { "1": "<code>" }, an array of SlideInput, or a single SlideInput.',
    });
  }

  let slideArray: SlideInput[];
  try {
    slideArray = normaliseSlides(slides);
  } catch (err: any) {
    return res.status(400).json({ error: `Failed to parse slides: ${err.message}` });
  }

  if (slideArray.length === 0) return res.status(400).json({ error: 'No slides found.' });
  if (slideArray.some(s => !s.code)) return res.status(400).json({ error: 'Every slide must have a `code` field.' });

  const safeName   = filename.replace(/[^a-zA-Z0-9_-]/g, '_');
  // /tmp is writable inside the agent SDK's sandbox environment
  const outputPath = `/tmp/${safeName}_${Date.now()}.pptx`;

  console.log(`[export-pptx-claude] ${slideArray.length} slide(s) → ${outputPath}`);
  const t0 = Date.now();

  try {
    const prompt = buildAgentPrompt(slideArray, theme as ThemeInput, outputPath);
    console.log(`[export-pptx-claude] Prompt: ${prompt.length} chars`);

    // ── 1. Run the Claude Code agent ─────────────────────────────────────────
    //
    // sandbox.enabled: true  →  the SDK provisions an ephemeral Node.js
    //   container where Claude can npm install, write files, and execute scripts.
    // autoAllowBashIfSandboxed: true  →  no interactive permission prompts.
    //
    // WHY NOT @vercel/sandbox:
    //   analyze.ts used @vercel/sandbox because it needed a *persistent* VM
    //   (reconnectable by sandboxId), ran a Node subprocess inside it, and
    //   read files back with readFileToBuffer. All that boilerplate was needed
    //   because the Anthropic SDK had no built-in execution environment.
    //   The Claude Agent SDK's sandbox option replaces all of that — Claude
    //   Code gets its own managed container automatically.
    //
    // WHY base64 via stdout (not a temp file read by this process):
    //   The agent sandbox is isolated from the Vercel function's filesystem.
    //   There's no shared /tmp. The cleanest egress is having Claude print the
    //   base64 payload as a JSON line to stdout, which the SDK surfaces in
    //   message.result — we capture that here without any file I/O.

    let agentResult = '';

    for await (const message of query({
      prompt,
      options: {
        model: 'claude-sonnet-4-6',
        maxTurns: 25,
        sandbox: {
          enabled: true,
          autoAllowBashIfSandboxed: true,
          network: { allowLocalBinding: true },
        },
      },
    })) {
      if ('result' in message) {
        agentResult = typeof message.result === 'string'
          ? message.result
          : JSON.stringify(message.result);
      }
    }

    const elapsed = Date.now() - t0;
    console.log(`[export-pptx-claude] Agent done in ${elapsed}ms`);

    // ── 2. Parse the base64 PPTX out of the agent result ─────────────────────
    // The agent emits {"pptx_b64":"..."} as a line in its stdout/result.
    // We scan every line for that pattern, tolerating surrounding prose.
    let pptxBase64: string | null = null;

    for (const line of agentResult.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed.startsWith('{')) continue;
      try {
        const parsed = JSON.parse(trimmed);
        if (typeof parsed.pptx_b64 === 'string' && parsed.pptx_b64.length > 100) {
          pptxBase64 = parsed.pptx_b64;
          break;
        }
      } catch {
        // Not valid JSON on this line — keep scanning
      }
    }

    if (!pptxBase64) {
      console.error(
        `[export-pptx-claude] No {"pptx_b64":...} found in agent result.\n` +
        `Result tail (last 800 chars): ${agentResult.slice(-800)}`,
      );
      return res.status(500).json({
        error: 'PPTX generation succeeded but no base64 payload was emitted by the agent.',
        details: agentResult.slice(-1500),
      });
    }

    const pptxBuffer = Buffer.from(pptxBase64, 'base64');
    console.log(
      `[export-pptx-claude] Decoded PPTX: ${(pptxBuffer.length / 1024).toFixed(1)} KB | ` +
      `total: ${Date.now() - t0}ms`,
    );

    // ── 3. Stream the .pptx back to the caller ────────────────────────────────
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    );
    res.setHeader('Content-Disposition', `attachment; filename="${safeName}.pptx"`);
    res.setHeader('Content-Length', pptxBuffer.length);
    return res.status(200).send(pptxBuffer);

  } catch (error: any) {
    const elapsed = Date.now() - t0;
    console.error(`[export-pptx-claude] Error after ${elapsed}ms:`, error.message);
    console.error(error.stack);
    return res.status(500).json({ error: error.message, details: error.stack });
  }
}