import { generateObject } from 'ai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { z } from 'zod';

// Schema for the structured query extraction
const QuerySchema = z.object({
  companies: z.array(z.string()).describe('Company names or tickers mentioned in the query'),
  metrics: z.array(z.string()).describe('Metric names, data points, or concepts mentioned in the query'),
});

export type ParsedQuery = z.infer<typeof QuerySchema>;

interface ParseQueryOptions {
  availableCompanies?: Array<{ name: string; ticker: string }>;
  availableMetrics?: Array<{ id: string; name: string }>;
}

// Create Anthropic provider instance - API key should be in environment variables
const anthropic = createAnthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
});

/**
 * Parse a natural language query to extract companies and metrics
 * @param query - Natural language query from the user
 * @param options - Optional context about available companies and metrics
 * @returns Structured object with companies and metrics arrays
 */
export async function parseQuery(
  query: string,
  options?: ParseQueryOptions
): Promise<ParsedQuery> {
  const companiesContext = options?.availableCompanies
    ? `\n\nCurrently available companies:\n${options.availableCompanies.map(c => `- ${c.name} (${c.ticker})`).join('\n')}`
    : '';

  const metricsContext = options?.availableMetrics
    ? `\n\nCurrently available metrics:\n${options.availableMetrics.map(m => `- ${m.name}`).join('\n')}`
    : '';

  const { object } = await generateObject({
    model: anthropic('claude-3-5-sonnet-20241022'),
    schema: QuerySchema,
    schemaName: 'DataQueryExtraction',
    schemaDescription: 'Extracts companies and metrics from a data query',
    prompt: `You are a query parser for a financial data dashboard. Extract the companies and metrics/data points mentioned in the following user query.

User Query: "${query}"${companiesContext}${metricsContext}

Instructions:
1. Extract ALL company names or tickers mentioned in the query
2. Extract ALL metrics, data points, or financial concepts mentioned in the query
3. Handle synonyms and related terms intelligently:
   - "valuation" could mean IPO valuation, private valuation, or both
   - "proceeds" could mean gross proceeds, net proceeds, or proceeds to specific parties
   - "shares" could mean shares offered, shares outstanding, or shares sold by various parties
   - "price" could mean final price, opening price, closing price, or price range
4. Be inclusive rather than exclusive - if there's any ambiguity, include the metric
5. Return metric names in a form that's easy to match (e.g., "IPO Valuation", "Gross Proceeds", "Shares Sold")
6. If the user asks for "everything" or "all data", return empty arrays to indicate showing all
7. If no specific companies are mentioned, return an empty companies array (show all companies)
8. If no specific metrics are mentioned, return an empty metrics array (show all metrics)

Return only the extracted entities as structured data.`,
  });

  return object;
}
