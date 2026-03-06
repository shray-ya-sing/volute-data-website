import { useState, useRef, useEffect } from "react";
import { History, ChevronRight, RotateCcw } from "lucide-react";
import { useAppSelector, useAppDispatch } from "../store/hooks";
import { restoreVersion } from "../store/slidesSlice";
import type { SlideVersion } from "../store/slidesSlice";

export function VersionHistory() {
  const dispatch = useAppDispatch();
  const slides = useAppSelector((state) => state.slides.slides);
  const versionHistory = useAppSelector((state) => state.slides.versionHistory);

  const [isOpen, setIsOpen] = useState(false);
  const [expandedSlide, setExpandedSlide] = useState<number | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setExpandedSlide(null);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  // Only show slides that have version history
  const slidesWithHistory = slides.filter(
    (s) => versionHistory[s.slideNumber] && versionHistory[s.slideNumber].length > 0
  );

  const hasHistory = slidesWithHistory.length > 0;

  const handleRestore = (slideNumber: number, versionNumber: number) => {
    dispatch(restoreVersion({ slideNumber, versionNumber }));
    setIsOpen(false);
    setExpandedSlide(null);
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const today = new Date();
    if (date.toDateString() === today.toDateString()) {
      return "Today";
    }
    return date.toLocaleDateString([], { month: "short", day: "numeric" });
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => {
          setIsOpen(!isOpen);
          setExpandedSlide(null);
        }}
        disabled={!hasHistory}
        className={`p-2 transition-colors ${
          hasHistory
            ? "text-gray-700 hover:text-gray-900"
            : "text-gray-400 cursor-not-allowed"
        }`}
        title={hasHistory ? "Version history" : "No version history yet"}
      >
        <History className="w-5 h-5" />
      </button>

      {isOpen && hasHistory && (
        <div className="absolute top-full right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 min-w-[240px] overflow-hidden">
          {/* Header */}
          <div className="px-3 py-2 border-b border-gray-100">
            <span className="text-xs text-gray-500 uppercase tracking-wide">
              Version History
            </span>
          </div>

          <div className="max-h-[360px] overflow-y-auto">
            {expandedSlide === null ? (
              /* ── Slide list ── */
              <div className="py-1">
                {slidesWithHistory.map((slide) => {
                  const versions = versionHistory[slide.slideNumber] || [];
                  return (
                    <button
                      key={slide.slideNumber}
                      onClick={() => setExpandedSlide(slide.slideNumber)}
                      className="w-full flex items-center justify-between px-3 py-2 hover:bg-gray-50 transition-colors text-left"
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded bg-gray-100 flex items-center justify-center text-xs text-gray-600">
                          {slide.slideNumber}
                        </div>
                        <span className="text-sm text-gray-700">
                          Slide {slide.slideNumber}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-gray-400">
                          {versions.length} {versions.length === 1 ? "version" : "versions"}
                        </span>
                        <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              /* ── Version list for a specific slide ── */
              <div>
                {/* Back header */}
                <button
                  onClick={() => setExpandedSlide(null)}
                  className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-50 transition-colors border-b border-gray-100 text-left"
                >
                  <ChevronRight className="w-3.5 h-3.5 text-gray-400 rotate-180" />
                  <span className="text-sm text-gray-700">
                    Slide {expandedSlide}
                  </span>
                </button>

                {/* Current version */}
                {(() => {
                  const currentSlide = slides.find(
                    (s) => s.slideNumber === expandedSlide
                  );
                  if (!currentSlide) return null;
                  return (
                    <div className="px-3 py-2 bg-blue-50 border-b border-blue-100">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-sm text-blue-700">
                            Current
                          </span>
                          <div className="text-xs text-blue-500 mt-0.5">
                            {formatDate(currentSlide.timestamp)} at{" "}
                            {formatTime(currentSlide.timestamp)}
                          </div>
                        </div>
                        <span className="text-xs bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded">
                          Active
                        </span>
                      </div>
                    </div>
                  );
                })()}

                {/* Past versions (newest first) */}
                <div className="py-1">
                  {[...(versionHistory[expandedSlide] || [])]
                    .sort((a, b) => b.versionNumber - a.versionNumber)
                    .map((version: SlideVersion) => (
                      <button
                        key={version.versionNumber}
                        onClick={() =>
                          handleRestore(expandedSlide, version.versionNumber)
                        }
                        className="w-full flex items-center justify-between px-3 py-2 hover:bg-gray-50 transition-colors text-left group"
                      >
                        <div>
                          <span className="text-sm text-gray-700">
                            Version {version.versionNumber}
                          </span>
                          <div className="text-xs text-gray-400 mt-0.5">
                            {formatDate(version.timestamp)} at{" "}
                            {formatTime(version.timestamp)}
                          </div>
                        </div>
                        <span className="flex items-center gap-1 text-xs text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity">
                          <RotateCcw className="w-3 h-3" />
                          Restore
                        </span>
                      </button>
                    ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
