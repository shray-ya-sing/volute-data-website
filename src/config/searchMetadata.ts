/**
 * Search metadata for entity extraction
 * This file maps natural language to company IDs and metric IDs
 */

// Company aliases for keyword matching (include common misspellings)
// NOTE: Keys MUST match the company IDs in the database!
// - Neon database companies use numeric IDs: "1", "2", etc. (assigned by order in API response)
// - localStorage companies use friendly IDs: "coreweave", etc.
export const COMPANY_ALIASES: Record<string, string[]> = {
  // ServiceTitan (ID = "1" from Neon)
  '1': [
    'servicetitan', 'ttan', 'service titan', 'service-titan',
    // Common misspellings
    'servicetitan inc', 'servicetitan inc.', 'service tita'
  ],
  // WEBTOON (ID = "2" from Neon)
  '2': [
    'webtoon', 'wbtn', 'web toon', 'webtoon entertainment',
    // Common misspellings
    'webtune', 'webtooon', 'web-toon'
  ],
  // Tempus AI (ID = "3" from Neon)
  '3': [
    'tempus', 'tem', 'tempus ai', 'tempus-ai', 'tempus ai inc',
    // Common misspellings
    'tempus a i', 'tempusai'
  ],
  // Alto Neuroscience (ID = "4" from Neon)
  '4': [
    'alto', 'anro', 'alto neuroscience', 'alto-neuroscience',
    // Common misspellings
    'alto neuro', 'altoneuroscience', 'alto neuroscience inc'
  ],
  // BrightSpring (ID = "5" from Neon)
  '5': [
    'brightspring', 'btsg', 'bright spring', 'brightspring health',
    // Common misspellings
    'bright-spring', 'brightspring health services'
  ],
  // WeRide (ID = "6" from Neon)
  '6': [
    'weride', 'wrd', 'we ride', 'we-ride',
    // Common misspellings
    'weride inc', 'we-ride inc'
  ],
  // CoreWeave (ID = "coreweave" from localStorage)
  'coreweave': [
    'coreweave', 'crwv', 'core weave', 'core-weave',
    // Common misspellings
    'corweave', 'corewave', 'coreweavw', 'corewaive', 'core wave'
  ],
  // Reddit (ID = "reddit" from localStorage)
  'reddit': [
    'reddit', 'rddt', 'red dit', 'reddit inc',
    // Common misspellings
    'redit', 'reditt'
  ],
  // UiPath (ID = "uipath" from localStorage)
  'uipath': [
    'uipath', 'path', 'ui path', 'ui-path', 'uipath inc',
    // Common misspellings
    'upath', 'uipathe'
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
  '1': ['saas', 'enterprise', 'software', 'field service'], // ServiceTitan
  '2': ['media', 'entertainment', 'digital', 'webtoons'], // WEBTOON
  '3': ['healthcare', 'ai', 'precision medicine', 'biotech'], // Tempus AI
  '4': ['biotech', 'neuroscience', 'pharmaceutical', 'clinical'], // Alto Neuroscience
  '5': ['healthcare', 'services', 'pharmacy', 'home care'], // BrightSpring
  '6': ['automotive', 'autonomous', 'mobility', 'av'], // WeRide
  'coreweave': ['saas', 'ai', 'infrastructure', 'cloud', 'gpu'], // CoreWeave
  'reddit': ['social', 'media', 'internet', 'community'], // Reddit
  'uipath': ['saas', 'automation', 'rpa', 'enterprise'], // UiPath
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
