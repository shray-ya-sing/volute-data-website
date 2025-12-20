# How the Pipeline Finds ALL Companies

## ✅ Yes, It Gathers ALL 424B4 Filings from ALL Companies

The pipeline is **NOT** restricted to specific tickers. It monitors **every** 424B4 filing published by the SEC.

## How It Works

### 1. SEC RSS Feed (No Filters)

**Source URL:**
```
https://www.sec.gov/cgi-bin/browse-edgar?action=getcurrent&type=424B4&count=100&output=atom
```

**What it does:**
- ✅ Fetches **ALL** recent 424B4 filings (up to 100 most recent)
- ✅ **NO** ticker filtering
- ✅ **NO** company name filtering
- ✅ **NO** CIK filtering
- ✅ Returns filings from **ANY** company that files a 424B4

**Example response includes companies like:**
- ServiceTitan, Inc. (TTAN)
- WEBTOON Entertainment Inc. (WBTN)
- Tempus AI, Inc. (TEM)
- Astera Labs, Inc. (ALAB)
- Rubrik, Inc. (RBRK)
- **...and ANY other company that files 424B4**

### 2. Parsing Logic (Processes Everything)

**Code:** `api/cron/check-new-filings.ts` lines 47-89

```typescript
// Process EVERY entry in the RSS feed
for (const entryMatch of entries) {
  const entry = entryMatch[1];

  // Extract company info from EVERY filing
  const companyName = titleMatch[1].trim();
  const cik = titleMatch[2];
  const accessionNumber = accessionMatch[1];

  // Use company name as temporary ticker
  const tempTicker = companyName
    .replace(/,?\s+(INC\.?|CORP\.?|LTD\.?|LLC|CO\.?)$/i, '')
    .trim();

  filings.push({ /* ALL filings added */ });
}
```

**No filtering happens here** - every filing from the RSS feed is added to the database.

### 3. Ticker Extraction (Two-Phase)

**Phase 1: Initial (Temporary)**
- When first discovered, ticker = company name (e.g., "SERVICETITAN")
- Example: "SERVICETITAN, INC." → temporary ticker: "SERVICETITAN"

**Phase 2: Extraction (Accurate)**
- Claude extracts actual ticker from filing document
- Example: Filing analyzed → extracted ticker: "TTAN"
- Database updated with real ticker

**Code:** `api/cron/poll-batches.ts` lines 105-144

```typescript
// Find extracted ticker from Claude's analysis
const tickerMetric = metrics.find(m => m.metric_name === 'Company Ticker');
const extractedTicker = tickerMetric?.metric_value || ticker;

// Update database with real ticker
await sql`
  UPDATE filings
  SET ticker = ${extractedTicker}
  WHERE id = ${filingId}
`;
```

### 4. Deduplication (By Accession Number)

**Database constraint:**
```sql
accession_number VARCHAR(30) UNIQUE
```

**How it prevents duplicates:**
- Each SEC filing has a unique accession number (e.g., "0001941106-24-000001")
- If the same filing appears again in RSS feed, database rejects it
- Allows multiple companies with similar names to coexist

## Real-World Example

### Day 1: SEC publishes 5 new 424B4s

**RSS Feed contains:**
1. ServiceTitan, Inc. (CIK: 0001941106)
2. WEBTOON Entertainment Inc. (CIK: 0001863704)
3. Acme Corp. (CIK: 0001234567) ← **NEW COMPANY**
4. TechStart Inc. (CIK: 0009876543) ← **NEW COMPANY**
5. BioMed Solutions LLC (CIK: 0005555555) ← **NEW COMPANY**

**Pipeline processes ALL 5:**
```
🔍 check-new-filings (runs every 5 min)
   ✓ Found 5 new filings
   ✓ Added: SERVICETITAN (0001941106-24-000123)
   ✓ Added: WEBTOON (0001863704-24-000456)
   ✓ Added: ACME (0001234567-24-000789) ← NEW
   ✓ Added: TECHSTART (0009876543-24-000012) ← NEW
   ✓ Added: BIOMED SOLUTIONS (0005555555-24-000034) ← NEW

📤 submit-batch (runs 5 min later)
   ✓ Downloaded PDFs for all 5 companies
   ✓ Uploaded to blob: SERVICETITAN_page1.pdf
   ✓ Uploaded to blob: WEBTOON_page1.pdf
   ✓ Uploaded to blob: ACME_page1.pdf ← NEW
   ✓ Uploaded to blob: TECHSTART_page1.pdf ← NEW
   ✓ Uploaded to blob: BIOMED_SOLUTIONS_page1.pdf ← NEW
   ✓ Submitted batch: msgbatch_01ABC123

🔄 poll-batches (30-90 min later)
   ✓ Batch completed
   ✓ Extracted metrics for SERVICETITAN (ticker: TTAN)
   ✓ Extracted metrics for WEBTOON (ticker: WBTN)
   ✓ Extracted metrics for ACME (ticker: ACME) ← NEW
   ✓ Extracted metrics for TECHSTART (ticker: TSTA) ← NEW
   ✓ Extracted metrics for BIOMED SOLUTIONS (ticker: BMED) ← NEW
```

**Result in Neon database:**

| id | ticker | company_name | filing_date | status | metrics_count |
|----|--------|--------------|-------------|---------|---------------|
| 1  | TTAN   | ServiceTitan, Inc. | 2024-12-18 | completed | 15 |
| 2  | WBTN   | WEBTOON Entertainment Inc. | 2024-12-17 | completed | 14 |
| 3  | ACME   | Acme Corp. | 2024-12-20 | completed | 16 | ← **NEW**
| 4  | TSTA   | TechStart Inc. | 2024-12-20 | completed | 13 | ← **NEW**
| 5  | BMED   | BioMed Solutions LLC | 2024-12-19 | completed | 15 | ← **NEW**

**Result in your frontend:**
- Search shows all 5 companies
- Each has extracted metrics
- Sources link to their respective PDF filings

## What Gets Monitored

### ✅ INCLUDED (All 424B4 filings):
- IPO prospectuses (most common)
- Follow-on offering prospectuses
- Direct listings
- SPACs
- **ANY company that files form 424B4 with the SEC**

### ❌ NOT INCLUDED:
- Other form types (S-1, 8-K, 10-K, etc.)
- International filings (non-US companies)
- Private placements (not filed with SEC)
- Companies that don't file with SEC

## Verification

### Check RSS Feed Yourself

Visit: https://www.sec.gov/cgi-bin/browse-edgar?action=getcurrent&type=424B4&count=100&output=atom

You'll see entries like:
```xml
<entry>
  <title>424B4 - SERVICETITAN, INC. (0001941106) (Filer)</title>
  <link href="https://www.sec.gov/cgi-bin/viewer?action=view&cik=1941106&accession_number=0001193125-24-000123"/>
  <updated>2024-12-18T08:00:00-05:00</updated>
</entry>
<entry>
  <title>424B4 - ANOTHER COMPANY, INC. (0001234567) (Filer)</title>
  ...
</entry>
```

**The pipeline processes EVERY `<entry>` in this feed.**

### Monitor in Real-Time

After deployment, check logs:

```bash
# Watch for new companies being discovered
curl "https://your-app.vercel.app/api/cron/status" | jq '.recentFilings'

# Sample output:
{
  "recentFilings": [
    { "ticker": "TTAN", "companyName": "ServiceTitan, Inc.", "status": "completed" },
    { "ticker": "WBTN", "companyName": "WEBTOON Entertainment Inc.", "status": "completed" },
    { "ticker": "ACME", "companyName": "Acme Corp.", "status": "processing" },  ← NEW COMPANY
    { "ticker": "TSTA", "companyName": "TechStart Inc.", "status": "pending" }, ← NEW COMPANY
  ]
}
```

## Database Query to See All Companies

```sql
-- See all discovered companies
SELECT
  ticker,
  cik,
  filing_date,
  status,
  created_at,
  (SELECT COUNT(*) FROM metrics WHERE filing_id = filings.id) as metric_count
FROM filings
ORDER BY created_at DESC;

-- See companies discovered in last 24 hours
SELECT ticker, filing_date, status
FROM filings
WHERE created_at > NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC;
```

## Summary

### ✅ What the Pipeline Does:
1. **Monitors** SEC RSS feed for ALL 424B4 filings (no filters)
2. **Discovers** any company that files a 424B4
3. **Downloads** their PDF filing
4. **Extracts** metrics using Claude
5. **Stores** data in your database
6. **Displays** in your frontend

### ❌ What It Does NOT Do:
- Filter by ticker
- Filter by company name
- Filter by industry
- Require pre-configuration of companies
- Need manual addition of new companies

### 🎯 Bottom Line:

**If a company files a 424B4 with the SEC, your pipeline will automatically find it, process it, and add it to your database.**

No manual intervention needed. No configuration required. Fully automated.

## Recent IPOs That Would Be Auto-Discovered

These companies filed 424B4s recently and would be automatically added:

- **Reddit** (RDDT) - March 2024
- **Astera Labs** (ALAB) - March 2024
- **Rubrik** (RBRK) - April 2024
- **Viking Therapeutics** - If they IPO
- **Klarna** - If they IPO
- **Databricks** - If they IPO
- **Stripe** - If they IPO

**The pipeline finds them all automatically** as soon as they file 424B4.
