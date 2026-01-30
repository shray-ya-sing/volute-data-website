#!/usr/bin/env python3
"""
Convert HTML 424B4 filings to PDF format using Playwright
"""

import os
from pathlib import Path
from playwright.sync_api import sync_playwright

# Directories
input_dir = "424B4_filings_free/2023"
output_dir = "424B4_filings_pdf/2023"

# Create output directory
os.makedirs(output_dir, exist_ok=True)

# Find all HTML files
html_files = []
for ext in ['*.htm', '*.html']:
    html_files.extend(Path(input_dir).glob(ext))

if not html_files:
    print(f"No HTML files found in {input_dir}")
    exit(1)

print(f"Found {len(html_files)} HTML files to convert")
print(f"Input directory: {os.path.abspath(input_dir)}")
print(f"Output directory: {os.path.abspath(output_dir)}")
print("=" * 70)
print()

converted = 0
skipped = 0
failed = 0

with sync_playwright() as p:
    # Launch browser
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()

    for i, html_file in enumerate(html_files, 1):
        # Create PDF filename
        pdf_filename = html_file.stem + ".pdf"
        pdf_path = Path(output_dir) / pdf_filename

        # Skip if already exists
        if pdf_path.exists():
            pdf_size = pdf_path.stat().st_size
            print(f"[{i}/{len(html_files)}] SKIP: {pdf_filename} (already exists, {pdf_size:,} bytes)")
            skipped += 1
            continue

        print(f"[{i}/{len(html_files)}] Converting: {html_file.name}")

        try:
            # Load HTML file
            html_url = f"file:///{html_file.absolute().as_posix()}"
            page.goto(html_url, wait_until="networkidle", timeout=30000)

            # Convert to PDF
            page.pdf(
                path=str(pdf_path),
                format='Letter',
                print_background=True,
                margin={
                    'top': '0.5in',
                    'bottom': '0.5in',
                    'left': '0.5in',
                    'right': '0.5in'
                }
            )

            pdf_size = pdf_path.stat().st_size
            html_size = html_file.stat().st_size
            print(f"    SUCCESS: {pdf_size:,} bytes ({pdf_size/1024/1024:.1f} MB)")
            print(f"    Original HTML: {html_size:,} bytes ({html_size/1024:.1f} KB)")
            converted += 1

        except Exception as e:
            print(f"    ERROR: {str(e)}")
            failed += 1
            # Remove partial PDF if it exists
            if pdf_path.exists():
                pdf_path.unlink()

    browser.close()

print()
print("=" * 70)
print(f"Conversion complete!")
print(f"Converted: {converted}")
print(f"Skipped (already exist): {skipped}")
print(f"Failed: {failed}")
print(f"Total: {len(html_files)}")
print(f"PDF files location: {os.path.abspath(output_dir)}")
