const payload = JSON.stringify({
  slides: [{ code: slideCode, slideNumber: 1 }],
  theme: {
    headingFont: 'Inter, sans-serif',
    bodyFont: 'Inter, sans-serif',
    accentColors: ['#1a2744', '#4a6fa5', '#8bb0d6'],
    headingTextColor: '#1a2744',
    bodyTextColor: '#333333',
    headingFontSize: 36,
    bodyFontSize: 14,
  },
  format: 'pdf',
});

const options: https.RequestOptions = {
  hostname: 'www.getvolute.com',
  port: 443,
  path: '/api/pdf',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(payload),
  },
};

console.log('[test] Sending slide to https://www.getvolute.com/api/pdf ...');
console.log('[test] Payload size:', (Buffer.byteLength(payload) / 1024).toFixed(1), 'KB');

const req = https.request(options, (res) => {
  console.log('[test] HTTP status:', res.statusCode);
  console.log('[test] Content-Type:', res.headers['content-type']);

  const chunks: Buffer[] = [];

  res.on('data', (chunk: Buffer) => chunks.push(chunk));

  res.on('end', () => {
    const body = Buffer.concat(chunks);
    const contentType = res.headers['content-type'] || '';

    if (res.statusCode === 200 && contentType.includes('application/pdf')) {
      const outputPath = path.resolve('./slide-output2.pdf');
      fs.writeFileSync(outputPath, body);
      console.log(`[test] ✅ PDF saved to: ${outputPath}`);
      console.log(`[test] PDF size: ${(body.length / 1024).toFixed(1)} KB`);
    } else {
      // Error response — print as JSON
      try {
        const json = JSON.parse(body.toString());
        console.error('[test] ❌ Error response:', JSON.stringify(json, null, 2));
      } catch {
        console.error('[test] ❌ Raw response:', body.toString().slice(0, 500));
      }
      process.exit(1);
    }
  });
});

req.on('error', (err) => {
  console.error('[test] ❌ Request failed:', err.message);
  if ((err as any).code === 'ECONNREFUSED') {
    console.error('[test] Is your server running on getvolute.com?');
  }
  process.exit(1);
});

// Set a generous timeout — Playwright can take 20-30s locally
req.setTimeout(120_000, () => {
  console.error('[test] ❌ Request timed out after 120s');
  req.destroy();
  process.exit(1);
});
