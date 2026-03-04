import { Message } from "../pages/Workspace";
import Markdown from "react-markdown";
import type { Components } from "react-markdown";
import type { AgentMessage } from "../hooks/useAgentStream";
import { Component, ReactNode } from "react";

// Error boundary to catch react-markdown internal crashes during streaming
class MarkdownErrorBoundary extends Component<
  { fallback: string; children: ReactNode },
  { hasError: boolean }
> {
  constructor(props: { fallback: string; children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidUpdate(prevProps: { fallback: string }) {
    // Reset error state when content changes (e.g. streaming adds more text)
    if (prevProps.fallback !== this.props.fallback && this.state.hasError) {
      this.setState({ hasError: false });
    }
  }
  render() {
    if (this.state.hasError) {
      return <p className="text-sm whitespace-pre-wrap">{this.props.fallback}</p>;
    }
    return this.props.children;
  }
}

interface ChatMessageProps {
  message: Message | AgentMessage;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === "user";

  const markdownComponents: Components = {
    p: ({ children }) => <p className="my-2 leading-relaxed">{children}</p>,
    strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
    em: ({ children }) => <em className="italic">{children}</em>,
    ul: ({ children }) => <ul className="list-disc list-inside my-2 space-y-1">{children}</ul>,
    ol: ({ children }) => <ol className="list-decimal list-inside my-2 space-y-1">{children}</ol>,
    li: ({ children }) => <li className="my-0.5">{children}</li>,
    code: ({ children, className }) => {
      const isInline = !className;
      return isInline ? (
        <code className="bg-gray-200 px-1 py-0.5 rounded text-xs font-mono">
          {children}
        </code>
      ) : (
        <code className={className}>{children}</code>
      );
    },
    pre: ({ children }) => (
      <pre className="bg-gray-200 p-2 rounded my-2 overflow-x-auto">
        {children}
      </pre>
    ),
    h1: ({ children }) => <h1 className="text-base font-semibold mt-3 mb-2">{children}</h1>,
    h2: ({ children }) => <h2 className="text-sm font-semibold mt-3 mb-2">{children}</h2>,
    h3: ({ children }) => <h3 className="text-sm font-semibold mt-2 mb-1">{children}</h3>,
    a: ({ children, href }) => (
      <a href={href} className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">
        {children}
      </a>
    ),
    blockquote: ({ children }) => (
      <blockquote className="border-l-4 border-gray-300 pl-3 my-2 italic">
        {children}
      </blockquote>
    ),
  };

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-2 ${
          isUser
            ? "bg-black text-white"
            : "bg-transparent text-gray-900"
        }`}
      >
        {isUser ? (
          <>
            {message.attachments && message.attachments.length > 0 && (
              <div className="flex gap-1.5 flex-wrap mb-2">
                {message.attachments.map((att, i) => (
                  <div key={i} className="w-14 h-14 rounded-lg overflow-hidden border border-white/20">
                    <img src={att.url} alt={att.name} className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            )}
            <p className="text-sm whitespace-pre-wrap">{message.content}</p>
          </>
        ) : (
          <div className="space-y-3">
            {/* Text content */}
            {message.content && message.content.length > 0 && (
              <div className="text-sm prose prose-sm max-w-none">
                <MarkdownErrorBoundary fallback={message.content}>
                  <Markdown components={markdownComponents}>
                    {String(message.content)}
                  </Markdown>
                </MarkdownErrorBoundary>
              </div>
            )}

            {/* Tool activity - simplified status messages */}
            {"toolActivity" in message && message.toolActivity && message.toolActivity.length > 0 && (
              <div className="space-y-1">
                {/* Group tools by type */}
                {(() => {
                  const vectorSearchTools = message.toolActivity.filter(t => t.name === "vector_search");
                  const slideTools = message.toolActivity.filter(t => t.name === "create_or_edit_slide");
                  
                  const hasVectorSearch = vectorSearchTools.length > 0;
                  const hasSlideGeneration = slideTools.length > 0;
                  
                  const allVectorSearchDone = vectorSearchTools.every(t => t.status === "done");
                  const allSlidesDone = slideTools.every(t => t.status === "done");
                  
                  return (
                    <>
                      {hasVectorSearch && (
                        <p className="text-sm italic text-black">
                          {allVectorSearchDone ? "Data fetched successfully" : "Fetching data..."}
                        </p>
                      )}
                      {hasSlideGeneration && (
                        <p className="text-sm italic text-black">
                          {allSlidesDone ? "Slide generated" : "Generating slide..."}
                        </p>
                      )}
                    </>
                  );
                })()}
              </div>
            )}

            {/* Slides are no longer rendered inline - they appear in main canvas only */}
          </div>
        )}
      </div>
    </div>
  );
}