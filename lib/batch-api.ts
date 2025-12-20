/**
 * Claude Batch API utilities
 * Handles batch request creation, submission, and result processing
 */

import Anthropic from '@anthropic-ai/sdk';

export interface BatchRequest {
  custom_id: string;
  params: {
    model: string;
    max_tokens: number;
    messages: Array<{
      role: 'user';
      content: Array<{
        type: 'document';
        source: {
          type: 'url';
          url: string;
        };
      } | {
        type: 'text';
        text: string;
      }>;
    }>;
  };
}

export interface BatchFilingInput {
  ticker: string;
  filingId: number;
  blobUrl: string;
  targetMetrics: string[];
}

/**
 * Create a batch request for a single filing
 */
export function createFilingBatchRequest(
  input: BatchFilingInput
): BatchRequest {
  const { ticker, filingId, blobUrl, targetMetrics } = input;

  const prompt = `You are analyzing a 424B4 IPO filing document (prospectus summary - page 1).

Extract the following metrics from the document:
${targetMetrics.map((m, i) => `${i + 1}. ${m}`).join('\n')}

IMPORTANT INSTRUCTIONS:
1. Extract EXACT values as they appear in the document (preserve formatting, commas, dollar signs, dates)
2. For dates, use format: YYYY-MM-DD (e.g., "2024-12-18")
3. For prices, include dollar sign: "$71.00"
4. For share counts, include commas: "8,800,000"
5. For bookrunners, list all banks separated by commas
6. If a value is not found or not applicable, use "N/A"
7. For bounding boxes, provide coordinates as percentages (0-100) from top-left of page
8. Confidence should be 0.0-1.0 (1.0 = certain, 0.5 = uncertain)

Return a JSON object with this structure:
{
  "metrics": [
    {
      "metric_name": "Company Name",
      "metric_value": "ServiceTitan, Inc.",
      "page_number": 1,
      "bounding_box": {
        "x": 15.5,
        "y": 10.2,
        "width": 70.0,
        "height": 2.5
      },
      "confidence": 1.0
    },
    ...
  ]
}

Be precise and accurate. Double-check all numbers and dates.`;

  return {
    custom_id: `filing_${filingId}_${ticker}`,
    params: {
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
                url: blobUrl,
              },
            },
            {
              type: 'text',
              text: prompt,
            },
          ],
        },
      ],
    },
  };
}

/**
 * Create JSONL content for batch submission
 */
export function createBatchJSONL(requests: BatchRequest[]): string {
  return requests.map(req => JSON.stringify(req)).join('\n');
}

/**
 * Submit a batch to Claude API
 */
export async function submitBatch(
  anthropic: Anthropic,
  jsonlContent: string,
  description?: string
): Promise<{ id: string; processing_status: string; expires_at: string }> {
  // Create a temporary file-like object for the batch
  const blob = new Blob([jsonlContent], { type: 'application/jsonl' });

  const batch = await anthropic.beta.messages.batches.create({
    requests: jsonlContent.split('\n').map(line => JSON.parse(line)),
  });

  return {
    id: batch.id,
    processing_status: batch.processing_status,
    expires_at: batch.expires_at,
  };
}

/**
 * Get batch status
 */
export async function getBatchStatus(
  anthropic: Anthropic,
  batchId: string
): Promise<{
  id: string;
  processing_status: string;
  request_counts: {
    processing: number;
    succeeded: number;
    errored: number;
    canceled: number;
    expired: number;
  };
  ended_at: string | null;
  expires_at: string;
  results_url: string | null;
}> {
  const batch = await anthropic.beta.messages.batches.retrieve(batchId);

  return {
    id: batch.id,
    processing_status: batch.processing_status,
    request_counts: batch.request_counts,
    ended_at: batch.ended_at,
    expires_at: batch.expires_at,
    results_url: batch.results_url || null,
  };
}

/**
 * Download and parse batch results
 */
export async function getBatchResults(
  anthropic: Anthropic,
  batchId: string
): Promise<Array<{
  custom_id: string;
  result: {
    type: 'succeeded' | 'errored';
    message?: any;
    error?: any;
  };
}>> {
  const results = await anthropic.beta.messages.batches.results(batchId);

  // The results are returned as a stream of JSONL
  const resultsArray: any[] = [];

  for await (const result of results) {
    resultsArray.push(result);
  }

  return resultsArray;
}

/**
 * Parse extracted metrics from batch result
 */
export function parseMetricsFromResult(resultContent: any): Array<{
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
}> {
  // Handle different response formats
  if (typeof resultContent === 'string') {
    // Try to parse as JSON
    try {
      const parsed = JSON.parse(resultContent);
      if (parsed.metrics) {
        return parsed.metrics;
      }
    } catch {
      // If it's markdown wrapped, extract JSON
      const jsonMatch = resultContent.match(/```json\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[1]);
        if (parsed.metrics) {
          return parsed.metrics;
        }
      }
    }
  } else if (resultContent.metrics) {
    return resultContent.metrics;
  }

  console.warn('Could not parse metrics from result:', resultContent);
  return [];
}
