"""
SEC EDGAR Filing Downloader
Automatically downloads S-1, 424B4, and related filings for specified companies.
"""

import requests
import json
import time
import os
from pathlib import Path
from datetime import datetime
import re

class SECFilingDownloader:
    def __init__(self, output_dir, user_agent="Your Name your.email@example.com"):
        """
        Initialize the SEC filing downloader.

        Args:
            output_dir: Directory to save downloaded filings
            user_agent: User agent string (SEC requires contact info)
        """
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)

        # SEC requires User-Agent header with contact information
        self.headers = {
            'User-Agent': user_agent,
            'Accept-Encoding': 'gzip, deflate'
        }

        self.base_url = "https://data.sec.gov"
        self.edgar_url = "https://www.sec.gov"

        # Rate limiting: SEC allows 10 requests per second
        self.request_delay = 0.11  # 110ms between requests
        self.last_request_time = 0

    def _rate_limit(self):
        """Enforce rate limiting to comply with SEC rules."""
        elapsed = time.time() - self.last_request_time
        if elapsed < self.request_delay:
            time.sleep(self.request_delay - elapsed)
        self.last_request_time = time.time()

    def get_company_cik(self, ticker):
        """
        Get the CIK (Central Index Key) for a company ticker.

        Args:
            ticker: Company ticker symbol

        Returns:
            CIK string (10 digits, zero-padded) or None if not found
        """
        self._rate_limit()

        # Try the company tickers exchange JSON endpoint
        url = "https://www.sec.gov/files/company_tickers_exchange.json"

        try:
            response = requests.get(url, headers={
                'User-Agent': self.headers['User-Agent'],
                'Accept-Encoding': 'gzip, deflate',
                'Host': 'www.sec.gov'
            })
            response.raise_for_status()

            companies = response.json()

            # Search for the ticker in the fields list
            ticker_upper = ticker.upper()
            for company in companies.get('data', []):
                # Format: [CIK, Name, Ticker, Exchange]
                if len(company) >= 3 and company[2] == ticker_upper:
                    cik = str(company[0]).zfill(10)
                    print(f"Found CIK for {ticker}: {cik} ({company[1]})")
                    return cik

            print(f"Warning: Could not find CIK for ticker {ticker}")
            return None

        except Exception as e:
            print(f"Error getting CIK for {ticker}: {e}")
            return None

    def get_filings(self, cik, filing_types=['S-1', 'S-1/A', '424B4', '424B3']):
        """
        Get all filings of specified types for a company.

        Args:
            cik: Company CIK (10 digits)
            filing_types: List of filing types to retrieve

        Returns:
            List of filing metadata dictionaries
        """
        self._rate_limit()

        url = f"{self.base_url}/submissions/CIK{cik}.json"

        try:
            response = requests.get(url, headers=self.headers)
            response.raise_for_status()

            data = response.json()
            company_name = data.get('name', 'Unknown')

            recent_filings = data.get('filings', {}).get('recent', {})

            filings = []

            # Extract filings of the desired types
            for i in range(len(recent_filings.get('form', []))):
                form_type = recent_filings['form'][i]

                if form_type in filing_types:
                    filing = {
                        'company_name': company_name,
                        'cik': cik,
                        'form_type': form_type,
                        'filing_date': recent_filings['filingDate'][i],
                        'accession_number': recent_filings['accessionNumber'][i],
                        'primary_document': recent_filings['primaryDocument'][i],
                        'description': recent_filings.get('primaryDocDescription', [''])[i] if i < len(recent_filings.get('primaryDocDescription', [])) else ''
                    }
                    filings.append(filing)

            print(f"Found {len(filings)} filings for {company_name} (CIK: {cik})")
            return filings

        except Exception as e:
            print(f"Error getting filings for CIK {cik}: {e}")
            return []

    def download_filing(self, filing):
        """
        Download a filing document.

        Args:
            filing: Filing metadata dictionary

        Returns:
            Path to downloaded file or None if failed
        """
        self._rate_limit()

        # Build the document URL
        accession = filing['accession_number'].replace('-', '')
        doc_url = f"{self.edgar_url}/Archives/edgar/data/{filing['cik']}/{accession}/{filing['primary_document']}"

        # Create a clean filename
        company_name = re.sub(r'[^\w\s-]', '', filing['company_name'])
        company_name = re.sub(r'[-\s]+', '_', company_name)

        form_type = filing['form_type'].replace('/', '_')
        filing_date = filing['filing_date']

        # Get file extension from primary document
        file_ext = Path(filing['primary_document']).suffix
        if not file_ext:
            file_ext = '.htm'

        filename = f"{company_name}_{form_type}_{filing_date}{file_ext}"
        output_path = self.output_dir / filename

        # Skip if already downloaded
        if output_path.exists():
            print(f"Already exists: {filename}")
            return output_path

        try:
            print(f"Downloading: {filename}")
            print(f"  URL: {doc_url}")

            response = requests.get(doc_url, headers={
                'User-Agent': self.headers['User-Agent'],
                'Accept-Encoding': 'gzip, deflate'
            })
            response.raise_for_status()

            # Save the file
            output_path.write_bytes(response.content)
            print(f"  Saved to: {output_path}")

            return output_path

        except Exception as e:
            print(f"  Error downloading {filename}: {e}")
            return None

    def download_filings_for_ticker(self, ticker, filing_types=['S-1', 'S-1/A', '424B4', '424B3']):
        """
        Download all filings of specified types for a company ticker.

        Args:
            ticker: Company ticker symbol
            filing_types: List of filing types to download

        Returns:
            List of paths to downloaded files
        """
        print(f"\n{'='*60}")
        print(f"Processing ticker: {ticker}")
        print(f"{'='*60}")

        # Get CIK
        cik = self.get_company_cik(ticker)
        if not cik:
            return []

        # Get filings
        filings = self.get_filings(cik, filing_types)
        if not filings:
            print(f"No filings found for {ticker}")
            return []

        # Download each filing
        downloaded = []
        for filing in filings:
            path = self.download_filing(filing)
            if path:
                downloaded.append(path)

        print(f"\nCompleted {ticker}: Downloaded {len(downloaded)} of {len(filings)} filings")
        return downloaded


def main():
    """Main function to run the downloader."""

    # Configuration
    OUTPUT_DIR = r"C:\Users\shrey\OneDrive\Documents\!Volute\v0\S-1 Filings"

    # IMPORTANT: Replace with your name and email
    USER_AGENT = "Test Script test@example.com"

    # List of company tickers to download
    TICKERS = [
        'RDDT',   # Reddit
        'CRWV',   # CoreWeave (checking if ticker exists)
        # Add more tickers here
    ]

    # Filing types to download
    FILING_TYPES = [
        'S-1',      # Initial registration statement
        'S-1/A',    # Amended registration statement
        '424B4',    # Final prospectus
        '424B3',    # Prospectus supplement
    ]

    # Initialize downloader
    print("SEC EDGAR Filing Downloader")
    print(f"Output directory: {OUTPUT_DIR}")
    print(f"Filing types: {', '.join(FILING_TYPES)}")
    print(f"Tickers: {', '.join(TICKERS)}")
    print()

    downloader = SECFilingDownloader(OUTPUT_DIR, USER_AGENT)

    # Download filings for each ticker
    all_downloaded = []
    for ticker in TICKERS:
        downloaded = downloader.download_filings_for_ticker(ticker, FILING_TYPES)
        all_downloaded.extend(downloaded)

    # Summary
    print(f"\n{'='*60}")
    print(f"SUMMARY")
    print(f"{'='*60}")
    print(f"Total files downloaded: {len(all_downloaded)}")
    print(f"Output directory: {OUTPUT_DIR}")
    print("\nDone!")


if __name__ == "__main__":
    main()
