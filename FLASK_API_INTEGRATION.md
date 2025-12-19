# Flask API Proxy Integration

## Overview

The chart generation feature now calls your separate Flask + AI SDK serverless function deployment on Vercel instead of handling AI calls directly in this app.

## Changes Made

✅ Removed local API route (`api/generate-chart.ts`)
✅ Reverted `package.json` to use plain `vite` for dev
✅ Reverted `vercel.json` back to original config
✅ Updated `ChartGeneratorDialog` to call external Flask API
✅ Updated environment variables to use `VITE_CHART_API_URL`

## Setup

### 1. Update `.env.local`

Replace the placeholder URL with your actual Flask API URL:

```bash
VITE_CHART_API_URL=https://your-actual-flask-api.vercel.app
```

Example:
```bash
VITE_CHART_API_URL=https://chart-api-proxy.vercel.app
```

### 2. Flask API Requirements

Your Flask API should have an endpoint that matches this specification:

#### Endpoint
```
POST /generate-chart
```

#### Request Body
```json
{
  "query": "Show opening prices by company",
  "tableContext": {
    "companies": [
      { "id": "1", "name": "Rubrik, Inc." },
      { "id": "2", "name": "Astera Labs, Inc." },
      { "id": "coreweave", "name": "CoreWeave" }
    ],
    "metrics": [
      { "id": "finalPrice", "name": "Final Price", "category": "Pricing" },
      { "id": "openingPrice", "name": "Opening Price", "category": "Pricing" }
    ],
    "sampleData": [
      { "company": "CoreWeave", "metric": "Opening Price", "value": "63.5" },
      { "company": "Rubrik, Inc.", "metric": "Opening Price", "value": "38.5" }
    ],
    "totalRows": 33
  }
}
```

#### Response Format
```json
{
  "chartConfig": "{\"type\":\"vertical-bar\",\"title\":\"IPO Opening Prices\",\"data\":[...],\"xAxis\":{...},\"yAxis\":{...},\"series\":[...]}"
}
```

Or if Claude returns JSON directly without markdown:
```json
{
  "chartConfig": {
    "type": "vertical-bar",
    "title": "IPO Opening Prices",
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
}
```

#### Error Response
```json
{
  "error": "Error message here"
}
```

### 3. Flask Example Implementation

Here's a reference implementation for your Flask API:

```python
from flask import Flask, request, jsonify
from flask_cors import CORS
from ai import generateText  # Your Vercel AI SDK import

app = Flask(__name__)
CORS(app)  # Enable CORS for your frontend domain

@app.route('/generate-chart', methods=['POST'])
def generate_chart():
    try:
        data = request.get_json()
        query = data.get('query')
        table_context = data.get('tableContext')

        if not query or not table_context:
            return jsonify({'error': 'Missing required fields'}), 400

        # Build system prompt
        system_prompt = f"""You are a data visualization assistant that generates chart configurations from natural language queries.

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

Table Context:
- Companies: {', '.join([c['name'] for c in table_context['companies']])}
- Metrics: {', '.join([m['name'] for m in table_context['metrics']])}
- Total data points: {table_context['totalRows']}

Sample Data:
{json.dumps(table_context['sampleData'], indent=2)}

You must return ONLY a valid JSON object matching this structure (no additional text):
{{
  "type": "<chart-type>",
  "title": "<chart title>",
  "description": "<optional description>",
  "data": [{{"key1": value1, "key2": value2}}],
  "xAxis": {{"key": "<field_name>", "label": "<display label>"}},
  "yAxis": {{"key": "<field_name>", "label": "<display label>"}},
  "series": [{{"key": "<field_name>", "name": "<display name>", "type": "bar|line"}}],
  "height": 400,
  "showLegend": true,
  "showGrid": true,
  "showTooltip": true
}}

IMPORTANT:
1. ALL keys in xAxis, yAxis, and series MUST exist in the data objects
2. Use human-readable labels
3. Transform the table data appropriately for the chart
4. Return ONLY the JSON object, no markdown formatting or extra text"""

        # Call Claude via AI SDK
        result = generateText(
            model='anthropic/claude-sonnet-4',
            prompt=f"{system_prompt}\n\nUser Query: \"{query}\"\n\nGenerate the ChartConfig JSON:"
        )

        # Return the chart config
        return jsonify({'chartConfig': result['text']})

    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run()
```

### 4. CORS Configuration

Make sure your Flask API allows requests from your frontend domain:

```python
from flask_cors import CORS

# Allow all origins (development)
CORS(app)

# Or allow specific origin (production)
CORS(app, origins=['https://your-volute-app.vercel.app'])
```

## Testing

### 1. Start Your Dev Server
```bash
npm run dev
```

### 2. Update Environment
Make sure `.env.local` has your Flask API URL:
```bash
VITE_CHART_API_URL=https://your-flask-api.vercel.app
```

### 3. Test the Integration
1. Navigate to any metrics table
2. Click "Generate Chart" button
3. Enter: "Show opening prices by company"
4. Should call your Flask API and generate a chart

### 4. Check Network Tab
Open browser DevTools → Network tab
- Should see request to `https://your-flask-api.vercel.app/generate-chart`
- Check request payload (has query + tableContext)
- Check response (has chartConfig)

## Troubleshooting

### "Chart API URL not configured"
- Make sure `VITE_CHART_API_URL` is set in `.env.local`
- Restart dev server after changing `.env.local`

### CORS errors
- Add CORS headers to your Flask API
- Use `flask-cors` package
- Allow your frontend domain

### "API error: 404"
- Check Flask API endpoint is `/generate-chart` (not `/api/generate-chart`)
- Verify Flask API is deployed and accessible

### "API error: 500"
- Check Flask API logs for errors
- Verify AI SDK is configured correctly in Flask app
- Check API key is set in Flask environment

### Chart not rendering
- Check browser console for parsing errors
- Verify Flask returns `chartConfig` field
- Check JSON is valid (use JSON validator)

## Architecture

```
┌─────────────────────┐
│   Browser           │
│   (React App)       │
└──────────┬──────────┘
           │
           │ POST /generate-chart
           │ { query, tableContext }
           │
           ▼
┌─────────────────────┐
│   Flask API         │
│   (Vercel)          │
│   - CORS enabled    │
│   - AI SDK          │
└──────────┬──────────┘
           │
           │ generateText()
           │
           ▼
┌─────────────────────┐
│   AI Gateway        │
│   (Vercel)          │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│   Claude Sonnet 4   │
└─────────────────────┘
```

## Deployment

### Frontend (This App)
1. Push to GitHub
2. Vercel auto-deploys
3. Set environment variable in Vercel dashboard:
   ```
   VITE_CHART_API_URL=https://your-flask-api.vercel.app
   ```

### Flask API (Separate Deployment)
1. Deploy Flask app to Vercel
2. Set AI Gateway key in environment
3. Enable CORS for frontend domain
4. Test `/generate-chart` endpoint

## Summary

✅ All API route code removed from this app
✅ ChartGeneratorDialog calls external Flask API
✅ Environment configured with `VITE_CHART_API_URL`
✅ Back to simple `vite` dev server
✅ Ready to integrate with your Flask proxy

**Next Step:** Set your Flask API URL in `.env.local` and test!
