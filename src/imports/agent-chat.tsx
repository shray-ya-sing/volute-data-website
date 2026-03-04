// components/AgentChat.tsx

import React, { useState, useRef, useEffect } from 'react';
import { useAgentStream, SlideData, AgentMessage, ToolActivity } from '../hooks/useAgentStream';

// Your existing Sandpack slide renderer
import { SlidePreview } from './SlidePreview';

export function AgentChat() {
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  const {
    messages,
    isStreaming,
    isToolRunning,
    activeTools,
    sessionId,
    send,
    reset,
  } = useAgentStream({
    apiUrl: '/api/agent',
    onSlideGenerated: (slide) => {
      console.log(`Slide ${slide.slideNumber} ${slide.action}!`);
    },
  });

  // Auto-scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, activeTools]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isStreaming) return;

    const prompt = input.trim();
    setInput('');
    await send(prompt);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

      {/* Message list */}
      <div style={{ flex: 1, overflow: 'auto', padding: '16px' }}>
        {messages.map((msg, i) => (
          <MessageBubble key={i} message={msg} />
        ))}

        {/* Active tool indicators */}
        {isToolRunning && (
          <div style={{ padding: '8px 16px', opacity: 0.7 }}>
            {activeTools
              .filter(t => t.status === 'running')
              .map((tool, i) => (
                <ToolIndicator key={i} tool={tool} />
              ))}
          </div>
        )}

        {/* Streaming cursor */}
        {isStreaming && !isToolRunning && (
          <span className="streaming-cursor">▊</span>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} style={{ padding: '16px', borderTop: '1px solid #eee' }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder={isStreaming ? 'Waiting for response...' : 'Ask about a company, request a slide...'}
            disabled={isStreaming}
            style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #ddd' }}
          />
          <button
            type="submit"
            disabled={isStreaming || !input.trim()}
            style={{ padding: '10px 20px', borderRadius: '8px' }}
          >
            Send
          </button>
          <button type="button" onClick={reset} style={{ padding: '10px', borderRadius: '8px' }}>
            New
          </button>
        </div>
      </form>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Message bubble — renders text, tool activity, and slides inline
// ---------------------------------------------------------------------------

function MessageBubble({ message }: { message: AgentMessage }) {
  const isUser = message.role === 'user';

  return (
    <div style={{
      marginBottom: '16px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: isUser ? 'flex-end' : 'flex-start',
    }}>
      {/* Role label */}
      <span style={{ fontSize: '12px', color: '#888', marginBottom: '4px' }}>
        {isUser ? 'You' : 'Volute'}
      </span>

      {/* Text content */}
      {message.content && (
        <div style={{
          padding: '12px 16px',
          borderRadius: '12px',
          backgroundColor: isUser ? '#0066ff' : '#f0f0f0',
          color: isUser ? 'white' : 'black',
          maxWidth: '80%',
          whiteSpace: 'pre-wrap',
          lineHeight: 1.5,
        }}>
          {message.content}
        </div>
      )}

      {/* Tool activity chips (shown inline below text) */}
      {message.toolActivity && message.toolActivity.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '8px' }}>
          {message.toolActivity.map((tool, i) => (
            <ToolChip key={i} tool={tool} />
          ))}
        </div>
      )}

      {/* Slides rendered inline */}
      {message.slides && message.slides.map((slide, i) => (
        <div key={i} style={{ marginTop: '12px', width: '100%', maxWidth: '960px' }}>
          <div style={{
            fontSize: '12px',
            color: '#666',
            marginBottom: '4px',
          }}>
            Slide {slide.slideNumber} — {slide.action}
          </div>
          {/* Your existing Sandpack renderer */}
          <SlidePreview code={slide.code} slideNumber={slide.slideNumber} />
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tool activity indicators
// ---------------------------------------------------------------------------

function ToolIndicator({ tool }: { tool: ToolActivity }) {
  const label = tool.name === 'vector_search'
    ? `🔍 Searching: "${tool.input?.query ?? '...'}"` 
    : tool.name === 'create_or_edit_slide'
      ? `🎨 ${tool.input?.existingCode ? 'Editing' : 'Generating'} slide...`
      : `⚙️ Running ${tool.name}...`;

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      padding: '8px 12px',
      backgroundColor: '#f8f9fa',
      borderRadius: '8px',
      fontSize: '13px',
      color: '#555',
      animation: 'pulse 1.5s ease-in-out infinite',
    }}>
      <span className="spinner" />
      {label}
    </div>
  );
}

function ToolChip({ tool }: { tool: ToolActivity }) {
  const isDone = tool.status === 'done';

  const icon = tool.name === 'vector_search' ? '🔍'
    : tool.name === 'create_or_edit_slide' ? '🎨'
    : '⚙️';

  const label = tool.name === 'vector_search'
    ? `Searched: "${tool.input?.query ?? ''}"`
    : tool.name === 'create_or_edit_slide'
      ? `Slide ${tool.input?.existingCode ? 'edited' : 'created'}`
      : tool.name;

  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '4px',
      padding: '4px 8px',
      borderRadius: '12px',
      fontSize: '11px',
      backgroundColor: isDone ? '#e8f5e9' : '#fff3e0',
      color: isDone ? '#2e7d32' : '#e65100',
    }}>
      {isDone ? '✅' : '⏳'} {icon} {label}
    </span>
  );
}