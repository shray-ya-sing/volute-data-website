/**
 * Pipeline Status API
 * Returns current state of the automated pipeline
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    // Get filing counts by status
    const statusCounts = await sql`
      SELECT
        status,
        COUNT(*) as count
      FROM filings
      GROUP BY status
    `;

    const counts: Record<string, number> = {};
    for (const row of statusCounts) {
      counts[row.status as string] = parseInt(row.count as string);
    }

    // Get batch job stats
    const batchStats = await sql`
      SELECT
        status,
        COUNT(*) as count,
        SUM(filing_count) as total_filings
      FROM batch_jobs
      GROUP BY status
    `;

    const batchCounts: Record<string, { count: number; filings: number }> = {};
    for (const row of batchStats) {
      batchCounts[row.status as string] = {
        count: parseInt(row.count as string),
        filings: parseInt(row.total_filings as string) || 0,
      };
    }

    // Get pipeline state
    const pipelineState = await sql`
      SELECT
        last_rss_check,
        last_successful_filing,
        total_processed
      FROM pipeline_state
      WHERE id = 1
      LIMIT 1
    `;

    // Get recent filings
    const recentFilings = await sql`
      SELECT
        id, ticker, filing_date, status, created_at, processed_at
      FROM filings
      ORDER BY created_at DESC
      LIMIT 10
    `;

    // Get active batches
    const activeBatches = await sql`
      SELECT
        batch_id, status, filing_count, submitted_at, expires_at
      FROM batch_jobs
      WHERE status IN ('submitted', 'processing')
      ORDER BY submitted_at DESC
    `;

    // Calculate health status
    const totalFilings = Object.values(counts).reduce((sum, count) => sum + count, 0);
    const completedFilings = counts['completed'] || 0;
    const failedFilings = counts['failed'] || 0;
    const successRate = totalFilings > 0 ? (completedFilings / totalFilings) * 100 : 0;

    const health = {
      status: failedFilings > completedFilings ? 'degraded' : successRate > 80 ? 'healthy' : 'warning',
      successRate: successRate.toFixed(1) + '%',
      totalProcessed: completedFilings,
      totalFailed: failedFilings,
    };

    return res.status(200).json({
      health,
      filings: {
        total: totalFilings,
        pending: counts['pending'] || 0,
        processing: counts['processing'] || 0,
        completed: counts['completed'] || 0,
        failed: counts['failed'] || 0,
      },
      batches: {
        active: (batchCounts['submitted']?.count || 0) + (batchCounts['processing']?.count || 0),
        completed: batchCounts['completed']?.count || 0,
        failed: batchCounts['failed']?.count || 0,
        details: batchCounts,
      },
      pipeline: pipelineState[0] || {
        last_rss_check: null,
        last_successful_filing: null,
        total_processed: 0,
      },
      recentFilings: recentFilings.map((f: any) => ({
        id: f.id,
        ticker: f.ticker,
        filingDate: f.filing_date,
        status: f.status,
        createdAt: f.created_at,
        processedAt: f.processed_at,
      })),
      activeBatches: activeBatches.map((b: any) => ({
        batchId: b.batch_id,
        status: b.status,
        filingCount: b.filing_count,
        submittedAt: b.submitted_at,
        expiresAt: b.expires_at,
      })),
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Error getting status:', error);
    return res.status(500).json({
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
}
