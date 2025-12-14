import { useEffect, useRef, useState } from 'react';
import DOMPurify from 'dompurify';
import Mark from 'mark.js';
import { SourceHighlight } from '../types';
import { AlertCircle, Loader2 } from 'lucide-react';

interface HtmlSourceViewerProps {
  contentPath?: string;
  contentUrl?: string;
  highlights: SourceHighlight[];
  onHighlightClick?: (highlight: SourceHighlight) => void;
}

export function HtmlSourceViewer({
  contentPath,
  contentUrl,
  highlights,
  onHighlightClick,
}: HtmlSourceViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [htmlContent, setHtmlContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch and sanitize HTML content
  useEffect(() => {
    const sourceUrl = contentPath || contentUrl;
    if (!sourceUrl) {
      setError('No content path or URL provided');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    fetch(sourceUrl)
      .then((res) => {
        if (!res.ok) {
          throw new Error(`Failed to fetch content: ${res.statusText}`);
        }
        return res.text();
      })
      .then((html) => {
        // Sanitize HTML to prevent XSS
        const clean = DOMPurify.sanitize(html, {
          ADD_TAGS: ['style'],
          ADD_ATTR: ['style'],
          ALLOW_DATA_ATTR: true,
        });
        setHtmlContent(clean);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error fetching HTML content:', err);
        setError(err.message || 'Failed to load source content');
        setLoading(false);
      });
  }, [contentPath, contentUrl]);

  // Apply highlights after content loads
  useEffect(() => {
    if (!containerRef.current || !htmlContent || highlights.length === 0) {
      return;
    }

    // Wait a bit for DOM to be ready
    const timeoutId = setTimeout(() => {
      if (!containerRef.current) return;

      const marker = new Mark(containerRef.current);

      // Clear any existing marks
      marker.unmark();

      // Apply each highlight
      highlights.forEach((highlight, index) => {
        marker.mark(highlight.searchText, {
          element: 'mark',
          className: `source-highlight highlight-${index}`,
          separateWordSearch: false,
          accuracy: {
            value: 'exactly',
            limiters: [',', '.', ':', ';', '!', '?', '-', '(', ')'],
          },
          filter: (node, term, totalCounter, counter) => {
            // If context is provided, validate it
            if (highlight.contextBefore || highlight.contextAfter) {
              const textContent = node.parentNode?.textContent || '';
              const highlightIndex = textContent.indexOf(term);

              if (highlightIndex !== -1) {
                const before = textContent.substring(
                  Math.max(0, highlightIndex - 50),
                  highlightIndex
                );
                const after = textContent.substring(
                  highlightIndex + term.length,
                  highlightIndex + term.length + 50
                );

                // Check if context matches
                const beforeMatches = !highlight.contextBefore ||
                  before.includes(highlight.contextBefore);
                const afterMatches = !highlight.contextAfter ||
                  after.includes(highlight.contextAfter);

                return beforeMatches && afterMatches;
              }
            }
            return true;
          },
          done: (counter) => {
            if (counter === 0) {
              console.warn(
                `No matches found for highlight: "${highlight.searchText}"`
              );
            }
          },
        });
      });

      // Scroll to first highlight
      setTimeout(() => {
        const firstMark = containerRef.current?.querySelector('.source-highlight');
        if (firstMark) {
          firstMark.scrollIntoView({
            behavior: 'smooth',
            block: 'center',
          });

          // Add active class to first highlight
          firstMark.classList.add('active');
        }
      }, 100);
    }, 100);

    return () => clearTimeout(timeoutId);
  }, [htmlContent, highlights]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400 mx-auto mb-2" />
          <p className="text-gray-600">Loading source content...</p>
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
            Failed to Load Content
          </h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <p className="text-sm text-gray-500">
            The source content may have been moved or is temporarily unavailable.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="html-viewer p-8 bg-white overflow-auto max-w-6xl mx-auto"
      dangerouslySetInnerHTML={{ __html: htmlContent }}
      style={{
        fontFamily: 'Georgia, serif',
        fontSize: '16px',
        lineHeight: '1.6',
        color: '#333',
      }}
    />
  );
}
