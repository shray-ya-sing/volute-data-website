/**
 * Search Service
 * Filters IPO data based on extracted entities
 */

import { Company, Metric, MetricValue } from '../types';
import { extractEntities, getInterpretation, detectIntent } from './entityExtractor';

export interface SearchResult {
  // Filtered data for TablePage
  companies: Company[];
  metrics: Metric[];
  metricValues: MetricValue[];

  // Search metadata
  meta: {
    query: string;
    interpretation: string;
    intent: 'lookup' | 'compare' | 'list';
    companiesFound: string[];
    metricsFound: string[];
  };
}

/**
 * Search IPO data based on natural language query
 */
export function searchIPOData(
  query: string,
  allCompanies: Company[],
  allMetrics: Metric[],
  allMetricValues: MetricValue[]
): SearchResult {
  console.group('🔎 IPO Data Search');
  console.log('Query:', query);
  console.log('Available companies:', allCompanies.map(c => `${c.name} (${c.id})`));
  console.log('Available metrics:', allMetrics.length);
  console.log('Available metric values:', allMetricValues.length);

  // Extract entities from query
  const entities = extractEntities(query);
  const intent = detectIntent(query);
  const interpretation = getInterpretation(entities);

  console.log('Detected intent:', intent);
  console.log('Interpretation:', interpretation);

  // Filter companies
  const filteredCompanies = entities.companies.length > 0
    ? allCompanies.filter(c => entities.companies.includes(c.id))
    : allCompanies; // Show all if none specified

  console.log('📊 Filtering companies...');
  console.log('  Requested company IDs:', entities.companies);
  console.log('  Filtered to:', filteredCompanies.map(c => `${c.name} (${c.id})`));

  // Filter metrics
  const filteredMetrics = entities.metrics.length > 0
    ? allMetrics.filter(m => entities.metrics.includes(m.id))
    : allMetrics; // Show all if none specified

  console.log('📊 Filtering metrics...');
  console.log('  Requested metric IDs:', entities.metrics);
  console.log('  Filtered to:', filteredMetrics.map(m => `${m.name} (${m.id})`));

  // Filter metric values (must match both company AND metric)
  const filteredCompanyIds = filteredCompanies.map(c => c.id);
  const filteredMetricIds = filteredMetrics.map(m => m.id);

  console.log('📊 Filtering metric values...');
  console.log('  Company IDs to include:', filteredCompanyIds);
  console.log('  Metric IDs to include:', filteredMetricIds);

  const filteredMetricValues = allMetricValues.filter(mv =>
    filteredCompanyIds.includes(mv.companyId) &&
    filteredMetricIds.includes(mv.metricId)
  );

  console.log('  Filtered metric values:', filteredMetricValues.length);
  console.log('  Breakdown by company:');
  filteredCompanyIds.forEach(companyId => {
    const count = filteredMetricValues.filter(mv => mv.companyId === companyId).length;
    const companyName = filteredCompanies.find(c => c.id === companyId)?.name;
    console.log(`    - ${companyName}: ${count} values`);
  });

  console.log('✅ Search complete');
  console.groupEnd();

  return {
    companies: filteredCompanies,
    metrics: filteredMetrics,
    metricValues: filteredMetricValues,
    meta: {
      query,
      interpretation,
      intent,
      companiesFound: entities.companies,
      metricsFound: entities.metrics,
    },
  };
}

/**
 * Get summary statistics about search results
 */
export function getSearchStats(result: SearchResult): {
  totalCompanies: number;
  totalMetrics: number;
  totalValues: number;
  hasData: boolean;
} {
  return {
    totalCompanies: result.companies.length,
    totalMetrics: result.metrics.length,
    totalValues: result.metricValues.length,
    hasData: result.metricValues.length > 0,
  };
}
