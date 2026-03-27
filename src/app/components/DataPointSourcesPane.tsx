import { ExternalLink, X } from "lucide-react";
import { SlideDataPoint } from "../types/slideData";

interface DataPointSourcesPaneProps {
  dataPoint: SlideDataPoint | null;
  onClose: () => void;
}

export function DataPointSourcesPane({ dataPoint, onClose }: DataPointSourcesPaneProps) {
  if (!dataPoint) return null;

  const groundTruthUrl = dataPoint.sourceUrls[0];
  const referenceUrls = dataPoint.sourceUrls.slice(1);

  const formatUrl = (url: string) => {
    try {
      const urlObj = new URL(url);
      return {
        domain: urlObj.hostname.replace('www.', ''),
        path: urlObj.pathname + urlObj.search,
        full: url
      };
    } catch {
      return { domain: url, path: '', full: url };
    }
  };

  return (
    <div className="h-full flex flex-col bg-[var(--volute-bg)] border-l border-[var(--volute-border)]">
      {/* Header */}
      <div className="flex items-center justify-end p-4 bg-[var(--volute-bg)]">
        <button
          onClick={onClose}
          className="p-2 hover:bg-[var(--volute-surface-2)] rounded-lg transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5 text-[var(--volute-text-muted)]" />
        </button>
      </div>

      {/* Sources */}
      <div className="flex-1 overflow-y-auto p-6">
        {/* Ground Truth URL */}
        {groundTruthUrl && (
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-3">
              <div className="text-sm font-semibold text-[var(--volute-text-primary)]">
                Ground Truth Source
              </div>
            </div>
            <a
              href={groundTruthUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="block p-4 bg-white border-2 border-amber-300/60 rounded-lg hover:border-amber-400/80 hover:shadow-md transition-all group"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-gray-900 mb-1 group-hover:text-[var(--volute-accent)] transition-colors">
                    {formatUrl(groundTruthUrl).domain}
                  </div>
                  <div className="text-xs text-gray-600 truncate">
                    {formatUrl(groundTruthUrl).path || formatUrl(groundTruthUrl).full}
                  </div>
                </div>
                <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-[var(--volute-accent)] flex-shrink-0 transition-colors" />
              </div>
            </a>
          </div>
        )}

        {/* Reference URLs */}
        {referenceUrls.length > 0 && (
          <div>
            <div className="text-sm font-semibold text-[var(--volute-text-primary)] mb-3">
              Reference Sources ({referenceUrls.length})
            </div>
            <div className="space-y-2">
              {referenceUrls.map((url, index) => (
                <a
                  key={index}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block p-4 bg-[var(--volute-surface)] border border-[var(--volute-border)] rounded-lg hover:border-[var(--volute-accent)] hover:bg-[var(--volute-surface-2)] transition-all group"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-[var(--volute-text-primary)] mb-1 group-hover:text-[var(--volute-accent)] transition-colors">
                        {formatUrl(url).domain}
                      </div>
                      <div className="text-xs text-[var(--volute-text-muted)] truncate">
                        {formatUrl(url).path || formatUrl(url).full}
                      </div>
                    </div>
                    <ExternalLink className="w-4 h-4 text-[var(--volute-text-muted)] group-hover:text-[var(--volute-accent)] flex-shrink-0 transition-colors" />
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {!groundTruthUrl && referenceUrls.length === 0 && (
          <div className="text-center py-12">
            <div className="text-[var(--volute-text-muted)] text-sm">
              No sources available for this data point
            </div>
          </div>
        )}
      </div>
    </div>
  );
}