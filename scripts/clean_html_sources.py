#!/usr/bin/env python3
"""
Clean scraped HTML files to make them viewer-friendly.
Removes HTML comments, scripts, ads, and extracts main content.
"""

import re
from pathlib import Path
from bs4 import BeautifulSoup, Comment

SOURCE_DIR = Path("public/source-content/astera-labs")
OUTPUT_DIR = SOURCE_DIR / "cleaned"
OUTPUT_DIR.mkdir(exist_ok=True)

def clean_html_file(input_path: Path, output_path: Path):
    """Clean a single HTML file"""
    print(f"\nCleaning: {input_path.name}")

    with open(input_path, 'r', encoding='utf-8') as f:
        html = f.read()

    # Parse HTML
    soup = BeautifulSoup(html, 'html.parser')

    # Remove HTML comments (like <!-- HTML_TAG_START -->)
    for comment in soup.find_all(string=lambda text: isinstance(text, Comment)):
        comment.extract()

    # Remove scripts, styles
    for tag in soup(['script', 'style', 'iframe', 'noscript']):
        tag.decompose()

    # Remove ad containers and tracking elements
    ad_patterns = ['ad', 'advertisement', 'promo', 'sponsored', 'social-share',
                   'newsletter', 'paywall', 'cookie', 'tracking']
    for pattern in ad_patterns:
        for element in soup.find_all(class_=re.compile(pattern, re.I)):
            element.decompose()
        for element in soup.find_all(id=re.compile(pattern, re.I)):
            element.decompose()

    # Try to find main content
    main_content = (
        soup.find('article') or
        soup.find('main') or
        soup.find(class_=re.compile(r'(article|content|body)', re.I)) or
        soup.find('body')
    )

    if not main_content:
        print(f"  WARNING: Could not find main content, using full body")
        main_content = soup

    # Create clean HTML
    clean_soup = BeautifulSoup('''
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>Source Content</title>
            <style>
                body {
                    font-family: Georgia, serif;
                    line-height: 1.6;
                    max-width: 800px;
                    margin: 20px auto;
                    padding: 20px;
                    color: #333;
                }
                h1, h2, h3 { color: #222; }
                p { margin: 1em 0; }
                a { color: #0066cc; }
            </style>
        </head>
        <body></body>
        </html>
    ''', 'html.parser')

    # Copy content
    clean_soup.body.append(main_content)

    # Write cleaned HTML
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(str(clean_soup.prettify()))

    print(f"  ✓ Saved to: {output_path.name}")
    print(f"  Original size: {len(html):,} bytes")
    print(f"  Cleaned size: {len(str(clean_soup)):,} bytes")

    # Check for target text
    text_content = clean_soup.get_text()
    has_price = '$36' in text_content
    has_proceeds = '712' in text_content or '713' in text_content
    print(f"  Contains '$36': {has_price}")
    print(f"  Contains proceeds data: {has_proceeds}")

def main():
    print("=" * 70)
    print("Cleaning HTML Source Files")
    print("=" * 70)

    # Get all HTML files except test files
    html_files = [f for f in SOURCE_DIR.glob("*.html")
                  if f.name not in ['test-simple.html']]

    print(f"\nFound {len(html_files)} HTML files to clean")

    for html_file in html_files:
        output_file = OUTPUT_DIR / html_file.name
        try:
            clean_html_file(html_file, output_file)
        except Exception as e:
            print(f"  ERROR: {e}")

    print("\n" + "=" * 70)
    print(f"Cleaned files saved to: {OUTPUT_DIR}")
    print("=" * 70)
    print("\nNext steps:")
    print("1. Check the cleaned files in public/source-content/astera-labs/cleaned/")
    print("2. If they look good, move them to replace the originals:")
    print("   - Or update contentPath in astera-sources.json to point to /cleaned/ folder")

if __name__ == "__main__":
    main()
