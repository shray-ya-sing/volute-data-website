# Natural Language Search Guide

## How It Works

The search system uses **keyword matching + entity extraction** to find exactly what you're looking for in IPO data.

### Architecture

```
User Query → Entity Extractor → Search Service → Filtered Data → TablePage
```

1. **Entity Extractor** (`src/services/entityExtractor.ts`)
   - Extracts company IDs from query using aliases
   - Extracts metric IDs from query using keywords
   - No embeddings or AI needed - pure keyword matching

2. **Search Service** (`src/services/searchService.ts`)
   - Filters companies, metrics, and metricValues arrays
   - Returns exactly matching data with sources attached
   - Preserves all source information for SourcesPanel

3. **Display**
   - Results shown in existing TablePage component
   - Click any metric to view sources (unchanged)
   - Works even for 1 company × 1 metric (1-row table)

## Example Queries

### Specific Lookup
```
"coreweave opening price"
→ Shows: CoreWeave × Opening Price (1×1 table)
```

### Multiple Metrics
```
"rubrik shares offered and proceeds"
→ Shows: Rubrik × [Shares Offered, Gross Proceeds, Net Proceeds, ...]
```

### Multiple Companies
```
"compare coreweave and astera opening prices"
→ Shows: [CoreWeave, Astera] × Opening Price
```

### Show Everything
```
"show me all coreweave metrics"
→ Shows: CoreWeave × All 21 Metrics
```

### Category-Based
```
"saas ipos"
→ Falls back to category search, shows SaaS IPOs category
```

## Adding New Entities

### Add a New Company

Edit `src/config/searchMetadata.ts`:

```typescript
export const COMPANY_ALIASES: Record<string, string[]> = {
  'coreweave': ['coreweave', 'crwv', 'core weave'],
  'rubrik': ['rubrik', 'rbrk'],
  'newcompany': ['newcompany', 'NEWCO', 'new company'],  // ← Add here
};

export const COMPANY_CATEGORIES: Record<string, string[]> = {
  'newcompany': ['saas', 'fintech', 'b2b'],  // ← Add tags
};
```

### Add a New Metric

Edit `src/config/searchMetadata.ts`:

```typescript
export const METRIC_KEYWORDS: Record<string, string[]> = {
  'newMetric': ['new metric', 'metric keywords', 'synonyms'],  // ← Add here
};
```

That's it! The search will automatically find the new entities.

## No Data Migration Needed

Your existing data structure already works:

```typescript
// Data is already structured correctly
companies: Company[]
metrics: Metric[]
metricValues: MetricValue[] // ← Sources already attached!
```

The search service simply **filters** these arrays based on extracted entities.

## Scaling Considerations

This keyword-based approach works well up to ~100-200 entities.

**Current:** ~24 entities (3 companies × 21 metrics + aliases)
- ✅ Fast (<1ms)
- ✅ Accurate
- ✅ Easy to maintain

**Future (500+ entities):** Consider upgrading to NER (Named Entity Recognition) model when:
- Manual alias management becomes painful
- Ambiguous matches become common
- You want to handle typos automatically

## Testing

Try these queries:
1. `coreweave opening price` - Should show 1×1 table
2. `rubrik shares` - Should show Rubrik × share-related metrics
3. `compare opening prices` - Should show all companies × opening price
4. `astera ipo date` - Should show 1×1 table with sources
5. `all metrics for coreweave` - Should show CoreWeave × all 21 metrics

Click any metric cell to verify sources are working!

## Popular Search Examples

The landing page now has IPO-specific popular searches:
- "coreweave opening price"
- "rubrik shares"
- "compare opening prices"
- "astera ipo date"
- "all saas metrics"

These help users understand the natural language capability.
