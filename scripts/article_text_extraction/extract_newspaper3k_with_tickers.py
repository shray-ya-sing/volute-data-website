import json
from newspaper import Article, Config, ArticleException
from pathlib import Path

# 1. Setup Configuration (mimics a real browser to avoid blocks)
config = Config()
config.browser_user_agent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36'
config.request_timeout = 15

results = []

# 2. Define paths (relative to script location)
script_dir = Path(__file__).parent
urls_base_dir = script_dir.parent.parent / "urls"  # root/urls
output_file = script_dir.parent.parent / "newspaper3k_scraped_text" / "article_data_with_tickers.json"

# Ensure output directory exists
output_file.parent.mkdir(parents=True, exist_ok=True)

# 3. Loop through each ticker directory
if not urls_base_dir.exists():
    print(f"Error: {urls_base_dir} not found.")
    exit(1)

ticker_dirs = [d for d in urls_base_dir.iterdir() if d.is_dir()]

if not ticker_dirs:
    print("No ticker directories found!")
    exit(1)

print(f"Found {len(ticker_dirs)} ticker directories\n")

# 4. Process each ticker directory
for ticker_dir in ticker_dirs:
    ticker = ticker_dir.name
    print(f"\n{'='*60}")
    print(f"Processing ticker: {ticker}")
    print(f"{'='*60}")
    
    # Find all .txt files in this ticker directory
    txt_files = list(ticker_dir.glob("*.txt"))
    
    if not txt_files:
        print(f"No .txt files found for {ticker}")
        continue
    
    # 5. Process each .txt file (ari-.txt, sophie.txt, etc.)
    for txt_file in txt_files:
        source_file = txt_file.stem  # e.g., "ari-" or "sophie"
        print(f"\n  Reading URLs from: {txt_file.name}")
        
        try:
            with open(txt_file, 'r', encoding='utf-8') as f:
                urls = [line.strip() for line in f if line.strip()]
        except Exception as e:
            print(f"  Error reading {txt_file.name}: {e}")
            continue
        
        print(f"  Found {len(urls)} URLs")
        
        # 6. Process each URL
        for idx, url in enumerate(urls, 1):
            print(f"    [{idx}/{len(urls)}] Processing: {url[:80]}...")
            article = Article(url, config=config)
            
            try:
                article.download()
                article.parse()
                # Optional: article.nlp() # Uncomment if you want 'summary' and 'keywords'
                
                # Structure the data for your Vector Database
                article_data = {
                    "url": url,
                    "title": article.title,
                    "text": article.text,
                    "authors": article.authors,
                    "publish_date": str(article.publish_date) if article.publish_date else None,
                    "top_image": article.top_image,
                    "metadata": {
                        "ticker": ticker,  # Add ticker to metadata
                        "source": url.split('/')[2] if len(url.split('/')) > 2 else None,  # extracts domain
                        "source_file": source_file,  # which txt file it came from (ari-, sophie, etc.)
                        "language": article.meta_lang,
                        "description": article.meta_description
                    }
                }
                results.append(article_data)
                print(f"    ✓ Success")
                
            except ArticleException as e:
                print(f"    ✗ Skipped due to error: {e}")
            except Exception as e:
                print(f"    ✗ Unexpected error: {e}")

# 7. Save all results to a single JSON file
print(f"\n{'='*60}")
print("Saving results...")
with open(output_file, 'w', encoding='utf-8') as f:
    json.dump(results, f, ensure_ascii=False, indent=4)

print(f"\n✓ Success! Extracted {len(results)} articles to:")
print(f"  {output_file}")
print(f"\nBreakdown by ticker:")

# 8. Print summary statistics
ticker_counts = {}
for result in results:
    ticker = result['metadata']['ticker']
    ticker_counts[ticker] = ticker_counts.get(ticker, 0) + 1

for ticker, count in sorted(ticker_counts.items()):
    print(f"  {ticker}: {count} articles")