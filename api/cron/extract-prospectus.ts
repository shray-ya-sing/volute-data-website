/**
 * Cron Job: Extract first page (prospectus) from 424B4 PDFs
 * Runs: On demand or scheduled
 *
 * Reads PDFs from: filings/424b4/
 * Saves to: filings/424B4_final_prospectus/
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { list, head, put } from '@vercel/blob';
import { PDFDocument } from 'pdf-lib';

/**
 * Download PDF from Vercel Blob
 */
async function downloadFromBlob(url: string): Promise<ArrayBuffer> {
  console.log(`  📥 Downloading: ${url.substring(0, 80)}...`);

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to download from blob: ${response.statusText}`);
  }

  return await response.arrayBuffer();
}

/**
 * Extract first page from PDF
 */
async function extractFirstPage(pdfBytes: ArrayBuffer): Promise<Buffer> {
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const totalPages = pdfDoc.getPageCount();

  console.log(`  📄 Total pages: ${totalPages}`);

  if (totalPages === 0) {
    throw new Error('PDF has no pages');
  }

  // Create new PDF with only first page
  const newPdf = await PDFDocument.create();
  const [firstPage] = await newPdf.copyPages(pdfDoc, [0]);
  newPdf.addPage(firstPage);

  const extractedBytes = await newPdf.save();
  console.log(`  ✅ Extracted first page (${(extractedBytes.length / 1024).toFixed(1)} KB)`);

  return Buffer.from(extractedBytes);
}

/**
 * Upload prospectus page to Vercel Blob
 */
async function uploadProspectus(
  pdfBuffer: Buffer,
  originalFilename: string
): Promise<string> {
  // Keep the same filename but place in prospectus directory
  const prospectusPath = `filings/424B4_final_prospectus/${originalFilename}`;

  console.log(`  📤 Uploading to: ${prospectusPath}`);

  const blob = await put(prospectusPath, pdfBuffer, {
    access: 'public',
    contentType: 'application/pdf',
  });

  console.log(`  ✅ Uploaded: ${blob.url.substring(0, 80)}...`);

  return blob.url;
}

/**
 * Check if prospectus already exists
 */
async function prospectusExists(filename: string): Promise<boolean> {
  try {
    const prospectusPath = `filings/424B4_final_prospectus/${filename}`;
    await head(prospectusPath);
    return true;
  } catch (error) {
    return false;
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Verify cron secret (only if CRON_SECRET is set)
  if (process.env.CRON_SECRET) {
    const authHeader = req.headers.authorization;
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      console.error('❌ Unauthorized: Invalid or missing cron secret');
      return res.status(401).json({ error: 'Unauthorized' });
    }
  } else {
    console.warn('⚠️ CRON_SECRET not set - running without authentication');
  }

  console.log('🚀 Starting prospectus extraction job...');
  console.log('=' .repeat(70));

  try {
    // Step 1: List all PDFs in filings/424b4/
    console.log('📂 Step 1: Listing PDFs in filings/424b4/...');

    const { blobs } = await list({
      prefix: 'filings/424b4/',
    });

    const pdfBlobs = blobs.filter(blob => blob.pathname.endsWith('.pdf'));
    console.log(`✓ Found ${pdfBlobs.length} PDF files`);

    if (pdfBlobs.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'No PDFs found in filings/424b4/',
        processed: 0,
        skipped: 0,
        failed: 0,
        timestamp: new Date().toISOString(),
      });
    }

    // Step 2: Process each PDF
    console.log('\n📄 Step 2: Processing PDFs...\n');

    const results: Array<{
      filename: string;
      status: 'success' | 'skipped' | 'failed';
      error?: string;
      prospectusUrl?: string;
    }> = [];

    let processed = 0;
    let skipped = 0;
    let failed = 0;

    // Get limit from query parameter (default: process all)
    const limitParam = req.query.limit as string | undefined;
    const limit = limitParam ? parseInt(limitParam, 10) : pdfBlobs.length;
    const pdfsToProcess = pdfBlobs.slice(0, limit);

    console.log(`Processing ${pdfsToProcess.length} PDFs${limitParam ? ` (limit: ${limit})` : ' (all)'}\n`);

    for (let i = 0; i < pdfsToProcess.length; i++) {
      const blob = pdfsToProcess[i];
      const filename = blob.pathname.split('/').pop() || blob.pathname;

      console.log(`[${i + 1}/${pdfsToProcess.length}] ${filename}`);

      try {
        // Check if already processed
        const exists = await prospectusExists(filename);
        if (exists) {
          console.log(`  ⏭️  SKIP: Already exists in 424B4_final_prospectus/\n`);
          results.push({
            filename,
            status: 'skipped',
          });
          skipped++;
          continue;
        }

        // Download PDF
        const pdfBytes = await downloadFromBlob(blob.url);
        console.log(`  ✓ Downloaded (${(blob.size / 1024 / 1024).toFixed(2)} MB)`);

        // Extract first page
        const prospectusBuffer = await extractFirstPage(pdfBytes);

        // Upload to prospectus directory
        const prospectusUrl = await uploadProspectus(prospectusBuffer, filename);

        results.push({
          filename,
          status: 'success',
          prospectusUrl,
        });
        processed++;

        console.log(`  ✅ SUCCESS\n`);

        // Rate limiting - small delay between operations
        await new Promise(resolve => setTimeout(resolve, 500));

      } catch (error: any) {
        console.error(`  ❌ ERROR: ${error.message}\n`);

        results.push({
          filename,
          status: 'failed',
          error: error.message,
        });
        failed++;
      }
    }

    // Summary
    console.log('=' .repeat(70));
    console.log('EXTRACTION SUMMARY');
    console.log('=' .repeat(70));
    console.log(`Total PDFs found: ${pdfBlobs.length}`);
    console.log(`Processed this run: ${pdfsToProcess.length}`);
    console.log(`Successful: ${processed}`);
    console.log(`Skipped (already exists): ${skipped}`);
    console.log(`Failed: ${failed}`);
    console.log('=' .repeat(70));

    return res.status(200).json({
      success: true,
      totalPdfs: pdfBlobs.length,
      processedThisRun: pdfsToProcess.length,
      successful: processed,
      skipped: skipped,
      failed: failed,
      results: results,
      timestamp: new Date().toISOString(),
    });

  } catch (error: any) {
    console.error('❌ Fatal error:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
}
