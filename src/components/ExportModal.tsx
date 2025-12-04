import { X, FileDown } from 'lucide-react';
import { Company, Metric, MetricValue } from '../types';
import { exportToExcel } from '../utils/exportToExcel';
import { exportToPowerPoint } from '../utils/exportToPowerPoint';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  companies: Company[];
  metrics: Metric[];
  metricValues: MetricValue[];
  categoryName: string;
}

export function ExportModal({ isOpen, onClose, companies, metrics, metricValues, categoryName }: ExportModalProps) {
  if (!isOpen) return null;

  const handleExport = async (format: 'powerpoint' | 'excel') => {
    try {
      if (format === 'excel') {
        await exportToExcel(companies, metrics, metricValues, categoryName);
      } else {
        await exportToPowerPoint(companies, metrics, metricValues, categoryName);
      }
      onClose();
    } catch (error) {
      console.error(`Error exporting to ${format}:`, error);
      alert(`Error exporting to ${format}. Please try again.`);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-[50vw] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="px-8 py-6 border-b border-gray-200 flex items-center justify-between">
            <div className="flex-1 text-center">
              <h2 className="text-gray-900 mb-1">Export Table</h2>
              <p className="text-gray-600">Choose your export format</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors absolute right-8"
            >
              <X className="w-6 h-6 text-gray-500" />
            </button>
          </div>

          {/* Content */}
          <div className="p-8 flex justify-center">
            <div className="grid grid-cols-2 gap-6 max-w-2xl w-full">
              {/* PowerPoint Export */}
              <button
                onClick={() => handleExport('powerpoint')}
                className="group relative p-8 border-2 border-gray-200 rounded-xl hover:border-black transition-all hover:shadow-xl text-left"
              >
                <div className="flex flex-col items-center text-center gap-4">
                  <div className="w-20 h-20 rounded-2xl border-2 border-gray-900 flex items-center justify-center group-hover:bg-black transition-all">
                    <FileDown className="w-10 h-10 text-gray-900 group-hover:text-white transition-colors" />
                  </div>
                  <div>
                    <h3 className="text-gray-900 mb-2">PowerPoint</h3>
                    <p className="text-gray-600">Export as .pptx presentation</p>
                  </div>
                </div>
              </button>

              {/* Excel Export */}
              <button
                onClick={() => handleExport('excel')}
                className="group relative p-8 border-2 border-gray-200 rounded-xl hover:border-black transition-all hover:shadow-xl text-left"
              >
                <div className="flex flex-col items-center text-center gap-4">
                  <div className="w-20 h-20 rounded-2xl border-2 border-gray-900 flex items-center justify-center group-hover:bg-black transition-all">
                    <FileDown className="w-10 h-10 text-gray-900 group-hover:text-white transition-colors" />
                  </div>
                  <div>
                    <h3 className="text-gray-900 mb-2">Excel</h3>
                    <p className="text-gray-600">Export as .xlsx spreadsheet</p>
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* Footer */}
          <div className="px-8 py-6 border-t border-gray-200 flex items-center justify-end bg-gray-50">
          </div>
        </div>
      </div>
    </>
  );
}
