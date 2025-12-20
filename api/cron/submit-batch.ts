/**
 * Cron Job: Submit batch of filings to Claude Batch API
 * Runs: Every 2 hours (offset from polling)
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { neon } from '@neondatabase/serverless';
import Anthropic from '@anthropic-ai/sdk';
import { put } from '@vercel/blob';
import { PDFDocument } from 'pdf-lib';
import {
  createFilingBatchRequest,
  createBatchJSONL,
  submitBatch,
  type BatchRequest,
} from '../../lib/batch-api.js';

const sql = neon(process.env.DATABASE_URL!);
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

const TARGET_METRICS = [
  'Company Name',
  'Company Ticker',
  'Exchange',
  'Filing Date',
  'IPO Date',
  'Final Price',
  'Shares Offered (Primary)',
  'Shares Offered (Secondary)',
  'Gross Proceeds',
  'Net Proceeds',
  'Proceeds to Company',
  'Proceeds to Selling Stockholders',
  'Greenshoe Option',
  'Underwriter Discount (Per Share)',
  'Underwriter Discount (Total)',
  'Lead Bookrunners',
  'Co-Bookrunners',
  'Syndicate Members',
  'Directed Share Program',
  'Shares Delivery Date',
];

interface PendingFiling {
  id: number;
  ticker: string;
  cik: string;
  accession_number: string;
  filing_url: string;
}

/**
 * Get pending filings that need processing
 */
async function getPendingFilings(limit: number = 10): Promise<PendingFiling[]> {
  const result = await sql`
    SELECT id, ticker, cik, accession_number, filing_url
    FROM filings
    WHERE status = 'pending'
      AND blob_url IS NULL
    ORDER BY created_at ASC
    LIMIT ${limit}
  `;
  return result as PendingFiling[];
}

/**
 * Download PDF from SEC EDGAR
 */
async function downloadPDF(filing: PendingFiling): Promise<ArrayBuffer> {
  // For now, we'll need to construct the actual PDF URL
  // SEC URLs follow pattern: https://www.sec.gov/Archives/edgar/data/{CIK}/{AccessionNoHyphens}/{filename}.pdf

  // First, fetch the filing index to find the PDF filename
  const accessionNoHyphens = filing.accession_number.replace(/-/g, '');
  const indexUrl = `https://www.sec.gov/cgi-bin/viewer?action=view&cik=${filing.cik}&accession_number=${accessionNoHyphens}&xbrl_type=v`;

  console.log(`  Fetching filing index: ${indexUrl}`);

  // For simplicity, construct a likely PDF URL pattern
  // Most 424B4 filings have a filename like d{numbers}.htm or {accession}.pdf
  const pdfUrl = `https://www.sec.gov/Archives/edgar/data/${filing.cik}/${accessionNoHyphens}/d${accessionNoHyphens.substring(0, 6)}.pdf`;

  console.log(`  Downloading PDF: ${pdfUrl}`);

  const response = await fetch(pdfUrl, {
    headers: {
      'User-Agent': process.env.SEC_USER_AGENT || 'Volute Data support@volute.com',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to download PDF: ${response.statusText}`);
  }

  return await response.arrayBuffer();
}

/**
 * Extract first page from PDF
 */
async function extractFirstPage(pdfBytes: ArrayBuffer): Promise<Buffer> {
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const totalPages = pdfDoc.getPageCount();

  if (totalPages === 0) {
    throw new Error('PDF has no pages');
  }

  // Create new PDF with only first page
  const newPdf = await PDFDocument.create();
  const [firstPage] = await newPdf.copyPages(pdfDoc, [0]);
  newPdf.addPage(firstPage);

  const extractedBytes = await newPdf.save();
  return Buffer.from(extractedBytes);
}

/**
 * Upload PDF to Vercel Blob
 */
async function uploadToBlob(pdfBuffer: Buffer, ticker: string, accession: string): Promise<string> {
  const filename = `${ticker}_${accession.replace(/-/g, '')}_page1.pdf`;
  const blob = await put(`filings/424b4/${filename}`, pdfBuffer, {
    access: 'public',
    contentType: 'application/pdf',
  });

  return blob.url;
}

/**
 * Process a filing: download, extract, upload to blob
 */
async function processFiling(filing: PendingFiling): Promise<string | null> {
  try {
    console.log(`\n📄 Processing filing: ${filing.ticker} (${filing.accession_number})`);

    // Download PDF
    const pdfBytes = await downloadPDF(filing);
    console.log(`  ✓ Downloaded PDF (${(pdfBytes.byteLength / 1024 / 1024).toFixed(2)} MB)`);

    // Extract first page
    const extractedPdf = await extractFirstPage(pdfBytes);
    console.log(`  ✓ Extracted first page (${(extractedPdf.length / 1024).toFixed(1)} KB)`);

    // Upload to blob
    const blobUrl = await uploadToBlob(extractedPdf, filing.ticker, filing.accession_number);
    console.log(`  ✓ Uploaded to blob: ${blobUrl}`);

    // Update database
    await sql`
      UPDATE filings
      SET blob_url = ${blobUrl}, updated_at = NOW()
      WHERE id = ${filing.id}
    `;

    return blobUrl;
  } catch (error: any) {
    console.error(`  ❌ Error processing filing:`, error.message);

    // Mark as failed
    await sql`
      UPDATE filings
      SET status = 'failed',
          error_message = ${error.message},
          updated_at = NOW()
      WHERE id = ${filing.id}
    `;

    return null;
  }
}

/**
 * Get filings ready for batch submission
 */
async function getFilingsForBatch(limit: number = 20): Promise<Array<{
  id: number;
  ticker: string;
  blob_url: string;
}>> {
  const result = await sql`
    SELECT id, ticker, blob_url
    FROM filings
    WHERE status = 'pending'
      AND blob_url IS NOT NULL
      AND batch_id IS NULL
    ORDER BY created_at ASC
    LIMIT ${limit}
  `;
  return result as any[];
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Verify cron secret
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  console.log('🚀 Starting batch submission job...');

  try {
    // Step 1: Process pending filings (download & upload to blob)
    console.log('\n📥 Step 1: Processing pending filings...');
    const pendingFilings = await getPendingFilings(5); // Process 5 at a time to avoid timeout

    for (const filing of pendingFilings) {
      await processFiling(filing);
      // Rate limit: wait 110ms between SEC requests (required by SEC)
      await new Promise(resolve => setTimeout(resolve, 110));
    }

    // Step 2: Get filings ready for batch submission
    console.log('\n📤 Step 2: Creating batch submission...');
    const filingsForBatch = await getFilingsForBatch(20); // Batch up to 20 filings

    if (filingsForBatch.length === 0) {
      console.log('✓ No filings ready for batch submission');
      return res.status(200).json({
        success: true,
        processed: pendingFilings.length,
        batched: 0,
        message: 'No filings ready for batch',
        timestamp: new Date().toISOString(),
      });
    }

    // Step 3: Create batch requests
    console.log(`\n📦 Creating batch with ${filingsForBatch.length} filings...`);
    const batchRequests: BatchRequest[] = filingsForBatch.map(filing =>
      createFilingBatchRequest({
        ticker: filing.ticker,
        filingId: filing.id,
        blobUrl: filing.blob_url,
        targetMetrics: TARGET_METRICS,
      })
    );

    const jsonlContent = createBatchJSONL(batchRequests);
    console.log(`✓ Created JSONL (${(jsonlContent.length / 1024).toFixed(1)}KB)`);

    // Step 4: Submit to Claude Batch API
    console.log('\n☁️  Submitting to Claude Batch API...');
    const batch = await submitBatch(
      anthropic,
      jsonlContent,
      `424B4 Batch - ${new Date().toISOString()}`
    );

    console.log(`✅ Batch submitted: ${batch.id}`);
    console.log(`   Status: ${batch.processing_status}`);
    console.log(`   Expires: ${batch.expires_at}`);

    // Step 5: Update database with batch info
    const batchId = batch.id;

    // Create batch job record
    await sql`
      INSERT INTO batch_jobs (batch_id, status, filing_count, expires_at)
      VALUES (
        ${batchId},
        ${batch.processing_status},
        ${filingsForBatch.length},
        ${batch.expires_at}
      )
    `;

    // Update filings with batch info
    const filingIds = filingsForBatch.map(f => f.id);
    await sql`
      UPDATE filings
      SET batch_id = ${batchId},
          batch_submitted_at = NOW(),
          status = 'processing'
      WHERE id = ANY(${filingIds})
    `;

    console.log('✅ Database updated with batch info');

    return res.status(200).json({
      success: true,
      processed: pendingFilings.length,
      batchId: batchId,
      filingCount: filingsForBatch.length,
      status: batch.processing_status,
      expiresAt: batch.expires_at,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('❌ Error in batch submission:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
}
