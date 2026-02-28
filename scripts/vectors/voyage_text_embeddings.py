"""
Voyage Text Embeddings Service for Article Search
Uses Voyage Finance-2 model for financial text embeddings
"""
import logging
from typing import List, Dict, Any, Optional
import voyageai
import time

logger = logging.getLogger(__name__)

class VoyageTextEmbeddingsService:
    """Service for creating text embeddings using VoyageAI Finance-2 model"""
    
    # Conservative batch size to stay under 120k token limit
    # Average article ~1000-2000 tokens, so 32 texts = ~32k-64k tokens (safe margin)
    DEFAULT_BATCH_SIZE = 32  # Reduced from 128 to avoid token limits
    MAX_BATCH_SIZE = 128
    
    # Rate limiting
    MIN_BATCH_DELAY = 0.5  # Minimum delay between batches (seconds)
    
    def __init__(self, api_key: str = None, batch_size: int = None):
        """
        Initialize VoyageAI client
        
        Args:
            api_key: VoyageAI API key (if None, uses hardcoded key)
            batch_size: Number of texts to process in one batch (default: 32)
        """
        # Hardcoded API key (from your original code)
        self.api_key = api_key
        
        if not self.api_key:
            raise ValueError("VoyageAI API key is required.")
        
        # Set batch size with validation
        self.batch_size = batch_size or self.DEFAULT_BATCH_SIZE
        if self.batch_size > self.MAX_BATCH_SIZE:
            logger.warning(f"Batch size {self.batch_size} exceeds maximum {self.MAX_BATCH_SIZE}, using maximum")
            self.batch_size = self.MAX_BATCH_SIZE
        elif self.batch_size < 1:
            logger.warning(f"Invalid batch size {self.batch_size}, using default {self.DEFAULT_BATCH_SIZE}")
            self.batch_size = self.DEFAULT_BATCH_SIZE
        
        logger.info(f"VoyageAI API key: {'SET' if self.api_key else 'NOT SET'}")
        logger.info(f"Batch size configured: {self.batch_size}")
        
        try:
            self.client = voyageai.Client(api_key=self.api_key)
            logger.info("VoyageAI client initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize VoyageAI client: {e}")
            raise
    
    def estimate_token_count(self, text: str) -> int:
        """
        Rough estimate of token count (1 token ≈ 4 characters for English)
        
        Args:
            text: Input text
            
        Returns:
            Estimated token count
        """
        return len(text) // 4
    
    def create_text_embedding(self, text: str, input_type: str = "document") -> List[float]:
        """
        Create text embedding using Voyage Finance-2 model
        
        Args:
            text: Input text to embed
            input_type: Either "document" (for indexing) or "query" (for search)
            
        Returns:
            List of embedding values (1024 dimensions)
        """
        try:
            if not text or not text.strip():
                logger.warning("Empty text provided for embedding")
                return []
            
            logger.debug(f"Creating {input_type} embedding for text: '{text[:100]}...'")
            
            result = self.client.embed(
                texts=[text],
                model="voyage-finance-2",
                input_type=input_type,
                truncation=True  # Truncate text if it exceeds model's max length
            )
            
            if result and result.embeddings and len(result.embeddings) > 0:
                embedding = result.embeddings[0]
                logger.debug(f"Created embedding with {len(embedding)} dimensions")
                return embedding
            else:
                logger.error("No embedding returned from VoyageAI")
                return []
                
        except Exception as e:
            logger.error(f"Error creating text embedding: {e}")
            raise
    
    def create_safe_batch(self, texts: List[str], max_tokens: int = 100000) -> List[List[str]]:
        """
        Split texts into safe batches that won't exceed token limits
        
        Args:
            texts: List of texts to batch
            max_tokens: Maximum tokens per batch (default: 100k, leaving margin from 120k limit)
            
        Returns:
            List of text batches
        """
        batches = []
        current_batch = []
        current_tokens = 0
        
        for text in texts:
            estimated_tokens = self.estimate_token_count(text)
            
            # If adding this text would exceed limit, start new batch
            if current_tokens + estimated_tokens > max_tokens and current_batch:
                batches.append(current_batch)
                current_batch = [text]
                current_tokens = estimated_tokens
            else:
                current_batch.append(text)
                current_tokens += estimated_tokens
            
            # Also enforce maximum batch size
            if len(current_batch) >= self.batch_size:
                batches.append(current_batch)
                current_batch = []
                current_tokens = 0
        
        # Add remaining texts
        if current_batch:
            batches.append(current_batch)
        
        return batches
    
    def create_batch_embeddings(self, texts: List[str], input_type: str = "document") -> List[Dict]:
        """
        Create embeddings for multiple texts in batches
        
        Args:
            texts: List of text strings to embed
            input_type: Either "document" (for indexing) or "query" (for search)
            
        Returns:
            List of dictionaries with embeddings and metadata
        """
        if not texts:
            logger.warning("No texts provided for batch embedding")
            return []
        
        logger.info(f"Creating embeddings for {len(texts)} texts using batch processing")
        logger.info(f"Target batch size: {self.batch_size}")
        
        # Create safe batches respecting token limits
        batches = self.create_safe_batch(texts)
        
        logger.info(f"Split into {len(batches)} batches to respect token limits")
        
        all_embeddings = []
        start_time = time.time()
        text_offset = 0  # Track original text index
        
        # Process each batch
        for batch_num, current_batch in enumerate(batches, 1):
            batch_start = time.time()
            
            logger.info(f"Processing batch {batch_num}/{len(batches)} "
                       f"({len(current_batch)} texts, "
                       f"~{sum(self.estimate_token_count(t) for t in current_batch):,} tokens)")
            
            try:
                # Create embeddings for batch
                result = self.client.embed(
                    texts=current_batch,
                    model="voyage-finance-2",
                    input_type=input_type,
                    truncation=True
                )
                
                if result and result.embeddings:
                    batch_embeddings = result.embeddings
                    
                    # Package embeddings with metadata
                    for j, embedding in enumerate(batch_embeddings):
                        all_embeddings.append({
                            'embedding': embedding,
                            'text_index': text_offset + j,
                            'text_preview': current_batch[j][:100] + "..." if len(current_batch[j]) > 100 else current_batch[j]
                        })
                    
                    batch_time = time.time() - batch_start
                    logger.info(f"✓ Batch {batch_num} completed in {batch_time:.2f}s "
                               f"({len(batch_embeddings)/batch_time:.2f} embeddings/sec)")
                else:
                    logger.error(f"No embeddings returned for batch {batch_num}")
                    
            except Exception as e:
                logger.error(f"Error processing batch {batch_num}: {e}")
                
                # Check if it's a token limit error
                if "max allowed tokens" in str(e).lower():
                    logger.warning(f"Token limit exceeded in batch {batch_num}, splitting into smaller batches")
                    
                    # Recursively process with smaller batches (half the size)
                    mid = len(current_batch) // 2
                    if mid > 0:
                        sub_batch_1 = current_batch[:mid]
                        sub_batch_2 = current_batch[mid:]
                        
                        logger.info(f"Splitting batch into {len(sub_batch_1)} and {len(sub_batch_2)} texts")
                        
                        # Process sub-batches
                        for sub_batch in [sub_batch_1, sub_batch_2]:
                            sub_results = self.create_batch_embeddings(sub_batch, input_type)
                            for result in sub_results:
                                result['text_index'] = text_offset + result['text_index']
                                all_embeddings.append(result)
                        
                        text_offset += len(current_batch)
                        continue
                
                # Fall back to individual processing for this batch
                logger.info(f"Falling back to individual processing for batch {batch_num}")
                for j, text in enumerate(current_batch):
                    try:
                        embedding = self.create_text_embedding(text, input_type)
                        if embedding:
                            all_embeddings.append({
                                'embedding': embedding,
                                'text_index': text_offset + j,
                                'text_preview': text[:100] + "..." if len(text) > 100 else text
                            })
                    except Exception as e2:
                        logger.error(f"Failed to create individual embedding for text {text_offset + j}: {e2}")
                        continue
            
            # Update text offset for next batch
            text_offset += len(current_batch)
            
            # Rate limiting: add delay between batches
            if batch_num < len(batches):  # Don't delay after last batch
                time.sleep(self.MIN_BATCH_DELAY)
        
        total_time = time.time() - start_time
        success_count = len(all_embeddings)
        
        logger.info("=" * 60)
        logger.info(f"✓ Batch processing completed!")
        logger.info(f"  - Success: {success_count}/{len(texts)} embeddings created")
        logger.info(f"  - Total time: {total_time:.2f}s")
        logger.info(f"  - Average speed: {success_count/total_time:.2f} embeddings/sec")
        logger.info("=" * 60)
        
        if success_count < len(texts):
            logger.warning(f"⚠ Some embeddings failed: {len(texts) - success_count} texts could not be processed")
        
        return all_embeddings
    
    def rerank_results(self, query: str, documents: List[str], top_k: int = None) -> List[Dict]:
        """
        Rerank search results using VoyageAI's reranker
        
        Args:
            query: The search query text
            documents: List of document texts to rerank
            top_k: Number of top results to return (None = return all)
            
        Returns:
            List of dictionaries with reranked results and scores
        """
        try:
            if not documents:
                return []
            
            logger.info(f"Reranking {len(documents)} documents for query: '{query[:50]}...'")
            
            # Use VoyageAI reranker
            reranking_result = self.client.rerank(
                query=query,
                documents=documents,
                model="rerank-2.5-lite",  # Fast and high quality reranker
                top_k=top_k,
                truncation=True
            )
            
            # Process results
            reranked = []
            for result in reranking_result.results:
                reranked.append({
                    'index': result.index,
                    'relevance_score': result.relevance_score,
                    'document': documents[result.index]
                })
            
            logger.info(f"Reranking completed: {len(reranked)} results")
            if reranked:
                logger.info(f"Top result score: {reranked[0]['relevance_score']:.4f}")
            
            return reranked
            
        except Exception as e:
            logger.error(f"Error during reranking: {e}")
            # Return documents in original order
            return [{'index': i, 'relevance_score': 0.0, 'document': doc} 
                    for i, doc in enumerate(documents)]
    
    def get_embedding_dimension(self) -> int:
        """Get the dimension of embeddings from Voyage Finance-2"""
        return 1024  # Voyage Finance-2 uses 1024 dimensions


# Global embeddings service instance
_embeddings_service = None

def get_voyage_text_service(batch_size: int = None) -> VoyageTextEmbeddingsService:
    """Get or create global VoyageAI text embeddings service"""
    global _embeddings_service
    if _embeddings_service is None:
        _embeddings_service = VoyageTextEmbeddingsService(batch_size=batch_size)
    return _embeddings_service