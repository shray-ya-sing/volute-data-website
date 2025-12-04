import { useState } from 'react';
import { ArrowLeft, Download } from 'lucide-react';
import { MetricsTable } from './MetricsTable';
import { SourcesPanel } from './SourcesPanel';
import { ExportModal } from './ExportModal';
import { Company, Metric, MetricValue } from '../types';

interface TablePageProps {
  companies: Company[];
  metrics: Metric[];
  metricValues: MetricValue[];
  categoryName: string;
  onBack: () => void;
}

export function TablePage({ companies, metrics, metricValues, categoryName, onBack }: TablePageProps) {
  const [selectedMetric, setSelectedMetric] = useState<MetricValue | null>(null);
  const [selectedCompanyName, setSelectedCompanyName] = useState<string>('');
  const [selectedMetricName, setSelectedMetricName] = useState<string>('');
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

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
    <div className="min-h-screen bg-white p-8">
      <div className="max-w-7xl mx-auto">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 px-4 py-2 mb-6 text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to search
        </button>

        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-gray-900 mb-2">{categoryName}</h1>
              <p className="text-gray-600">Click on any metric to view data sources and insights</p>
            </div>
            <button
              onClick={() => setIsExportModalOpen(true)}
              className="flex items-center justify-center gap-3 w-48 py-4 bg-black text-white rounded-xl hover:bg-gray-800 transition-colors shadow-lg"
            >
              <Download className="w-5 h-5" />
              Export
            </button>
          </div>
        </div>

        <MetricsTable
          companies={companies}
          metrics={metrics}
          metricValues={metricValues}
          onCellClick={handleCellClick}
        />
      </div>

      <SourcesPanel
        isOpen={selectedMetric !== null}
        onClose={handleClosePanel}
        companyName={selectedCompanyName}
        metricName={selectedMetricName}
        metricValue={selectedMetric?.value || ''}
        sources={selectedMetric?.sources || []}
      />

      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        companies={companies}
        metrics={metrics}
        metricValues={metricValues}
        categoryName={categoryName}
      />
    </div>
  );
}
