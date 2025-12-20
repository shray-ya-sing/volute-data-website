#!/usr/bin/env tsx
/**
 * Local development API server for testing Neon integration
 * Mimics the Vercel API routes
 */

import { createServer } from 'http';
import { parse } from 'url';
import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const PORT = 3001;
const sql = neon(process.env.DATABASE_URL!);

// Helper to send JSON response
function sendJSON(res: any, statusCode: number, data: any) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  });
  res.end(JSON.stringify(data));
}

// Handle /api/filings - Get all filings
async function handleAllFilings(res: any) {
  try {
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

      result.push(filingData);
    }

    sendJSON(res, 200, result);
    console.log(`✓ Served ${result.length} filings`);
  } catch (error) {
    console.error('Error:', error);
    sendJSON(res, 500, {
      error: 'Failed to fetch filings',
      details: error instanceof Error ? error.message : String(error),
    });
  }
}

// Handle /api/filing/[ticker] - Get specific filing
async function handleFilingByTicker(res: any, ticker: string) {
  try {
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
      sendJSON(res, 404, { error: 'Filing not found' });
      return;
    }

    const filing = filings[0];

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

    sendJSON(res, 200, filingData);
    console.log(`✓ Served filing for ${ticker}`);
  } catch (error) {
    console.error('Error:', error);
    sendJSON(res, 500, {
      error: 'Failed to fetch filing',
      details: error instanceof Error ? error.message : String(error),
    });
  }
}

// Create server
const server = createServer((req, res) => {
  const parsedUrl = parse(req.url || '', true);
  const pathname = parsedUrl.pathname || '';

  console.log(`${req.method} ${pathname}`);

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(200, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    });
    res.end();
    return;
  }

  // Route handlers
  if (pathname === '/api/filings' && req.method === 'GET') {
    handleAllFilings(res);
  } else if (pathname.startsWith('/api/filing/') && req.method === 'GET') {
    const ticker = pathname.replace('/api/filing/', '');
    handleFilingByTicker(res, ticker);
  } else {
    sendJSON(res, 404, { error: 'Not found' });
  }
});

server.listen(PORT, () => {
  console.log('🚀 Local Dev API Server Running');
  console.log('='.repeat(50));
  console.log(`API Server: http://localhost:${PORT}`);
  console.log();
  console.log('Available endpoints:');
  console.log(`  GET http://localhost:${PORT}/api/filings`);
  console.log(`  GET http://localhost:${PORT}/api/filing/TTAN`);
  console.log();
  console.log('To test integration:');
  console.log('  1. Keep this server running');
  console.log('  2. In another terminal: npm run dev');
  console.log('  3. Open http://localhost:5173');
  console.log('  4. Update vite.config to proxy to :3001');
  console.log();
  console.log('Press Ctrl+C to stop');
  console.log('='.repeat(50));
});
