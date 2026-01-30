import json
from newspaper import Article, Config, ArticleException
from pathlib import Path

# 1. Setup Configuration (mimics a real browser to avoid blocks)
config = Config()
config.browser_user_agent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36'
config.request_timeout = 15

results = []
urls = r"C:\Users\shrey\volute-data-website\urls\urls.txt"
output_file = Path("C:\\Users\\shrey\\volute-data-website\\newspaper3k_scraped_text\\article_data.json")

# 2. Load URLs from your text file
try:
    with open(urls, 'r') as f:
        urls = [line.strip() for line in f if line.strip()]
except FileNotFoundError:
    print("Error: urls.txt not found.")
    urls = []

# 3. Process each URL
for url in urls:
    print(f"Processing: {url}")
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
                "source": url.split('/')[2], # extracts domain like 'finance.yahoo.com'
                "language": article.meta_lang,
                "description": article.meta_description
            }
        }
        results.append(article_data)
        
    except ArticleException as e:
        print(f" >>> Skipped {url} due to error: {e}")

# 4. Save all results to a single JSON file
with open(output_file, 'w', encoding='utf-8') as f:
    json.dump(results, f, ensure_ascii=False, indent=4)

print(f"\nSuccess! Extracted {len(results)} articles to article_data.json")