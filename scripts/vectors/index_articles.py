"""
Article Indexing Script
Loads articles from JSON and indexes them into Pinecone with Voyage Finance-2 embeddings
"""
import json
import logging
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

def index_articles(articles: List[Dict], clear_existing: bool = False):
    """
    Index articles into Pinecone with Voyage Finance-2 embeddings
    
    Args:
        articles: List of article dictionaries
        clear_existing: Whether to clear existing articles before indexing
    """
    logger.info("=" * 60)
    logger.info("ARTICLE INDEXING PROCESS")
    logger.info("=" * 60)
    
    # Initialize services
    logger.info("\n1. Initializing services...")
    try:
        voyage_service = VoyageTextEmbeddingsService()
        pinecone_db = PineconeArticleDB()
    except Exception as e:
        logger.error(f"Failed to initialize services: {e}")
        return
    
    # Clear existing data if requested
    if clear_existing:
        logger.info("\n2. Clearing existing articles from database...")
        pinecone_db.clear_all_articles()
        logger.info("Existing articles cleared")
    else:
        logger.info("\n2. Keeping existing articles in database")
    
    # Show initial stats
    stats = pinecone_db.get_index_stats()
    logger.info(f"\nCurrent database stats:")
    logger.info(f"  - Total vectors: {stats.get('total_vector_count', 0)}")
    logger.info(f"  - Dimension: {stats.get('dimension', 0)}")
    logger.info(f"  - Index fullness: {stats.get('index_fullness', 0):.2%}")
    
    # Prepare texts for embedding
    logger.info(f"\n3. Preparing {len(articles)} articles for embedding...")
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
            'language': article.get('metadata', {}).get('language', ''),
            'text': article.get('text', '')
        }
        article_metadata.append(metadata)
    
    logger.info(f"Prepared {len(texts)} texts for embedding")
    
    # Create embeddings in batch
    logger.info(f"\n4. Creating embeddings with Voyage Finance-2...")
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
    logger.info(f"\n5. Preparing data for Pinecone...")
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
    logger.info(f"\n6. Uploading to Pinecone...")
    success = pinecone_db.upsert_articles(pinecone_data)
    
    if success:
        logger.info("✅ Successfully indexed all articles!")
    else:
        logger.error("❌ Failed to index articles")
        return
    
    # Show final stats
    stats = pinecone_db.get_index_stats()
    logger.info(f"\n7. Final database stats:")
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
        print("Usage: python index_articles.py <json_file> [--clear]")
        print("Example: python index_articles.py article_data.json")
        print("Example: python index_articles.py article_data.json --clear")
        sys.exit(1)
    
    json_file = sys.argv[1]
    clear_existing = '--clear' in sys.argv
    
    # Load articles
    articles = load_articles(json_file)
    
    if not articles:
        logger.error("No articles to index")
        sys.exit(1)
    
    # Index articles
    index_articles(articles, clear_existing=clear_existing)

if __name__ == "__main__":
    main()
