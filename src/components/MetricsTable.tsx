import { Company, Metric, MetricValue } from '../types';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { ChevronRight } from 'lucide-react';

interface MetricsTableProps {
  companies: Company[];
  metrics: Metric[];
  metricValues: MetricValue[];
  onCellClick: (companyId: string, metricId: string) => void;
}

export function MetricsTable({ companies, metrics, metricValues, onCellClick }: MetricsTableProps) {
  const getMetricValue = (companyId: string, metricId: string): string => {
    const metricValue = metricValues.find(
      (mv) => mv.companyId === companyId && mv.metricId === metricId
    );
    return metricValue?.value || '-';
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-200">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="px-6 py-5 text-left w-32 sticky left-0 bg-gray-50">
                <span className="text-gray-700">Company Logo</span>
              </th>
              <th className="px-6 py-5 text-left w-48 bg-gray-50">
                <span className="text-gray-700">Company Name</span>
              </th>
              {metrics.map((metric) => (
                <th key={metric.id} className="px-6 py-5 text-left">
                  <div className="flex flex-col gap-1">
                    <span className="text-gray-900">{metric.name}</span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {companies.map((company, index) => (
              <tr
                key={company.id}
                className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
              >
                <td className="px-6 py-5 sticky left-0 bg-white">
                  <div className="w-14 h-14 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0 shadow-md ring-2 ring-gray-100">
                    <ImageWithFallback
                      src={company.logo}
                      alt={`${company.name} logo`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                </td>
                <td className="px-6 py-5 bg-white">
                  <span className="text-gray-900">{company.name}</span>
                </td>
                {metrics.map((metric) => (
                  <td
                    key={metric.id}
                    className="px-6 py-5 cursor-pointer transition-all duration-200 hover:bg-gray-900 hover:text-white group relative"
                    onClick={() => onCellClick(company.id, metric.id)}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <span className="text-gray-900 group-hover:text-white transition-colors">
                          {getMetricValue(company.id, metric.id)}
                        </span>
                        <div className="px-2 py-0.5 bg-gray-100 text-gray-600 group-hover:bg-gray-800 group-hover:text-gray-300 rounded opacity-0 group-hover:opacity-100 transition-all">
                          {metricValues.find(
                            (mv) => mv.companyId === company.id && mv.metricId === metric.id
                          )?.sources.length || 0} sources
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-white opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                    </div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
