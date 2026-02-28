"""
Article Indexing Script
Loads articles from JSON and indexes them into Pinecone with Voyage Finance-2 embeddings
"""
import json
import logging
from multiprocessing import process
import os
from typing import List, Dict
import sys
from voyage_text_embeddings import VoyageTextEmbeddingsService
from pinecone_article_db import PineconeArticleDB


# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def load_articles(json_file: str) -> List[Dict]:
    """Load articles from JSON file"""
    try:
        logger.info(f"Loading articles from {json_file}")
        with open(json_file, 'r', encoding='utf-8') as f:
            articles = json.load(f)
        logger.info(f"Loaded {len(articles)} articles")
        return articles
    except Exception as e:
        logger.error(f"Error loading articles: {e}")
        return []

def prepare_article_text(article: Dict) -> str:
    """
    Prepare article text for embedding
    Combines title and text content
    """
    title = article.get('title', '')
    text = article.get('text', '')
    
    # Combine title and text for better semantic representation
    # Format: "Title: {title}\n\n{text}"
    combined_text = f"Title: {title}\n\n{text}"
    
    return combined_text

def create_article_id(article: Dict, index: int) -> str:
    """Create a unique ID for the article"""
    # Use URL as base for ID, or fall back to index
    url = article.get('url', '')
    if url:
        # Create a clean ID from URL
        article_id = url.replace('https://', '').replace('http://', '').replace('/', '_').replace('.', '_')
        # Truncate if too long
        if len(article_id) > 100:
            article_id = article_id[:100]
        return article_id
    else:
        return f"article_{index}"
    
def is_valid_article(article: Dict, min_text_length: int = 100) -> bool:
    """
    Check if article has valid content worth indexing
    
    Args:
        article: Article dictionary
        min_text_length: Minimum text length to consider valid (default: 100 chars)
    
    Returns:
        bool: True if article is valid, False otherwise
    """
    text = article.get('text', '').strip()
    title = article.get('title', '').strip()
    
    # Check if text is empty or too short
    if not text or len(text) < min_text_length:
        return False
    
    # Optional: Also require a title
    # if not title:
    #     return False
    
    return True

def index_articles(articles: List[Dict], clear_existing: bool = False, min_text_length: int = 100):
    """
    Index articles into Pinecone with Voyage Finance-2 embeddings
    
    Args:
        articles: List of article dictionaries
        clear_existing: Whether to clear existing articles before indexing
        min_text_length: Minimum text length to consider valid (default: 100 chars)
    """
    logger.info("=" * 60)
    logger.info("ARTICLE INDEXING PROCESS")
    logger.info("=" * 60)
    
    # Filter out invalid articles
    logger.info(f"\n1. Filtering articles...")
    logger.info(f"   Total articles loaded: {len(articles)}")
    
    valid_articles = [a for a in articles if is_valid_article(a, min_text_length)]
    invalid_count = len(articles) - len(valid_articles)
    
    logger.info(f"   Valid articles: {len(valid_articles)}")
    logger.info(f"   Skipped (empty/short text): {invalid_count}")
    
    if invalid_count > 0:
        logger.info(f"\n   Examples of skipped articles:")
        skipped_examples = [a for a in articles if not is_valid_article(a, min_text_length)][:3]
        for article in skipped_examples:
            logger.info(f"     - {article.get('url', 'No URL')[:80]}")
            logger.info(f"       Text length: {len(article.get('text', ''))} chars")
    
    if not valid_articles:
        logger.error("No valid articles to index after filtering!")
        return
    
    # Use valid_articles instead of articles from here on
    articles = valid_articles
    
    # Initialize services
    logger.info("\n2. Initializing services...")
    try:
        voyage_service = VoyageTextEmbeddingsService( api_key=os.environ.get('VOYAGE_API_KEY'))
        pinecone_db = PineconeArticleDB( api_key=os.environ.get('PINECONE_API_KEY'))
    except Exception as e:
        logger.error(f"Failed to initialize services: {e}")
        return
    
    # Clear existing data if requested
    if clear_existing:
        logger.info("\n3. Clearing existing articles from database...")
        pinecone_db.clear_all_articles()
        logger.info("Existing articles cleared")
    else:
        logger.info("\n3. Keeping existing articles in database")
    
    # Show initial stats
    stats = pinecone_db.get_index_stats()
    logger.info(f"\nCurrent database stats:")
    logger.info(f"  - Total vectors: {stats.get('total_vector_count', 0)}")
    logger.info(f"  - Dimension: {stats.get('dimension', 0)}")
    logger.info(f"  - Index fullness: {stats.get('index_fullness', 0):.2%}")
    
    # Prepare texts for embedding
    logger.info(f"\n4. Preparing {len(articles)} articles for embedding...")
    texts = []
    article_metadata = []
    
    for i, article in enumerate(articles):
        # Prepare text
        article_text = prepare_article_text(article)
        texts.append(article_text)
        
        # Prepare metadata
        metadata = {
            'article_id': create_article_id(article, i),
            'url': article.get('url', ''),
            'title': article.get('title', ''),
            'publish_date': article.get('publish_date', ''),
            'authors': article.get('authors', []),
            'source': article.get('metadata', {}).get('source', ''),
            'ticker': article.get('metadata', {}).get('ticker', ''),  # Added ticker
            'source_file': article.get('metadata', {}).get('source_file', ''),  # Added source_file
            'language': article.get('metadata', {}).get('language', ''),
            'text': article.get('text', '')[:1000]  # Truncate text in metadata to save space
        }
        article_metadata.append(metadata)
    
    logger.info(f"Prepared {len(texts)} texts for embedding")
    
    # Create embeddings in batch
    logger.info(f"\n5. Creating embeddings with Voyage Finance-2...")
    try:
        embedding_results = voyage_service.create_batch_embeddings(
            texts=texts,
            input_type="document"  # We're indexing documents
        )
        logger.info(f"Created {len(embedding_results)} embeddings")
    except Exception as e:
        logger.error(f"Error creating embeddings: {e}")
        return
    
    # Prepare data for Pinecone
    logger.info(f"\n6. Preparing data for Pinecone...")
    pinecone_data = []
    
    for i, embedding_result in enumerate(embedding_results):
        text_index = embedding_result.get('text_index', i)
        metadata = article_metadata[text_index]
        
        pinecone_data.append({
            'article_id': metadata['article_id'],
            'embedding': embedding_result['embedding'],
            'metadata': metadata
        })
    
    logger.info(f"Prepared {len(pinecone_data)} articles for indexing")
    
    # Upsert to Pinecone
    logger.info(f"\n7. Uploading to Pinecone...")
    success = pinecone_db.upsert_articles(pinecone_data)
    
    if success:
        logger.info("✅ Successfully indexed all articles!")
    else:
        logger.error("❌ Failed to index articles")
        return
    
    # Show final stats
    stats = pinecone_db.get_index_stats()
    logger.info(f"\n8. Final database stats:")
    logger.info(f"  - Total vectors: {stats.get('total_vector_count', 0)}")
    logger.info(f"  - Dimension: {stats.get('dimension', 0)}")
    logger.info(f"  - Index fullness: {stats.get('index_fullness', 0):.2%}")
    
    logger.info("\n" + "=" * 60)
    logger.info("INDEXING COMPLETE!")
    logger.info("=" * 60)

def main():
    """Main function"""
    # Check command line arguments
    if len(sys.argv) < 2:
        print("Usage: python index_articles.py <json_file> [--clear] [--min-length=N]")
        print("Example: python index_articles.py article_data.json")
        print("Example: python index_articles.py article_data.json --clear")
        print("Example: python index_articles.py article_data.json --clear --min-length=200")
        sys.exit(1)
    
    json_file = sys.argv[1]
    clear_existing = '--clear' in sys.argv
    
    # Parse min-length argument
    min_text_length = 100  # default
    for arg in sys.argv:
        if arg.startswith('--min-length='):
            try:
                min_text_length = int(arg.split('=')[1])
                logger.info(f"Using minimum text length: {min_text_length} characters")
            except ValueError:
                logger.warning(f"Invalid --min-length value, using default: 100")
    
    # Load articles
    articles = load_articles(json_file)
    
    if not articles:
        logger.error("No articles to index")
        sys.exit(1)
    
    # Index articles
    index_articles(articles, clear_existing=clear_existing, min_text_length=min_text_length)

if __name__ == "__main__":
    main()
