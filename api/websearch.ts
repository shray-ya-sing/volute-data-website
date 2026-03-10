import type { VercelRequest, VercelResponse } from '@vercel/node';

let PERPLEXITY_API_KEY = process.env.PERPLEXITY_API_KEY || '';

interface ArticleResult {
  articleId: string;
  score: number;
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
  answer?: string;
  meta: {
    model: string;
    finalTopK: number;
  };
}

/**
 * Search the web using Perplexity's sonar API
 */
async function perplexitySearch(
  query: string,
  topK: number,
  filterSource?: string
): Promise<SearchResponse> {
  // If filterSource is provided, scope the query to that domain
  const scopedQuery = filterSource
    ? `site:${filterSource} ${query}`
    : query;

  const response = await fetch('https://api.perplexity.ai/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'sonar',
      messages: [
        {
          role: 'system',
          content: 'Be precise and concise. When answering, always rely on the cited sources.',
        },
        {
          role: 'user',
          content: scopedQuery,
        },
      ],
      max_tokens: 1024,
      return_citations: true,
      return_related_questions: false,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Perplexity API error: ${response.status} - ${error}`);
  }

  const data = await response.json();

  const answerText: string = data.choices?.[0]?.message?.content || '';
  const citations: string[] = data.citations || [];

  console.log(`Perplexity returned ${citations.length} citations`);

  // Map citations to ArticleResult shape, capped at topK
  const results: ArticleResult[] = citations.slice(0, topK).map(
    (url: string, index: number) => {
      let hostname = '';
      try {
        hostname = new URL(url).hostname.replace('www.', '');
      } catch {
        hostname = url;
      }

      // Score descends from 1.0 — citations are ordered by relevance in Perplexity responses
      const score = parseFloat((1 - index * (1 / Math.max(citations.length, 1)) * 0.5).toFixed(4));

      return {
        articleId: `citation-${index + 1}`,
        score,
        metadata: {
          url,
          title: `Result ${index + 1} from ${hostname}`,
          source: hostname,
          text_preview: `[${index + 1}] ${url} — ${answerText.length > 200 ? answerText.slice(0, 200) + '…' : answerText}`,
        },
      };
    }
  );

  return {
    query,
    results,
    count: results.length,
    answer: answerText,
    meta: {
      model: data.model || 'sonar',
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

  // Refresh from env in case it was set after module load
  PERPLEXITY_API_KEY = process.env.PERPLEXITY_API_KEY || '';
  if (!PERPLEXITY_API_KEY) {
    return res.status(500).json({ error: 'Search is not configured' });
  }

  try {
    // Parse parameters from either POST body or GET query
    const query = req.method === 'POST'
      ? req.body.query
      : req.query.q as string;

    const topK = parseInt(
      (req.method === 'POST' ? req.body.topK : req.query.topK) as string || '10'
    );

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
        error: 'topK must be between 1 and 100',
      });
    }

    console.log(`Search request: query="${query}", topK=${topK}, filterSource=${filterSource || 'none'}`);

    const searchResults = await perplexitySearch(query, topK, filterSource);

    return res.status(200).json(searchResults);

  } catch (error: any) {
    console.error('Search error:', error);
    return res.status(500).json({
      error: 'Search failed',
      message: error.message,
    });
  }
}
