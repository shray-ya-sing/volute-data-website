"""
Pinecone Vector Database Service for Article Search
Manages storage and retrieval of article embeddings
"""
import logging
from typing import List, Dict, Any, Optional
from pinecone import Pinecone, ServerlessSpec
import time

logger = logging.getLogger(__name__)

class PineconeArticleDB:
    """Pinecone vector database service for storing and searching article embeddings"""
    
    def __init__(self, api_key: str = None, environment: str = "us-east-1"):
        """
        Initialize Pinecone client
        
        Args:
            api_key: Pinecone API key (if None, uses hardcoded key)
            environment: Pinecone environment/region
        """
        # Hardcoded API key (from your original code)
        self.api_key = api_key
        
        logger.info(f"Pinecone API key: {'SET' if self.api_key else 'NOT SET'}")
        
        if not self.api_key:
            logger.error("Pinecone API key is not available!")
            raise ValueError("Pinecone API key is required.")
        
        self.environment = environment
        self.index_name = "article-search"  # Index name for article embeddings
        self.index = None
        
        try:
            # Initialize Pinecone client
            self.pc = Pinecone(api_key=self.api_key)
            logger.info("Pinecone client initialized successfully")
            
            # Initialize index
            self._initialize_index()
            
        except Exception as e:
            logger.error(f"Failed to initialize Pinecone client: {e}")
            raise
    
    def _initialize_index(self, dimension: int = 1024):
        """Initialize or connect to Pinecone index"""
        try:
            # Check if index exists
            existing_indexes = self.pc.list_indexes()
            index_names = [idx.name for idx in existing_indexes.indexes] if existing_indexes.indexes else []
            
            if self.index_name not in index_names:
                # Create new index
                logger.info(f"Creating new Pinecone index: {self.index_name}")
                self.pc.create_index(
                    name=self.index_name,
                    dimension=dimension,
                    metric="cosine",
                    spec=ServerlessSpec(
                        cloud="aws",
                        region=self.environment
                    )
                )
                # Wait for index to be ready
                while not self.pc.describe_index(self.index_name).status['ready']:
                    time.sleep(1)
                logger.info(f"Index {self.index_name} created successfully")
            else:
                logger.info(f"Using existing index: {self.index_name}")
            
            # Connect to index
            self.index = self.pc.Index(self.index_name)
            logger.info(f"Connected to Pinecone index: {self.index_name}")
            
        except Exception as e:
            logger.error(f"Error initializing Pinecone index: {e}")
            raise
    
    def upsert_articles(self, articles_data: List[Dict]) -> bool:
        """
        Store article embeddings in Pinecone
        
        Args:
            articles_data: List of dictionaries containing:
                - embedding: List[float] - the embedding vector
                - article_id: str - unique identifier
                - metadata: Dict - article metadata (title, url, date, etc.)
            
        Returns:
            True if successful, False otherwise
        """
        if not self.index:
            logger.error("Pinecone index not initialized")
            return False
        
        try:
            vectors = []
            for article_data in articles_data:
                embedding = article_data.get('embedding', [])
                article_id = article_data.get('article_id', '')
                metadata = article_data.get('metadata', {})
                
                if not embedding or not article_id:
                    logger.warning(f"Skipping article with missing embedding or ID")
                    continue
                
                # Prepare metadata (Pinecone has limitations on metadata)
                # Convert all values to appropriate types
                pinecone_metadata = {
                    'url': str(metadata.get('url', '')),
                    'title': str(metadata.get('title', ''))[:512],  # Limit title length
                    'publish_date': str(metadata.get('publish_date', '')),
                    'source': str(metadata.get('source', '')),
                    'authors': str(metadata.get('authors', []))[:200],  # Convert list to string
                    'text_preview': str(metadata.get('text', ''))[:500]  # Store preview of text
                }
                
                vectors.append({
                    'id': article_id,
                    'values': embedding,
                    'metadata': pinecone_metadata
                })
            
            if not vectors:
                logger.warning("No valid vectors to upsert")
                return False
            
            # Upsert vectors in batches
            batch_size = 100
            for i in range(0, len(vectors), batch_size):
                batch = vectors[i:i + batch_size]
                self.index.upsert(vectors=batch)
                logger.info(f"Upserted batch {i//batch_size + 1}: {len(batch)} articles")
            
            logger.info(f"Successfully upserted {len(vectors)} article embeddings to Pinecone")
            return True
            
        except Exception as e:
            logger.error(f"Error upserting articles to Pinecone: {e}")
            return False
    
    def search_articles(self, query_embedding: List[float], top_k: int = 10, 
                       filter_dict: Dict = None) -> List[Dict]:
        """
        Search for similar articles using vector similarity
        
        Args:
            query_embedding: Query embedding vector
            top_k: Number of results to return
            filter_dict: Optional metadata filters (e.g., {'source': 'finance.yahoo.com'})
            
        Returns:
            List of similar articles with metadata and scores
        """
        if not self.index:
            logger.error("Pinecone index not initialized")
            return []
        
        try:
            # Perform vector search
            search_results = self.index.query(
                vector=query_embedding,
                top_k=top_k,
                include_metadata=True,
                filter=filter_dict if filter_dict else None
            )
            
            # Process results
            results = []
            for match in search_results.matches:
                result = {
                    'article_id': match.id,
                    'score': float(match.score),
                    'metadata': dict(match.metadata) if match.metadata else {}
                }
                results.append(result)
            
            logger.info(f"Found {len(results)} similar articles")
            return results
            
        except Exception as e:
            logger.error(f"Error searching Pinecone: {e}")
            return []
    
    def delete_article(self, article_id: str) -> bool:
        """
        Delete a specific article by ID
        
        Args:
            article_id: ID of the article to delete
            
        Returns:
            True if successful, False otherwise
        """
        if not self.index:
            logger.error("Pinecone index not initialized")
            return False
        
        try:
            self.index.delete(ids=[article_id])
            logger.info(f"Deleted article {article_id}")
            return True
        except Exception as e:
            logger.error(f"Error deleting article from Pinecone: {e}")
            return False
    
    def delete_by_source(self, source: str) -> bool:
        """
        Delete all articles from a specific source
        
        Args:
            source: Source domain to delete articles from
            
        Returns:
            True if successful, False otherwise
        """
        if not self.index:
            logger.error("Pinecone index not initialized")
            return False
        
        try:
            # Note: Pinecone delete by metadata filter is only available in some plans
            # This is a workaround using query + delete
            query_results = self.index.query(
                vector=[0] * 1024,  # Dummy vector
                top_k=10000,
                include_metadata=True,
                filter={'source': {'$eq': source}}
            )
            
            ids_to_delete = [match.id for match in query_results.matches]
            
            if ids_to_delete:
                self.index.delete(ids=ids_to_delete)
                logger.info(f"Deleted {len(ids_to_delete)} articles from source {source}")
                return True
            else:
                logger.info(f"No articles found for source {source}")
                return True
                
        except Exception as e:
            logger.error(f"Error deleting articles by source: {e}")
            return False
    
    def get_index_stats(self) -> Dict:
        """Get statistics about the Pinecone index"""
        if not self.index:
            return {}
        
        try:
            stats = self.index.describe_index_stats()
            return {
                'total_vector_count': stats.total_vector_count,
                'dimension': stats.dimension,
                'index_fullness': stats.index_fullness
            }
        except Exception as e:
            logger.error(f"Error getting index stats: {e}")
            return {}
    
    def clear_all_articles(self) -> bool:
        """Clear all articles from the index"""
        if not self.index:
            logger.error("Pinecone index not initialized")
            return False
        
        try:
            self.index.delete(delete_all=True)
            logger.info("Cleared all articles from Pinecone index")
            return True
        except Exception as e:
            logger.error(f"Error clearing Pinecone index: {e}")
            return False


# Global Pinecone service instance
_pinecone_service = None

def get_pinecone_article_db() -> PineconeArticleDB:
    """Get or create global Pinecone article database service"""
    global _pinecone_service
    if _pinecone_service is None:
        _pinecone_service = PineconeArticleDB()
    return _pinecone_service
