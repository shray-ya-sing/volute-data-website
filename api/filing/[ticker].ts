/**
 * API endpoint to fetch a specific filing by ticker
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

  const { ticker } = req.query;

  if (!ticker || typeof ticker !== 'string') {
    return res.status(400).json({ error: 'Ticker is required' });
  }

  try {
    const sql = neon(process.env.DATABASE_URL!);

    // Get filing for this ticker
    const filings = await sql`
      SELECT
        f.id as filing_id,
        f.ticker,
        f.filing_date,
        f.blob_url
      FROM filings f
      WHERE f.ticker = ${ticker.toUpperCase()}
        AND f.status = 'completed'
      ORDER BY f.filing_date DESC
      LIMIT 1
    `;

    if (filings.length === 0) {
      return res.status(404).json({ error: 'Filing not found' });
    }

    const filing = filings[0];

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

    // Build the data structure
    const filingData: any = {
      'Company Ticker': filing.ticker,
      'Filing URL': filing.blob_url,
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

    return res.status(200).json(filingData);
  } catch (error) {
    console.error('Error fetching filing:', error);
    return res.status(500).json({
      error: 'Failed to fetch filing',
      details: error instanceof Error ? error.message : String(error),
    });
  }
}
