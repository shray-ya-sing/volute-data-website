#!/usr/bin/env tsx
/**
 * Upload all 424B4 filing PDFs to Vercel Blob Storage
 */

import { put } from '@vercel/blob';
import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';
import dotenv from 'dotenv';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

// Check for required environment variable
const BLOB_TOKEN = process.env.BLOB_READ_WRITE_TOKEN;
if (!BLOB_TOKEN) {
  console.error('ERROR: BLOB_READ_WRITE_TOKEN environment variable is required');
  console.error('Get your token from: https://vercel.com/dashboard -> Settings -> Tokens');
  console.error('Or run: vercel env pull .env.local');
  process.exit(1);
}

// Directory containing the PDFs
const PDF_DIR = path.join(process.cwd(), '424B4_filings_pdf/2023');
const ABSOLUTE_PDF_DIR = path.resolve(PDF_DIR);

// Progress tracking file
const PROGRESS_FILE = path.join(process.cwd(), 'blob-upload-progress.json');

interface UploadProgress {
  lastProcessedIndex: number;
  uploadedFiles: string[];
  failedFiles: Array<{ filename: string; error: string }>;
}

function loadProgress(): UploadProgress {
  if (fs.existsSync(PROGRESS_FILE)) {
    return JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf-8'));
  }
  return {
    lastProcessedIndex: -1,
    uploadedFiles: [],
    failedFiles: []
  };
}

function saveProgress(progress: UploadProgress): void {
  fs.writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2));
}

async function uploadPDFs() {
  console.log('Starting PDF upload to Vercel Blob Storage');
  console.log('=' .repeat(70));
  console.log(`Source directory: ${ABSOLUTE_PDF_DIR}`);
  console.log();

  // Check if directory exists
  if (!fs.existsSync(ABSOLUTE_PDF_DIR)) {
    console.error(`ERROR: Directory not found: ${ABSOLUTE_PDF_DIR}`);
    console.error('Run download_424b4_free.py and convert_html_to_pdf_playwright.py first to download and convert the PDFs');
    process.exit(1);
  }

  // Get all PDF files
  const allFiles = fs.readdirSync(ABSOLUTE_PDF_DIR)
    .filter(f => f.endsWith('.pdf'))
    .sort(); // Sort for consistent ordering

  if (allFiles.length === 0) {
    console.log('No PDF files found in directory');
    return;
  }

  // Load progress
  const progress = loadProgress();

  console.log(`Found ${allFiles.length} PDF files total`);
  console.log(`Already uploaded: ${progress.uploadedFiles.length}`);
  console.log(`Previously failed: ${progress.failedFiles.length}`);

  // Files to process (skip already uploaded)
  const filesToProcess = allFiles.filter(f => !progress.uploadedFiles.includes(f));

  if (filesToProcess.length === 0) {
    console.log('\nAll files have already been uploaded!');
    console.log(`\nSummary saved to: ${path.join(process.cwd(), 'blob-upload-all-results.json')}`);
    return;
  }

  console.log(`Remaining to upload: ${filesToProcess.length}\n`);

  const confirm = await new Promise<string>((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    rl.question(
      `This will upload ${filesToProcess.length} files. Estimated time: ~${Math.ceil(filesToProcess.length * 3 / 60)} minutes.\nContinue? (yes/no): `,
      (answer: string) => {
        rl.close();
        resolve(answer.trim().toLowerCase());
      }
    );
  });

  if (confirm !== 'yes') {
    console.log('Upload cancelled');
    return;
  }

  console.log('\nStarting upload...\n');

  const results: Array<{
    filename: string;
    ticker: string;
    filedDate: string;
    url: string;
    pathname: string;
    size: number;
    status: 'success' | 'error';
    error?: string;
  }> = [];

  let uploadCount = 0;
  const startTime = Date.now();

  for (let i = 0; i < filesToProcess.length; i++) {
    const filename = filesToProcess[i];
    const filepath = path.join(ABSOLUTE_PDF_DIR, filename);

    // Extract ticker and date from filename (e.g., "TTAN_2024-12-12_0001193125_24_277099.pdf")
    const parts = filename.replace('.pdf', '').split('_');
    const ticker = parts[0] || 'UNKNOWN';
    const filedDate = parts[1] || 'UNKNOWN';

    console.log(`[${i + 1}/${filesToProcess.length}] ${ticker} - ${filename}`);

    try {
      // Read file
      const fileBuffer = fs.readFileSync(filepath);
      const fileSize = fileBuffer.length;

      console.log(`  Size: ${(fileSize / 1024 / 1024).toFixed(2)} MB`);

      // Upload to Vercel Blob
      const blobPath = `filings/424b4/${filename}`;

      const blob = await put(blobPath, fileBuffer, {
        access: 'public',
        token: BLOB_TOKEN,
        contentType: 'application/pdf',
      });

      console.log(`  SUCCESS: ${blob.url.substring(0, 60)}...`);

      results.push({
        filename,
        ticker,
        filedDate,
        url: blob.url,
        pathname: blob.pathname,
        size: fileSize,
        status: 'success',
      });

      progress.uploadedFiles.push(filename);
      uploadCount++;

      // Save progress every 10 files
      if (uploadCount % 10 === 0) {
        saveProgress(progress);
        console.log(`  Progress saved (${uploadCount} uploaded so far)`);
      }

      // Rate limiting - add delay between uploads
      await new Promise(resolve => setTimeout(resolve, 1500));

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error(`  ERROR: ${errorMsg}`);

      results.push({
        filename,
        ticker,
        filedDate,
        url: '',
        pathname: '',
        size: 0,
        status: 'error',
        error: errorMsg,
      });

      progress.failedFiles.push({ filename, error: errorMsg });
    }

    console.log();
  }

  // Final progress save
  saveProgress(progress);

  const endTime = Date.now();
  const durationMinutes = ((endTime - startTime) / 1000 / 60).toFixed(1);

  // Summary
  console.log('=' .repeat(70));
  console.log('UPLOAD SUMMARY');
  console.log('=' .repeat(70));

  const successful = results.filter(r => r.status === 'success');
  const failed = results.filter(r => r.status === 'error');

  console.log(`Total processed: ${results.length}`);
  console.log(`Successful: ${successful.length}`);
  console.log(`Failed: ${failed.length}`);
  console.log(`Total uploaded (all time): ${progress.uploadedFiles.length}`);
  console.log(`Duration: ${durationMinutes} minutes`);
  console.log();

  if (failed.length > 0) {
    console.log('Failed uploads:');
    failed.forEach(r => {
      console.log(`  - ${r.filename}: ${r.error}`);
    });
    console.log();
  }

  // Calculate total uploaded size
  const totalSize = successful.reduce((sum, r) => sum + r.size, 0);
  console.log(`Size uploaded this session: ${(totalSize / 1024 / 1024).toFixed(1)} MB`);
  console.log();

  // Save results
  const outputFile = path.join(process.cwd(), 'blob-upload-all-results.json');

  // Load existing results if they exist
  let allResults = results;
  if (fs.existsSync(outputFile)) {
    const existing = JSON.parse(fs.readFileSync(outputFile, 'utf-8'));
    allResults = [...existing, ...results];
  }

  fs.writeFileSync(outputFile, JSON.stringify(allResults, null, 2));
  console.log(`Results saved to: ${outputFile}`);

  // Create/update CSV
  const csvFile = path.join(process.cwd(), 'blob-upload-all-results.csv');
  const csvLines = [
    'Filename,Ticker,Filed Date,Blob URL,Blob Pathname,Size (MB),Status,Error',
    ...allResults.map(r => {
      const sizeMB = (r.size / 1024 / 1024).toFixed(2);
      const error = r.error || '';
      return `${r.filename},${r.ticker},${r.filedDate},${r.url},${r.pathname},${sizeMB},${r.status},"${error}"`;
    })
  ];

  fs.writeFileSync(csvFile, csvLines.join('\n'));
  console.log(`CSV saved to: ${csvFile}`);

  console.log();
  console.log('Upload complete!');

  if (filesToProcess.length > successful.length) {
    console.log('\nSome files failed. You can re-run this script to retry failed uploads.');
  }
}

// Run the upload
uploadPDFs().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
