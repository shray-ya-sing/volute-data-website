#!/usr/bin/env node

import { spawn } from 'child_process';
import { existsSync, mkdirSync, readFileSync } from 'fs';
import { join } from 'path';

/**
 * Downloads URLs using SingleFile CLI and saves them to a local directory
 *
 * Usage:
 * 1. With URLs file: tsx scripts/download-with-singlefile.ts <urls-file> [output-dir]
 * 2. With inline URLs: tsx scripts/download-with-singlefile.ts --urls "url1,url2,url3" [output-dir]
 *
 * Prerequisites:
 * - Install SingleFile CLI: npm install -g single-file-cli
 * - Or use npx: npx single-file-cli
 */

interface DownloadOptions {
  urls: string[];
  outputDir: string;
  maxConcurrent?: number;
}

/**
 * Downloads a single URL using SingleFile CLI
 */
async function downloadUrl(url: string, outputDir: string): Promise<void> {
  return new Promise((resolve, reject) => {
    // Generate filename from URL
    const urlObj = new URL(url);
    const filename = `${urlObj.hostname}${urlObj.pathname.replace(/\//g, '_')}${urlObj.search.replace(/\?/g, '_')}`.replace(/[^a-zA-Z0-9._-]/g, '_') + '.html';
    const outputPath = join(outputDir, filename);

    console.log(`Downloading: ${url}`);
    console.log(`Output: ${outputPath}`);

    // Run SingleFile CLI
    const singleFile = spawn('npx', ['single-file-cli', url, outputPath], {
      stdio: 'inherit',
      shell: true
    });

    singleFile.on('close', (code) => {
      if (code === 0) {
        console.log(`✓ Successfully downloaded: ${url}`);
        resolve();
      } else {
        console.error(`✗ Failed to download: ${url} (exit code: ${code})`);
        reject(new Error(`Failed to download ${url}`));
      }
    });

    singleFile.on('error', (error) => {
      console.error(`✗ Error downloading ${url}:`, error);
      reject(error);
    });
  });
}

/**
 * Downloads multiple URLs with concurrency control
 */
async function downloadUrls(options: DownloadOptions): Promise<void> {
  const { urls, outputDir, maxConcurrent = 3 } = options;

  // Create output directory if it doesn't exist
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
    console.log(`Created output directory: ${outputDir}`);
  }

  console.log(`\nDownloading ${urls.length} URLs to ${outputDir}`);
  console.log(`Max concurrent downloads: ${maxConcurrent}\n`);

  // Process URLs in batches
  const results: { url: string; success: boolean; error?: string }[] = [];

  for (let i = 0; i < urls.length; i += maxConcurrent) {
    const batch = urls.slice(i, i + maxConcurrent);
    console.log(`\nProcessing batch ${Math.floor(i / maxConcurrent) + 1}/${Math.ceil(urls.length / maxConcurrent)}`);

    const promises = batch.map(async (url) => {
      try {
        await downloadUrl(url, outputDir);
        results.push({ url, success: true });
      } catch (error) {
        results.push({
          url,
          success: false,
          error: error instanceof Error ? error.message : String(error)
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
  tsx scripts/download-with-singlefile.ts <urls-file> [output-dir]
  tsx scripts/download-with-singlefile.ts --urls "url1,url2,url3" [output-dir]

Arguments:
  urls-file     Path to a text file with one URL per line
  --urls        Comma-separated list of URLs
  output-dir    Directory to save downloaded files (default: ./singlefile-downloads)

Examples:
  tsx scripts/download-with-singlefile.ts urls.txt
  tsx scripts/download-with-singlefile.ts urls.txt ./my-downloads
  tsx scripts/download-with-singlefile.ts --urls "https://example.com,https://google.com"

Prerequisites:
  npm install -g single-file-cli
  OR the script will use npx to run single-file-cli
`);
    process.exit(0);
  }

  let urls: string[] = [];
  let outputDir = './singlefile-downloads';

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
      maxConcurrent: 3
    });
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

// Run main function
main();
