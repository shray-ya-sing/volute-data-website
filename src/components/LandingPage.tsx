import { useState } from 'react';
import { ArrowRight, Loader2, Sparkles, FileText, Download, Presentation, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface AgentFile {
  filename: string;
  path: string;
  content: string;
}

interface Source {
  url: string;
  title: string;
  score: number;
  textPreview: string;
  searchQuery: string;
}

interface AgentResponse {
  sandboxId: string;
  finalResponse?: string;
  events: any[];
  files: AgentFile[];
  exitCode: number;
  sourcesMap?: Record<string, Source>;
}

const popularSearches = [
  'clinical trials for depression treatment',
  'BrightSpring acquisition',
  'Alto Neuroscience IPO',
  'healthcare pharmacy deals',
  'neuroscience drug development'
];

export function LandingPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [agentText, setAgentText] = useState<string | null>(null);
  const [sourcesMap, setSourcesMap] = useState<Record<string, Source>>({});
  const [generatedFiles, setGeneratedFiles] = useState<AgentFile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeSandboxId, setActiveSandboxId] = useState<string | null>(null);

  const handleSearch = async (query: string) => {
    if (!query.trim()) return;

    setIsLoading(true);
    setError(null);
    setAgentText(null);
    setGeneratedFiles([]);
    setSourcesMap({});

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          query: query.trim(),
          sandboxId: activeSandboxId
        }),
      });

      if (!response.ok) throw new Error(`Analysis failed: ${response.statusText}`);

      const data: AgentResponse = await response.json();
      setActiveSandboxId(data.sandboxId);
      
      setAgentText(data.finalResponse || "Analysis complete, but no text summary was provided.");
      setSourcesMap(data.sourcesMap || {});
      setGeneratedFiles(data.files || []);
      
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const downloadFile = (file: AgentFile) => {
    const byteCharacters = atob(file.content);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { 
      type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' 
    });
    
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = file.filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  };

  // Enhanced component to render markdown with inline citations
  const MarkdownWithCitations = ({ text }: { text: string }) => {
    // First, replace URLs with citation references
    const processTextWithCitations = (content: string): string => {
      const urlRegex = /(https?:\/\/[^\s]+)/g;
      let processedText = content;
      const urlMap = new Map<string, number>();
      let citationNumber = 1;

      // Replace each URL with a citation marker
      processedText = processedText.replace(urlRegex, (url) => {
        // Find matching source
        const sourceEntry = Object.entries(sourcesMap).find(([_, source]) => 
          source.url === url
        );
        
        if (sourceEntry) {
          const [sourceId] = sourceEntry;
          return `[^${sourceId}]`;
        }
        return `[^${citationNumber++}]`;
      });

      return processedText;
    };

    const processedText = processTextWithCitations(text);

    return (
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Headings
          h1: ({ node, ...props }) => (
            <h1 className="text-3xl font-bold text-gray-900 mb-4 mt-8 pb-2 border-b-2 border-blue-200" {...props} />
          ),
          h2: ({ node, ...props }) => (
            <h2 className="text-2xl font-bold text-gray-800 mb-3 mt-6 pb-1 border-b border-gray-200" {...props} />
          ),
          h3: ({ node, ...props }) => (
            <h3 className="text-xl font-semibold text-gray-800 mb-2 mt-5" {...props} />
          ),
          h4: ({ node, ...props }) => (
            <h4 className="text-lg font-semibold text-gray-700 mb-2 mt-4" {...props} />
          ),
          
          // Paragraphs
          p: ({ node, children, ...props }) => {
            const content = String(children);
            // Check if paragraph contains citation markers
            if (content.includes('[^')) {
              return (
                <p className="text-gray-700 leading-relaxed mb-4" {...props}>
                  <TextWithCitationBadges text={content} />
                </p>
              );
            }
            return (
              <p className="text-gray-700 leading-relaxed mb-4" {...props}>
                {children}
              </p>
            );
          },
          
          // Lists
          ul: ({ node, ...props }) => (
            <ul className="list-none space-y-2 mb-4 ml-0" {...props} />
          ),
          ol: ({ node, ...props }) => (
            <ol className="list-decimal list-inside space-y-2 mb-4 ml-4" {...props} />
          ),
          li: ({ node, children, ...props }) => {
            const content = String(children);
            return (
              <li className="text-gray-700 pl-2 relative" {...props}>
                <span className="absolute left-0 top-0 text-blue-600 font-bold">•</span>
                <span className="pl-4">
                  {content.includes('[^') ? (
                    <TextWithCitationBadges text={content} />
                  ) : (
                    children
                  )}
                </span>
              </li>
            );
          },
          
          // Strong/Bold
          strong: ({ node, ...props }) => (
            <strong className="font-bold text-gray-900" {...props} />
          ),
          
          // Emphasis/Italic
          em: ({ node, ...props }) => (
            <em className="italic text-gray-800" {...props} />
          ),
          
          // Links (in case there are any remaining)
          a: ({ node, ...props }) => (
            <a 
              className="text-blue-600 hover:text-blue-800 underline font-medium" 
              target="_blank"
              rel="noopener noreferrer"
              {...props} 
            />
          ),
          
          // Code blocks
          // Replace the code component in the MarkdownWithCitations component with this:

          code: ({ node, className, children, ...props }) => {
            // Check if it's inline code by looking at the className or parent node
            const isInline = !className?.includes('language-');
            
            if (isInline) {
              return (
                <code className="px-1.5 py-0.5 bg-gray-100 text-pink-600 rounded text-sm font-mono" {...props}>
                  {children}
                </code>
              );
            }
            return (
              <code className="block p-4 bg-gray-900 text-gray-100 rounded-lg text-sm font-mono overflow-x-auto mb-4" {...props}>
                {children}
              </code>
            );
          },
          
          // Blockquotes
          blockquote: ({ node, ...props }) => (
            <blockquote className="border-l-4 border-blue-500 pl-4 italic text-gray-700 my-4 bg-blue-50 py-2" {...props} />
          ),
          
          // Horizontal rules
          hr: ({ node, ...props }) => (
            <hr className="my-8 border-t-2 border-gray-200" {...props} />
          ),
        }}
      >
        {processedText}
      </ReactMarkdown>
    );
  };

  // Component to parse citation markers and replace with badges
  const TextWithCitationBadges = ({ text }: { text: string }) => {
    const citationRegex = /\[\^(\d+)\]/g;
    const parts: (string | JSX.Element)[] = [];
    let lastIndex = 0;
    let match;

    while ((match = citationRegex.exec(text)) !== null) {
      const citationId = match[1];
      const matchIndex = match.index;
      
      // Add text before the citation
      if (matchIndex > lastIndex) {
        parts.push(text.substring(lastIndex, matchIndex));
      }

      // Add citation badge
      const source = sourcesMap[citationId];
      if (source) {
        parts.push(
          <CitationBadge 
            key={`cite-${matchIndex}`}
            citationNumber={parseInt(citationId)}
            source={source}
          />
        );
      }

      lastIndex = match.index + match[0].length;
    }

    // Add any remaining text
    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }

    return <>{parts}</>;
  };

  // Citation Badge Component with Tooltip
  const CitationBadge = ({ citationNumber, source }: { citationNumber: number; source: Source }) => {
    const [showTooltip, setShowTooltip] = useState(false);

    return (
      <span className="relative inline-block mx-0.5 align-super">
        <a
          href={source.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-bold bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-all hover:scale-105 cursor-pointer no-underline"
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
          onClick={(e) => e.stopPropagation()}
        >
          <span>{citationNumber}</span>
          <ExternalLink className="size-2.5" />
        </a>
        
        {/* Tooltip */}
        <AnimatePresence>
          {showTooltip && (
            <motion.div
              initial={{ opacity: 0, y: 5, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 5, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-80 p-3 bg-gray-900 text-white text-xs rounded-lg shadow-2xl z-50 pointer-events-none"
              style={{ maxWidth: 'calc(100vw - 2rem)' }}
            >
              <div className="font-semibold mb-1 line-clamp-2">{source.title}</div>
              <div className="text-blue-300 text-[10px] mb-2 break-all line-clamp-1 hover:line-clamp-none">
                {source.url}
              </div>
              <div className="text-gray-300 text-[10px] line-clamp-3">
                {source.textPreview}
              </div>
              {/* Arrow */}
              <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1">
                <div className="border-4 border-transparent border-t-gray-900"></div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Background UI */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
        <div className="absolute top-40 right-10 w-72 h-72 bg-yellow-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-8 left-20 w-72 h-72 bg-pink-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000"></div>
      </div>

      <div className="relative max-w-6xl mx-auto p-8 min-h-screen flex flex-col justify-center">
        <div className="max-w-4xl mx-auto w-full">

          {/* Search Bar */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="relative mb-8">
            <div className="relative backdrop-blur-2xl bg-white/80 rounded-2xl shadow-[0_8px_32px_0_rgba(0,0,0,0.1)] border border-white/60 p-1.5 flex items-center gap-2">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch(searchQuery)}
                placeholder="Ask for an analysis or a PowerPoint (e.g., 'Make a slide for BrightSpring')..."
                className="flex-1 px-6 py-5 rounded-xl bg-white/50 focus:outline-none focus:bg-white/70 text-gray-800 placeholder:text-gray-400"
                disabled={isLoading}
              />
              <button
                onClick={() => handleSearch(searchQuery)}
                disabled={isLoading || !searchQuery.trim()}
                className="px-6 py-5 bg-black text-white rounded-xl hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:shadow-lg"
              >
                {isLoading ? <Loader2 className="size-5 animate-spin" /> : <ArrowRight className="size-5" />}
              </button>
            </div>
          </motion.div>

          {/* Error Display */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 flex items-start gap-3"
            >
              <span className="text-red-500 font-bold">⚠</span>
              <span>{error}</span>
            </motion.div>
          )}

          {/* Results Area */}
          <AnimatePresence mode="wait">
            {(agentText || generatedFiles.length > 0) && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-6"
              >
                {/* File Downloads (PowerPoints) */}
                {generatedFiles.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {generatedFiles.map((file, idx) => (
                      <motion.div
                        key={idx}
                        initial={{ scale: 0.95, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: idx * 0.1 }}
                        className="flex items-center justify-between p-4 bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-xl shadow-lg border border-blue-400/30 hover:shadow-xl transition-all hover:scale-[1.02]"
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="p-2 bg-white/20 rounded-lg flex-shrink-0">
                            <Presentation className="size-6" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold truncate">{file.filename}</p>
                            <p className="text-[10px] opacity-80 uppercase tracking-widest">PowerPoint Document</p>
                          </div>
                        </div>
                        <button
                          onClick={() => downloadFile(file)}
                          className="p-2 hover:bg-white/10 rounded-full transition-colors flex-shrink-0 ml-2"
                          title="Download Presentation"
                        >
                          <Download className="size-5" />
                        </button>
                      </motion.div>
                    ))}
                  </div>
                )}

                {/* Agent Analysis Text with Enhanced Markdown and Citations */}
                {agentText && (
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="backdrop-blur-xl bg-white/95 rounded-2xl p-8 shadow-xl border border-white/60"
                  >
                    <div className="max-w-none">
                      <MarkdownWithCitations text={agentText} />
                    </div>
                  </motion.div>
                )}

                {/* Sources Reference Section */}
                {Object.keys(sourcesMap).length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="backdrop-blur-xl bg-white/80 rounded-2xl p-6 shadow-lg border border-white/60"
                  >
                    <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                      <FileText className="size-5 text-blue-600" />
                      Sources & References
                    </h3>
                    <div className="space-y-3">
                      {Object.entries(sourcesMap)
                        .sort(([a], [b]) => parseInt(a) - parseInt(b))
                        .map(([id, source]) => (
                        <div key={id} className="flex gap-3 text-sm group hover:bg-blue-50/50 p-2 rounded-lg transition-colors">
                          <span className="flex-shrink-0 flex items-center justify-center w-7 h-7 bg-blue-100 text-blue-700 rounded-full text-xs font-bold">
                            {id}
                          </span>
                          <div className="flex-1 min-w-0">
                            <a
                              href={source.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-medium text-gray-900 hover:text-blue-600 transition-colors line-clamp-2 flex items-start gap-1.5 group"
                            >
                              <span className="flex-1">{source.title}</span>
                              <ExternalLink className="size-3.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-0.5" />
                            </a>
                            <p className="text-xs text-gray-500 truncate mt-1" title={source.url}>
                              {source.url}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Loading State */}
          {isLoading && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-20"
            >
              <div className="inline-block p-4 bg-white/80 rounded-2xl shadow-lg mb-4">
                <Loader2 className="size-12 animate-spin text-blue-600" />
              </div>
              <p className="text-gray-700 font-semibold text-lg">Analyzing your request...</p>
              <p className="text-gray-500 text-sm mt-2">The AI agent is gathering information and generating content</p>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}