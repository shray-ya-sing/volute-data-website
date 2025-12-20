#!/usr/bin/env tsx
/**
 * Reset batch status to allow reprocessing
 */

import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const sql = neon(process.env.DATABASE_URL!);

async function resetBatch() {
  const batchId = 'msgbatch_0175He1KuwYYmgJkeQbirdmX';

  console.log('🔄 Resetting batch status for reprocessing...\n');

  try {
    // Reset batch_jobs status back to processing
    await sql`
      UPDATE batch_jobs
      SET status = 'processing'
      WHERE batch_id = ${batchId}
    `;
    console.log('✅ Reset batch_jobs status to processing');

    // Reset filings status back to processing
    await sql`
      UPDATE filings
      SET status = 'processing',
          error_message = NULL
      WHERE batch_id = ${batchId}
    `;
    console.log('✅ Reset filings status to processing');

    console.log('\n✅ Batch ready to be reprocessed!');
  } catch (error) {
    console.error('❌ Error resetting batch:', error);
    throw error;
  }
}

resetBatch().catch(console.error);
