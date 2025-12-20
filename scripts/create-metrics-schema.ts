#!/usr/bin/env tsx
/**
 * Create database schema for 424B4 metrics extraction
 */

import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const sql = neon(process.env.DATABASE_URL!);

async function createSchema() {
  console.log('Creating database schema for 424B4 metrics...\n');

  try {
    // Create filings table
    await sql`
      CREATE TABLE IF NOT EXISTS filings (
        id SERIAL PRIMARY KEY,
        ticker VARCHAR(10) NOT NULL,
        company_name VARCHAR(255),
        filing_date DATE,
        blob_url TEXT NOT NULL,
        blob_pathname TEXT NOT NULL,
        pdf_size_bytes INTEGER,
        processed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        status VARCHAR(20) DEFAULT 'pending',
        error_message TEXT,
        UNIQUE(ticker, filing_date)
      )
    `;
    console.log('✓ Created filings table');

    // Create metrics table
    await sql`
      CREATE TABLE IF NOT EXISTS metrics (
        id SERIAL PRIMARY KEY,
        filing_id INTEGER REFERENCES filings(id) ON DELETE CASCADE,
        metric_name VARCHAR(100) NOT NULL,
        metric_value TEXT,
        page_number INTEGER,
        bounding_box JSONB,
        confidence FLOAT,
        extracted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(filing_id, metric_name)
      )
    `;
    console.log('✓ Created metrics table');

    // Create sources table for storing page images/references
    await sql`
      CREATE TABLE IF NOT EXISTS sources (
        id SERIAL PRIMARY KEY,
        filing_id INTEGER REFERENCES filings(id) ON DELETE CASCADE,
        page_number INTEGER NOT NULL,
        page_image_url TEXT,
        content_type VARCHAR(20) DEFAULT 'pdf',
        extracted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(filing_id, page_number)
      )
    `;
    console.log('✓ Created sources table');

    // Create indexes for better query performance
    await sql`
      CREATE INDEX IF NOT EXISTS idx_filings_ticker ON filings(ticker)
    `;
    await sql`
      CREATE INDEX IF NOT EXISTS idx_filings_status ON filings(status)
    `;
    await sql`
      CREATE INDEX IF NOT EXISTS idx_metrics_filing_id ON metrics(filing_id)
    `;
    await sql`
      CREATE INDEX IF NOT EXISTS idx_sources_filing_id ON sources(filing_id)
    `;
    console.log('✓ Created indexes');

    console.log('\n✅ Database schema created successfully!');

    // Show table info
    const tables = await sql`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name IN ('filings', 'metrics', 'sources')
    `;
    console.log('\nTables created:');
    tables.forEach((t: any) => console.log(`  - ${t.table_name}`));

  } catch (error) {
    console.error('Error creating schema:', error);
    process.exit(1);
  }
}

createSchema();
