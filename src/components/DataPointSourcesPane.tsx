import { ExternalLink, X } from "lucide-react";
import { SlideDataPoint } from "../types/slideData";
import { useState } from "react";

interface DataPointSourcesPaneProps {
  dataPoint: SlideDataPoint | null;
  onClose: () => void;
}

interface SourceCardProps {
  url: string;
  screenshot?: string;
  isGroundTruth?: boolean;
}

function SourceCard({ url, screenshot, isGroundTruth = false }: SourceCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

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

  const hasScreenshot = Boolean(screenshot);
  const shouldShowPreview = isHovered && hasScreenshot;

  const cardClasses = isGroundTruth
    ? "block p-4 bg-white border-2 border-amber-300/60 rounded-lg hover:border-amber-400/80 hover:shadow-md transition-all group"
    : "block p-4 bg-[var(--volute-surface)] border border-[var(--volute-border)] rounded-lg hover:border-[var(--volute-accent)] hover:bg-[var(--volute-surface-2)] transition-all group";

  return (
    <div className="relative">
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className={cardClasses}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className={`text-sm ${isGroundTruth ? 'font-semibold text-gray-900' : 'font-medium text-[var(--volute-text-primary)]'} mb-1 group-hover:text-[var(--volute-accent)] transition-colors`}>
              {formatUrl(url).domain}
            </div>
            <div className={`text-xs ${isGroundTruth ? 'text-gray-600' : 'text-[var(--volute-text-muted)]'} truncate`}>
              {formatUrl(url).path || formatUrl(url).full}
            </div>
          </div>
          <ExternalLink className={`w-4 h-4 ${isGroundTruth ? 'text-gray-400' : 'text-[var(--volute-text-muted)]'} group-hover:text-[var(--volute-accent)] flex-shrink-0 transition-colors`} />
        </div>
      </a>

      {/* Screenshot Preview */}
      {shouldShowPreview && (
        <div className="mt-2 overflow-hidden rounded-lg border-2 border-[var(--volute-accent)] shadow-lg bg-white transition-all duration-200 ease-out animate-in fade-in slide-in-from-top-2">
          <img
            src={screenshot}
            alt={`Screenshot of ${formatUrl(url).domain}`}
            className="w-full h-auto"
            style={{
              maxHeight: '400px',
              objectFit: 'cover',
              opacity: imageLoaded ? 1 : 0,
              transition: 'opacity 200ms ease-in'
            }}
            onLoad={() => setImageLoaded(true)}
          />
          {!imageLoaded && (
            <div className="flex items-center justify-center h-48 bg-gray-100">
              <div className="text-sm text-gray-500">Loading preview...</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function DataPointSourcesPane({ dataPoint, onClose }: DataPointSourcesPaneProps) {
  if (!dataPoint) return null;

  const groundTruthUrl = dataPoint.sourceUrls[0];
  const referenceUrls = dataPoint.sourceUrls.slice(1);
  const screenshots = dataPoint.screenshots || {};

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
            <SourceCard
              url={groundTruthUrl}
              screenshot={screenshots[groundTruthUrl]}
              isGroundTruth={true}
            />
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
                <SourceCard
                  key={index}
                  url={url}
                  screenshot={screenshots[url]}
                  isGroundTruth={false}
                />
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