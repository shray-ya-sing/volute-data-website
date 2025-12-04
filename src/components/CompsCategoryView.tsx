import { useState } from 'react';
import { motion } from 'motion/react';
import { X, ArrowLeft, Sparkles } from 'lucide-react';
import { MetricsTable } from './MetricsTable';
import { SourcesPanel } from './SourcesPanel';
import { CompsCategory, Company, Metric, MetricValue } from '../types';

interface CompsCategoryViewProps {
  category: CompsCategory;
  companies: Company[];
  metrics: Metric[];
  metricValues: MetricValue[];
  onClose: () => void;
}

export function CompsCategoryView({
  category,
  companies,
  metrics,
  metricValues,
  onClose,
}: CompsCategoryViewProps) {
  const [selectedMetric, setSelectedMetric] = useState<MetricValue | null>(null);
  const [selectedCompanyName, setSelectedCompanyName] = useState<string>('');
  const [selectedMetricName, setSelectedMetricName] = useState<string>('');

  const handleCellClick = (companyId: string, metricId: string) => {
    const metricValue = metricValues.find(
      (mv) => mv.companyId === companyId && mv.metricId === metricId
    );
    const company = companies.find((c) => c.id === companyId);
    const metric = metrics.find((m) => m.id === metricId);

    if (metricValue && company && metric) {
      setSelectedMetric(metricValue);
      setSelectedCompanyName(company.name);
      setSelectedMetricName(metric.name);
    }
  };

  const handleClosePanel = () => {
    setSelectedMetric(null);
    setSelectedCompanyName('');
    setSelectedMetricName('');
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
        onClick={onClose}
      />

      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 50 }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        className="fixed inset-0 z-50 overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 p-8">
          <div className="max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-8">
              <button
                onClick={onClose}
                className="inline-flex items-center gap-2 px-4 py-2 bg-white rounded-xl shadow-sm hover:shadow-md transition-all mb-4 text-gray-700 hover:text-gray-900"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to search
              </button>

              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-black text-white rounded-full mb-3">
                  <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
                  <span>Live Data</span>
                </div>
                <div className="flex items-center gap-3 mb-2">
                  <Sparkles className="size-8 text-indigo-600" />
                  <h1 className="text-gray-900">{category.name}</h1>
                </div>
                <p className="text-gray-600 mb-1">{category.description}</p>
                <div className="flex items-center gap-4 text-sm text-gray-500">
                  <span>{category.companyCount} companies</span>
                  <span>•</span>
                  <span>{category.metricCount} metrics</span>
                  <span>•</span>
                  <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full">
                    {category.category}
                  </span>
                </div>
              </motion.div>
            </div>

            {/* Metrics Table */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <MetricsTable
                companies={companies}
                metrics={metrics}
                metricValues={metricValues}
                onCellClick={handleCellClick}
              />
            </motion.div>

            {/* Close button */}
            <button
              onClick={onClose}
              className="fixed top-8 right-8 p-3 bg-white rounded-full shadow-lg hover:shadow-xl transition-all text-gray-700 hover:text-gray-900 hover:rotate-90"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>
      </motion.div>

      {/* Sources Panel */}
      <SourcesPanel
        isOpen={selectedMetric !== null}
        onClose={handleClosePanel}
        companyName={selectedCompanyName}
        metricName={selectedMetricName}
        metricValue={selectedMetric?.value || ''}
        sources={selectedMetric?.sources || []}
      />
    </>
  );
}
