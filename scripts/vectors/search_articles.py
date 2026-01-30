"""
Article Search Script
Search through indexed articles using semantic search with reranking
"""
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

def search_articles(query: str, top_k: int = 10, use_reranking: bool = True, 
                   filter_source: str = None):
    """
    Search for articles using semantic search
    
    Args:
        query: Search query text
        top_k: Number of results to return (before reranking)
        use_reranking: Whether to use reranking for better results
        filter_source: Optional filter by source domain
    """
    logger.info("=" * 60)
    logger.info(f"SEARCHING: {query}")
    logger.info("=" * 60)
    
    # Initialize services
    logger.info("\n1. Initializing services...")
    try:
        voyage_service = VoyageTextEmbeddingsService()
        pinecone_db = PineconeArticleDB()
    except Exception as e:
        logger.error(f"Failed to initialize services: {e}")
        return []
    
    # Create query embedding
    logger.info(f"\n2. Creating query embedding...")
    try:
        query_embedding = voyage_service.create_text_embedding(
            text=query,
            input_type="query"  # Important: use "query" for search queries
        )
        logger.info(f"Created query embedding with {len(query_embedding)} dimensions")
    except Exception as e:
        logger.error(f"Error creating query embedding: {e}")
        return []
    
    # Prepare filter if specified
    filter_dict = None
    if filter_source:
        filter_dict = {'source': {'$eq': filter_source}}
        logger.info(f"\n3. Filtering by source: {filter_source}")
    else:
        logger.info(f"\n3. No source filter applied")
    
    # Search Pinecone
    # Request more results if we're going to rerank
    search_top_k = top_k * 3 if use_reranking else top_k
    
    logger.info(f"\n4. Searching Pinecone (top_k={search_top_k})...")
    try:
        results = pinecone_db.search_articles(
            query_embedding=query_embedding,
            top_k=search_top_k,
            filter_dict=filter_dict
        )
        logger.info(f"Found {len(results)} initial results")
    except Exception as e:
        logger.error(f"Error searching Pinecone: {e}")
        return []
    
    if not results:
        logger.warning("No results found")
        return []
    
    # Rerank results if requested
    if use_reranking and len(results) > 1:
        logger.info(f"\n5. Reranking results...")
        try:
            # Extract text from results for reranking
            documents = []
            for result in results:
                metadata = result.get('metadata', {})
                # Create document text from title and text preview
                doc_text = f"{metadata.get('title', '')}\n\n{metadata.get('text_preview', '')}"
                documents.append(doc_text)
            
            # Rerank
            reranked = voyage_service.rerank_results(
                query=query,
                documents=documents,
                top_k=top_k  # Return only top_k after reranking
            )
            
            # Map reranked results back to original results
            final_results = []
            for rerank_result in reranked:
                original_index = rerank_result['index']
                result = results[original_index].copy()
                result['rerank_score'] = rerank_result['relevance_score']
                result['original_score'] = result['score']
                # Update score to rerank score
                result['score'] = rerank_result['relevance_score']
                final_results.append(result)
            
            logger.info(f"Reranking complete: {len(final_results)} results")
            results = final_results
            
        except Exception as e:
            logger.error(f"Error during reranking: {e}")
            logger.info("Falling back to original vector search results")
            results = results[:top_k]
    else:
        logger.info(f"\n5. Skipping reranking (disabled or only 1 result)")
        results = results[:top_k]
    
    # Display results
    logger.info("\n" + "=" * 60)
    logger.info("SEARCH RESULTS")
    logger.info("=" * 60)
    
    for i, result in enumerate(results, 1):
        metadata = result.get('metadata', {})
        score = result.get('score', 0.0)
        
        print(f"\n{i}. {metadata.get('title', 'Untitled')}")
        print(f"   Score: {score:.4f}", end='')
        
        if 'rerank_score' in result:
            print(f" (reranked from {result['original_score']:.4f})")
        else:
            print()
        
        print(f"   Source: {metadata.get('source', 'Unknown')}")
        print(f"   Date: {metadata.get('publish_date', 'Unknown')}")
        print(f"   URL: {metadata.get('url', 'No URL')}")
        
        # Show text preview
        text_preview = metadata.get('text_preview', '')
        if text_preview:
            # Truncate if too long
            if len(text_preview) > 200:
                text_preview = text_preview[:200] + "..."
            print(f"   Preview: {text_preview}")
    
    print("\n" + "=" * 60)
    logger.info(f"Returned {len(results)} results")
    
    return results

def main():
    """Main function"""
    # Check command line arguments
    if len(sys.argv) < 2:
        print("Usage: python search_articles.py <query> [options]")
        print("\nOptions:")
        print("  --top-k <n>         Number of results to return (default: 10)")
        print("  --no-rerank         Disable reranking")
        print("  --source <domain>   Filter by source domain")
        print("\nExamples:")
        print("  python search_articles.py \"BrightSpring acquisition\"")
        print("  python search_articles.py \"neuroscience clinical trials\" --top-k 5")
        print("  python search_articles.py \"IPO\" --source finance.yahoo.com")
        sys.exit(1)
    
    # Parse arguments
    query = sys.argv[1]
    top_k = 10
    use_reranking = True
    filter_source = None
    
    i = 2
    while i < len(sys.argv):
        if sys.argv[i] == '--top-k' and i + 1 < len(sys.argv):
            top_k = int(sys.argv[i + 1])
            i += 2
        elif sys.argv[i] == '--no-rerank':
            use_reranking = False
            i += 1
        elif sys.argv[i] == '--source' and i + 1 < len(sys.argv):
            filter_source = sys.argv[i + 1]
            i += 2
        else:
            i += 1
    
    # Perform search
    results = search_articles(
        query=query,
        top_k=top_k,
        use_reranking=use_reranking,
        filter_source=filter_source
    )
    
    if not results:
        print("\n❌ No results found")
        sys.exit(1)
    
    print(f"\n✅ Found {len(results)} relevant articles")

if __name__ == "__main__":
    main()
