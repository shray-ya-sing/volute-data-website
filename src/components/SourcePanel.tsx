import { useEffect, useRef } from "react";
import {
  ExternalLink,
  FileText,
  PanelRightClose,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import type { TrackedSource } from "../hooks/useAgentStream";

interface SourcePanelProps {
  sources: TrackedSource[];
  highlightedSourceId: number | null;
  onSourceClick?: (source: TrackedSource) => void;
  onToggleCollapse?: () => void;
}

export function SourcePanel({
  sources,
  highlightedSourceId,
  onSourceClick,
  onToggleCollapse,
}: SourcePanelProps) {
  const highlightRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to highlighted source
  useEffect(() => {
    if (highlightedSourceId !== null && highlightRef.current) {
      highlightRef.current.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }, [highlightedSourceId]);

  if (sources.length === 0) {
    return (
      <div className="h-full flex flex-col">
        {/* Header with collapse */}
        <div className="px-4 py-3 flex-shrink-0 flex items-center justify-end">
          {onToggleCollapse && (
            <button
              onClick={onToggleCollapse}
              className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
              title="Collapse sources panel"
            >
              <PanelRightClose className="size-4" />
            </button>
          )}
        </div>
        <div className="flex-1 flex items-center justify-center text-gray-400 text-sm p-6 text-center">
          <div>
            <p>
              Sources will appear here as the agent researches
              your query
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 flex-shrink-0 flex items-center justify-end">
        {onToggleCollapse && (
          <button
            onClick={onToggleCollapse}
            className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
            title="Collapse sources panel"
          >
            <PanelRightClose className="size-4" />
          </button>
        )}
      </div>

      {/* Source list */}
      <div className="flex-1 overflow-y-auto">
        <AnimatePresence>
          {sources.map((source) => {
            const isHighlighted =
              highlightedSourceId === source.id;

            return (
              <motion.div
                key={source.id}
                ref={isHighlighted ? highlightRef : undefined}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.2 }}
                onClick={() => onSourceClick?.(source)}
                className={`
                  px-4 py-3 border-b border-gray-100 cursor-pointer
                  transition-all duration-300
                  ${
                    isHighlighted
                      ? "bg-blue-50 border-l-4 border-l-blue-500 shadow-sm"
                      : "hover:bg-gray-50 border-l-4 border-l-transparent"
                  }
                `}
              >
                <div className="flex items-start gap-3">
                  {/* Citation number badge */}
                  <span
                    className={`
                      flex-shrink-0 flex items-center justify-center
                      w-6 h-6 rounded-full text-xs font-bold
                      transition-colors duration-300
                      ${
                        isHighlighted
                          ? "bg-blue-500 text-white ring-2 ring-blue-200"
                          : "bg-gray-100 text-gray-600"
                      }
                    `}
                  >
                    {source.id}
                  </span>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p
                      className={`
                      text-sm font-medium leading-snug line-clamp-2
                      ${isHighlighted ? "text-blue-900" : "text-gray-800"}
                    `}
                    >
                      {source.title}
                    </p>

                    <a
                      href={source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="text-xs text-gray-400 mt-1 truncate block hover:text-blue-500 transition-colors"
                    >
                      {source.url}
                    </a>

                    {/* Expanded preview when highlighted */}
                    <AnimatePresence>
                      {isHighlighted && source.textPreview && (
                        <motion.p
                          initial={{ opacity: 0, height: 0 }}
                          animate={{
                            opacity: 1,
                            height: "auto",
                          }}
                          exit={{ opacity: 0, height: 0 }}
                          className="text-xs text-gray-500 mt-2 leading-relaxed"
                        >
                          {source.textPreview}
                        </motion.p>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* External link */}
                  <a
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="flex-shrink-0 p-1 text-gray-300 hover:text-blue-500 transition-colors"
                  >
                    <ExternalLink className="size-3.5" />
                  </a>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}