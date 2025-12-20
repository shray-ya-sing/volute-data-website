#!/usr/bin/env tsx
/**
 * Test script for submit-prospectus-batch cron job
 */

import handler from '../api/cron/submit-prospectus-batch.js';
import dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

// Mock Vercel Request and Response
const mockReq: any = {
  query: {
    limit: '10', // Process 10 PDFs
  },
  headers: {},
  method: 'GET',
  url: '/api/cron/submit-prospectus-batch?limit=10',
};

const mockRes: any = {
  status: (code: number) => {
    mockRes.statusCode = code;
    return mockRes;
  },
  json: (data: any) => {
    console.log('\n' + '='.repeat(70));
    console.log('RESPONSE');
    console.log('='.repeat(70));
    console.log(`Status: ${mockRes.statusCode || 200}`);
    console.log(JSON.stringify(data, null, 2));
    console.log('='.repeat(70));
  },
  statusCode: 200,
};

// Run the handler
console.log('Testing submit-prospectus-batch cron job...\n');
handler(mockReq, mockRes).catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
