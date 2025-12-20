#!/usr/bin/env tsx
/**
 * Fix filings table schema - add missing columns for cron jobs
 */

import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const sql = neon(process.env.DATABASE_URL!);

async function fixFilingsSchema() {
  console.log('🔧 Fixing filings table schema...\n');

  try {
    // Add missing columns
    console.log('Adding missing columns...');

    await sql`
      ALTER TABLE filings
      ADD COLUMN IF NOT EXISTS filing_url TEXT,
      ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW(),
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW()
    `;
    console.log('✅ Added filing_url, created_at, updated_at columns');

    // Create index for filing_url queries
    await sql`
      CREATE INDEX IF NOT EXISTS idx_filings_created_at ON filings(created_at DESC)
    `;
    console.log('✅ Created created_at index');

    // Show current schema
    const columns = await sql`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'filings'
      ORDER BY ordinal_position
    `;

    console.log('\n📋 Current filings table columns:');
    columns.forEach((col: any) => {
      console.log(`  - ${col.column_name} (${col.data_type}) ${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}`);
    });

    console.log('\n✅ Schema fix completed successfully!');
  } catch (error) {
    console.error('❌ Error fixing schema:', error);
    throw error;
  }
}

fixFilingsSchema().catch(console.error);
