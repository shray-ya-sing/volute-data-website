import type { VercelRequest, VercelResponse } from '@vercel/node';

const VOYAGE_API_KEY = process.env.VOYAGE_API_KEY || 'pa-lkitG0Pwd7QpXkb7EUyATIlTGHY2aJ6oYHMvOydjfk7';
const PINECONE_API_KEY = process.env.PINECONE_API_KEY || 'pcsk_QEA8e_RNPvdrhcXJLZQnNCq6U3BSeNbpTS7VMLaE4VEmh9ZSUUwgP5j23yu5psPbWBoo3';
const PINECONE_INDEX_HOST = process.env.PINECONE_INDEX_HOST || 'https://article-search-qcaf0p8.svc.aped-4627-b74a.pinecone.io';

interface ArticleResult {
  articleId: string;
  score: number;
  originalScore?: number;
  reranked?: boolean;
  metadata: {
    url: string;
    title: string;
    publish_date?: string;
    source?: string;
    authors?: string;
    text_preview?: string;
  };
}

interface SearchResponse {
  query: string;
  results: ArticleResult[];
  count: number;
  meta: {
    reranked: boolean;
    searchTopK: number;
    finalTopK: number;
  };
}

/**
 * Generate query embedding using Voyage Finance-2
 */
async function generateQueryEmbedding(query: string): Promise<number[]> {
  const response = await fetch('https://api.voyageai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${VOYAGE_API_KEY}`,
    },
    body: JSON.stringify({
      input: [query],
      model: 'voyage-finance-2',
      input_type: 'query',
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Voyage API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  return data.data[0].embedding;
}

/**
 * Search Pinecone for similar articles
 */
async function searchPinecone(
  queryEmbedding: number[],
  topK: number,
  filterSource?: string
): Promise<any[]> {
  const requestBody: any = {
    vector: queryEmbedding,
    topK,
    includeMetadata: true,
  };

  // Add filter if source is specified
  if (filterSource) {
    requestBody.filter = {
      source: { $eq: filterSource },
    };
  }

  const response = await fetch(`${PINECONE_INDEX_HOST}/query`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Api-Key': PINECONE_API_KEY,
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Pinecone API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  return data.matches || [];
}

/**
 * Rerank results using Voyage rerank-2.5-lite
 */
async function rerankResults(
  query: string,
  matches: any[],
  topK: number
): Promise<ArticleResult[]> {
  // Prepare documents for reranking
  const documents = matches.map((match: any) => {
    const metadata = match.metadata || {};
    return `${metadata.title || ''}\n\n${metadata.text_preview || ''}`;
  });

  const response = await fetch('https://api.voyageai.com/v1/rerank', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${VOYAGE_API_KEY}`,
    },
    body: JSON.stringify({
      query,
      documents,
      model: 'rerank-2.5-lite',
      top_k: topK,
    }),
  });

  if (!response.ok) {
    console.warn('Reranking failed, falling back to original results');
    // Return original results without reranking
    return matches.slice(0, topK).map((match: any) => ({
      articleId: match.id,
      score: match.score,
      metadata: match.metadata || {},
      reranked: false,
    }));
  }

  const rerankData = await response.json();

  // Map reranked results back to original matches
  return rerankData.data.map((result: any) => {
    const originalMatch = matches[result.index];
    return {
      articleId: originalMatch.id,
      score: result.relevance_score,
      originalScore: originalMatch.score,
      metadata: originalMatch.metadata || {},
      reranked: true,
    };
  });
}

/**
 * Main search function
 */
async function vectorSearch(
  query: string,
  topK: number = 10,
  useReranking: boolean = true,
  filterSource?: string
): Promise<SearchResponse> {
  // Step 1: Generate query embedding
  console.log(`Generating embedding for query: "${query}"`);
  const queryEmbedding = await generateQueryEmbedding(query);
  console.log(`Created embedding with ${queryEmbedding.length} dimensions`);

  // Step 2: Search Pinecone
  // Request more results if we're going to rerank
  const searchTopK = useReranking ? topK * 3 : topK;
  console.log(`Searching Pinecone (topK=${searchTopK})...`);
  
  const matches = await searchPinecone(queryEmbedding, searchTopK, filterSource);
  console.log(`Found ${matches.length} initial results`);

  if (matches.length === 0) {
    return {
      query,
      results: [],
      count: 0,
      meta: {
        reranked: false,
        searchTopK,
        finalTopK: topK,
      },
    };
  }

  // Step 3: Optionally rerank results
  let finalResults: ArticleResult[];

  if (useReranking && matches.length > 1) {
    console.log('Reranking results...');
    finalResults = await rerankResults(query, matches, topK);
    console.log(`Reranked to ${finalResults.length} results`);
  } else {
    console.log('Skipping reranking');
    finalResults = matches.slice(0, topK).map((match: any) => ({
      articleId: match.id,
      score: match.score,
      metadata: match.metadata || {},
      reranked: false,
    }));
  }

  return {
    query,
    results: finalResults,
    count: finalResults.length,
    meta: {
      reranked: useReranking && matches.length > 1,
      searchTopK,
      finalTopK: topK,
    },
  };
}

/**
 * Vercel API handler
 */
export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Parse parameters from either POST body or GET query
    const query = req.method === 'POST' 
      ? req.body.query 
      : req.query.q as string;
    
    const topK = parseInt(
      (req.method === 'POST' ? req.body.topK : req.query.topK) as string || '10'
    );
    
    const useReranking = req.method === 'POST'
      ? req.body.useReranking !== false  // Default true
      : req.query.rerank !== 'false';    // Default true
    
    const filterSource = req.method === 'POST'
      ? req.body.filterSource
      : req.query.source as string;

    // Validate query
    if (!query || typeof query !== 'string') {
      return res.status(400).json({ error: 'Query parameter is required' });
    }

    if (query.trim().length === 0) {
      return res.status(400).json({ error: 'Query cannot be empty' });
    }

    // Validate topK
    if (topK < 1 || topK > 100) {
      return res.status(400).json({ 
        error: 'topK must be between 1 and 100' 
      });
    }

    // Perform search
    console.log(`Search request: query="${query}", topK=${topK}, rerank=${useReranking}`);
    const searchResults = await vectorSearch(query, topK, useReranking, filterSource);

    return res.status(200).json(searchResults);

  } catch (error: any) {
    console.error('Search error:', error);
    return res.status(500).json({
      error: 'Search failed',
      message: error.message,
    });
  }
}
