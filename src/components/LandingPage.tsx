import { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { CompsCategoryCard } from './CompsCategoryCard';
import { CompsCategory } from '../types';

interface LandingPageProps {
  categories: CompsCategory[];
  onCategoryClick: (category: CompsCategory) => void;
}

const popularSearches = ['SaaS', 'IPO 2024', 'Cloud', 'Infrastructure', 'Technology', 'Comps'];

export function LandingPage({ categories, onCategoryClick }: LandingPageProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<CompsCategory[]>([]);
  const viewMode = 'list'; // Default to list view

  const handleSearch = (query: string) => {
    setSearchQuery(query);

    if (query.trim() === '') {
      setResults([]);
      return;
    }

    const filtered = categories.filter((category) => {
      const searchLower = query.toLowerCase();
      return (
        category.name.toLowerCase().includes(searchLower) ||
        category.description.toLowerCase().includes(searchLower) ||
        category.category.toLowerCase().includes(searchLower)
      );
    });

    setResults(filtered);
  };

  const handlePopularSearch = (term: string) => {
    handleSearch(term);
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
        <div className="max-w-3xl mx-auto w-full">
          {/* Search Bar with Glassmorphism */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="relative mb-8"
          >
            <div className="relative backdrop-blur-2xl bg-white/80 rounded-2xl shadow-[0_8px_32px_0_rgba(0,0,0,0.1)] border border-white/60 p-1.5 flex items-center gap-2">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && searchQuery.trim()) {
                    handleSearch(searchQuery);
                  }
                }}
                placeholder="Search for comps categories, industries, metrics..."
                className="flex-1 px-6 py-5 rounded-xl bg-white/50 focus:outline-none focus:bg-white/70 transition-all placeholder:text-gray-500"
              />
              <button
                onClick={() => searchQuery.trim() && handleSearch(searchQuery)}
                className="px-6 py-5 bg-black text-white rounded-xl hover:bg-gray-800 transition-all flex items-center justify-center"
              >
                <ArrowRight className="size-5" />
              </button>
            </div>
          </motion.div>

        {/* Popular Searches */}
        {!searchQuery && (
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
                  className="px-4 py-2 bg-white/80 backdrop-blur-md rounded-full text-gray-700 hover:bg-white hover:shadow-lg transition-all border border-white/60 shadow-sm"
                >
                  {term}
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}
        </div>

        {/* Results Count */}
        {results.length > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-4">
            <p className="text-gray-600">
              Found <span className="font-semibold text-gray-900">{results.length}</span>{' '}
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
              {results.map((category, index) => (
                <CompsCategoryCard
                  key={category.id}
                  category={category}
                  index={index}
                  searchQuery={searchQuery}
                  viewMode={viewMode}
                  onClick={() => onCategoryClick(category)}
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* No Results */}
        {searchQuery && results.length === 0 && (
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
            <p className="text-gray-400 mt-2">Try adjusting your search terms</p>
          </motion.div>
        )}
      </div>
    </div>
  );
}
