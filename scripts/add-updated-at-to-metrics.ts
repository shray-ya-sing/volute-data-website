#!/usr/bin/env tsx
/**
 * Add updated_at column to metrics table
 */

import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const sql = neon(process.env.DATABASE_URL!);

async function addUpdatedAtColumn() {
  console.log('🔄 Adding updated_at column to metrics table...\n');

  try {
    // Add updated_at column
    await sql`
      ALTER TABLE metrics
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW()
    `;
    console.log('✅ Added updated_at column');

    // Update existing rows to have a value
    await sql`
      UPDATE metrics
      SET updated_at = extracted_at
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
