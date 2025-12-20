#!/usr/bin/env tsx
/**
 * Add updated_at column to batch_jobs table
 */

import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const sql = neon(process.env.DATABASE_URL!);

async function addUpdatedAtColumn() {
  console.log('🔄 Adding updated_at column to batch_jobs table...\n');

  try {
    // Add updated_at column
    await sql`
      ALTER TABLE batch_jobs
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW()
    `;
    console.log('✅ Added updated_at column');

    // Update existing rows to have a value
    await sql`
      UPDATE batch_jobs
      SET updated_at = COALESCE(completed_at, submitted_at, NOW())
      WHERE updated_at IS NULL
    `;
    console.log('✅ Updated existing rows');

    console.log('\n✅ Migration completed successfully!');
  } catch (error) {
    console.error('❌ Error during migration:', error);
    throw error;
  }
}

addUpdatedAtColumn().catch(console.error);
