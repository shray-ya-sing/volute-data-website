// services/vectorSearchService.ts
// Client-side service for vector search

export interface ArticleResult {
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

export interface SearchResponse {
  results: ArticleResult[];
  meta: {
    query: string;
    totalResults: number;
    reranked: boolean;
  };
}

export interface SearchOptions {
  topK?: number;
  useReranking?: boolean;
  filterSource?: string;
}

export async function searchArticles(
  query: string,
  options: SearchOptions = {}
): Promise<SearchResponse> {
  const { topK = 10, useReranking = true, filterSource } = options;

  const response = await fetch('/api/search', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query,
      topK,
      useReranking,
      filterSource,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || `Search failed: ${response.statusText}`);
  }

  return response.json();
}

// Alternative: Use GET endpoint for simple searches
export async function searchArticlesSimple(query: string, topK: number = 10): Promise<SearchResponse> {
  const params = new URLSearchParams({
    q: query,
    topK: topK.toString(),
  });

  const response = await fetch(`/api/search?${params}`);

  if (!response.ok) {
    throw new Error(`Search failed: ${response.statusText}`);
  }

  return response.json();
}
