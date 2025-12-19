# Chart Generator Setup Guide

## ✅ What's Been Implemented

A complete AI-powered chart generation system has been added to your metrics table! Users can now generate charts from natural language queries.

## Components Created

### 1. ChartGeneratorButton
Location: `src/components/ChartGeneratorButton.tsx`
- Beautiful sparkle icon button
- Purple-pink gradient styling
- Integrated into TablePage next to Export button

### 2. ChartGeneratorDialog
Location: `src/components/ChartGeneratorDialog.tsx`
- Modal dialog with natural language input
- Real-time chart generation using Claude Sonnet 4
- Error handling and loading states
- Example query suggestions
- Chart preview and regeneration options

## How It Works

```
┌─────────────────────────────────────────────────────┐
│ User clicks "Generate Chart" button on TablePage    │
└──────────────────┬──────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────┐
│         Dialog Opens with Input Form                │
│  - Natural language text input                      │
│  - Example queries                                  │
│  - Send button                                      │
└──────────────────┬──────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────┐
│      User enters query (e.g., "show opening prices")│
└──────────────────┬──────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────┐
│  System prepares context:                           │
│  - Table companies list                             │
│  - Table metrics list                               │
│  - Sample data (first 10 rows)                      │
│  - Total row count                                  │
└──────────────────┬──────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────┐
│  Calls Vercel AI SDK:                               │
│  generateText({                                     │
│    model: 'anthropic/claude-sonnet-4',             │
│    prompt: systemPrompt + userQuery                 │
│  })                                                 │
└──────────────────┬──────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────┐
│  Claude returns ChartConfig JSON                    │
└──────────────────┬──────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────┐
│  ChartCanvas renders the chart                      │
│  - User can view result                             │
│  - Generate another chart                           │
│  - Close dialog                                     │
└─────────────────────────────────────────────────────┘
```

## Environment Setup

Make sure your `.env.local` file has the Vercel AI Gateway key:

```bash
AI_GATEWAY_KEY=your_key_here
```

The Vercel AI SDK will automatically use this key when making requests to the Anthropic API.

## Usage

### For Users
1. Navigate to any metrics table view
2. Click the "Generate Chart" button (purple/pink gradient with sparkle icon)
3. Enter a natural language query like:
   - "Show opening prices by company"
   - "Compare opening and closing prices"
   - "Plot valuation vs first day return"
   - "Show gross proceeds breakdown"
4. Press Enter or click the arrow button
5. Wait for the chart to generate (usually 2-5 seconds)
6. View the chart
7. Optionally generate another chart or close the dialog

### Example Queries

**Simple Comparisons:**
- "Show opening prices by company"
- "Compare revenue across companies"
- "Display IPO valuations"

**Multi-Metric Comparisons:**
- "Compare opening and closing prices"
- "Show revenue vs profit"
- "Compare valuation and first day return"

**Breakdowns:**
- "Show market share breakdown"
- "Display gross proceeds distribution"
- "Show share allocation by type"

**Correlations:**
- "Plot valuation vs first day return"
- "Show correlation between IPO price and performance"
- "Compare price range to final price"

## Features

### ✅ Natural Language Understanding
- Understands various ways to ask for the same data
- Interprets comparison requests
- Selects appropriate chart types automatically

### ✅ Smart Chart Selection
Claude automatically chooses from 10 chart types:
- Vertical Bar: Standard comparisons
- Horizontal Bar: Rankings, long labels
- Line: Time series
- Area: Cumulative data
- Pie: Parts of a whole
- Donut: Alternative to pie
- Stacked Bar: Composition across categories
- Grouped Bar: Multi-metric comparisons
- Combo: Mixed bar + line
- Scatter: Correlations

### ✅ Context-Aware
- Uses actual table data
- Knows available companies
- Knows available metrics
- Transforms data appropriately

### ✅ Error Handling
- Validates JSON responses
- Handles parsing errors gracefully
- Shows user-friendly error messages
- Allows retry on failure

### ✅ Beautiful UI
- Modern glassmorphic design
- Smooth animations
- Loading indicators
- Example queries for guidance
- Responsive layout

## Integration Points

### TablePage.tsx
```tsx
import { ChartGeneratorButton } from './ChartGeneratorButton';

// Added next to Export button
<ChartGeneratorButton
  companies={companies}
  metrics={metrics}
  metricValues={metricValues}
/>
```

### Data Flow
The button receives:
- `companies`: List of all companies in the table
- `metrics`: List of all metrics in the table
- `metricValues`: All data points in the table

This data is used to:
1. Provide context to the LLM
2. Help Claude understand available fields
3. Generate accurate chart configurations

## Customization

### Adjust System Prompt
Edit `ChartGeneratorDialog.tsx:53-88` to modify:
- Available chart types
- Instructions for Claude
- Response format
- Validation rules

### Change Model
Edit line 90 in `ChartGeneratorDialog.tsx`:
```tsx
model: 'anthropic/claude-sonnet-4', // Change to different model
```

Available models (via Vercel AI Gateway):
- `anthropic/claude-sonnet-4` (recommended)
- `anthropic/claude-opus-4`
- `anthropic/claude-haiku-4`

### Modify Button Styling
Edit `ChartGeneratorButton.tsx:19-25` to change:
- Colors (currently purple-pink gradient)
- Size
- Icon
- Text

### Add More Example Queries
Edit `ChartGeneratorDialog.tsx:119-127` to add examples:
```tsx
{[
  'Your custom query 1',
  'Your custom query 2',
  // Add more...
].map((example) => (
  // ...
))}
```

## Troubleshooting

### Chart Not Generating
1. **Check AI Gateway Key**: Ensure `AI_GATEWAY_KEY` is set in `.env.local`
2. **Check Console**: Look for error messages in browser console
3. **Verify Data**: Ensure companies, metrics, and metricValues are populated

### Invalid Chart Configuration
- Claude sometimes returns malformed JSON
- The system tries to extract JSON from markdown code blocks
- If parsing fails, user sees a friendly error message
- User can try rephrasing their query

### Chart Looks Wrong
- Check the generated ChartConfig in console (logged automatically)
- Claude might have misunderstood the query
- Try rephrasing more explicitly
- Use example queries as templates

## Performance

### Response Times
- Typical: 2-5 seconds
- Depends on: Query complexity, model load, data size

### Optimization Tips
1. **Sample Data**: Only sends first 10 rows to Claude (configurable at line 28)
2. **Model Choice**: Sonnet 4 balances speed and quality
3. **Temperature**: Set to default for consistent outputs

### Cost Considerations
- Each query costs ~1-3 cents (Claude Sonnet 4 pricing)
- Queries are only sent when user explicitly asks
- No automatic/background generation

## Future Enhancements

### Potential Improvements
1. **Save Charts**: Allow users to save generated charts
2. **Export Charts**: Add PNG/SVG export for charts
3. **Chart History**: Show previous charts in session
4. **Multi-Chart**: Generate multiple chart options
5. **Refinement**: "Make the bars blue" type commands
6. **Annotations**: Add custom labels/annotations
7. **Comparison Mode**: Generate side-by-side charts
8. **Templates**: Save query templates

### Advanced Features
1. **Streaming**: Show chart as it's being generated
2. **Interactive**: Edit data points in real-time
3. **Combinations**: Multiple charts in one dashboard
4. **Auto-insights**: Claude explains interesting patterns
5. **Recommendations**: Suggest other visualizations

## Testing

### Manual Testing
1. Run the dev server: `npm run dev`
2. Navigate to a table view
3. Click "Generate Chart"
4. Try each example query
5. Try custom queries
6. Verify error handling (invalid queries)

### Test Cases
- ✅ Simple bar chart
- ✅ Multi-series comparison
- ✅ Pie chart for breakdown
- ✅ Scatter plot for correlation
- ✅ Line chart for trends
- ✅ Error handling for invalid queries
- ✅ Loading state during generation
- ✅ Reset and regenerate

## Notes

- The system uses the same 10 chart templates you built earlier
- All chart configuration comes from Claude - no hardcoding
- Data transformation happens in the LLM prompt
- User can generate unlimited charts per session
- Charts are temporary (not saved to database)

## Support

If you encounter issues:
1. Check browser console for errors
2. Verify AI_GATEWAY_KEY is set
3. Ensure table data is loaded
4. Try simpler queries first
5. Check network tab for API responses

Enjoy your AI-powered chart generation! 🎉✨
