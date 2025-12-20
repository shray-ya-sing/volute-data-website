#!/usr/bin/env tsx
/**
 * Add batch tracking to filings table for Claude Batch API
 */

import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const sql = neon(process.env.DATABASE_URL!);

async function addBatchTracking() {
  console.log('🔄 Adding batch tracking columns to filings table...\n');

  try {
    // Add batch tracking columns
    await sql`
      ALTER TABLE filings
      ADD COLUMN IF NOT EXISTS batch_id VARCHAR(100),
      ADD COLUMN IF NOT EXISTS batch_custom_id VARCHAR(100),
      ADD COLUMN IF NOT EXISTS batch_submitted_at TIMESTAMP,
      ADD COLUMN IF NOT EXISTS batch_completed_at TIMESTAMP,
      ADD COLUMN IF NOT EXISTS retry_count INT DEFAULT 0,
      ADD COLUMN IF NOT EXISTS last_retry_at TIMESTAMP,
      ADD COLUMN IF NOT EXISTS accession_number VARCHAR(30),
      ADD COLUMN IF NOT EXISTS cik VARCHAR(10)
    `;
    console.log('✅ Added batch tracking columns');

    // Create index for batch queries
    await sql`
      CREATE INDEX IF NOT EXISTS idx_filings_batch_id ON filings(batch_id)
    `;
    console.log('✅ Created batch_id index');

    await sql`
      CREATE INDEX IF NOT EXISTS idx_filings_status ON filings(status)
    `;
    console.log('✅ Created status index');

    // Create batch tracking table
    await sql`
      CREATE TABLE IF NOT EXISTS batch_jobs (
        id SERIAL PRIMARY KEY,
        batch_id VARCHAR(100) UNIQUE NOT NULL,
        status VARCHAR(20) NOT NULL, -- 'submitted', 'processing', 'completed', 'failed', 'expired'
        filing_count INT NOT NULL,
        submitted_at TIMESTAMP DEFAULT NOW(),
        completed_at TIMESTAMP,
        expires_at TIMESTAMP,
        error_message TEXT,
        result_url TEXT,
        request_counts JSONB,
        CONSTRAINT valid_status CHECK (status IN ('submitted', 'processing', 'completed', 'failed', 'expired', 'canceled'))
      )
    `;
    console.log('✅ Created batch_jobs table');

    await sql`
      CREATE INDEX IF NOT EXISTS idx_batch_jobs_status ON batch_jobs(status)
    `;
    console.log('✅ Created batch_jobs status index');

    // Create pipeline state table for monitoring
    await sql`
      CREATE TABLE IF NOT EXISTS pipeline_state (
        id SERIAL PRIMARY KEY,
        last_rss_check TIMESTAMP,
        last_successful_filing TIMESTAMP,
        total_processed INT DEFAULT 0,
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `;
    console.log('✅ Created pipeline_state table');

    // Insert initial state if empty
    await sql`
      INSERT INTO pipeline_state (id, total_processed)
      VALUES (1, 0)
      ON CONFLICT (id) DO NOTHING
    `;
    console.log('✅ Initialized pipeline state');

    console.log('\n✅ Database schema updated successfully!');
  } catch (error) {
    console.error('❌ Error updating schema:', error);
    throw error;
  }
}

addBatchTracking().catch(console.error);
