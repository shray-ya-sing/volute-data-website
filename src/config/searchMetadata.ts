/**
 * Search metadata for entity extraction
 * This file maps natural language to company IDs and metric IDs
 */

// Company aliases for keyword matching (include common misspellings)
// NOTE: Keys MUST match the company IDs in the database!
// - Static data companies use numeric IDs: "1", "2", etc.
// - localStorage companies use friendly IDs: "coreweave", etc.
export const COMPANY_ALIASES: Record<string, string[]> = {
  // Rubrik (ID = "1" from static data)
  '1': [
    'rubrik', 'rbrk', 'rubrik inc',
    // Common misspellings
    'rubric', 'rubrick', 'rubrk'
  ],
  // Astera (ID = "2" from static data)
  '2': [
    'astera', 'alab', 'astera labs', 'astera-labs', 'astera labs inc',
    // Common misspellings
    'asteria', 'astera lab', 'asteralabs'
  ],
  // CoreWeave (ID = "coreweave" from localStorage)
  'coreweave': [
    'coreweave', 'crwv', 'core weave', 'core-weave',
    // Common misspellings
    'corweave', 'corewave', 'coreweavw', 'corewaive', 'core wave'
  ],
};

// Metric keywords for matching
export const METRIC_KEYWORDS: Record<string, string[]> = {
  // Dates
  'ipoDate': ['ipo date', 'when did', 'listing date', 'went public'],

  // Pricing
  'finalPrice': ['final price', 'ipo price', 'priced at', 'pricing'],
  'openingPrice': ['opening price', 'opened at', 'first trade', 'opening', 'open price'],
  'firstDayClosingPrice': ['closing price', 'closed at', 'first day close', 'end of day price', 'first close'],
  'priceRange': ['price range', 'expected price', 'range', 'price guidance'],

  // Valuation
  'ipoValuation': ['ipo valuation', 'valuation', 'market cap', 'valued at'],
  'lastPrivateValuation': ['private valuation', 'last valuation', 'pre-ipo valuation'],

  // Sizing
  'upsizedOrDownsized': ['upsized', 'downsized', 'sizing', 'offering size change'],
  'sharesOffered': ['shares offered', 'primary shares', 'shares', 'offering size', 'total shares'],
  'sharesCompany': ['shares company', 'shares sold by company', 'primary shares from company'],
  'sharesSellingStockholders': ['shares selling stockholders', 'shares sold by stockholders', 'secondary shares', 'insider shares'],
  'greenshoeShares': ['greenshoe', 'overallotment', 'greenshoe shares', 'option shares'],
  'commonStockOutstanding': ['common stock outstanding', 'outstanding shares', 'total outstanding'],

  // Proceeds
  'grossProceeds': ['gross proceeds', 'total proceeds', 'total raised', 'gross raise'],
  'netProceeds': ['net proceeds', 'net raised', 'proceeds after expenses'],
  'proceedsToCompany': ['proceeds to company', 'company proceeds', 'raised by company'],
  'proceedsToSellingStockholders': ['proceeds to stockholders', 'proceeds to selling stockholders', 'insider proceeds'],

  // Fees & Banks
  'underwriterDiscount': ['underwriter discount', 'underwriting fee', 'fees', 'discount'],
  'bookrunners': ['bookrunners', 'bookrunning banks', 'underwriters', 'banks', 'lead banks'],
  'attorneys': ['attorneys', 'lawyers', 'legal counsel', 'counsel'],

  // Notes
  'notes': ['notes', 'additional info', 'comments'],
};

// Category tags for metadata filtering
// NOTE: Keys MUST match the company IDs in the database!
export const COMPANY_CATEGORIES: Record<string, string[]> = {
  '1': ['saas', 'enterprise', 'cloud', 'security', 'data'], // Rubrik
  '2': ['hardware', 'ai', 'connectivity', 'infrastructure'], // Astera
  'coreweave': ['saas', 'ai', 'infrastructure', 'cloud', 'gpu'], // CoreWeave
};

// Helper to get all aliases for a company
export function getCompanyAliases(companyId: string): string[] {
  return COMPANY_ALIASES[companyId] || [companyId];
}

// Helper to get all keywords for a metric
export function getMetricKeywords(metricId: string): string[] {
  return METRIC_KEYWORDS[metricId] || [metricId];
}

// Helper to get category tags for a company
export function getCompanyCategories(companyId: string): string[] {
  return COMPANY_CATEGORIES[companyId] || [];
}
