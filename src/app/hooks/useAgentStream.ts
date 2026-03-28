import { useState, useRef, useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { addSlide, updateSlide, setGenerating, setSlideDataPoints, updateDataPointScreenshots } from '../store/slidesSlice';
import { store } from '../store/store';
import { ENABLE_MOCK_AGENT } from '../config/features';
import { captureDataPointScreenshots } from '../utils/captureScreenshots';
//getAnonymousUserId
import { checkRateLimit, recordRequest} from '../utils/anonymousRateLimit';

// ⚠️ DEVELOPMENT/PREVIEW ONLY: Mock agent for testing without backend
// This import is ONLY used in Figma Make preview mode (auto-detected by hostname)
// It is NEVER used in production deployments
import { mockAgentStream } from '../utils/mockAgentData';

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

export interface LogoValidationResult {
  validCount: number;
  invalidCount: number;
  result: string;
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
// Helpers
// ---------------------------------------------------------------------------

function mintId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
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
  const theme = useAppSelector((state) => state.theme);

  // Add state
  const [rateLimitError, setRateLimitError] = useState<{ message: string } | null>(null);
  const [creditsError, setCreditsError] = useState(false);

  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isToolRunning, setIsToolRunning] = useState(false);
  const [activeTools, setActiveTools] = useState<ToolActivity[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [presentationId, setPresentationId] = useState<string | null>(null);
  const [sources, setSources] = useState<TrackedSource[]>([]);
  const [highlightedSourceId, setHighlightedSourceId] = useState<number | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);
  const currentAssistantMessageRef = useRef<AgentMessage | null>(null);

  // Keep refs to always read latest values inside SSE callbacks
  const presentationIdRef = useRef(presentationId);
  presentationIdRef.current = presentationId;

  // ---------------------------------------------------------------------------
  // Handle individual SSE events
  // ---------------------------------------------------------------------------

  const handleSSEEvent = useCallback(
    async (event: any, turnTools: Map<string, ToolActivity>, pid: string) => {
      const { type } = event;

      switch (type) {

        case 'text_delta': {
          if (currentAssistantMessageRef.current) {
            currentAssistantMessageRef.current.content += event.delta;
            setMessages((prev) => [...prev]);
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
          const toolKey = `${event.name}-${Date.now()}`;
          turnTools.set(toolKey, tool);
          setActiveTools((prev) => [...prev, tool]);
          setIsToolRunning(true);
          console.log(`[useAgentStream] 🛠️ Tool started: ${event.name}`, event.input);
          break;
        }

        case 'tool_result': {
          let foundTool: ToolActivity | undefined;
          for (const [, tool] of Array.from(turnTools.entries()).reverse()) {
            if (tool.name === event.name && tool.status === 'running') {
              tool.status = 'done';
              tool.endTime = Date.now();
              foundTool = tool;
              break;
            }
          }
          setActiveTools((prev) =>
            prev.map((t) =>
              t.name === event.name && t.status === 'running'
                ? { ...t, status: 'done', endTime: Date.now() }
                : t,
            ),
          );
          if (currentAssistantMessageRef.current && foundTool) {
            if (!currentAssistantMessageRef.current.toolActivity) {
              currentAssistantMessageRef.current.toolActivity = [];
            }
            currentAssistantMessageRef.current.toolActivity.push(foundTool);
          }
          console.log(`[useAgentStream] ✅ Tool completed: ${event.name}`);
          break;
        }

        case 'logos_validated': {
          console.log(
            `[useAgentStream] 🔍 Logos validated: ${event.validCount} valid, ${event.invalidCount} not found`,
          );
          if (event.invalidCount > 0) {
            console.warn('[useAgentStream] Invalid logos will be omitted from slide:', event.result);
          }
          break;
        }

        case 'slide_generated': {
          console.log('[useAgentStream] 📥 Raw slide_generated event:', {
            slideNumber: event.slideNumber,
            action: event.action,
            codeLength: event.code?.length,
          });

          const slideData: SlideData = {
            action: event.action || 'created',
            code: event.code,
            slideNumber: event.slideNumber || 1,
            sources: event.sources,
          };

          console.log(
            `[useAgentStream] 🎨 Slide ${slideData.action}: #${slideData.slideNumber}`,
            `${slideData.code.length} chars`,
          );

          if (event.sources?.length > 0) setSources(event.sources);

          // ── Dispatch to Redux ─────────────────────────────────────────
          const existingSlide = store.getState().slides.slides.find(
            (s) => s.slideNumber === slideData.slideNumber
          );

          if (existingSlide) {
            dispatch(updateSlide({ id: existingSlide.id, code: slideData.code }));
          } else {
            dispatch(addSlide({ slideNumber: slideData.slideNumber, code: slideData.code }));
          }

          // ── Update assistant message ──────────────────────────────────
          if (currentAssistantMessageRef.current) {
            if (!currentAssistantMessageRef.current.slides) {
              currentAssistantMessageRef.current.slides = [];
            }
            currentAssistantMessageRef.current.slides.push(slideData);
            setMessages((prev) => [...prev]);
          }

          if (onSlideGenerated) onSlideGenerated(slideData);
          break;
        }

        case 'slide_data_points': {
          // Dispatch immediately — the reducer will buffer the points in
          // pendingDataPoints if the slide doesn't exist yet, and drain
          // them automatically when addSlide fires for that slideNumber.
          if (!event.dataPoints || !Array.isArray(event.dataPoints)) {
            console.warn(`[useAgentStream] ⚠️ slide_data_points for slide #${event.slideNumber} had no dataPoints array — skipping`);
            break;
          }

          console.log('[useAgentStream] 📊 Slide data points received, dispatching immediately:', {
            slideNumber: event.slideNumber,
            dataPointCount: event.dataPoints.length,
          });

          const dataPointsWithIds = event.dataPoints.map((dp: any, index: number) => ({
            id: `dp-${event.slideNumber}-${index}-${Date.now()}`,
            label: dp.label,
            value: dp.value,
            sourceUrls: dp.sourceUrls || [],
            verifications: [],
          }));

          dispatch(setSlideDataPoints({
            slideNumber: event.slideNumber,
            dataPoints: dataPointsWithIds,
            mode: event.mode ?? 'append',
          }));

          // Capture screenshots for all data points asynchronously.
          // This runs in the background and updates Redux when ready.
          dataPointsWithIds.forEach(async (dataPoint) => {
            if (dataPoint.sourceUrls.length > 0) {
              try {
                const screenshots = await captureDataPointScreenshots(
                  dataPoint.id,
                  dataPoint.label,
                  dataPoint.value,
                  dataPoint.sourceUrls,
                );
                dispatch(updateDataPointScreenshots({
                  slideNumber: event.slideNumber,
                  dataPointId: dataPoint.id,
                  screenshots,
                }));
              } catch (error) {
                console.warn(`[useAgentStream] Failed to capture screenshots for datapoint ${dataPoint.id}:`, error);
              }
            }
          });
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
          setIsToolRunning(false);
          setActiveTools([]);
          break;
        }

        case 'error': {
          console.error('[useAgentStream] ❌ Error from agent:', event.message);
          if (currentAssistantMessageRef.current) {
            const errorText = `\n\n⚠️ **Error:** ${event.message || 'An unexpected error occurred.'}`;
            currentAssistantMessageRef.current.content += errorText;
            setMessages((prev) => [...prev]);
          }
          setIsToolRunning(false);
          setActiveTools([]);
          break;
        }

        default:
          console.warn('[useAgentStream] Unknown event type:', type, event);
      }
    },
    [dispatch, onSlideGenerated],
  );

  // ---------------------------------------------------------------------------
  // Send a message to the agent
  // ---------------------------------------------------------------------------

  const send = useCallback(
    async (prompt: string, sendOptions?: SendOptions) => {
      if (isStreaming) {
        console.warn('[useAgentStream] Already streaming, ignoring send');
        return;
      }

      const rateCheck = checkRateLimit();
        if (!rateCheck.allowed) {
          setRateLimitError({ message: rateCheck.message || '' });
          return;
        }
        recordRequest();

      // Mint presentationId on first send in this session
      let pid = presentationIdRef.current;
      if (!pid) {
        pid = mintId();
        setPresentationId(pid);
        presentationIdRef.current = pid;
        console.log('[useAgentStream] 🆕 Presentation ID minted:', pid);
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

      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      try {
        const requestBody: any = {
          prompt,
          sessionId: sessionId || undefined,
          presentationId: pid,
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

        if (sendOptions?.images)    requestBody.images    = sendOptions.images;
        if (sendOptions?.imageRefs) requestBody.imageRefs = sendOptions.imageRefs;

        console.log('[useAgentStream] Connecting to agent...', {
          sessionId,
          presentationId: pid,
          hasImages: !!sendOptions?.images,
          backgroundColor: theme.slideBackgroundColor,
        });

        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
          signal: abortController.signal,
        });

        // ── Check for credits exhausted error (400) ──────────────────────────────
        if (response.status === 400) {
          const errorText = await response.clone().text();
          if (errorText.includes('credit balance is too low') ||
              errorText.includes('invalid_request_error')) {
            setCreditsError(true); // ← trigger modal
            setIsStreaming(false);
            dispatch(setGenerating(false));
            return;
          }
        }

        if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        if (!response.body) throw new Error('No response body');

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
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
              await handleSSEEvent(eventData, turnTools, pid);
            } catch (err) {
              console.error('[useAgentStream] Failed to parse SSE event:', line, err);
            }
          }
        }

        // Flush any remaining buffered data after the stream closes
        if (buffer.trim().startsWith('data: ')) {
          try {
            const eventData = JSON.parse(buffer.trim().slice(6));
            await handleSSEEvent(eventData, turnTools, pid);
          } catch (err) {
            console.error('[useAgentStream] Failed to parse final SSE event:', buffer, err);
          }
        }
      } catch (err: any) {
        if (err.name === 'AbortError') {
          console.log('[useAgentStream] Stream aborted by user');
        } else {
          console.error('[useAgentStream] Stream error:', err);
          if (onError) onError(err);
          if (currentAssistantMessageRef.current) {
            currentAssistantMessageRef.current.content = '❌ Something went wrong. Please try again.';
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
    [isStreaming, sessionId, apiUrl, dispatch, onError, onSlideGenerated, theme, handleSSEEvent],
  );

  // ---------------------------------------------------------------------------
  // Reset conversation — new chat = new presentationId
  // ---------------------------------------------------------------------------

  const reset = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setMessages([]);
    setSessionId(null);
    setPresentationId(null);
    presentationIdRef.current = null;
    setIsStreaming(false);
    setIsToolRunning(false);
    setActiveTools([]);
    setSources([]);
    setHighlightedSourceId(null);
    currentAssistantMessageRef.current = null;
    console.log('[useAgentStream] Conversation reset — presentationId cleared');
  }, []);

  // ---------------------------------------------------------------------------
  // Return
  // ---------------------------------------------------------------------------

  return {
    messages,
    isStreaming,
    isToolRunning,
    activeTools,
    sessionId,
    presentationId,
    send,
    reset,
    sources,
    highlightedSourceId,
    setHighlightedSourceId,
    rateLimitError,
    clearRateLimitError: () => setRateLimitError(null),
    creditsError,
    clearCreditsError: () => setCreditsError(false),
  };
}