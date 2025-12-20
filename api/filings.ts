/**
 * API endpoint to fetch all filings with metrics from Neon database
 * Returns data in the same format as public/data.json
 */

import { neon } from '@neondatabase/serverless';
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const sql = neon(process.env.DATABASE_URL!);

    // Get all filings with their metrics
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

    const result = [];

    for (const filing of filings) {
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

      // Build the data structure matching public/data.json format
      const filingData: any = {
        'Company Ticker': filing.ticker,
        'Filing URL': filing.blob_url,
      };

      const pageNumbers: any = {};
      const boundingBoxes: any = {};

      // Add each metric with source attribution
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

      result.push(filingData);
    }

    return res.status(200).json(result);
  } catch (error) {
    console.error('Error fetching filings:', error);
    return res.status(500).json({
      error: 'Failed to fetch filings',
      details: error instanceof Error ? error.message : String(error),
    });
  }
}
