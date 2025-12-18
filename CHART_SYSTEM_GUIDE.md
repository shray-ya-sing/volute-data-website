# Chart System Guide

## Overview

This chart system provides 10 pre-built chart templates using Recharts that can be dynamically rendered based on configuration from an LLM or manual input.

## Architecture

```
┌─────────────────────────────────────────────┐
│ User Query: "Show opening prices by company"│
└──────────────────┬──────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────┐
│           LLM Processing                    │
│  (Analyzes query, determines chart type,    │
│   extracts data, creates ChartConfig)       │
└──────────────────┬──────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────┐
│         ChartConfig Object                  │
│  {                                          │
│    type: "vertical-bar",                    │
│    data: [...],                             │
│    xAxis: { key: "company", label: "..." }, │
│    yAxis: { key: "price", label: "..." },   │
│    series: [...]                            │
│  }                                          │
└──────────────────┬──────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────┐
│          ChartCanvas Component              │
│  (Renders appropriate chart template)       │
└─────────────────────────────────────────────┘
```

## Chart Types

### 1. Vertical Bar Chart (`vertical-bar`)
**Best for:** Comparing values across categories

```typescript
{
  type: 'vertical-bar',
  data: [
    { company: 'CoreWeave', revenue: 250 },
    { company: 'Rubrik', revenue: 180 },
    { company: 'Astera', revenue: 120 }
  ],
  xAxis: { key: 'company', label: 'Company' },
  yAxis: { key: 'revenue', label: 'Revenue ($M)' },
  series: [{ key: 'revenue', name: 'Revenue' }]
}
```

### 2. Horizontal Bar Chart (`horizontal-bar`)
**Best for:** Long category names, ranking data

```typescript
{
  type: 'horizontal-bar',
  data: [
    { metric: 'Opening Price', value: 63.5 },
    { metric: 'Final IPO Price', value: 32 },
    { metric: 'First Day Close', value: 67.25 }
  ],
  xAxis: { key: 'value', label: 'Price ($)' },
  yAxis: { key: 'metric', label: 'Metric' },
  series: [{ key: 'value', name: 'Price' }]
}
```

### 3. Line Chart (`line`)
**Best for:** Trends over time, continuous data

```typescript
{
  type: 'line',
  data: [
    { date: '2024-01', price: 32 },
    { date: '2024-02', price: 35 },
    { date: '2024-03', price: 40 }
  ],
  xAxis: { key: 'date', label: 'Date' },
  yAxis: { key: 'price', label: 'Stock Price ($)' },
  series: [{ key: 'price', name: 'Stock Price' }]
}
```

### 4. Area Chart (`area`)
**Best for:** Cumulative trends, volume over time

```typescript
{
  type: 'area',
  data: [
    { quarter: 'Q1', revenue: 100 },
    { quarter: 'Q2', revenue: 150 },
    { quarter: 'Q3', revenue: 220 }
  ],
  xAxis: { key: 'quarter', label: 'Quarter' },
  yAxis: { key: 'revenue', label: 'Cumulative Revenue ($M)' },
  series: [{ key: 'revenue', name: 'Revenue' }]
}
```

### 5. Pie Chart (`pie`)
**Best for:** Parts of a whole, market share

```typescript
{
  type: 'pie',
  data: [
    { company: 'CoreWeave', marketShare: 40 },
    { company: 'Rubrik', marketShare: 35 },
    { company: 'Astera', marketShare: 25 }
  ],
  xAxis: { key: 'company', label: 'Company' },
  yAxis: { key: 'marketShare', label: 'Market Share' },
  series: [{ key: 'marketShare', name: 'Market Share (%)' }]
}
```

### 6. Donut Chart (`donut`)
**Best for:** Similar to pie, with space for center label

```typescript
{
  type: 'donut',
  data: [
    { category: 'SaaS', count: 15 },
    { category: 'Hardware', count: 8 },
    { category: 'AI', count: 12 }
  ],
  xAxis: { key: 'category', label: 'Category' },
  yAxis: { key: 'count', label: 'Number of Companies' },
  series: [{ key: 'count', name: 'Companies' }]
}
```

### 7. Stacked Bar Chart (`stacked-bar`)
**Best for:** Part-to-whole comparison across categories

```typescript
{
  type: 'stacked-bar',
  data: [
    { company: 'CoreWeave', q1: 50, q2: 60, q3: 70, q4: 80 },
    { company: 'Rubrik', q1: 40, q2: 45, q3: 50, q4: 55 }
  ],
  xAxis: { key: 'company', label: 'Company' },
  yAxis: { key: 'revenue', label: 'Total Revenue ($M)' },
  series: [
    { key: 'q1', name: 'Q1' },
    { key: 'q2', name: 'Q2' },
    { key: 'q3', name: 'Q3' },
    { key: 'q4', name: 'Q4' }
  ]
}
```

### 8. Grouped Bar Chart (`grouped-bar`)
**Best for:** Comparing multiple metrics side-by-side

```typescript
{
  type: 'grouped-bar',
  data: [
    { company: 'CoreWeave', openingPrice: 63.5, closingPrice: 67.25 },
    { company: 'Rubrik', openingPrice: 38.5, closingPrice: 38.35 },
    { company: 'Astera', openingPrice: 52.56, closingPrice: 68.75 }
  ],
  xAxis: { key: 'company', label: 'Company' },
  yAxis: { key: 'price', label: 'Price ($)' },
  series: [
    { key: 'openingPrice', name: 'Opening Price' },
    { key: 'closingPrice', name: 'Closing Price' }
  ]
}
```

### 9. Combo Chart (`combo`)
**Best for:** Combining different data types (e.g., revenue + growth rate)

```typescript
{
  type: 'combo',
  data: [
    { company: 'CoreWeave', revenue: 250, growthRate: 85 },
    { company: 'Rubrik', revenue: 180, growthRate: 45 },
    { company: 'Astera', revenue: 120, growthRate: 120 }
  ],
  xAxis: { key: 'company', label: 'Company' },
  yAxis: { key: 'value', label: 'Value' },
  series: [
    { key: 'revenue', name: 'Revenue ($M)', type: 'bar' },
    { key: 'growthRate', name: 'Growth Rate (%)', type: 'line' }
  ]
}
```

### 10. Scatter Plot (`scatter`)
**Best for:** Correlation, relationship between two variables

```typescript
{
  type: 'scatter',
  data: [
    { ipoPrice: 32, firstDayReturn: 110 },
    { ipoPrice: 28, firstDayReturn: 37 },
    { ipoPrice: 36, firstDayReturn: 91 }
  ],
  xAxis: { key: 'ipoPrice', label: 'IPO Price ($)' },
  yAxis: { key: 'firstDayReturn', label: 'First Day Return (%)' },
  series: [{ key: 'data', name: 'Companies' }]
}
```

## Usage

### Basic Usage

```tsx
import { ChartCanvas } from './components/charts';
import { ChartConfig } from './types/charts';

function MyComponent() {
  const config: ChartConfig = {
    type: 'vertical-bar',
    title: 'IPO Opening Prices',
    description: 'Comparison of opening prices for recent tech IPOs',
    data: [
      { company: 'CoreWeave', openingPrice: 63.5 },
      { company: 'Rubrik', openingPrice: 38.5 },
      { company: 'Astera', openingPrice: 52.56 }
    ],
    xAxis: { key: 'company', label: 'Company' },
    yAxis: { key: 'openingPrice', label: 'Opening Price ($)' },
    series: [{ key: 'openingPrice', name: 'Opening Price' }],
    height: 400,
    showLegend: true,
    showGrid: true,
    showTooltip: true
  };

  return <ChartCanvas config={config} />;
}
```

### With LLM Integration

```tsx
import { ChartCanvas } from './components/charts';
import { useState } from 'react';

function ChartWithLLM() {
  const [chartConfig, setChartConfig] = useState(null);
  const [query, setQuery] = useState('');

  const handleQuery = async () => {
    // Call your LLM API
    const response = await fetch('/api/generate-chart', {
      method: 'POST',
      body: JSON.stringify({ query })
    });

    const { chartConfig } = await response.json();
    setChartConfig(chartConfig);
  };

  return (
    <div>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Ask for a chart (e.g., 'show opening prices by company')"
      />
      <button onClick={handleQuery}>Generate Chart</button>

      {chartConfig && <ChartCanvas config={chartConfig} />}
    </div>
  );
}
```

## LLM Prompt Structure

When integrating with an LLM, use this prompt structure:

```
You are a data visualization assistant. Given a user query and dataset,
generate a ChartConfig JSON object.

Available chart types:
- vertical-bar: Compare values across categories
- horizontal-bar: Long category names, ranking
- line: Trends over time
- area: Cumulative trends
- pie: Parts of a whole
- donut: Similar to pie with center space
- stacked-bar: Part-to-whole across categories
- grouped-bar: Multiple metrics side-by-side
- combo: Mix of bars and lines
- scatter: Correlation between variables

Data structure:
{
  "type": "vertical-bar",
  "title": "Chart Title",
  "description": "Brief description",
  "data": [...],
  "xAxis": { "key": "field_name", "label": "Display Label" },
  "yAxis": { "key": "field_name", "label": "Display Label" },
  "series": [{ "key": "field_name", "name": "Display Name" }],
  "height": 400,
  "showLegend": true,
  "showGrid": true,
  "showTooltip": true
}

User Query: {query}
Available Data: {data}

Generate a ChartConfig JSON:
```

## Color Schemes

The system includes 5 preset color schemes:

```typescript
import { COLOR_SCHEMES } from './types/charts';

// Available schemes:
COLOR_SCHEMES.default      // Blue, Green, Orange, Red, Purple, Pink
COLOR_SCHEMES.professional // Darker, more subdued colors
COLOR_SCHEMES.pastel       // Light, soft colors
COLOR_SCHEMES.vibrant      // Bright, saturated colors
COLOR_SCHEMES.monochrome   // Grayscale
```

## Customization

### Custom Colors

```typescript
const config: ChartConfig = {
  type: 'vertical-bar',
  colors: ['#FF6B6B', '#4ECDC4', '#45B7D1'], // Custom color array
  // ... rest of config
};
```

### Custom Series Colors

```typescript
const config: ChartConfig = {
  type: 'grouped-bar',
  series: [
    { key: 'revenue', name: 'Revenue', color: '#3b82f6' },
    { key: 'profit', name: 'Profit', color: '#10b981' }
  ],
  // ... rest of config
};
```

### Custom Dimensions

```typescript
const config: ChartConfig = {
  type: 'line',
  height: 600,  // Chart height in pixels
  // width is responsive by default (100% of container)
  // ... rest of config
};
```

## Tips for LLM Integration

1. **Data Transformation**: LLM should transform tabular data into the chart-friendly format
2. **Chart Type Selection**: LLM should analyze query intent to select appropriate chart type
3. **Axis Configuration**: LLM should identify which fields map to x/y axes
4. **Series Extraction**: LLM should identify which fields to plot as series
5. **Labeling**: LLM should generate human-readable labels from field names

## Example Queries and Expected Outputs

### Query: "Show opening prices for all companies"
```json
{
  "type": "vertical-bar",
  "title": "IPO Opening Prices by Company",
  "data": [
    { "company": "CoreWeave", "openingPrice": 63.5 },
    { "company": "Rubrik", "openingPrice": 38.5 },
    { "company": "Astera", "openingPrice": 52.56 }
  ],
  "xAxis": { "key": "company", "label": "Company" },
  "yAxis": { "key": "openingPrice", "label": "Opening Price ($)" },
  "series": [{ "key": "openingPrice", "name": "Opening Price" }]
}
```

### Query: "Compare opening vs closing prices"
```json
{
  "type": "grouped-bar",
  "title": "Opening vs First Day Closing Prices",
  "data": [
    { "company": "CoreWeave", "opening": 63.5, "closing": 67.25 },
    { "company": "Rubrik", "opening": 38.5, "closing": 38.35 },
    { "company": "Astera", "opening": 52.56, "closing": 68.75 }
  ],
  "xAxis": { "key": "company", "label": "Company" },
  "yAxis": { "key": "price", "label": "Price ($)" },
  "series": [
    { "key": "opening", "name": "Opening Price" },
    { "key": "closing", "name": "Closing Price" }
  ]
}
```

### Query: "Show market share breakdown"
```json
{
  "type": "pie",
  "title": "Market Share by Company",
  "data": [
    { "company": "CoreWeave", "share": 40 },
    { "company": "Rubrik", "share": 35 },
    { "company": "Astera", "share": 25 }
  ],
  "xAxis": { "key": "company", "label": "Company" },
  "yAxis": { "key": "share", "label": "Market Share" },
  "series": [{ "key": "share", "name": "Market Share (%)" }]
}
```

## File Structure

```
src/
├── types/
│   └── charts.ts              # Type definitions
├── components/
│   └── charts/
│       ├── ChartCanvas.tsx    # Main component (you'll use this)
│       ├── VerticalBarChart.tsx
│       ├── HorizontalBarChart.tsx
│       ├── LineChart.tsx
│       ├── AreaChart.tsx
│       ├── PieChart.tsx
│       ├── DonutChart.tsx
│       ├── StackedBarChart.tsx
│       ├── GroupedBarChart.tsx
│       ├── ComboChart.tsx
│       ├── ScatterChart.tsx
│       └── index.ts           # Exports
```

## Next Steps for LLM Integration

1. **Create Query Input Component**: Build a UI component where users can enter natural language queries
2. **LLM API Integration**: Connect to your LLM (Claude API, OpenAI, etc.)
3. **Prompt Engineering**: Refine the prompt to generate accurate ChartConfig objects
4. **Data Context**: Provide the LLM with your actual dataset schema and sample data
5. **Error Handling**: Handle cases where LLM generates invalid configs
6. **Feedback Loop**: Allow users to refine charts through follow-up queries

## Testing

Test with these sample queries:
- "Show opening prices by company"
- "Compare revenue and profit"
- "What's the market share distribution?"
- "Plot valuation vs growth rate"
- "Show quarterly trends"

Each should generate an appropriate chart type and configuration.
