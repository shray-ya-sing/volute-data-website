# Neon Database Integration Guide

## Overview

Your app now integrates with Neon PostgreSQL database for storing and retrieving 424B4 filing metrics extracted by Claude AI.

## Architecture

```
┌─────────────────┐
│  Claude Vision  │
│   API (Sonnet)  │ ──> Extracts metrics from PDFs
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Neon Database  │
│   (PostgreSQL)  │ ──> Stores metrics with source attribution
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Vercel API     │
│   /api/filings  │ ──> Serves data to frontend
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  React App      │
│   (Frontend)    │ ──> Displays metrics with source panels
└─────────────────┘
```

## Data Flow

### 1. **Extraction Pipeline** (Runs once per filing)

```bash
# Extract first 2 pages from PDFs
npm run extract:metrics

# Upload extracted pages to Vercel Blob Storage
npm run blob:upload-extracted

# Extract metrics using Claude and store in Neon
npm run extract:metrics-blob
```

### 2. **API Endpoints**

#### GET `/api/filings`
Returns all filings with metrics in the same format as `data.json`:

```json
[
  {
    "Company Ticker": "TTAN",
    "Company Name": "ServiceTitan, Inc.",
    "Filing URL": "https://pfrilrbw7rdy0sj5.public.blob.vercel-storage.com/filings/424B4_final_prospectus/TTAN_first_2_pages.pdf",
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
]
```

#### GET `/api/filing/[ticker]`
Returns a specific filing by ticker (e.g., `/api/filing/TTAN`)

### 3. **Frontend Integration**

The app automatically fetches from the API with fallback to local JSON:

```typescript
// src/services/dataService.ts
const data = await fetchAllFilings(); // Tries API first, falls back to JSON
```

#### Key Features:
- **Automatic fallback**: If API fails, uses local `data.json`
- **Same data structure**: API returns identical format to local JSON
- **Source attribution**: Each metric includes:
  - Filing URL (links to PDF in blob storage)
  - Page number (for navigation)
  - Bounding box (for highlighting)
- **localStorage merge**: Admin-added data still works

## Database Schema

### Tables

#### `filings`
```sql
- id: SERIAL PRIMARY KEY
- ticker: VARCHAR(10)
- company_name: VARCHAR(255)
- filing_date: DATE
- blob_url: TEXT (URL to extracted PDF)
- status: 'pending' | 'processing' | 'completed' | 'failed'
```

#### `metrics`
```sql
- id: SERIAL PRIMARY KEY
- filing_id: INTEGER (references filings)
- metric_name: VARCHAR(100)
- metric_value: TEXT
- page_number: INTEGER
- bounding_box: JSONB {x, y, width, height}
- confidence: FLOAT
```

#### `sources`
```sql
- id: SERIAL PRIMARY KEY
- filing_id: INTEGER
- page_number: INTEGER
- page_image_url: TEXT
- content_type: 'pdf' | 'html'
```

## Extracted Metrics

The pipeline extracts these metrics from the first 2 pages:

### Cover Page Metrics (Page 1-2)
- Company Name
- Company Ticker
- Exchange
- Filing Date
- IPO Date
- Final Price
- Shares Offered (Primary)
- Shares Offered (Secondary)
- Gross Proceeds
- Net Proceeds
- **Proceeds to Company** ✨
- **Proceeds to Selling Stockholders** ✨
- Greenshoe Option
- Underwriter Discount (Per Share)
- Underwriter Discount (Total)
- Lead Bookrunners
- Co-Bookrunners
- Syndicate Members
- Directed Share Program
- Shares Delivery Date

## Adding New Filings

### Step 1: Upload PDFs to Blob Storage
```bash
# Place PDFs in ../fin_data_project/424B4_filings/
# Filename format: TICKER_YYYY-MM-DD_accession.pdf
npm run blob:upload-424b4
```

### Step 2: Extract and Process
```bash
# This will:
# 1. Extract first 2 pages from each PDF
# 2. Upload extracted pages to blob storage
# 3. Use Claude to extract metrics
# 4. Store in Neon database
npm run extract:metrics
npm run blob:upload-extracted
npm run extract:metrics-blob
```

### Step 3: Verify
```bash
# Export metrics to JSON for review
npm run export:metrics

# Check exported-metrics.json
```

## Utility Scripts

```bash
# Database management
npm run db:create-schema    # Create database tables
npm run db:clear-metrics    # Clear all metrics (fresh start)

# Blob storage
npm run blob:upload-424b4        # Upload full PDFs
npm run blob:upload-extracted    # Upload extracted first 2 pages

# Extraction
npm run extract:metrics          # Extract pages locally
npm run extract:metrics-blob     # Extract metrics with Claude

# Export
npm run export:metrics           # Export Neon data to JSON
```

## Environment Variables

Required in `.env.local`:

```bash
# Neon Database
DATABASE_URL=postgresql://user:pass@host/db

# Vercel Blob Storage
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_xxx

# Anthropic API
ANTHROPIC_API_KEY=sk-ant-xxx
```

## Costs

### Per Filing:
- **Claude API**: ~$0.15 (Sonnet 4.5, PDF analysis)
- **Vercel Blob**: ~$0.001 (storage for extracted 2 pages)
- **Neon Database**: Free tier supports thousands of filings

### Total for 100 filings: ~$15

## Limitations

Currently extracts only **first 2 pages** (cover page metrics). To extract more:

1. Modify page limit in `scripts/extract-424b4-metrics.ts`
2. Add additional metrics to `TARGET_METRICS` array
3. Update prompts to specify what to look for
4. Re-run extraction pipeline

## Troubleshooting

### API Returns Empty Array
- Check if extractions completed: Look for `status = 'completed'` in `filings` table
- Run: `npm run extract:metrics-blob` to process filings

### Bounding Boxes Not Showing
- Verify `Bounding Boxes` object exists in API response
- Check that coordinates are percentages (0-100)

### Source Panel Not Loading PDF
- Verify blob URLs are public
- Check CORS settings on Vercel Blob

## Next Steps

1. **Scale Up**: Add remaining filings from blob storage
2. **More Metrics**: Extract from pages beyond first 2 (financial tables, etc.)
3. **Search Integration**: Index metrics in search service
4. **Real-time Updates**: Add webhook for automatic processing of new filings
