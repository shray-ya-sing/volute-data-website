/**
 * test-reference-images.ts
 *
 * Tests the reference image fetching logic from generate-slide.ts in isolation.
 * Run with: npx ts-node test-reference-images.ts
 *
 * Set BLOB_BASE_URL in your shell before running:
 *   BLOB_BASE_URL=https://xxxx.public.blob.vercel-storage.com npx ts-node test-reference-images.ts
 *
 * Or create a .env file and use:
 *   npx ts-node -r dotenv/config test-reference-images.ts
 */

const BLOB_BASE_URL = process.env.BLOB_BASE_URL;
const FETCH_TIMEOUT_MS = 8000;

const CATEGORIES = [
  'title',
  'table_of_contents',
  'section_divider',
  'executive_summary',
  'market_overview',
  'company_overview',
  'peer_benchmarking',
  'precedent_transactions',
  'strategic_alternatives',
  'valuation_football_field',
  'financial_model',
  'wacc_analysis',
  'process_timeline',
  'logo_splash',
  'stock_performance',
] as const;

type TemplateCategory = typeof CATEGORIES[number];

// ── Helpers ────────────────────────────────────────────────────────────────

function pad(s: string, n: number) {
  return s.length >= n ? s : s + ' '.repeat(n - s.length);
}

function kb(bytes: number) {
  return `${(bytes / 1024).toFixed(1)} KB`;
}

async function fetchWithTimeout(url: string): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: controller.signal });
    return res;
  } finally {
    clearTimeout(timer);
  }
}

// ── Env check ──────────────────────────────────────────────────────────────

function checkEnv(): boolean {
  console.log('\n══════════════════════════════════════════════════');
  console.log('  Volute — Reference Image Fetch Test');
  console.log('══════════════════════════════════════════════════\n');

  if (!BLOB_BASE_URL) {
    console.error('❌  BLOB_BASE_URL is not set.\n');
    console.error('    Set it before running:');
    console.error('    BLOB_BASE_URL=https://xxxx.public.blob.vercel-storage.com npx ts-node test-reference-images.ts\n');
    return false;
  }

  try {
    new URL(BLOB_BASE_URL);
  } catch {
    console.error(`❌  BLOB_BASE_URL is not a valid URL: "${BLOB_BASE_URL}"\n`);
    return false;
  }

  console.log(`✅  BLOB_BASE_URL = ${BLOB_BASE_URL}\n`);
  return true;
}

// ── Single image test ──────────────────────────────────────────────────────

interface ImageResult {
  url: string;
  status: 'ok' | 'not_found' | 'error' | 'timeout';
  httpStatus?: number;
  sizeBytes?: number;
  errorMessage?: string;
  ms: number;
}

async function testImage(url: string): Promise<ImageResult> {
  const t0 = Date.now();
  try {
    const res = await fetchWithTimeout(url);
    const ms = Date.now() - t0;

    if (!res.ok) {
      return { url, status: 'not_found', httpStatus: res.status, ms };
    }

    const buffer = await res.arrayBuffer();
    return { url, status: 'ok', httpStatus: res.status, sizeBytes: buffer.byteLength, ms };

  } catch (err: any) {
    const ms = Date.now() - t0;
    if (err.name === 'AbortError') {
      return { url, status: 'timeout', errorMessage: `Timed out after ${FETCH_TIMEOUT_MS}ms`, ms };
    }
    return { url, status: 'error', errorMessage: err.message, ms };
  }
}

// ── Category test ──────────────────────────────────────────────────────────

interface CategoryResult {
  category: TemplateCategory;
  images: ImageResult[];
  found: number;
}

async function testCategory(category: TemplateCategory): Promise<CategoryResult> {
  const urls = [1, 2, 3].map(
    (n) => `${BLOB_BASE_URL}/slide-templates/${category}_${n}.jpg`,
  );

  const images = await Promise.all(urls.map(testImage));
  const found = images.filter((r) => r.status === 'ok').length;

  return { category, images, found };
}

// ── Report ─────────────────────────────────────────────────────────────────

function printCategoryResult(r: CategoryResult) {
  const icon = r.found === 3 ? '✅' : r.found > 0 ? '⚠️ ' : '❌';
  console.log(`${icon}  ${pad(r.category, 28)} ${r.found}/3 images found`);

  for (let i = 0; i < r.images.length; i++) {
    const img = r.images[i];
    const n = i + 1;
    const filename = `${r.category}_${n}.jpg`;

    if (img.status === 'ok') {
      console.log(`       ${n}. ✓ ${pad(filename, 40)} ${kb(img.sizeBytes!)}  (${img.ms}ms)`);
    } else if (img.status === 'not_found') {
      console.log(`       ${n}. ✗ ${pad(filename, 40)} HTTP ${img.httpStatus} — not uploaded yet`);
    } else if (img.status === 'timeout') {
      console.log(`       ${n}. ✗ ${pad(filename, 40)} TIMEOUT after ${FETCH_TIMEOUT_MS}ms — check blob store connectivity`);
    } else {
      console.log(`       ${n}. ✗ ${pad(filename, 40)} ERROR: ${img.errorMessage}`);
    }
  }
}

function printSummary(results: CategoryResult[]) {
  const totalImages = results.length * 3;
  const foundImages = results.reduce((sum, r) => sum + r.found, 0);
  const completeCategories = results.filter((r) => r.found === 3).length;
  const partialCategories = results.filter((r) => r.found > 0 && r.found < 3).length;
  const emptyCategories = results.filter((r) => r.found === 0).length;

  const hasTimeouts = results.some((r) =>
    r.images.some((img) => img.status === 'timeout'),
  );
  const hasErrors = results.some((r) =>
    r.images.some((img) => img.status === 'error'),
  );

  console.log('\n══════════════════════════════════════════════════');
  console.log('  Summary');
  console.log('══════════════════════════════════════════════════');
  console.log(`  Images found:          ${foundImages} / ${totalImages}`);
  console.log(`  Complete categories:   ${completeCategories} / ${results.length}`);
  console.log(`  Partial categories:    ${partialCategories}`);
  console.log(`  Empty categories:      ${emptyCategories}`);

  if (hasTimeouts) {
    console.log('\n  ⚠️  TIMEOUTS detected — blob store is reachable but slow,');
    console.log('     or Vercel egress to blob domain is restricted.');
    console.log('     Check: https://vercel.com/docs/storage/vercel-blob');
  }

  if (hasErrors) {
    console.log('\n  ❌  NETWORK ERRORS detected — blob store may be unreachable.');
    console.log('     Check BLOB_BASE_URL domain and public access settings.');
  }

  if (!hasTimeouts && !hasErrors && foundImages === 0) {
    console.log('\n  ℹ️  No images uploaded yet. The env var and domain are reachable');
    console.log('     (all failures are HTTP 404, not network errors).');
    console.log('     Upload images to blob store to activate reference image logic.');
  }

  if (foundImages === totalImages) {
    console.log('\n  🎉  All reference images are in place and reachable.');
  }

  // Missing files list for easy copy-paste upload reference
  const missing = results.flatMap((r) =>
    r.images
      .map((img, i) => ({ result: img, filename: `slide-templates/${r.category}_${i + 1}.jpg` }))
      .filter(({ result }) => result.status === 'not_found')
      .map(({ filename }) => filename),
  );

  if (missing.length > 0) {
    console.log(`\n  Missing files (${missing.length}):`);
    missing.forEach((f) => console.log(`    ${f}`));
  }

  console.log('');
}

// ── Main ───────────────────────────────────────────────────────────────────

async function main() {
  if (!checkEnv()) process.exit(1);

  // Test a single category first (precedent_transactions) as a fast connectivity check
  console.log('── Quick connectivity check (precedent_transactions) ──\n');
  const quickResult = await testCategory('precedent_transactions');
  printCategoryResult(quickResult);

  const hasConnectivity = quickResult.images.some(
    (r) => r.status === 'ok' || r.status === 'not_found',
  );

  if (!hasConnectivity) {
    console.log('\n❌  Cannot reach blob store. Aborting full test.');
    console.log('    Check BLOB_BASE_URL and Vercel blob public access settings.\n');
    process.exit(1);
  }

  // Full test across all categories
  console.log('\n── Full category scan ────────────────────────────\n');

  const results: CategoryResult[] = [quickResult];

  for (const category of CATEGORIES) {
    if (category === 'precedent_transactions') continue; // already done
    const result = await testCategory(category);
    printCategoryResult(result);
    results.push(result);
  }

  // Re-insert in original order for summary
  const ordered = CATEGORIES.map(
    (c) => results.find((r) => r.category === c)!,
  );

  printSummary(ordered);
}

main().catch((err) => {
  console.error('\n❌  Unexpected error:', err.message);
  process.exit(1);
});
