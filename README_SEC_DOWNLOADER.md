# SEC EDGAR Filing Downloader

Automates downloading S-1, 424B4, and related SEC filings for specified companies.

## Setup

1. Install required package:
```bash
pip install requests
```

Or use the requirements file:
```bash
pip install -r requirements.txt
```

## Configuration

Edit `download_sec_filings.py` and update:

1. **USER_AGENT** (Line 227) - **REQUIRED**
   - Replace with your name and email
   - SEC requires this for API access
   - Example: `"John Doe john.doe@example.com"`

2. **OUTPUT_DIR** (Line 224)
   - Already set to: `C:\Users\shrey\OneDrive\Documents\!Volute\v0\S-1 Filings`
   - Change if you want a different location

3. **TICKERS** (Line 230-234)
   - Add company ticker symbols you want to download
   - Example:
   ```python
   TICKERS = [
       'RBRK',   # Rubrik
       'ALAB',   # Astera Labs
       'SNOW',   # Snowflake
       'AI',     # C3.ai
   ]
   ```

4. **FILING_TYPES** (Line 237-242)
   - Default includes: S-1, S-1/A, 424B4, 424B3
   - Add other types if needed (e.g., '10-K', '10-Q')

## Usage

Run the script:
```bash
python download_sec_filings.py
```

The script will:
1. Look up each company's CIK number from their ticker
2. Search for all filings of the specified types
3. Download each filing to your output directory
4. Skip files that already exist
5. Respect SEC rate limits (10 requests/second)

## File Naming

Files are saved with the format:
```
CompanyName_FormType_FilingDate.htm
```

Examples:
- `Rubrik_Inc_424B4_2024-04-24.htm`
- `Astera_Labs_Inc_S-1_2024-03-19.htm`

## Features

- **Automatic CIK lookup** - Just provide ticker symbols
- **Rate limiting** - Complies with SEC's 10 requests/second limit
- **Skip existing files** - Won't re-download files you already have
- **Multiple filing types** - Download S-1, amendments, prospectuses, etc.
- **Clean filenames** - Organized, readable file names
- **Progress tracking** - Shows what's being downloaded in real-time

## SEC API Requirements

The SEC requires a User-Agent header with contact information. Make sure to:
1. Replace the USER_AGENT with your actual name and email
2. Don't abuse the API (script already has rate limiting)
3. Read SEC's fair access policy: https://www.sec.gov/os/accessing-edgar-data

## Troubleshooting

**"Could not find CIK for ticker XXX"**
- Check that the ticker is correct
- Some companies may not be in the SEC database yet
- Try searching manually at https://www.sec.gov/edgar/searchedgar/companysearch

**"Error 403 Forbidden"**
- Make sure you've set a valid USER_AGENT with your email
- SEC blocks requests without proper User-Agent headers

**Files already exist**
- The script skips existing files by default
- Delete files if you want to re-download them

## Adding More Companies

To add more AI companies or any other companies:

1. Open `download_sec_filings.py`
2. Find the `TICKERS` list (around line 230)
3. Add ticker symbols:
```python
TICKERS = [
    'RBRK',   # Rubrik
    'ALAB',   # Astera Labs
    'SNOW',   # Snowflake
    'AI',     # C3.ai
    'PLTR',   # Palantir
    'PATH',   # UiPath
    # Add more here
]
```
4. Save and run the script
