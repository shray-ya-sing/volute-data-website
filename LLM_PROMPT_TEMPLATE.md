# LLM Prompt Template for Chart Generation

## System Prompt

```
You are a data visualization assistant that generates chart configurations from natural language queries.

Your task is to:
1. Analyze the user's query
2. Examine the provided dataset
3. Select the most appropriate chart type
4. Transform the data into the required format
5. Return a valid ChartConfig JSON object

Available chart types:
- vertical-bar: Compare values across categories (most common)
- horizontal-bar: Long category names or ranking data
- line: Trends over time, continuous data
- area: Cumulative trends, volume over time
- pie: Parts of a whole, percentages (max 6-8 slices)
- donut: Similar to pie with center space
- stacked-bar: Part-to-whole comparison across categories
- grouped-bar: Compare multiple metrics side-by-side
- combo: Mix bars and lines (e.g., revenue + growth rate)
- scatter: Correlation between two numeric variables

Chart Selection Guidelines:
- Use BAR charts for comparing discrete categories
- Use LINE charts for time series or sequential data
- Use PIE/DONUT for composition (parts of whole)
- Use SCATTER for correlation analysis
- Use COMBO when comparing metrics with different scales
- Use GROUPED-BAR when comparing 2-3 metrics per category
- Use STACKED-BAR when showing composition over categories

Response Format:
Return ONLY a valid JSON object matching this TypeScript interface:

{
  "type": "vertical-bar" | "horizontal-bar" | "line" | "area" | "pie" | "donut" | "stacked-bar" | "grouped-bar" | "combo" | "scatter",
  "title": "Chart Title (required)",
  "description": "Brief explanation of what the chart shows (optional)",
  "data": [
    { "key1": value1, "key2": value2, ... }
  ],
  "xAxis": {
    "key": "field_name_in_data",
    "label": "Display Label"
  },
  "yAxis": {
    "key": "field_name_in_data",
    "label": "Display Label"
  },
  "series": [
    {
      "key": "field_name_in_data",
      "name": "Display Name",
      "type": "bar" | "line" (only for combo charts)
    }
  ],
  "height": 400,
  "showLegend": true,
  "showGrid": true,
  "showTooltip": true
}

Important Rules:
1. ALL field names in xAxis.key, yAxis.key, and series[].key MUST exist in the data objects
2. Use human-readable labels (e.g., "Opening Price ($)" not "openingPrice")
3. Keep titles concise but descriptive
4. For pie/donut charts, use xAxis.key for category names and series[0].key for values
5. For combo charts, specify type: "bar" or "line" for each series
6. Limit data to 20 points max for readability
7. Use appropriate chart types - don't force a pie chart for time series data
8. Return ONLY the JSON object, no additional text
```

## User Prompt Template

```
Dataset Schema:
{dataset_schema}

Available Data:
{dataset_sample}

User Query: "{user_query}"

Generate a ChartConfig JSON object to visualize this data.
```

## Example Interactions

### Example 1: Simple Bar Chart

**User Query:** "Show me the opening prices for each company"

**Dataset:**
```json
[
  { "company": "CoreWeave", "openingPrice": 63.5, "ipoDate": "2024-03-27" },
  { "company": "Rubrik", "openingPrice": 38.5, "ipoDate": "2024-04-25" },
  { "company": "Astera Labs", "openingPrice": 52.56, "ipoDate": "2024-03-20" }
]
```

**LLM Response:**
```json
{
  "type": "vertical-bar",
  "title": "IPO Opening Prices by Company",
  "description": "First trade prices for recent tech IPOs",
  "data": [
    { "company": "CoreWeave", "openingPrice": 63.5 },
    { "company": "Rubrik", "openingPrice": 38.5 },
    { "company": "Astera Labs", "openingPrice": 52.56 }
  ],
  "xAxis": { "key": "company", "label": "Company" },
  "yAxis": { "key": "openingPrice", "label": "Opening Price ($)" },
  "series": [{ "key": "openingPrice", "name": "Opening Price" }],
  "height": 400,
  "showLegend": true,
  "showGrid": true,
  "showTooltip": true
}
```

### Example 2: Comparison Chart

**User Query:** "Compare opening and closing prices"

**Dataset:**
```json
[
  { "company": "CoreWeave", "openingPrice": 63.5, "closingPrice": 67.25 },
  { "company": "Rubrik", "openingPrice": 38.5, "closingPrice": 38.35 },
  { "company": "Astera Labs", "openingPrice": 52.56, "closingPrice": 68.75 }
]
```

**LLM Response:**
```json
{
  "type": "grouped-bar",
  "title": "Opening vs First Day Closing Prices",
  "description": "Price comparison for first trading day",
  "data": [
    { "company": "CoreWeave", "opening": 63.5, "closing": 67.25 },
    { "company": "Rubrik", "opening": 38.5, "closing": 38.35 },
    { "company": "Astera Labs", "opening": 52.56, "closing": 68.75 }
  ],
  "xAxis": { "key": "company", "label": "Company" },
  "yAxis": { "key": "price", "label": "Price ($)" },
  "series": [
    { "key": "opening", "name": "Opening Price" },
    { "key": "closing", "name": "First Day Close" }
  ],
  "height": 400,
  "showLegend": true,
  "showGrid": true,
  "showTooltip": true
}
```

### Example 3: Time Series

**User Query:** "Show CoreWeave's stock price trend"

**Dataset:**
```json
[
  { "date": "2024-03-27", "price": 63.5, "stage": "Opening" },
  { "date": "2024-03-27", "price": 67.25, "stage": "Close" },
  { "date": "2024-03-28", "price": 65.0, "stage": "Close" },
  { "date": "2024-03-29", "price": 68.5, "stage": "Close" }
]
```

**LLM Response:**
```json
{
  "type": "line",
  "title": "CoreWeave Stock Price Trend",
  "description": "Daily closing prices since IPO",
  "data": [
    { "date": "Mar 27 (Open)", "price": 63.5 },
    { "date": "Mar 27 (Close)", "price": 67.25 },
    { "date": "Mar 28", "price": 65.0 },
    { "date": "Mar 29", "price": 68.5 }
  ],
  "xAxis": { "key": "date", "label": "Date" },
  "yAxis": { "key": "price", "label": "Stock Price ($)" },
  "series": [{ "key": "price", "name": "Price" }],
  "height": 400,
  "showLegend": true,
  "showGrid": true,
  "showTooltip": true
}
```

### Example 4: Pie Chart

**User Query:** "What's the breakdown of gross proceeds?"

**Dataset:**
```json
[
  { "company": "CoreWeave", "grossProceeds": 1100000000 },
  { "company": "Rubrik", "grossProceeds": 752000000 },
  { "company": "Astera Labs", "grossProceeds": 821000000 }
]
```

**LLM Response:**
```json
{
  "type": "pie",
  "title": "Gross Proceeds Distribution",
  "description": "Total capital raised by each company",
  "data": [
    { "company": "CoreWeave", "proceeds": 1.10 },
    { "company": "Rubrik", "proceeds": 0.75 },
    { "company": "Astera Labs", "proceeds": 0.82 }
  ],
  "xAxis": { "key": "company", "label": "Company" },
  "yAxis": { "key": "proceeds", "label": "Gross Proceeds" },
  "series": [{ "key": "proceeds", "name": "Gross Proceeds ($B)" }],
  "height": 400,
  "showLegend": true,
  "showGrid": false,
  "showTooltip": true
}
```

### Example 5: Combo Chart

**User Query:** "Show valuation and first day performance"

**Dataset:**
```json
[
  { "company": "CoreWeave", "valuation": 19.1, "firstDayReturn": 110.16 },
  { "company": "Rubrik", "valuation": 5.65, "firstDayReturn": 37.34 },
  { "company": "Astera Labs", "valuation": 5.5, "firstDayReturn": 91.0 }
]
```

**LLM Response:**
```json
{
  "type": "combo",
  "title": "IPO Valuation vs First Day Performance",
  "description": "Valuation at IPO (bars) and first day return percentage (line)",
  "data": [
    { "company": "CoreWeave", "valuation": 19.1, "return": 110.16 },
    { "company": "Rubrik", "valuation": 5.65, "return": 37.34 },
    { "company": "Astera Labs", "valuation": 5.5, "return": 91.0 }
  ],
  "xAxis": { "key": "company", "label": "Company" },
  "yAxis": { "key": "value", "label": "Value" },
  "series": [
    { "key": "valuation", "name": "Valuation ($B)", "type": "bar" },
    { "key": "return", "name": "First Day Return (%)", "type": "line" }
  ],
  "height": 400,
  "showLegend": true,
  "showGrid": true,
  "showTooltip": true
}
```

## Common Pitfalls to Avoid

1. **Mismatched Keys**: Ensure series keys exist in data
   ```json
   // ❌ WRONG - "revenue" doesn't exist in data
   "data": [{ "company": "X", "sales": 100 }],
   "series": [{ "key": "revenue", "name": "Revenue" }]

   // ✅ CORRECT
   "data": [{ "company": "X", "sales": 100 }],
   "series": [{ "key": "sales", "name": "Sales" }]
   ```

2. **Too Many Pie Slices**: Limit to 6-8 categories
   ```json
   // ❌ WRONG - 15 companies in pie chart
   // ✅ CORRECT - Group small values into "Other"
   ```

3. **Wrong Chart Type**: Match visualization to data type
   ```json
   // ❌ WRONG - Pie chart for time series
   // ✅ CORRECT - Line chart for time series
   ```

4. **Missing Required Fields**: All configs need type, data, axes, series
   ```json
   // ❌ WRONG - Missing yAxis
   { "type": "vertical-bar", "data": [...], "xAxis": {...} }

   // ✅ CORRECT - All required fields present
   { "type": "vertical-bar", "data": [...], "xAxis": {...}, "yAxis": {...}, "series": [...] }
   ```

## Implementation Code

```typescript
// In your API route or service
import { Anthropic } from '@ai-sdk/anthropic';

async function generateChart(query: string, data: any[]) {
  const systemPrompt = `[Insert system prompt from above]`;

  const userPrompt = `
Dataset Schema: ${JSON.stringify(Object.keys(data[0]))}
Available Data: ${JSON.stringify(data.slice(0, 5))}
User Query: "${query}"

Generate a ChartConfig JSON object.
  `;

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-5-20251101',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ],
    temperature: 0.3, // Lower temp for more consistent JSON
  });

  const chartConfig = JSON.parse(response.content[0].text);
  return chartConfig;
}
```

## Testing Queries

Use these to test your LLM integration:

1. "Show opening prices by company" → vertical-bar
2. "Compare opening and closing prices" → grouped-bar
3. "What's the market share?" → pie
4. "Plot valuation vs performance" → scatter
5. "Show revenue and growth rate" → combo
6. "Breakdown of share distribution" → stacked-bar
7. "Rank companies by returns" → horizontal-bar
8. "Show stock price over time" → line
9. "Cumulative proceeds" → area
10. "Share allocation breakdown" → donut
