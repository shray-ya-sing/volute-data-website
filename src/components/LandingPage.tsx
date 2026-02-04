import { useState } from 'react';
import { ArrowRight, Loader2, Sparkles, FileText, Download, Presentation, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';

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
      
      // Set the final response text
      setAgentText(data.finalResponse || "Analysis complete, but no text summary was provided.");
      
      // Set the sources map
      setSourcesMap(data.sourcesMap || {});
      
      // Set the files (PowerPoints)
      setGeneratedFiles(data.files || []);
      
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  // Function to trigger browser download of the PPTX file
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

  // Component to render text with inline citations
  const TextWithCitations = ({ text }: { text: string }) => {
    // Parse the text and replace URLs with citation badges
    const parseTextWithCitations = () => {
      // Regular expression to match URLs in the text
      const urlRegex = /(https?:\/\/[^\s]+)/g;
      const parts: JSX.Element[] = [];
      let lastIndex = 0;
      let match;
      let citationCounter = 0;

      while ((match = urlRegex.exec(text)) !== null) {
        const url = match[1];
        const matchIndex = match.index;
        
        // Add text before the URL
        if (matchIndex > lastIndex) {
          const textBefore = text.substring(lastIndex, matchIndex);
          parts.push(
            <span key={`text-${lastIndex}`}>{textBefore}</span>
          );
        }

        // Find the source that matches this URL
        const sourceEntry = Object.entries(sourcesMap).find(([_, source]) => 
          source.url === url
        );

        if (sourceEntry) {
          const [sourceId, source] = sourceEntry;
          citationCounter++;
          
          parts.push(
            <CitationBadge 
              key={`cite-${matchIndex}`}
              citationNumber={parseInt(sourceId)}
              source={source}
            />
          );
        } else {
          // If no matching source found, just show the URL as a link
          parts.push(
            <a 
              key={`link-${matchIndex}`}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 underline"
            >
              [source]
            </a>
          );
        }

        lastIndex = match.index + match[0].length;
      }

      // Add any remaining text
      if (lastIndex < text.length) {
        parts.push(
          <span key={`text-${lastIndex}`}>{text.substring(lastIndex)}</span>
        );
      }

      return parts;
    };

    return <div className="whitespace-pre-wrap">{parseTextWithCitations()}</div>;
  };

  // Citation Badge Component with Tooltip
  const CitationBadge = ({ citationNumber, source }: { citationNumber: number; source: Source }) => {
    const [showTooltip, setShowTooltip] = useState(false);

    return (
      <span className="relative inline-block mx-0.5">
        <a
          href={source.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-semibold bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors cursor-pointer no-underline"
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
              className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-80 p-3 bg-gray-900 text-white text-xs rounded-lg shadow-xl z-50 pointer-events-none"
            >
              <div className="font-semibold mb-1 line-clamp-2">{source.title}</div>
              <div className="text-gray-300 text-[10px] mb-2 break-all line-clamp-1">
                {source.url}
              </div>
              <div className="text-gray-400 text-[10px] line-clamp-3">
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
                className="flex-1 px-6 py-5 rounded-xl bg-white/50 focus:outline-none focus:bg-white/70"
                disabled={isLoading}
              />
              <button
                onClick={() => handleSearch(searchQuery)}
                disabled={isLoading || !searchQuery.trim()}
                className="px-6 py-5 bg-black text-white rounded-xl hover:bg-gray-800 disabled:opacity-50 transition-colors"
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
              className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700"
            >
              {error}
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
                        className="flex items-center justify-between p-4 bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-xl shadow-lg border border-blue-400/30 hover:shadow-xl transition-shadow"
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-white/20 rounded-lg">
                            <Presentation className="size-6" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold truncate max-w-[200px]">{file.filename}</p>
                            <p className="text-[10px] opacity-80 uppercase tracking-widest">PowerPoint Document</p>
                          </div>
                        </div>
                        <button
                          onClick={() => downloadFile(file)}
                          className="p-2 hover:bg-white/10 rounded-full transition-colors"
                          title="Download Presentation"
                        >
                          <Download className="size-5" />
                        </button>
                      </motion.div>
                    ))}
                  </div>
                )}

                {/* Agent Analysis Text with Citations */}
                {agentText && (
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="backdrop-blur-xl bg-white/90 rounded-2xl p-8 shadow-xl border border-white/60"
                  >
                    <div className="prose prose-slate max-w-none">
                      <TextWithCitations text={agentText} />
                    </div>
                  </motion.div>
                )}

                {/* Sources Reference Section */}
                {Object.keys(sourcesMap).length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="backdrop-blur-xl bg-white/70 rounded-2xl p-6 shadow-lg border border-white/60"
                  >
                    <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                      <FileText className="size-5" />
                      Sources
                    </h3>
                    <div className="space-y-3">
                      {Object.entries(sourcesMap).map(([id, source]) => (
                        <div key={id} className="flex gap-3 text-sm group">
                          <span className="flex-shrink-0 flex items-center justify-center w-6 h-6 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold">
                            {id}
                          </span>
                          <div className="flex-1 min-w-0">
                            <a
                              href={source.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-medium text-gray-900 hover:text-blue-600 transition-colors line-clamp-1 flex items-center gap-1"
                            >
                              {source.title}
                              <ExternalLink className="size-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </a>
                            <p className="text-xs text-gray-500 truncate">{source.url}</p>
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
              <Loader2 className="size-12 animate-spin text-blue-600 mx-auto mb-4" />
              <p className="text-gray-600 font-medium">Agent is thinking and generating assets...</p>
              <p className="text-gray-400 text-sm mt-2">This may take a moment</p>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}