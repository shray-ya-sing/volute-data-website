import type { VercelRequest, VercelResponse } from '@vercel/node';
import { chromium } from 'playwright-core';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// ---------------------------------------------------------------------------
// ESM-compatible __dirname
// ---------------------------------------------------------------------------
const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

export const config = { maxDuration: 120 };

// ---------------------------------------------------------------------------
// Vendor bundles
// ---------------------------------------------------------------------------

const VENDOR_DIR = path.join(__dirname, 'vendor');

function readVendor(filename: string): string {
  const p = path.join(VENDOR_DIR, filename);
  if (!fs.existsSync(p)) throw new Error(`[parse-slide-chromium] Missing vendor: ${p}`);
  return fs.readFileSync(p, 'utf8');
}

function safeInlineScript(js: string): string {
  return js.replace(/<\/(script)/gi, '<\\/$1');
}

function escapeForTemplateLiteral(code: string): string {
  return JSON.stringify(code).slice(1, -1).replace(/`/g, '\\`').replace(/\$\{/g, '\\${');
}

const REACT_JS      = safeInlineScript(readVendor('react.umd.js'));
const REACT_DOM_JS  = safeInlineScript(readVendor('react-dom.umd.js'));
const PROP_TYPES_JS = safeInlineScript(readVendor('prop-types.umd.js'));
const RECHARTS_JS   = safeInlineScript(readVendor('recharts.umd.js'));
const BABEL_JS      = safeInlineScript(readVendor('babel.min.js'));

console.log('[parse-slide-chromium] Vendor bundles loaded');

// ---------------------------------------------------------------------------
// Input types
// ---------------------------------------------------------------------------

interface SlideInput  { code: string; slideNumber?: number; }
interface ThemeInput  {
  headingFont?: string; bodyFont?: string; accentColors?: string[];
  headingTextColor?: string; bodyTextColor?: string;
  headingFontSize?: number; bodyFontSize?: number;
}

// ---------------------------------------------------------------------------
// SlideSchema output types (mirrors PresentationModels.cs)
// ---------------------------------------------------------------------------

interface Pos  { x: number; y: number; cx: number; cy: number; }
interface Fill { type: 'solid' | 'none'; color?: string; }
interface Bdr  { type: 'solid' | 'none'; color?: string; width?: number; }

interface Run {
  text: string;
  bold?: boolean; italic?: boolean;
  fontSize?: number;   // OOXML half-points
  color?: string;      // 6-char hex
  baseline?: number;   // 30000 = superscript, -10000 = subscript
}
interface Para { alignment?: 'left' | 'ctr' | 'right'; lineSpacing?: number; runs?: Run[]; }
interface TextBody { anchor?: 't' | 'ctr' | 'b'; autofit?: boolean; paragraphs?: Para[]; }

interface Series { name: string; color: string; smooth?: boolean; markerSize?: number; markerColor?: string; points: { label: string; value: number }[]; }
interface Axis   { visible: boolean; labelColor?: string; labelFontSize?: number; gridLine?: { type: 'none' | 'solid'; color?: string }; }

interface Cell   { text: string; bold?: boolean; italic?: boolean; fontSize?: number; color?: string; fill?: Fill; alignment?: 'left' | 'ctr' | 'right'; }
interface Row    { height: number; cells?: Cell[]; }
interface Col    { width: number; }

interface Elem {
  type: 'sp' | 'chart' | 'table' | 'pic';
  id: number; name: string; position: Pos;
  fill?: Fill; border?: Bdr;
  text?: { body?: TextBody };
  // chart
  chartType?: 'lineChart' | 'barChart' | 'pieChart';
  barDir?: 'col' | 'bar';
  series?: Series[];
  axes?: { catAx?: Axis; valAx?: Axis };
  legend?: { visible: boolean; position?: string };
  dataLabels?: { visible: boolean };
  plotArea?: { fill?: Fill; border?: Bdr };
  // table
  columns?: Col[]; rows?: Row[];
}

interface SlideSchema {
  slide: { width: number; height: number; background?: { fill?: Fill }; elements?: Elem[]; };
}

// ---------------------------------------------------------------------------
// Raw extraction types  (produced inside page.evaluate)
// ---------------------------------------------------------------------------

// A single styled text run extracted by walking DOM child nodes
interface RawRun {
  text: string;
  bold: boolean; italic: boolean;
  fontSize: string;   // e.g. "12px"
  color: string;      // 6-char hex
  isSuper: boolean; isSub: boolean;
}

// A single extracted element
interface RawElem {
  pptxType: string;
  pptxId: string;
  // geometry in px, relative to root element's top-left (NO canvas clipping)
  x: number; y: number; w: number; h: number;
  // computed styles
  bgColor: string | null;
  bdrColor: string | null; bdrWidth: string; bdrStyle: string;
  textAlign: string;
  chartJson: string | null;
  // structured runs (populated for text/heading/subheading/auto-text)
  runs: RawRun[];
  // table rows (populated for data-pptx-type="table")
  tableRows: Array<{ h: number; cells: Array<{ text: string; bold: boolean; italic: boolean; fs: string; color: string; bg: string | null; align: string }> }> | null;
  tableCols: number;
}

// ---------------------------------------------------------------------------
// buildHtml  — identical transpile pipeline to pdf.ts
// Key difference: NO height/overflow clipping on html/body/#root.
// The viewport is set to 960×2400 so Tailwind min-h-screen doesn't clip.
// ---------------------------------------------------------------------------

function buildHtml(code: string, theme: ThemeInput): string {
  const {
    headingFont      = 'Inter, sans-serif',
    bodyFont         = 'Inter, sans-serif',
    accentColors     = ['#667eea', '#764ba2'],
    headingTextColor = '#000000',
    bodyTextColor    = '#333333',
    headingFontSize  = 36,
    bodyFontSize     = 14,
  } = theme;

  const esc = escapeForTemplateLiteral(code);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Slide Parse</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    /* NO height or overflow constraints — let the component render at full natural height.
       Tailwind min-h-screen will expand to fill the 2400px viewport height, so nothing clips. */
    html, body { width: 960px; background: #ffffff; }
    #root { width: 960px; position: relative; }
  </style>
</head>
<body>
  <div id="root"></div>

  <script>${REACT_JS}</script>
  <script>${REACT_DOM_JS}</script>
  <script>${PROP_TYPES_JS}</script>
  <script>${RECHARTS_JS}</script>
  <script>${BABEL_JS}</script>

  <script>
    // ── Globals verify ───────────────────────────────────────────────────────
    (function() {
      var missing = [];
      if (typeof React    === 'undefined') missing.push('React');
      if (typeof ReactDOM === 'undefined') missing.push('ReactDOM');
      if (typeof Babel    === 'undefined') missing.push('Babel');
      if (typeof Recharts === 'undefined' && typeof recharts === 'undefined') missing.push('Recharts');
      if (typeof Recharts === 'undefined' && typeof recharts !== 'undefined') window.Recharts = recharts;
      if (missing.length) {
        window.__SLIDE_ERROR__ = 'Missing globals: ' + missing.join(', ');
        document.getElementById('root').innerHTML = '<pre style="color:red">' + window.__SLIDE_ERROR__ + '</pre>';
      }
    })();

    // ── Lucide shim ──────────────────────────────────────────────────────────
    (function() {
      var cache = {};
      window.LucideReact = new Proxy({}, {
        get: function(_t, prop) {
          if (prop === '__esModule') return true;
          if (typeof prop === 'symbol') return undefined;
          if (cache[prop]) return cache[prop];
          if (typeof React !== 'undefined') {
            var Icon = React.forwardRef(function(props, ref) {
              var s = props.size || 24;
              return React.createElement('svg', { ref: ref, width: s, height: s, viewBox: '0 0 24 24',
                fill: 'none', stroke: props.color || 'currentColor',
                strokeWidth: props.strokeWidth || 2, style: props.style || {}, className: props.className || '' });
            });
            Icon.displayName = 'Lucide_' + String(prop);
            cache[prop] = Icon;
            return Icon;
          }
          return function() { return null; };
        }
      });
    })();

    // ── Require shim ─────────────────────────────────────────────────────────
    window.require = function(mod) {
      switch (mod) {
        case 'react': return window.React;
        case 'react-dom': return window.ReactDOM;
        case 'react-dom/client': return window.ReactDOM;
        case 'recharts': return window.Recharts || window.recharts || {};
        case 'lucide-react': return window.LucideReact || {};
        case 'prop-types': return window.PropTypes || {};
        default: throw new Error('[parse-slide-chromium] Unknown module: ' + mod);
      }
    };

    // ── Transpile + render ────────────────────────────────────────────────────
    (function() {
      if (window.__SLIDE_ERROR__) return;

      var rawCode = \`${esc}\`;
      var transpiledCode;
      try {
        transpiledCode = Babel.transform(rawCode, {
          presets: [
            ['react', { runtime: 'classic', pragma: 'React.createElement', pragmaFrag: 'React.Fragment' }],
            ['typescript', { allExtensions: true, isTSX: true }],
          ],
          plugins: [['transform-modules-commonjs', { strict: false }]],
          filename: 'slide.tsx',
          sourceType: 'module',
        }).code;
      } catch (err) {
        window.__SLIDE_ERROR__ = 'Babel error: ' + err.message;
        document.getElementById('root').innerHTML = '<pre style="color:red">' + window.__SLIDE_ERROR__ + '</pre>';
        return;
      }

      var mod = { exports: {} };
      try {
        var fn = new Function('require','module','exports','React','ReactDOM','Recharts','LucideReact','PropTypes', transpiledCode);
        fn(window.require, mod, mod.exports, window.React, window.ReactDOM,
           window.Recharts || window.recharts || {}, window.LucideReact || {}, window.PropTypes || {});
      } catch (err) {
        window.__SLIDE_ERROR__ = 'Runtime error: ' + err.message;
        document.getElementById('root').innerHTML = '<pre style="color:red">' + window.__SLIDE_ERROR__ + '</pre>';
        return;
      }

      var SlideComponent = mod.exports['default'] || mod.exports[Object.keys(mod.exports)[0]];
      if (!SlideComponent) {
        window.__SLIDE_ERROR__ = 'No default export found';
        return;
      }

      var themeProps = {
        headingFont: ${JSON.stringify(headingFont)},
        bodyFont: ${JSON.stringify(bodyFont)},
        accentColors: ${JSON.stringify(accentColors)},
        headingTextColor: ${JSON.stringify(headingTextColor)},
        bodyTextColor: ${JSON.stringify(bodyTextColor)},
        headingFontSize: ${headingFontSize},
        bodyFontSize: ${bodyFontSize},
      };

      try {
        var rootEl = document.getElementById('root');
        window.ReactDOM.createRoot(rootEl).render(window.React.createElement(SlideComponent, themeProps));
      } catch (err) {
        window.__SLIDE_ERROR__ = 'Render error: ' + err.message;
        document.getElementById('root').innerHTML = '<pre style="color:red">' + window.__SLIDE_ERROR__ + '</pre>';
        return;
      }

      // ── DOM Extraction ────────────────────────────────────────────────────
      // Design principles:
      //
      // 1. NO canvas clipping.  Components may be taller than 960×540 (Tailwind
      //    min-h-screen etc.).  We extract everything and let the Node.js side
      //    decide what to include.
      //
      // 2. Per-run text extraction.  We walk the DOM subtree of each text
      //    element collecting runs with their own bold/italic/color/fontSize.
      //    This preserves <sup>, <span style="color:…">, <strong>, etc.
      //
      // 3. Charts and their annotated children are BOTH captured.
      //    A chart div may contain data-pptx-type="text" children (title, CAGR
      //    annotations).  We extract both the chart element AND its children as
      //    separate elements so the server can emit them all.
      //
      // 4. Shape containers.  A data-pptx-type="shape" with annotated children
      //    is extracted as a shape, and its children are extracted separately.
      //    The server recombines them into background-shape + text elements.
      //
      // 5. Tables.  data-pptx-type="table" triggers full row/cell extraction.
      //    Grid-based "tables" (div grids used as tables) are handled by their
      //    individual data-pptx-type="text" children — each cell is its own
      //    text element.

      requestAnimationFrame(function() {
        setTimeout(function() {

          // ── Helpers ────────────────────────────────────────────────────────

          function rgbToHex(rgb) {
            if (!rgb || rgb === 'transparent' || rgb === 'rgba(0, 0, 0, 0)') return null;
            var m = rgb.match(/rgba?\\((\\d+),\\s*(\\d+),\\s*(\\d+)/);
            if (!m) return null;
            return (
              ('0' + parseInt(m[1]).toString(16)).slice(-2) +
              ('0' + parseInt(m[2]).toString(16)).slice(-2) +
              ('0' + parseInt(m[3]).toString(16)).slice(-2)
            ).toUpperCase();
          }

          // Walk the DOM subtree of el collecting styled text runs.
          // Handles: text nodes, <br>, <sup>, <sub>, <strong>, <em>, <b>, <i>,
          // <span>, <div> (when they are inline children inside a text block).
          // Does NOT descend into SVG or nested data-pptx-type children
          // (those are separate elements handled at the top level).
          function collectRuns(el) {
            var runs = [];

            function walk(node, inherited) {
              // Text node
              if (node.nodeType === 3) {
                var t = (node.textContent || '').replace(/\\s+/g, ' ');
                if (!t || t === ' ') return;
                runs.push({
                  text: t, bold: inherited.bold, italic: inherited.italic,
                  fontSize: inherited.fontSize, color: inherited.color,
                  isSuper: inherited.isSuper, isSub: inherited.isSub,
                });
                return;
              }
              if (node.nodeType !== 1) return;

              var tag = node.tagName.toLowerCase();
              if (tag === 'svg') return;  // skip SVG trees

              // Stop descent into nested annotated elements — they are separate
              if (node !== el && node.hasAttribute && node.hasAttribute('data-pptx-type')) return;

              if (tag === 'br') {
                runs.push({ text: '\\n', bold: false, italic: false,
                  fontSize: inherited.fontSize, color: inherited.color,
                  isSuper: false, isSub: false });
                return;
              }

              var cs = window.getComputedStyle(node);
              var style = {
                bold:    inherited.bold   || parseInt(cs.fontWeight) >= 600 || cs.fontWeight === 'bold',
                italic:  inherited.italic || cs.fontStyle === 'italic' || tag === 'em' || tag === 'i',
                fontSize: cs.fontSize || inherited.fontSize,
                color:   rgbToHex(cs.color) || inherited.color,
                isSuper: inherited.isSuper || tag === 'sup' || cs.verticalAlign === 'super',
                isSub:   inherited.isSub   || tag === 'sub' || cs.verticalAlign === 'sub',
              };

              // Newline between block-level siblings that don't share a parent text node
              var isBlock = cs.display === 'block' || cs.display === 'flex' ||
                            cs.display === 'grid'  || cs.display === 'table-cell';
              if (isBlock && node !== el && runs.length > 0) {
                var last = runs[runs.length - 1];
                if (last.text !== '\\n') {
                  runs.push({ text: '\\n', bold: false, italic: false,
                    fontSize: style.fontSize, color: style.color,
                    isSuper: false, isSub: false });
                }
              }

              Array.from(node.childNodes).forEach(function(c) { walk(c, style); });
            }

            var baseCs = window.getComputedStyle(el);
            var base = {
              bold:    parseInt(baseCs.fontWeight) >= 600 || baseCs.fontWeight === 'bold',
              italic:  baseCs.fontStyle === 'italic',
              fontSize: baseCs.fontSize,
              color:   rgbToHex(baseCs.color) || '000000',
              isSuper: false, isSub: false,
            };
            Array.from(el.childNodes).forEach(function(c) { walk(c, base); });
            return runs;
          }

          // Extract <table> row/cell data from a real <table> element
          function extractTableRows(tableEl) {
            var rows = [];
            var maxCols = 0;
            tableEl.querySelectorAll('tr').forEach(function(tr) {
              var cells = [];
              var h = tr.getBoundingClientRect().height;
              tr.querySelectorAll('td, th').forEach(function(td) {
                var cs = window.getComputedStyle(td);
                cells.push({
                  text:   (td.innerText || td.textContent || '').replace(/\\s+/g, ' ').trim(),
                  bold:   parseInt(cs.fontWeight) >= 600,
                  italic: cs.fontStyle === 'italic',
                  fs:     cs.fontSize,
                  color:  rgbToHex(cs.color) || 'FFFFFF',
                  bg:     rgbToHex(cs.backgroundColor),
                  align:  cs.textAlign,
                });
              });
              if (cells.length > maxCols) maxCols = cells.length;
              rows.push({ h: h, cells: cells });
            });
            return { rows: rows, cols: maxCols };
          }

          // Extract table data from a CSS grid container (div with display:grid).
          // Reads grid-template-columns to determine column count, then walks
          // direct children in DOM order, grouping them into rows of numCols each.
          // Works for Tailwind grid-cols-N and explicit inline-style grids.
          function extractGridTable(containerEl) {
            var cs = window.getComputedStyle(containerEl);
            // grid-template-columns is a space-separated list of resolved track sizes
            var templateCols = (cs.gridTemplateColumns || '').trim();
            var numCols = templateCols ? templateCols.split(/\\s+(?![^(]*\\))/).filter(Boolean).length : 0;

            var directChildren = Array.from(containerEl.children).filter(function(c) {
              var ccs = window.getComputedStyle(c);
              return ccs.display !== 'none' && ccs.visibility !== 'hidden';
            });

            // Fallback: estimate columns by counting children that share the
            // same top position as the first child (i.e. all in row 1)
            if (numCols < 1 && directChildren.length > 0) {
              var firstTop = directChildren[0].getBoundingClientRect().top;
              numCols = directChildren.filter(function(c) {
                return Math.abs(c.getBoundingClientRect().top - firstTop) < 4;
              }).length;
            }

            if (numCols < 1) numCols = 1;

            var rows = [];
            for (var i = 0; i < directChildren.length; i += numCols) {
              var rowChildren = directChildren.slice(i, i + numCols);
              if (rowChildren.length === 0) continue;

              var rowH = rowChildren.reduce(function(max, c) {
                return Math.max(max, c.getBoundingClientRect().height);
              }, 0);

              var cells = rowChildren.map(function(cell) {
                var ccs = window.getComputedStyle(cell);
                return {
                  text:   (cell.innerText || cell.textContent || '').replace(/\\s+/g, ' ').trim(),
                  bold:   parseInt(ccs.fontWeight) >= 600,
                  italic: ccs.fontStyle === 'italic',
                  fs:     ccs.fontSize,
                  color:  rgbToHex(ccs.color) || 'FFFFFF',
                  bg:     rgbToHex(ccs.backgroundColor),
                  align:  ccs.textAlign,
                };
              });

              rows.push({ h: rowH, cells: cells });
            }

            return { rows: rows, cols: numCols };
          }

          // Get position relative to the root element (not viewport)
          var rootEl = document.getElementById('root');
          var rootRect = rootEl.getBoundingClientRect();

          function extractEl(el, pptxType) {
            var r   = el.getBoundingClientRect();
            var cs  = window.getComputedStyle(el);
            var x   = r.left - rootRect.left;
            var y   = r.top  - rootRect.top;

            if (r.width < 1 || r.height < 1) return null;
            // Only skip elements with truly negative positions (scrolled off above)
            if (y + r.height < 0 || x + r.width < 0) return null;

            var result = {
              pptxType:  pptxType,
              pptxId:    el.getAttribute('data-pptx-id') || '',
              x: x, y: y, w: r.width, h: r.height,
              bgColor:   rgbToHex(cs.backgroundColor),
              bdrColor:  rgbToHex(cs.borderColor),
              bdrWidth:  cs.borderWidth,
              bdrStyle:  cs.borderStyle,
              textAlign: cs.textAlign,
              chartJson: el.getAttribute('data-chart-json'),
              runs:      [],
              tableRows: null,
              tableCols: 0,
            };

            // Collect runs for text-type elements (not for pure shape/chart backgrounds)
            if (pptxType !== 'shape') {
              result.runs = collectRuns(el);
            }

            // Full row/cell extraction for data-pptx-type="table" elements.
            // Supports both real <table> tags and CSS grid containers.
            if (pptxType === 'table') {
              var nativeTable = el.tagName.toLowerCase() === 'table' ? el : el.querySelector('table');
              if (nativeTable) {
                // Real <table> — use tr/td/th extraction
                var td = extractTableRows(nativeTable);
                result.tableRows = td.rows;
                result.tableCols = td.cols;
              } else {
                // No <table> found — check if this container is a CSS grid
                var ecs = window.getComputedStyle(el);
                var isGrid = ecs.display === 'grid' || ecs.display === 'inline-grid';
                // Also check for a direct child grid wrapper (common pattern:
                // outer div → inner div with display:grid containing cells)
                if (!isGrid) {
                  var gridChild = Array.from(el.children).find(function(c) {
                    var ccs = window.getComputedStyle(c);
                    return ccs.display === 'grid' || ccs.display === 'inline-grid';
                  });
                  if (gridChild) {
                    var gd = extractGridTable(gridChild);
                    result.tableRows = gd.rows;
                    result.tableCols = gd.cols;
                  }
                } else {
                  var gd2 = extractGridTable(el);
                  result.tableRows = gd2.rows;
                  result.tableCols = gd2.cols;
                }
              }
            }

            return result;
          }

          // ── Main extraction pass ─────────────────────────────────────────
          // We visit ALL elements with data-pptx-type, regardless of nesting.
          // This means chart containers AND their text children are both captured.
          // The server-side mapper emits them as separate PPTX elements.
          var elements = [];
          var seen = new Set();

          var annotated = document.querySelectorAll('[data-pptx-type]');
          annotated.forEach(function(el) {
            if (seen.has(el)) return;
            seen.add(el);
            var type = el.getAttribute('data-pptx-type');
            var extracted = extractEl(el, type);
            if (extracted) elements.push(extracted);
          });

          // ── Fallback pass (no annotations at all) ────────────────────────
          // If fewer than 3 annotated elements, assume the slide has no
          // annotations and fall back to extracting all leaf text nodes.
          if (elements.length < 3) {
            var leafSel = '#root div, #root span, #root p, #root h1, #root h2, #root h3, #root h4, #root h5, #root h6, #root td, #root th';
            document.querySelectorAll(leafSel).forEach(function(el) {
              if (seen.has(el)) return;
              // Only leaves with text
              var hasElKids = Array.from(el.children).some(function(c) {
                return c.tagName !== 'SVG' && c.tagName !== 'svg';
              });
              if (hasElKids) return;
              var t = (el.textContent || '').trim();
              if (!t) return;
              var cs = window.getComputedStyle(el);
              if (cs.display === 'none' || cs.visibility === 'hidden' || cs.opacity === '0') return;
              var extracted = extractEl(el, 'auto-text');
              if (extracted) { elements.push(extracted); seen.add(el); }
            });
          }

          window.__SLIDE_ELEMENTS__ = elements;
          window.__SLIDE_READY__    = true;

          console.log('[slide] DOM extraction complete: ' + elements.length + ' elements extracted');

        }, 1500);
      });
    })();
  </script>
</body>
</html>`;
}

// ---------------------------------------------------------------------------
// Unit helpers
// ---------------------------------------------------------------------------

const PX_TO_EMU = 9525;
const pxToEMU   = (px: number) => Math.round(px * PX_TO_EMU);
const parsePx   = (v: string)  => { const n = parseFloat(v); return isNaN(n) ? 0 : n; };
const pxToHp    = (px: number) => Math.round((px / 0.75) * 100);  // px → OOXML half-points

function normalizeHex(c: string | null | undefined): string | undefined {
  if (!c) return undefined;
  const h = c.replace('#', '').toUpperCase();
  if (h.length === 6) return h;
  if (h.length === 3) return h.split('').map(x => x + x).join('');
  return undefined;
}

const toFill   = (c: string | null | undefined): Fill => {
  const h = normalizeHex(c); return h ? { type: 'solid', color: h } : { type: 'none' };
};
const toBorder = (c: string | null | undefined, w: string, s: string): Bdr => {
  const h = normalizeHex(c); const px = parsePx(w);
  return (h && px > 0 && s !== 'none') ? { type: 'solid', color: h, width: pxToEMU(px) } : { type: 'none' };
};
const toAlign  = (a: string): 'left' | 'ctr' | 'right' =>
  a === 'center' ? 'ctr' : a === 'right' ? 'right' : 'left';

// ---------------------------------------------------------------------------
// buildParagraphs  — convert raw runs (with \n sentinels) into Para[]
// ---------------------------------------------------------------------------

function buildParagraphs(rawRuns: RawElem['runs'], defaultAlign: 'left' | 'ctr' | 'right'): Para[] {
  if (!rawRuns || rawRuns.length === 0) return [];

  // Split into lines on \n sentinel runs
  const lines: typeof rawRuns[number][][] = [[]];
  for (const r of rawRuns) {
    if (r.text === '\n') { lines.push([]); }
    else                 { lines[lines.length - 1].push(r); }
  }

  return lines
    .filter(l => l.length > 0 && l.some(r => r.text.trim()))
    .map(line => ({
      alignment:   defaultAlign,
      lineSpacing: 0,
      runs: line.map(r => {
        const run: Run = {
          text:     r.text,
          bold:     r.bold   || undefined,
          italic:   r.italic || undefined,
          fontSize: pxToHp(parsePx(r.fontSize) || 12),
          color:    normalizeHex(r.color) ?? '000000',
        };
        if (r.isSuper) run.baseline = 30000;
        if (r.isSub)   run.baseline = -10000;
        return run;
      }),
    }));
}

// ---------------------------------------------------------------------------
// mapElementsToSchema
// ---------------------------------------------------------------------------

function mapElementsToSchema(rawElements: RawElem[], slideBg: string | null): SlideSchema {
  const out: Elem[] = [];
  let id = 2;

  const background = slideBg ? { fill: toFill(slideBg) } : undefined;

  for (const raw of rawElements) {
    const pos: Pos = {
      x: pxToEMU(raw.x), y: pxToEMU(raw.y),
      cx: pxToEMU(raw.w), cy: pxToEMU(raw.h),
    };
    const eid  = id++;
    const name = raw.pptxId || `${raw.pptxType}-${eid}`;

    // ── Chart ─────────────────────────────────────────────────────────────
    if (raw.pptxType === 'chart') {
      if (!raw.chartJson) {
        // Chart container without data-chart-json → emit as coloured shape
        const fill = toFill(raw.bgColor);
        if (fill.type !== 'none') {
          out.push({ type: 'sp', id: eid, name, position: pos, fill, border: { type: 'none' } });
        }
        continue;
      }

      let cd: any;
      try { cd = JSON.parse(raw.chartJson); }
      catch { console.warn(`[parse-slide-chromium] Bad chartJson on "${name}"`); continue; }

      const elem: Elem = {
        type: 'chart', id: eid, name, position: pos,
        chartType: cd.chartType ?? 'lineChart',
        barDir:    cd.barDir    ?? 'col',
        series: (cd.series ?? []).map((s: any) => ({
          name:        s.name        ?? '',
          color:       normalizeHex(s.color)      ?? '000000',
          smooth:      s.smooth      ?? false,
          markerSize:  s.markerSize  ?? 5,
          markerColor: normalizeHex(s.markerColor ?? s.color) ?? '000000',
          points: (s.points ?? []).map((p: any) => ({ label: String(p.label ?? ''), value: Number(p.value ?? 0) })),
        })),
        axes: {
          catAx: {
            visible:       true,
            labelColor:    normalizeHex(cd.axes?.catAx?.labelColor) ?? 'FFFFFF',
            labelFontSize: cd.axes?.catAx?.labelFontSize ?? 800,
            gridLine:      { type: 'none' },
          },
          valAx: {
            visible:       true,
            labelColor:    normalizeHex(cd.axes?.valAx?.labelColor) ?? 'FFFFFF',
            labelFontSize: cd.axes?.valAx?.labelFontSize ?? 800,
            gridLine:      { type: 'none' },
          },
        },
        legend:     cd.legend     ?? { visible: false },
        dataLabels: cd.dataLabels ?? { visible: false },
      };

      if (raw.bgColor) {
        elem.plotArea = { fill: toFill(raw.bgColor), border: { type: 'none' } };
      }

      out.push(elem);
      continue;
    }

    // ── Table (annotated element — real <table> or CSS grid) ──────────────
    if (raw.pptxType === 'table' && raw.tableRows && raw.tableRows.length > 0) {
      const numCols  = raw.tableCols > 0 ? raw.tableCols : 1;
      const colW     = Math.round(pxToEMU(raw.w) / numCols);

      out.push({
        type: 'table', id: eid, name, position: pos,
        fill: { type: 'none' }, border: { type: 'none' },
        columns: Array.from({ length: numCols }, () => ({ width: colW })),
        rows: raw.tableRows.map(tr => ({
          height: pxToEMU(tr.h),
          cells: tr.cells.map(tc => ({
            text:      tc.text,
            bold:      tc.bold   || undefined,
            italic:    tc.italic || undefined,
            fontSize:  pxToHp(parsePx(tc.fs) || 12),
            color:     normalizeHex(tc.color) ?? 'FFFFFF',
            fill:      toFill(tc.bg),
            alignment: toAlign(tc.align),
          })),
        })),
      });
      continue;
    }

    // ── Shape (background container, no direct text) ───────────────────────
    if (raw.pptxType === 'shape') {
      const fill   = toFill(raw.bgColor);
      const border = toBorder(raw.bdrColor, raw.bdrWidth, raw.bdrStyle);
      // Only emit if it has a visible fill or border
      if (fill.type === 'none' && border.type === 'none') continue;
      out.push({ type: 'sp', id: eid, name, position: pos, fill, border });
      continue;
    }

    // ── Text / heading / subheading / auto-text / divider ──────────────────
    {
      const fill     = toFill(raw.bgColor);
      const border   = toBorder(raw.bdrColor, raw.bdrWidth, raw.bdrStyle);
      const align    = toAlign(raw.textAlign);
      const paragraphs = buildParagraphs(raw.runs, align);

      const hasVisual = fill.type === 'solid' || border.type === 'solid' || paragraphs.length > 0;
      if (!hasVisual) continue;

      const elem: Elem = { type: 'sp', id: eid, name, position: pos, fill, border };

      if (paragraphs.length > 0) {
        elem.text = { body: { anchor: 't', autofit: false, paragraphs } };
      }

      out.push(elem);
    }
  }

  return {
    slide: { width: 9144000, height: 5143500, background, elements: out },
  };
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST')    return res.status(405).json({ error: 'Method not allowed' });

  const { slides, theme = {} as ThemeInput } = req.body;

  if (!slides) return res.status(400).json({ error: '`slides` is required.' });

  const slideArray: SlideInput[] = (Array.isArray(slides) ? slides : [slides])
    .sort((a, b) => (a.slideNumber ?? 0) - (b.slideNumber ?? 0));

  if (slideArray.some(s => !s.code)) {
    return res.status(400).json({ error: 'Every slide must have a `code` field.' });
  }

  console.log(`[parse-slide-chromium] Parsing ${slideArray.length} slide(s)...`);

  let browser = null;

  try {
    let executablePath: string | undefined;
    let launchArgs = ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu', '--font-render-hinting=none'];

    const isVercel = process.env.VERCEL === '1' || !!process.env.AWS_LAMBDA_FUNCTION_NAME;

    if (isVercel) {
      try {
        const chromiumPkg = await import('@sparticuz/chromium');
        executablePath = await chromiumPkg.default.executablePath();
        launchArgs = [...chromiumPkg.default.args, '--disable-gpu', '--font-render-hinting=none', '--no-sandbox', '--disable-dev-shm-usage'];
        console.log(`[parse-slide-chromium] @sparticuz/chromium: ${executablePath}`);
      } catch (err) {
        throw new Error(`@sparticuz/chromium required on Vercel: ${err}`);
      }
    }

    browser = await chromium.launch({ executablePath, args: launchArgs, headless: true });

    // Viewport height set to 2400 so Tailwind min-h-screen doesn't truncate content
    const context = await browser.newContext({ viewport: { width: 960, height: 2400 }, deviceScaleFactor: 1 });

    const results: Array<{ slideNumber: number; slideJson: SlideSchema }> = [];

    for (let i = 0; i < slideArray.length; i++) {
      const slide      = slideArray[i];
      const slideLabel = slide.slideNumber ?? i + 1;
      const t0         = Date.now();

      console.log(`[parse-slide-chromium] Rendering slide ${slideLabel}...`);

      const html = buildHtml(slide.code, theme);
      const page = await context.newPage();

      page.on('console', msg => console.log(`[slide ${slideLabel}] ${msg.type()}: ${msg.text()}`));
      page.on('pageerror', err => console.error(`[slide ${slideLabel} ERR]`, err.message));

      await page.setContent(html, { waitUntil: 'domcontentloaded', timeout: 30000 });

      await page.waitForFunction(
        'window.__SLIDE_READY__ === true || typeof window.__SLIDE_ERROR__ === "string"',
        { timeout: 30000 },
      );

      const renderError = await page.evaluate(() => (window as any).__SLIDE_ERROR__);
      if (renderError) {
        await page.close();
        throw new Error(`Slide ${slideLabel} render error: ${renderError}`);
      }

      const { rawElements, rootBg } = await page.evaluate(() => ({
        rawElements: (window as any).__SLIDE_ELEMENTS__ as RawElem[],
        rootBg:      window.getComputedStyle(document.getElementById('root')!).backgroundColor,
      }));

      await page.close();

      console.log(`[parse-slide-chromium] Slide ${slideLabel}: ${rawElements.length} elements in ${Date.now() - t0}ms`);

      results.push({
        slideNumber: slideLabel,
        slideJson:   mapElementsToSchema(rawElements, rootBg),
      });
    }

    await browser.close();
    browser = null;

    if (results.length === 1) {
      return res.status(200).json({ slideNumber: results[0].slideNumber, slideJson: results[0].slideJson });
    }
    return res.status(200).json({ slides: results });

  } catch (error: any) {
    console.error('[parse-slide-chromium] Error:', error.message);
    if (browser) try { await browser.close(); } catch { /**/ }
    return res.status(500).json({ error: error.message, details: error.stack });
  }
}