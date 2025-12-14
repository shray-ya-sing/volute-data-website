#!/usr/bin/env python3
"""
Fetch SEC filing for Astera Labs with proper headers.
SEC.gov requires a User-Agent header with contact information.
"""

import requests
from pathlib import Path

# Configuration
OUTPUT_DIR = Path("public/source-content/astera-labs")
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

# SEC filing URL
SEC_URL = "https://www.sec.gov/Archives/edgar/data/1736297/000119312524069611/d285484ds1a.htm"
OUTPUT_FILE = OUTPUT_DIR / "sec-filing-d285484ds1a.html"

# SEC requires a proper User-Agent with contact info
headers = {
    'User-Agent': 'Volute Data (contact@example.com)',
    'Accept-Encoding': 'gzip, deflate',
    'Host': 'www.sec.gov'
}

print("Fetching SEC filing...")
print(f"URL: {SEC_URL}")

try:
    response = requests.get(SEC_URL, headers=headers, timeout=30)
    response.raise_for_status()

    # Save the HTML content
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        f.write(response.text)

    size_kb = len(response.text) / 1024
    print(f"\n[SUCCESS] Saved: {OUTPUT_FILE}")
    print(f"Size: {size_kb:.1f} KB")

except requests.exceptions.RequestException as e:
    print(f"\n[ERROR] Failed to fetch SEC filing")
    print(f"Error: {e}")
    print("\nNote: SEC.gov may rate limit requests. Try again in a moment.")
