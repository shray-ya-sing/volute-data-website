# Chart Generator - Quick Start

## ✨ You're All Set!

The AI-powered chart generation system is now fully integrated into your metrics table!

## What Was Built

### 1. **ChartGeneratorButton** - The magic button ✨
- Purple/pink gradient button with sparkle icon
- Located next to the Export button on TablePage
- Opens the chart generation dialog

### 2. **ChartGeneratorDialog** - The AI interface
- Natural language input form
- Real-time chart generation with Claude Sonnet 4
- Beautiful modal with examples and error handling
- Chart preview and regeneration

### 3. **Integration** - TablePage updated
- Button automatically passes table data to LLM
- Works with any companies/metrics in your table
- Context-aware chart generation

## Try It Now!

1. **Start your dev server** (if not already running):
   ```bash
   npm run dev
   ```

2. **Navigate to any metrics table view**

3. **Click the "Generate Chart" button** (sparkle icon)

4. **Try these example queries:**
   - "Show opening prices by company"
   - "Compare opening and closing prices"
   - "Plot valuation vs first day return"
   - "Show gross proceeds breakdown"

## Example Flow

```
You: "Show opening prices by company"
        ↓
Claude analyzes table data
        ↓
Returns: Vertical bar chart config
        ↓
Chart renders automatically!
```

## Environment Variables ✅

Your `.env.local` is already configured:
```bash
VITE_AI_GATEWAY_API_KEY="vck_4Zxt..."
```

This key is used by the Vercel AI SDK to access Claude Sonnet 4 through the AI Gateway.

## Components Created

```
src/
├── components/
│   ├── ChartGeneratorButton.tsx    ✅ The sparkle button
│   ├── ChartGeneratorDialog.tsx    ✅ The input form + LLM integration
│   ├── charts/
│   │   ├── ChartCanvas.tsx         ✅ Main chart renderer
│   │   ├── VerticalBarChart.tsx    ✅
│   │   ├── HorizontalBarChart.tsx  ✅
│   │   ├── LineChart.tsx           ✅
│   │   ├── AreaChart.tsx           ✅
│   │   ├── PieChart.tsx            ✅
│   │   ├── DonutChart.tsx          ✅
│   │   ├── StackedBarChart.tsx     ✅
│   │   ├── GroupedBarChart.tsx     ✅
│   │   ├── ComboChart.tsx          ✅
│   │   └── ScatterChart.tsx        ✅
├── types/
│   └── charts.ts                   ✅ TypeScript interfaces
```

## How It Works

1. **User clicks button** → Opens dialog
2. **User enters query** → "Show opening prices"
3. **System prepares context** → Companies, metrics, sample data
4. **Calls Claude Sonnet 4** → Via Vercel AI SDK
5. **Claude returns JSON** → ChartConfig object
6. **ChartCanvas renders** → Beautiful chart!

## Data Flow

```typescript
// 1. Button passes table data
<ChartGeneratorButton
  companies={companies}
  metrics={metrics}
  metricValues={metricValues}
/>

// 2. Dialog prepares context for LLM
const tableContext = {
  companies: ['CoreWeave', 'Rubrik', 'Astera Labs'],
  metrics: ['Opening Price', 'Closing Price', ...],
  sampleData: [...first 10 rows...]
}

// 3. Calls Claude via Vercel AI SDK
const { text } = await generateText({
  model: 'anthropic/claude-sonnet-4',
  prompt: systemPrompt + userQuery,
  apiKey: import.meta.env.VITE_AI_GATEWAY_API_KEY
});

// 4. Parses response and renders
const chartConfig = JSON.parse(text);
<ChartCanvas config={chartConfig} />
```

## Features

✅ **10 Chart Types** - Automatically selects the best one
✅ **Natural Language** - No code or config needed
✅ **Context-Aware** - Uses your actual table data
✅ **Error Handling** - Graceful failures with retry
✅ **Loading States** - Beautiful animations
✅ **Example Queries** - One-click templates
✅ **Regeneration** - Try different visualizations

## Customization

### Change Colors
Edit `src/types/charts.ts`:
```typescript
export const COLOR_SCHEMES = {
  default: ['#3b82f6', '#10b981', ...],
  // Add your own!
}
```

### Change Model
Edit `src/components/ChartGeneratorDialog.tsx` line 107:
```typescript
model: 'anthropic/claude-sonnet-4', // or claude-opus-4
```

### Add More Examples
Edit `src/components/ChartGeneratorDialog.tsx` line 119:
```typescript
[
  'Your example 1',
  'Your example 2',
  // Add more...
]
```

## Troubleshooting

### Button not visible?
- Check TablePage is rendering
- Look in browser DevTools console for errors

### Chart not generating?
- Verify `.env.local` has `VITE_AI_GATEWAY_API_KEY`
- Check browser console for API errors
- Try simpler queries first

### Invalid chart?
- Claude sometimes returns unexpected formats
- System handles most cases automatically
- Try rephrasing your query

## What's Next?

The system is ready to use! You can:

1. **Test it** - Try different queries
2. **Customize** - Adjust colors, examples, prompts
3. **Extend** - Add save/export functionality
4. **Share** - Show users the new feature!

## Documentation

📖 **Detailed guides available:**
- `CHART_SYSTEM_GUIDE.md` - Complete chart system docs
- `CHART_GENERATOR_SETUP.md` - Full setup and features
- `LLM_PROMPT_TEMPLATE.md` - Prompt engineering guide

## Support

Having issues? Check:
1. Browser console for errors
2. Network tab for API responses
3. `.env.local` for correct API key
4. Table data is loaded properly

---

**Enjoy your AI-powered chart generation! 🎉✨**

Built with:
- React + TypeScript
- Recharts for visualization
- Claude Sonnet 4 via Vercel AI SDK
- Natural language understanding
