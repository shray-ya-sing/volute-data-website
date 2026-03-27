import { useState, useRef, useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { addSlide, updateSlide, setGenerating, setSlideDataPoints, updateDataPointScreenshots } from '../store/slidesSlice';
import { ENABLE_MOCK_AGENT } from '../config/features';
import { captureDataPointScreenshots } from '../utils/captureScreenshots';
import { checkRateLimit, recordRequest, getAnonymousUserId } from '../utils/anonymousRateLimit';

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
  // Use browser crypto if available (always is in modern browsers), fall back to timestamp
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
  const slides = useAppSelector((state) => state.slides.slides);
  const versionHistory = useAppSelector((state) => state.slides.versionHistory);
  const theme = useAppSelector((state) => state.theme);

  // Detect if running in Figma Make preview
  const isFigmaPreview = typeof window !== 'undefined' && 
    (window.location.hostname.includes('figma.site') || 
     window.location.hostname.includes('makeproxy'));

  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isToolRunning, setIsToolRunning] = useState(false);
  const [activeTools, setActiveTools] = useState<ToolActivity[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [presentationId, setPresentationId] = useState<string | null>(null);
  const [sources, setSources] = useState<TrackedSource[]>([]);
  const [highlightedSourceId, setHighlightedSourceId] = useState<number | null>(null);

  // Rate limiting state
  const [rateLimitError, setRateLimitError] = useState<{
    message: string;
    resetAt: number;
  } | null>(null);

  // Credits error state
  const [creditsError, setCreditsError] = useState<boolean>(false);

  const abortControllerRef = useRef<AbortController | null>(null);
  const currentAssistantMessageRef = useRef<AgentMessage | null>(null);

  // Keep refs to always read latest values inside SSE callbacks
  const slidesRef = useRef(slides);
  slidesRef.current = slides;
  const versionHistoryRef = useRef(versionHistory);
  versionHistoryRef.current = versionHistory;
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
          // Surfaced to UI via activeTools — no Redux state change needed
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
          const currentSlides = slidesRef.current;
          const currentHistory = versionHistoryRef.current;
          const existingSlide = currentSlides.find((s) => s.slideNumber === slideData.slideNumber);

          let finalSlideNumber = slideData.slideNumber;
          let versionNumber: number;

          if (existingSlide) {
            // Slide already exists — always update in place regardless of action field,
            // because the agent sometimes returns action='created' for edits.
            versionNumber = (currentHistory[slideData.slideNumber]?.length ?? 0) + 2;
            dispatch(updateSlide({ id: existingSlide.id, code: slideData.code }));
          } else {
            // Brand new slide
            versionNumber = 1;
            dispatch(addSlide({ slideNumber: finalSlideNumber, code: slideData.code }));
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
          // ✅ PRODUCTION DATA FLOW: This is where REAL data points arrive from the backend
          // The backend emits this event after the agent calls register_slide_data_points
          // This should NEVER be overridden by mock data in production
          console.log('[useAgentStream] 📊 Slide data points registered:', {
            slideNumber: event.slideNumber,
            dataPointCount: event.dataPoints?.length,
          });
          
          // Store data points in Redux for the data view components
          // Backend doesn't send IDs, so generate them here
          if (event.dataPoints && Array.isArray(event.dataPoints)) {
            const dataPointsWithIds = event.dataPoints.map((dp: any, index: number) => ({
              id: `dp-${event.slideNumber}-${index}-${Date.now()}`,
              label: dp.label,
              value: dp.value,
              sourceUrls: dp.sourceUrls || [],
              verifications: [], // Will be populated by verification system
            }));

            dispatch(setSlideDataPoints({
              slideNumber: event.slideNumber,
              dataPoints: dataPointsWithIds,
            }));

            // Capture screenshots for all data points asynchronously
            // This runs in the background and updates Redux when ready
            dataPointsWithIds.forEach(async (dataPoint) => {
              if (dataPoint.sourceUrls.length > 0) {
                try {
                  const screenshots = await captureDataPointScreenshots(
                    dataPoint.id,
                    dataPoint.label,
                    dataPoint.value,
                    dataPoint.sourceUrls
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
          }
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

      // ── Check rate limit for anonymous users ────────────────────────────────
      // TODO: Skip this check if user is authenticated
      const isAuthenticated = false; // Replace with actual auth check
      
      if (!isAuthenticated) {
        const rateCheck = checkRateLimit();
        
        if (!rateCheck.allowed) {
          console.warn('[useAgentStream] ⛔ Rate limit exceeded', {
            remaining: rateCheck.remaining,
            resetAt: new Date(rateCheck.resetAt).toISOString(),
          });
          
          // Set error state to trigger modal
          setRateLimitError({
            message: rateCheck.message || 'Rate limit exceeded',
            resetAt: rateCheck.resetAt,
          });
          
          return; // Don't proceed with request
        }
        
        // Record this request
        recordRequest();
        console.log('[useAgentStream] ✓ Rate limit check passed, remaining:', rateCheck.remaining - 1);
      }

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

        // ── Use mock data in Figma Make preview ────────────────────────────────
        if (isFigmaPreview && ENABLE_MOCK_AGENT) {
          console.log('[useAgentStream] 🎭 Using mock data (Figma preview mode)');
          const turnTools = new Map<string, ToolActivity>();
          
          await mockAgentStream(
            prompt,
            (event) => handleSSEEvent(event, turnTools, pid),
            150 // delay in ms between events
          );
          
          return;
        }

        // ── Real API call ────────────────────────────────────────────────────────
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
          signal: abortController.signal,
        });

        // Check for credits error (400 with specific message)
        if (response.status === 400) {
          // Clone response so we can read body and still use it if needed
          const clonedResponse = response.clone();
          const errorText = await clonedResponse.text();
          
          // Check if it's the credits exhausted error
          if (errorText.includes('credit balance is too low') || 
              errorText.includes('invalid_request_error')) {
            console.error('[useAgentStream] ⚠️ Credits exhausted');
            setCreditsError(true);
            
            // Don't show the error in chat
            if (currentAssistantMessageRef.current) {
              // Remove the empty assistant message we created
              setMessages((prev) => prev.filter(m => m.id !== currentAssistantMessageRef.current!.id));
            }
            
            return; // Exit early, modal will be shown
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
    [isStreaming, sessionId, apiUrl, dispatch, onError, theme, handleSSEEvent, isFigmaPreview],
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
    setPresentationId(null);          // next send() will mint a fresh one
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