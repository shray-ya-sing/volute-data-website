import { motion } from 'motion/react';
import { Building2, TrendingUp, Calendar, DollarSign } from 'lucide-react';
import { SearchResult } from '../types';

interface IPODataCardProps {
  result: SearchResult;
  index: number;
  searchQuery: string;
  viewMode: 'list' | 'grid';
  onClick: () => void;
}

const categoryColors: Record<string, string> = {
  'IPO Filing Data': 'bg-blue-500 text-white',
  'Financial Metrics': 'bg-emerald-500 text-white',
  'Underwriter Info': 'bg-purple-500 text-white',
};

// Function to highlight matching text
const highlightText = (text: string, query: string) => {
  if (!query.trim()) return text;

  const parts = text.split(new RegExp(`(${query})`, 'gi'));
  return parts.map((part, index) => {
    if (part.toLowerCase() === query.toLowerCase()) {
      return (
        <mark key={index} className="bg-yellow-200 text-gray-900 px-0.5 rounded">
          {part}
        </mark>
      );
    }
    return part;
  });
};

export function IPODataCard({ result, index, searchQuery, viewMode, onClick }: IPODataCardProps) {
  if (viewMode === 'grid') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -20, scale: 0.95 }}
        transition={{
          duration: 0.3,
          delay: index * 0.05,
          ease: [0.4, 0, 0.2, 1],
        }}
        whileHover={{ scale: 1.03, y: -8 }}
        onClick={onClick}
        className="group bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all cursor-pointer overflow-hidden border border-gray-100"
      >
        <div className="relative h-32 overflow-hidden bg-gradient-to-br from-indigo-50 via-blue-50 to-purple-50 p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Building2 className="size-8 text-indigo-600" />
              <div>
                <div className="font-semibold text-gray-900">{result.ticker}</div>
                <div className="text-xs text-gray-500">{result.exchange}</div>
              </div>
            </div>
            <span
              className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full shadow-sm text-xs ${
                categoryColors[result.category] || 'bg-gray-500 text-white'
              }`}
            >
              {result.category}
            </span>
          </div>
        </div>

        <div className="p-5">
          <h3 className="mb-2 line-clamp-1 group-hover:text-indigo-600 transition-colors">
            {highlightText(result.companyName, searchQuery)}
          </h3>
          <p className="text-gray-600 mb-4 line-clamp-2 text-sm">
            {highlightText(result.description, searchQuery)}
          </p>

          <div className="flex items-center justify-between text-sm text-gray-500 pt-3 border-t border-gray-100">
            <div className="flex items-center gap-1">
              <Calendar className="size-3.5" />
              <span className="text-xs">{result.ipoDate}</span>
            </div>
            <div className="flex items-center gap-1">
              <DollarSign className="size-3.5" />
              <span className="text-xs">{result.finalPrice}</span>
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.95 }}
      transition={{
        duration: 0.3,
        delay: index * 0.05,
        ease: [0.4, 0, 0.2, 1],
      }}
      whileHover={{ scale: 1.01, x: 8 }}
      onClick={onClick}
      className="group bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all cursor-pointer overflow-hidden border border-gray-100"
    >
      <div className="flex gap-5 p-5">
        <div className="relative w-40 h-28 flex-shrink-0 rounded-xl overflow-hidden bg-gradient-to-br from-indigo-50 via-blue-50 to-purple-50 flex items-center justify-center">
          <div className="text-center">
            <Building2 className="size-10 text-indigo-600 mx-auto mb-1" />
            <div className="font-bold text-gray-900">{result.ticker}</div>
            <div className="text-xs text-gray-500">{result.exchange}</div>
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3 mb-2">
            <h3 className="flex-1 group-hover:text-indigo-600 transition-colors">
              {highlightText(result.companyName, searchQuery)}
            </h3>
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full flex-shrink-0 text-xs ${
                categoryColors[result.category] || 'bg-gray-500 text-white'
              }`}
            >
              {result.category}
            </span>
          </div>

          <p className="text-gray-600 mb-3 line-clamp-2 text-sm">
            {highlightText(result.description, searchQuery)}
          </p>

          <div className="flex items-center gap-4 text-sm text-gray-500">
            <div className="flex items-center gap-1.5">
              <Calendar className="size-4" />
              <span>IPO: {result.ipoDate}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <DollarSign className="size-4" />
              <span>{result.finalPrice}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <TrendingUp className="size-4" />
              <span>{result.grossProceeds}</span>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
