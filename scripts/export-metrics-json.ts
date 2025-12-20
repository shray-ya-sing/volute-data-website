#!/usr/bin/env tsx
/**
 * Export metrics in the same format as local data.json
 */

import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const sql = neon(process.env.DATABASE_URL!);

async function exportMetrics() {
  console.log('Exporting metrics from Neon database...\n');

  // Get all filings
  const filings = await sql`
    SELECT DISTINCT
      f.id as filing_id,
      f.ticker,
      f.company_name,
      f.filing_date,
      f.blob_url
    FROM filings f
    ORDER BY f.filing_date DESC
  `;

  console.log(`Found ${filings.length} filings\n`);

  const result = [];

  for (const filing of filings) {
    console.log(`Processing ${filing.ticker}...`);

    // Get all metrics for this filing
    const metrics = await sql`
      SELECT
        metric_name,
        metric_value,
        page_number,
        bounding_box
      FROM metrics
      WHERE filing_id = ${filing.filing_id}
      ORDER BY metric_name
    `;

    // Build the data structure similar to local data.json
    const filingData: any = {
      'Company Ticker': filing.ticker,
      'Filing URL': filing.blob_url,
    };

    const pageNumbers: any = {};

    // Add each metric
    for (const metric of metrics) {
      filingData[metric.metric_name] = metric.metric_value;
      pageNumbers[metric.metric_name] = metric.page_number;

      // Store bounding box info
      if (metric.bounding_box) {
        if (!filingData['Bounding Boxes']) {
          filingData['Bounding Boxes'] = {};
        }
        filingData['Bounding Boxes'][metric.metric_name] = metric.bounding_box;
      }
    }

    filingData['Page Number'] = pageNumbers;

    result.push(filingData);
    console.log(`  ✓ Exported ${metrics.length} metrics`);
  }

  // Save to file
  const outputFile = path.join(process.cwd(), 'exported-metrics.json');
  fs.writeFileSync(outputFile, JSON.stringify(result, null, 2));
  console.log(`\n✅ Exported to: ${outputFile}`);

  // Show sample
  console.log('\nSample of TTAN data:');
  const ttan = result.find((f: any) => f['Company Ticker'] === 'TTAN');
  if (ttan) {
    console.log(JSON.stringify({
      'Company Ticker': ttan['Company Ticker'],
      'Company Name': ttan['Company Name'],
      'Final Price': ttan['Final Price'],
      'Shares Offered (Primary)': ttan['Shares Offered (Primary)'],
      'Shares Offered (Secondary)': ttan['Shares Offered (Secondary)'],
      'Proceeds to Company': ttan['Proceeds to Company'],
      'Proceeds to Selling Stockholders': ttan['Proceeds to Selling Stockholders'],
      'Gross Proceeds': ttan['Gross Proceeds'],
      'Net Proceeds': ttan['Net Proceeds'],
    }, null, 2));
  }
}

exportMetrics();
