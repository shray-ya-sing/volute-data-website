import { useState, useEffect } from 'react';
import { Search, Grid, List, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { IPODataCard } from './components/IPODataCard';
import { IPODetailView } from './components/IPODetailView';
import { IPOData, SearchResult } from './types';

// Convert IPO data to search results
function convertToSearchResults(data: IPOData[]): SearchResult[] {
  return data.map((item, index) => ({
    id: index.toString(),
    companyName: item['Company Name'],
    ticker: item['Company Ticker'],
    exchange: item['Exchange'],
    ipoDate: item['IPO Date'],
    finalPrice: item['Final Price'],
    grossProceeds: item['Gross Proceeds'],
    category: 'IPO Filing Data',
    description: `${item['Company Name']} (${item['Company Ticker']}) went public on ${item['IPO Date']} at ${item['Final Price']}, raising ${item['Gross Proceeds']} in gross proceeds.`,
    fullData: item,
  }));
}

const popularSearches = ['Rubrik', 'IPO 2024', 'Tech IPOs', 'NYSE', 'Filing Data', 'Underwriters'];

export default function App() {
  const [searchQuery, setSearchQuery] = useState('');
  const [allResults, setAllResults] = useState<SearchResult[]>([]);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [selectedIPO, setSelectedIPO] = useState<SearchResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load IPO data on mount
  useEffect(() => {
    fetch('/data.json')
      .then((res) => res.json())
      .then((data: IPOData[]) => {
        const searchResults = convertToSearchResults(data);
        setAllResults(searchResults);
        setIsLoading(false);
      })
      .catch((error) => {
        console.error('Error loading IPO data:', error);
        setIsLoading(false);
      });
  }, []);

  const handleSearch = (query: string) => {
    setSearchQuery(query);

    if (query.trim() === '') {
      setResults([]);
      return;
    }

    const filtered = allResults.filter((item) => {
      const searchLower = query.toLowerCase();
      return (
        item.companyName.toLowerCase().includes(searchLower) ||
        item.ticker.toLowerCase().includes(searchLower) ||
        item.description.toLowerCase().includes(searchLower) ||
        item.exchange.toLowerCase().includes(searchLower) ||
        item.ipoDate.toLowerCase().includes(searchLower) ||
        item.fullData['Lead Bookrunners'].toLowerCase().includes(searchLower) ||
        item.fullData['Co-Bookrunners'].toLowerCase().includes(searchLower)
      );
    });

    setResults(filtered);
  };

  const handlePopularSearch = (term: string) => {
    handleSearch(term);
  };

  const handleIPOClick = (ipo: SearchResult) => {
    setSelectedIPO(ipo);
  };

  const handleCloseIPO = () => {
    setSelectedIPO(null);
  };

  return (
    <>
      <AnimatePresence>
        {selectedIPO && <IPODetailView result={selectedIPO} onClose={handleCloseIPO} />}
      </AnimatePresence>

      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
        {/* Decorative background elements */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-10 w-72 h-72 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
          <div className="absolute top-40 right-10 w-72 h-72 bg-yellow-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
          <div className="absolute -bottom-8 left-20 w-72 h-72 bg-pink-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000"></div>
        </div>

        <div className="relative max-w-6xl mx-auto p-8">
          {/* Hero Section */}
          <div className="text-center mb-12 mt-16">
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div className="inline-flex items-center gap-2 mb-4">
                <Sparkles className="size-8 text-indigo-600" />
                <h1 className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                  Volute Data
                </h1>
              </div>
              <p className="text-gray-600 max-w-2xl mx-auto">
                Search IPO filings, financial metrics, and underwriter information from recent public offerings
              </p>
            </motion.div>
          </div>

          {/* Search Bar with Glassmorphism */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="relative mb-8"
          >
            <div className="relative backdrop-blur-xl bg-white/70 rounded-2xl shadow-2xl border border-white/50 p-1">
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-400 size-5 z-10" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="Search for companies, tickers, IPO data..."
                className="w-full pl-14 pr-32 py-5 rounded-xl bg-transparent focus:outline-none transition-all"
                disabled={isLoading}
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1 bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded transition-all ${
                    viewMode === 'list'
                      ? 'bg-white shadow-sm text-indigo-600'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <List className="size-4" />
                </button>
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded transition-all ${
                    viewMode === 'grid'
                      ? 'bg-white shadow-sm text-indigo-600'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <Grid className="size-4" />
                </button>
              </div>
            </div>
          </motion.div>

          {/* Loading State */}
          {isLoading && (
            <div className="text-center py-20">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-indigo-600 border-t-transparent"></div>
              <p className="mt-4 text-gray-600">Loading IPO data...</p>
            </div>
          )}

          {/* Popular Searches */}
          {!searchQuery && !isLoading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="mb-8"
            >
              <p className="text-gray-500 mb-3">Popular searches:</p>
              <div className="flex flex-wrap gap-2">
                {popularSearches.map((term, index) => (
                  <motion.button
                    key={term}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.5 + index * 0.05 }}
                    onClick={() => handlePopularSearch(term)}
                    className="px-4 py-2 bg-white/70 backdrop-blur-sm rounded-full text-gray-700 hover:bg-white hover:shadow-md transition-all border border-gray-200/50"
                  >
                    {term}
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}

          {/* Results Count */}
          {results.length > 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-4">
              <p className="text-gray-600">
                Found <span className="font-semibold text-indigo-600">{results.length}</span>{' '}
                {results.length === 1 ? 'result' : 'results'}
              </p>
            </motion.div>
          )}

          {/* Results */}
          <AnimatePresence mode="popLayout">
            {results.length > 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className={
                  viewMode === 'grid'
                    ? 'grid grid-cols-1 md:grid-cols-2 gap-6'
                    : 'space-y-4'
                }
              >
                {results.map((result, index) => (
                  <IPODataCard
                    key={result.id}
                    result={result}
                    index={index}
                    searchQuery={searchQuery}
                    viewMode={viewMode}
                    onClick={() => handleIPOClick(result)}
                  />
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {/* No Results */}
          {searchQuery && results.length === 0 && !isLoading && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-20"
            >
              <div className="inline-flex items-center justify-center w-20 h-20 bg-gray-100 rounded-full mb-4">
                <Search className="size-10 text-gray-400" />
              </div>
              <h3 className="mb-2 text-gray-700">No results found</h3>
              <p className="text-gray-500">We couldn't find anything matching "{searchQuery}"</p>
              <p className="text-gray-400 mt-2">Try adjusting your search terms</p>
            </motion.div>
          )}
        </div>
      </div>
    </>
  );
}
