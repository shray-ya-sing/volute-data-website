import type { VercelRequest, VercelResponse } from '@vercel/node';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);
const VOYAGE_API_KEY = process.env.VOYAGE_API_KEY!;
const VOYAGE_API_URL = 'https://api.voyageai.com/v1/embeddings';
const VOYAGE_MODEL = 'voyage-3';

interface SearchResult {
  id: number;
  title: string;
  url: string;
  contentPreview: string;
  score: number;
  semanticScore?: number;
  fulltextScore?: number;
  wordCount: number;
}

/**
 * Generate query embedding using VoyageAI
 */
async function generateQueryEmbedding(query: string): Promise<number[]> {
  const response = await fetch(VOYAGE_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${VOYAGE_API_KEY}`,
    },
    body: JSON.stringify({
      input: [query],
      model: VOYAGE_MODEL,
      input_type: 'query', // For search queries
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`VoyageAI API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  return data.data[0].embedding;
}

/**
 * Hybrid search combining semantic (pgvector) and full-text search using RRF
 */
async function hybridSearch(
  query: string, 
  limit: number = 20, 
  semanticWeight: number = 0.6,
  fulltextWeight: number = 0.4
): Promise<SearchResult[]> {
  // Generate query embedding
  const queryEmbedding = await generateQueryEmbedding(query);

  // Perform hybrid search with RRF (Reciprocal Rank Fusion)
  const results = await sql`
    WITH semantic_results AS (
      SELECT 
        id,
        title,
        url,
        content_preview,
        word_count,
        1 - (embedding <=> ${JSON.stringify(queryEmbedding)}::vector) as semantic_score,
        ROW_NUMBER() OVER (ORDER BY embedding <=> ${JSON.stringify(queryEmbedding)}::vector) as semantic_rank
      FROM articles
      WHERE embedding IS NOT NULL
      ORDER BY embedding <=> ${JSON.stringify(queryEmbedding)}::vector
      LIMIT 50
    ),
    fulltext_results AS (
      SELECT 
        id,
        title,
        url,
        content_preview,
        word_count,
        ts_rank_cd(search_vector, websearch_to_tsquery('english', ${query})) as fulltext_score,
        ROW_NUMBER() OVER (ORDER BY ts_rank_cd(search_vector, websearch_to_tsquery('english', ${query})) DESC) as fulltext_rank
      FROM articles
      WHERE search_vector @@ websearch_to_tsquery('english', ${query})
      LIMIT 50
    ),
    combined AS (
      SELECT 
        COALESCE(s.id, f.id) as id,
        COALESCE(s.title, f.title) as title,
        COALESCE(s.url, f.url) as url,
        COALESCE(s.content_preview, f.content_preview) as content_preview,
        COALESCE(s.word_count, f.word_count) as word_count,
        s.semantic_score,
        f.fulltext_score,
        -- RRF formula: 1/(k + rank) where k=60 is standard
        (COALESCE(${semanticWeight}::float / (60 + s.semantic_rank), 0) + 
         COALESCE(${fulltextWeight}::float / (60 + f.fulltext_rank), 0)) as combined_score
      FROM semantic_results s
      FULL OUTER JOIN fulltext_results f ON s.id = f.id
    )
    SELECT 
      id,
      title,
      url,
      content_preview,
      word_count,
      semantic_score,
      fulltext_score,
      combined_score as score
    FROM combined
    ORDER BY combined_score DESC
    LIMIT ${limit}
  `;

  return results.map((row: any) => ({
    id: row.id,
    title: row.title,
    url: row.url,
    contentPreview: row.content_preview,
    score: row.score,
    semanticScore: row.semantic_score,
    fulltextScore: row.fulltext_score,
    wordCount: row.word_count,
  }));
}

/**
 * API handler
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
    const query = req.method === 'POST' ? req.body.query : req.query.q as string;
    const limit = parseInt((req.method === 'POST' ? req.body.limit : req.query.limit) as string || '20');
    const semanticWeight = parseFloat((req.method === 'POST' ? req.body.semanticWeight : req.query.sw) as string || '0.6');
    const fulltextWeight = parseFloat((req.method === 'POST' ? req.body.fulltextWeight : req.query.fw) as string || '0.4');

    if (!query || typeof query !== 'string') {
      return res.status(400).json({ error: 'Query parameter is required' });
    }

    if (query.trim().length === 0) {
      return res.status(400).json({ error: 'Query cannot be empty' });
    }

    const results = await hybridSearch(query, limit, semanticWeight, fulltextWeight);

    return res.status(200).json({
      query,
      results,
      count: results.length,
      weights: {
        semantic: semanticWeight,
        fulltext: fulltextWeight,
      },
    });

  } catch (error: any) {
    console.error('Search error:', error);
    return res.status(500).json({ 
      error: 'Search failed', 
      message: error.message 
    });
  }
}
