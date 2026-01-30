#!/usr/bin/env tsx
/**
 * Local development API server for testing Neon integration
 * Mimics the Vercel API routes
 */

// Load environment variables FIRST before any other imports
import dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '..', '.env.local') });

const activeSandboxes = new Set<string>();

// Verify env vars loaded
if (!process.env.DATABASE_URL || process.env.ANTHROPIC_API_KEY === '') {
  console.error('ERROR: DATABASE_URL or ANTHROPIC_API_KEY not found in environment');
  console.error('Check that .env.local exists and contains DATABASE_URL and ANTHROPIC_API_KEY');
  process.exit(1);
}

// Now import everything else after env vars are loaded
import { createServer } from 'http';
import { parse } from 'url';
import { neon } from '@neondatabase/serverless';

const PORT = 3001;
const sql = neon(process.env.DATABASE_URL);

// Dynamic imports for handlers (to ensure env vars are loaded first)
let extractProspectusHandler: any;
let submitProspectusBatchHandler: any;
let pollBatchesHandler: any;
let searchHandler: any;
let analyzeHandler: any;

async function loadHandlers() {
  const extractModule = await import('../api/cron/extract-prospectus.js');
  extractProspectusHandler = extractModule.default;

  const submitModule = await import('../api/cron/submit-prospectus-batch.js');
  submitProspectusBatchHandler = submitModule.default;

  const pollModule = await import('../api/cron/poll-batches.js');
  pollBatchesHandler = pollModule.default;

  const searchModule = await import('../api/search.ts');
  searchHandler = searchModule.default;

  // Load the  Claude Sandbox handler
  const analyzeModule = await import('../api/analyze.ts'); 
  analyzeHandler = analyzeModule.default;
}

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
  } else if (pathname === '/api/cron/extract-prospectus' && req.method === 'GET') {
    // Create mock request/response for the cron handler
    const mockReq: any = {
      query: parsedUrl.query || {},
      headers: req.headers,
      method: req.method,
      url: req.url,
    };

    const mockRes: any = {
      status: (code: number) => {
        mockRes.statusCode = code;
        return mockRes;
      },
      json: (data: any) => {
        sendJSON(res, mockRes.statusCode || 200, data);
      },
      statusCode: 200,
    };

    extractProspectusHandler(mockReq, mockRes).catch((error: any) => {
      console.error('Error in extract-prospectus:', error);
      sendJSON(res, 500, { error: error.message });
    });
  } else if (pathname === '/api/cron/submit-prospectus-batch' && req.method === 'GET') {
    // Create mock request/response for the batch submission handler
    const mockReq: any = {
      query: parsedUrl.query || {},
      headers: req.headers,
      method: req.method,
      url: req.url,
    };

    const mockRes: any = {
      status: (code: number) => {
        mockRes.statusCode = code;
        return mockRes;
      },
      json: (data: any) => {
        sendJSON(res, mockRes.statusCode || 200, data);
      },
      statusCode: 200,
    };

    submitProspectusBatchHandler(mockReq, mockRes).catch((error: any) => {
      console.error('Error in submit-prospectus-batch:', error);
      sendJSON(res, 500, { error: error.message });
    });
  } else if (pathname === '/api/cron/poll-batches' && req.method === 'GET') {
    // Create mock request/response for the poll batches handler
    const mockReq: any = {
      query: parsedUrl.query || {},
      headers: req.headers,
      method: req.method,
      url: req.url,
    };

    const mockRes: any = {
      status: (code: number) => {
        mockRes.statusCode = code;
        return mockRes;
      },
      json: (data: any) => {
        sendJSON(res, mockRes.statusCode || 200, data);
      },
      statusCode: 200,
    };

    pollBatchesHandler(mockReq, mockRes).catch((error: any) => {
      console.error('Error in poll-batches:', error);
      sendJSON(res, 500, { error: error.message });
    });
  } else if (pathname === '/api/search') {
    // Collect body data for POST requests
    let body = '';
    req.on('data', chunk => { body += chunk; });
    
    req.on('end', async () => {
      const mockReq: any = {
        query: parsedUrl.query || {},
        headers: req.headers,
        method: req.method,
        url: req.url,
        body: body ? JSON.parse(body) : {}, // Parse JSON body for POST
      };

      const mockRes: any = {
        status: (code: number) => {
          mockRes.statusCode = code;
          return mockRes;
        },
        setHeader: (name: string, value: string) => {
          res.setHeader(name, value);
        },
        json: (data: any) => {
          sendJSON(res, mockRes.statusCode || 200, data);
        },
        end: () => res.end(),
        statusCode: 200,
      };

      try {
        await searchHandler(mockReq, mockRes);
      } catch (error: any) {
        console.error('Error in search:', error);
        sendJSON(res, 500, { error: error.message });
      }
    });
  } // 3. New Route Registration for /api/analyze
    else if (pathname === '/api/analyze' && req.method === 'POST') {
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', async () => {
        const mockReq: any = {
          query: parsedUrl.query || {},
          headers: req.headers,
          method: req.method,
          url: req.url,
          body: body ? JSON.parse(body) : {},
        };        

        const mockRes: any = {
          status: (code: number) => {
            mockRes.statusCode = code;
            return mockRes;
          },
          setHeader: (name: string, value: string) => {
            res.setHeader(name, value);
          },
          json: (data: any) => {
            sendJSON(res, mockRes.statusCode || 200, data);
          },
          statusCode: 200,
        };

        try {
          await analyzeHandler(mockReq, mockRes);
        } catch (error: any) {
          console.error('Error in analyze:', error);
          sendJSON(res, 500, { error: error.message });
        }
      });
  }
  else {
    sendJSON(res, 404, { error: 'Not found' });
  }
});

// Load handlers and start server
loadHandlers().then(() => {
  server.listen(PORT, () => {
    console.log('🚀 Local Dev API Server Running');
    console.log('='.repeat(50));
    console.log(`API Server: http://localhost:${PORT}`);
    console.log();
    console.log('Available endpoints:');
    console.log(`  GET http://localhost:${PORT}/api/filings`);
    console.log(`  GET http://localhost:${PORT}/api/filing/TTAN`);
    console.log(`  GET http://localhost:${PORT}/api/cron/extract-prospectus?limit=10`);
    console.log(`  GET http://localhost:${PORT}/api/cron/submit-prospectus-batch (processes ALL unprocessed)`);
    console.log(`  GET http://localhost:${PORT}/api/cron/poll-batches`);
    console.log(`  GET http://localhost:${PORT}/api/search?q=query`);
    console.log(`  POST http://localhost:${PORT}/api/analyze`);
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
}).catch(error => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
