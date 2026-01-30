import { useState } from 'react';
import { ArrowRight, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

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

const popularSearches = [
  'clinical trials for depression treatment',
  'BrightSpring acquisition',
  'Alto Neuroscience IPO',
  'healthcare pharmacy deals',
  'neuroscience drug development'
];

export function LandingPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<ArticleResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchMeta, setSearchMeta] = useState<SearchResponse['meta'] | null>(null);

  const handleSearch = async (query: string) => {
    if (!query.trim()) {
      setResults([]);
      setSearchMeta(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: query.trim(),
          topK: 10,
          useReranking: true,
        }),
      });

      if (!response.ok) {
        throw new Error(`Search failed: ${response.statusText}`);
      }

      const data: SearchResponse = await response.json();
      setResults(data.results);
      setSearchMeta(data.meta);
    } catch (err: any) {
      console.error('Search error:', err);
      setError(err.message || 'An error occurred while searching');
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePopularSearch = (term: string) => {
    setSearchQuery(term);
    handleSearch(term);
  };

  const highlightScore = (score: number) => {
    if (score > 0.7) return 'text-green-600 font-semibold';
    if (score > 0.5) return 'text-blue-600 font-medium';
    return 'text-gray-600';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Decorative background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
        <div className="absolute top-40 right-10 w-72 h-72 bg-yellow-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-8 left-20 w-72 h-72 bg-pink-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000"></div>
      </div>

      <div className="relative max-w-6xl mx-auto p-8 min-h-screen flex flex-col justify-center">
        <div className="max-w-4xl mx-auto w-full">

          {/* Search Bar with Glassmorphism */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="relative mb-8"
          >
            <div className="relative backdrop-blur-2xl bg-white/80 rounded-2xl shadow-[0_8px_32px_0_rgba(0,0,0,0.1)] border border-white/60 p-1.5 flex items-center gap-2">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && searchQuery.trim()) {
                    handleSearch(searchQuery);
                  }
                }}
                placeholder="Ask anything about the articles (e.g., 'clinical trials for depression')..."
                className="flex-1 px-6 py-5 rounded-xl bg-white/50 focus:outline-none focus:bg-white/70 transition-all placeholder:text-gray-500"
                disabled={isLoading}
              />
              <button
                onClick={() => searchQuery.trim() && handleSearch(searchQuery)}
                disabled={isLoading || !searchQuery.trim()}
                className="px-6 py-5 bg-black text-white rounded-xl hover:bg-gray-800 transition-all flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <Loader2 className="size-5 animate-spin" />
                ) : (
                  <ArrowRight className="size-5" />
                )}
              </button>
            </div>
          </motion.div>

          {/* Popular Searches */}
          {!searchQuery && !results.length && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="mb-8"
            >
              <p className="text-gray-500 mb-3">Popular searches:</p>
              <div className="flex flex-wrap gap-2">
                {popularSearches.map((term, index) => (
                  <motion.button
                    key={term}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.3 + index * 0.05 }}
                    onClick={() => handlePopularSearch(term)}
                    disabled={isLoading}
                    className="px-4 py-2 bg-white/80 backdrop-blur-md rounded-full text-gray-700 hover:bg-white hover:shadow-lg transition-all border border-white/60 shadow-sm disabled:opacity-50"
                  >
                    {term}
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}

          {/* Error Message */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl"
            >
              <p className="text-red-600">❌ {error}</p>
            </motion.div>
          )}

          {/* Results */}
          <AnimatePresence mode="popLayout">
            {results.length > 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-4"
              >
                {results.map((result, index) => (
                  <motion.div
                    key={result.articleId}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="backdrop-blur-xl bg-white/90 rounded-xl p-6 shadow-lg border border-white/60 hover:shadow-xl transition-all"
                  >
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <h3 className="text-lg font-semibold text-gray-900 flex-1">
                        <a
                          href={result.metadata.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:text-blue-600 transition-colors"
                        >
                          {result.metadata.title || 'Untitled'}
                        </a>
                      </h3>
                      <div className="flex flex-col items-end gap-1">
                        <span className={`text-sm ${highlightScore(result.score)}`}>
                          {(result.score * 100).toFixed(1)}% match
                        </span>
                        {result.reranked && result.originalScore && (
                          <span className="text-xs text-gray-400">
                            (↑ from {(result.originalScore * 100).toFixed(1)}%)
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-3 mb-3 text-sm text-gray-600">
                      {result.metadata.source && (
                        <span className="flex items-center gap-1">
                          <span className="text-gray-400">🌐</span>
                          {result.metadata.source}
                        </span>
                      )}
                      {result.metadata.publish_date && (
                        <span className="flex items-center gap-1">
                          <span className="text-gray-400">📅</span>
                          {new Date(result.metadata.publish_date).toLocaleDateString()}
                        </span>
                      )}
                      {result.metadata.authors && (
                        <span className="flex items-center gap-1">
                          <span className="text-gray-400">✍️</span>
                          {result.metadata.authors}
                        </span>
                      )}
                    </div>

                    {result.metadata.text_preview && (
                      <p className="text-gray-700 text-sm leading-relaxed">
                        {result.metadata.text_preview}
                      </p>
                    )}

                    <a
                      href={result.metadata.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 mt-4 text-sm text-blue-600 hover:text-blue-700 font-medium"
                    >
                      Read full article
                      <ArrowRight className="size-3" />
                    </a>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {/* No Results */}
          {searchQuery && results.length === 0 && !isLoading && !error && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-20"
            >
              <div className="inline-flex items-center justify-center w-20 h-20 bg-gray-100 rounded-full mb-4 text-4xl">
                🔍
              </div>
              <h3 className="mb-2 text-gray-700">No results found</h3>
              <p className="text-gray-500">We couldn't find anything matching "{searchQuery}"</p>
              <p className="text-gray-400 mt-2">Try different search terms</p>
            </motion.div>
          )}

          {/* Loading State */}
          {isLoading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-20"
            >
              <Loader2 className="size-12 animate-spin text-blue-600 mx-auto mb-4" />
              <p className="text-gray-600">Searching articles...</p>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
