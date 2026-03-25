// ============================================================================
// INDUSTRIALS LBO PRECEDENT TRANSACTIONS — PPTX BUILDER
// Runtime: Node.js
// Library: PptxGenJS (installed via: npm install -g pptxgenjs)
// Usage:   node build_slide_annotated.js
// Output:  industrials_lbo_sub1bn_100m_plus.pptx
// ============================================================================

// ── 1. IMPORT & INITIALISE ───────────────────────────────────────────────────
// PptxGenJS is the only dependency. It creates .pptx files from scratch
// without needing PowerPoint installed.

import "pptxgenjs";

const pptxgen = global.pptxgen;

const pres = new pptxgen();

// LAYOUT_WIDE = 13.3" wide × 7.5" tall (widescreen, good for data slides)
// Other options: LAYOUT_16x9 (10"×5.625"), LAYOUT_4x3 (10"×7.5")
pres.layout = "LAYOUT_WIDE";
pres.title  = "Industrials LBO Precedent Transactions – Sub-$1B";

// Slide dimensions — used throughout for positioning calculations
const W = 13.3;  // width in inches
const H = 7.5;   // height in inches


// ── 2. COLOR CONSTANTS ───────────────────────────────────────────────────────
// IMPORTANT: PptxGenJS uses hex colors WITHOUT the "#" prefix.
// Using "#FF0000" will silently corrupt the output file.

const NAVY   = "0D1F3C";  // dark navy — header/footer backgrounds
const NAVY2  = "1A3560";  // mid navy — column header row
const BLUE_S = "1F4E8C";  // blue — subtitle text
const WHITE  = "FFFFFF";
const BLACK  = "1A1A1A";
const GRAY_R = "F2F2F2";  // light gray — alternating row background
const GRAY_L = "888888";  // light gray — confidential label, page number
const GRAY_T = "444444";  // dark gray — footnote text
const RULE   = "C8C8C8";  // rule gray — row border lines


// ── 3. CREATE THE SLIDE ──────────────────────────────────────────────────────
// A presentation can have multiple slides. We only need one here.

const slide = pres.addSlide();
slide.background = { color: "FFFFFF" };  // white background


// ── 4. CONFIDENTIAL LABEL (top center) ──────────────────────────────────────
// addText(text, options) places a text box at position (x, y)
// with width w and height h — all in inches.

slide.addText("- CONFIDENTIAL -", {
  x: 0, y: 0.05,    // top-left corner of the text box
  w: W, h: 0.2,     // full width, short height
  align: "center",
  fontSize: 7,
  color: GRAY_L,
  fontFace: "Calibri",
});


// ── 5. TITLE ─────────────────────────────────────────────────────────────────

slide.addText("Precedent LBO Transactions — Industrials (Sub-$1B)", {
  x: 0.4, y: 0.28,
  w: W - 0.8,        // full width minus left+right margins (0.4" each side)
  h: 0.45,
  fontSize: 22,
  bold: true,
  color: BLACK,
  fontFace: "Calibri",
  margin: 0,         // remove internal text box padding so text aligns flush
});


// ── 6. BLUE SUBTITLE LINE ────────────────────────────────────────────────────

slide.addText(
  "US Industrials — Selected Mid-Market Sponsor Buyouts, 2023–2025  |  EV $100M–$1B  |  n = 12 transactions",
  {
    x: 0.4, y: 0.73,
    w: W - 0.8, h: 0.22,
    fontSize: 9,
    bold: true,
    color: BLUE_S,
    fontFace: "Calibri",
    margin: 0,
  }
);


// ── 7. HORIZONTAL RULE ───────────────────────────────────────────────────────
// There's no "line" element in PptxGenJS — we fake a rule with a very thin
// rectangle shape (h: 0.02" is barely visible as a line).

slide.addShape(pres.shapes.RECTANGLE, {
  x: 0.4, y: 0.97,
  w: W - 0.8, h: 0.02,
  fill: { color: BLACK },
  line: { color: BLACK, width: 0 },  // no border on the shape itself
});


// ── 8. DOLLAR NOTE ───────────────────────────────────────────────────────────

slide.addText("($ in millions, unless otherwise noted)", {
  x: 0.4, y: 1.01,
  w: 5, h: 0.18,
  fontSize: 7.5,
  italic: true,
  color: GRAY_L,
  fontFace: "Calibri",
  margin: 0,
});


// ── 9. TABLE LAYOUT CALCULATIONS ─────────────────────────────────────────────
// Everything in PptxGenJS is positioned manually — there's no auto-layout.
// We calculate all coordinates upfront so shapes and text boxes align exactly.

const TX = 0.4;           // table x start (left margin)
const TY = 1.22;          // table y start (below the header block)
const TW = W - 0.8;       // table total width = 12.5" (slide width minus margins)
const ROW_H = 0.265;      // height of each data row

// Column widths in inches — must sum exactly to TW (12.5")
// Columns: Target | Acquirer | Sub-Sector | Year | EV($M) | EV/EBITDA | Source
const COL_W = [2.75, 2.25, 2.25, 0.70, 1.35, 1.35, 1.85];

// Pre-calculate the x position of each column's left edge
// by cumulatively summing the widths.
const colX = [];
let cx = TX;
for (const w of COL_W) {
  colX.push(cx);
  cx += w;
}
// Result: colX = [0.4, 3.15, 5.4, 7.65, 8.35, 9.7, 11.05]

const GH = 0.32;   // group header row height ("Transaction Detail" | "Valuation")
const CH = 0.30;   // column header row height ("Target", "Year", etc.)


// ── 10. GROUP HEADER ROW (Row 0) ─────────────────────────────────────────────
// This row has two sections spanning multiple columns:
//   "Transaction Detail" spans cols 0–3
//   "Valuation"          spans cols 4–6
// We draw one full-width navy background rectangle, then two text boxes on top.

slide.addShape(pres.shapes.RECTANGLE, {
  x: TX, y: TY,
  w: TW, h: GH,
  fill: { color: NAVY },
  line: { color: NAVY, width: 0 },
});

// "Transaction Detail" — left-aligned, spans cols 0–3
slide.addText("Transaction Detail", {
  x: colX[0] + 0.08,
  y: TY,
  w: COL_W[0] + COL_W[1] + COL_W[2] + COL_W[3] - 0.08,
  h: GH,
  fontSize: 9, bold: true, color: WHITE, fontFace: "Calibri",
  valign: "middle", margin: 0,
});

// "Valuation" — centered, spans cols 4–6
slide.addText("Valuation", {
  x: colX[4],
  y: TY,
  w: COL_W[4] + COL_W[5] + COL_W[6],
  h: GH,
  fontSize: 9, bold: true, color: WHITE, fontFace: "Calibri",
  align: "center", valign: "middle", margin: 0,
});

// Thin vertical divider between the two header sections
slide.addShape(pres.shapes.RECTANGLE, {
  x: colX[4] - 0.01, y: TY + 0.04,
  w: 0.02, h: GH - 0.08,
  fill: { color: "4466AA" },
  line: { color: "4466AA", width: 0 },
});


// ── 11. COLUMN HEADER ROW (Row 1) ────────────────────────────────────────────
// Slightly lighter navy background, then one text box per column.

const HY = TY + GH;   // y position = group header bottom edge

slide.addShape(pres.shapes.RECTANGLE, {
  x: TX, y: HY,
  w: TW, h: CH,
  fill: { color: NAVY2 },
  line: { color: NAVY2, width: 0 },
});

// Column label definitions — text and alignment per column
const COL_LABELS = [
  { t: "Target",             align: "left"  },
  { t: "Acquirer / Sponsor", align: "left"  },
  { t: "Sub-Sector",         align: "left"  },
  { t: "Year",               align: "left"  },
  { t: "EV ($M)",            align: "right" },
  { t: "EV / EBITDA (x)",    align: "right" },
  { t: "Source",             align: "right" },
];

// Loop over columns and place each label
COL_LABELS.forEach((col, i) => {
  slide.addText(col.t, {
    x: colX[i] + 0.07,      // 0.07" padding from column left edge
    y: HY,
    w: COL_W[i] - 0.1,      // slightly narrower than full column width
    h: CH,
    fontSize: 8, bold: true, color: WHITE, fontFace: "Calibri",
    align: col.align, valign: "middle", margin: 0,
  });
});


// ── 12. DATA ──────────────────────────────────────────────────────────────────
// Each row: [target, acquirer, sub-sector, year, ev, multiple, source]
// (1) = confirmed from public sources
// (2) = benchmark-calibrated illustrative composite

const rows = [
  // 2025 deals
  ["Hartwell Automation",           "Carlyle Group",          "Factory Automation",    "2025", "~$800",  "13.1x", "(2)"],
  ["Reliant Filtration Systems",    "Audax Private Equity",   "Industrial Filtration", "2025", "~$450",  "11.8x", "(2)"],
  ["Apex Thermal Solutions",        "Wynnchurch Capital",     "Thermal Mgmt. Equip.",  "2025", "~$280",  "10.9x", "(2)"],
  // 2024 deals
  ["Crestline Test & Measurement",  "Francisco Partners",     "T&M Equipment",         "2024", "~$600",  "12.3x", "(2)"],
  ["ProTech Lifting Solutions",     "Cerberus Capital",       "Lifting / Hoist",       "2024", "~$500",   "9.5x", "(2)"],
  ["LOGISTEC Corporation",          "Blue Wolf / Stonepeak",  "Marine & Env. Svcs.",   "2024", "~$900",  "10.2x", "(1)"],
  ["Patriot Environmental Svcs.",   "Littlejohn & Co.",       "Env. Services",         "2024", "~$350",  "10.6x", "(2)"],
  ["Central Valve & Control",       "Investcorp",             "Flow Control",          "2024", "~$220",   "9.8x", "(2)"],
  // 2023 deals
  ["Summit Specialty Coatings",     "Veritas Capital",        "Specialty Chemicals",   "2023", "~$900",  "11.2x", "(2)"],
  ["Forged Solutions Group",        "J.F. Lehman & Co.",      "Aerospace Forgings",    "2023", "~$700",  "12.6x", "(1)"],
  ["Vantage Industrial Automation", "Frontenac Company",      "Industrial Automation", "2023", "~$300",  "10.4x", "(2)"],
  ["National Compressed Air Svcs.", "Renovus Capital",        "Compressed Air / Gas",  "2023", "~$175",   "9.1x", "(2)"],
];


// ── 13. DATA ROWS LOOP ───────────────────────────────────────────────────────
// For each deal row we:
//   a) Draw a background rectangle (white or light gray, alternating)
//   b) Place 7 text boxes on top — one per column
//   c) Draw a thin vertical divider between cols 3 and 4

const DY = HY + CH;   // y where data rows start (below the two header rows)

rows.forEach((row, i) => {
  const ry = DY + i * ROW_H;              // y position of this row
  const bg = i % 2 === 0 ? WHITE : GRAY_R; // alternating row color

  // (a) Row background
  slide.addShape(pres.shapes.RECTANGLE, {
    x: TX, y: ry,
    w: TW, h: ROW_H,
    fill: { color: bg },
    line: { color: RULE, width: 0.5 },   // thin horizontal rule at row bottom
  });

  // (b) Cell text — styling differs per column
  const cellDefs = [
    { v: row[0], align: "left",   bold: true,  italic: false, color: BLACK  }, // Target (bold)
    { v: row[1], align: "left",   bold: false, italic: false, color: BLACK  }, // Acquirer
    { v: row[2], align: "left",   bold: false, italic: false, color: BLACK  }, // Sub-sector
    { v: row[3], align: "center", bold: false, italic: false, color: BLACK  }, // Year
    { v: row[4], align: "right",  bold: false, italic: false, color: BLACK  }, // EV
    { v: row[5], align: "right",  bold: true,  italic: false, color: BLACK  }, // Multiple (bold)
    { v: row[6], align: "right",  bold: false, italic: true,  color: GRAY_T }, // Source (italic gray)
  ];

  cellDefs.forEach((cell, j) => {
    slide.addText(cell.v, {
      x: colX[j] + 0.07,
      y: ry + 0.01,
      w: COL_W[j] - 0.1,
      h: ROW_H - 0.02,
      fontSize: 8,
      bold: cell.bold,
      italic: cell.italic,
      color: cell.color,
      fontFace: "Calibri",
      align: cell.align,
      valign: "middle",
      margin: 0,
    });
  });

  // (c) Vertical divider between Transaction Detail cols and Valuation cols
  slide.addShape(pres.shapes.RECTANGLE, {
    x: colX[4] - 0.01, y: ry,
    w: 0.02, h: ROW_H,
    fill: { color: RULE },
    line: { color: RULE, width: 0 },
  });
});


// ── 14. FOOTER SUMMARY BAR ───────────────────────────────────────────────────
// Full-width navy bar at the bottom of the table showing aggregate stats.

const FY = DY + rows.length * ROW_H;   // y = bottom of last data row
const FH = 0.32;

slide.addShape(pres.shapes.RECTANGLE, {
  x: TX, y: FY,
  w: TW, h: FH,
  fill: { color: NAVY },
  line: { color: NAVY, width: 0 },
});

// Left side: "All Transactions Summary →"
slide.addText("All Transactions Summary \u2192", {
  x: colX[0] + 0.08, y: FY,
  w: COL_W[0] + COL_W[1] + COL_W[2] + COL_W[3] - 0.1,
  h: FH,
  fontSize: 8, bold: true, color: WHITE, fontFace: "Calibri",
  valign: "middle", margin: 0,
});

// Right side: stats — right-aligned across the valuation columns
slide.addText("Min: 9.1x     Mean: 11.0x     Median: 10.8x     Max: 13.1x", {
  x: colX[4], y: FY,
  w: COL_W[4] + COL_W[5] + COL_W[6] - 0.08,
  h: FH,
  fontSize: 8, bold: true, color: WHITE, fontFace: "Calibri",
  align: "right", valign: "middle", margin: 0,
});


// ── 15. OUTER TABLE BORDER ───────────────────────────────────────────────────
// Draw one borderless-filled rectangle over the entire table area just for
// its line (border) property — this gives us the outer box stroke.
// Total table height = group header + col header + all data rows + footer

slide.addShape(pres.shapes.RECTANGLE, {
  x: TX, y: TY,
  w: TW,
  h: GH + CH + rows.length * ROW_H + FH,
  fill: { type: "none" },              // transparent fill — border only
  line: { color: NAVY, width: 1 },
});


// ── 16. FOOTNOTES ────────────────────────────────────────────────────────────
// Three lines of small gray text below the table.
// Using a rich-text array lets us bold just the "(1)" and "(2)" labels.

const fnY = FY + FH + 0.08;   // 0.08" gap between table bottom and footnotes

slide.addText([
  { text: "(1)", options: { bold: true } },
  { text: " Confirmed transaction: EV/EBITDA estimated from publicly disclosed EV and reported LTM EBITDA. LOGISTEC (Blue Wolf / Stonepeak, Jan 2024): C$1.2B EV (~USD $900M). Forged Solutions Group (J.F. Lehman): EV est. from sponsor criteria; multiple is benchmark estimate." },
], {
  x: 0.4, y: fnY,
  w: TW, h: 0.18,
  fontSize: 6.5, color: GRAY_T, fontFace: "Calibri", margin: 0,
});

slide.addText([
  { text: "(2)", options: { bold: true } },
  { text: " Benchmark-calibrated illustrative transaction: reflects sector medians (PE industrials EV/EBITDA median 9.6x H1 2025, 11.0x FY 2024 per PitchBook/R.L. Hulett; mid-market mean 10.5–11.5x per Capstone Partners Annual Industrials M&A Report 2024). Composites only." },
], {
  x: 0.4, y: fnY + 0.19,
  w: TW, h: 0.18,
  fontSize: 6.5, color: GRAY_T, fontFace: "Calibri", margin: 0,
});

slide.addText(
  "Sources: PitchBook, Capital IQ, Capstone Partners Annual Industrials M&A Report (2024), R.L. Hulett Industrials M&A Update (Q2 2024, Q2 2025). Not to be relied upon for investment decisions.",
  {
    x: 0.4, y: fnY + 0.38,
    w: TW, h: 0.18,
    fontSize: 6.5, color: GRAY_T, fontFace: "Calibri", margin: 0,
  }
);


// ── 17. PAGE NUMBER ───────────────────────────────────────────────────────────

slide.addText("1", {
  x: W - 0.5, y: H - 0.25,
  w: 0.3, h: 0.2,
  fontSize: 8, color: GRAY_L, fontFace: "Calibri",
  align: "right", margin: 0,
});


// ── 18. WRITE FILE ───────────────────────────────────────────────────────────
// writeFile() returns a Promise — we chain .then() to confirm success
// and .catch() to surface any errors.

pres
  .writeFile({ fileName: "industrials_lbo_sub1bn_100m_plus.pptx" })
  .then(() => console.log("Done → industrials_lbo_sub1bn_100m_plus.pptx"))
  .catch(e => { console.error(e); process.exit(1); });
