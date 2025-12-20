import { useState, useRef, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { Download, Trash2, Plus } from 'lucide-react';

// Set up PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';

interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface Highlight {
  searchText: string;
  pageNumber: number;
  boundingBox: BoundingBox;
  highlightColor?: string;
}

interface AnnotationData {
  sourceId: string;
  sourceName: string;
  metricId: string;
  metricName: string;
  highlights: Highlight[];
}

export function PdfAnnotationTool() {
  const [pdfFile, setPdfFile] = useState<string>('/source-content/astera-labs/ALAB_S1A.pdf');
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.0);

  // Annotation state
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPos, setStartPos] = useState<{ x: number; y: number } | null>(null);
  const [currentBox, setCurrentBox] = useState<BoundingBox | null>(null);
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [searchText, setSearchText] = useState<string>('');

  // Metadata for export
  const [sourceId, setSourceId] = useState<string>('src-alab-filing-s1a');
  const [sourceName, setSourceName] = useState<string>('S-1/A Filing (PDF)');
  const [metricId, setMetricId] = useState<string>('finalPrice');
  const [metricName, setMetricName] = useState<string>('Final Price');

  const pageRef = useRef<HTMLDivElement>(null);

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
  }

  function handleMouseDown(e: React.MouseEvent) {
    if (!pageRef.current) return;

    const rect = pageRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setIsDrawing(true);
    setStartPos({ x, y });
    setCurrentBox({ x, y, width: 0, height: 0 });
  }

  function handleMouseMove(e: React.MouseEvent) {
    if (!isDrawing || !startPos || !pageRef.current) return;

    const rect = pageRef.current.getBoundingClientRect();
    const currentX = e.clientX - rect.left;
    const currentY = e.clientY - rect.top;

    const width = currentX - startPos.x;
    const height = currentY - startPos.y;

    setCurrentBox({
      x: width > 0 ? startPos.x : currentX,
      y: height > 0 ? startPos.y : currentY,
      width: Math.abs(width),
      height: Math.abs(height)
    });
  }

  function handleMouseUp() {
    if (!isDrawing || !currentBox) return;

    setIsDrawing(false);

    // Only save if box has meaningful size
    if (currentBox.width > 10 && currentBox.height > 10) {
      // Normalize coordinates to unscaled values
      const normalizedBox: BoundingBox = {
        x: Math.round(currentBox.x / scale),
        y: Math.round(currentBox.y / scale),
        width: Math.round(currentBox.width / scale),
        height: Math.round(currentBox.height / scale)
      };

      const newHighlight: Highlight = {
        searchText: searchText || 'Update this text',
        pageNumber: currentPage,
        boundingBox: normalizedBox,
        highlightColor: '#FFEB3B'
      };

      setHighlights([...highlights, newHighlight]);
    }

    setCurrentBox(null);
    setStartPos(null);
  }

  function handleDeleteHighlight(index: number) {
    setHighlights(highlights.filter((_, i) => i !== index));
  }

  function handleExportJSON() {
    const data: AnnotationData = {
      sourceId,
      sourceName,
      metricId,
      metricName,
      highlights
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${sourceId}-highlights.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // Get highlights for current page
  const pageHighlights = highlights.filter(h => h.pageNumber === currentPage);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">PDF Annotation Tool</h1>
          <p className="text-sm text-gray-600">Draw bounding boxes on the PDF to capture highlight coordinates</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Panel - PDF Viewer */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            {/* PDF Controls */}
            <div className="flex items-center justify-between mb-4 pb-4 border-b">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage <= 1}
                  className="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded disabled:opacity-50"
                >
                  Prev
                </button>
                <span className="text-sm text-gray-700 min-w-[100px] text-center">
                  Page {currentPage} / {numPages}
                </span>
                <button
                  onClick={() => setCurrentPage(p => Math.min(numPages, p + 1))}
                  disabled={currentPage >= numPages}
                  className="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded disabled:opacity-50"
                >
                  Next
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setScale(s => Math.max(0.5, s - 0.25))}
                  className="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded"
                >
                  -
                </button>
                <span className="text-sm text-gray-700 min-w-[60px] text-center">
                  {Math.round(scale * 100)}%
                </span>
                <button
                  onClick={() => setScale(s => Math.min(2.5, s + 0.25))}
                  className="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded"
                >
                  +
                </button>
              </div>
            </div>

            {/* PDF Viewer */}
            <div className="relative bg-gray-800 rounded overflow-auto max-h-[800px]">
              <div
                ref={pageRef}
                className="relative inline-block cursor-crosshair"
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
              >
                <Document
                  file={pdfFile}
                  onLoadSuccess={onDocumentLoadSuccess}
                  loading={<div className="p-8 text-white">Loading PDF...</div>}
                >
                  <Page
                    pageNumber={currentPage}
                    scale={scale}
                    renderTextLayer={false}
                    renderAnnotationLayer={false}
                  />
                </Document>

                {/* Existing Highlights */}
                {pageHighlights.map((highlight, idx) => (
                  <div
                    key={idx}
                    className="absolute border-2 border-yellow-400 bg-yellow-300/30 pointer-events-none"
                    style={{
                      left: `${highlight.boundingBox.x * scale}px`,
                      top: `${highlight.boundingBox.y * scale}px`,
                      width: `${highlight.boundingBox.width * scale}px`,
                      height: `${highlight.boundingBox.height * scale}px`,
                    }}
                  >
                    <div className="absolute -top-6 left-0 bg-yellow-400 text-black text-xs px-2 py-1 rounded">
                      #{idx + 1}
                    </div>
                  </div>
                ))}

                {/* Current Drawing Box */}
                {currentBox && (
                  <div
                    className="absolute border-2 border-blue-500 bg-blue-300/20 pointer-events-none"
                    style={{
                      left: `${currentBox.x}px`,
                      top: `${currentBox.y}px`,
                      width: `${currentBox.width}px`,
                      height: `${currentBox.height}px`,
                    }}
                  />
                )}
              </div>
            </div>

            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded text-sm text-blue-800">
              <strong>Instructions:</strong> Click and drag on the PDF to draw a bounding box around the text you want to highlight.
              The coordinates will be saved automatically.
            </div>
          </div>
        </div>

        {/* Right Panel - Controls & Highlights */}
        <div className="space-y-6">
          {/* Metadata */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <h3 className="font-semibold text-gray-900 mb-3">Metadata</h3>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Source ID
                </label>
                <input
                  type="text"
                  value={sourceId}
                  onChange={(e) => setSourceId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Source Name
                </label>
                <input
                  type="text"
                  value={sourceName}
                  onChange={(e) => setSourceName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Metric ID
                </label>
                <input
                  type="text"
                  value={metricId}
                  onChange={(e) => setMetricId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Metric Name
                </label>
                <input
                  type="text"
                  value={metricName}
                  onChange={(e) => setMetricName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Search Text (for next box)
                </label>
                <input
                  type="text"
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  placeholder="e.g., $36.00"
                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                />
              </div>
            </div>
          </div>

          {/* Highlights List */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-900">
                Highlights ({highlights.length})
              </h3>
              <button
                onClick={handleExportJSON}
                disabled={highlights.length === 0}
                className="flex items-center gap-2 px-3 py-1.5 bg-black text-white text-sm rounded hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Download className="w-4 h-4" />
                Export JSON
              </button>
            </div>

            <div className="space-y-2 max-h-[500px] overflow-y-auto">
              {highlights.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-8">
                  No highlights yet. Draw a box on the PDF to create one.
                </p>
              ) : (
                highlights.map((highlight, index) => (
                  <div
                    key={index}
                    className="p-3 border border-gray-200 rounded hover:border-gray-300 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <span className="text-xs font-semibold text-gray-500">
                        #{index + 1} - Page {highlight.pageNumber}
                      </span>
                      <button
                        onClick={() => handleDeleteHighlight(index)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="text-sm space-y-1">
                      <div>
                        <span className="font-medium">Text:</span>{' '}
                        <span className="text-gray-700">{highlight.searchText}</span>
                      </div>
                      <div className="text-xs text-gray-600 font-mono">
                        x: {highlight.boundingBox.x}, y: {highlight.boundingBox.y},
                        w: {highlight.boundingBox.width}, h: {highlight.boundingBox.height}
                      </div>
                    </div>

                    {highlight.pageNumber === currentPage && (
                      <button
                        onClick={() => setCurrentPage(highlight.pageNumber)}
                        className="mt-2 text-xs text-blue-600 hover:text-blue-700"
                      >
                        Jump to page
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* PDF Selection */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <h3 className="font-semibold text-gray-900 mb-3">PDF File</h3>
            <select
              value={pdfFile}
              onChange={(e) => {
                setPdfFile(e.target.value);
                setCurrentPage(1);
                setHighlights([]);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
            >
              <option value="/source-content/astera-labs/ALAB_S1A.pdf">
                Astera Labs S-1/A
              </option>
              <option value="/source-content/rubrik/RBRK_S1A.pdf">
                Rubrik S-1/A
              </option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}
