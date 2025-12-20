# Local Testing Guide

## Quick Start

### Option 1: Test with Full API Integration (Recommended)

Run these two commands in **separate terminals**:

**Terminal 1 - Start Local API Server:**
```bash
npm run dev:api
```
This starts a local API server on `http://localhost:3001` that connects to your Neon database.

**Terminal 2 - Start Frontend:**
```bash
npm run dev
```
This starts the Vite dev server on `http://localhost:3000` with API proxy enabled.

✅ **Your app will now fetch from Neon database via local API!**

---

### Option 2: Test with JSON Fallback (Simpler)

Just run:
```bash
npm run dev
```

Without the local API server, the app will automatically fall back to `/data.json`.

---

## Testing the Integration

### 1. Test API Server Directly

With `npm run dev:api` running, test the endpoints:

```bash
# Get all filings
curl http://localhost:3001/api/filings

# Get specific ticker
curl http://localhost:3001/api/filing/TTAN
```

You should see JSON output with metrics and source attribution.

### 2. Test Frontend Integration

1. Start both servers (Option 1 above)
2. Open http://localhost:3000
3. Check browser console for:
   ```
   ✅ Loaded data from Neon database via API: 6 filings
   ```
4. Click on a company to view metrics
5. Click on a metric value to see the source panel
6. Verify:
   - PDF URL loads correctly
   - Page numbers are shown
   - Bounding boxes are displayed (if implemented in UI)

### 3. Test Fallback Behavior

1. **Stop** the API server (Ctrl+C in Terminal 1)
2. Refresh the browser
3. Console should show:
   ```
   ⚠️ API fetch failed, falling back to local JSON
   📁 Loaded data from local JSON: X filings
   ```
4. App continues working with local JSON

---

## What Each Command Does

### `npm run dev:api`
- Starts local API server on port 3001
- Connects to Neon database using `DATABASE_URL`
- Serves same endpoints as production (`/api/filings`, `/api/filing/[ticker]`)
- Enables CORS for local testing

### `npm run dev`
- Starts Vite dev server on port 3000
- Proxies `/api/*` requests to `http://localhost:3001`
- Hot-reloads React components
- Opens browser automatically

---

## Troubleshooting

### "Cannot connect to database"
**Issue:** API server can't reach Neon database

**Fix:**
```bash
# Check your .env.local has DATABASE_URL
cat .env.local | grep DATABASE_URL

# Test connection
npx tsx scripts/test-api.ts
```

### "API returning 404"
**Issue:** API endpoint not found

**Check:**
- API server is running (`npm run dev:api`)
- Correct URL: `http://localhost:3001/api/filings` (not 3000)
- No typos in ticker: `/api/filing/TTAN` (uppercase)

### "CORS errors"
**Issue:** Browser blocking requests

**Fix:** Already handled! API server includes CORS headers. If still seeing errors:
- Make sure proxy is configured in `vite.config.ts`
- Restart both servers

### "Still loading from data.json"
**Issue:** App not using API

**Check:**
1. API server running? (`npm run dev:api`)
2. Frontend started? (`npm run dev`)
3. Console shows which source is being used
4. Try: `curl http://localhost:3001/api/filings`

### "Empty metrics in database"
**Issue:** Extraction hasn't run

**Fix:**
```bash
# Run extraction pipeline
npm run extract:metrics-blob

# Verify data
npm run export:metrics
cat exported-metrics.json
```

---

## Verifying Data Format

The API should return data identical to `public/data.json`:

```json
{
  "Company Ticker": "TTAN",
  "Company Name": "ServiceTitan, Inc.",
  "Filing URL": "https://...pdf",
  "Final Price": "$71.00",
  "Shares Offered (Primary)": "8,800,000",
  "Proceeds to Company": "$590,436,000",
  "Page Number": {
    "Final Price": 1,
    "Shares Offered (Primary)": 1
  },
  "Bounding Boxes": {
    "Final Price": {"x": 15, "y": 13, "width": 70, "height": 2}
  }
}
```

---

## Console Logs to Expect

### From API Server (Terminal 1):
```
🚀 Local Dev API Server Running
==================================================
API Server: http://localhost:3001

Available endpoints:
  GET http://localhost:3001/api/filings
  GET http://localhost:3001/api/filing/TTAN

Press Ctrl+C to stop
==================================================
GET /api/filings
✓ Served 6 filings
```

### From Browser Console:
```
✅ Loaded data from Neon database via API: 6 filings
```

Or if API fails:
```
⚠️ API fetch failed, falling back to local JSON
📁 Loaded data from local JSON: 2 filings
```

---

## Testing Checklist

- [ ] API server starts without errors
- [ ] Frontend loads at http://localhost:3000
- [ ] Console shows "Loaded data from Neon database via API"
- [ ] Companies display in the table
- [ ] Click on company shows metrics
- [ ] Click on metric shows source panel
- [ ] Source panel displays PDF URL and page number
- [ ] Stop API server → app falls back to JSON
- [ ] Restart API server → app uses API again

---

## Production vs Local Dev

### Local Dev:
- Two servers: Frontend (3000) + API (3001)
- Vite proxies `/api` to local server
- Can test full integration before deploying

### Production (Vercel):
- Single deployment
- API routes handled by Vercel Serverless Functions
- Automatic scaling and HTTPS

---

## Next Steps After Local Testing

Once everything works locally:

```bash
# 1. Commit changes
git add .
git commit -m "Add Neon database integration with API endpoints"

# 2. Deploy to Vercel
vercel --prod

# 3. Test production API
curl https://your-domain.vercel.app/api/filings

# 4. Verify production app
# Open your deployed URL and check console logs
```

---

## Quick Reference

| Task | Command |
|------|---------|
| Start local API | `npm run dev:api` |
| Start frontend | `npm run dev` |
| Test API endpoint | `curl http://localhost:3001/api/filings` |
| Export metrics | `npm run export:metrics` |
| Clear database | `npm run db:clear-metrics` |
| Re-run extraction | `npm run extract:metrics-blob` |

---

## Need Help?

Check these files:
- `INTEGRATION_SUMMARY.md` - Overview of the integration
- `INTEGRATION_GUIDE.md` - Full technical details
- `scripts/test-api.ts` - Test database queries
- `src/services/dataService.ts` - See data fetching logic
