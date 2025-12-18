import { useState } from 'react';
import { Search, Loader2, Sparkles } from 'lucide-react';
import type { Company, Metric } from '../types';
import { parseQuery } from '../services/queryParser';

interface SmartSearchProps {
  onSearch: (companies: string[], metrics: string[]) => void;
  availableCompanies: Company[];
  availableMetrics: Metric[];
}

export function SmartSearch({ onSearch, availableCompanies, availableMetrics }: SmartSearchProps) {
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async () => {
    if (!query.trim()) return;

    setIsSearching(true);
    setError(null);

    try {
      // Call parseQuery directly (client-side)
      const result = await parseQuery(query, {
        availableCompanies: availableCompanies.map(c => ({
          name: c.name,
          ticker: c.ticker,
        })),
        availableMetrics: availableMetrics.map(m => ({
          id: m.id,
          name: m.name,
        })),
      });

      onSearch(result.companies, result.metrics);
    } catch (err: any) {
      console.error('Search error:', err);
      setError(err.message || 'Failed to process your query. Please try again.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !isSearching) {
      handleSearch();
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="mb-4 flex items-center gap-2 text-gray-600">
        <Sparkles className="w-5 h-5" />
        <p className="text-sm">
          Ask in natural language, e.g., "Show me Astera Labs IPO proceeds and valuation"
        </p>
      </div>

      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Search for companies and metrics..."
          className="w-full px-6 py-4 pr-14 text-lg border-2 border-gray-300 rounded-xl focus:border-black focus:outline-none transition-colors disabled:bg-gray-100 disabled:cursor-not-allowed"
          disabled={isSearching}
        />
        <button
          onClick={handleSearch}
          disabled={isSearching || !query.trim()}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-black text-white rounded-lg hover:bg-gray-800 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          aria-label="Search"
        >
          {isSearching ? (
            <Loader2 className="w-6 h-6 animate-spin" />
          ) : (
            <Search className="w-6 h-6" />
          )}
        </button>
      </div>

      {error && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      <div className="mt-6 flex flex-wrap gap-2">
        <p className="text-sm text-gray-500 w-full mb-2">Example queries:</p>
        {[
          'Show me Astera Labs gross and net proceeds',
          'Compare Astera and Rubrik IPO valuations',
          'Shares sold by company for all IPOs',
        ].map((example) => (
          <button
            key={example}
            onClick={() => setQuery(example)}
            className="text-sm px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700 transition-colors"
          >
            {example}
          </button>
        ))}
      </div>
    </div>
  );
}
