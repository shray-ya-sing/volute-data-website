#!/usr/bin/env tsx
/**
 * Get database constraints from Neon
 */

import dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { neon } from '@neondatabase/serverless';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '..', '.env.local') });

const sql = neon(process.env.DATABASE_URL!);

async function getConstraints() {
  console.log('Fetching database constraints from Neon...\n');

  // Get constraints for batch_jobs table
  const constraints = await sql`
    SELECT
      con.conname AS constraint_name,
      con.contype AS constraint_type,
      pg_get_constraintdef(con.oid) AS constraint_definition
    FROM pg_constraint con
    INNER JOIN pg_class rel ON rel.oid = con.conrelid
    INNER JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
    WHERE nsp.nspname = 'public'
      AND rel.relname = 'batch_jobs'
    ORDER BY con.conname
  `;

  console.log('BATCH_JOBS CONSTRAINTS');
  console.log('='.repeat(80));

  for (const constraint of constraints) {
    console.log(`Name: ${constraint.constraint_name}`);
    console.log(`Type: ${constraint.constraint_type}`);
    console.log(`Definition: ${constraint.constraint_definition}`);
    console.log('-'.repeat(80));
  }
}

getConstraints().catch(error => {
  console.error('Error:', error);
  process.exit(1);
});
