import { motion } from 'motion/react';
import { Table, TrendingUp, Users, BarChart3 } from 'lucide-react';
import { CompsCategory } from '../types';

interface CompsCategoryCardProps {
  category: CompsCategory;
  index: number;
  searchQuery: string;
  viewMode: 'list' | 'grid';
  onClick: () => void;
}

const categoryColors: Record<string, string> = {
  'IPO Comps': 'bg-gray-900 text-white',
  'Technology': 'bg-gray-700 text-white',
  'Financial': 'bg-gray-800 text-white',
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

export function CompsCategoryCard({ category, index, searchQuery, viewMode, onClick }: CompsCategoryCardProps) {
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
        className="group bg-white/90 backdrop-blur-lg rounded-2xl shadow-lg hover:shadow-2xl transition-all cursor-pointer overflow-hidden border border-white/60"
      >
        <div className="relative h-32 overflow-hidden bg-gradient-to-br from-gray-50 via-gray-100 to-gray-50 p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Table className="size-8 text-gray-900" />
            </div>
            <span
              className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full shadow-sm text-xs ${
                categoryColors[category.category] || 'bg-gray-500 text-white'
              }`}
            >
              {category.category}
            </span>
          </div>
        </div>

        <div className="p-5">
          <h3 className="mb-2 line-clamp-1 group-hover:text-gray-900 transition-colors">
            {highlightText(category.name, searchQuery)}
          </h3>
          <p className="text-gray-600 mb-4 line-clamp-2 text-sm">
            {highlightText(category.description, searchQuery)}
          </p>

          <div className="flex items-center justify-between text-sm text-gray-500 pt-3 border-t border-gray-100">
            <div className="flex items-center gap-1">
              <Users className="size-3.5" />
              <span className="text-xs">{category.companyCount} companies</span>
            </div>
            <div className="flex items-center gap-1">
              <BarChart3 className="size-3.5" />
              <span className="text-xs">{category.metricCount} metrics</span>
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
      className="group bg-white/90 backdrop-blur-lg rounded-2xl shadow-lg hover:shadow-2xl transition-all cursor-pointer overflow-hidden border border-white/60"
    >
      <div className="flex gap-5 p-5">
        <div className="relative w-40 h-28 flex-shrink-0 rounded-xl overflow-hidden bg-gradient-to-br from-gray-50 via-gray-100 to-gray-50 flex items-center justify-center">
          <div className="text-center">
            <Table className="size-10 text-gray-900 mx-auto mb-1" />
            <div className="text-xs text-gray-500">Comps Table</div>
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3 mb-2">
            <h3 className="flex-1 group-hover:text-gray-900 transition-colors">
              {highlightText(category.name, searchQuery)}
            </h3>
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full flex-shrink-0 text-xs ${
                categoryColors[category.category] || 'bg-gray-500 text-white'
              }`}
            >
              {category.category}
            </span>
          </div>

          <p className="text-gray-600 mb-3 line-clamp-2 text-sm">
            {highlightText(category.description, searchQuery)}
          </p>

          <div className="flex items-center gap-4 text-sm text-gray-500">
            <div className="flex items-center gap-1.5">
              <Users className="size-4" />
              <span>{category.companyCount} companies</span>
            </div>
            <div className="flex items-center gap-1.5">
              <BarChart3 className="size-4" />
              <span>{category.metricCount} metrics</span>
            </div>
            <div className="flex items-center gap-1.5">
              <TrendingUp className="size-4" />
              <span>Click to view table</span>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
