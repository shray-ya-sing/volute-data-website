import { useEffect, useState } from "react";
import { useLocation } from "react-router";
import { ChatSidebar } from "../components/ChatSidebar";
import type { AttachmentPreview } from "../components/ChatSidebar";
import { CanvasView } from "../components/CanvasView";
import { SourcePanel } from "../components/SourcePanel";
import { useAppSelector } from "../store/hooks";
import { useAgentStream } from "../hooks/useAgentStream";
import { attachmentPreviewsToApiImages } from "../utils/fileToBase64";
import { PanelRightOpen } from "lucide-react";

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  attachments?: AttachmentPreview[];
}

export function Workspace() {
  const location = useLocation();
  const initialQuery = location.state?.initialQuery || "";
  const initialAttachments: AttachmentPreview[] = location.state?.initialAttachments || [];
  const slides = useAppSelector((state) => state.slides.slides);
  const [sourcesCollapsed, setSourcesCollapsed] = useState(false);
  
  const {
    messages,
    isStreaming,
    activeTools,
    sessionId,
    sources,
    highlightedSourceId,
    setHighlightedSourceId,
    send,
    reset,
  } = useAgentStream({
    apiUrl: 'https://www.getvolute.com/api/agent',
    onSlideGenerated: (slide) => {
      console.log(`[Workspace] Slide ${slide.slideNumber} ${slide.action}:`, `${slide.code.length} chars`);
    },
    onError: (error) => {
      console.error('[Workspace] Agent stream error:', error);
    },
  });

  useEffect(() => {
    if (initialQuery) {
      // Send initial query with attachments
      const sendInitialQuery = async () => {
        let images: { data: string }[] | undefined;
        if (initialAttachments.length > 0) {
          try {
            images = await attachmentPreviewsToApiImages(initialAttachments);
            console.log(`[Workspace] Encoded ${images.length} image(s) for initial query`);
          } catch (err) {
            console.warn("Failed to encode some attachments:", err);
          }
        }

        send(initialQuery, { images });
      };

      sendInitialQuery();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialQuery]); // Only run once when initialQuery is set

  const handleSendMessage = async (content: string, attachments?: AttachmentPreview[]) => {
    // Convert attachments to base64 images for the API
    let images: { data: string }[] | undefined;
    if (attachments && attachments.length > 0) {
      try {
        images = await attachmentPreviewsToApiImages(attachments);
        console.log(`[Workspace] Encoded ${images.length} image(s) for API`);
      } catch (err) {
        console.warn("[Workspace] Failed to encode some attachments:", err);
      }
    }

    // Check if this might be an edit request - look for keywords and context
    const isLikelyEdit = /\b(edit|change|modify|update|adjust|fix|revise|make it|make the|change it|change the)\b/i.test(content);
    let enhancedPrompt = content;

    if (isLikelyEdit && slides.length > 0) {
      // Get the most recently created/edited slide
      const latestSlide = slides[slides.length - 1];
      
      // Prepend slide context to help the agent understand what to edit
      // The agent will then pass this existingCode to the create_or_edit_slide tool
      enhancedPrompt = `[SLIDE CONTEXT FOR EDITING]\nCurrent slide ${latestSlide.slideNumber} code:\n\`\`\`tsx\n${latestSlide.code}\n\`\`\`\n\n[USER REQUEST]\n${content}`;
      
      console.log(`[Workspace] Edit mode detected - including slide ${latestSlide.slideNumber} context (${latestSlide.code.length} chars)`);
    }

    send(enhancedPrompt, { images });
  };

  // Citation click from inside the slide → highlight source in panel
  const handleCitationClick = (citationId: number) => {
    setHighlightedSourceId(citationId);

    // Auto-clear highlight after 3 seconds
    setTimeout(() => setHighlightedSourceId(null), 3000);
  };

  const handleSourceClick = (source: { id: number; url: string }) => {
    // Highlight the clicked source
    setHighlightedSourceId(source.id);
    setTimeout(() => setHighlightedSourceId(null), 3000);
  };

  return (
    <div className="h-screen flex bg-gray-50">
      {/* Chat sidebar */}
      <div data-no-print className="w-[400px] flex-shrink-0">
        <ChatSidebar 
          messages={messages} 
          onSendMessage={handleSendMessage}
          isStreaming={isStreaming}
          activeTools={activeTools}
          onNewChat={reset}
        />
      </div>

      {/* Canvas — pass citation handler to slide renderer */}
      <div className="flex-1">
        <CanvasView onCitationClick={handleCitationClick} />
      </div>

      {/* Source panel — right sidebar */}
      {sourcesCollapsed ? (
        <div data-no-print className="flex-shrink-0 border-l border-gray-200 bg-white">
          <button
            onClick={() => setSourcesCollapsed(false)}
            className="p-2 m-2 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
            title="Expand sources panel"
          >
            <PanelRightOpen className="size-4" />
          </button>
        </div>
      ) : (
        <div data-no-print className="w-[300px] flex-shrink-0 border-l border-gray-200 bg-white">
          <SourcePanel
            sources={sources}
            highlightedSourceId={highlightedSourceId}
            onSourceClick={handleSourceClick}
            onToggleCollapse={() => setSourcesCollapsed(true)}
          />
        </div>
      )}
    </div>
  );
}