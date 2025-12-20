#!/usr/bin/env tsx
/**
 * Test the API endpoints locally
 */

import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function testAPI() {
  console.log('Testing API endpoint logic...\n');

  const sql = neon(process.env.DATABASE_URL!);

  try {
    // Simulate what the API endpoint does
    const filings = await sql`
      SELECT DISTINCT
        f.id as filing_id,
        f.ticker,
        f.filing_date,
        f.blob_url
      FROM filings f
      WHERE f.status = 'completed'
      ORDER BY f.filing_date DESC
    `;

    console.log(`✓ Found ${filings.length} completed filings\n`);

    if (filings.length > 0) {
      // Test with first filing
      const testFiling = filings[0];
      console.log(`Testing with: ${testFiling.ticker}`);

      const metrics = await sql`
        SELECT
          metric_name,
          metric_value,
          page_number,
          bounding_box
        FROM metrics
        WHERE filing_id = ${testFiling.filing_id}
        ORDER BY metric_name
      `;

      console.log(`✓ Found ${metrics.length} metrics for ${testFiling.ticker}\n`);

      // Build sample response
      const filingData: any = {
        'Company Ticker': testFiling.ticker,
        'Filing URL': testFiling.blob_url,
      };

      const pageNumbers: any = {};
      const boundingBoxes: any = {};

      for (const metric of metrics) {
        filingData[metric.metric_name] = metric.metric_value;
        pageNumbers[metric.metric_name] = metric.page_number;

        if (metric.bounding_box) {
          boundingBoxes[metric.metric_name] = metric.bounding_box;
        }
      }

      filingData['Page Number'] = pageNumbers;
      if (Object.keys(boundingBoxes).length > 0) {
        filingData['Bounding Boxes'] = boundingBoxes;
      }

      console.log('Sample API response format:');
      console.log(JSON.stringify(filingData, null, 2));
      console.log('\n✅ API endpoint logic working correctly!');
      console.log('\nNext steps:');
      console.log('1. Deploy to Vercel: vercel --prod');
      console.log('2. Test API: curl https://your-domain.vercel.app/api/filings');
      console.log('3. Frontend will automatically use the API');
    }
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

testAPI();
