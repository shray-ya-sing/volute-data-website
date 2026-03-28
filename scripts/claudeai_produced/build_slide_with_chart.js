/**
 * build_slide_with_chart.js
 *
 * Generates slide_with_chart.pptx using pptxgenjs.
 * Replicates scripts/pptx/slide_with_chart.tsx — a two-column company
 * overview slide for BrightSpring Health Services with a bar chart,
 * financial table, valuation metrics, and segment boxes.
 *
 * Usage:
 *   node scripts/claudeai_produced/build_slide_with_chart.js
 *
 * Output: C:\Users\shrey\volute-data-website\scripts\pptx\slide_with_chart.pptx
 */

import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pptxgen = require('pptxgenjs');

import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

// ─── Theme / branding defaults ────────────────────────────────────────────────
// These mirror the accentColors prop passed to the React component.
// accentColors[0] = primary navy, [3] = secondary blue, [4] = pale blue
const ACCENT   = '1D4E89';   // accentColors[0]
const ACCENT_3 = '2E75B6';   // accentColors[3] – ticker bar, segment 2, FY25E bar
const ACCENT_4 = 'D6EAF8';   // accentColors[4] – divider line, row tints

// Blended / derived colours (opacity approximated on white)
const ROW_TINT  = 'EFF7FC';   // ACCENT_4 @ ~38% opacity  (even data rows)
const FOOTER_BG = 'EDF1F6';   // ACCENT   @  ~8% opacity  (footer bar)

const HEADING = '1D2D3E';
const BODY    = '2C3E50';
const RED     = 'B91C1C';
const WHITE   = 'FFFFFF';
const BG      = 'FFFFFF';
const HFONT   = 'Calibri';
const BFONT   = 'Calibri';

// ─── px → inches helper (960 px = 10", 540 px = 5.625" @ 96 dpi) ─────────────
const in_ = px => +(px / 96).toFixed(4);

// ─── Font sizes (pt) ──────────────────────────────────────────────────────────
// Derived from the TSX props with headingFontSize=18px, bodyFontSize=11px,
// then converted: pt = px × 0.75
// h1Size   = 18 * 1.00 * 0.75 = 13.5 ≈ 14pt
// h3Size   = 18 * 0.52 * 0.75 =  7.0 ≈  7pt
// smallSize = 11 * 0.85 * 0.75 =  7.0 ≈  7pt
// tinySize  = 11 * 0.75 * 0.75 =  6.2 ≈  6pt
const H1   = 14;
const H3   =  7;
const SM   =  7;
const TINY =  6;

// ─── Slide data ───────────────────────────────────────────────────────────────
const financials = [
  { label: 'Net Revenue',        fy2024: '$10,072M', q3_2025: '$3,330M', bold: true  },
  { label: 'Gross Profit',       fy2024: '$1,266M',  q3_2025: '—',       bold: false },
  { label: 'Adj. EBITDA',        fy2024: '$460M',    q3_2025: '—',       bold: true  },
  { label: 'Net Income (Loss)',  fy2024: '($68.9M)', q3_2025: '$55.8M',  bold: false },
];

const valuation = [
  { label: 'Current Share Price',    value: '~$19.50', bold: false },
  { label: 'Consensus Price Target', value: '~$41.93', bold: false },
  { label: 'Market Capitalization',  value: '~$3.2B',  bold: true  },
  { label: 'IPO Price (Jan 2024)',   value: '$15–$18', bold: false },
  { label: 'IPO Proceeds',           value: '$880M',   bold: false },
  { label: 'YTD Stock Return',       value: '~+111%',  bold: true  },
  { label: 'Ownership: PE Firms',    value: '~48%',    bold: false },
  { label: 'Ownership: Public Cos.', value: '~20%',    bold: false },
];

const revenueData = [
  { year: 'FY2022',  value: 7200  },
  { year: 'FY2023',  value: 8900  },
  { year: 'FY2024',  value: 10072 },
  { year: 'FY2025E', value: 13200 },
];

// ─── Build presentation ───────────────────────────────────────────────────────
const prs = new pptxgen();
prs.layout = 'LAYOUT_WIDE';   // 10" × 5.625"

const slide = prs.addSlide();
slide.background = { color: BG };

// ── Helpers ───────────────────────────────────────────────────────────────────
/** Solid filled rectangle with no border */
function rect(x, y, w, h, color) {
  slide.addShape(prs.ShapeType.rect, { x, y, w, h, fill: { color }, line: { type: 'none' } });
}

/**
 * Section heading label (all-caps) + 2 px underline bar.
 * Mirrors: fontWeight:700, textTransform:'uppercase', borderBottom
 */
function sectionLabel(text, x, y, w) {
  slide.addText(text.toUpperCase(), {
    x, y, w, h: in_(16),
    fontFace: HFONT, fontSize: H3, bold: true, color: ACCENT,
    charSpacing: 0.5, valign: 'middle',
  });
  rect(x, y + in_(16), w, in_(2), ACCENT);  // underline
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── 1. Header bar  (top:0, h:52px) ────────────────────────────────────────────
rect(0, 0, 10, in_(52), ACCENT);

// ── 2. Title ──────────────────────────────────────────────────────────────────
slide.addText('BrightSpring Health Services — Company Overview', {
  x: in_(24), y: in_(10), w: in_(600), h: in_(34),
  fontFace: HFONT, fontSize: H1, bold: true, color: WHITE, valign: 'middle',
});

// ── 3. Ticker / HQ sub-header bar  (top:52, h:22px) ──────────────────────────
rect(0, in_(52), 10, in_(22), ACCENT_3);

// ── 4. Ticker text ────────────────────────────────────────────────────────────
slide.addText('NASDAQ: BTSG  |  Louisville, Kentucky  |  CEO: Jon Rousseau  |  Founded: ~1974', {
  x: in_(24), y: in_(55), w: in_(500), h: in_(16),
  fontFace: BFONT, fontSize: TINY, bold: true, color: WHITE,
  charSpacing: 0.3, valign: 'middle',
});

// ═══════════════════════════════════════════════════════════════════════════════
// ── LEFT COLUMN  (x: 0–376px)
// ═══════════════════════════════════════════════════════════════════════════════

// ── 5. "Business Overview" section label ─────────────────────────────────────
sectionLabel('Business Overview', in_(24), in_(83), in_(340));

// ── 6. Business bullets ───────────────────────────────────────────────────────
// Each bullet is a rich-text array so the ■ marker can be coloured separately
// and inline <strong> segments can be bolded.
const BULL_BASE = { fontFace: BFONT, fontSize: SM, color: BODY, wrap: true, valign: 'top' };
const DOT = [{ text: '■ ', options: { color: ACCENT, bold: true } }];

const bulletItems = [
  [
    ...DOT,
    { text: 'Leading provider of home- and community-based healthcare and pharmacy services for complex, high-need populations across all 50 U.S. states' },
  ],
  [
    ...DOT,
    { text: 'Operates through two segments: ' },
    { text: 'Pharmacy Solutions', options: { bold: true } },
    { text: ' and ' },
    { text: 'Provider Services', options: { bold: true } },
  ],
  [
    ...DOT,
    { text: 'Serves individuals with disabilities, seniors, and patients with complex medical needs in lower-cost, preferred care settings' },
  ],
  [
    ...DOT,
    { text: 'IPO raised ' },
    { text: '$880M', options: { bold: true } },
    { text: ' in January 2024; YTD stock return ~111% at time of coverage' },
  ],
  [
    ...DOT,
    { text: 'Analyst consensus price target ~$41.93/share; Q3 2025 profitability turnaround with net income of $55.8M' },
  ],
];

// Stack bullets from y=105px downward, ~0.30" each (≈ smallSize 7pt × lineHeight 1.55 + 7px gap)
const BULL_ROW_H = 0.30;
bulletItems.forEach((runs, idx) => {
  slide.addText(runs, {
    ...BULL_BASE,
    x: in_(24),
    y: in_(105) + idx * BULL_ROW_H,
    w: in_(340),
    h: BULL_ROW_H,
  });
});

// ── 7. "Business Segments" section label  (top: 318px) ───────────────────────
sectionLabel('Business Segments', in_(24), in_(318), in_(340));

// ── 8. Segment 1 — Pharmacy Solutions (navy box, top:340, 164×80px) ──────────
rect(in_(24), in_(340), in_(164), in_(80), ACCENT);
slide.addText([
  { text: 'Pharmacy Solutions\n', options: { bold: true, fontSize: SM } },
  { text: 'Specialty & institutional pharmacy; includes PharMerica and Onco360 (oncology); national pharmacy partner for cancer/rare disease drugs' },
], {
  x: in_(30), y: in_(348), w: in_(152), h: in_(64),
  fontFace: BFONT, fontSize: TINY, color: WHITE, wrap: true, valign: 'top',
});

// ── 9. Segment 2 — Provider Services (secondary blue box, left:198px) ─────────
rect(in_(198), in_(340), in_(164), in_(80), ACCENT_3);
slide.addText([
  { text: 'Provider Services\n', options: { bold: true, fontSize: SM } },
  { text: 'Home health, hospice, and community-based behavioral & personal care across all 50 states' },
], {
  x: in_(204), y: in_(348), w: in_(152), h: in_(64),
  fontFace: BFONT, fontSize: TINY, color: WHITE, wrap: true, valign: 'top',
});

// ── 10. "Recent Highlights" section label  (top: 432px) ──────────────────────
sectionLabel('Recent Highlights', in_(24), in_(432), in_(340));

// Highlights bullets
slide.addText([
  ...DOT,
  { text: 'Raised full-year 2025 revenue and Adj. EBITDA guidance; Acquired Advanced Home Care (2020) and Haven Hospice (2024)' },
], { ...BULL_BASE, x: in_(24), y: in_(452), w: in_(340), h: BULL_ROW_H });

slide.addText([
  ...DOT,
  { text: 'Ownership: ~48% private equity; ~20% public companies' },
], { ...BULL_BASE, x: in_(24), y: in_(452) + BULL_ROW_H, w: in_(340), h: BULL_ROW_H });

// ── 11. Vertical column divider  (left:376px, top:74px, h:454px) ─────────────
rect(in_(376), in_(74), in_(1), in_(454), ACCENT_4);

// ═══════════════════════════════════════════════════════════════════════════════
// ── RIGHT COLUMN  (x: 390–950px)
// ═══════════════════════════════════════════════════════════════════════════════

// ── 12. "Summary Financials" section label ────────────────────────────────────
sectionLabel('Summary Financials', in_(390), in_(83), in_(560));

// ── 13. Financials table header bar  (top:105, h:22px) ───────────────────────
rect(in_(390), in_(105), in_(560), in_(22), ACCENT);
slide.addText('($ in millions)', {
  x: in_(396), y: in_(108), w: in_(200), h: in_(16),
  fontFace: BFONT, fontSize: TINY, bold: true, color: WHITE, valign: 'middle',
});
slide.addText('FY2024A', {
  x: in_(650), y: in_(108), w: in_(130), h: in_(16),
  fontFace: BFONT, fontSize: TINY, bold: true, color: WHITE,
  align: 'right', valign: 'middle',
});
slide.addText('Q3 2025', {
  x: in_(800), y: in_(108), w: in_(140), h: in_(16),
  fontFace: BFONT, fontSize: TINY, bold: true, color: WHITE,
  align: 'right', valign: 'middle',
});

// ── 14. Financials table rows  (4 rows × 24px, starting at top:127px) ─────────
financials.forEach((row, idx) => {
  const isEven = idx % 2 === 0;
  const topPx  = 127 + idx * 24;
  const isRed  = row.fy2024.startsWith('(');

  // Alternating row background
  rect(in_(390), in_(topPx), in_(560), in_(22), isEven ? ROW_TINT : WHITE);

  slide.addText(row.label, {
    x: in_(396), y: in_(topPx + 4), w: in_(250), h: in_(16),
    fontFace: BFONT, fontSize: TINY, bold: row.bold, color: HEADING, valign: 'middle',
  });
  slide.addText(row.fy2024, {
    x: in_(650), y: in_(topPx + 4), w: in_(130), h: in_(16),
    fontFace: BFONT, fontSize: TINY, bold: row.bold,
    color: isRed ? RED : HEADING,
    align: 'right', valign: 'middle',
  });
  slide.addText(row.q3_2025, {
    x: in_(800), y: in_(topPx + 4), w: in_(140), h: in_(16),
    fontFace: BFONT, fontSize: TINY,
    bold: row.label === 'Net Revenue',
    color: HEADING, align: 'right', valign: 'middle',
  });
});

// ── 15. "Net Revenue Growth" section label  (top:228px, left:390px) ──────────
sectionLabel('Net Revenue Growth ($M)', in_(390), in_(228), in_(270));

// ── 16. Bar chart  (top:248px, left:384px, 278×220px) ────────────────────────
//
// Per-bar colours: ACCENT for FY2022–FY2024, ACCENT_3 for FY2025E (estimate).
// pptxgenjs cycles chartColors per data point for a single-series bar chart.
//
// Note: pptxgenjs does not support custom data-label formatters, so labels
// will display as raw numbers (7200, 8900, 10072, 13200) rather than "$7,200".
slide.addChart(prs.ChartType.bar, [
  {
    name: 'Net Revenue ($M)',
    labels: revenueData.map(d => d.year),
    values: revenueData.map(d => d.value),
  },
], {
  x: in_(384), y: in_(248), w: in_(278), h: in_(220),
  barDir: 'col',
  barGrouping: 'clustered',
  chartColors: [ACCENT, ACCENT, ACCENT, ACCENT_3],

  // Data labels
  showValue: true,
  dataLabelFontSize: TINY,
  dataLabelFontFace: BFONT,
  dataLabelColor: HEADING,
  dataLabelPosition: 'outEnd',

  // Legend
  showLegend: false,

  // Axes
  catAxisLabelFontSize: TINY,
  catAxisLabelFontFace: BFONT,
  valAxisLabelFontSize: TINY,
  valAxisLabelFontFace: BFONT,
  valAxisMinVal: 0,
  valAxisMaxVal: 15000,
  valAxisMajorUnit: 5000,

  // Grid & borders
  showGridLineMajor: true,
  gridLineColor: ACCENT_4,
  plotAreaBorderColor: WHITE,
  chartAreaBorderColor: WHITE,
});

// ── 17. "Valuation Summary" section label  (top:228px, left:674px) ────────────
sectionLabel('Valuation Summary', in_(674), in_(228), in_(276));

// ── 18. Valuation rows  (8 rows × 26px, starting at top:250px) ───────────────
valuation.forEach((row, idx) => {
  const isEven = idx % 2 === 0;
  const topPx  = 250 + idx * 26;

  rect(in_(674), in_(topPx), in_(276), in_(24), isEven ? ROW_TINT : WHITE);

  slide.addText(row.label, {
    x: in_(678), y: in_(topPx + 5), w: in_(180), h: in_(16),
    fontFace: BFONT, fontSize: TINY, bold: row.bold, color: BODY, valign: 'middle',
  });
  slide.addText(row.value, {
    x: in_(858), y: in_(topPx + 5), w: in_(88), h: in_(16),
    fontFace: BFONT, fontSize: TINY, bold: row.bold,
    color: row.bold ? ACCENT : HEADING,
    align: 'right', valign: 'middle',
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// ── Footer  (top:520px, h:20px)
// ═══════════════════════════════════════════════════════════════════════════════

// ── 19. Footer bar
rect(0, in_(520), 10, in_(20), FOOTER_BG);

// ── 20. Footer text  (tinySize × 0.85 ≈ 5pt)
slide.addText(
  'Sources: stocktitan.net, renaissancecapital.com, finance.yahoo.com  |  ' +
  'Note: FY2025E revenue estimate is analyst consensus projection. All figures approximate.',
  {
    x: in_(24), y: in_(524), w: in_(700), h: in_(14),
    fontFace: BFONT, fontSize: 5, color: BODY, valign: 'middle',
  }
);

// ── 21. Page number
slide.addText('1', {
  x: in_(900), y: in_(524), w: in_(50), h: in_(14),
  fontFace: BFONT, fontSize: TINY, bold: true, color: BODY,
  align: 'right', valign: 'middle',
});

// ─── Write file ───────────────────────────────────────────────────────────────
const outPath = path.resolve(__dirname, '../pptx/slide_with_chart.pptx');

prs
  .writeFile({ fileName: outPath })
  .then(() => console.log(`✓  Written → ${outPath}`))
  .catch(err => { console.error('Error writing PPTX:', err); process.exit(1); });
