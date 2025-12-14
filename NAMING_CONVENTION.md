# Source Content Naming Convention

This document outlines the naming convention for source files to maintain consistency across companies.

## Directory Structure

```
public/source-content/
├── {company-name}/
│   ├── {TICKER}_S1A.pdf          # SEC S-1/A filing
│   ├── {TICKER}_424B4.pdf         # SEC 424B4 filing (if applicable)
│   ├── {source}-{description}.html # News articles/press releases
│   └── ...
```

## File Naming Rules

### 1. **SEC Filings (PDF preferred)**
Format: `{TICKER}_{FILING_TYPE}.pdf`

Examples:
- `ALAB_S1A.pdf` - Astera Labs S-1/A filing
- `RBRK_S1A.pdf` - Rubrik S-1/A filing
- `SNOW_424B4.pdf` - Snowflake 424B4 filing (example)

**Why:** Ticker symbol makes it easy to identify which company, filing type clarifies the document.

### 2. **News Articles / Press Releases (HTML)**
Format: `{source-domain}-{brief-description}.html`

Examples:
- `finance-yahoo-astera-labs-ipo-proceeds.html`
- `techcrunch-astera-labs-ipo-analysis.html`
- `reuters-pricing-announcement.html`

**Why:** Source domain helps identify reliability, description helps find content.

### 3. **Company Directories**
Format: `{company-name-lowercase}` (use company name, not ticker)

Examples:
- `astera-labs/` (not `alab/`)
- `rubrik/` (not `rbrk/`)
- `snowflake/` (not `snow/`)

**Why:** Company names are more recognizable than tickers when browsing directories.

## Data File Naming

### Enhanced Source Data Files
Format: `{company-name}-sources.json`

Examples:
- `data/astera-sources.json`
- `data/rubrik-sources.json`
- `data/snowflake-sources.json`

## Quick Reference: Adding a New Company

### Step 1: Create Directory
```bash
mkdir public/source-content/{company-name}
```

### Step 2: Add Files
```bash
# PDF filing
public/source-content/{company-name}/{TICKER}_S1A.pdf

# News articles
public/source-content/{company-name}/source-description.html
```

### Step 3: Create Data File
```bash
data/{company-name}-sources.json
```

### Step 4: Update App.tsx
Add fetch for the new company's enhanced sources.

## Examples

### Astera Labs (ALAB)
```
public/source-content/astera-labs/
├── ALAB_S1A.pdf
├── finance-yahoo-astera-labs-seeks-raise-022814539.html
├── techcrunch-astera-labs-ipo-pops-54-showing-that-investor-dema.html
└── ...

data/astera-sources.json
```

### Rubrik (RBRK)
```
public/source-content/rubrik/
└── RBRK_S1A.pdf

data/rubrik-sources.json
```

### Future Company: Snowflake (SNOW)
```
public/source-content/snowflake/
├── SNOW_S1A.pdf
├── bloomberg-snowflake-ipo-pricing.html
├── reuters-snowflake-ipo-analysis.html
└── ...

data/snowflake-sources.json
```

## Benefits

1. **Scalability**: Easy to add new companies without naming conflicts
2. **Clarity**: Ticker symbols clearly identify company filings
3. **Organization**: Company directories keep sources grouped
4. **Searchability**: Consistent naming makes finding files easy
5. **Git-friendly**: Lowercase, hyphenated names work well with version control
