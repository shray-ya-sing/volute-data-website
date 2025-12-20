#!/usr/bin/env tsx
/**
 * Upload extracted first 2 pages to Vercel Blob Storage
 */

import { put } from '@vercel/blob';
import * as fs from 'fs';
import * as path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const BLOB_TOKEN = process.env.BLOB_READ_WRITE_TOKEN;
if (!BLOB_TOKEN) {
  console.error('ERROR: BLOB_READ_WRITE_TOKEN environment variable is required');
  process.exit(1);
}

const EXTRACTED_DIR = path.join(process.cwd(), 'extracted-pages');

async function uploadExtractedPages() {
  console.log('Uploading extracted pages to Vercel Blob Storage');
  console.log('='.repeat(70));
  console.log();

  if (!fs.existsSync(EXTRACTED_DIR)) {
    console.error(`ERROR: ${EXTRACTED_DIR} not found`);
    console.error('Run: npm run extract:metrics first to extract pages');
    process.exit(1);
  }

  const files = fs.readdirSync(EXTRACTED_DIR).filter(f => f.endsWith('.pdf'));

  if (files.length === 0) {
    console.log('No PDF files found to upload');
    return;
  }

  console.log(`Found ${files.length} extracted PDFs to upload\n`);

  const results: Array<{
    filename: string;
    url: string;
    pathname: string;
    size: number;
  }> = [];

  for (let i = 0; i < files.length; i++) {
    const filename = files[i];
    const filepath = path.join(EXTRACTED_DIR, filename);

    console.log(`[${i + 1}/${files.length}] Uploading: ${filename}`);

    try {
      const fileBuffer = fs.readFileSync(filepath);
      const fileSize = fileBuffer.length;

      console.log(`  Size: ${(fileSize / 1024).toFixed(2)} KB`);

      // Upload to filings/424B4_final_prospectus/ folder
      const blobPath = `filings/424B4_final_prospectus/${filename}`;

      const blob = await put(blobPath, fileBuffer, {
        access: 'public',
        token: BLOB_TOKEN,
        contentType: 'application/pdf',
      });

      console.log(`  SUCCESS: ${blob.url}`);

      results.push({
        filename,
        url: blob.url,
        pathname: blob.pathname,
        size: fileSize,
      });

    } catch (error) {
      console.error(`  ERROR: ${error instanceof Error ? error.message : String(error)}`);
    }

    console.log();
  }

  // Save results
  const outputFile = path.join(process.cwd(), 'extracted-pages-upload-results.json');
  fs.writeFileSync(outputFile, JSON.stringify(results, null, 2));
  console.log(`Results saved to: ${outputFile}`);

  console.log('\n✅ Upload complete!');
  console.log(`\nUploaded ${results.length}/${files.length} files`);
}

uploadExtractedPages().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
