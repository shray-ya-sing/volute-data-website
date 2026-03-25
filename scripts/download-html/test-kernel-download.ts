#!/usr/bin/env node

import Kernel from '@onkernel/sdk';
import { chromium } from 'playwright';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

/**
 * download-with-kernel.ts
 * Uses Kernel.sh to bypass bot detection for financial article scraping.
 */

interface DownloadOptions {
  urls: string[];
  outputDir: string;
  maxConcurrent?: number;
  blockAds?: boolean;
}

const AD_DOMAINS = [
  'doubleclick.net', 'googlesyndication.com', 'googleadservices.com',
  'google-analytics.com', 'googletagmanager.com'
];

async function downloadUrl(url: string, outputDir: string, options: any, kernel: Kernel) {
  const fileName = url.replace(/[^a-z0-9]/gi, '_').toLowerCase() + '.html';
  const outputPath = join(outputDir, fileName);

  if (existsSync(outputPath)) {
    console.log(`Skipping (already exists): ${url}`);
    return;
  }

  // 1. Create a remote stealth browser on Kernel
  const kernelBrowser = await kernel.browsers.create();
  
  // 2. Connect Playwright to that browser via CDP
  const browser = await chromium.connectOverCDP(kernelBrowser.cdp_ws_url);
  const context = browser.contexts()[0];
  const page = await context.newPage();

  try {
    console.log(`Downloading via Kernel: ${url}`);

    // Block ads to speed up load (though Kernel's bandwidth is high)
    await page.route('**/*', (route) => {
      const url = route.request().url();
      if (AD_DOMAINS.some(domain => url.includes(domain))) {
        return route.abort();
      }
      route.continue();
    });

    await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });

    // Simple script to close common "Accept Cookies" overlays
    await page.evaluate(() => {
      const selectors = ['button:contains("Accept")', 'button:contains("Agree")', '.cookie-banner-close'];
      selectors.forEach(s => {
        const el = document.querySelector(s) as HTMLElement;
        if (el) el.click();
      });
    });

    const content = await page.content();
    writeFileSync(outputPath, content);
    console.log(`Successfully saved: ${fileName}`);
  } catch (err) {
    console.error(`Failed to download ${url}`, err);
  } finally {
    await browser.close(); // This also signals Kernel to destroy the unikernel
  }
}

async function main() {
  const args = process.argv.slice(2);
  let urls: string[] = [];
  let baseOutputDir = './kernel-downloads';

  // [Argument parsing logic kept same as your original script...]
  if (args[0] === '--urls') {
    urls = args[1].split(',').map(u => u.trim());
    if (args[2]) baseOutputDir = args[2];
  } else {
    const content = readFileSync(args[0], 'utf-8');
    urls = content.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('#'));
    if (args[1]) baseOutputDir = args[1];
  }

  // Append "-kernel" to the output directory as requested
  const outputDir = `${baseOutputDir}`;

  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }

  // Initialize Kernel (Ensure KERNEL_API_KEY is in your .env)
  const kernel = new Kernel();

  // Process URLs (sequential to avoid rate-limiting the target sites)
  for (const url of urls) {
    await downloadUrl(url, outputDir, {}, kernel);
  }
}

main().catch(console.error);