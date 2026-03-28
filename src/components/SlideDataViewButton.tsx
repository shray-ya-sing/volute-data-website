import { Database } from "lucide-react";
import { useAppSelector, useAppDispatch } from "../store/hooks";
import { setSlideDataPoints } from "../store/slidesSlice";
import { ENABLE_MOCK_DATA } from "../config/features";

// ⚠️ DEVELOPMENT ONLY: Mock data generation for testing UI components
// This import should be removed or feature-flagged in production
import { generateMockDataPoints } from "../utils/mockDataPoints";

interface SlideDataViewButtonProps {
  slideId: string;
  onSlideDataView: (slideId: string) => void;
}

export function SlideDataViewButton({ slideId, onSlideDataView }: SlideDataViewButtonProps) {
  const dispatch = useAppDispatch();
  const slide = useAppSelector((state) => 
    state.slides.slides.find(s => s.id === slideId)
  );
  
  const dataPointCount = slide?.dataPoints?.length || 0;

  // ⚠️ DEVELOPMENT ONLY: Manual mock data injection for testing
  // Real production data comes from the backend via 'slide_data_points' SSE events
  // which are handled in useAgentStream.ts
  const handleAddMockData = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (slide) {
      const mockData = generateMockDataPoints(slide.slideNumber);
      dispatch(setSlideDataPoints({ 
        slideNumber: slide.slideNumber, 
        dataPoints: mockData 
      }));
      console.log(`🧪 [DEV ONLY] Added ${mockData.length} MOCK data points to slide ${slide.slideNumber}`);
    }
  };

  // Show "Add Mock Data" button if no datapoints (DEVELOPMENT/TESTING ONLY)
  if (dataPointCount === 0 && ENABLE_MOCK_DATA) {
    return (
      <button
        onClick={handleAddMockData}
        className="absolute top-3 right-3 z-10 flex items-center gap-2 px-3 py-1.5 bg-amber-50 border border-amber-300 rounded-md shadow-sm hover:border-amber-400 hover:bg-amber-100 transition-all group"
        title="[DEV ONLY] Add mock data for testing UI components"
      >
        <Database className="w-4 h-4 text-amber-600" />
        <span className="text-sm font-medium text-amber-700">
          Add Mock Data (Dev)
        </span>
      </button>
    );
  }

  // Show "View Data" button if datapoints exist
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onSlideDataView(slideId);
      }}
      className="absolute top-3 right-3 z-10 flex items-center gap-2 px-3 py-1.5 bg-[var(--volute-surface)] border border-[var(--volute-border)] rounded-md shadow-sm hover:border-[var(--volute-border-hover)] hover:bg-[var(--volute-surface-2)] transition-all group"
      title="View slide data and sources"
    >
      <Database className="w-4 h-4 text-[var(--volute-accent)]" />
      <span className="text-sm font-medium text-[var(--volute-text-secondary)]">
        View Data
      </span>
      <span className="px-2 py-0.5 bg-[var(--volute-accent-dim)] text-[var(--volute-accent)] text-xs font-semibold rounded-full">
        {dataPointCount}
      </span>
    </button>
  );
}