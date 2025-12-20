#!/usr/bin/env tsx
/**
 * Upload 424B4 filing PDFs to Vercel Blob Storage
 */

import { put } from '@vercel/blob';
import * as fs from 'fs';
import * as path from 'path';
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
const PDF_DIR = path.join('..', 'fin_data_project', '424B4_filings');
const ABSOLUTE_PDF_DIR = path.resolve(PDF_DIR);

async function uploadPDFs() {
  console.log('Starting PDF upload to Vercel Blob Storage');
  console.log('=' .repeat(70));
  console.log(`Source directory: ${ABSOLUTE_PDF_DIR}`);
  console.log();

  // Check if directory exists
  if (!fs.existsSync(ABSOLUTE_PDF_DIR)) {
    console.error(`ERROR: Directory not found: ${ABSOLUTE_PDF_DIR}`);
    process.exit(1);
  }

  // Get all PDF files
  const files = fs.readdirSync(ABSOLUTE_PDF_DIR).filter(f => f.endsWith('.pdf'));

  if (files.length === 0) {
    console.log('No PDF files found in directory');
    return;
  }

  console.log(`Found ${files.length} PDF files to upload\n`);

  const results: Array<{
    filename: string;
    url: string;
    pathname: string;
    size: number;
    status: 'success' | 'error';
    error?: string;
  }> = [];

  for (let i = 0; i < files.length; i++) {
    const filename = files[i];
    const filepath = path.join(ABSOLUTE_PDF_DIR, filename);

    console.log(`[${i + 1}/${files.length}] Uploading: ${filename}`);

    try {
      // Read file
      const fileBuffer = fs.readFileSync(filepath);
      const fileSize = fileBuffer.length;

      console.log(`  Size: ${(fileSize / 1024 / 1024).toFixed(2)} MB`);

      // Upload to Vercel Blob
      // Store in a 'filings/424b4/' prefix for organization
      const blobPath = `filings/424b4/${filename}`;

      const blob = await put(blobPath, fileBuffer, {
        access: 'public',
        token: BLOB_TOKEN,
        contentType: 'application/pdf',
      });

      console.log(`  SUCCESS: ${blob.url}`);
      console.log(`  Pathname: ${blob.pathname}`);

      results.push({
        filename,
        url: blob.url,
        pathname: blob.pathname,
        size: fileSize,
        status: 'success',
      });

    } catch (error) {
      console.error(`  ERROR: ${error instanceof Error ? error.message : String(error)}`);
      results.push({
        filename,
        url: '',
        pathname: '',
        size: 0,
        status: 'error',
        error: error instanceof Error ? error.message : String(error),
      });
    }

    console.log();
  }

  // Summary
  console.log('=' .repeat(70));
  console.log('UPLOAD SUMMARY');
  console.log('=' .repeat(70));

  const successful = results.filter(r => r.status === 'success');
  const failed = results.filter(r => r.status === 'error');

  console.log(`Total files: ${files.length}`);
  console.log(`Successful: ${successful.length}`);
  console.log(`Failed: ${failed.length}`);
  console.log();

  if (successful.length > 0) {
    console.log('Successfully uploaded files:');
    successful.forEach(r => {
      console.log(`  - ${r.filename}`);
      console.log(`    URL: ${r.url}`);
    });
    console.log();
  }

  if (failed.length > 0) {
    console.log('Failed uploads:');
    failed.forEach(r => {
      console.log(`  - ${r.filename}: ${r.error}`);
    });
    console.log();
  }

  // Save results to JSON file for reference
  const outputFile = path.join(process.cwd(), 'blob-upload-results.json');
  fs.writeFileSync(outputFile, JSON.stringify(results, null, 2));
  console.log(`Results saved to: ${outputFile}`);

  // Also create a CSV for easy import
  const csvLines = [
    'Filename,Ticker,Filed Date,Blob URL,Blob Pathname,Size (MB),Status',
    ...results.map(r => {
      // Extract ticker from filename (e.g., "TTAN_2024-12-12_0001193125_24_277099.pdf")
      const parts = r.filename.replace('.pdf', '').split('_');
      const ticker = parts[0];
      const filedDate = parts[1];
      const sizeMB = (r.size / 1024 / 1024).toFixed(2);
      return `${r.filename},${ticker},${filedDate},${r.url},${r.pathname},${sizeMB},${r.status}`;
    })
  ];

  const csvFile = path.join(process.cwd(), 'blob-upload-results.csv');
  fs.writeFileSync(csvFile, csvLines.join('\n'));
  console.log(`CSV saved to: ${csvFile}`);
}

// Run the upload
uploadPDFs().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
