#!/usr/bin/env tsx
/**
 * Clear all metrics and filings data to re-run extraction
 */

import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const sql = neon(process.env.DATABASE_URL!);

async function clearData() {
  console.log('Clearing all metrics and filings data...\n');

  try {
    // Delete all sources (will cascade from filings)
    const sources = await sql`DELETE FROM sources RETURNING *`;
    console.log(`✓ Deleted ${sources.length} source records`);

    // Delete all metrics (will cascade from filings)
    const metrics = await sql`DELETE FROM metrics RETURNING *`;
    console.log(`✓ Deleted ${metrics.length} metric records`);

    // Delete all filings
    const filings = await sql`DELETE FROM filings RETURNING *`;
    console.log(`✓ Deleted ${filings.length} filing records`);

    console.log('\n✅ All data cleared! Ready to re-run extraction.');

  } catch (error) {
    console.error('Error clearing data:', error);
    process.exit(1);
  }
}

clearData();
