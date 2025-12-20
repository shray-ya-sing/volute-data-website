/**
 * Entity Extractor
 * Extracts company IDs and metric IDs from natural language queries
 */

import { COMPANY_ALIASES, METRIC_KEYWORDS } from '../config/searchMetadata';

export interface ExtractedEntities {
  companies: string[];  // Company IDs
  metrics: string[];    // Metric IDs
  rawQuery: string;     // Original query
}

/**
 * Calculate Levenshtein distance between two strings (for fuzzy matching)
 */
function levenshteinDistance(str1: string, str2: string): number {
  const m = str1.length;
  const n = str2.length;
  const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = Math.min(
          dp[i - 1][j] + 1,    // deletion
          dp[i][j - 1] + 1,    // insertion
          dp[i - 1][j - 1] + 1 // substitution
        );
      }
    }
  }

  return dp[m][n];
}

/**
 * Check if two strings are similar enough (fuzzy match)
 * Returns true if edit distance is <= 2 for strings > 5 chars
 */
function isFuzzyMatch(query: string, target: string): boolean {
  // Only use fuzzy matching for longer strings
  if (target.length < 5) return false;

  const distance = levenshteinDistance(query, target);
  const threshold = target.length <= 6 ? 1 : 2; // More lenient for longer words

  return distance <= threshold;
}

/**
 * Normalize query text for better matching
 */
function normalizeQuery(query: string): string {
  return query
    .toLowerCase()
    .trim()
    // Remove possessives
    .replace(/'s\b/g, '')
    .replace(/'\b/g, '')
    // Normalize whitespace
    .replace(/\s+/g, ' ')
    // Remove special characters but keep hyphens
    .replace(/[^\w\s-]/g, ' ')
    .trim();
}

/**
 * Extract entities from a natural language query using keyword matching
 */
export function extractEntities(query: string): ExtractedEntities {
  console.group('🔍 Entity Extraction');
  console.log('Original query:', query);

  const normalized = normalizeQuery(query);
  console.log('Normalized query:', normalized);

  const words = normalized.split(' ');
  console.log('Words:', words);

  const companies: string[] = [];
  const metrics: string[] = [];

  // Extract companies by matching aliases (exact match first)
  console.log('🏢 Searching for companies...');
  for (const [companyId, aliases] of Object.entries(COMPANY_ALIASES)) {
    let found = false;

    // Try exact substring match first
    for (const alias of aliases) {
      const normalizedAlias = alias.toLowerCase();

      if (normalized.includes(normalizedAlias)) {
        if (!companies.includes(companyId)) {
          companies.push(companyId);
          console.log(`  ✅ Exact match: "${normalizedAlias}" → ${companyId}`);
        }
        found = true;
        break;
      }
    }

    // If not found, try fuzzy matching on individual words
    if (!found) {
      for (const word of words) {
        if (word.length < 5) continue; // Skip short words for fuzzy matching

        for (const alias of aliases) {
          const normalizedAlias = alias.toLowerCase().replace(/[\s-]/g, ''); // Remove spaces/hyphens

          if (isFuzzyMatch(word, normalizedAlias)) {
            if (!companies.includes(companyId)) {
              companies.push(companyId);
              console.log(`  ✅ Fuzzy match: "${word}" → ${companyId} (alias: ${alias})`);
            }
            found = true;
            break;
          }
        }
        if (found) break;
      }
    }
  }

  if (companies.length === 0) {
    console.log('  ⚠️ No companies found');
  }

  // Extract metrics by matching keywords
  console.log('📊 Searching for metrics...');
  for (const [metricId, keywords] of Object.entries(METRIC_KEYWORDS)) {
    for (const keyword of keywords) {
      const normalizedKeyword = keyword.toLowerCase();

      if (normalized.includes(normalizedKeyword)) {
        if (!metrics.includes(metricId)) {
          metrics.push(metricId);
          console.log(`  ✅ Match: "${normalizedKeyword}" → ${metricId}`);
        }
        break; // Found this metric, move to next
      }
    }
  }

  if (metrics.length === 0) {
    console.log('  ⚠️ No specific metrics found (will show all)');
  }

  console.log('✅ Extracted companies:', companies);
  console.log('✅ Extracted metrics:', metrics);
  console.groupEnd();

  return {
    companies,
    metrics,
    rawQuery: query,
  };
}

/**
 * Detect query intent
 */
export function detectIntent(query: string): 'lookup' | 'compare' | 'list' {
  const normalized = query.toLowerCase();

  if (normalized.includes('compare') || normalized.includes('versus') || normalized.includes('vs')) {
    return 'compare';
  }

  if (normalized.includes('all') || normalized.includes('everything') || normalized.includes('show me')) {
    return 'list';
  }

  return 'lookup';
}

/**
 * Get a human-readable interpretation of the extraction
 */
export function getInterpretation(entities: ExtractedEntities): string {
  const { companies, metrics } = entities;

  if (companies.length === 0 && metrics.length === 0) {
    return 'No specific companies or metrics found';
  }

  const companyNames = companies.length > 0
    ? companies.join(', ')
    : 'all companies';

  const metricNames = metrics.length > 0
    ? metrics.join(', ')
    : 'all metrics';

  if (companies.length > 0 && metrics.length === 0) {
    return `Showing all metrics for ${companyNames}`;
  }

  if (companies.length === 0 && metrics.length > 0) {
    return `Showing ${metricNames} for all companies`;
  }

  return `Showing ${metricNames} for ${companyNames}`;
}
