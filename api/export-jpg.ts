import type { VercelRequest, VercelResponse } from '@vercel/node';
import { chromium } from 'playwright-core';
import JSZip from 'jszip';
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
// (identical to pdf.ts — same vendor directory)
// ---------------------------------------------------------------------------

const VENDOR_DIR = path.join(__dirname, 'vendor');

function readVendor(filename: string): string {
  const filePath = path.join(VENDOR_DIR, filename);
  if (!fs.existsSync(filePath)) {
    throw new Error(
      `[export-jpg] Missing vendor file: ${filePath}\n` +
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

// ---------------------------------------------------------------------------
// Load vendor bundles once
// ---------------------------------------------------------------------------

const REACT_JS      = safeInlineScript(readVendor('react.umd.js'));
const REACT_DOM_JS  = safeInlineScript(readVendor('react-dom.umd.js'));
const PROP_TYPES_JS = safeInlineScript(readVendor('prop-types.umd.js'));
const RECHARTS_JS   = safeInlineScript(readVendor('recharts.umd.js'));
const BABEL_JS      = safeInlineScript(readVendor('babel.min.js'));

console.log('[export-jpg] Vendor bundles loaded:', {
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
  backgroundColor?: string;
  slideBackgroundColor?: string; // Redux key — mapped to backgroundColor
}

// ---------------------------------------------------------------------------
// buildHtml — identical to export-png.ts
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
  const backgroundColor = theme.backgroundColor || theme.slideBackgroundColor || '#ffffff';

  const escapedCode = escapeForTemplateLiteral(code);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Slide</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html, body { width: 960px; height: 540px; overflow: hidden; background: ${backgroundColor}; }
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
    console.log('[slide] Globals check:', {
      React:    typeof React    !== 'undefined' ? 'ok' : 'MISSING',
      ReactDOM: typeof ReactDOM !== 'undefined' ? 'ok' : 'MISSING',
      Recharts: typeof Recharts !== 'undefined' ? 'ok' : (typeof recharts !== 'undefined' ? 'ok (lowercase)' : 'MISSING'),
      Babel:    typeof Babel    !== 'undefined' ? 'ok' : 'MISSING',
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

    // Lucide-react shim
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
                ref: ref,
                xmlns: 'http://www.w3.org/2000/svg',
                width: s, height: s,
                viewBox: '0 0 24 24',
                fill: 'none',
                stroke: props.color || 'currentColor',
                strokeWidth: props.strokeWidth || 2,
                strokeLinecap: 'round',
                strokeLinejoin: 'round',
                style: props.style,
                className: props.className,
              });
            });
            Icon.displayName = String(prop);
            cache[prop] = Icon;
            return Icon;
          }
          return function() { return null; };
        }
      });
    })();
  </script>

  <script>
    // Lazy require shim — same as pdf.ts
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
      throw new Error('[export-jpg] Unknown module: ' + mod);
    };

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
        backgroundColor:  ${JSON.stringify(backgroundColor)},
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
  if (req.method !== 'POST')   return res.status(405).json({ error: 'Method not allowed' });

  const {
    slides,
    theme      = {} as ThemeInput,
    filename   = 'slides',   // base name for the zip and individual files
    quality    = 90,         // JPEG quality (1–100, default 90)
  } = req.body;

  if (!slides) {
    return res.status(400).json({ error: '`slides` is required. Pass a single slide object or an array.' });
  }

  const slideArray: SlideInput[] = (Array.isArray(slides) ? slides : [slides])
    .sort((a: SlideInput, b: SlideInput) => (a.slideNumber ?? 0) - (b.slideNumber ?? 0));

  if (slideArray.some(s => !s.code)) {
    return res.status(400).json({ error: 'Every slide must have a `code` field.' });
  }

  console.log(`[export-jpg] Rendering ${slideArray.length} slide(s) as JPEG (quality=${quality})...`);

  let browser = null;

  try {
    // ── Launch browser (mirrors pdf.ts logic exactly) ──────────────────────
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
        console.log(`[export-jpg] Using @sparticuz/chromium at: ${executablePath}`);
      } catch (err) {
        throw new Error(`@sparticuz/chromium is required on Vercel but failed to load: ${err}`);
      }
    } else {
      console.log('[export-jpg] Local dev mode, using playwright installed browser');
      executablePath = undefined;
    }

    browser = await chromium.launch({ executablePath, args: launchArgs, headless: true });

    const context = await browser.newContext({
      viewport:        { width: 960, height: 540 },
      deviceScaleFactor: 2,   // 2× = 1920×1080 effective resolution
    });

    // ── Render each slide → JPEG buffer ────────────────────────────────────
    const slideBuffers: { buffer: Buffer; slideNumber: number }[] = [];

    for (let i = 0; i < slideArray.length; i++) {
      const slide      = slideArray[i];
      const slideLabel = slide.slideNumber ?? i + 1;
      console.log(`[export-jpg] Rendering slide ${slideLabel}...`);

      const html = buildHtml(slide.code, theme);
      const page = await context.newPage();

      page.on('console',   msg => console.log(`[slide ${slideLabel}] ${msg.type()}: ${msg.text()}`));
      page.on('pageerror', err => console.error(`[slide ${slideLabel} pageerror]`, err.message));

      await page.setContent(html, { waitUntil: 'domcontentloaded', timeout: 30_000 });

      await page.waitForFunction(
        'window.__SLIDE_READY__ === true || typeof window.__SLIDE_ERROR__ === "string"',
        { timeout: 30_000 },
      );

      const renderError = await page.evaluate(() => (window as any).__SLIDE_ERROR__);
      if (renderError) {
        await page.close();
        throw new Error(`Slide ${slideLabel} render error: ${renderError}`);
      }

      const screenshotBuffer = await page.screenshot({
        type:    'jpeg',
        quality: Math.min(100, Math.max(1, quality)),
        clip:    { x: 0, y: 0, width: 960, height: 540 },
        scale:   'device',   // honours deviceScaleFactor → full 1920×1080
      });

      slideBuffers.push({ buffer: Buffer.from(screenshotBuffer), slideNumber: slideLabel });
      await page.close();

      console.log(`[export-jpg] Slide ${slideLabel} captured (${(screenshotBuffer.length / 1024).toFixed(1)} KB)`);
    }

    await browser.close();
    browser = null;

    // ── Single slide → return the JPEG directly (no zip overhead) ─────────
    if (slideBuffers.length === 1) {
      const { buffer, slideNumber } = slideBuffers[0];
      res.setHeader('Content-Type', 'image/jpeg');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}-slide-${slideNumber}.jpg"`);
      res.setHeader('Content-Length', buffer.length);
      return res.status(200).send(buffer);
    }

    // ── Multiple slides → bundle into a ZIP ───────────────────────────────
    const zip = new JSZip();

    for (const { buffer, slideNumber } of slideBuffers) {
      // Zero-pad slide number so files sort correctly in Finder / Explorer
      const paddedNum = String(slideNumber).padStart(2, '0');
      zip.file(`${filename}-slide-${paddedNum}.jpg`, buffer);
    }

    const zipBuffer = await zip.generateAsync({
      type:               'nodebuffer',
      compression:        'DEFLATE',
      compressionOptions: { level: 6 },   // balanced speed vs size
    });

    console.log(`[export-jpg] ZIP created: ${slideBuffers.length} slides, ${(zipBuffer.length / 1024).toFixed(1)} KB`);

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}.zip"`);
    res.setHeader('Content-Length', zipBuffer.length);
    return res.status(200).send(zipBuffer);

  } catch (error: any) {
    console.error('[export-jpg] Error:', error.message);
    console.error('[export-jpg] Stack:', error.stack);
    if (browser) {
      try { await browser.close(); } catch { /* ignore */ }
    }
    return res.status(500).json({ error: error.message, details: error.stack });
  }
}
