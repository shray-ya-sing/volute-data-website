import { useState, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { SourceHighlight } from '../types';
import { AlertCircle, Loader2, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Maximize2, Minimize2 } from 'lucide-react';

// Set up PDF.js worker - use local worker file to avoid CORS issues
pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';

interface PdfSourceViewerProps {
  contentPath?: string;
  contentUrl?: string;
  highlights: SourceHighlight[];
  onHighlightClick?: (highlight: SourceHighlight) => void;
}

export function PdfSourceViewer({
  contentPath,
  contentUrl,
  highlights,
  onHighlightClick,
}: PdfSourceViewerProps) {
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);

  const sourceUrl = contentPath || contentUrl;

  // Jump to first highlight page when highlights change
  useEffect(() => {
    if (highlights.length > 0 && highlights[0].pageNumber) {
      setCurrentPage(highlights[0].pageNumber);
    }
  }, [highlights]);

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
    setLoading(false);
  }

  function onDocumentLoadError(error: Error) {
    console.error('Error loading PDF:', error);
    setError(error.message || 'Failed to load PDF');
    setLoading(false);
  }

  function handlePreviousPage() {
    setCurrentPage((page) => Math.max(1, page - 1));
  }

  function handleNextPage() {
    setCurrentPage((page) => Math.min(numPages, page + 1));
  }

  function handleZoomIn() {
    setScale((s) => Math.min(2.5, s + 0.25));
  }

  function handleZoomOut() {
    setScale((s) => Math.max(0.5, s - 0.25));
  }

  // Get highlights for current page
  const currentPageHighlights = highlights.filter(
    (h) => h.pageNumber === currentPage && h.boundingBox
  );

  // Calculate snippet view parameters
  const snippetView = !isExpanded && currentPageHighlights.length > 0 ? (() => {
    const firstHighlight = currentPageHighlights[0];
    const bbox = firstHighlight.boundingBox!;

    // Add padding around the bounding box (in PDF units)
    const padding = 100;
    const snippetWidth = bbox.width + (padding * 2);
    const snippetHeight = bbox.height + (padding * 2);

    // Calculate scale to fit snippet in viewport (assume 600px width for snippet container)
    const targetWidth = 600;
    const snippetScale = targetWidth / snippetWidth;

    // Calculate offset to center on bounding box
    const offsetX = (bbox.x - padding) * snippetScale;
    const offsetY = (bbox.y - padding) * snippetScale;

    return {
      scale: snippetScale,
      offsetX,
      offsetY,
      width: snippetWidth * snippetScale,
      height: snippetHeight * snippetScale,
    };
  })() : null;

  if (!sourceUrl) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-50">
        <div className="text-center max-w-md p-6">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            No PDF Source
          </h3>
          <p className="text-gray-600">
            No content path or URL provided for this PDF source.
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-50">
        <div className="text-center max-w-md p-6">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Failed to Load PDF
          </h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <p className="text-sm text-gray-500">
            The PDF may have been moved or is temporarily unavailable.
          </p>
        </div>
      </div>
    );
  }

  // Snippet View
  if (snippetView && !isExpanded) {
    return (
      <div className="flex flex-col h-full bg-white">
        {/* Expand button */}
        <div className="flex-shrink-0 flex items-center justify-between px-4 py-2 bg-gray-50 border-b border-gray-200">
          <span className="text-xs font-medium text-gray-600">Snippet View - Page {currentPage}</span>
          <button
            onClick={() => setIsExpanded(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors"
            title="View full document"
          >
            <Maximize2 className="w-3.5 h-3.5" />
            <span>View Full Document</span>
          </button>
        </div>

        {/* Snippet content - cropped PDF */}
        <div className="flex-1 overflow-hidden flex items-center justify-center bg-gray-100 p-4">
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-900/50 z-10">
              <div className="text-center">
                <Loader2 className="w-8 h-8 animate-spin text-white mx-auto mb-2" />
                <p className="text-white">Loading PDF...</p>
              </div>
            </div>
          )}

          <div
            className="relative bg-white shadow-lg"
            style={{
              width: `${snippetView.width}px`,
              height: `${snippetView.height}px`,
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                position: 'absolute',
                left: `-${snippetView.offsetX}px`,
                top: `-${snippetView.offsetY}px`,
              }}
            >
              <Document
                file={sourceUrl}
                onLoadSuccess={onDocumentLoadSuccess}
                onLoadError={onDocumentLoadError}
                loading={null}
              >
                <Page
                  pageNumber={currentPage}
                  scale={snippetView.scale}
                  renderTextLayer={true}
                  renderAnnotationLayer={false}
                  loading={null}
                />
              </Document>

              {/* Highlight Overlays */}
              {currentPageHighlights.length > 0 && (
                <div className="absolute top-0 left-0 pointer-events-none">
                  {currentPageHighlights.map((highlight, idx) => (
                    <div
                      key={idx}
                      className="pdf-highlight"
                      style={{
                        position: 'absolute',
                        left: `${highlight.boundingBox!.x * snippetView.scale}px`,
                        top: `${highlight.boundingBox!.y * snippetView.scale}px`,
                        width: `${highlight.boundingBox!.width * snippetView.scale}px`,
                        height: `${highlight.boundingBox!.height * snippetView.scale}px`,
                        backgroundColor: highlight.highlightColor || '#FFEB3B',
                        opacity: 0.4,
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Full Document View
  return (
    <div className="flex flex-col h-full">
      {/* Collapse button */}
      {snippetView && (
        <div className="flex-shrink-0 flex items-center justify-between px-4 py-2 bg-gray-50 border-b border-gray-200">
          <span className="text-xs font-medium text-gray-600">Full Document</span>
          <button
            onClick={() => setIsExpanded(false)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors"
            title="Back to snippet"
          >
            <Minimize2 className="w-3.5 h-3.5" />
            <span>Back to Snippet</span>
          </button>
        </div>
      )}

      <div className="flex-1 overflow-auto">
        <div className="pdf-viewer relative flex flex-col items-center min-h-full py-8">
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-900/50 z-10">
              <div className="text-center">
                <Loader2 className="w-8 h-8 animate-spin text-white mx-auto mb-2" />
                <p className="text-white">Loading PDF...</p>
              </div>
            </div>
          )}

          {/* PDF Document */}
          <div className="relative">
            <Document
              file={sourceUrl}
              onLoadSuccess={onDocumentLoadSuccess}
              onLoadError={onDocumentLoadError}
              loading={null}
            >
              <Page
                pageNumber={currentPage}
                scale={scale}
                renderTextLayer={true}
                renderAnnotationLayer={false}
                loading={null}
              />
            </Document>

            {/* Highlight Overlays */}
            {currentPageHighlights.length > 0 && (
              <div className="absolute top-0 left-0 pointer-events-none">
                {currentPageHighlights.map((highlight, idx) => (
                  <div
                    key={idx}
                    className="pdf-highlight"
                    style={{
                      position: 'absolute',
                      left: `${highlight.boundingBox!.x * scale}px`,
                      top: `${highlight.boundingBox!.y * scale}px`,
                      width: `${highlight.boundingBox!.width * scale}px`,
                      height: `${highlight.boundingBox!.height * scale}px`,
                      backgroundColor: highlight.highlightColor || '#FFEB3B',
                      opacity: 0.4,
                    }}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Controls */}
          {numPages > 0 && (
            <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-white rounded-lg shadow-lg border border-gray-200 z-20">
              <div className="flex items-center gap-1 p-2">
                {/* Page Navigation */}
                <button
                  onClick={handlePreviousPage}
                  disabled={currentPage <= 1}
                  className="p-2 hover:bg-gray-100 rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  title="Previous page"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>

                <div className="px-4 py-2 min-w-[120px] text-center">
                  <span className="text-sm text-gray-900 font-medium">
                    Page {currentPage} / {numPages}
                  </span>
                </div>

                <button
                  onClick={handleNextPage}
                  disabled={currentPage >= numPages}
                  className="p-2 hover:bg-gray-100 rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  title="Next page"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>

                <div className="w-px h-6 bg-gray-300 mx-2" />

                {/* Zoom Controls */}
                <button
                  onClick={handleZoomOut}
                  disabled={scale <= 0.5}
                  className="p-2 hover:bg-gray-100 rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  title="Zoom out"
                >
                  <ZoomOut className="w-5 h-5" />
                </button>

                <div className="px-2 py-2 min-w-[60px] text-center">
                  <span className="text-sm text-gray-600">
                    {Math.round(scale * 100)}%
                  </span>
                </div>

                <button
                  onClick={handleZoomIn}
                  disabled={scale >= 2.5}
                  className="p-2 hover:bg-gray-100 rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  title="Zoom in"
                >
                  <ZoomIn className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
