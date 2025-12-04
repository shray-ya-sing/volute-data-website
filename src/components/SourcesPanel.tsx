import { X, ExternalLink, FileText, Newspaper, Globe, Database } from 'lucide-react';
import { Source } from '../types';

interface SourcesPanelProps {
  isOpen: boolean;
  onClose: () => void;
  companyName: string;
  metricName: string;
  metricValue: string;
  sources: Source[];
}

export function SourcesPanel({
  isOpen,
  onClose,
  companyName,
  metricName,
  metricValue,
  sources,
}: SourcesPanelProps) {
  if (!isOpen) return null;

  const getSourceIcon = (type: Source['type']) => {
    switch (type) {
      case 'filing':
        return <FileText className="w-5 h-5" />;
      case 'news':
        return <Newspaper className="w-5 h-5" />;
      case 'website':
        return <Globe className="w-5 h-5" />;
      case 'database':
        return <Database className="w-5 h-5" />;
      default:
        return <FileText className="w-5 h-5" />;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 transition-opacity"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed right-0 top-0 h-full w-full max-w-lg bg-white shadow-2xl z-50 overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-black px-6 py-6 z-10">
          <div className="flex items-start justify-between">
            <div className="flex-1 pr-4">
              <div className="inline-flex items-center gap-2 px-2.5 py-1 bg-white/20 backdrop-blur-sm rounded-full mb-3">
                <span className="w-1.5 h-1.5 bg-white rounded-full"></span>
                <span className="text-white">Data Sources</span>
              </div>
              <h2 className="text-white mb-1">{companyName}</h2>
              <p className="text-gray-300">{metricName}</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors flex-shrink-0"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>
          <div className="mt-4 inline-flex items-center gap-2 px-4 py-2.5 bg-white rounded-xl shadow-lg">
            <span className="text-gray-900">{metricValue}</span>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-6 bg-gray-50">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-gray-900">Available Sources</h3>
              <p className="text-gray-600">
                {sources.length} source{sources.length !== 1 ? 's' : ''} found
              </p>
            </div>
            <div className="flex gap-2">
              {Array.from(new Set(sources.map(s => s.type))).map(type => (
                <div key={type} className="w-8 h-8 rounded-lg flex items-center justify-center border border-gray-300 bg-white text-gray-700">
                  {getSourceIcon(type)}
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            {sources.map((source, index) => (
              <div
                key={index}
                className="border border-gray-200 rounded-xl p-5 bg-white hover:shadow-lg hover:border-gray-900 transition-all duration-200 group"
              >
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-xl border border-gray-200 bg-gray-50 text-gray-700 group-hover:bg-black group-hover:text-white group-hover:border-black transition-all">
                    {getSourceIcon(source.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="flex-1">
                        <h4 className="text-gray-900 mb-1">{source.name}</h4>
                        <div className="flex items-center gap-3 text-gray-600">
                          <span className="px-2.5 py-0.5 rounded-full bg-gray-100 text-gray-700">
                            {source.type}
                          </span>
                          <span className="flex items-center gap-1">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            {formatDate(source.date)}
                          </span>
                        </div>
                      </div>
                      {source.url && (
                        <a
                          href={source.url}
                          className="flex-shrink-0 p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-900 transition-colors"
                          onClick={(e) => e.preventDefault()}
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      )}
                    </div>
                    <div className="inline-flex items-center gap-2 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg">
                      <span className="text-gray-600">Value:</span>
                      <span className="text-gray-900">{source.value}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {sources.length === 0 && (
            <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
              <div className="w-20 h-20 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Database className="w-10 h-10 text-gray-400" />
              </div>
              <h3 className="text-gray-900 mb-1">No sources available</h3>
              <p className="text-gray-600">Check back later for updates</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 px-6 py-4 bg-white border-t border-gray-200">
          <p className="text-gray-600 text-center">
            Last updated: {new Date().toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </p>
        </div>
      </div>
    </>
  );
}
