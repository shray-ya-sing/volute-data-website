import { Download, Loader2 } from "lucide-react";
import { useState, useRef, useCallback } from "react";
import { ThemeToolbar } from "./ThemeToolbar";
import { SlideWithCitations } from "./SlideWithCitations";
import { useAppSelector, useAppDispatch } from "../store/hooks";
import { setCurrentSlide, setPresentationName } from "../store/slidesSlice";

interface CanvasViewProps {
  onCitationClick: (citationId: number) => void;
}

export function CanvasView({ onCitationClick }: CanvasViewProps) {
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [isExportingPptx, setIsExportingPptx] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [isEditingName, setIsEditingName] = useState(false);
  const nameInputRef = useRef<HTMLInputElement | null>(null);
  const dispatch = useAppDispatch();
  const slides = useAppSelector((state) => state.slides.slides);
  const currentSlideId = useAppSelector((state) => state.slides.currentSlideId);
  const presentationName = useAppSelector((state) => state.slides.presentationName);
  const theme = useAppSelector((state) => state.theme);
  const slideRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  const scrollToSlide = useCallback((slideId: string) => {
    dispatch(setCurrentSlide(slideId));
    const el = slideRefs.current[slideId];
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [dispatch]);

  const handleNameSubmit = useCallback(() => {
    setIsEditingName(false);
    const trimmed = (nameInputRef.current?.value || "").trim();
    if (trimmed) {
      dispatch(setPresentationName(trimmed));
    }
  }, [dispatch]);

  const handleExportPDF = useCallback(async () => {
    if (slides.length === 0) return;
    setIsExportingPdf(true);
    setExportError(null);

    const payload = {
      slides: slides.map((s) => ({ code: s.code, slideNumber: s.slideNumber })),
      theme,
      format: "pdf",
      dependencies: {
        "lucide-react": "^0.487.0",
        recharts: "^2.15.2",
      },
    };

    try {
      console.log("[CanvasView] Sending slides to PDF endpoint…", {
        slideCount: slides.length,
        payloadSize: `${(new Blob([JSON.stringify(payload)]).size / 1024).toFixed(1)} KB`,
      });

      const res = await fetch("https://www.getvolute.com/api/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const contentType = res.headers.get("content-type") || "";

      if (res.ok && contentType.includes("application/pdf")) {
        const blob = await res.blob();
        console.log(`[CanvasView] PDF received: ${(blob.size / 1024).toFixed(1)} KB`);

        // Trigger browser download
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${presentationName.replace(/[^a-zA-Z0-9\s-_]/g, "").trim() || "presentation"}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else {
        // Try to parse error body
        let errorMsg = `Server returned ${res.status}`;
        try {
          const errBody = await res.json();
          errorMsg = errBody.error || errBody.message || errorMsg;
          console.error("[CanvasView] PDF export error:", errBody);
        } catch {
          const text = await res.text();
          console.error("[CanvasView] PDF export raw error:", text.slice(0, 500));
        }
        setExportError(errorMsg);
      }
    } catch (err: any) {
      console.error("[CanvasView] PDF export failed:", err);
      setExportError(err.message || "Network error — could not reach PDF server");
    } finally {
      setIsExportingPdf(false);
    }
  }, [slides, theme, presentationName]);

const handleExportPptx = useCallback(async () => {
    if (slides.length === 0) return;
    setIsExportingPptx(true);
    setExportError(null);

    try {
      // ── Step 1: Convert each slide's TSX code to slide JSON in parallel ──
      console.log(`[CanvasView] Converting ${slides.length} slide(s) to JSON…`);

      const jsonResults = await Promise.all(
        slides.map(async (slide) => {
          const res = await fetch("https://www.getvolute.com/api/generate-slide-json", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ code: slide.code, slideNumber: slide.slideNumber }),
          });

          if (!res.ok) {
            const errBody = await res.json().catch(() => ({}));
            throw new Error(
              `Slide ${slide.slideNumber} JSON conversion failed: ${errBody.error || res.status}`
            );
          }

          const { slideNumber, slideJson } = await res.json();
          console.log(`[CanvasView] Slide ${slideNumber} JSON ready`);
          return { slideNumber, slideJson };
        })
      );

      // Sort by slideNumber to guarantee correct order regardless of Promise resolution order
      jsonResults.sort((a, b) => a.slideNumber - b.slideNumber);
      const slideJsonArray = jsonResults.map((r) => r.slideJson);

      console.log(`[CanvasView] All ${slideJsonArray.length} slide(s) converted. Sending to export endpoint…`, {
        payloadSize: `${(new Blob([JSON.stringify(slideJsonArray)]).size / 1024).toFixed(1)} KB`,
      });

      // ── Step 2: Send the JSON array to the C# export endpoint ──
      const exportPayload = {
        presentationName,
        slideJsonArray,
      };

      const exportRes = await fetch("https://doclayer.onrender.com/api/Presentation/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(exportPayload),
      });

      const contentType = exportRes.headers.get("content-type") || "";

      if (
        exportRes.ok &&
        (contentType.includes("application/vnd.openxmlformats-officedocument.presentationml") ||
          contentType.includes("application/octet-stream"))
      ) {
        const blob = await exportRes.blob();
        console.log(`[CanvasView] Pptx received: ${(blob.size / 1024).toFixed(1)} KB`);

        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${presentationName.replace(/[^a-zA-Z0-9\s-_]/g, "").trim() || "presentation"}.pptx`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else {
        let errorMsg = `Export server returned ${exportRes.status}`;
        try {
          const errBody = await exportRes.json();
          errorMsg = errBody.error || errBody.message || errorMsg;
          console.error("[CanvasView] Pptx export error:", errBody);
        } catch {
          const text = await exportRes.text();
          console.error("[CanvasView] Pptx export raw error:", text.slice(0, 500));
        }
        setExportError(errorMsg);
      }
    } catch (err: any) {
      console.error("[CanvasView] Pptx export failed:", err);
      setExportError(err.message || "Network error during Pptx export");
    } finally {
      setIsExportingPptx(false);
    }
  }, [slides, presentationName]);




  return (
    <div className="flex-1 flex flex-col">
      {/* Header */}
      <div data-no-print className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6">
        <div className="flex items-center gap-4">
          {isEditingName ? (
            <input
              ref={nameInputRef}
              defaultValue={presentationName}
              autoFocus
              onBlur={handleNameSubmit}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleNameSubmit();
                if (e.key === "Escape") setIsEditingName(false);
              }}
              className="font-medium bg-transparent border-b-2 border-blue-500 outline-none px-0 py-0.5 min-w-[120px]"
            />
          ) : (
            <h2
              className="font-medium cursor-pointer hover:text-blue-600 transition-colors"
              onClick={() => setIsEditingName(true)}
              title="Click to rename"
            >
              {presentationName}
            </h2>
          )}
          {slides.length > 0 && (
            <span className="text-sm text-gray-500">
              {slides.length} {slides.length === 1 ? 'slide' : 'slides'}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {exportError && (
            <span className="text-xs text-red-500 max-w-[200px] truncate" title={exportError}>
              Error exporting, please try again
            </span>
          )}
          <button
            onClick={handleExportPptx}
            disabled={isExportingPptx || slides.length === 0}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${ slides.length === 0 ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : isExportingPptx ? 'bg-blue-400 text-white cursor-wait' : 'bg-blue-600 text-white hover:bg-blue-700' } bg-[#000000]`}
          >
            {isExportingPptx ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <Download className="w-4 h-4" />
                <span className="text-sm">Export to Pptx</span>
              </>
            )}
          </button>
          <button
            onClick={handleExportPDF}
            disabled={isExportingPdf || slides.length === 0}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${ slides.length === 0 ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : isExportingPdf ? 'bg-blue-400 text-white cursor-wait' : 'bg-blue-600 text-white hover:bg-blue-700' } bg-[#000000]`}
          >
            {isExportingPdf ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <Download className="w-4 h-4" />
                <span className="text-sm">Export to PDF</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Theme Toolbar */}
      <div data-no-print>
        <ThemeToolbar />
      </div>

      {/* Canvas Area */}
      <div className="flex-1 flex overflow-hidden">
        <div className="flex flex-1 overflow-hidden">
          {/* Slide thumbnail sidebar */}
          {slides.length > 0 && (
            <div data-no-print className="w-24 bg-white border-r border-gray-200 p-2 overflow-y-auto flex-shrink-0">
              {slides.map((slide) => (
                <div
                  key={slide.id}
                  onClick={() => scrollToSlide(slide.id)}
                  className={`w-full aspect-video bg-white border-2 rounded shadow-sm mb-2 cursor-pointer transition-colors ${
                    slide.id === currentSlideId ? 'border-blue-500' : 'border-gray-300 hover:border-blue-300'
                  }`}
                >
                  <div className="w-full h-full bg-gradient-to-br from-gray-50 to-white flex items-center justify-center">
                    <span className="text-xs text-gray-400">{slide.slideNumber}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Scrollable slide canvases */}
          <div
            ref={scrollContainerRef}
            className="flex-1 overflow-y-auto bg-gray-100"
            data-slide-scroll-container
          >
            {slides.length > 0 ? (
              <div className="flex flex-col items-center py-8 gap-8">
                {slides.map((slide) => (
                  <div
                    key={slide.id}
                    ref={(el) => { slideRefs.current[slide.id] = el; }}
                    onClick={() => dispatch(setCurrentSlide(slide.id))}
                    className={`bg-white rounded-lg shadow-xl border-2 overflow-hidden cursor-pointer transition-colors flex-shrink-0 ${
                      slide.id === currentSlideId ? 'border-blue-500' : 'border-gray-200 hover:border-blue-300'
                    }`}
                    style={{ width: "960px", height: "540px" }}
                    data-slide-canvas
                  >
                    <SlideWithCitations
                      code={slide.code}
                      slideNumber={slide.slideNumber}
                      onCitationClick={onCitationClick}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-300">
                <div className="text-center">
                  <p className="text-sm">No slides yet. Start by sending a prompt in the chat.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}