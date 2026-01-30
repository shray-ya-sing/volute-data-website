#!/usr/bin/env node

import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync, statSync } from 'fs';
import { join, basename } from 'path';
import { Readability } from '@mozilla/readability';
import { JSDOM } from 'jsdom';

/**
 * Cleans HTML files by removing ads, popups, and extracting main content using Mozilla Readability
 *
 * Usage:
 * tsx scripts/clean-articles.ts <input-dir> [output-dir]
 * tsx scripts/clean-articles.ts <input-file.html> [output-file.html]
 */

interface CleanOptions {
  debug?: boolean;
  preserveImages?: boolean;
  preserveLinks?: boolean;
}

/**
 * Removes common ad and popup elements before Readability processing
 */
function removeAdsAndPopups(document: Document): void {
  // Common ad/popup selectors
  const adSelectors = [
    // Ads
    '[class*="ad-"]', '[class*="ads-"]', '[class*="advertisement"]',
    '[id*="ad-"]', '[id*="ads-"]', '[id*="advertisement"]',
    '.ad', '.ads', '.adsbygoogle', '.advertisement',
    'iframe[src*="doubleclick"]', 'iframe[src*="googlesyndication"]',
    'iframe[src*="advertising"]', 'iframe[src*="/ads/"]',

    // Popups and overlays
    '[class*="popup"]', '[class*="modal"]', '[class*="overlay"]',
    '[class*="newsletter"]', '[class*="subscribe"]',
    '[id*="popup"]', '[id*="modal"]', '[id*="overlay"]',
    '.popup', '.modal', '.overlay', '.lightbox',

    // Cookie banners
    '[class*="cookie"]', '[class*="gdpr"]', '[class*="consent"]',
    '#cookie-banner', '#gdpr-banner', '.cookie-notice',

    // Social media bars
    '[class*="social-share"]', '[class*="share-buttons"]',
    '.social-bar', '.share-bar',

    // Related articles / recommendations (often contain ads)
    '[class*="recommended"]', '[class*="related"]', '[class*="outbrain"]',
    '[class*="taboola"]', '.recommendations',

    // Paywalls
    '[class*="paywall"]', '[class*="subscription-wall"]',
    '#paywall', '.paywall-overlay',

    // Sticky headers/footers that might contain ads
    '[class*="sticky-ad"]', '[class*="fixed-ad"]',
  ];

  let removedCount = 0;
  adSelectors.forEach(selector => {
    try {
      const elements = document.querySelectorAll(selector);
      elements.forEach(el => {
        el.remove();
        removedCount++;
      });
    } catch (error) {
      // Invalid selector, skip
    }
  });

  console.log(`  Removed ${removedCount} ad/popup elements`);
}

/**
 * Cleans a single HTML file
 */
function cleanHtmlFile(
  inputPath: string,
  outputPath: string,
  options: CleanOptions = {}
): boolean {
  try {
    console.log(`\nProcessing: ${basename(inputPath)}`);

    const html = readFileSync(inputPath, 'utf-8');
    const dom = new JSDOM(html, { url: 'https://example.com' });
    const document = dom.window.document;

    // Remove ads and popups first
    removeAdsAndPopups(document);

    // Use Readability to extract clean content
    const reader = new Readability(document, {
      debug: options.debug,
      keepClasses: false,
    });

    const article = reader.parse();

    if (!article) {
      console.log(`  ✗ Failed to extract article content`);
      return false;
    }

    // Build clean HTML
    const cleanHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${article.title || 'Article'}</title>
  <style>
    body {
      max-width: 800px;
      margin: 40px auto;
      padding: 0 20px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
    }
    h1 {
      margin-bottom: 10px;
      color: #111;
    }
    .byline {
      color: #666;
      font-size: 14px;
      margin-bottom: 20px;
    }
    .excerpt {
      font-style: italic;
      color: #555;
      margin-bottom: 30px;
      padding: 15px;
      background: #f5f5f5;
      border-left: 4px solid #ddd;
    }
    .content {
      font-size: 16px;
    }
    .content img {
      max-width: 100%;
      height: auto;
      display: block;
      margin: 20px auto;
    }
    .content a {
      color: #0066cc;
      text-decoration: none;
    }
    .content a:hover {
      text-decoration: underline;
    }
    .content pre {
      background: #f5f5f5;
      padding: 15px;
      overflow-x: auto;
      border-radius: 4px;
    }
    .content code {
      background: #f5f5f5;
      padding: 2px 6px;
      border-radius: 3px;
      font-family: 'Courier New', monospace;
    }
  </style>
</head>
<body>
  <article>
    <h1>${article.title}</h1>
    ${article.byline ? `<div class="byline">${article.byline}</div>` : ''}
    ${article.excerpt ? `<div class="excerpt">${article.excerpt}</div>` : ''}
    <div class="content">
      ${article.content}
    </div>
  </article>
</body>
</html>`;

    writeFileSync(outputPath, cleanHtml, 'utf-8');
    console.log(`  ✓ Cleaned successfully`);
    console.log(`  Title: ${article.title}`);
    console.log(`  Length: ${article.length} characters`);

    return true;
  } catch (error) {
    console.error(`  ✗ Error: ${error instanceof Error ? error.message : String(error)}`);
    return false;
  }
}

/**
 * Process a directory of HTML files
 */
function cleanDirectory(inputDir: string, outputDir: string, options: CleanOptions = {}): void {
  if (!existsSync(inputDir)) {
    console.error(`Error: Input directory not found: ${inputDir}`);
    process.exit(1);
  }

  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
    console.log(`Created output directory: ${outputDir}`);
  }

  const files = readdirSync(inputDir)
    .filter(file => file.endsWith('.html'))
    .map(file => join(inputDir, file));

  if (files.length === 0) {
    console.error('Error: No HTML files found in input directory');
    process.exit(1);
  }

  console.log(`\nCleaning ${files.length} HTML files from ${inputDir}`);
  console.log(`Output directory: ${outputDir}\n`);

  const results = files.map(inputPath => {
    const filename = basename(inputPath);
    const outputPath = join(outputDir, filename);
    const success = cleanHtmlFile(inputPath, outputPath, options);
    return { file: filename, success };
  });

  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('CLEANING SUMMARY');
  console.log('='.repeat(60));
  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  console.log(`Total: ${results.length}`);
  console.log(`Successful: ${successful}`);
  console.log(`Failed: ${failed}`);

  if (failed > 0) {
    console.log('\nFailed files:');
    results.filter(r => !r.success).forEach(r => {
      console.log(`  - ${r.file}`);
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
  tsx scripts/clean-articles.ts <input-dir> [output-dir]
  tsx scripts/clean-articles.ts <input-file.html> [output-file.html]

Arguments:
  input-dir/file    Directory containing HTML files or single HTML file
  output-dir/file   Directory to save cleaned files or output file (default: ./cleaned-articles)

Features:
  - Removes ads, popups, cookie banners, and overlays
  - Extracts main article content using Mozilla Readability
  - Generates clean, readable HTML with proper styling
  - Preserves article images and links

Examples:
  tsx scripts/clean-articles.ts ./singlefile-downloads
  tsx scripts/clean-articles.ts ./singlefile-downloads ./cleaned
  tsx scripts/clean-articles.ts ./raw/article.html ./clean/article.html

Prerequisites:
  npm install jsdom @mozilla/readability @types/jsdom --save-dev
`);
    process.exit(0);
  }

  const input = args[0];
  const inputStat = statSync(input);

  if (inputStat.isDirectory()) {
    // Process directory
    const outputDir = args[1] || './cleaned-articles';
    cleanDirectory(input, outputDir);
  } else if (inputStat.isFile() && input.endsWith('.html')) {
    // Process single file
    const outputPath = args[1] || input.replace('.html', '.cleaned.html');
    cleanHtmlFile(input, outputPath);
  } else {
    console.error('Error: Input must be a directory or HTML file');
    process.exit(1);
  }
}

main();
