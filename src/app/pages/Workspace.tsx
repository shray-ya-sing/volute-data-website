import { useEffect, useState } from "react";
import { useLocation } from "react-router";
import { ChatSidebar } from "../components/ChatSidebar";
import type { AttachmentPreview } from "../components/ChatSidebar";
import { CanvasView } from "../components/CanvasView";
import { SourcePanel } from "../components/SourcePanel";
import { TopBar } from "../components/TopBar";
import { useAppSelector, useAppDispatch } from "../store/hooks";
import { clearAttachments } from "../store/attachmentsSlice";
import { useAgentStream } from "../hooks/useAgentStream";
import { attachmentPreviewsToApiImages } from "../utils/fileToBase64";
import { PanelRightOpen, PanelLeftOpen } from "lucide-react";

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  attachments?: AttachmentPreview[];
}

export function Workspace() {
  const location = useLocation();
  const dispatch = useAppDispatch();
  const initialQuery = location.state?.initialQuery || "";
  const initialAttachments: AttachmentPreview[] = location.state?.initialAttachments || [];
  const slides = useAppSelector((state) => state.slides.slides);
  const attachments = useAppSelector((state) => state.attachments.attachments);
  const [sourcesCollapsed, setSourcesCollapsed] = useState(false);
  const [chatCollapsed, setChatCollapsed] = useState(false);

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
      
      // Clean up attachments after slide generation
      if (attachments.length > 0) {
        attachments.forEach(async (att) => {
          try {
            await fetch('/api/upload-image', {
              method: 'DELETE',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ blobUrl: att.blobUrl }),
            });
            console.log(`[Workspace] Deleted blob: ${att.blobId}`);
          } catch (err) {
            console.warn(`[Workspace] Failed to delete blob ${att.blobId}:`, err);
          }
        });
        dispatch(clearAttachments());
      }
    },
    onError: (error) => {
      console.error('[Workspace] Agent stream error:', error);
    },
  });

  useEffect(() => {
    if (initialQuery) {
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
  }, [initialQuery]);

  const handleSendMessage = async (content: string) => {
    // Get imageRefs from Redux attachments
    const imageRefs = attachments.map(att => ({
      blobId: att.blobId,
      blobUrl: att.blobUrl,
      mediaType: att.mediaType,
    }));

    const isLikelyEdit = /\b(edit|change|modify|update|adjust|fix|revise|make it|make the|change it|change the)\b/i.test(content);
    let enhancedPrompt = content;

    if (isLikelyEdit && slides.length > 0) {
      const latestSlide = slides[slides.length - 1];
      enhancedPrompt = `[SLIDE CONTEXT FOR EDITING]\nCurrent slide ${latestSlide.slideNumber} code:\n\`\`\`tsx\n${latestSlide.code}\n\`\`\`\n\n[USER REQUEST]\n${content}`;
      console.log(`[Workspace] Edit mode detected - including slide ${latestSlide.slideNumber} context (${latestSlide.code.length} chars)`);
    }

    // Send with imageRefs
    if (imageRefs.length > 0) {
      console.log(`[Workspace] Sending message with ${imageRefs.length} image(s)`);
      send(enhancedPrompt, { imageRefs });
    } else {
      send(enhancedPrompt);
    }
  };

  const handleCitationClick = (citationId: number) => {
    setHighlightedSourceId(citationId);
    setTimeout(() => setHighlightedSourceId(null), 3000);
  };

  const handleSourceClick = (source: { id: number; url: string }) => {
    setHighlightedSourceId(source.id);
    setTimeout(() => setHighlightedSourceId(null), 3000);
  };

  return (
    <div className="h-screen flex flex-col" style={{ backgroundColor: 'var(--volute-bg)' }}>
      <TopBar onNewChat={reset} isStreaming={isStreaming} />

      {/* Main content area */}
      <div className="flex-1 flex overflow-x-auto overflow-y-hidden">
        {/* Chat sidebar */}
        {chatCollapsed ? (
          <div data-no-print className="flex-shrink-0 border-r border-gray-200 bg-[var(--volute-bg)]">
            <button
              onClick={() => setChatCollapsed(false)}
              className="p-2 m-2 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
              title="Expand chat panel"
            >
              <PanelLeftOpen className="size-4" />
            </button>
          </div>
        ) : (
          <div data-no-print className="w-[400px] flex-shrink-0">
            <ChatSidebar
              messages={messages}
              onSendMessage={handleSendMessage}
              isStreaming={isStreaming}
              activeTools={activeTools}
              onNewChat={reset}
              onToggleCollapse={() => setChatCollapsed(true)}
            />
          </div>
        )}

        {/* Canvas */}
        <div className="flex-1">
          <CanvasView onCitationClick={handleCitationClick} />
        </div>

        {/* Source panel */}
        {sourcesCollapsed ? (
          <div data-no-print className="flex-shrink-0 border-l border-gray-200 bg-[var(--volute-bg)]">
            <button
              onClick={() => setSourcesCollapsed(false)}
              className="p-2 m-2 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
              title="Expand sources panel"
            >
              <PanelRightOpen className="size-4" />
            </button>
          </div>
        ) : (
          <div data-no-print className="w-[300px] flex-shrink-0 border-l border-gray-200 bg-[var(--volute-bg)]">
            <SourcePanel
              sources={sources}
              highlightedSourceId={highlightedSourceId}
              onSourceClick={handleSourceClick}
              onToggleCollapse={() => setSourcesCollapsed(true)}
            />
          </div>
        )}
      </div>
    </div>
  );
}