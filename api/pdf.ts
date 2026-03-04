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

// Vercel timeout
export const config = {
  maxDuration: 120,
};

// ---------------------------------------------------------------------------
// Vendor bundles — read once at module load time from api/vendor/
// ---------------------------------------------------------------------------

const VENDOR_DIR = path.join(__dirname, 'vendor');

function readVendor(filename: string): string {
  const filePath = path.join(VENDOR_DIR, filename);
  if (!fs.existsSync(filePath)) {
    throw new Error(
      `[pdf] Missing vendor file: ${filePath}\n` +
      `Run: curl -o api/vendor/${filename} <url>`
    );
  }
  return fs.readFileSync(filePath, 'utf8');
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Prevent premature </script> close when inlining JS into HTML <script> tags.
 */
function safeInlineScript(js: string): string {
  return js.replace(/<\/(script)/gi, '<\\/$1');
}

/**
 * Safely escape arbitrary code for embedding inside a JS template literal.
 */
function escapeForTemplateLiteral(code: string): string {
  const jsonStr = JSON.stringify(code);
  return jsonStr
    .slice(1, -1)
    .replace(/`/g, '\\`')
    .replace(/\$\{/g, '\\${');
}

// ---------------------------------------------------------------------------
// Load vendor bundles and pre-escape them once at module load time
// ---------------------------------------------------------------------------

const REACT_JS     = safeInlineScript(readVendor('react.umd.js'));
const REACT_DOM_JS = safeInlineScript(readVendor('react-dom.umd.js'));
const PROP_TYPES_JS = safeInlineScript(readVendor('prop-types.umd.js'));
const RECHARTS_JS  = safeInlineScript(readVendor('recharts.umd.js'));
const BABEL_JS     = safeInlineScript(readVendor('babel.min.js'));

console.log('[pdf] Vendor bundles loaded:', {
  react:       `${(REACT_JS.length     / 1024).toFixed(0)} KB`,
  reactDom:    `${(REACT_DOM_JS.length / 1024).toFixed(0)} KB`,
  propTypes:   `${(PROP_TYPES_JS.length / 1024).toFixed(0)} KB`,
  recharts:    `${(RECHARTS_JS.length  / 1024).toFixed(0)} KB`,
  babel:       `${(BABEL_JS.length     / 1024).toFixed(0)} KB`,
});

// Verify escaping
const checkEscape = (name: string, escaped: string) => {
  const count = (escaped.match(/<\/script/gi) || []).length;
  if (count > 0) {
    console.error(`[pdf] ⚠️  ${name} STILL has ${count} </script occurrences after escape`);
  }
};
checkEscape('react', REACT_JS);
checkEscape('reactDom', REACT_DOM_JS);
checkEscape('propTypes', PROP_TYPES_JS);
checkEscape('recharts', RECHARTS_JS);
checkEscape('babel', BABEL_JS);

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
// buildHtml
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

  // IMPORTANT: Load order matters!
  // 1. React (required by everything)
  // 2. ReactDOM (required by Recharts)
  // 3. PropTypes (required by Recharts)
  // 4. Recharts (depends on React + PropTypes)
  // 5. LucideReact (depends on React)
  // 6. Babel (standalone, no deps)
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Slide</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html, body { width: 960px; height: 540px; overflow: hidden; background: #ffffff; }
    #root { width: 960px; height: 540px; overflow: hidden; position: relative; }
  </style>
</head>
<body>
  <div id="root"></div>

  <!-- 1. React -->
  <script>${REACT_JS}</script>
  <!-- 2. ReactDOM -->
  <script>${REACT_DOM_JS}</script>
  <!-- 3. PropTypes (needed by Recharts) -->
  <script>${PROP_TYPES_JS}</script>
  <!-- 4. Recharts -->
  <script>${RECHARTS_JS}</script>
  <!-- 6. Babel Standalone -->
  <script>${BABEL_JS}</script>

  <script>
    // -----------------------------------------------------------------------
    // Debug: log what globals are available
    // -----------------------------------------------------------------------
    console.log('[slide] Globals check:', {
      React:      typeof React !== 'undefined' ? 'object' : 'undefined',
      ReactDOM:   typeof ReactDOM !== 'undefined' ? 'object' : 'undefined',
      PropTypes:  typeof PropTypes !== 'undefined' ? 'object' : 'undefined',
      Recharts:   typeof Recharts !== 'undefined' ? 'object' : 'undefined',
      recharts:   typeof recharts !== 'undefined' ? 'object' : 'undefined',
      LucideReact: typeof LucideReact !== 'undefined' ? 'object' : 'undefined',
      Babel:      typeof Babel !== 'undefined' ? 'object' : 'undefined',
    });

    // Also check what keys Recharts exposes (if it loaded)
    if (typeof Recharts !== 'undefined') {
      console.log('[slide] Recharts keys sample:', Object.keys(Recharts).slice(0, 15));
    } else if (typeof recharts !== 'undefined') {
      console.log('[slide] recharts (lowercase) keys sample:', Object.keys(recharts).slice(0, 15));
    } else {
      // Try to find it on window
      var rechartsKeys = Object.keys(window).filter(function(k) {
        return k.toLowerCase().indexOf('rechart') !== -1;
      });
      console.log('[slide] Recharts-like window keys:', rechartsKeys);
    }

    // -----------------------------------------------------------------------
    // Verify UMD globals actually loaded
    // -----------------------------------------------------------------------
    (function verifyGlobals() {
      var missing = [];
      if (typeof React    === 'undefined') missing.push('React');
      if (typeof ReactDOM === 'undefined') missing.push('ReactDOM');
      if (typeof Babel    === 'undefined') missing.push('Babel');

      // Recharts may register as window.Recharts or window.recharts
      if (typeof Recharts === 'undefined' && typeof recharts === 'undefined') {
        missing.push('Recharts');
      }

      // Normalize: ensure window.Recharts exists regardless of casing
      if (typeof Recharts === 'undefined' && typeof recharts !== 'undefined') {
        window.Recharts = recharts;
        console.log('[slide] Normalized window.recharts → window.Recharts');
      }

      if (missing.length) {
        var msg = 'Missing UMD globals: ' + missing.join(', ') + ' — vendor scripts may have failed to parse';
        document.getElementById('root').innerHTML =
          '<pre style="color:red;padding:16px;font-size:11px;">' + msg + '</pre>';
        window.__SLIDE_ERROR__ = msg;
      }
    })();
    
    // -----------------------------------------------------------------------
    // Lucide-react shim: returns a cached no-op component for any icon
    // -----------------------------------------------------------------------
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

    // -----------------------------------------------------------------------
    // Lazy require shim
    // -----------------------------------------------------------------------
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
      console.error('[require] Unknown module: ' + mod,
        'React?', typeof window.React,
        'ReactDOM?', typeof window.ReactDOM,
        'Recharts?', typeof window.Recharts,
        'Babel?', typeof window.Babel);
      throw new Error('[pdf.ts] Unknown module: ' + mod);
    };

    // -----------------------------------------------------------------------
    // Transpile + execute the slide code
    // -----------------------------------------------------------------------
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
          '<pre style="color:red;padding:16px;font-size:11px;">Babel transpile error:\\n' + err.message + '</pre>';
        window.__SLIDE_ERROR__ = 'Babel error: ' + err.message;
        return;
      }

      console.log('[slide] Transpiled code preview:', transpiledCode.slice(0, 600));

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
          '<pre style="color:red;padding:16px;font-size:11px;">Runtime error:\\n' + err.message + '\\n\\nTranspiled:\\n' + (transpiledCode || '').slice(0, 800) + '</pre>';
        window.__SLIDE_ERROR__ = 'Runtime error: ' + err.message;
        return;
      }

      var SlideComponent =
        moduleObj.exports['default'] ||
        moduleObj.exports[Object.keys(moduleObj.exports)[0]];

      if (!SlideComponent) {
        var msg = 'No default export found. exports keys: ' + JSON.stringify(Object.keys(moduleObj.exports));
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

      requestAnimationFrame(function() {
        setTimeout(function() { window.__SLIDE_READY__ = true; }, 1500);
      });
    })();
  </script>
</body>
</html>`;
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
    format = 'pdf',
  } = req.body;

  if (!slides) {
    return res.status(400).json({ error: '`slides` is required. Pass a single slide object or an array.' });
  }

  const slideArray: SlideInput[] = (Array.isArray(slides) ? slides : [slides])
    .sort((a: SlideInput, b: SlideInput) => (a.slideNumber ?? 0) - (b.slideNumber ?? 0));

  console.log(`[pdf] Received request:`, JSON.stringify({
    slideCount: slideArray.length,
    format,
    theme,
    slides: slideArray.map(s => ({
      slideNumber: s.slideNumber,
      codeLength:  s.code?.length,
      codePreview: s.code?.slice(0, 120),
    })),
  }, null, 2));

  if (slideArray.some(s => !s.code)) {
    return res.status(400).json({ error: 'Every slide must have a `code` field.' });
  }

  if (format === 'png' && slideArray.length > 1) {
    return res.status(400).json({
      error: 'PNG format only supports a single slide. Use format: "pdf" for multiple slides.',
    });
  }

  console.log(`[pdf] Rendering ${slideArray.length} slide(s) as ${format.toUpperCase()}...`);

  let browser = null;

  try {
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
        console.log(`[pdf] Using @sparticuz/chromium at: ${executablePath}`);
      } catch (err) {
        throw new Error(
          `@sparticuz/chromium is required on Vercel but failed to load: ${err}`
        );
      }
    } else {
      console.log('[pdf] Local dev mode, using playwright installed browser');
      executablePath = undefined;
    }

    browser = await chromium.launch({
      executablePath,
      args: launchArgs,
      headless: true,
    });

    const context = await browser.newContext({
      viewport: { width: 960, height: 540 },
      deviceScaleFactor: 2,
    });

    const slideBuffers: Buffer[] = [];

    for (let i = 0; i < slideArray.length; i++) {
      const slide = slideArray[i];
      const slideLabel = slide.slideNumber ?? i + 1;
      console.log(`[pdf] Rendering slide ${slideLabel}...`);

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
        { timeout: 30000 }
      );

      const renderError = await page.evaluate(() => (window as any).__SLIDE_ERROR__);
      if (renderError) {
        await page.close();
        throw new Error(`Slide ${slideLabel} render error: ${renderError}`);
      }

      const screenshotBuffer = await page.screenshot({
        type:  'png',
        clip:  { x: 0, y: 0, width: 960, height: 540 },
        scale: 'device',
      });

      slideBuffers.push(Buffer.from(screenshotBuffer));
      await page.close();

      console.log(`[pdf] Slide ${slideLabel} rendered (${(screenshotBuffer.length / 1024).toFixed(1)} KB)`);
    }

    await browser.close();
    browser = null;

    if (format === 'png') {
      res.setHeader('Content-Type', 'image/png');
      res.setHeader('Content-Disposition', 'attachment; filename="slide.png"');
      res.setHeader('Content-Length', slideBuffers[0].length);
      return res.status(200).send(slideBuffers[0]);
    }

    const PAGE_WIDTH_PT  = 960;
    const PAGE_HEIGHT_PT = 540;

    const { PDFDocument } = await import('pdf-lib');

    const pdfDoc = await PDFDocument.create();
    pdfDoc.setTitle('Presentation');
    pdfDoc.setCreator('Volute PDF Engine');

    for (let i = 0; i < slideBuffers.length; i++) {
      const pngImage = await pdfDoc.embedPng(slideBuffers[i]);
      const pdfPage  = pdfDoc.addPage([PAGE_WIDTH_PT, PAGE_HEIGHT_PT]);
      pdfPage.drawImage(pngImage, { x: 0, y: 0, width: PAGE_WIDTH_PT, height: PAGE_HEIGHT_PT });
      console.log(`[pdf] Embedded slide ${i + 1} into PDF`);
    }

    const pdfBytes  = await pdfDoc.save();
    const pdfBuffer = Buffer.from(pdfBytes);

    console.log(`[pdf] Output PDF:`, JSON.stringify({
      pages:          slideArray.length,
      pdfSizeKb:      (pdfBuffer.length / 1024).toFixed(1),
      pageDimensions: `${PAGE_WIDTH_PT}x${PAGE_HEIGHT_PT}pt`,
      screenshotSizes: slideBuffers.map((b, idx) => ({
        slide:  idx + 1,
        sizeKb: (b.length / 1024).toFixed(1),
      })),
    }));

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="presentation.pdf"');
    res.setHeader('Content-Length', pdfBuffer.length);
    return res.status(200).send(pdfBuffer);

  } catch (error: any) {
    console.error('[pdf] Error:', error.message);
    console.error('[pdf] Stack:', error.stack);
    if (browser) {
      try { await browser.close(); } catch { /* ignore */ }
    }
    return res.status(500).json({
      error:   error.message,
      details: error.stack,
    });
  }
}