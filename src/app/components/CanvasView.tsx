import { useRef, useCallback } from "react";
import { ThemeToolbar } from "./ThemeToolbar";
import { SlideWithCitations } from "./SlideWithCitations";
import { useAppSelector, useAppDispatch } from "../store/hooks";
import { setCurrentSlide } from "../store/slidesSlice";

interface CanvasViewProps {
  onCitationClick: (citationId: number) => void;
}

export function CanvasView({ onCitationClick }: CanvasViewProps) {
  const dispatch = useAppDispatch();
  const slides = useAppSelector((state) => state.slides.slides);
  const currentSlideId = useAppSelector((state) => state.slides.currentSlideId);
  const slideRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  const scrollToSlide = useCallback((slideId: string) => {
    dispatch(setCurrentSlide(slideId));
    const el = slideRefs.current[slideId];
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
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
            className="flex-1 overflow-y-auto bg-[var(--volute-surface-2)]"
            data-slide-scroll-container
          >
            {slides.length > 0 ? (
              <div className="flex flex-col items-center py-8 px-20 gap-8">
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