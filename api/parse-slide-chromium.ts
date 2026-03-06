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

export const config = {
  maxDuration: 120,
};

// ---------------------------------------------------------------------------
// Vendor bundles — identical pattern to pdf.ts
// ---------------------------------------------------------------------------

const VENDOR_DIR = path.join(__dirname, 'vendor');

function readVendor(filename: string): string {
  const filePath = path.join(VENDOR_DIR, filename);
  if (!fs.existsSync(filePath)) {
    throw new Error(
      `[parse-slide-chromium] Missing vendor file: ${filePath}\n` +
      `Run: curl -o api/vendor/${filename} <url>`
    );
  }
  return fs.readFileSync(filePath, 'utf8');
}

function safeInlineScript(js: string): string {
  return js.replace(/<\/(script)/gi, '<\\/$1');
}

function escapeForTemplateLiteral(code: string): string {
  const jsonStr = JSON.stringify(code);
  return jsonStr
    .slice(1, -1)
    .replace(/`/g, '\\`')
    .replace(/\$\{/g, '\\${');
}

const REACT_JS      = safeInlineScript(readVendor('react.umd.js'));
const REACT_DOM_JS  = safeInlineScript(readVendor('react-dom.umd.js'));
const PROP_TYPES_JS = safeInlineScript(readVendor('prop-types.umd.js'));
const RECHARTS_JS   = safeInlineScript(readVendor('recharts.umd.js'));
const BABEL_JS      = safeInlineScript(readVendor('babel.min.js'));

console.log('[parse-slide-chromium] Vendor bundles loaded:', {
  react:     `${(REACT_JS.length     / 1024).toFixed(0)} KB`,
  reactDom:  `${(REACT_DOM_JS.length / 1024).toFixed(0)} KB`,
  propTypes: `${(PROP_TYPES_JS.length / 1024).toFixed(0)} KB`,
  recharts:  `${(RECHARTS_JS.length  / 1024).toFixed(0)} KB`,
  babel:     `${(BABEL_JS.length     / 1024).toFixed(0)} KB`,
});

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
}

// ---------------------------------------------------------------------------
// SlideSchema types — mirrors PresentationModels.cs / types.ts
// ---------------------------------------------------------------------------

interface PositionDefinition {
  x: number;   // EMU
  y: number;   // EMU
  cx: number;  // EMU
  cy: number;  // EMU
}

interface FillDefinition {
  type: 'solid' | 'none';
  color?: string; // 6-char hex, no #
}

interface BorderDefinition {
  type: 'solid' | 'none';
  color?: string;
  width?: number; // EMU
}

interface RunDefinition {
  text: string;
  bold?: boolean;
  italic?: boolean;
  fontSize?: number;  // half-points
  color?: string;     // 6-char hex, no #
  baseline?: number;  // 30000 = superscript
}

interface ParagraphDefinition {
  alignment?: 'left' | 'ctr' | 'right';
  lineSpacing?: number;
  runs?: RunDefinition[];
}

interface TextDefinition {
  body?: {
    anchor?: 't' | 'ctr' | 'b';
    autofit?: boolean;
    paragraphs?: ParagraphDefinition[];
  };
}

interface DataPoint {
  label: string;
  value: number;
}

interface SeriesDefinition {
  name: string;
  color: string;
  smooth?: boolean;
  markerSize?: number;
  markerColor?: string;
  points: DataPoint[];
}

interface AxisDefinition {
  visible: boolean;
  labelColor?: string;
  labelFontSize?: number;
  min?: number;
  max?: number;
  gridLine?: { type: 'none' | 'solid'; color?: string };
}

interface ElementDefinition {
  type: 'sp' | 'cxnSp' | 'chart' | 'table' | 'pic';
  id: number;
  name: string;
  position: PositionDefinition;
  fill?: FillDefinition;
  border?: BorderDefinition;
  text?: TextDefinition;
  // chart fields
  chartType?: 'lineChart' | 'barChart' | 'pieChart';
  barDir?: 'col' | 'bar';
  series?: SeriesDefinition[];
  axes?: {
    catAx?: AxisDefinition;
    valAx?: AxisDefinition;
  };
  legend?: { visible: boolean; position?: string };
  dataLabels?: { visible: boolean };
  plotArea?: { fill?: FillDefinition };
}

interface SlideSchema {
  slide: {
    width: number;
    height: number;
    background?: { fill?: FillDefinition };
    elements?: ElementDefinition[];
  };
}

// ---------------------------------------------------------------------------
// DOM extraction types — what page.evaluate() returns
// ---------------------------------------------------------------------------

interface RawElement {
  // Identity
  pptxType: string;       // data-pptx-type attribute
  pptxId: string;         // data-pptx-id attribute

  // Geometry (px, relative to 960×540 canvas)
  x: number;
  y: number;
  width: number;
  height: number;

  // Computed styles
  backgroundColor: string;
  borderColor: string;
  borderWidth: string;
  borderStyle: string;
  color: string;
  fontSize: string;
  fontWeight: string;
  fontStyle: string;
  textAlign: string;
  verticalAlign: string;
  opacity: string;

  // Text content (for text/shape elements)
  textContent: string;
  innerText: string;

  // Chart data (serialised JSON on data-chart-json attribute)
  chartJson: string | null;

  // Tag name for fallback logic
  tagName: string;
}

// ---------------------------------------------------------------------------
// buildHtml
// Identical transpile / render pipeline to pdf.ts.
// Adds a post-render DOM extraction step that fires before __SLIDE_READY__,
// storing element data in window.__SLIDE_ELEMENTS__.
//
// The slide generator adds data-pptx-type / data-pptx-id attributes to key
// elements. For charts, it also adds data-chart-json with series data.
// Elements without data-pptx-type are extracted too (as 'auto') so nothing
// is silently lost.
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

  const escapedCode = escapeForTemplateLiteral(code);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Slide Parse</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html, body { width: 960px; height: 540px; overflow: hidden; background: #ffffff; }
    #root { width: 960px; height: 540px; overflow: hidden; position: relative; }
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
    // ── Globals check ────────────────────────────────────────────────────────
    console.log('[slide] Globals check:', {
      React:    typeof React     !== 'undefined' ? 'ok' : 'MISSING',
      ReactDOM: typeof ReactDOM  !== 'undefined' ? 'ok' : 'MISSING',
      Recharts: typeof Recharts  !== 'undefined' || typeof recharts !== 'undefined' ? 'ok' : 'MISSING',
      Babel:    typeof Babel     !== 'undefined' ? 'ok' : 'MISSING',
    });

    (function verifyGlobals() {
      var missing = [];
      if (typeof React    === 'undefined') missing.push('React');
      if (typeof ReactDOM === 'undefined') missing.push('ReactDOM');
      if (typeof Babel    === 'undefined') missing.push('Babel');
      if (typeof Recharts === 'undefined' && typeof recharts === 'undefined') missing.push('Recharts');

      if (typeof Recharts === 'undefined' && typeof recharts !== 'undefined') {
        window.Recharts = recharts;
      }

      if (missing.length) {
        var msg = 'Missing UMD globals: ' + missing.join(', ');
        document.getElementById('root').innerHTML =
          '<pre style="color:red;padding:16px;font-size:11px;">' + msg + '</pre>';
        window.__SLIDE_ERROR__ = msg;
      }
    })();

    // ── Lucide-react shim ────────────────────────────────────────────────────
    (function() {
      var cache = {};
      window.LucideReact = new Proxy({}, {
        get: function(_target, prop) {
          if (prop === '__esModule') return true;
          if (typeof prop === 'symbol') return undefined;
          if (cache[prop]) return cache[prop];
          if (typeof React !== 'undefined') {
            var Icon = React.forwardRef(function(props, ref) {
              var s = props.size || 24;
              return React.createElement('svg', {
                ref: ref, width: s, height: s, viewBox: '0 0 24 24',
                fill: 'none', stroke: props.color || 'currentColor',
                strokeWidth: props.strokeWidth || 2,
                style: props.style || {}, className: props.className || ''
              });
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
        case 'react':            return window.React;
        case 'react-dom':        return window.ReactDOM;
        case 'react-dom/client': return window.ReactDOM;
        case 'recharts':         return window.Recharts || window.recharts || {};
        case 'lucide-react':     return window.LucideReact || window.lucideReact || {};
        case 'prop-types':       return window.PropTypes || {};
        default: break;
      }
      throw new Error('[parse-slide-chromium] Unknown module: ' + mod);
    };

    // ── Transpile + execute slide code ────────────────────────────────────────
    (function() {
      if (window.__SLIDE_ERROR__) return;

      var rawCode = \`${escapedCode}\`;

      var transpiledCode;
      try {
        transpiledCode = Babel.transform(rawCode, {
          presets: [
            ['react', {
              runtime: 'classic',
              pragma: 'React.createElement',
              pragmaFrag: 'React.Fragment',
            }],
            ['typescript', { allExtensions: true, isTSX: true }],
          ],
          plugins: [['transform-modules-commonjs', { strict: false }]],
          filename: 'slide.tsx',
          sourceType: 'module',
        }).code;
      } catch (err) {
        document.getElementById('root').innerHTML =
          '<pre style="color:red;padding:16px;font-size:11px;">Babel error:\\n' + err.message + '</pre>';
        window.__SLIDE_ERROR__ = 'Babel error: ' + err.message;
        return;
      }

      var moduleObj = { exports: {} };
      try {
        var fn = new Function(
          'require', 'module', 'exports',
          'React', 'ReactDOM', 'Recharts', 'LucideReact', 'PropTypes',
          transpiledCode
        );
        fn(
          window.require,
          moduleObj,
          moduleObj.exports,
          window.React,
          window.ReactDOM,
          window.Recharts  || window.recharts || {},
          window.LucideReact || window.lucideReact || {},
          window.PropTypes || {}
        );
      } catch (err) {
        document.getElementById('root').innerHTML =
          '<pre style="color:red;padding:16px;font-size:11px;">Runtime error:\\n' + err.message + '</pre>';
        window.__SLIDE_ERROR__ = 'Runtime error: ' + err.message;
        return;
      }

      var SlideComponent =
        moduleObj.exports['default'] ||
        moduleObj.exports[Object.keys(moduleObj.exports)[0]];

      if (!SlideComponent) {
        var msg = 'No default export found in slide component';
        document.getElementById('root').innerHTML =
          '<pre style="color:red;padding:16px;font-size:11px;">' + msg + '</pre>';
        window.__SLIDE_ERROR__ = msg;
        return;
      }

      var themeProps = {
        headingFont:      ${JSON.stringify(headingFont)},
        bodyFont:         ${JSON.stringify(bodyFont)},
        accentColors:     ${JSON.stringify(accentColors)},
        headingTextColor: ${JSON.stringify(headingTextColor)},
        bodyTextColor:    ${JSON.stringify(bodyTextColor)},
        headingFontSize:  ${headingFontSize},
        bodyFontSize:     ${bodyFontSize},
      };

      try {
        var rootEl = document.getElementById('root');
        var root = window.ReactDOM.createRoot(rootEl);
        root.render(window.React.createElement(SlideComponent, themeProps));
      } catch (err) {
        document.getElementById('root').innerHTML =
          '<pre style="color:red;padding:16px;font-size:11px;">Render error:\\n' + err.message + '</pre>';
        window.__SLIDE_ERROR__ = 'Render error: ' + err.message;
        return;
      }

      // ── DOM extraction ──────────────────────────────────────────────────────
      // Runs after React has painted. Extracts every element with a
      // data-pptx-type attribute, plus all leaf elements with visible content
      // as a fallback (type: 'auto') so nothing is silently dropped.
      //
      // For charts, the slide generator is expected to place a
      // data-chart-json attribute on the chart container with the series data.
      // See generate-slide.ts system prompt for the required annotation format.
      requestAnimationFrame(function() {
        setTimeout(function() {
          var canvasEl = document.getElementById('root');
          var canvasRect = canvasEl.getBoundingClientRect();

          var elements = [];
          var idCounter = 1;

          // Helper: parse computed RGB/RGBA → 6-char hex or null
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

          // Helper: extract a single element's data
          function extractEl(el, pptxType) {
            var rect = el.getBoundingClientRect();
            var cs   = window.getComputedStyle(el);

            // Skip elements outside the canvas or with zero area
            var relX = rect.left - canvasRect.left;
            var relY = rect.top  - canvasRect.top;
            if (rect.width < 1 || rect.height < 1) return null;
            if (relX + rect.width  < 0) return null;
            if (relY + rect.height < 0) return null;
            if (relX > 960 || relY > 540) return null;

            return {
              pptxType:        pptxType,
              pptxId:          el.getAttribute('data-pptx-id') || String(idCounter++),
              x:               relX,
              y:               relY,
              width:           rect.width,
              height:          rect.height,
              backgroundColor: rgbToHex(cs.backgroundColor),
              borderColor:     rgbToHex(cs.borderColor),
              borderWidth:     cs.borderWidth,
              borderStyle:     cs.borderStyle,
              color:           rgbToHex(cs.color) || '000000',
              fontSize:        cs.fontSize,
              fontWeight:      cs.fontWeight,
              fontStyle:       cs.fontStyle,
              textAlign:       cs.textAlign,
              verticalAlign:   cs.verticalAlign,
              opacity:         cs.opacity,
              textContent:     (el.textContent || '').trim(),
              innerText:       (el.innerText    || '').trim(),
              chartJson:       el.getAttribute('data-chart-json'),
              tagName:         el.tagName.toLowerCase(),
            };
          }

          // ── Pass 1: extract all annotated elements (data-pptx-type) ────────
          var annotated = document.querySelectorAll('[data-pptx-type]');
          var annotatedSet = new Set();

          annotated.forEach(function(el) {
            var type = el.getAttribute('data-pptx-type');
            var extracted = extractEl(el, type);
            if (extracted) {
              elements.push(extracted);
              annotatedSet.add(el);
            }
          });

          // ── Pass 2: fallback — leaf text nodes not inside annotated elements
          // Catches slides generated before annotation was added to the prompt.
          var allEls = document.querySelectorAll(
            '#root div, #root span, #root p, #root h1, #root h2, #root h3, #root h4, #root h5, #root h6, #root td, #root th'
          );

          allEls.forEach(function(el) {
            // Skip if already captured or is ancestor/descendant of annotated
            var isAnnotated = annotatedSet.has(el);
            var insideAnnotated = false;
            annotatedSet.forEach(function(a) {
              if (a.contains(el) || el.contains(a)) insideAnnotated = true;
            });
            if (isAnnotated || insideAnnotated) return;

            // Only extract leaf nodes (no element children) with non-empty text
            var hasElementChildren = Array.from(el.children).some(function(c) {
              return c.tagName !== 'SVG' && c.tagName !== 'svg';
            });
            if (hasElementChildren) return;

            var text = (el.textContent || '').trim();
            if (!text) return;

            var cs = window.getComputedStyle(el);
            // Skip invisible elements
            if (cs.display === 'none' || cs.visibility === 'hidden' || cs.opacity === '0') return;

            var extracted = extractEl(el, 'auto-text');
            if (extracted) elements.push(extracted);
          });

          window.__SLIDE_ELEMENTS__ = elements;
          window.__SLIDE_READY__    = true;

          console.log('[slide] DOM extraction complete: ' + elements.length + ' elements');
        }, 1500); // same delay as pdf.ts
      });
    })();
  </script>
</body>
</html>`;
}

// ---------------------------------------------------------------------------
// EMU conversion
// ---------------------------------------------------------------------------

const PX_TO_EMU = 9525;

function pxToEMU(px: number): number {
  return Math.round(px * PX_TO_EMU);
}

// ---------------------------------------------------------------------------
// Style helpers
// ---------------------------------------------------------------------------

/**
 * Parse "16px" → 16. Returns 0 on failure.
 */
function parsePx(value: string): number {
  const n = parseFloat(value);
  return isNaN(n) ? 0 : n;
}

/**
 * Convert px font size → half-points for OOXML.
 * Formula: (px / 0.75) * 100
 */
function pxToHalfPoints(px: number): number {
  return Math.round((px / 0.75) * 100);
}

/**
 * Normalise a color value that may already be a 6-char hex (from the browser
 * extraction) or may need stripping of the # prefix.
 */
function normalizeColor(color: string | null | undefined): string | undefined {
  if (!color) return undefined;
  return color.replace('#', '').toUpperCase().slice(0, 6) || undefined;
}

function parseFill(color: string | null | undefined): FillDefinition {
  const c = normalizeColor(color);
  return c ? { type: 'solid', color: c } : { type: 'none' };
}

function parseBorder(
  color: string | null | undefined,
  widthStr: string,
  style: string,
): BorderDefinition {
  const c   = normalizeColor(color);
  const w   = parsePx(widthStr);
  const hasB = c && w > 0 && style !== 'none';
  return hasB
    ? { type: 'solid', color: c, width: pxToEMU(w) }
    : { type: 'none' };
}

function parseTextAlign(align: string): 'left' | 'ctr' | 'right' {
  if (align === 'center') return 'ctr';
  if (align === 'right')  return 'right';
  return 'left';
}

// ---------------------------------------------------------------------------
// mapElementsToSchema
// Converts the raw DOM data into SlideSchema ElementDefinition[]
// ---------------------------------------------------------------------------

function mapElementsToSchema(
  rawElements: RawElement[],
  slideBackground: string | null | undefined,
): SlideSchema {
  const elements: ElementDefinition[] = [];
  let idCounter = 2; // id 1 is reserved for background by convention

  // ── Background ─────────────────────────────────────────────────────────────
  const background = slideBackground
    ? { fill: parseFill(slideBackground) }
    : undefined;

  rawElements.forEach((raw) => {
    const position: PositionDefinition = {
      x:  pxToEMU(raw.x),
      y:  pxToEMU(raw.y),
      cx: pxToEMU(raw.width),
      cy: pxToEMU(raw.height),
    };

    const id = idCounter++;

    // ── Chart element ─────────────────────────────────────────────────────────
    if (raw.pptxType === 'chart' && raw.chartJson) {
      let chartData: any;
      try {
        chartData = JSON.parse(raw.chartJson);
      } catch {
        console.warn(`[parse-slide-chromium] Failed to parse chart JSON for element ${id}`);
      }

      if (chartData) {
        const el: ElementDefinition = {
          type: 'chart',
          id,
          name: `chart-${id}`,
          position,
          chartType: chartData.chartType ?? 'lineChart',
          barDir: chartData.barDir ?? 'col',
          series: (chartData.series ?? []).map((s: any) => ({
            name:        s.name       ?? '',
            color:       normalizeColor(s.color) ?? '000000',
            smooth:      s.smooth     ?? false,
            markerSize:  s.markerSize ?? 5,
            markerColor: normalizeColor(s.markerColor) ?? normalizeColor(s.color) ?? '000000',
            points:      (s.points ?? []).map((p: any) => ({
              label: String(p.label ?? ''),
              value: Number(p.value ?? 0),
            })),
          })),
          axes: {
            catAx: {
              visible:       true,
              labelColor:    normalizeColor(chartData.axes?.catAx?.labelColor) ?? 'FFFFFF',
              labelFontSize: chartData.axes?.catAx?.labelFontSize ?? 800,
              gridLine:      { type: 'none' },
            },
            valAx: {
              visible:       true,
              labelColor:    normalizeColor(chartData.axes?.valAx?.labelColor) ?? 'FFFFFF',
              labelFontSize: chartData.axes?.valAx?.labelFontSize ?? 800,
              gridLine:      { type: 'none' },
            },
          },
          legend:     chartData.legend     ?? { visible: false },
          dataLabels: chartData.dataLabels ?? { visible: false },
        };

        // Background fill of the chart container (e.g. the blue bg in the Alpha slide)
        if (raw.backgroundColor) {
          el.plotArea = { fill: parseFill(raw.backgroundColor) };
        }

        elements.push(el);
        return;
      }
    }

    // ── Text / shape element ──────────────────────────────────────────────────
    // Covers pptxType: 'text', 'shape', 'auto-text', and unrecognised types.

    const fill   = parseFill(raw.backgroundColor);
    const border = parseBorder(raw.borderColor, raw.borderWidth, raw.borderStyle);

    // Only create an element if it has visual output (bg, border, or text)
    const hasVisual =
      fill.type === 'solid' ||
      border.type === 'solid' ||
      raw.innerText.length > 0;

    if (!hasVisual) return;

    const fontSizePx   = parsePx(raw.fontSize) || 14;
    const fontSizeHp   = pxToHalfPoints(fontSizePx);
    const isBold       = parseInt(raw.fontWeight) >= 600 || raw.fontWeight === 'bold';
    const isItalic     = raw.fontStyle === 'italic';
    const textColor    = normalizeColor(raw.color) ?? '000000';
    const textAlign    = parseTextAlign(raw.textAlign);

    const el: ElementDefinition = {
      type: 'sp',
      id,
      name: `${raw.pptxType}-${id}`,
      position,
      fill,
      border,
    };

    if (raw.innerText) {
      // Split on newlines to create multiple paragraphs
      const lines = raw.innerText.split(/\n+/).filter(l => l.trim().length > 0);
      el.text = {
        body: {
          anchor: 't',
          autofit: false,
          paragraphs: lines.map(line => ({
            alignment: textAlign,
            lineSpacing: 0,
            runs: [{
              text:     line.trim(),
              bold:     isBold,
              italic:   isItalic,
              fontSize: fontSizeHp,
              color:    textColor,
            }],
          })),
        },
      };
    }

    elements.push(el);
  });

  return {
    slide: {
      width:      12192000,
      height:     6858000,
      background,
      elements,
    },
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

  const {
    slides,
    theme = {} as ThemeInput,
  } = req.body;

  if (!slides) {
    return res.status(400).json({
      error: '`slides` is required. Pass a single slide object or an array.',
    });
  }

  const slideArray: SlideInput[] = (Array.isArray(slides) ? slides : [slides])
    .sort((a: SlideInput, b: SlideInput) => (a.slideNumber ?? 0) - (b.slideNumber ?? 0));

  if (slideArray.some(s => !s.code)) {
    return res.status(400).json({ error: 'Every slide must have a `code` field.' });
  }

  console.log(`[parse-slide-chromium] Parsing ${slideArray.length} slide(s)...`);

  let browser = null;

  try {
    // ── Browser launch — identical to pdf.ts ─────────────────────────────────
    let executablePath: string | undefined;
    let launchArgs: string[] = [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--font-render-hinting=none',
    ];

    const isVercel = process.env.VERCEL === '1' || !!process.env.AWS_LAMBDA_FUNCTION_NAME;

    if (isVercel) {
      try {
        const chromiumPkg = await import('@sparticuz/chromium');
        executablePath = await chromiumPkg.default.executablePath();
        launchArgs = [
          ...chromiumPkg.default.args,
          '--disable-gpu',
          '--font-render-hinting=none',
          '--no-sandbox',
          '--disable-dev-shm-usage',
        ];
        console.log(`[parse-slide-chromium] Using @sparticuz/chromium at: ${executablePath}`);
      } catch (err) {
        throw new Error(`@sparticuz/chromium required on Vercel but failed: ${err}`);
      }
    } else {
      console.log('[parse-slide-chromium] Local dev — using playwright installed browser');
      executablePath = undefined;
    }

    browser = await chromium.launch({
      executablePath,
      args: launchArgs,
      headless: true,
    });

    const context = await browser.newContext({
      viewport: { width: 960, height: 540 },
      deviceScaleFactor: 1, // no need for 2x — we're extracting data not pixels
    });

    const results: Array<{ slideNumber: number; slideJson: SlideSchema }> = [];

    for (let i = 0; i < slideArray.length; i++) {
      const slide      = slideArray[i];
      const slideLabel = slide.slideNumber ?? i + 1;

      console.log(`[parse-slide-chromium] Rendering slide ${slideLabel} for DOM extraction...`);
      const t0 = Date.now();

      const html = buildHtml(slide.code, theme);
      const page = await context.newPage();

      page.on('console', msg => {
        console.log(`[slide ${slideLabel} console] ${msg.type()}: ${msg.text()}`);
      });

      page.on('pageerror', err => {
        console.error(`[slide ${slideLabel} pageerror]`, err.message);
      });

      await page.setContent(html, { waitUntil: 'domcontentloaded', timeout: 30000 });

      await page.waitForFunction(
        'window.__SLIDE_READY__ === true || typeof window.__SLIDE_ERROR__ === "string"',
        { timeout: 30000 },
      );

      // Check for render errors
      const renderError = await page.evaluate(() => (window as any).__SLIDE_ERROR__);
      if (renderError) {
        await page.close();
        throw new Error(`Slide ${slideLabel} render error: ${renderError}`);
      }

      // Extract DOM element data and the root background color
      const { rawElements, rootBackground } = await page.evaluate(() => {
        const els: any[]  = (window as any).__SLIDE_ELEMENTS__ ?? [];
        const rootEl       = document.getElementById('root');
        const rootBg       = rootEl
          ? window.getComputedStyle(rootEl).backgroundColor
          : null;
        return { rawElements: els, rootBackground: rootBg };
      });

      console.log(
        `[parse-slide-chromium] Slide ${slideLabel}: extracted ${rawElements.length} elements ` +
        `in ${Date.now() - t0}ms`,
      );

      await page.close();

      // Map raw DOM data → SlideSchema
      const slideSchema = mapElementsToSchema(rawElements, rootBackground);

      results.push({ slideNumber: slideLabel, slideJson: slideSchema });
    }

    await browser.close();
    browser = null;

    console.log(`[parse-slide-chromium] Done. ${results.length} slide(s) parsed.`);

    // Return array when multiple slides, single object when one — mirrors
    // how the frontend already handles parse-slide.ts responses.
    if (results.length === 1) {
      return res.status(200).json({
        slideNumber: results[0].slideNumber,
        slideJson:   results[0].slideJson,
      });
    }

    return res.status(200).json({ slides: results });

  } catch (error: any) {
    console.error('[parse-slide-chromium] Error:', error.message);
    console.error('[parse-slide-chromium] Stack:', error.stack);
    if (browser) {
      try { await browser.close(); } catch { /* ignore */ }
    }
    return res.status(500).json({
      error:   error.message,
      details: error.stack,
    });
  }
}
