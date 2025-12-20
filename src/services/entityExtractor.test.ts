/**
 * Test cases for entity extraction
 * Run these manually in browser console to verify
 */

import { extractEntities } from './entityExtractor';

// Test case helper
function testQuery(query: string, expectedCompanies: string[], expectedMetrics: string[]) {
  const result = extractEntities(query);
  const companiesMatch = JSON.stringify(result.companies.sort()) === JSON.stringify(expectedCompanies.sort());
  const metricsMatch = JSON.stringify(result.metrics.sort()) === JSON.stringify(expectedMetrics.sort());

  console.log(`\nQuery: "${query}"`);
  console.log(`  Companies: ${JSON.stringify(result.companies)} ${companiesMatch ? '✅' : '❌'}`);
  console.log(`  Metrics: ${JSON.stringify(result.metrics)} ${metricsMatch ? '✅' : '❌'}`);

  return companiesMatch && metricsMatch;
}

// Run all tests
export function runEntityExtractionTests() {
  console.log('=== Entity Extraction Tests ===');

  let passed = 0;
  let total = 0;

  // Test 1: Different casing
  total++;
  if (testQuery('CoreWeave opening price', ['coreweave'], ['openingPrice'])) passed++;

  total++;
  if (testQuery('COREWEAVE opening price', ['coreweave'], ['openingPrice'])) passed++;

  total++;
  if (testQuery('coreweave opening price', ['coreweave'], ['openingPrice'])) passed++;

  // Test 2: Possessives
  total++;
  if (testQuery("coreweave's opening price", ['coreweave'], ['openingPrice'])) passed++;

  total++;
  if (testQuery("CoreWeave's IPO", ['coreweave'], ['ipoDate'])) passed++;

  // Test 3: Misspellings (in alias list)
  total++;
  if (testQuery('corweave opening price', ['coreweave'], ['openingPrice'])) passed++;

  total++;
  if (testQuery('rubric shares', ['rubrik'], ['sharesOffered'])) passed++;

  // Test 4: Fuzzy matching (severe misspellings)
  total++;
  if (testQuery('coreweve opening price', ['coreweave'], ['openingPrice'])) passed++;

  total++;
  if (testQuery('asteraa ipo date', ['astera'], ['ipoDate'])) passed++;

  // Test 5: "Everything" query (should find company, no specific metrics)
  total++;
  if (testQuery('show me everything you have on coreweave', ['coreweave'], [])) passed++;

  total++;
  if (testQuery("show me everything you have on coreweave's ipo", ['coreweave'], ['ipoDate'])) passed++;

  // Test 6: Multiple companies
  total++;
  if (testQuery('compare coreweave and rubrik', ['coreweave', 'rubrik'], [])) passed++;

  // Test 7: Ticker symbols
  total++;
  if (testQuery('CRWV opening price', ['coreweave'], ['openingPrice'])) passed++;

  total++;
  if (testQuery('alab shares offered', ['astera'], ['sharesOffered'])) passed++;

  // Test 8: Complex queries
  total++;
  if (testQuery('what was Rubrik final ipo price', ['rubrik'], ['finalPrice', 'ipoDate'])) passed++;

  total++;
  if (testQuery('show me coreweave and astera opening and closing prices',
    ['coreweave', 'astera'],
    ['openingPrice', 'firstDayClosingPrice'])) passed++;

  console.log(`\n=== Results: ${passed}/${total} tests passed ===`);

  return { passed, total };
}

// Export test queries for manual testing
export const TEST_QUERIES = {
  casing: [
    'CoreWeave opening price',
    'COREWEAVE opening price',
    'coreweave opening price',
  ],
  possessives: [
    "coreweave's opening price",
    "CoreWeave's IPO",
    "rubrik's shares",
  ],
  misspellings: [
    'corweave opening price',
    'rubric shares',
    'asteria ipo date',
  ],
  fuzzy: [
    'coreweve opening price',
    'rubrck shares',
    'asteraa ipo',
  ],
  everything: [
    'show me everything you have on coreweave',
    "show me everything you have on coreweave's ipo",
    'all coreweave metrics',
  ],
  comparison: [
    'compare coreweave and rubrik',
    'coreweave vs astera opening prices',
  ],
  tickers: [
    'CRWV opening price',
    'RBRK shares',
    'ALAB ipo date',
  ],
};
