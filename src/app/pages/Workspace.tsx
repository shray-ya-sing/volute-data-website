import { useEffect, useCallback } from "react";
import { useLocation } from "react-router";
import { ChatSidebar } from "../components/ChatSidebar";
import type { AttachmentPreview } from "../components/ChatSidebar";
import { CanvasView } from "../components/CanvasView";
import { SourcePanel } from "../components/SourcePanel";
import { TopBar } from "../components/TopBar";
import { useAppSelector, useAppDispatch } from "../store/hooks";
import { clearAttachments, clearSlides } from "../store/slidesSlice";
import { useAgentStream } from "../hooks/useAgentStream";
import { attachmentPreviewsToApiImages } from "../utils/fileToBase64";
import { PanelRightOpen, PanelLeftOpen } from "lucide-react";
import { useState } from "react";

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
    presentationId,
    sources,
    highlightedSourceId,
    setHighlightedSourceId,
    send,
    reset,
  } = useAgentStream({
    apiUrl: 'https://www.getvolute.com/api/agent-websearch',
    onSlideGenerated: (slide) => {
      console.log(`[Workspace] Slide ${slide.slideNumber} ${slide.action}: ${slide.code.length} chars`);

      // Clean up uploaded reference images after slide is generated
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

  // ── Initial query from Landing page ────────────────────────────────────────
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

  // ── Screenshot capture + image upload ──────────────────────────────────────
  // Called by CanvasView once Sandpack has settled after a render.
  // Fetches the PNG from your existing render endpoint and uploads it to blob.
  const handleSlideRendered = useCallback(
    async (slideNumber: number, version: number) => {
      if (!presentationId) {
        console.warn('[Workspace] onSlideRendered called but no presentationId yet — skipping image upload');
        return;
      }

      try {
        console.log(`[Workspace] 📸 Capturing screenshot: slide ${slideNumber} v${version}`);

        // Call your existing slide-render endpoint
        const renderRes = await fetch('/api/render-slide', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ slideNumber, presentationId }),
        });

        if (!renderRes.ok) {
          console.warn(`[Workspace] Render endpoint returned ${renderRes.status} for slide ${slideNumber}`);
          return;
        }

        const { imageData, mediaType = 'image/png' } = await renderRes.json();

        if (!imageData) {
          console.warn(`[Workspace] No imageData returned for slide ${slideNumber}`);
          return;
        }

        // Upload to blob store
        const uploadRes = await fetch('/api/upload-slide-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            presentationId,
            slideNumber,
            version,
            data: imageData,
            mediaType,
          }),
        });

        if (!uploadRes.ok) {
          const err = await uploadRes.json().catch(() => ({}));
          console.warn(`[Workspace] Image upload failed for slide ${slideNumber} v${version}:`, err);
          return;
        }

        const { imageUrl } = await uploadRes.json();
        console.log(`[Workspace] ✅ Screenshot stored: slide ${slideNumber} v${version} → ${imageUrl}`);

      } catch (err) {
        console.warn(`[Workspace] Screenshot pipeline error for slide ${slideNumber}:`, err);
      }
    },
    [presentationId],
  );

  // ── Send message ────────────────────────────────────────────────────────────
  const handleSendMessage = async (content: string) => {
    const imageRefs = attachments.map((att) => ({
      blobId: att.blobId,
      blobUrl: att.blobUrl,
      mediaType: att.mediaType,
    }));

    const isLikelyEdit =
      /\b(edit|change|modify|update|adjust|fix|revise|make it|make the|change it|change the)\b/i.test(content);
    let enhancedPrompt = content;

    if (isLikelyEdit && slides.length > 0) {
      const slideNumberMatch = content.match(/\bslide\s+(\d+)\b/i);
      let targetSlide;

      if (slideNumberMatch) {
        const requestedSlideNumber = parseInt(slideNumberMatch[1], 10);
        targetSlide = slides.find((s) => s.slideNumber === requestedSlideNumber);
        if (targetSlide) {
          console.log(`[Workspace] Edit mode: targeting slide ${requestedSlideNumber} (explicit)`);
        } else {
          console.warn(`[Workspace] Slide ${requestedSlideNumber} not found, falling back to latest`);
          targetSlide = slides[slides.length - 1];
        }
      } else {
        targetSlide = slides[slides.length - 1];
        console.log(`[Workspace] Edit mode: targeting slide ${targetSlide.slideNumber} (latest)`);
      }

      enhancedPrompt =
        `[SLIDE CONTEXT FOR EDITING]\nCurrent slide ${targetSlide.slideNumber} code:\n\`\`\`tsx\n${targetSlide.code}\n\`\`\`\n\n` +
        `[USER REQUEST]\n${content}`;
      console.log(`[Workspace] Including slide ${targetSlide.slideNumber} context (${targetSlide.code.length} chars)`);
    } else if (slides.length > 0) {
      const existingSlideNumbers = slides.map((s) => s.slideNumber).sort((a, b) => a - b);
      const nextSlideNumber = Math.max(...existingSlideNumbers) + 1;
      enhancedPrompt =
        `[PRESENTATION CONTEXT]\nThe presentation currently has ${slides.length} slide(s): ${existingSlideNumbers.join(', ')}.\n` +
        `The next new slide should be slide number ${nextSlideNumber}.\n` +
        `Do NOT overwrite or replace existing slides — generate a NEW slide with slideNumber ${nextSlideNumber}.\n\n` +
        `[USER REQUEST]\n${content}`;
      console.log(`[Workspace] New slide mode: next slide = ${nextSlideNumber}`);
    }

    if (imageRefs.length > 0) {
      console.log(`[Workspace] Sending message with ${imageRefs.length} image(s)`);
      send(enhancedPrompt, { imageRefs, displayContent: content });
    } else {
      send(enhancedPrompt, { displayContent: content });
    }
  };

  // ── Citation / source interactions ─────────────────────────────────────────
  const handleCitationClick = (citationId: number) => {
    setHighlightedSourceId(citationId);
    setTimeout(() => setHighlightedSourceId(null), 3000);
  };

  const handleSourceClick = (source: { id: number; url: string }) => {
    setHighlightedSourceId(source.id);
    setTimeout(() => setHighlightedSourceId(null), 3000);
  };

  // ── New chat ────────────────────────────────────────────────────────────────
  const handleNewChat = () => {
    reset();                    // clears sessionId + presentationId in the hook
    dispatch(clearSlides());    // clears Redux slide state
  };

  return (
    <div className="h-screen flex flex-col" style={{ backgroundColor: 'var(--volute-bg)' }}>
      <TopBar onNewChat={handleNewChat} isStreaming={isStreaming} />

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
              onNewChat={handleNewChat}
              onToggleCollapse={() => setChatCollapsed(true)}
            />
          </div>
        )}

        {/* Canvas */}
        <div className="flex-1 min-w-[1120px] min-h-0 overflow-hidden">
          <CanvasView
            onCitationClick={handleCitationClick}
            onSlideRendered={handleSlideRendered}
          />
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
