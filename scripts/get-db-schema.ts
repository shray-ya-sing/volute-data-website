#!/usr/bin/env tsx
/**
 * Get database schema from Neon
 */

import dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { neon } from '@neondatabase/serverless';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '..', '.env.local') });

const sql = neon(process.env.DATABASE_URL!);

async function getSchema() {
  console.log('Fetching database schema from Neon...\n');

  // Get all tables
  const tables = await sql`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
    ORDER BY table_name
  `;

  console.log('Tables found:', tables.map(t => t.table_name).join(', '));
  console.log('\n' + '='.repeat(80) + '\n');

  // Get columns for each table
  for (const table of tables) {
    const tableName = table.table_name;

    const columns = await sql`
      SELECT
        column_name,
        data_type,
        is_nullable,
        column_default
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = ${tableName}
      ORDER BY ordinal_position
    `;

    console.log(`TABLE: ${tableName}`);
    console.log('-'.repeat(80));
    console.log('Column Name                  | Type              | Nullable | Default');
    console.log('-'.repeat(80));

    for (const col of columns) {
      const name = col.column_name.padEnd(28);
      const type = col.data_type.padEnd(17);
      const nullable = col.is_nullable.padEnd(8);
      const def = col.column_default || '';
      console.log(`${name} | ${type} | ${nullable} | ${def}`);
    }

    console.log('\n');
  }
}

getSchema().catch(error => {
  console.error('Error:', error);
  process.exit(1);
});
