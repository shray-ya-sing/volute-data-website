import { X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useState } from "react";
import { Slide } from "../store/slidesSlice";
import { SlideDataPoint } from "../types/slideData";
import { DataPointsTable } from "./DataPointsTable";
import { DataPointSourcesPane } from "./DataPointSourcesPane";

interface SlideDataModalProps {
  slide: Slide | null;
  isOpen: boolean;
  onClose: () => void;
}

export function SlideDataModal({
  slide,
  isOpen,
  onClose,
}: SlideDataModalProps) {
  const dataPoints = slide?.dataPoints || [];
  const [selectedDataPoint, setSelectedDataPoint] = useState<SlideDataPoint | null>(null);

  const handleDataPointClick = (dataPoint: SlideDataPoint) => {
    setSelectedDataPoint(dataPoint);
  };

  const handleClosePane = () => {
    setSelectedDataPoint(null);
  };

  const handleClose = () => {
    setSelectedDataPoint(null);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && slide && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
            onClick={handleClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-4 md:inset-8 lg:inset-16 bg-[var(--volute-bg)] rounded-lg shadow-2xl z-50 flex flex-col overflow-hidden border border-[var(--volute-border)]"
          >
            {/* Header */}
            <div className="px-6 py-4 border-b border-[var(--volute-border)] bg-[var(--volute-surface)] flex-shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0 pr-4">
                  <h2 className="text-lg font-semibold text-[var(--volute-text-primary)] mb-1">
                    Slide {slide.slideNumber} Data Points
                  </h2>
                  <p className="text-sm text-[var(--volute-text-secondary)]">
                    {dataPoints.length} data point{dataPoints.length !== 1 ? 's' : ''} tracked
                  </p>
                </div>
                <button
                  onClick={handleClose}
                  className="p-2 hover:bg-[var(--volute-surface-2)] rounded transition-colors flex-shrink-0"
                  aria-label="Close modal"
                >
                  <X className="w-5 h-5 text-[var(--volute-text-secondary)]" />
                </button>
              </div>
            </div>

            {/* Content - Split Layout */}
            <div className="flex-1 flex overflow-hidden">
              {/* Left: Data Table */}
              <div className={`flex-1 overflow-auto p-8 bg-[var(--volute-bg)] transition-all ${selectedDataPoint ? 'w-3/5' : 'w-full'}`}>
                <DataPointsTable
                  dataPoints={dataPoints}
                  onDataPointClick={handleDataPointClick}
                  selectedDataPointId={selectedDataPoint?.id}
                />
              </div>

              {/* Right: Sources Pane */}
              <AnimatePresence>
                {selectedDataPoint && (
                  <motion.div
                    initial={{ x: '100%', opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    exit={{ x: '100%', opacity: 0 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                    className="w-2/5 flex-shrink-0"
                  >
                    <DataPointSourcesPane
                      dataPoint={selectedDataPoint}
                      onClose={handleClosePane}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Footer */}
            <div className="px-8 py-4 border-t border-[var(--volute-border)] bg-[var(--volute-surface)] flex-shrink-0">
              <div className="flex items-center justify-end text-sm text-[var(--volute-text-secondary)]">
                <p className="text-xs text-[var(--volute-text-muted)]">
                  Click on any row to view source documents
                </p>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}