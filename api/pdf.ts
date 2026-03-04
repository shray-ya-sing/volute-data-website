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
// CDN registry — maps package names to CDN URL + window global
// ---------------------------------------------------------------------------

const CDN_REGISTRY: Record<string, { url: (version: string) => string; global: string }> = {
  'recharts':     { url: (v) => `https://unpkg.com/recharts@${v}/umd/Recharts.js`,                  global: 'Recharts' },
  'lucide-react': { url: (v) => `https://unpkg.com/lucide-react@${v}/dist/umd/lucide-react.min.js`, global: 'LucideReact' },
};

// Fallback versions used when none are supplied by the caller
const FALLBACK_VERSIONS: Record<string, string> = {
  'recharts':     '2.12.7',
  'lucide-react': '0.263.1',
};

function buildDependencyScripts(dependencies: Record<string, string>): string {
  const merged = { ...FALLBACK_VERSIONS, ...dependencies };

  return Object.entries(merged)
    .filter(([pkg]) => CDN_REGISTRY[pkg])
    .map(([pkg, version]) => {
      const cleanVersion = version.replace(/^[\^~>=]+/, '');
      const { url } = CDN_REGISTRY[pkg];
      return `  <!-- ${pkg}@${cleanVersion} -->\n  <script crossorigin src="${url(cleanVersion)}"></script>`;
    })
    .join('\n');
}

// ---------------------------------------------------------------------------
// buildHtml — self-contained HTML page that renders a slide component
// ---------------------------------------------------------------------------

function buildHtml(code: string, theme: ThemeInput, dependencies: Record<string, string> = {}): string {
  const {
    headingFont = 'Inter, sans-serif',
    bodyFont = 'Inter, sans-serif',
    accentColors = ['#667eea', '#764ba2'],
    headingTextColor = '#000000',
    bodyTextColor = '#333333',
    headingFontSize = 36,
    bodyFontSize = 14,
  } = theme;

  // Escape slide code for safe embedding inside a JS template literal
  const escapedCode = code
    .replace(/\\/g, '\\\\')
    .replace(/`/g, '\\`')
    .replace(/\$\{/g, '\\${');

  // Build the dynamic require() registry from CDN_REGISTRY
  const shimRegistry = JSON.stringify(
    Object.fromEntries(
      Object.entries(CDN_REGISTRY).map(([pkg, { global: g }]) => [pkg, g])
    )
  );

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Slide</title>

  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Roboto:wght@400;500;700;900&display=swap" rel="stylesheet" />

  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html, body { width: 960px; height: 540px; overflow: hidden; background: #ffffff; }
    #root { width: 960px; height: 540px; overflow: hidden; position: relative; }
  </style>
</head>
<body>
  <div id="root"></div>

  <!-- React -->
  <script crossorigin src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
  <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>

  <!-- Dynamic dependencies -->
  ${buildDependencyScripts(dependencies)}

  <!-- Babel standalone for in-browser TSX transpilation -->
  <script src="https://unpkg.com/@babel/standalone@7.24.0/babel.min.js"></script>

  <script>
    // ---------------------------------------------------------------------------
    // Module shim — maps import/require calls to CDN globals on window
    // ---------------------------------------------------------------------------
    window.__modules = {};

    // Register react and react-dom
    window.__modules['react']     = window.React;
    window.__modules['react-dom'] = window.ReactDOM;

    // Register all CDN packages dynamically
    const registry = ${shimRegistry};
    for (const [pkg, globalName] of Object.entries(registry)) {
      if (window[globalName]) {
        window.__modules[pkg] = window[globalName];
      }
    }

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
          plugins: [['transform-modules-commonjs', { strict: false }]],
          filename: 'slide.tsx',
        }).code;
      } catch (err) {
        document.getElementById('root').innerHTML =
          '<pre style="color:red;padding:16px;font-size:11px;">Babel error: ' + err.message + '</pre>';
        window.__SLIDE_ERROR__ = err.message;
        return;
      }

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

      const themeProps = {
        headingFont:      ${JSON.stringify(headingFont)},
        bodyFont:         ${JSON.stringify(bodyFont)},
        accentColors:     ${JSON.stringify(accentColors)},
        headingTextColor: ${JSON.stringify(headingTextColor)},
        bodyTextColor:    ${JSON.stringify(bodyTextColor)},
        headingFontSize:  ${headingFontSize},
        bodyFontSize:     ${bodyFontSize},
      };

      const root = ReactDOM.createRoot(document.getElementById('root'));
      root.render(React.createElement(SlideComponent, themeProps));

      // Signal readiness after paint + buffer for charts/fonts to settle
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

  // ---------------------------------------------------------------------------
  // Parse + validate request body — all variables declared once here
  // ---------------------------------------------------------------------------
  const {
    slides,
    theme = {} as ThemeInput,
    format = 'pdf',
    dependencies = {} as Record<string, string>,
  } = req.body;

  if (!slides) {
    return res.status(400).json({ error: '`slides` is required. Pass a single slide object or an array.' });
  }

  const slideArray: SlideInput[] = (Array.isArray(slides) ? slides : [slides])
    .sort((a, b) => (a.slideNumber ?? 0) - (b.slideNumber ?? 0));

  // Log received payload
  console.log(`[pdf] Received request:`, JSON.stringify({
    slideCount: slideArray.length,
    format,
    dependencies,
    theme,
    slides: slideArray.map(s => ({
      slideNumber: s.slideNumber,
      codeLength: s.code?.length,
      codePreview: s.code?.slice(0, 100),
    })),
  }, null, 2));

  if (slideArray.some(s => !s.code)) {
    return res.status(400).json({ error: 'Every slide must have a `code` field.' });
  }

  if (format === 'png' && slideArray.length > 1) {
    return res.status(400).json({ error: 'PNG format only supports a single slide. Use format: "pdf" for multiple slides.' });
  }

  console.log(`[pdf] Rendering ${slideArray.length} slide(s) as ${format.toUpperCase()}...`);

  let browser = null;

  try {
    // ---------------------------------------------------------------------------
    // Launch Playwright Chromium
    // ---------------------------------------------------------------------------
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
        console.warn('[pdf] @sparticuz/chromium not available:', err);
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
      deviceScaleFactor: 2, // 2× → effective 1920×1080 screenshots
    });

    // ---------------------------------------------------------------------------
    // Render each slide to a PNG screenshot buffer
    // ---------------------------------------------------------------------------
    const slideBuffers: Buffer[] = [];

    for (let i = 0; i < slideArray.length; i++) {
      const slide = slideArray[i];
      console.log(`[pdf] Rendering slide ${slide.slideNumber ?? i + 1}...`);

      const html = buildHtml(slide.code, theme, dependencies);
      const page = await context.newPage();

      await page.setContent(html, { waitUntil: 'networkidle', timeout: 30000 });

      await page.waitForFunction(
        '() => window.__SLIDE_READY__ === true || window.__SLIDE_ERROR__',
        { timeout: 15000 }
      );

      const renderError = await page.evaluate(() => (window as any).__SLIDE_ERROR__);
      if (renderError) {
        await page.close();
        throw new Error(`Slide ${slide.slideNumber ?? i + 1} render error: ${renderError}`);
      }

      const screenshotBuffer = await page.screenshot({
        type: 'png',
        clip: { x: 0, y: 0, width: 960, height: 540 },
        scale: 'device', // respects deviceScaleFactor → 1920×1080 PNG
      });

      slideBuffers.push(screenshotBuffer);
      await page.close();

      console.log(`[pdf] Slide ${slide.slideNumber ?? i + 1} rendered (${(screenshotBuffer.length / 1024).toFixed(1)} KB)`);
    }

    await browser.close();
    browser = null;

    // ---------------------------------------------------------------------------
    // PNG mode — return screenshot directly
    // ---------------------------------------------------------------------------
    if (format === 'png') {
      res.setHeader('Content-Type', 'image/png');
      res.setHeader('Content-Disposition', 'attachment; filename="slide.png"');
      res.setHeader('Content-Length', slideBuffers[0].length);
      return res.status(200).send(slideBuffers[0]);
    }

    // ---------------------------------------------------------------------------
    // PDF mode — embed PNGs into a pdf-lib document
    // Page size: 960×540 pt (perfect 16:9 at 13.33" × 7.5")
    // ---------------------------------------------------------------------------
    const PAGE_WIDTH_PT  = 960;
    const PAGE_HEIGHT_PT = 540;

    const { PDFDocument } = await import('pdf-lib');

    const pdfDoc = await PDFDocument.create();
    pdfDoc.setTitle('Presentation');
    pdfDoc.setCreator('Volute PDF Engine');

    for (let i = 0; i < slideBuffers.length; i++) {
      const pngImage = await pdfDoc.embedPng(slideBuffers[i]);
      const page = pdfDoc.addPage([PAGE_WIDTH_PT, PAGE_HEIGHT_PT]);
      page.drawImage(pngImage, { x: 0, y: 0, width: PAGE_WIDTH_PT, height: PAGE_HEIGHT_PT });
      console.log(`[pdf] Embedded slide ${i + 1} into PDF`);
    }

    const pdfBytes  = await pdfDoc.save();
    const pdfBuffer = Buffer.from(pdfBytes);

    console.log(`[pdf] Output PDF:`, JSON.stringify({
      pages: slideArray.length,
      pdfSizeKb: (pdfBuffer.length / 1024).toFixed(1),
      pageDimensions: `${PAGE_WIDTH_PT}x${PAGE_HEIGHT_PT}pt`,
      screenshotSizes: slideBuffers.map((b, idx) => ({
        slide: idx + 1,
        sizeKb: (b.length / 1024).toFixed(1),
      })),
    }));

    console.log(`[pdf] Complete: ${pdfBuffer.length} bytes, ${slideArray.length} page(s)`);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="presentation.pdf"');
    res.setHeader('Content-Length', pdfBuffer.length);
    return res.status(200).send(pdfBuffer);

  } catch (error: any) {
    console.error('[pdf] Error:', error.message);
    if (browser) {
      try { await browser.close(); } catch { /* ignore */ }
    }
    return res.status(500).json({
      error: error.message,
      details: error.stack,
    });
  }
}