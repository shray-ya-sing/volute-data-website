import { useEffect, useRef, useState } from 'react';
import DOMPurify from 'dompurify';
import Mark from 'mark.js';
import { SourceHighlight } from '../types';
import { AlertCircle, Loader2, Maximize2, Minimize2 } from 'lucide-react';

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
  const snippetRef = useRef<HTMLDivElement>(null);
  const [htmlContent, setHtmlContent] = useState('');
  const [snippetText, setSnippetText] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

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
        // Sanitize HTML to prevent XSS, but preserve SingleFile formatting
        const clean = DOMPurify.sanitize(html, {
          // Allow all standard HTML tags
          ALLOWED_TAGS: [
            'a', 'abbr', 'address', 'area', 'article', 'aside', 'audio',
            'b', 'base', 'bdi', 'bdo', 'blockquote', 'body', 'br', 'button',
            'canvas', 'caption', 'cite', 'code', 'col', 'colgroup',
            'data', 'datalist', 'dd', 'del', 'details', 'dfn', 'dialog', 'div', 'dl', 'dt',
            'em', 'embed', 'fieldset', 'figcaption', 'figure', 'footer', 'form',
            'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'head', 'header', 'hgroup', 'hr', 'html',
            'i', 'iframe', 'img', 'input', 'ins', 'kbd',
            'label', 'legend', 'li', 'link', 'main', 'map', 'mark', 'meta', 'meter',
            'nav', 'noscript', 'object', 'ol', 'optgroup', 'option', 'output',
            'p', 'param', 'picture', 'pre', 'progress', 'q',
            'rp', 'rt', 'ruby', 's', 'samp', 'section', 'select', 'small', 'source', 'span',
            'strong', 'style', 'sub', 'summary', 'sup', 'svg',
            'table', 'tbody', 'td', 'template', 'textarea', 'tfoot', 'th', 'thead', 'time',
            'title', 'tr', 'track', 'u', 'ul', 'var', 'video', 'wbr'
          ],
          // Allow all standard and data attributes
          ALLOWED_ATTR: [
            'style', 'class', 'id', 'href', 'src', 'alt', 'title', 'width', 'height',
            'data-*', 'aria-*', 'role', 'tabindex', 'target', 'rel',
            'type', 'name', 'value', 'placeholder', 'readonly', 'disabled',
            'colspan', 'rowspan', 'headers', 'scope',
            'cellpadding', 'cellspacing', 'border',
            'align', 'valign', 'bgcolor', 'color', 'face', 'size'
          ],
          // Allow data URLs for images/resources embedded by SingleFile
          ALLOWED_URI_REGEXP: /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|sms|cid|xmpp|data):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
          // Keep all data attributes
          ALLOW_DATA_ATTR: true,
          // Keep unknown protocols (for data URLs)
          ALLOW_UNKNOWN_PROTOCOLS: true,
          // Keep style tags with full CSS
          ADD_TAGS: ['style', 'link'],
          ADD_ATTR: ['style'],
        });
        setHtmlContent(clean);

        // Extract snippet from HTML if highlights exist
        if (highlights.length > 0) {
          const tempDiv = document.createElement('div');
          tempDiv.innerHTML = clean;
          const plainText = tempDiv.textContent || tempDiv.innerText || '';

          // Find the first highlight in the text (case-insensitive)
          const firstHighlight = highlights[0].searchText;
          const lowerText = plainText.toLowerCase();
          const lowerHighlight = firstHighlight.toLowerCase();
          const highlightIndex = lowerText.indexOf(lowerHighlight);

          if (highlightIndex !== -1) {
            const contextLength = 400;
            const start = Math.max(0, highlightIndex - contextLength);
            const end = Math.min(plainText.length, highlightIndex + firstHighlight.length + contextLength);

            let snippet = plainText.substring(start, end);

            // Clean up extra whitespace while preserving single spaces
            snippet = snippet.replace(/\s+/g, ' ').trim();

            // Add ellipsis if truncated
            if (start > 0) snippet = '...' + snippet;
            if (end < plainText.length) snippet = snippet + '...';

            setSnippetText(snippet);
          } else {
            console.warn(`Could not find highlight text "${firstHighlight}" in extracted content`);
            // Fallback: show first 800 characters if we can't find the highlight
            let snippet = plainText.substring(0, 800).replace(/\s+/g, ' ').trim();
            if (plainText.length > 800) snippet = snippet + '...';
            setSnippetText(snippet);
          }
        }

        setLoading(false);
      })
      .catch((err) => {
        console.error('Error fetching HTML content:', err);
        setError(err.message || 'Failed to load source content');
        setLoading(false);
      });
  }, [contentPath, contentUrl, highlights]);

  // Apply highlights to snippet view
  useEffect(() => {
    if (!snippetRef.current || !snippetText || highlights.length === 0 || isExpanded) {
      return;
    }

    const timeoutId = setTimeout(() => {
      if (!snippetRef.current) return;

      const marker = new Mark(snippetRef.current);
      marker.unmark();

      highlights.forEach((highlight, index) => {
        marker.mark(highlight.searchText, {
          element: 'mark',
          className: `source-highlight highlight-${index}`,
          separateWordSearch: false,
          accuracy: 'complementary',
          done: (counter) => {
            if (counter === 0) {
              console.warn(`No matches found in snippet for: "${highlight.searchText}"`);
            } else {
              console.log(`Highlighted ${counter} matches in snippet for: "${highlight.searchText}"`);
            }
          },
        });
      });
    }, 50);

    return () => clearTimeout(timeoutId);
  }, [snippetText, highlights, isExpanded]);

  // Apply highlights to full article view
  useEffect(() => {
    if (!containerRef.current || !htmlContent || highlights.length === 0 || !isExpanded) {
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
        // If CSS selector is provided, use it to target specific element
        if (highlight.cssSelector) {
          try {
            const targetElement = containerRef.current?.querySelector(highlight.cssSelector);
            if (targetElement) {
              // Create a Mark instance for the specific element
              const scopedMarker = new Mark(targetElement);
              scopedMarker.mark(highlight.searchText, {
                element: 'mark',
                className: `source-highlight highlight-${index}`,
                separateWordSearch: false,
                accuracy: {
                  value: 'partially',
                  limiters: [',', '.', ':', ';', '!', '?', '-', '(', ')'],
                },
                done: (counter) => {
                  if (counter === 0) {
                    console.warn(
                      `No matches found for highlight with selector "${highlight.cssSelector}": "${highlight.searchText}"`
                    );
                  } else {
                    console.log(`Found ${counter} matches for "${highlight.searchText}" using selector "${highlight.cssSelector}"`);
                  }
                },
              });
            } else {
              console.warn(`Element not found for CSS selector: "${highlight.cssSelector}"`);
            }
          } catch (err) {
            console.error(`Invalid CSS selector: "${highlight.cssSelector}"`, err);
          }
        } else {
          // Fallback to global text search (original behavior)
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
        }
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
  }, [htmlContent, highlights, isExpanded]);

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

  // Snippet View
  if (!isExpanded && snippetText) {
    return (
      <div className="flex flex-col h-full bg-white">
        {/* Expand button */}
        <div className="flex-shrink-0 flex items-center justify-between px-4 py-2 bg-gray-50 border-b border-gray-200">
          <span className="text-xs font-medium text-gray-600">Snippet View</span>
          <button
            onClick={() => setIsExpanded(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors"
            title="Expand to full article"
          >
            <Maximize2 className="w-3.5 h-3.5" />
            <span>Read Full Article</span>
          </button>
        </div>

        {/* Snippet content */}
        <div className="flex-1 overflow-auto px-6 py-4">
          <div
            ref={snippetRef}
            className="text-gray-800 leading-relaxed text-sm"
            style={{ whiteSpace: 'pre-wrap' }}
          >
            {snippetText}
          </div>
        </div>
      </div>
    );
  }

  // Full Article View
  return (
    <div className="flex flex-col h-full">
      {/* Collapse button */}
      {snippetText && (
        <div className="flex-shrink-0 flex items-center justify-between px-4 py-2 bg-gray-50 border-b border-gray-200">
          <span className="text-xs font-medium text-gray-600">Full Article</span>
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

      {/* Full content */}
      <div className="flex-1 overflow-auto">
        <div
          ref={containerRef}
          className="html-viewer bg-white w-full h-full"
          dangerouslySetInnerHTML={{ __html: htmlContent }}
        />
      </div>
    </div>
  );
}
