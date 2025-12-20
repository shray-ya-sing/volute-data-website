#!/usr/bin/env tsx
/**
 * Extract metrics from 424B4 filings using Claude Vision API
 * Processes first 2 pages to extract cover page metrics
 */

import Anthropic from '@anthropic-ai/sdk';
import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
import { PDFDocument } from 'pdf-lib';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

const sql = neon(process.env.DATABASE_URL!);

// Metrics we want to extract from the first page (prospectus summary)
const TARGET_METRICS = [
  'Company Name',
  'Company Ticker',
  'Exchange',
  'Filing Date',
  'IPO Date',
  'Final Price',
  'Shares Offered (Primary)',
  'Shares Offered (Secondary)',
  'Gross Proceeds',
  'Net Proceeds',
  'Proceeds to Company',
  'Proceeds to Selling Stockholders',
  'Greenshoe Option',
  'Underwriter Discount (Per Share)',
  'Underwriter Discount (Total)',
  'Lead Bookrunners',
  'Co-Bookrunners',
  'Syndicate Members',
  'Directed Share Program',
  'Shares Delivery Date'
];

interface ExtractedMetric {
  metric_name: string;
  metric_value: string;
  page_number: number;
  bounding_box?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  confidence?: number;
}

interface FilingToProcess {
  filename: string;
  url: string;
  pathname: string;
  size: number;
}

async function extractFirstPage(url: string, ticker: string): Promise<string> {
  console.log(`  Fetching PDF from: ${url.substring(0, 60)}...`);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch PDF: ${response.statusText}`);
  }
  const pdfBytes = await response.arrayBuffer();
  console.log(`  ✓ Downloaded PDF (${(pdfBytes.byteLength / 1024 / 1024).toFixed(2)} MB)`);

  // Load the PDF
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const totalPages = pdfDoc.getPageCount();
  console.log(`  Total pages in PDF: ${totalPages}`);

  // Create a new PDF with only first page (prospectus summary)
  const newPdf = await PDFDocument.create();
  const pagesToCopy = Math.min(1, totalPages);

  const copiedPages = await newPdf.copyPages(pdfDoc, [0].slice(0, pagesToCopy));
  copiedPages.forEach(page => newPdf.addPage(page));

  console.log(`  ✓ Extracted first page (prospectus summary)`);

  // Save the extracted page locally for auditing
  const extractedDir = path.join(process.cwd(), 'extracted-pages');
  if (!fs.existsSync(extractedDir)) {
    fs.mkdirSync(extractedDir, { recursive: true });
  }

  const extractedPath = path.join(extractedDir, `${ticker}_page_1.pdf`);
  const extractedBytes = await newPdf.save();
  fs.writeFileSync(extractedPath, extractedBytes);
  console.log(`  ✓ Saved to: ${extractedPath}`);

  // Return as base64
  return Buffer.from(extractedBytes).toString('base64');
}

async function extractMetricsWithClaude(
  pdfBase64: string,
  ticker: string
): Promise<ExtractedMetric[]> {
  console.log('  Analyzing first 2 pages with Claude Vision API...');

  const prompt = `You are analyzing the first 2 pages of a 424B4 IPO filing for ${ticker}.

Extract the following metrics from these pages. These are typically found on the cover page:

${TARGET_METRICS.map((m, i) => `${i + 1}. ${m}`).join('\n')}

For EACH metric you find:
1. Extract the exact value as it appears in the document
2. Note which page number it appears on (1 or 2)
3. If possible, provide approximate bounding box coordinates (x, y, width, height as percentages of page dimensions)

Return your response as a JSON array with this structure:
[
  {
    "metric_name": "Company Name",
    "metric_value": "Example Corp, Inc.",
    "page_number": 1,
    "bounding_box": {"x": 10, "y": 15, "width": 30, "height": 5},
    "confidence": 0.95
  }
]

Important:
- Only include metrics you can find with high confidence
- Use exact text from the document
- Page numbers are 1-based (first page = 1, second page = 2)
- Bounding box coordinates should be percentages (0-100)
- If you cannot find a metric, omit it from the results
- Return ONLY the JSON array, no other text`;

  const message = await anthropic.messages.create({
    model: 'claude-3-opus-20240229',
    max_tokens: 4096,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'document',
            source: {
              type: 'base64',
              media_type: 'application/pdf',
              data: pdfBase64,
            },
          },
          {
            type: 'text',
            text: prompt,
          },
        ],
      },
    ],
  });

  const responseText = message.content[0].type === 'text' ? message.content[0].text : '';

  // Extract JSON from response (handle markdown code blocks)
  let jsonText = responseText.trim();
  if (jsonText.startsWith('```json')) {
    jsonText = jsonText.replace(/```json\n?/, '').replace(/```\n?$/, '');
  } else if (jsonText.startsWith('```')) {
    jsonText = jsonText.replace(/```\n?/, '').replace(/```\n?$/, '');
  }

  try {
    const metrics = JSON.parse(jsonText);
    console.log(`  ✓ Extracted ${metrics.length} metrics`);
    return metrics;
  } catch (error) {
    console.error('  Failed to parse Claude response:', responseText.substring(0, 200));
    throw error;
  }
}

async function insertFiling(filing: FilingToProcess): Promise<number> {
  // Extract ticker and date from filename
  const parts = filing.filename.replace('.pdf', '').split('_');
  const ticker = parts[0];
  const filingDate = parts[1]; // Format: YYYY-MM-DD

  const result = await sql`
    INSERT INTO filings (ticker, filing_date, blob_url, blob_pathname, pdf_size_bytes, status)
    VALUES (${ticker}, ${filingDate}, ${filing.url}, ${filing.pathname}, ${filing.size}, 'processing')
    ON CONFLICT (ticker, filing_date)
    DO UPDATE SET
      blob_url = EXCLUDED.blob_url,
      status = 'processing',
      processed_at = CURRENT_TIMESTAMP
    RETURNING id
  `;

  return result[0].id;
}

async function insertMetrics(filingId: number, metrics: ExtractedMetric[]): Promise<void> {
  for (const metric of metrics) {
    await sql`
      INSERT INTO metrics (
        filing_id,
        metric_name,
        metric_value,
        page_number,
        bounding_box,
        confidence
      )
      VALUES (
        ${filingId},
        ${metric.metric_name},
        ${metric.metric_value},
        ${metric.page_number},
        ${JSON.stringify(metric.bounding_box)},
        ${metric.confidence || 1.0}
      )
      ON CONFLICT (filing_id, metric_name)
      DO UPDATE SET
        metric_value = EXCLUDED.metric_value,
        page_number = EXCLUDED.page_number,
        bounding_box = EXCLUDED.bounding_box,
        confidence = EXCLUDED.confidence,
        extracted_at = CURRENT_TIMESTAMP
    `;
  }

  // Insert source references for pages 1 and 2
  for (let pageNum = 1; pageNum <= 2; pageNum++) {
    const filing = await sql`SELECT blob_url FROM filings WHERE id = ${filingId}`;
    await sql`
      INSERT INTO sources (filing_id, page_number, page_image_url, content_type)
      VALUES (${filingId}, ${pageNum}, ${filing[0].blob_url}, 'pdf')
      ON CONFLICT (filing_id, page_number)
      DO UPDATE SET
        page_image_url = EXCLUDED.page_image_url,
        extracted_at = CURRENT_TIMESTAMP
    `;
  }
}

async function updateFilingStatus(
  filingId: number,
  status: 'completed' | 'failed',
  errorMessage?: string
): Promise<void> {
  await sql`
    UPDATE filings
    SET status = ${status}, error_message = ${errorMessage || null}
    WHERE id = ${filingId}
  `;
}

async function processFiling(filing: FilingToProcess): Promise<void> {
  const parts = filing.filename.replace('.pdf', '').split('_');
  const ticker = parts[0];

  console.log(`\nProcessing: ${ticker} - ${filing.filename}`);
  console.log(`  Size: ${(filing.size / 1024 / 1024).toFixed(2)} MB`);

  let filingId: number;

  try {
    // Insert filing record
    filingId = await insertFiling(filing);
    console.log(`  ✓ Created filing record (ID: ${filingId})`);

    // Extract first 2 pages
    const pdfBase64 = await extractFirst2Pages(filing.url, ticker);

    // Extract metrics with Claude
    const metrics = await extractMetricsWithClaude(pdfBase64, ticker);

    // Insert metrics and sources
    await insertMetrics(filingId, metrics);
    console.log(`  ✓ Stored ${metrics.length} metrics in database`);

    // Update status to completed
    await updateFilingStatus(filingId, 'completed');
    console.log(`  ✅ Successfully processed ${ticker}`);

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(`  ❌ Error processing ${ticker}: ${errorMsg}`);

    if (filingId!) {
      await updateFilingStatus(filingId, 'failed', errorMsg);
    }
  }
}

async function main() {
  console.log('424B4 Metrics Extraction Pipeline');
  console.log('='.repeat(70));
  console.log();

  // Read the uploaded filings from blob-upload-results.json
  const resultsFile = path.join(process.cwd(), 'blob-upload-results.json');

  if (!fs.existsSync(resultsFile)) {
    console.error('ERROR: blob-upload-results.json not found');
    console.error('Run: npm run blob:upload-424b4 first');
    process.exit(1);
  }

  const filings: FilingToProcess[] = JSON.parse(fs.readFileSync(resultsFile, 'utf-8'));
  console.log(`Found ${filings.length} filings to process`);
  console.log();

  // Check for already processed filings
  const processed = await sql`
    SELECT ticker, filing_date, status
    FROM filings
    WHERE status = 'completed'
  `;
  console.log(`Already processed: ${processed.length} filings`);
  console.log();

  // Process each filing
  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < filings.length; i++) {
    const filing = filings[i];

    try {
      await processFiling(filing);
      successCount++;

      // Rate limiting - wait between requests
      if (i < filings.length - 1) {
        console.log('  Waiting 3s before next filing...');
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
    } catch (error) {
      failCount++;
      console.error(`Failed to process filing: ${error}`);
    }
  }

  // Summary
  console.log();
  console.log('='.repeat(70));
  console.log('EXTRACTION SUMMARY');
  console.log('='.repeat(70));
  console.log(`Total filings: ${filings.length}`);
  console.log(`Successful: ${successCount}`);
  console.log(`Failed: ${failCount}`);
  console.log();

  // Show sample of extracted data
  const sampleMetrics = await sql`
    SELECT f.ticker, f.filing_date, m.metric_name, m.metric_value, m.page_number
    FROM metrics m
    JOIN filings f ON m.filing_id = f.id
    ORDER BY f.filing_date DESC, m.metric_name
    LIMIT 10
  `;

  if (sampleMetrics.length > 0) {
    console.log('Sample extracted metrics:');
    sampleMetrics.forEach((m: any) => {
      console.log(`  ${m.ticker} | ${m.metric_name}: ${m.metric_value} (page ${m.page_number})`);
    });
  }

  console.log();
  console.log('✅ Pipeline complete!');
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
