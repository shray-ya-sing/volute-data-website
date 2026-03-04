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
 *
 * The HTML parser sees </script (case-insensitive, with or without >) as the
 * end of the current <script> block. We split the problematic sequence by
 * replacing every occurrence of the literal characters "</" appearing before
 * "script" with "<" + "\/" so the HTML parser never sees the closing tag.
 *
 * This is the nuclear option: replace ALL occurrences of </script in any case
 * with a JS string concatenation that evaluates to the same value at runtime.
 */
function safeInlineScript(js: string): string {
  // Match </script with optional whitespace and closing >, case-insensitive.
  // Replace the forward slash to break the HTML parser's tag detection.
  //
  // Strategy: replace "</" with "<\\/" globally ONLY when followed by "script"
  // This is precise and won't break other code.
  return js.replace(/<\/(script)/gi, '<\\/$1');
}

/**
 * Safely escape arbitrary code for embedding inside a JS template literal.
 * Uses JSON.stringify to handle all backslash / special-char combos correctly,
 * then converts to template-literal-safe form.
 */
function escapeForTemplateLiteral(code: string): string {
  const jsonStr = JSON.stringify(code);
  // Remove surrounding quotes that JSON.stringify adds
  return jsonStr
    .slice(1, -1)
    .replace(/`/g, '\\`')
    .replace(/\$\{/g, '\\${');
}

// ---------------------------------------------------------------------------
// Load vendor bundles and pre-escape them once at module load time
// ---------------------------------------------------------------------------

const REACT_JS_RAW     = readVendor('react.umd.js');
const REACT_DOM_JS_RAW = readVendor('react-dom.umd.js');
const RECHARTS_JS_RAW  = readVendor('recharts.umd.js');
const LUCIDE_JS_RAW    = readVendor('lucide-react.umd.js');
const BABEL_JS_RAW     = readVendor('babel.min.js');

// Pre-escape once — used in every buildHtml call
const REACT_JS     = safeInlineScript(REACT_JS_RAW);
const REACT_DOM_JS = safeInlineScript(REACT_DOM_JS_RAW);
const RECHARTS_JS  = safeInlineScript(RECHARTS_JS_RAW);
const LUCIDE_JS    = safeInlineScript(LUCIDE_JS_RAW);
const BABEL_JS     = safeInlineScript(BABEL_JS_RAW);

console.log('[pdf] Vendor bundles loaded:', {
  react:       `${(REACT_JS.length     / 1024).toFixed(0)} KB`,
  reactDom:    `${(REACT_DOM_JS.length / 1024).toFixed(0)} KB`,
  recharts:    `${(RECHARTS_JS.length  / 1024).toFixed(0)} KB`,
  lucideReact: `${(LUCIDE_JS.length    / 1024).toFixed(0)} KB`,
  babel:       `${(BABEL_JS.length     / 1024).toFixed(0)} KB`,
});

// Verify escaping worked
const checkEscape = (name: string, raw: string, escaped: string) => {
  const beforeCount = (raw.match(/<\/script/gi) || []).length;
  const afterCount  = (escaped.match(/<\/script/gi) || []).length;
  console.log(`[pdf] ${name}: </script occurrences: ${beforeCount} before → ${afterCount} after escape`);
  if (afterCount > 0) {
    // Find what's left for debugging
    const remaining = escaped.match(/.{0,20}<\/script.{0,20}/gi);
    console.error(`[pdf] ⚠️  ${name} STILL has </script after escape:`, remaining);
  }
};

checkEscape('react',    REACT_JS_RAW, REACT_JS);
checkEscape('reactDom', REACT_DOM_JS_RAW, REACT_DOM_JS);
checkEscape('recharts', RECHARTS_JS_RAW, RECHARTS_JS);
checkEscape('lucide',   LUCIDE_JS_RAW, LUCIDE_JS);
checkEscape('babel',    BABEL_JS_RAW, BABEL_JS);

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

  // Vendor JS is already escaped at module load time — embed directly
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

  <script>${REACT_JS}</script>
  <script>${REACT_DOM_JS}</script>
  <script>${RECHARTS_JS}</script>
  <script>${LUCIDE_JS}</script>
  <script>${BABEL_JS}</script>

  <script>
    // -----------------------------------------------------------------------
    // Debug: log what globals are available
    // -----------------------------------------------------------------------
    console.log('[slide] Globals check:', {
      React:      typeof React,
      ReactDOM:   typeof ReactDOM,
      Recharts:   typeof Recharts,
      LucideReact: typeof LucideReact,
      Babel:      typeof Babel,
    });

    // -----------------------------------------------------------------------
    // Verify UMD globals actually loaded
    // -----------------------------------------------------------------------
    (function verifyGlobals() {
      var missing = [];
      if (typeof React    === 'undefined') missing.push('React');
      if (typeof ReactDOM === 'undefined') missing.push('ReactDOM');
      if (typeof Babel    === 'undefined') missing.push('Babel');
      if (missing.length) {
        var msg = 'Missing UMD globals: ' + missing.join(', ') + ' — vendor scripts may contain unescaped closing tags or failed to parse';
        document.getElementById('root').innerHTML =
          '<pre style="color:red;padding:16px;font-size:11px;">' + msg + '</pre>';
        window.__SLIDE_ERROR__ = msg;
      }
    })();

    // -----------------------------------------------------------------------
    // Lazy require shim — resolves globals at call time, not at setup time
    // -----------------------------------------------------------------------
    window.require = function(mod) {
      switch (mod) {
        case 'react':            return window.React;
        case 'react-dom':        return window.ReactDOM;
        case 'react-dom/client': return window.ReactDOM;
        case 'recharts':         return window.Recharts || {};
        case 'lucide-react':     return window.LucideReact || window.lucideReact || {};
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
      // Bail early if globals failed to load
      if (window.__SLIDE_ERROR__) return;

      var rawCode = \`${escapedCode}\`;

      // --- Transpile ---
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

      // --- Execute ---
      var moduleObj = { exports: {} };
      try {
        var fn = new Function(
          'require', 'module', 'exports',
          'React', 'ReactDOM', 'Recharts', 'LucideReact',
          transpiledCode
        );
        fn(
          window.require,
          moduleObj,
          moduleObj.exports,
          window.React,
          window.ReactDOM,
          window.Recharts        || {},
          window.LucideReact     || window.lucideReact || {}
        );
      } catch (err) {
        document.getElementById('root').innerHTML =
          '<pre style="color:red;padding:16px;font-size:11px;">Runtime error:\\n' + err.message + '\\n\\nTranspiled:\\n' + (transpiledCode || '').slice(0, 800) + '</pre>';
        window.__SLIDE_ERROR__ = 'Runtime error: ' + err.message;
        return;
      }

      // --- Retrieve default export ---
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

      // --- Render ---
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

      // Signal readiness after first paint + buffer for charts/fonts to settle.
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
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // ---------------------------------------------------------------------------
  // Parse + validate request
  // ---------------------------------------------------------------------------
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
    // -------------------------------------------------------------------------
    // Launch Playwright Chromium
    // -------------------------------------------------------------------------
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

    // -------------------------------------------------------------------------
    // Render each slide → PNG buffer
    // -------------------------------------------------------------------------
    const slideBuffers: Buffer[] = [];

    for (let i = 0; i < slideArray.length; i++) {
      const slide = slideArray[i];
      const slideLabel = slide.slideNumber ?? i + 1;
      console.log(`[pdf] Rendering slide ${slideLabel}...`);

      const html = buildHtml(slide.code, theme);

      // DEBUG: Write the generated HTML to disk so you can open it in a browser
      const debugPath = path.join(__dirname, `debug-slide-${slideLabel}.html`);
      fs.writeFileSync(debugPath, html, 'utf8');
      console.log(`[pdf] Debug HTML written to: ${debugPath}`);

      const page = await context.newPage();

      // Listen for console messages from the page for debugging
      page.on('console', msg => {
        console.log(`[slide ${slideLabel} console] ${msg.type()}: ${msg.text()}`);
      });

      page.on('pageerror', err => {
        console.error(`[slide ${slideLabel} pageerror]`, err.message);
      });

      // domcontentloaded is sufficient — no external network calls with inlined vendor
      await page.setContent(html, { waitUntil: 'domcontentloaded', timeout: 30000 });

      // Wait for slide to signal ready or error
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

    // -------------------------------------------------------------------------
    // PNG mode
    // -------------------------------------------------------------------------
    if (format === 'png') {
      res.setHeader('Content-Type', 'image/png');
      res.setHeader('Content-Disposition', 'attachment; filename="slide.png"');
      res.setHeader('Content-Length', slideBuffers[0].length);
      return res.status(200).send(slideBuffers[0]);
    }

    // -------------------------------------------------------------------------
    // PDF mode
    // -------------------------------------------------------------------------
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