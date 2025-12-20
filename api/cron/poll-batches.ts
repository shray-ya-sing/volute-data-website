/**
 * Cron Job: Poll Claude Batch API for completed batches
 * Runs: Every 30 minutes
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { neon } from '@neondatabase/serverless';
import Anthropic from '@anthropic-ai/sdk';
import {
  getBatchStatus,
  getBatchResults,
  parseMetricsFromResult,
} from '../../lib/batch-api.js';

const sql = neon(process.env.DATABASE_URL!);
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

interface ActiveBatch {
  id: number;
  batch_id: string;
  filing_count: number;
  submitted_at: string;
}

/**
 * Get active batches that need polling
 */
async function getActiveBatches(): Promise<ActiveBatch[]> {
  const result = await sql`
    SELECT id, batch_id, filing_count, submitted_at
    FROM batch_jobs
    WHERE status IN ('submitted', 'processing')
    ORDER BY submitted_at ASC
  `;
  return result as ActiveBatch[];
}

/**
 * Update batch job status
 */
async function updateBatchStatus(
  batchId: string,
  status: string,
  requestCounts: any,
  resultUrl: string | null,
  endedAt: string | null
) {
  await sql`
    UPDATE batch_jobs
    SET status = ${status},
        request_counts = ${JSON.stringify(requestCounts)},
        result_url = ${resultUrl},
        completed_at = ${endedAt ? new Date(endedAt) : null},
        updated_at = NOW()
    WHERE batch_id = ${batchId}
  `;
}

/**
 * Process a single batch result
 */
async function processBatchResult(batchId: string): Promise<{
  succeeded: number;
  failed: number;
}> {
  console.log(`\n📊 Processing results for batch: ${batchId}`);

  // Get batch results from Claude API
  const results = await getBatchResults(anthropic, batchId);
  console.log(`  ✓ Retrieved ${results.length} results`);

  let succeededCount = 0;
  let failedCount = 0;

  for (const result of results) {
    // Parse custom_id to get filing info
    // Format: "filing_{filingId}_{ticker}"
    const match = result.custom_id.match(/filing_(\d+)_(.+)/);
    if (!match) {
      console.error(`  ❌ Invalid custom_id format: ${result.custom_id}`);
      failedCount++;
      continue;
    }

    const filingId = parseInt(match[1]);
    const ticker = match[2];

    if (result.result.type === 'succeeded') {
      try {
        // Extract content from Claude response
        const message = result.result.message;
        const content = message.content[0];

        let textContent = '';
        if (content.type === 'text') {
          textContent = content.text;
        }

        // Parse metrics from response
        const metrics = parseMetricsFromResult(textContent);
        console.log(`  ✓ ${ticker}: Extracted ${metrics.length} metrics`);

        // Find the extracted ticker from metrics
        const tickerMetric = metrics.find(m => m.metric_name === 'Company Ticker');
        const extractedTicker = tickerMetric?.metric_value || ticker;

        // Insert metrics into database
        for (const metric of metrics) {
          await sql`
            INSERT INTO metrics (
              filing_id, metric_name, metric_value,
              page_number, bounding_box, confidence
            )
            VALUES (
              ${filingId},
              ${metric.metric_name},
              ${metric.metric_value},
              ${metric.page_number || 1},
              ${metric.bounding_box ? JSON.stringify(metric.bounding_box) : null},
              ${metric.confidence || null}
            )
            ON CONFLICT (filing_id, metric_name)
            DO UPDATE SET
              metric_value = EXCLUDED.metric_value,
              page_number = EXCLUDED.page_number,
              bounding_box = EXCLUDED.bounding_box,
              confidence = EXCLUDED.confidence,
              updated_at = NOW()
          `;
        }

        // Update filing with extracted ticker and mark as completed
        await sql`
          UPDATE filings
          SET status = 'completed',
              ticker = ${extractedTicker},
              processed_at = NOW(),
              batch_completed_at = NOW()
          WHERE id = ${filingId}
        `;

        console.log(`  ✓ Updated ticker to: ${extractedTicker}`);

        succeededCount++;
      } catch (error: any) {
        console.error(`  ❌ Error processing ${ticker}:`, error.message);

        // Mark filing as failed
        await sql`
          UPDATE filings
          SET status = 'failed',
              error_message = ${error.message},
              updated_at = NOW()
          WHERE id = ${filingId}
        `;

        failedCount++;
      }
    } else {
      // Batch request failed
      console.error(`  ❌ ${ticker}: Batch request failed:`, result.result.error);

      const errorMessage = result.result.error?.message || 'Unknown error';

      await sql`
        UPDATE filings
        SET status = 'failed',
            error_message = ${errorMessage},
            retry_count = retry_count + 1,
            last_retry_at = NOW()
        WHERE id = ${filingId}
      `;

      failedCount++;
    }
  }

  return { succeeded: succeededCount, failed: failedCount };
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

  console.log('🔄 Starting batch polling...');

  try {
    // Get active batches
    const activeBatches = await getActiveBatches();

    if (activeBatches.length === 0) {
      console.log('✓ No active batches to poll');
      return res.status(200).json({
        success: true,
        message: 'No active batches',
        timestamp: new Date().toISOString(),
      });
    }

    console.log(`\n📦 Found ${activeBatches.length} active batch(es)`);

    const results: Array<{
      batchId: string;
      status: string;
      succeeded?: number;
      failed?: number;
    }> = [];

    for (const batch of activeBatches) {
      console.log(`\n🔍 Checking batch: ${batch.batch_id}`);

      // Get batch status from Claude API
      const status = await getBatchStatus(anthropic, batch.batch_id);
      console.log(`  Status: ${status.processing_status}`);
      console.log(`  Counts:`, status.request_counts);

      // Update database with current status
      await updateBatchStatus(
        batch.batch_id,
        status.processing_status,
        status.request_counts,
        status.results_url,
        status.ended_at
      );

      if (status.processing_status === 'ended') {
        // Process completed batch
        console.log(`\n✅ Batch completed, processing results...`);
        const processResult = await processBatchResult(batch.batch_id);

        results.push({
          batchId: batch.batch_id,
          status: 'completed',
          succeeded: processResult.succeeded,
          failed: processResult.failed,
        });

        // Update pipeline state
        await sql`
          UPDATE pipeline_state
          SET last_successful_filing = NOW(),
              total_processed = total_processed + ${processResult.succeeded},
              updated_at = NOW()
          WHERE id = 1
        `;
      } else {
        results.push({
          batchId: batch.batch_id,
          status: status.processing_status,
        });
      }

      // Rate limit: wait a bit between batch checks
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log('\n✅ Batch polling complete');

    return res.status(200).json({
      success: true,
      batches: results,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('❌ Error polling batches:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
}
