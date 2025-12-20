#!/usr/bin/env tsx
/**
 * Extract metrics from 424B4 filings using Claude Vision API
 * Uses pre-uploaded first 2 pages from Vercel Blob Storage
 */

import Anthropic from '@anthropic-ai/sdk';
import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

const sql = neon(process.env.DATABASE_URL!);

// Metrics we want to extract from the first 2 pages
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

interface ExtractedPageInfo {
  filename: string;
  url: string;
  pathname: string;
  size: number;
}

async function extractMetricsWithClaude(
  pdfUrl: string,
  ticker: string
): Promise<ExtractedMetric[]> {
  console.log('  Analyzing first 2 pages with Claude Vision API...');
  console.log(`  PDF URL: ${pdfUrl.substring(0, 80)}...`);

  const prompt = `You are analyzing the first 2 pages of a 424B4 IPO filing for ${ticker}.

Extract the following metrics from these pages. These are typically found on the cover page:

${TARGET_METRICS.map((m, i) => `${i + 1}. ${m}`).join('\n')}

For EACH metric you find:
1. Extract the exact value as it appears in the document
2. Note which page number it appears on (1 or 2)
3. Provide approximate bounding box coordinates (x, y, width, height as percentages of page dimensions)

Important clarifications:
- "Shares Offered (Primary)" = shares offered by the COMPANY (not by selling stockholders)
- "Shares Offered (Secondary)" = shares offered by SELLING STOCKHOLDERS
- "Proceeds to Company" = net proceeds that will go to the company
- "Proceeds to Selling Stockholders" = proceeds that will go to selling stockholders
- Look for USE OF PROCEEDS section which typically breaks down where the money goes

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
- Use exact text from the document (include $ signs, commas, etc.)
- Page numbers are 1-based (first page = 1, second page = 2)
- Bounding box coordinates should be percentages (0-100)
- If you cannot find a metric, omit it from the results
- Return ONLY the JSON array, no other text`;

  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 4096,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'document',
              source: {
                type: 'url',
                url: pdfUrl,
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

    const metrics = JSON.parse(jsonText);
    console.log(`  ✓ Extracted ${metrics.length} metrics`);
    return metrics;
  } catch (error) {
    console.error(`  ❌ Claude API error:`, error);
    throw error;
  }
}

async function insertFiling(ticker: string, filingDate: string, originalBlobUrl: string, extractedBlobUrl: string): Promise<number> {
  const result = await sql`
    INSERT INTO filings (ticker, filing_date, blob_url, blob_pathname, status)
    VALUES (${ticker}, ${filingDate}, ${extractedBlobUrl}, ${extractedBlobUrl.replace('https://pfrilrbw7rdy0sj5.public.blob.vercel-storage.com/', '')}, 'processing')
    ON CONFLICT (ticker, filing_date)
    DO UPDATE SET
      blob_url = EXCLUDED.blob_url,
      status = 'processing',
      processed_at = CURRENT_TIMESTAMP
    RETURNING id
  `;

  return result[0].id;
}

async function insertMetrics(filingId: number, metrics: ExtractedMetric[], pdfUrl: string): Promise<void> {
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
    await sql`
      INSERT INTO sources (filing_id, page_number, page_image_url, content_type)
      VALUES (${filingId}, ${pageNum}, ${pdfUrl}, 'pdf')
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

async function processExtractedPage(extractedPage: ExtractedPageInfo, originalFilingUrl: string): Promise<void> {
  // Extract ticker from filename (e.g., "ANRO_first_2_pages.pdf")
  const ticker = extractedPage.filename.split('_')[0];

  console.log(`\nProcessing: ${ticker}`);
  console.log(`  Extracted PDF: ${extractedPage.filename}`);
  console.log(`  Size: ${(extractedPage.size / 1024).toFixed(2)} KB`);

  let filingId: number;

  try {
    // Get filing date from original blob-upload-results.json
    const originalResults = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'blob-upload-results.json'), 'utf-8'));
    const originalFiling = originalResults.find((f: any) => f.filename.startsWith(ticker));

    if (!originalFiling) {
      throw new Error(`Could not find original filing for ${ticker}`);
    }

    const filingDate = originalFiling.filename.split('_')[1]; // Extract YYYY-MM-DD

    // Insert filing record
    filingId = await insertFiling(ticker, filingDate, originalFiling.url, extractedPage.url);
    console.log(`  ✓ Created filing record (ID: ${filingId})`);

    // Extract metrics with Claude using the blob URL
    const metrics = await extractMetricsWithClaude(extractedPage.url, ticker);

    // Insert metrics and sources
    await insertMetrics(filingId, metrics, extractedPage.url);
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
  console.log('424B4 Metrics Extraction Pipeline (Using Blob URLs)');
  console.log('='.repeat(70));
  console.log();

  // Read the extracted pages upload results
  const extractedPagesFile = path.join(process.cwd(), 'extracted-pages-upload-results.json');

  if (!fs.existsSync(extractedPagesFile)) {
    console.error('ERROR: extracted-pages-upload-results.json not found');
    console.error('Run: npm run blob:upload-extracted first');
    process.exit(1);
  }

  const extractedPages: ExtractedPageInfo[] = JSON.parse(fs.readFileSync(extractedPagesFile, 'utf-8'));
  console.log(`Found ${extractedPages.length} extracted page PDFs to process`);
  console.log();

  // Process each extracted page
  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < extractedPages.length; i++) {
    const extractedPage = extractedPages[i];

    try {
      await processExtractedPage(extractedPage, '');
      successCount++;

      // Rate limiting - wait between requests
      if (i < extractedPages.length - 1) {
        console.log('  Waiting 5s before next filing...');
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    } catch (error) {
      failCount++;
      console.error(`Failed to process: ${error}`);
    }
  }

  // Summary
  console.log();
  console.log('='.repeat(70));
  console.log('EXTRACTION SUMMARY');
  console.log('='.repeat(70));
  console.log(`Total filings: ${extractedPages.length}`);
  console.log(`Successful: ${successCount}`);
  console.log(`Failed: ${failCount}`);
  console.log();

  // Show sample of extracted data
  const sampleMetrics = await sql`
    SELECT f.ticker, f.filing_date, m.metric_name, m.metric_value, m.page_number
    FROM metrics m
    JOIN filings f ON m.filing_id = f.id
    ORDER BY f.filing_date DESC, m.metric_name
    LIMIT 15
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
