#!/usr/bin/env python3
"""
Fetch Astera Labs source HTML files from URLs in source_links folder.
Saves cleaned HTML files to public/source-content/astera-labs/
"""

import os
import re
import time
from pathlib import Path
from urllib.parse import urlparse
import requests
from bs4 import BeautifulSoup

# Configuration
SOURCE_LINKS_DIR = Path("source_links")
OUTPUT_DIR = Path("public/source-content/astera-labs")
USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"

# Ensure output directory exists
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

def read_links_from_file(filepath):
    """Read URLs from a text file (comma separated, one per line)"""
    links = []
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
        # Split by comma and/or newline, filter empty strings
        raw_links = re.split(r'[,\n]+', content)
        links = [link.strip() for link in raw_links if link.strip()]
    return links

def generate_filename(url, index):
    """Generate a descriptive filename from URL"""
    parsed = urlparse(url)
    domain = parsed.netloc.replace('www.', '').replace('.com', '').replace('.', '-')

    # Extract meaningful part from path
    path_parts = [p for p in parsed.path.split('/') if p]

    if 'sec.gov' in parsed.netloc:
        # For SEC filings, use the filing ID
        if path_parts:
            filename = f"sec-filing-{path_parts[-1].replace('.htm', '')}"
        else:
            filename = f"sec-filing-{index}"
    else:
        # For news articles, use domain and date/slug
        if path_parts:
            # Try to extract date or meaningful slug
            slug = path_parts[-1].replace('.html', '').replace('.htm', '')
            # Limit slug length
            slug = slug[:50] if len(slug) > 50 else slug
            filename = f"{domain}-{slug}"
        else:
            filename = f"{domain}-article-{index}"

    # Clean filename - remove invalid characters
    filename = re.sub(r'[^\w\-]', '-', filename)
    filename = re.sub(r'-+', '-', filename)  # Remove consecutive dashes
    filename = filename.strip('-')

    return f"{filename}.html"

def fetch_html(url, timeout=30):
    """Fetch HTML content from URL"""
    headers = {
        'User-Agent': USER_AGENT,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1'
    }

    try:
        print(f"  Fetching: {url}")
        response = requests.get(url, headers=headers, timeout=timeout)
        response.raise_for_status()
        return response.text
    except requests.exceptions.RequestException as e:
        print(f"  ERROR: Failed to fetch {url}")
        print(f"  {type(e).__name__}: {e}")
        return None

def clean_html(html_content, url):
    """Clean and sanitize HTML content"""
    soup = BeautifulSoup(html_content, 'html.parser')

    # Remove script tags
    for script in soup.find_all('script'):
        script.decompose()

    # Remove style tags (keep inline styles)
    for style in soup.find_all('style'):
        style.decompose()

    # Remove common ad/tracking elements
    ad_classes = ['ad', 'ads', 'advertisement', 'sponsored', 'promo', 'social-share',
                  'newsletter', 'subscription', 'paywall', 'cookie-banner']
    for ad_class in ad_classes:
        for element in soup.find_all(class_=re.compile(ad_class, re.I)):
            element.decompose()

    # Remove iframes (usually ads or embeds)
    for iframe in soup.find_all('iframe'):
        iframe.decompose()

    # For SEC filings, keep everything as-is (minimal cleaning)
    if 'sec.gov' in url:
        return str(soup)

    # For news articles, try to extract main content
    # Look for article, main, or content divs
    main_content = soup.find('article') or soup.find('main') or soup.find(class_=re.compile(r'(article|content|post|story)', re.I))

    if main_content:
        # Keep the main content
        return str(main_content)
    else:
        # Fallback: return the body content
        body = soup.find('body')
        return str(body) if body else str(soup)

def save_html(html_content, filename):
    """Save HTML content to file"""
    filepath = OUTPUT_DIR / filename
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(html_content)
    print(f"  Saved: {filepath}")
    return filepath

def main():
    print("=" * 70)
    print("Fetching Astera Labs Source Files")
    print("=" * 70)

    all_sources = []

    # Read links from both files
    filing_links_file = SOURCE_LINKS_DIR / "alab_filing_links.txt"
    press_links_file = SOURCE_LINKS_DIR / "alab_press_links.txt"

    print(f"\n[FILINGS] Reading filing links from: {filing_links_file}")
    if filing_links_file.exists():
        filing_links = read_links_from_file(filing_links_file)
        print(f"  Found {len(filing_links)} filing link(s)")
        all_sources.extend([('filing', link) for link in filing_links])
    else:
        print(f"  WARNING: File not found!")

    print(f"\n[PRESS] Reading press/news links from: {press_links_file}")
    if press_links_file.exists():
        press_links = read_links_from_file(press_links_file)
        print(f"  Found {len(press_links)} press link(s)")
        all_sources.extend([('press', link) for link in press_links])
    else:
        print(f"  WARNING: File not found!")

    print(f"\n[TOTAL] Sources to fetch: {len(all_sources)}")
    print("=" * 70)

    # Fetch each source
    successful = 0
    failed = 0

    for idx, (source_type, url) in enumerate(all_sources, start=1):
        print(f"\n[{idx}/{len(all_sources)}] Processing {source_type.upper()}")

        # Fetch HTML
        html_content = fetch_html(url)

        if html_content:
            # Clean HTML
            cleaned_html = clean_html(html_content, url)

            # Generate filename
            filename = generate_filename(url, idx)

            # Save to file
            try:
                save_html(cleaned_html, filename)
                successful += 1
            except Exception as e:
                print(f"  ERROR: Failed to save file: {e}")
                failed += 1
        else:
            failed += 1

        # Be polite - add delay between requests
        if idx < len(all_sources):
            time.sleep(2)

    # Summary
    print("\n" + "=" * 70)
    print("SUMMARY")
    print("=" * 70)
    print(f"[SUCCESS] Successfully fetched: {successful}")
    print(f"[FAILED] Failed to fetch: {failed}")
    print(f"[OUTPUT] Output directory: {OUTPUT_DIR.absolute()}")
    print("=" * 70)

    # List saved files
    if successful > 0:
        print("\n[FILES] Saved files:")
        for file in sorted(OUTPUT_DIR.glob("*.html")):
            size_kb = file.stat().st_size / 1024
            print(f"  - {file.name} ({size_kb:.1f} KB)")

if __name__ == "__main__":
    main()
