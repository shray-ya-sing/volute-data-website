#!/usr/bin/env python3
"""
Download Astera Labs S-1/A PDF from SEC.gov
"""

import requests
from pathlib import Path

OUTPUT_DIR = Path("public/source-content/astera-labs")
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

# SEC filing PDF URL for Astera Labs S-1/A
# The PDF version of the filing
PDF_URL = "https://www.sec.gov/Archives/edgar/data/1736297/000119312524069611/d285484ds1a.pdf"
OUTPUT_FILE = OUTPUT_DIR / "astera-s1a-filing.pdf"

headers = {
    'User-Agent': 'Volute Data (contact@example.com)',
    'Accept-Encoding': 'gzip, deflate',
    'Host': 'www.sec.gov'
}

print("Downloading Astera Labs S-1/A PDF from SEC.gov...")
print(f"URL: {PDF_URL}")

try:
    response = requests.get(PDF_URL, headers=headers, timeout=60)
    response.raise_for_status()

    # Save the PDF
    with open(OUTPUT_FILE, 'wb') as f:
        f.write(response.content)

    size_mb = len(response.content) / (1024 * 1024)
    print(f"\n[SUCCESS] Downloaded PDF")
    print(f"Saved to: {OUTPUT_FILE}")
    print(f"Size: {size_mb:.2f} MB")

except requests.exceptions.RequestException as e:
    print(f"\n[ERROR] Failed to download PDF")
    print(f"Error: {e}")
    print("\nNote: SEC.gov may rate limit requests. Try again in a moment.")
