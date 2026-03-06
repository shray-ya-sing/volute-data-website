import { useState, useRef, useCallback } from "react";
import { Plus } from "lucide-react";
import { useAppSelector, useAppDispatch } from "../store/hooks";
import { setPresentationName } from "../store/slidesSlice";
import { VersionHistory } from "./VersionHistory";
import { ExportButton } from "./ExportButton";

interface TopBarProps {
  onNewChat: () => void;
  isStreaming: boolean;
}

export function TopBar({ onNewChat, isStreaming }: TopBarProps) {
  const dispatch = useAppDispatch();
  const slides = useAppSelector((s) => s.slides.slides);
  const presentationName = useAppSelector((s) => s.slides.presentationName);

  const [isEditingName, setIsEditingName] = useState(false);
  const nameInputRef = useRef<HTMLInputElement | null>(null);

  const handleNameSubmit = useCallback(() => {
    setIsEditingName(false);
    const trimmed = (nameInputRef.current?.value || "").trim();
    if (trimmed) {
      dispatch(setPresentationName(trimmed));
    }
  }, [dispatch]);

  return (
    <div className="h-12 bg-[var(--volute-bg)] border-b border-gray-200 flex items-center justify-between px-4 relative overflow-visible">
      <span className="font-medium text-xs tracking-[0.18em] uppercase">VOLUTE</span>

      {/* Right side controls */}
      <div className="flex items-center gap-3">
        {/* Presentation Name */}
        <div className="flex items-center gap-2">
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
              className="text-sm text-gray-700 bg-gray-50 border-b border-gray-400 outline-none px-2 py-1 min-w-[120px] rounded"
            />
          ) : (
            <h2
              className="text-sm text-gray-700 bg-gray-50 px-2 py-1 rounded cursor-pointer hover:text-blue-600 transition-colors"
              onClick={() => setIsEditingName(true)}
              title="Click to rename"
            >
              {presentationName}
            </h2>
          )}
          {slides.length > 0 && (
            <span className="text-xs text-gray-500">
              {slides.length} {slides.length === 1 ? "slide" : "slides"}
            </span>
          )}
        </div>

        {/* Version History */}
        <VersionHistory />

        {/* Export */}
        <ExportButton />

        {/* New Chat */}
        <button
          onClick={onNewChat}
          disabled={isStreaming}
          className="p-2 text-gray-700 hover:text-gray-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          title="New Chat"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}