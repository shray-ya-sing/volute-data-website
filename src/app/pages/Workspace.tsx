import { useEffect, useCallback, useRef } from "react";
import { useLocation } from "react-router";
import { ChatSidebar } from "../components/ChatSidebar";
import type { AttachmentPreview } from "../components/ChatSidebar";
import { CanvasView } from "../components/CanvasView";
import { SourcePanel } from "../components/SourcePanel";
import { TopBar } from "../components/TopBar";
import { useAppSelector, useAppDispatch } from "../store/hooks";
import { clearSlides, clearCachedSlides } from "../store/slidesSlice";
import { clearAttachments } from "../store/attachmentsSlice";
import { useAgentStream, type SlideData } from "../hooks/useAgentStream";
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
  const theme = useAppSelector((state) => state.theme);
  const [sourcesCollapsed, setSourcesCollapsed] = useState(false);
  const [chatCollapsed, setChatCollapsed] = useState(false);

  // Tracks whether attachment cleanup has already run for the current agent turn
  const attachmentCleanedRef = useRef(false);
  // Tracks the last captured code per slideNumber — prevents re-uploading on theme changes
  const capturedSlideCodesRef = useRef<Map<number, string>>(new Map());
  // Always-current ref so unmount cleanup can access latest attachments without stale closure
  const attachmentsRef = useRef(attachments);
  attachmentsRef.current = attachments;

  const onSlideGenerated = useCallback((slide: SlideData) => {
    console.log(`[Workspace] Slide ${slide.slideNumber} ${slide.action}: ${slide.code.length} chars`);
    // Run blob cleanup only once per agent turn (fires per slide, not per turn)
    if (attachmentCleanedRef.current) return;
    if (attachments.length === 0) return;
    attachmentCleanedRef.current = true;

    const toDelete = [...attachments];
    toDelete.forEach((att) => URL.revokeObjectURL(att.previewUrl));
    Promise.all(
      toDelete.map((att) =>
        fetch('/api/upload-image', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ blobUrl: att.blobUrl }),
        }).catch((err) =>
          console.warn(`[Workspace] Failed to delete blob ${att.blobId}:`, err)
        )
      )
    ).then(() => {
      dispatch(clearAttachments());
      console.log(`[Workspace] Cleaned up ${toDelete.length} attachment(s)`);
    });
  }, [attachments, dispatch]);

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
    onSlideGenerated,
    onError: (error) => {
      console.error('[Workspace] Agent stream error:', error);
    },
  });

  // ── Clear state when navigating away from Workspace ────────────────────────
  useEffect(() => {
    return () => {
      reset();
      dispatch(clearSlides());
      dispatch(clearCachedSlides());
      attachmentsRef.current.forEach((att) => URL.revokeObjectURL(att.previewUrl));
      dispatch(clearAttachments());
      capturedSlideCodesRef.current.clear();
      console.log('[Workspace] Unmounted — cleared slides, conversation and attachments');
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
  // Fetches the PNG from existing render endpoint and uploads it to blob.
const handleSlideRendered = useCallback(
  async (slideNumber: number) => {
    if (!presentationId) return;

    const slide = slides.find(s => s.slideNumber === slideNumber);
    if (!slide) {
      console.warn(`[Workspace] onSlideRendered: slide ${slideNumber} not found in Redux`);
      return;
    }

    // Skip re-upload if slide code hasn't changed since last capture
    if (capturedSlideCodesRef.current.get(slideNumber) === slide.code) {
      console.log(`[Workspace] ⏭️ Screenshot skipped (code unchanged): slide ${slideNumber}`);
      return;
    }
    capturedSlideCodesRef.current.set(slideNumber, slide.code);

    try {
      console.log(`[Workspace] 📸 Capturing screenshot: slide ${slideNumber}`);

      const renderRes = await fetch('/api/export-png', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slides: [{ code: slide.code, slideNumber }],
          theme,
        }),
      });

      if (!renderRes.ok) {
        console.warn(`[Workspace] export-png returned ${renderRes.status} for slide ${slideNumber}`);
        return;
      }

      // export-png returns raw PNG binary for a single slide — not JSON
      const arrayBuffer = await renderRes.arrayBuffer();
      // Chunked conversion to avoid RangeError from spreading large Uint8Array
      const bytes = new Uint8Array(arrayBuffer);
      let binary = '';
      for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
      const base64 = btoa(binary);

      // Find current latest image version at this slot so we write above it
      let nextVersion = 1;
      const checkRes = await fetch(
        `/api/upload-slide-image?presentationId=${encodeURIComponent(presentationId)}&slideNumber=${slideNumber}`,
      );
      if (checkRes.ok) {
        const existing = await checkRes.json();
        nextVersion = (existing.version ?? 0) + 1;
      }
      // If 404, no prior image versions at this slot — start at 1

      const uploadRes = await fetch('/api/upload-slide-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          presentationId,
          slideNumber,
          version: nextVersion,
          data: base64,
          mediaType: 'image/png',
        }),
      });

      if (!uploadRes.ok) {
        console.warn(`[Workspace] Image upload failed for slide ${slideNumber} v${nextVersion}`);
        return;
      }

      const { imageUrl } = await uploadRes.json();
      console.log(`[Workspace] ✅ Screenshot stored: slide ${slideNumber} v${nextVersion} → ${imageUrl}`);

    } catch (err) {
      console.warn(`[Workspace] Screenshot pipeline error for slide ${slideNumber}:`, err);
    }
  },
  [presentationId, slides, theme],
);

const handleReorderUpload = useCallback(
  async (slideNumber: number, code: string) => {
    if (!presentationId) return;
    try {
      // Find the current latest version at this slot so we write above it
      let nextVersion = 1;
      const checkRes = await fetch(
        `/api/upload-code?presentationId=${encodeURIComponent(presentationId)}&slideNumber=${slideNumber}`,
      );
      if (checkRes.ok) {
        const existing = await checkRes.json();
        nextVersion = (existing.version ?? 0) + 1;
      }
      // If 404, no prior versions at this slot — start at 1

      const res = await fetch('/api/upload-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ presentationId, slideNumber, version: nextVersion, code }),
      });
      if (!res.ok) {
        console.warn(`[Workspace] Reorder upload failed for slide ${slideNumber}`);
      } else {
        console.log(`[Workspace] ✅ Reorder upload: slide ${slideNumber} v${nextVersion}`);
      }
    } catch (err) {
      console.warn(`[Workspace] Reorder upload error:`, err);
    }
  },
  [presentationId],
);

  // ── Send message ────────────────────────────────────────────────────────────
  const handleSendMessage = async (content: string) => {
    attachmentCleanedRef.current = false; // reset per-turn cleanup gate

    // Split attachments by type:
    // - Real Vercel Blob URLs → imageRefs (server fetches them by URL)
    // - data: URI fallbacks (blob storage unavailable in local dev) → images (base64 sent directly)
    const imageRefs: { blobId: string; blobUrl: string; mediaType: string }[] = [];
    const fallbackImages: { data: string; mediaType: string }[] = [];

    for (const att of attachments) {
      if (att.blobUrl.startsWith('data:')) {
        const b64 = att.blobUrl.split(',')[1];
        if (b64) fallbackImages.push({ data: b64, mediaType: att.mediaType });
      } else {
        imageRefs.push({ blobId: att.blobId, blobUrl: att.blobUrl, mediaType: att.mediaType });
      }
    }

    let enhancedPrompt = content;

    const existingSlideNumbers = slides.map((s) => s.slideNumber).sort((a, b) => a - b);
    const nextSlideNumber = existingSlideNumbers.length > 0 ? Math.max(...existingSlideNumbers) + 1 : 1;
    enhancedPrompt =
      `[PRESENTATION CONTEXT]\nThe presentation currently has ${slides.length} slide(s): ${existingSlideNumbers.join(', ')}. A new slide would be of slide number ${nextSlideNumber}:\n` +
      `[USER REQUEST]\n${content}`;

    const hasImages = imageRefs.length > 0 || fallbackImages.length > 0;
    if (hasImages) {
      console.log(`[Workspace] Sending message with ${imageRefs.length} blob ref(s) + ${fallbackImages.length} local image(s)`);
      send(enhancedPrompt, {
        imageRefs: imageRefs.length > 0 ? imageRefs : undefined,
        images:    fallbackImages.length > 0 ? fallbackImages : undefined,
        displayContent: content,
      });
    } else {
      send(enhancedPrompt, { displayContent: content });
    }
  };

  // ── Citation / source interactions ─────────────────────────────────────────
  const handleCitationClick = useCallback((citationId: number) => {
    setHighlightedSourceId(citationId);
    setTimeout(() => setHighlightedSourceId(null), 3000);
  }, []);

  const handleSourceClick = useCallback((source: { id: number; url: string }) => {
    setHighlightedSourceId(source.id);
    setTimeout(() => setHighlightedSourceId(null), 3000);
  }, []);

  // ── New chat ────────────────────────────────────────────────────────────────
  const handleNewChat = () => {
    reset();                          // clears sessionId + presentationId in the hook
    dispatch(clearSlides());          // clears slides + versionHistory
    dispatch(clearCachedSlides());    // clears cached slides
    attachments.forEach((att) => URL.revokeObjectURL(att.previewUrl));
    dispatch(clearAttachments());     // clears any pending attachments
    attachmentCleanedRef.current = false;
    capturedSlideCodesRef.current.clear();
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
            presentationId={presentationId}
            onReorderUpload={handleReorderUpload}
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
