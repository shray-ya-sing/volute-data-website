/**
 * build_slide_1_v2.js
 *
 * Generates slide_1_v2.pptx using pptxgenjs.
 * Replicates the React component at scripts/pptx/slide_1_v2.tsx —
 * layout, typography, table structure, column groups, and colour scheme
 * are all preserved.
 *
 * Usage:
 *   npm install pptxgenjs          (if not already installed)
 *   node scripts/claudeai_produced/build_slide_1_v2.js
 *
 * Output: slide_1_v2.pptx  (written to the current working directory)
 */

import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pptxgen = require('pptxgenjs');

// ─── Theme / branding defaults ────────────────────────────────────────────────
// These mirror the accentColors array and font props passed to the React component.
// Edit these to match your actual brand palette.
const ACCENT       = '1D4E89';   // accentColors[0]  – primary navy
const ACCENT_1     = '2E75B6';   // accentColors[1]  – medium blue  (IPO Details header)
const ACCENT_2     = '4A9DCC';   // accentColors[2]  – steel blue   (LTM Financials header)
const ACCENT_3     = 'D6EAF8';   // accentColors[4]  – pale blue    (Valuation header bg, alt-row tint)

// Blended / derived colours (opacity simulated on white background)
const ALT_ROW_BG   = 'EBF5FB';   // ACCENT_3 @ ~33 % opacity on white
const COL_HDR_BG   = 'EDF1F6';   // ACCENT   @  ~8 % opacity on white
const FOOTER_LINE  = '8BABC4';   // ACCENT   @ ~25 % opacity on white

const HEADING_COLOR = '1D2D3E';
const BODY_COLOR    = '2C3E50';
const GREY          = '9CA3AF';
const SUBTEXT_GREY  = '6B7280';
const WHITE         = 'FFFFFF';
const BG_COLOR      = 'FFFFFF';

const HEADING_FONT  = 'Calibri';
const BODY_FONT     = 'Calibri';

// ─── Slide data ───────────────────────────────────────────────────────────────
const rows = [
  {
    company: 'BrightSpring Health',    ticker: 'BTSG',
    sector:  'Home & Community Health', sponsor: 'KKR',
    ipoDate: 'Jan 2024', shares: '53.3M',   priceRange: '$15.00–$18.00',
    finalPrice: '$13.00', proceeds: '$1,108M', marketCap: '~$3.0B',
    ltmRev: '$8,830M',    ltmEbitda: '~$280M',   evRev: '0.3x',  evEbitda: '~10.7x',
  },
  {
    company: 'PACS Group',             ticker: 'PACS',
    sector:  'Skilled Nursing / Post-Acute', sponsor: 'PE-backed (undisclosed)',
    ipoDate: 'Apr 2024', shares: '21.4M',   priceRange: '$18.00–$21.00',
    finalPrice: '$21.00', proceeds: '$450M',    marketCap: '~$3.0B',
    ltmRev: '~$2,000M',   ltmEbitda: '~$230M',   evRev: '~1.5x', evEbitda: '~13.0x',
  },
  {
    company: 'Waystar Holding',        ticker: 'WAY',
    sector:  'Healthcare IT / RCM',    sponsor: 'EQT',
    ipoDate: 'Jun 2024', shares: '45.0M',   priceRange: '$20.00–$23.00',
    finalPrice: '$21.50', proceeds: '$909M',    marketCap: '~$5.3B',
    ltmRev: '~$854M',     ltmEbitda: '~$340M',   evRev: '~6.2x', evEbitda: '~15.6x',
  },
  {
    company: 'Ardent Health Partners', ticker: 'ARDT',
    sector:  'Hospital Systems',       sponsor: 'Equity Group Investments',
    ipoDate: 'Jul 2024', shares: '12.0M',   priceRange: '$16.00–$19.00',
    finalPrice: '$16.00', proceeds: '$192M',    marketCap: '~$2.7B',
    ltmRev: '~$5,400M',   ltmEbitda: '~$314M',   evRev: '0.5x',  evEbitda: '~8.6x',
  },
  {
    company: 'Lumexa Imaging',         ticker: 'LMRI',
    sector:  'Outpatient Imaging',     sponsor: 'Welsh, Carson, Anderson & Stowe',
    ipoDate: 'Dec 2025', shares: '25.0M',   priceRange: '$17.00–$20.00',
    finalPrice: '$18.50', proceeds: '$463M',    marketCap: '~$2.8B',
    ltmRev: '~$800M',     ltmEbitda: '~$180M',   evRev: '~3.5x', evEbitda: '~15.6x',
  },
  {
    company: 'Medline Industries',     ticker: 'MDLN',
    sector:  'Medical Supplies',       sponsor: 'Blackstone / Carlyle / H&F',
    ipoDate: 'Dec 2025', shares: '216.0M',  priceRange: '$27.00–$30.00',
    finalPrice: '$29.00', proceeds: '$6,264M', marketCap: '~$37.3B',
    ltmRev: '~$23,000M',  ltmEbitda: '~$1,700M', evRev: '~1.6x', evEbitda: '~22.0x',
  },
];

// ─── Column widths (inches) ───────────────────────────────────────────────────
// Derived from the TSX <colgroup> pixel widths (÷96 to convert px→in) then
// scaled proportionally so that they sum to the 9.375" table width.
// TSX px:  [100, 38, 90, 90, 42, 40, 72, 44, 52, 50, 56, 54, 40, 42]  → sum 810 px
// Scale:   9.375 / (810/96) = 9.375 / 8.4375 ≈ 1.1111
const COL_W = [
  1.157,  // Company
  0.440,  // Ticker
  1.042,  // Sector
  1.042,  // PE Sponsor
  0.486,  // IPO Date
  0.463,  // Shares Offered
  0.833,  // Offer Price Range
  0.509,  // Final IPO Price
  0.602,  // Total Proceeds
  0.579,  // IPO Mkt Cap
  0.648,  // LTM Revenue
  0.625,  // LTM Adj. EBITDA
  0.463,  // EV / Rev
  0.486,  // EV / EBITDA
];

// ─── Build presentation ───────────────────────────────────────────────────────
const prs = new pptxgen();
prs.layout = 'LAYOUT_WIDE';   // 10" × 5.625" (matches 960×540 px at 96 dpi)

const slide = prs.addSlide();
slide.background = { color: BG_COLOR };

// ── 1. Top accent bar (full-width, 4 px tall) ─────────────────────────────────
//    960 px wide, 4 px tall → 10" × 0.042"
slide.addShape(prs.ShapeType.rect, {
  x: 0, y: 0, w: 10, h: 0.042,
  fill: { color: ACCENT },
  line: { type: 'none' },
});

// ── 2. "— CONFIDENTIAL —" centred label (top: 8 px) ──────────────────────────
slide.addText('— CONFIDENTIAL —', {
  x: 0, y: 0.083, w: 10, h: 0.125,
  align: 'center',
  fontFace: BODY_FONT,
  fontSize: 6,
  color: GREY,
  charSpacing: 2.5,
});

// ── 3. Title (top: 22 px, left: 30 px) ───────────────────────────────────────
//    headingFontSize * 1.05 px → pt:  18 * 1.05 * 0.75 ≈ 14 pt
slide.addText('PE-Backed Healthcare IPOs (2024–2025)', {
  x: 0.3125, y: 0.229, w: 9.375, h: 0.260,
  fontFace: HEADING_FONT,
  fontSize: 14,
  bold: true,
  color: HEADING_COLOR,
});

// ── 4. Subtitle (top: 46 px) ──────────────────────────────────────────────────
//    bodyFontSize * 0.85 px → pt:  11 * 0.85 * 0.75 ≈ 7 pt
slide.addText('Select sponsor-backed healthcare companies that completed IPOs since 2023', {
  x: 0.3125, y: 0.479, w: 9.375, h: 0.187,
  fontFace: BODY_FONT,
  fontSize: 7,
  color: SUBTEXT_GREY,
  italic: true,
});

// ── 5. Horizontal divider under subtitle (top: 62 px, height: 2 px) ──────────
slide.addShape(prs.ShapeType.rect, {
  x: 0.3125, y: 0.646, w: 9.375, h: 0.021,
  fill: { color: ACCENT },
  line: { type: 'none' },
});

// ── 6. Unit-of-measure note (top: 67 px) ─────────────────────────────────────
slide.addText('($ in millions, unless otherwise noted)', {
  x: 0.3125, y: 0.698, w: 9.375, h: 0.114,
  fontFace: BODY_FONT,
  fontSize: 6,
  color: GREY,
  italic: true,
});

// ─────────────────────────────────────────────────────────────────────────────
// ── 7. Table (top: 78 px, left: 30 px, width: 900 px)
// ─────────────────────────────────────────────────────────────────────────────

/** Create a pptxgenjs table cell object. */
function cell(text, opts = {}) {
  return { text, options: opts };
}

// Shared base options
const BASE_CELL = {
  fontFace: BODY_FONT,
  fontSize: 6,
  color: BODY_COLOR,
  valign: 'middle',
};
const BASE_HDR = {
  fontFace: HEADING_FONT,
  fontSize: 6,
  bold: true,
  color: HEADING_COLOR,
  valign: 'middle',
};

// No-border sentinel (used to suppress unwanted cell borders)
const NO_BDR = { type: 'none' };
// Bottom border used on column-header row
const HDR_BOTTOM_BDR = { pt: 1.5, color: ACCENT };

// ── Row 0 — column-group headers ─────────────────────────────────────────────
// [top, right, bottom, left]
const groupHdrRow = [
  cell('Company Information', {
    ...BASE_HDR, colspan: 4, align: 'center',
    fill: { color: ACCENT }, color: WHITE,
    border: [NO_BDR, { pt: 2, color: WHITE }, NO_BDR, NO_BDR],
  }),
  cell('IPO Details', {
    ...BASE_HDR, colspan: 6, align: 'center',
    fill: { color: ACCENT_1 }, color: WHITE,
    border: [NO_BDR, { pt: 2, color: WHITE }, NO_BDR, NO_BDR],
  }),
  cell('LTM Financials', {
    ...BASE_HDR, colspan: 2, align: 'center',
    fill: { color: ACCENT_2 }, color: WHITE,
    border: [NO_BDR, { pt: 2, color: WHITE }, NO_BDR, NO_BDR],
  }),
  cell('Valuation', {
    ...BASE_HDR, colspan: 2, align: 'center',
    fill: { color: ACCENT_3 }, color: ACCENT,
    border: [NO_BDR, NO_BDR, NO_BDR, NO_BDR],
  }),
];

// ── Row 1 — column headers ────────────────────────────────────────────────────
const COL_LABELS  = [
  'Company', 'Ticker', 'Sector', 'PE Sponsor',
  'IPO Date', 'Shares Offered', 'Offer Price Range', 'Final IPO Price',
  'Total Proceeds', 'IPO Mkt Cap', 'LTM Revenue', 'LTM Adj. EBITDA',
  'EV / Rev', 'EV / EBITDA',
];
const COL_ALIGNS  = [
  'left','center','left','left',
  'center','right','center','right',
  'right','right','right','right',
  'right','right',
];
const colHdrRow = COL_LABELS.map((label, i) =>
  cell(label, {
    ...BASE_HDR,
    align: COL_ALIGNS[i],
    fill: { color: COL_HDR_BG },
    border: [NO_BDR, NO_BDR, HDR_BOTTOM_BDR, NO_BDR],
  })
);

// ── Rows 2–7 — data ───────────────────────────────────────────────────────────
const dataRows = rows.map((row, i) => {
  const isAlt = i % 2 === 1;
  const bg    = isAlt ? ALT_ROW_BG : WHITE;
  // Bottom hairline border in accent3
  const bdr   = [NO_BDR, NO_BDR, { pt: 0.5, color: ACCENT_3 }, NO_BDR];

  /** Plain left-aligned cell */
  const c  = (text, extra = {}) =>
    cell(text, { ...BASE_CELL, fill: { color: bg }, border: bdr, align: 'left',  ...extra });
  /** Right-aligned numeric cell */
  const nc = (text, extra = {}) =>
    cell(text, { ...BASE_CELL, fill: { color: bg }, border: bdr, align: 'right', ...extra });
  /** Highlighted numeric cell (valuation columns) */
  const hc = (text, extra = {}) =>
    cell(text, { ...BASE_CELL, fill: { color: bg }, border: bdr, align: 'right',
                 color: ACCENT, bold: true, ...extra });

  return [
    /* Company  */ c(row.company,    { color: HEADING_COLOR, bold: true }),
    /* Ticker   */ c(row.ticker,     { align: 'center', color: ACCENT, bold: true }),
    /* Sector   */ c(row.sector,     { fontSize: 5.5 }),
    /* Sponsor  */ c(row.sponsor,    { fontSize: 5.5 }),
    /* IPO Date */ c(row.ipoDate,    { align: 'center' }),
    /* Shares   */ nc(row.shares),
    /* Range    */ c(row.priceRange, { align: 'center' }),
    /* Final $  */ nc(row.finalPrice, { bold: true }),
    /* Proceeds */ nc(row.proceeds,  { bold: true }),
    /* Mkt Cap  */ nc(row.marketCap),
    /* LTM Rev  */ nc(row.ltmRev),
    /* EBITDA   */ nc(row.ltmEbitda),
    /* EV/Rev   */ hc(row.evRev),
    /* EV/EBITDA*/ hc(row.evEbitda),
  ];
});

slide.addTable(
  [groupHdrRow, colHdrRow, ...dataRows],
  {
    x: 0.3125,
    y: 0.8125,
    w: 9.375,
    colW: COL_W,
    // rowH: one value per row — [group-hdr, col-hdr, 6× data rows]
    rowH: [0.18, 0.18, 0.44, 0.44, 0.44, 0.44, 0.44, 0.44],
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// ── 8. Footer divider (top: 497 px → 5.177") ─────────────────────────────────
slide.addShape(prs.ShapeType.rect, {
  x: 0.3125, y: 5.177, w: 9.375, h: 0.010,
  fill: { color: FOOTER_LINE },
  line: { type: 'none' },
});

// ── 9. Footnote (top: 500 px → 5.208") ───────────────────────────────────────
slide.addText(
  [
    { text: 'Sources: ', options: { bold: true } },
    {
      text:
        'S-1 filings, company press releases, Renaissance Capital. ' +
        'LTM figures as reported at IPO. Multiples calculated at IPO equity market cap; ' +
        'may differ from EV-based multiples. PACS Group pre-IPO sponsor details not publicly confirmed.',
    },
  ],
  {
    x: 0.3125, y: 5.208, w: 8.125, h: 0.313,
    fontFace: BODY_FONT,
    fontSize: 5,
    color: GREY,
    wrap: true,
  }
);

// ── 10. Page number "1" (top: 502 px, right-aligned) ─────────────────────────
slide.addText('1', {
  x: 9.167, y: 5.229, w: 0.521, h: 0.125,
  fontFace: BODY_FONT,
  fontSize: 6,
  bold: true,
  color: ACCENT,
  align: 'right',
});

// ─── Write file ───────────────────────────────────────────────────────────────
prs
  .writeFile({ fileName: 'slide_1_v2.pptx' })
  .then(() => console.log('✓  slide_1_v2.pptx written successfully'))
  .catch((err) => { console.error('Error writing PPTX:', err); process.exit(1); });
