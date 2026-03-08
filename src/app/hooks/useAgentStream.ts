import { useState, useRef, useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { addSlide, updateSlide, setGenerating } from '../store/slidesSlice';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TrackedSource {
  id: number;
  title: string;
  url: string;
  relevance: string;
  textPreview: string;
}

export interface SlideData {
  action: 'created' | 'edited';
  code: string;
  slideNumber: number;
  sources?: TrackedSource[];
}

export interface ToolActivity {
  name: string;
  status: 'running' | 'done';
  input?: Record<string, any>;
  startTime: number;
  endTime?: number;
}

export interface AgentMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  toolActivity?: ToolActivity[];
  slides?: SlideData[];
  attachments?: any[];
}

interface UseAgentStreamOptions {
  apiUrl?: string;
  onSlideGenerated?: (slide: SlideData) => void;
  onError?: (error: Error) => void;
}

interface SendOptions {
  images?: Array<{ data: string; mediaType?: string }>;
  imageRefs?: Array<{ blobId: string; blobUrl: string; mediaType: string }>;
  existingCode?: string;
  displayContent?: string;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useAgentStream(options: UseAgentStreamOptions = {}) {
  const {
    apiUrl = 'https://www.getvolute.com/api/agent-websearch',
    onSlideGenerated,
    onError,
  } = options;

  const dispatch = useAppDispatch();
  const slides = useAppSelector((state) => state.slides.slides);
  const theme = useAppSelector((state) => state.theme);

  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isToolRunning, setIsToolRunning] = useState(false);
  const [activeTools, setActiveTools] = useState<ToolActivity[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sources, setSources] = useState<TrackedSource[]>([]);
  const [highlightedSourceId, setHighlightedSourceId] = useState<number | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);
  const currentAssistantMessageRef = useRef<AgentMessage | null>(null);

  // Keep a ref to slides so the SSE handler always reads the latest value
  const slidesRef = useRef(slides);
  slidesRef.current = slides;

  // ---------------------------------------------------------------------------
  // Send a message to the agent
  // ---------------------------------------------------------------------------

  const send = useCallback(
    async (prompt: string, sendOptions?: SendOptions) => {
      if (isStreaming) {
        console.warn('[useAgentStream] Already streaming, ignoring send');
        return;
      }

      // Add user message
      const userMessage: AgentMessage = {
        id: `user-${Date.now()}`,
        role: 'user',
        content: sendOptions?.displayContent || prompt,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, userMessage]);

      // Create assistant message placeholder
      currentAssistantMessageRef.current = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: '',
        timestamp: new Date(),
        toolActivity: [],
        slides: [],
      };
      setMessages((prev) => [...prev, currentAssistantMessageRef.current!]);

      setIsStreaming(true);
      setActiveTools([]);
      dispatch(setGenerating(true));

      // Abort controller for cleanup
      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      try {
        const requestBody: any = {
          prompt,
          sessionId: sessionId || undefined,
          theme: {
            headingFont: theme.headingFont,
            bodyFont: theme.bodyFont,
            accentColors: theme.accentColors,
            headingTextColor: theme.headingTextColor,
            bodyTextColor: theme.bodyTextColor,
            headingFontSize: theme.headingFontSize,
            bodyFontSize: theme.bodyFontSize,
            backgroundColor: theme.slideBackgroundColor,
          },
        };

        if (sendOptions?.images) {
          requestBody.images = sendOptions.images;
        }

        if (sendOptions?.imageRefs) {
          requestBody.imageRefs = sendOptions.imageRefs;
        }

        // If this is an edit request and we have slides, pass the latest slide code
        if (sendOptions?.existingCode) {
          // The backend will handle this in the tool call
          // We just need to make sure we can identify edit requests
          console.log('[useAgentStream] Edit mode with existing code');
        }

        console.log('[useAgentStream] Connecting to agent...', { sessionId, hasImages: !!sendOptions?.images, backgroundColor: theme.slideBackgroundColor });

        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
          signal: abortController.signal,
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        if (!response.body) {
          throw new Error('No response body');
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        // Active tool tracking (for this turn)
        const turnTools = new Map<string, ToolActivity>();

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (!line.trim() || !line.startsWith('data: ')) continue;

            try {
              const eventData = JSON.parse(line.slice(6));
              await handleSSEEvent(eventData, turnTools);
            } catch (err) {
              console.error('[useAgentStream] Failed to parse SSE event:', line, err);
            }
          }
        }
      } catch (err: any) {
        if (err.name === 'AbortError') {
          console.log('[useAgentStream] Stream aborted by user');
        } else {
          console.error('[useAgentStream] Stream error:', err);
          if (onError) onError(err);

          // Update assistant message with error
          if (currentAssistantMessageRef.current) {
            currentAssistantMessageRef.current.content =
              '❌ Something went wrong. Please try again.';
            setMessages((prev) => [...prev]);
          }
        }
      } finally {
        setIsStreaming(false);
        setIsToolRunning(false);
        setActiveTools([]);
        dispatch(setGenerating(false));
        abortControllerRef.current = null;
        currentAssistantMessageRef.current = null;
      }
    },
    [isStreaming, sessionId, apiUrl, dispatch, onError, onSlideGenerated, theme]
  );

  // ---------------------------------------------------------------------------
  // Handle individual SSE events
  // ---------------------------------------------------------------------------

  const handleSSEEvent = useCallback(
    async (event: any, turnTools: Map<string, ToolActivity>) => {
      const { type } = event;

      switch (type) {
        case 'text_delta': {
          // Append text to current assistant message
          if (currentAssistantMessageRef.current) {
            currentAssistantMessageRef.current.content += event.delta;
            setMessages((prev) => [...prev]); // Force re-render
          }
          break;
        }

        case 'tool_start': {
          const tool: ToolActivity = {
            name: event.name,
            status: 'running',
            input: event.input,
            startTime: Date.now(),
          };

          // Track in turn tools and active tools
          const toolKey = `${event.name}-${Date.now()}`;
          turnTools.set(toolKey, tool);
          setActiveTools((prev) => [...prev, tool]);
          setIsToolRunning(true);

          console.log(`[useAgentStream] 🛠️ Tool started: ${event.name}`, event.input);
          break;
        }

        case 'tool_result': {
          // Mark the most recent matching tool as done
          let foundTool: ToolActivity | undefined;
          for (const [key, tool] of Array.from(turnTools.entries()).reverse()) {
            if (tool.name === event.name && tool.status === 'running') {
              tool.status = 'done';
              tool.endTime = Date.now();
              foundTool = tool;
              break;
            }
          }

          // Update active tools
          setActiveTools((prev) =>
            prev.map((t) =>
              t.name === event.name && t.status === 'running'
                ? { ...t, status: 'done', endTime: Date.now() }
                : t
            )
          );

          // Add to assistant message tool activity
          if (currentAssistantMessageRef.current && foundTool) {
            if (!currentAssistantMessageRef.current.toolActivity) {
              currentAssistantMessageRef.current.toolActivity = [];
            }
            currentAssistantMessageRef.current.toolActivity.push(foundTool);
          }

          console.log(`[useAgentStream] ✅ Tool completed: ${event.name}`);
          break;
        }

        case 'slide_generated': {
          console.log(
            `[useAgentStream] 📥 Raw slide_generated event:`,
            { slideNumber: event.slideNumber, action: event.action, codeLength: event.code?.length }
          );

          const slideData: SlideData = {
            action: event.action || 'created',
            code: event.code,
            slideNumber: event.slideNumber || 1,
            sources: event.sources,
          };

          console.log(
            `[useAgentStream] 🎨 Slide ${slideData.action}: #${slideData.slideNumber}`,
            `${slideData.code.length} chars`
          );

          // Update sources if provided
          if (event.sources && event.sources.length > 0) {
            setSources(event.sources);
          }

          // Store in Redux — use ref to always see the latest slides
          const currentSlides = slidesRef.current;
          const existingSlide = currentSlides.find((s) => s.slideNumber === slideData.slideNumber);

          if (existingSlide && slideData.action === 'edited') {
            // Explicit edit — update in place
            dispatch(updateSlide({ id: existingSlide.id, code: slideData.code }));
          } else if (existingSlide && slideData.action === 'created') {
            // Backend sent a "created" action but a slide with this number already exists.
            // This is the bug case — auto-assign the next available slide number instead of replacing.
            const allNumbers = currentSlides.map((s) => s.slideNumber);
            const nextNumber = Math.max(...allNumbers) + 1;
            console.warn(
              `[useAgentStream] Slide #${slideData.slideNumber} already exists but action is 'created'. ` +
              `Auto-assigning slide number ${nextNumber} to avoid replacement.`
            );
            slideData.slideNumber = nextNumber;
            dispatch(addSlide({ slideNumber: nextNumber, code: slideData.code }));
          } else {
            dispatch(addSlide({ slideNumber: slideData.slideNumber, code: slideData.code }));
          }

          // Add to assistant message
          if (currentAssistantMessageRef.current) {
            if (!currentAssistantMessageRef.current.slides) {
              currentAssistantMessageRef.current.slides = [];
            }
            currentAssistantMessageRef.current.slides.push(slideData);
            setMessages((prev) => [...prev]); // Force re-render
          }

          // Callback
          if (onSlideGenerated) onSlideGenerated(slideData);
          break;
        }

        case 'sources_updated': {
          if (event.sources && Array.isArray(event.sources)) {
            setSources(event.sources);
            console.log(`[useAgentStream] 📚 Sources updated: ${event.sources.length} sources`);
          }
          break;
        }

        case 'done': {
          if (event.sessionId) {
            setSessionId(event.sessionId);
            console.log('[useAgentStream] Session ID saved:', event.sessionId);
          }

          // Clear active tools
          setIsToolRunning(false);
          setActiveTools([]);
          break;
        }

        default:
          console.warn('[useAgentStream] Unknown event type:', type, event);
      }
    },
    [dispatch, onSlideGenerated]
  );

  // ---------------------------------------------------------------------------
  // Reset conversation
  // ---------------------------------------------------------------------------

  const reset = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setMessages([]);
    setSessionId(null);
    setIsStreaming(false);
    setIsToolRunning(false);
    setActiveTools([]);
    setSources([]);
    setHighlightedSourceId(null);
    currentAssistantMessageRef.current = null;
    console.log('[useAgentStream] Conversation reset');
  }, []);

  // ---------------------------------------------------------------------------
  // Return hook interface
  // ---------------------------------------------------------------------------

  return {
    messages,
    isStreaming,
    isToolRunning,
    activeTools,
    sessionId,
    send,
    reset,
    sources,
    highlightedSourceId,
    setHighlightedSourceId,
  };
}