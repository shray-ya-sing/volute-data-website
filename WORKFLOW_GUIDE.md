# Data Entry Workflow Guide

This guide describes the recommended workflow for adding new companies and metrics to Volute once your database is set up.

## Quick Reference: Adding a New Company

### Step 1: Gather Company Information

Before you start, collect:
- Company name (e.g., "CoreWeave")
- Ticker symbol (e.g., "CRWV")
- Company ID/slug (lowercase, hyphenated, e.g., "coreweave")
- Logo URL (optional)

### Step 2: Create Company in Admin Panel

1. Navigate to `https://your-app.vercel.app/#admin`
2. Login with your admin password
3. Click "Add Company" tab
4. Fill in the form:
   - **Company ID**: `coreweave` (lowercase slug)
   - **Company Name**: `CoreWeave`
   - **Ticker**: `CRWV`
   - **Logo URL**: (optional)
5. Click "Add Company"

### Step 3: Research and Add Metrics

For each of the 21 IPO metrics, follow this workflow:

#### 3.1 Research the Metric

1. Open the company's SEC filings (S-1, S-1/A, 424B4)
2. Search for the specific metric
3. Note the exact value and page/section
4. Cross-reference with news articles, press releases
5. Validate the data from multiple sources

#### 3.2 Add Metric via Admin Panel

1. In the admin panel, click "Add/Update Metric"
2. Select the company from dropdown
3. Select the metric (e.g., "Final Price")
4. Enter the **Aggregated Value** - your final, validated value
   - Example: `$42.00 per share`
5. Add **Notes** if there are caveats:
   - Example: `"Priced above raised range of $38-$40"`

#### 3.3 Add Sources for the Metric

For each source where you found the metric:

1. Click "+ Add Source"
2. Fill in source details:
   - **Type**: Select from filing, news, presentation, database
   - **Date**: Date of the source document
   - **Source Name**: Clear, descriptive name
     - Good: `"S-1/A Filing - Offering Price"`
     - Bad: `"S1"`
   - **Value in Source**: Exact value found in this source
     - Example: `"$42.00"`
   - **URL**: Link to the source (filing URL, news article, etc.)

3. Add at least 2-3 sources per metric when possible
4. Click "Save Metric"

### Step 4: Repeat for All Metrics

Go through each of the 21 metrics:

**IPO Metrics:**
- IPO Date
- Final Price
- Expected Price Range
- Opening Price
- First Day Closing Price
- Upsized/Downsized

**Valuation Metrics:**
- IPO Valuation
- Last Private Valuation

**Share Structure:**
- Shares Offered (Primary)
- Shares Sold by Company
- Shares Sold by Selling Stockholders
- Greenshoe Shares
- Common Stock Outstanding

**Financial Metrics:**
- Gross Proceeds
- Net Proceeds
- Proceeds to Company
- Proceeds to Selling Stockholders
- Underwriter Discount

**Deal Information:**
- Bookrunning Banks
- Attorneys
- Notes

## Example: Adding CoreWeave IPO Data

### Example Metric: Final Price

**Research findings:**
- S-1/A (March 15, 2025): "$42.00 per share"
- TechCrunch article (March 15, 2025): "$42 per share"
- Wall Street Journal (March 15, 2025): "priced at $42"

**In Admin Panel:**
1. Company: `CoreWeave (CRWV)`
2. Metric: `Final Price`
3. Aggregated Value: `$42.00 per share`
4. Notes: `Priced above raised range of $38-$40`

**Sources:**
- Source 1:
  - Type: `filing`
  - Date: `2025-03-15`
  - Name: `S-1/A Filing - Final Offering Price`
  - Value: `$42.00 per share`
  - URL: `https://sec.gov/Archives/edgar/...`

- Source 2:
  - Type: `news`
  - Date: `2025-03-15`
  - Name: `TechCrunch - CoreWeave IPO Pricing`
  - Value: `$42 per share`
  - URL: `https://techcrunch.com/...`

- Source 3:
  - Type: `news`
  - Date: `2025-03-15`
  - Name: `Wall Street Journal - CoreWeave Goes Public`
  - Value: `priced at $42`
  - URL: `https://wsj.com/...`

## Data Quality Best Practices

### Source Selection

**Primary sources (most reliable):**
1. SEC filings (S-1, S-1/A, 424B4, 8-K)
2. Company press releases
3. Official investor presentations

**Secondary sources:**
1. Reputable financial news (WSJ, Bloomberg, Reuters, FT)
2. Tech news (TechCrunch, The Information)
3. Financial databases (PitchBook, Crunchbase)

**Avoid:**
- Social media posts
- Unverified blog posts
- Secondary citations without checking original source

### Handling Discrepancies

If sources disagree:

1. **Trust primary sources first**
   - SEC filings > press releases > news articles

2. **Check dates**
   - Metrics can change (e.g., price range revised)
   - Use the most recent value
   - Document revisions in Notes

3. **Document the discrepancy**
   - Example note: `"Initial range was $27-$30 (filed March 1), raised to $32-$34 (filed March 12), final price above range at $36"`

4. **When in doubt, add both sources**
   - Let the data speak for itself
   - Users can see all values in the Sources Panel

### Value Formatting Standards

**Currency:**
- Use: `$36.00 per share`, `$712.8M`, `$5.5B`
- Avoid: `36 dollars`, `712800000`, `5.5 billion dollars`

**Dates:**
- Use: `March 20, 2024`
- Avoid: `3/20/24`, `2024-03-20`, `March 20th, 2024`

**Percentages:**
- Use: `+72%`, `-15%`
- Avoid: `72 percent`, `0.72`

**Shares:**
- Use: `19.8M shares`, `155.5M shares`
- Avoid: `19,800,000`, `19.8 million shares`

**Text fields:**
- Use complete sentences with proper grammar
- Example: `Morgan Stanley & Co. LLC and J.P. Morgan Securities LLC`
- Not: `morgan stanley, jp morgan`

## Time Estimates

Based on Astera Labs experience:

- **Company setup**: 2 minutes
- **Per metric (simple)**: 5-10 minutes
  - 2-3 min: Find value in filing
  - 2-3 min: Cross-reference with news
  - 2-3 min: Add to admin panel
- **Per metric (complex)**: 15-20 minutes
  - Example: "Proceeds" might require calculation
  - Example: "Upsized/Downsized" requires comparing multiple filings

**Total per company**: 2-5 hours for all 21 metrics with thorough research

## Tips for Efficiency

### 1. Batch Research by Source Type

Research all metrics from one filing at once:
- Open S-1/A PDF
- Ctrl+F search for each metric
- Take notes on a spreadsheet
- Then add all metrics to admin panel

### 2. Use Browser Extensions

- **Link copier**: Quickly copy URLs
- **Tab manager**: Keep research tabs organized
- **PDF tools**: Extract text, highlight sections

### 3. Create Templates

Keep a text file with common source names:
```
S-1/A Filing - [Metric Name]
424B4 Prospectus - [Metric Name]
Company Press Release - IPO Pricing
TechCrunch - [Company] IPO Analysis
```

### 4. Keyboard Shortcuts

- In admin panel, use Tab to navigate between fields
- Use your browser's autofill for repeated URLs

### 5. Quality Over Speed

- It's better to spend 5 hours on one company with perfect data
- Than 1 hour on five companies with errors
- Your judgment and validation is the product differentiator

## Common Metrics and Where to Find Them

| Metric | Primary Source | Section/Page |
|--------|---------------|--------------|
| Final Price | 424B4 Prospectus | Cover page |
| Shares Offered | 424B4 Prospectus | Cover page, "Offering" section |
| Gross Proceeds | 424B4 Prospectus | Cover page, calculation |
| Net Proceeds | S-1/A | "Use of Proceeds" section |
| Underwriter Discount | 424B4 Prospectus | "Underwriting" section |
| Price Range | S-1/A (latest) | Cover page |
| IPO Valuation | News articles | Calculate or reported |
| Last Private Valuation | S-1, news | Risk factors, cap table |
| Opening Price | Financial news | Day-of coverage |
| First Day Close | Financial news | Day-of coverage |
| Bookrunners | 424B4 Prospectus | Cover page, bottom |
| Attorneys | Law firm announcements | Press releases |

## Automation Opportunities (Future)

As you scale, consider:

1. **PDF parsing scripts**
   - Extract common metrics from SEC filings automatically
   - You validate and approve values

2. **News monitoring**
   - Set up Google Alerts for IPO announcements
   - RSS feeds for IPO news

3. **Bulk import from Excel**
   - Research in Excel first
   - Import CSV to admin panel

4. **AI-assisted extraction**
   - Use Claude to extract metrics from filings
   - Always human-validate before saving

## Validation Checklist

Before marking a company as "complete":

- [ ] All 21 metrics have values (or marked N/A)
- [ ] Each metric has at least 2 sources
- [ ] All source URLs are valid and accessible
- [ ] Dates are correctly formatted
- [ ] Currency values use consistent format
- [ ] Notes document any assumptions or caveats
- [ ] Cross-referenced at least 3 independent sources
- [ ] Verified calculations (e.g., gross proceeds = shares × price)
- [ ] Checked for recent updates or corrections

## Getting Help

If you're unsure about a value:

1. **Add a note in the metric**
   - Example: `"Unable to verify from primary sources, based on TechCrunch report"`

2. **Mark for review**
   - Add a note: `"[REVIEW NEEDED]"`
   - Come back to it later

3. **When truly unknown**
   - It's okay to leave a metric empty temporarily
   - Better than guessing or using unreliable sources

## Example: Full Company Addition (Abbreviated)

```
Company: CoreWeave
Ticker: CRWV
ID: coreweave

1. Final Price: $42.00 per share
   Sources:
   - [filing] S-1/A Filing → $42.00 (2025-03-15)
   - [news] TechCrunch → $42 (2025-03-15)

2. IPO Date: March 20, 2025
   Sources:
   - [filing] 424B4 Prospectus → March 20, 2025
   - [news] Bloomberg → March 20, 2025

3. Gross Proceeds: $2.1B
   Sources:
   - [filing] 424B4 → $2,100,000,000
   - [news] WSJ → $2.1 billion

... (continue for all 21 metrics)
```

---

**Remember**: Your manual validation and source selection is what makes Volute data trustworthy. Take your time and be thorough!
