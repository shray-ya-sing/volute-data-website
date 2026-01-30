import os
import json
from newspaper import Article

# Configuration
SOURCE_DIR = r"C:\Users\shrey\volute-data-website\clean-articles"
OUTPUT_FILE = "articles_data.json"

def process_articles():
    all_data = []
    
    # Get all .html files in the directory
    files = [f for f in os.listdir(SOURCE_DIR) if f.endswith('.html')]
    print(f"Found {len(files)} articles. Starting extraction...")

    for filename in files:
        file_path = os.path.join(SOURCE_DIR, filename)
        
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                html_content = f.read()

            # Initialize Newspaper3k Article with a dummy URL
            # We use set_html to parse your local content
            article = Article(url='')
            article.set_html(html_content)
            article.parse()

            # Prepare data object
            article_entry = {
                "source_file": filename,  # Your 'URL' metadata
                "title": article.title,
                "text": article.text,
                "authors": article.authors,
                "top_image": article.top_image,
                "publish_date": str(article.publish_date) if article.publish_date else None
            }
            
            all_data.append(article_entry)
            print(f"✅ Processed: {filename}")

        except Exception as e:
            print(f"❌ Failed to process {filename}: {e}")

    # Save to JSON
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(all_data, f, indent=4)
    
    print(f"\nSuccess! Data saved to {OUTPUT_FILE}")

if __name__ == "__main__":
    process_articles()