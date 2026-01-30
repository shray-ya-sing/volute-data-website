import { useState } from 'react';
import { ArrowRight, Loader2, Sparkles, FileText, Download, Presentation } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';

interface AgentFile {
  filename: string;
  path: string;
  content: string; // This is the file data from sandbox.readFile
}

interface AgentResponse {
  sandboxId: string;
  text?: string;
  events: any[];
  files: AgentFile[];
  exitCode: number;
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
  const [generatedFiles, setGeneratedFiles] = useState<AgentFile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async (query: string) => {
    if (!query.trim()) return;

    setIsLoading(true);
    setError(null);
    setAgentText(null);
    setGeneratedFiles([]);

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: query.trim() }),
      });

      if (!response.ok) throw new Error(`Analysis failed: ${response.statusText}`);

      const data: AgentResponse = await response.json();
      
      // Find the final text response from the events array
      const finalEvent = data.events.find(e => e.type === 'final_response');
      setAgentText(finalEvent?.text || "Analysis complete, but no text summary was provided.");
      
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
    // Note: sandbox.readFile returns content. If it's base64, 
    // we convert to a blob. If your handler sends a Buffer string, 
    // adjust accordingly.
    const blob = new Blob([file.content], { type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', file.filename);
    document.body.appendChild(link);
    link.click();
    link.parentNode?.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Background UI - UNCHANGED */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
        <div className="absolute top-40 right-10 w-72 h-72 bg-yellow-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-8 left-20 w-72 h-72 bg-pink-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000"></div>
      </div>

      <div className="relative max-w-6xl mx-auto p-8 min-h-screen flex flex-col justify-center">
        <div className="max-w-4xl mx-auto w-full">

          {/* Search Bar - UNCHANGED */}
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
                className="px-6 py-5 bg-black text-white rounded-xl hover:bg-gray-800 disabled:opacity-50"
              >
                {isLoading ? <Loader2 className="size-5 animate-spin" /> : <ArrowRight className="size-5" />}
              </button>
            </div>
          </motion.div>

          {/* Results Area */}
          <AnimatePresence mode="popLayout">
            {(agentText || generatedFiles.length > 0) && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                {/* 1. File Downloads (PowerPoints) */}
                {generatedFiles.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {generatedFiles.map((file, idx) => (
                      <motion.div
                        key={idx}
                        initial={{ scale: 0.95, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="flex items-center justify-between p-4 bg-blue-600 text-blue-600 rounded-xl shadow-lg border border-blue-400/30"
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-white/20 rounded-lg">
                            <Presentation className="size-6 text-blue-600" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold truncate max-w-[200px]">{file.filename}</p>
                            <p className="text-[10px] opacity-80 uppercase tracking-widest">PowerPoint Document</p>
                          </div>
                        </div>
                        <button
                          onClick={() => downloadFile(file)}
                          className="p-2 hover:bg-blue/10 rounded-full transition-colors"
                          title="Download Presentation"
                        >
                          <Download className="size-5" />
                        </button>
                      </motion.div>
                    ))}
                  </div>
                )}

                {/* 2. Agent Analysis Text */}
                {agentText && (
                  <div className="backdrop-blur-xl bg-white/90 rounded-2xl p-8 shadow-xl border border-white/60">
                    <div className="prose prose-slate max-w-none">
                      <ReactMarkdown>{agentText}</ReactMarkdown>
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Loading State */}
          {isLoading && (
            <div className="text-center py-20">
              <Loader2 className="size-12 animate-spin text-blue-600 mx-auto mb-4" />
              <p className="text-gray-600 font-medium">Agent is thinking and generating assets...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}