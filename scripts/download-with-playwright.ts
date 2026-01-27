#!/usr/bin/env node

import { chromium } from 'playwright';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

/**
 * Downloads URLs using Playwright with ad-blocking and popup handling
 *
 * This approach:
 * - Blocks ads and trackers at network level
 * - Handles cookie banners and popups automatically
 * - Waits for content to load properly
 * - Saves clean HTML with resources inlined
 *
 * Usage:
 * tsx scripts/download-with-playwright.ts <urls-file> [output-dir]
 * tsx scripts/download-with-playwright.ts --urls "url1,url2,url3" [output-dir]
 *
 * Prerequisites:
 * npm install playwright
 * npx playwright install chromium
 */

interface DownloadOptions {
  urls: string[];
  outputDir: string;
  maxConcurrent?: number;
  blockAds?: boolean;
  headless?: boolean;
  timeout?: number;
}

// Common ad/tracking domains to block
const AD_DOMAINS = [
  'doubleclick.net',
  'googlesyndication.com',
  'googleadservices.com',
  'google-analytics.com',
  'googletagmanager.com',
  'facebook.com/tr',
  'facebook.net',
  'twitter.com/i/adsct',
  'ads-twitter.com',
  'adservice.google.com',
  'advertising.com',
  'outbrain.com',
  'taboola.com',
  'pubmatic.com',
  'rubiconproject.com',
  'quantserve.com',
  'criteo.com',
  'adsrvr.org',
  'serving-sys.com',
  'chartbeat.com',
  'hotjar.com',
  'mouseflow.com',
];

/**
 * Downloads a single URL using Playwright
 */
async function downloadUrl(
  url: string,
  outputDir: string,
  options: { blockAds: boolean; timeout: number }
): Promise<void> {
  const browser = await chromium.launch({
    headless: options.blockAds,
  });

  try {
    const context = await browser.newContext({
      // Block ads at network level
      ...(options.blockAds && {
        permissions: [],
        extraHTTPHeaders: {
          'DNT': '1',
        },
      }),
    });

    // Setup ad blocking
    if (options.blockAds) {
      await context.route('**/*', (route) => {
        const url = route.request().url();
        const resourceType = route.request().resourceType();

        // Block known ad domains
        if (AD_DOMAINS.some(domain => url.includes(domain))) {
          route.abort();
          return;
        }

        // Block tracking scripts
        if (resourceType === 'script' && (
          url.includes('/ads/') ||
          url.includes('/ad/') ||
          url.includes('analytics') ||
          url.includes('tracking') ||
          url.includes('tracker')
        )) {
          route.abort();
          return;
        }

        route.continue();
      });
    }

    const page = await context.newPage();

    console.log(`Downloading: ${url}`);

    // Navigate to URL
    await page.goto(url, {
      waitUntil: 'networkidle',
      timeout: options.timeout,
    });

    // Wait for main content to be visible
    try {
      await page.waitForSelector('article, main, [role="main"], .content, .article', {
        timeout: 5000,
        state: 'visible',
      });
    } catch {
      // Continue even if main content selector not found
    }

    // Remove common popups and overlays
    await page.evaluate(() => {
      const selectors = [
        '[class*="popup"]',
        '[class*="modal"]',
        '[class*="overlay"]',
        '[class*="cookie"]',
        '[class*="gdpr"]',
        '[class*="consent"]',
        '[class*="newsletter"]',
        '[class*="subscribe"]',
        '[style*="position: fixed"]',
        '[style*="position:fixed"]',
      ];

      selectors.forEach(selector => {
        try {
          document.querySelectorAll(selector).forEach(el => {
            const htmlEl = el as HTMLElement;
            // Only remove if it's covering content (high z-index or overlay)
            const style = window.getComputedStyle(htmlEl);
            const zIndex = parseInt(style.zIndex);
            if (zIndex > 100 || style.position === 'fixed' ||
                htmlEl.className.toLowerCase().includes('overlay') ||
                htmlEl.className.toLowerCase().includes('modal') ||
                htmlEl.className.toLowerCase().includes('popup')) {
              htmlEl.remove();
            }
          });
        } catch (error) {
          // Skip invalid selectors
        }
      });

      // Re-enable scrolling if disabled
      document.body.style.overflow = 'auto';
      document.documentElement.style.overflow = 'auto';
    });

    // Get cleaned HTML
    const html = await page.content();

    // Generate filename from URL
    const urlObj = new URL(url);
    const filename = `${urlObj.hostname}${urlObj.pathname.replace(/\//g, '_')}${urlObj.search.replace(/\?/g, '_')}`
      .replace(/[^a-zA-Z0-9._-]/g, '_') + '.html';
    const outputPath = join(outputDir, filename);

    writeFileSync(outputPath, html, 'utf-8');
    console.log(`✓ Successfully downloaded: ${url}`);
    console.log(`  Output: ${outputPath}`);

    await page.close();
    await context.close();
  } finally {
    await browser.close();
  }
}

/**
 * Downloads multiple URLs with concurrency control
 */
async function downloadUrls(options: DownloadOptions): Promise<void> {
  const {
    urls,
    outputDir,
    maxConcurrent = 2,
    blockAds = true,
    timeout = 30000,
  } = options;

  // Create output directory if it doesn't exist
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
    console.log(`Created output directory: ${outputDir}`);
  }

  console.log(`\nDownloading ${urls.length} URLs to ${outputDir}`);
  console.log(`Max concurrent downloads: ${maxConcurrent}`);
  console.log(`Ad blocking: ${blockAds ? 'enabled' : 'disabled'}\n`);

  const results: { url: string; success: boolean; error?: string }[] = [];

  for (let i = 0; i < urls.length; i += maxConcurrent) {
    const batch = urls.slice(i, i + maxConcurrent);
    console.log(`\nProcessing batch ${Math.floor(i / maxConcurrent) + 1}/${Math.ceil(urls.length / maxConcurrent)}`);

    const promises = batch.map(async (url) => {
      try {
        await downloadUrl(url, outputDir, { blockAds, timeout });
        results.push({ url, success: true });
      } catch (error) {
        console.error(`✗ Failed to download: ${url}`);
        console.error(`  Error: ${error instanceof Error ? error.message : String(error)}`);
        results.push({
          url,
          success: false,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    });

    await Promise.all(promises);
  }

  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('DOWNLOAD SUMMARY');
  console.log('='.repeat(60));
  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  console.log(`Total: ${results.length}`);
  console.log(`Successful: ${successful}`);
  console.log(`Failed: ${failed}`);

  if (failed > 0) {
    console.log('\nFailed URLs:');
    results.filter(r => !r.success).forEach(r => {
      console.log(`  - ${r.url}`);
      if (r.error) console.log(`    Error: ${r.error}`);
    });
  }
}

/**
 * Main function
 */
async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    console.log(`
Usage:
  tsx scripts/download-with-playwright.ts <urls-file> [output-dir]
  tsx scripts/download-with-playwright.ts --urls "url1,url2,url3" [output-dir]

Arguments:
  urls-file     Path to a text file with one URL per line
  --urls        Comma-separated list of URLs
  output-dir    Directory to save downloaded files (default: ./playwright-downloads)

Features:
  - Blocks ads and trackers at network level
  - Automatically handles popups, modals, and cookie banners
  - Waits for content to load properly
  - Cleaner initial downloads compared to SingleFile

Examples:
  tsx scripts/download-with-playwright.ts urls.txt
  tsx scripts/download-with-playwright.ts urls.txt ./my-downloads
  tsx scripts/download-with-playwright.ts --urls "https://example.com,https://google.com"

Prerequisites:
  npm install playwright
  npx playwright install chromium
`);
    process.exit(0);
  }

  let urls: string[] = [];
  let outputDir = './playwright-downloads';

  // Parse arguments
  if (args[0] === '--urls') {
    if (args.length < 2) {
      console.error('Error: --urls requires a comma-separated list of URLs');
      process.exit(1);
    }
    urls = args[1].split(',').map(url => url.trim()).filter(url => url.length > 0);
    if (args.length > 2) {
      outputDir = args[2];
    }
  } else {
    // Read URLs from file
    const urlsFile = args[0];
    if (!existsSync(urlsFile)) {
      console.error(`Error: URLs file not found: ${urlsFile}`);
      process.exit(1);
    }

    const content = readFileSync(urlsFile, 'utf-8');
    urls = content
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0 && !line.startsWith('#'));

    if (args.length > 1) {
      outputDir = args[1];
    }
  }

  if (urls.length === 0) {
    console.error('Error: No URLs found');
    process.exit(1);
  }

  try {
    await downloadUrls({
      urls,
      outputDir,
      maxConcurrent: 2, // Lower concurrency for Playwright
      blockAds: true,
      timeout: 30000,
    });
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

main();
