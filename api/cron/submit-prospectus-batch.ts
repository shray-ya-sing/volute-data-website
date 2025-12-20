/**
 * Cron Job: Submit prospectus PDFs to Claude Batch API for metrics extraction
 * Runs: Every 2 hours or on demand
 *
 * Reads prospectus PDFs from: filings/424B4_final_prospectus/
 * Submits to Claude Batch API for extraction
 * Saves batch info to Neon database
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { neon } from '@neondatabase/serverless';
import Anthropic from '@anthropic-ai/sdk';
import { list } from '@vercel/blob';
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

interface ProspectusFile {
  url: string;
  pathname: string;
  size: number;
  ticker: string;
  filename: string;
}

/**
 * Get all prospectus PDFs from blob storage
 */
async function getProspectusFiles(): Promise<ProspectusFile[]> {
  console.log('📂 Listing prospectus PDFs from blob storage...');

  const { blobs } = await list({
    prefix: 'filings/424B4_final_prospectus/',
  });

  const prospectusFiles: ProspectusFile[] = blobs
    .filter(blob => blob.pathname.endsWith('.pdf'))
    .map(blob => {
      const filename = blob.pathname.split('/').pop() || blob.pathname;
      // Extract ticker from filename (e.g., "TTAN_2024-12-12_0001193125_24_277099.pdf" -> "TTAN")
      const ticker = filename.split('_')[0] || 'UNKNOWN';

      return {
        url: blob.url,
        pathname: blob.pathname,
        size: blob.size,
        ticker,
        filename,
      };
    });

  console.log(`✓ Found ${prospectusFiles.length} prospectus PDFs`);
  return prospectusFiles;
}

/**
 * Get or create filing record in database
 * Uses blob_url to store the prospectus PDF URL
 */
async function getOrCreateFiling(
  ticker: string,
  prospectusUrl: string,
  filename: string
): Promise<number> {
  // Try to find existing filing by blob_url
  const existing = await sql`
    SELECT id FROM filings
    WHERE blob_url = ${prospectusUrl}
    LIMIT 1
  `;

  if (existing.length > 0) {
    return existing[0].id;
  }

  // Create new filing record
  // Extract pathname from URL (e.g., "filings/424B4_final_prospectus/TTAN_2024-12-12_0001193125_24_277099.pdf")
  const pathname = filename;

  const result = await sql`
    INSERT INTO filings (
      ticker,
      blob_url,
      blob_pathname,
      status
    )
    VALUES (
      ${ticker},
      ${prospectusUrl},
      ${pathname},
      'pending'
    )
    RETURNING id
  `;

  return result[0].id;
}

/**
 * Get filings ready for batch submission (not yet in a batch)
 */
async function getFilingsForBatch(
  prospectusFiles: ProspectusFile[]
): Promise<Array<{
  id: number;
  ticker: string;
  blob_url: string;
}>> {
  // First ensure all prospectus files have database records
  for (const file of prospectusFiles) {
    await getOrCreateFiling(file.ticker, file.url, file.filename);
  }

  // Get ALL filings that don't have a batch_id yet (no limit)
  const result = await sql`
    SELECT id, ticker, blob_url
    FROM filings
    WHERE blob_url IS NOT NULL
      AND batch_id IS NULL
      AND status = 'pending'
    ORDER BY created_at ASC
  `;

  return result as any[];
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

  console.log('🚀 Starting prospectus batch submission job...');
  console.log('=' .repeat(70));

  try {
    // Step 1: Get all prospectus files from blob storage
    const prospectusFiles = await getProspectusFiles();

    if (prospectusFiles.length === 0) {
      console.log('⚠️ No prospectus files found');
      return res.status(200).json({
        success: true,
        message: 'No prospectus files found',
        batchId: null,
        filingCount: 0,
        timestamp: new Date().toISOString(),
      });
    }

    // Step 2: Get filings ready for batch submission
    console.log('\n📤 Getting filings ready for batch...');

    const filingsForBatch = await getFilingsForBatch(prospectusFiles);

    if (filingsForBatch.length === 0) {
      console.log('✓ No new filings to process (all have been batched)');
      return res.status(200).json({
        success: true,
        message: 'No new filings to process',
        batchId: null,
        filingCount: 0,
        totalProspectusFiles: prospectusFiles.length,
        timestamp: new Date().toISOString(),
      });
    }

    console.log(`✓ Found ${filingsForBatch.length} filings ready for batch`);

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
      `424B4 Prospectus Batch - ${new Date().toISOString()}`
    );

    console.log(`✅ Batch submitted: ${batch.id}`);
    console.log(`   Status: ${batch.processing_status}`);
    console.log(`   Expires: ${batch.expires_at}`);

    // Step 5: Update database with batch info
    const batchId = batch.id;

    // Store as 'submitted' - the poll-batches cron will update when complete
    // Claude Batch API statuses: "in_progress", "ended", "canceling", "canceled"
    // Our DB statuses: "submitted", "processing", "completed", "failed", "expired", "canceled"
    const dbStatus = 'submitted';

    // Create batch job record
    await sql`
      INSERT INTO batch_jobs (batch_id, status, filing_count, expires_at)
      VALUES (
        ${batchId},
        ${dbStatus},
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
    console.log('=' .repeat(70));

    return res.status(200).json({
      success: true,
      batchId: batchId,
      filingCount: filingsForBatch.length,
      totalProspectusFiles: prospectusFiles.length,
      status: batch.processing_status,
      expiresAt: batch.expires_at,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('❌ Error in batch submission:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      timestamp: new Date().toISOString(),
    });
  }
}
