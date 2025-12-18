import { X, ExternalLink, FileText, Newspaper, Globe, Database, File } from 'lucide-react';
import { Source } from '../types';
import { HtmlSourceViewer } from './HtmlSourceViewer';
import { PdfSourceViewer } from './PdfSourceViewer';

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
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 transition-opacity"
        onClick={onClose}
      />

      {/* Panel - Right side, wider for embedded viewers */}
      <div className="fixed right-0 top-0 h-full w-full max-w-4xl bg-white shadow-2xl z-50 overflow-y-auto flex flex-col">
        {/* Header */}
        <div className="bg-black px-6 py-5 flex-shrink-0 border-b border-gray-800">
          <div className="flex items-start justify-between">
            <div className="flex-1 pr-4">
              <div className="inline-flex items-center gap-2 px-2.5 py-1 bg-white/20 backdrop-blur-sm rounded-full mb-3">
                <span className="w-1.5 h-1.5 bg-white rounded-full"></span>
                <span className="text-white text-sm">Data Sources</span>
              </div>
              <h2 className="text-xl font-bold text-white mb-1">{companyName}</h2>
              <p className="text-gray-300">{metricName}</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors flex-shrink-0"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto bg-gray-50 p-6">
          <div className="space-y-6">
            {sources.map((source, index) => (
              <div
                key={index}
                className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-200"
              >
                {/* Source Header */}
                <div className="bg-gradient-to-r from-gray-50 to-white px-4 py-4 border-b border-gray-200">
                  <div className="flex items-start gap-3 mb-3">
                    {/* Icon */}
                    <div className="w-10 h-10 rounded-lg bg-black text-white flex items-center justify-center flex-shrink-0">
                      {getSourceIcon(source.type)}
                    </div>

                    {/* Source Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <h3 className="text-base font-semibold text-gray-900">{source.name}</h3>
                        <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 text-xs font-medium uppercase">
                          {source.type}
                        </span>
                        {source.highlights && source.highlights.length > 0 && (
                          <span className="px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-800 text-xs font-medium">
                            {source.highlights.length} highlight{source.highlights.length !== 1 ? 's' : ''}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3 text-xs text-gray-600 mb-2">
                        <div className="flex items-center gap-1.5">
                          <span className="text-gray-500">Date:</span>
                          <span className="text-gray-900 font-medium">{formatDate(source.date)}</span>
                        </div>
                        <span className="text-gray-300">•</span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-gray-500">Value:</span>
                          <span className="text-gray-900 font-mono font-semibold">{source.value}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* External Link Button */}
                  <div className="flex items-center gap-2">
                    {source.contentType === 'pdf' && source.contentPath ? (
                      <a
                        href={source.contentPath}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 px-3 py-1.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm"
                        title="Open PDF in new tab"
                      >
                        <File className="w-3.5 h-3.5" />
                        <span className="font-medium">Open PDF</span>
                      </a>
                    ) : source.url ? (
                      <a
                        href={source.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 px-3 py-1.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm"
                        title="Open original"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span className="font-medium">Open Original</span>
                      </a>
                    ) : null}
                  </div>
                </div>

                {/* Embedded Source Viewer */}
                {(source.contentPath || source.contentUrl) && (
                  <div className="bg-gray-50">
                    <div className="h-[500px] overflow-auto">
                      {source.contentType === 'pdf' ? (
                        <PdfSourceViewer
                          contentPath={source.contentPath}
                          contentUrl={source.contentUrl}
                          highlights={source.highlights || []}
                        />
                      ) : (
                        <HtmlSourceViewer
                          contentPath={source.contentPath}
                          contentUrl={source.contentUrl}
                          highlights={source.highlights || []}
                        />
                      )}
                    </div>
                  </div>
                )}

                {/* No viewer available message */}
                {!source.contentPath && !source.contentUrl && (
                  <div className="px-4 py-8 text-center bg-gray-50">
                    <div className="inline-flex items-center justify-center w-12 h-12 bg-gray-200 rounded-full mb-3">
                      <FileText className="w-6 h-6 text-gray-400" />
                    </div>
                    <p className="text-sm text-gray-600 mb-2">Source viewer not available</p>
                    {source.url && (
                      <a
                        href={source.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 font-medium"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        View external source
                      </a>
                    )}
                  </div>
                )}
              </div>
            ))}

            {sources.length === 0 && (
              <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
                <div className="w-16 h-16 bg-gray-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <Database className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-1">No sources available</h3>
                <p className="text-sm text-gray-600">Sources for this metric haven't been added yet</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
