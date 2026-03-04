import type { VercelRequest, VercelResponse } from '@vercel/node';
import { chromium } from 'playwright-core';

// Vercel timeout — PDF generation can take a few seconds per slide
export const config = {
  maxDuration: 120,
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SlideInput {
  /** The compiled JSX/TSX source for the slide component (as returned by generate-slide) */
  code: string;
  /** Slide number — used for ordering in multi-slide PDFs */
  slideNumber?: number;
}

interface ThemeInput {
  headingFont?: string;
  bodyFont?: string;
  accentColors?: string[];
  headingTextColor?: string;
  bodyTextColor?: string;
  /** Number — base px size for headings */
  headingFontSize?: number;
  /** Number — base px size for body text */
  bodyFontSize?: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Build a self-contained HTML page that:
 * 1. Loads React, ReactDOM, Recharts, and Lucide via CDN (no bundler needed)
 * 2. Transpiles the raw TSX/JSX slide code in-browser using Babel standalone
 * 3. Renders the slide component into a fixed 960×540 container
 * 4. Signals readiness via window.__SLIDE_READY__ so Playwright knows when to screenshot
 */
function buildHtml(code: string, theme: ThemeInput): string {
  const {
    headingFont = 'Inter, sans-serif',
    bodyFont = 'Inter, sans-serif',
    accentColors = ['#667eea', '#764ba2'],
    headingTextColor = '#000000',
    bodyTextColor = '#333333',
    headingFontSize = 36,
    bodyFontSize = 14,
  } = theme;

  // Escape the slide code for safe embedding inside a JS template literal
  const escapedCode = code
    .replace(/\\/g, '\\\\')
    .replace(/`/g, '\\`')
    .replace(/\$\{/g, '\\${');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Slide</title>

  <!-- Google Fonts — load both heading and body fonts if they look like GFont names -->
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Roboto:wght@400;500;700;900&display=swap" rel="stylesheet" />

  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    html, body {
      width: 960px;
      height: 540px;
      overflow: hidden;
      background: #ffffff;
    }

    #root {
      width: 960px;
      height: 540px;
      overflow: hidden;
      position: relative;
    }
  </style>
</head>
<body>
  <div id="root"></div>

  <!-- React -->
  <script crossorigin src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
  <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>

  <!-- Recharts (depends on React) -->
  <script crossorigin src="https://unpkg.com/recharts@2.12.7/umd/Recharts.js"></script>

  <!-- Lucide React UMD build -->
  <script crossorigin src="https://unpkg.com/lucide-react@0.263.1/dist/umd/lucide-react.min.js"></script>

  <!-- Babel standalone for in-browser TSX transpilation -->
  <script src="https://unpkg.com/@babel/standalone@7.24.0/babel.min.js"></script>

  <script>
    // ---------------------------------------------------------------------------
    // Shim module system so the generated slide code's import/export statements
    // work inside the browser without a bundler.
    // ---------------------------------------------------------------------------
    window.__modules = {};

    // Expose react and react-dom
    window.__modules['react'] = window.React;
    window.__modules['react-dom'] = window.ReactDOM;

    // Expose recharts under its expected import path
    window.__modules['recharts'] = window.Recharts;

    // Expose lucide-react
    window.__modules['lucide-react'] = window.LucideReact || window.lucideReact || {};


    // Minimal require() shim
    window.require = function(mod) {
      if (window.__modules[mod]) return window.__modules[mod];
      throw new Error('[pdf.ts] Unknown module: ' + mod);
    };

    // ---------------------------------------------------------------------------
    // Transpile + execute the slide code
    // ---------------------------------------------------------------------------
    (function() {
      const rawCode = \`${escapedCode}\`;

      let transpiledCode;
      try {
        transpiledCode = Babel.transform(rawCode, {
          presets: ['react', 'typescript'],
          plugins: [
            // Transform import/export to our shim
            ['transform-modules-commonjs', { strict: false }],
          ],
          filename: 'slide.tsx',
        }).code;
      } catch (err) {
        document.getElementById('root').innerHTML =
          '<pre style="color:red;padding:16px;font-size:11px;">Babel error: ' + err.message + '</pre>';
        window.__SLIDE_ERROR__ = err.message;
        return;
      }

      // Wrap in a mini CommonJS executor
      const moduleObj = { exports: {} };
      try {
        const fn = new Function('require', 'module', 'exports', 'React', transpiledCode);
        fn(window.require, moduleObj, moduleObj.exports, React);
      } catch (err) {
        document.getElementById('root').innerHTML =
          '<pre style="color:red;padding:16px;font-size:11px;">Runtime error: ' + err.message + '</pre>';
        window.__SLIDE_ERROR__ = err.message;
        return;
      }

      // Retrieve the default export (the slide component)
      const SlideComponent =
        moduleObj.exports['default'] ||
        moduleObj.exports[Object.keys(moduleObj.exports)[0]];

      if (!SlideComponent) {
        const msg = 'No default export found in slide code';
        document.getElementById('root').innerHTML =
          '<pre style="color:red;padding:16px;font-size:11px;">' + msg + '</pre>';
        window.__SLIDE_ERROR__ = msg;
        return;
      }

      // Theme props passed from the server
      const themeProps = {
        headingFont:      ${JSON.stringify(headingFont)},
        bodyFont:         ${JSON.stringify(bodyFont)},
        accentColors:     ${JSON.stringify(accentColors)},
        headingTextColor: ${JSON.stringify(headingTextColor)},
        bodyTextColor:    ${JSON.stringify(bodyTextColor)},
        headingFontSize:  ${headingFontSize},
        bodyFontSize:     ${bodyFontSize},
      };

      // Render
      const root = ReactDOM.createRoot(document.getElementById('root'));
      root.render(React.createElement(SlideComponent, themeProps));

      // Signal readiness after paint + a short buffer for charts/fonts
      requestAnimationFrame(() => {
        setTimeout(() => { window.__SLIDE_READY__ = true; }, 400);
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
    /**
     * Single slide or array of slides.
     * Each slide must have a `code` field (the TSX returned by generate-slide).
     *
     * Single slide:  { code: "...", slideNumber: 1 }
     * Multi-slide:   [{ code: "...", slideNumber: 1 }, { code: "...", slideNumber: 2 }]
     */
    slides,
    theme = {} as ThemeInput,
    /**
     * Output format:
     * - "pdf"  → returns a single PDF with one page per slide (default)
     * - "png"  → returns a single PNG (only valid for single-slide input)
     */
    format = 'pdf',
  } = req.body;

  if (!slides) {
    return res.status(400).json({ error: '`slides` is required. Pass a single slide object or an array.' });
  }

  // Normalise to array and sort by slideNumber
  const slideArray: SlideInput[] = (Array.isArray(slides) ? slides : [slides])
    .sort((a, b) => (a.slideNumber ?? 0) - (b.slideNumber ?? 0));

  if (slideArray.some(s => !s.code)) {
    return res.status(400).json({ error: 'Every slide must have a `code` field.' });
  }

  if (format === 'png' && slideArray.length > 1) {
    return res.status(400).json({ error: 'PNG format only supports a single slide. Use format: "pdf" for multiple slides.' });
  }

  console.log(`[pdf] Rendering ${slideArray.length} slide(s) as ${format.toUpperCase()}...`);

  let browser = null;

  try {
    // ------------------------------------------------------------------
    // Launch Playwright Chromium
    // On Vercel, use @sparticuz/chromium for a Lambda-compatible binary.
    // Locally, playwright-core will find your installed browser.
    // ------------------------------------------------------------------
    let executablePath: string | undefined;

  const isVercel = process.env.VERCEL === '1' || process.env.AWS_LAMBDA_FUNCTION_NAME !== undefined;

  if (isVercel) {
    try {
      const chromiumPkg = await import('@sparticuz/chromium');
      executablePath = await chromiumPkg.default.executablePath();
      console.log(`[pdf] Using @sparticuz/chromium at: ${executablePath}`);
    } catch (err) {
      console.warn('[pdf] @sparticuz/chromium not available:', err);
    }
  } else {
    // Local dev — use playwright's own installed browser
    console.log('[pdf] Local dev mode, using playwright installed browser');
    executablePath = undefined;
  }

    browser = await chromium.launch({
      executablePath,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--font-render-hinting=none', // sharper text in headless
      ],
      headless: true,
    });

    const context = await browser.newContext({
      viewport: { width: 960, height: 540 },
      deviceScaleFactor: 2, // 2× for crisp output (1920×1080 effective pixels)
    });

    // ------------------------------------------------------------------
    // Render each slide to a screenshot buffer
    // ------------------------------------------------------------------
    const slideBuffers: Buffer[] = [];

    for (let i = 0; i < slideArray.length; i++) {
      const slide = slideArray[i];
      console.log(`[pdf] Rendering slide ${slide.slideNumber ?? i + 1}...`);

      const html = buildHtml(slide.code, theme);
      const page = await context.newPage();

      // Set content and wait for network idle (fonts, CDN scripts)
      await page.setContent(html, { waitUntil: 'networkidle', timeout: 30000 });

      // Wait for the slide to signal it's ready (or error out)
      await page.waitForFunction(
        '() => window.__SLIDE_READY__ === true || window.__SLIDE_ERROR__',
        { timeout: 15000 }
      );

      // Check for render errors
      const renderError = await page.evaluate(() => (window as any).__SLIDE_ERROR__);
      if (renderError) {
        await page.close();
        throw new Error(`Slide ${slide.slideNumber ?? i + 1} render error: ${renderError}`);
      }

      // Screenshot the 960×540 root element at 2× scale
      const screenshotBuffer = await page.screenshot({
        type: 'png',
        clip: { x: 0, y: 0, width: 960, height: 540 },
        // scale: 'device' respects deviceScaleFactor → gives us 1920×1080 PNG
        scale: 'device',
      });

      slideBuffers.push(screenshotBuffer);
      await page.close();

      console.log(`[pdf] Slide ${slide.slideNumber ?? i + 1} rendered (${screenshotBuffer.length} bytes)`);
    }

    await browser.close();
    browser = null;

    // ------------------------------------------------------------------
    // PNG mode — return the single screenshot directly
    // ------------------------------------------------------------------
    if (format === 'png') {
      res.setHeader('Content-Type', 'image/png');
      res.setHeader('Content-Disposition', 'attachment; filename="slide.png"');
      res.setHeader('Content-Length', slideBuffers[0].length);
      return res.status(200).send(slideBuffers[0]);
    }

    // ------------------------------------------------------------------
    // PDF mode — embed each PNG as a full page in a PDF
    // We build a minimal valid PDF manually to avoid heavy dependencies.
    // Each page is exactly 960×540 pt (points = px at 72dpi; we let the
    // viewer scale to fit, but the aspect ratio is always perfect 16:9).
    //
    // For pixel-perfect output at print resolution, each PNG is embedded
    // at its natural 1920×1080 resolution and the PDF page is sized to
    // match the 16:9 canvas in points.
    // ------------------------------------------------------------------

    // PDF page size in points. 1 point = 1/72 inch.
    // We use 960×540 pt which is a perfect 16:9 page (13.33" × 7.5").
    const PAGE_WIDTH_PT = 960;
    const PAGE_HEIGHT_PT = 540;

    // Build PDF using pdf-lib (lightweight, pure JS, no native deps)
    const { PDFDocument } = await import('pdf-lib');

    const pdfDoc = await PDFDocument.create();
    pdfDoc.setTitle('Presentation');
    pdfDoc.setCreator('Volute PDF Engine');

    for (let i = 0; i < slideBuffers.length; i++) {
      const pngImage = await pdfDoc.embedPng(slideBuffers[i]);
      const page = pdfDoc.addPage([PAGE_WIDTH_PT, PAGE_HEIGHT_PT]);

      // Draw the image to fill the entire page exactly
      page.drawImage(pngImage, {
        x: 0,
        y: 0,
        width: PAGE_WIDTH_PT,
        height: PAGE_HEIGHT_PT,
      });

      console.log(`[pdf] Embedded slide ${i + 1} into PDF`);
    }

    const pdfBytes = await pdfDoc.save();
    const pdfBuffer = Buffer.from(pdfBytes);

    console.log(`[pdf] PDF complete: ${pdfBuffer.length} bytes, ${slideArray.length} page(s)`);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="presentation.pdf"');
    res.setHeader('Content-Length', pdfBuffer.length);
    return res.status(200).send(pdfBuffer);

  } catch (error: any) {
    console.error('[pdf] Error:', error.message);

    // Ensure browser is always closed on error
    if (browser) {
      try { await browser.close(); } catch { /* ignore */ }
    }

    return res.status(500).json({
      error: error.message,
      details: error.stack,
    });
  }
}
