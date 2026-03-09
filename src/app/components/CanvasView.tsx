import { useRef, useCallback } from "react";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { ThemeToolbar } from "./ThemeToolbar";
import { SlideWithCitations } from "./SlideWithCitations";
import { DraggableThumbnail } from "./DraggableThumbnail";
import { useAppSelector, useAppDispatch } from "../store/hooks";
import { setCurrentSlide, reorderSlides } from "../store/slidesSlice";

interface CanvasViewProps {
  onCitationClick: (citationId: number) => void;
  /** Fired by each SandboxSlide once its iframe has settled after a render.
   *  Workspace uses this to capture a screenshot and upload it to blob store. */
  onSlideRendered: (slideNumber: number, version: number) => void;
}

export function CanvasView({ onCitationClick, onSlideRendered }: CanvasViewProps) {
  const dispatch = useAppDispatch();
  const slidesFromStore = useAppSelector((state) => state.slides.slides);
  const versionHistory = useAppSelector((state) => state.slides.versionHistory);
  const currentSlideId = useAppSelector((state) => state.slides.currentSlideId);
  const slideRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  // Sort slides by slideNumber to ensure correct display order
  const slides = [...slidesFromStore].sort((a, b) => a.slideNumber - b.slideNumber);

  const scrollToSlide = useCallback((slideId: string) => {
    dispatch(setCurrentSlide(slideId));
    const el = slideRefs.current[slideId];
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [dispatch]);

  const handleMove = useCallback((fromIndex: number, toIndex: number) => {
    dispatch(reorderSlides({ fromIndex, toIndex }));
  }, [dispatch]);

  return (
    <div className="flex-1 flex flex-col h-full">
      {/* Theme Toolbar */}
      <div data-no-print className="relative z-50">
        <ThemeToolbar />
      </div>

      {/* Canvas Area */}
      <div className="flex-1 flex overflow-hidden">
        <div className="flex flex-1 overflow-hidden">

          {/* Slide thumbnail sidebar */}
          {slides.length > 0 && (
            <div data-no-print className="w-24 bg-[var(--volute-bg)] border-r border-gray-200 p-2 overflow-y-auto flex-shrink-0">
              <DndProvider backend={HTML5Backend}>
                {slides.map((slide, index) => (
                  <DraggableThumbnail
                    key={slide.id}
                    id={slide.id}
                    index={index}
                    slideNumber={slide.slideNumber}
                    isSelected={slide.id === currentSlideId}
                    onClick={() => scrollToSlide(slide.id)}
                    onMove={handleMove}
                  />
                ))}
              </DndProvider>
            </div>
          )}

          {/* Scrollable slide canvases */}
          <div
            ref={scrollContainerRef}
            className="flex-1 overflow-y-auto bg-[var(--volute-surface-2)]"
            data-slide-scroll-container
          >
            {slides.length > 0 ? (
              <div className="flex flex-col items-center py-8 px-20 gap-8">
                {slides.map((slide) => {
                  // Current version = prior snapshots in history + 1
                  const currentVersion =
                    (versionHistory[slide.slideNumber]?.length ?? 0) + 1;

                  return (
                    <div
                      key={`${slide.id}-${slide.slideNumber}`}
                      ref={(el) => { slideRefs.current[slide.id] = el; }}
                      onClick={() => dispatch(setCurrentSlide(slide.id))}
                      className={`bg-white rounded-lg shadow-xl border-2 overflow-hidden cursor-pointer transition-colors flex-shrink-0 ${
                        slide.id === currentSlideId
                          ? "border-blue-500"
                          : "border-gray-200 hover:border-blue-300"
                      }`}
                      style={{ width: "960px", height: "540px" }}
                      data-slide-canvas
                    >
                      <SlideWithCitations
                        code={slide.code}
                        slideNumber={slide.slideNumber}
                        onCitationClick={onCitationClick}
                        onRendered={() => onSlideRendered(slide.slideNumber, currentVersion)}
                      />
                    </div>
                  );
                })}
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
