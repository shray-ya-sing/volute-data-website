#!/usr/bin/env tsx
import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const sql = neon(process.env.DATABASE_URL!);

async function viewData() {
  // Get sample metrics
  const metrics = await sql`
    SELECT
      f.ticker,
      f.blob_url as filing_url,
      m.metric_name,
      m.metric_value,
      m.page_number,
      m.bounding_box
    FROM metrics m
    JOIN filings f ON m.filing_id = f.id
    WHERE f.ticker = 'TTAN'
    ORDER BY m.metric_name
    LIMIT 10
  `;

  console.log('Current Data Structure:');
  console.log(JSON.stringify(metrics, null, 2));
}

viewData();
