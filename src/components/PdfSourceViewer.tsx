import { useState, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { SourceHighlight } from '../types';
import { AlertCircle, Loader2, ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from 'lucide-react';

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

  return (
    <div className="pdf-viewer relative flex flex-col items-center min-h-full">
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
  );
}
