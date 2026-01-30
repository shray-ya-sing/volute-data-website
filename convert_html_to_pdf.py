#!/usr/bin/env python3
"""
Convert HTML 424B4 filings to PDF format
"""

import os
from pathlib import Path
from weasyprint import HTML
import logging

# Setup logging
logging.basicConfig(level=logging.WARNING)
logger = logging.getLogger('weasyprint')
logger.setLevel(logging.ERROR)

# Directories
input_dir = "424B4_filings_free"
output_dir = "424B4_filings_pdf"

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
        # Convert HTML to PDF
        HTML(filename=str(html_file)).write_pdf(str(pdf_path))

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

print()
print("=" * 70)
print(f"Conversion complete!")
print(f"Converted: {converted}")
print(f"Skipped (already exist): {skipped}")
print(f"Failed: {failed}")
print(f"Total: {len(html_files)}")
print(f"PDF files location: {os.path.abspath(output_dir)}")
