import { Message } from "../pages/Workspace";
import Markdown from "react-markdown";
import type { Components } from "react-markdown";

interface ChatMessageProps {
  message: Message;
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
            : "bg-gray-100 text-gray-900"
        }`}
      >
        {isUser ? (
          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
        ) : (
          <div className="text-sm prose prose-sm max-w-none">
            <Markdown components={markdownComponents}>
              {message.content}
            </Markdown>
          </div>
        )}
      </div>
    </div>
  );
}