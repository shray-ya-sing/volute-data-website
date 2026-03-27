import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { SlideDataPoint, VerificationResult } from "../types/slideData";

export interface SlideVersion {
  code: string;
  timestamp: number;
  versionNumber: number;
}

export interface Slide {
  id: string;
  slideNumber: number;
  code: string;
  timestamp: number;
  dataPoints?: SlideDataPoint[];
}

export interface SlidesState {
  slides: Slide[];
  cachedSlides: Slide[];
  currentSlideId: string | null;
  isGenerating: boolean;
  error: string | null;
  presentationName: string;
  /** version history keyed by slideNumber → array of prior versions */
  versionHistory: Record<number, SlideVersion[]>;
  /**
   * Buffer for data points that arrive via slide_data_points SSE before the
   * slide itself exists in state (slide_generated hasn't fired yet).
   * Drained automatically by addSlide / updateSlide when the slide lands.
   */
  pendingDataPoints: Record<number, SlideDataPoint[]>;
}

const STORAGE_KEY = "volute_slides";

function loadSlidesState(): SlidesState | undefined {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        slides: [],
        cachedSlides: parsed.slides || [],
        currentSlideId: null,
        isGenerating: false,
        error: null,
        presentationName: parsed.presentationName || "Untitled Presentation",
        versionHistory: parsed.versionHistory || {},
        // Never restore pending data points from storage — they are transient
        pendingDataPoints: {},
      };
    }
  } catch (e) {
    console.warn("[slidesSlice] Failed to load from localStorage:", e);
  }
  return undefined;
}

const defaultState: SlidesState = {
  slides: [],
  cachedSlides: [],
  currentSlideId: null,
  isGenerating: false,
  error: null,
  presentationName: "Untitled Presentation",
  versionHistory: {},
  pendingDataPoints: {},
};

const initialState: SlidesState = loadSlidesState() || defaultState;

// ---------------------------------------------------------------------------
// Helper: drain any buffered data points onto a slide that just landed
// ---------------------------------------------------------------------------

function drainPendingDataPoints(state: SlidesState, slide: Slide): void {
  const pending = state.pendingDataPoints[slide.slideNumber];
  if (pending) {
    slide.dataPoints = pending;
    delete state.pendingDataPoints[slide.slideNumber];
    console.log(
      `[slidesSlice] drainPendingDataPoints: attached ${pending.length} buffered datapoints to slide #${slide.slideNumber}`
    );
  }
}

// ---------------------------------------------------------------------------
// Slice
// ---------------------------------------------------------------------------

export const slidesSlice = createSlice({
  name: "slides",
  initialState,
  reducers: {

    addSlide: (state, action: PayloadAction<{ slideNumber: number; code: string }>) => {
      const { slideNumber, code } = action.payload;
      console.log(
        `[slidesSlice] addSlide called: slideNumber=${slideNumber}, codeLength=${code.length}, ` +
        `existingSlides=[${state.slides.map((s) => s.slideNumber).join(", ")}]`
      );

      const existingIndex = state.slides.findIndex((s) => s.slideNumber === slideNumber);

      if (existingIndex !== -1) {
        // Slide already exists — snapshot before replacing
        const existing = state.slides[existingIndex];
        console.log(
          `[slidesSlice] addSlide: replacing existing slide #${slideNumber} (id=${existing.id}) at index ${existingIndex}`
        );

        if (!state.versionHistory[slideNumber]) {
          state.versionHistory[slideNumber] = [];
        }
        const nextVersion = state.versionHistory[slideNumber].length + 1;
        state.versionHistory[slideNumber].push({
          code: existing.code,
          timestamp: existing.timestamp,
          versionNumber: nextVersion,
        });

        const newSlide: Slide = {
          id: `slide-${Date.now()}`,
          slideNumber,
          code,
          timestamp: Date.now(),
          // Preserve existing data points unless pending ones supersede them
          dataPoints: existing.dataPoints,
        };

        drainPendingDataPoints(state, newSlide);

        state.slides[existingIndex] = newSlide;
        state.currentSlideId = newSlide.id;
        console.log(
          `[slidesSlice] addSlide: replaced → new id=${newSlide.id}, ` +
          `version history count=${state.versionHistory[slideNumber]?.length}`
        );
      } else {
        // Brand new slide
        const newSlide: Slide = {
          id: `slide-${Date.now()}`,
          slideNumber,
          code,
          timestamp: Date.now(),
        };

        drainPendingDataPoints(state, newSlide);

        state.slides.push(newSlide);
        state.currentSlideId = newSlide.id;
        console.log(
          `[slidesSlice] addSlide: appended new slide #${slideNumber} (id=${newSlide.id}), ` +
          `total slides=${state.slides.length}`
        );
      }
    },

    updateSlide: (state, action: PayloadAction<{ id: string; code: string }>) => {
      const slide = state.slides.find((s) => s.id === action.payload.id);
      console.log(
        `[slidesSlice] updateSlide called: id=${action.payload.id}, found=${!!slide}` +
        `${slide ? `, slideNumber=${slide.slideNumber}` : ""}`
      );

      if (slide) {
        const sn = slide.slideNumber;

        if (!state.versionHistory[sn]) {
          state.versionHistory[sn] = [];
        }
        const nextVersion = state.versionHistory[sn].length + 1;
        state.versionHistory[sn].push({
          code: slide.code,
          timestamp: slide.timestamp,
          versionNumber: nextVersion,
        });

        slide.code = action.payload.code;
        slide.timestamp = Date.now();

        drainPendingDataPoints(state, slide);
      }
    },

    deleteSlide: (state, action: PayloadAction<string>) => {
      const slide = state.slides.find((s) => s.id === action.payload);
      if (slide) {
        // Clean up any buffered data points for this slide number
        delete state.pendingDataPoints[slide.slideNumber];
      }
      state.slides = state.slides.filter((s) => s.id !== action.payload);
      if (state.currentSlideId === action.payload) {
        state.currentSlideId = state.slides[0]?.id || null;
      }
    },

    setCurrentSlide: (state, action: PayloadAction<string>) => {
      state.currentSlideId = action.payload;
    },

    setGenerating: (state, action: PayloadAction<boolean>) => {
      state.isGenerating = action.payload;
    },

    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },

    setPresentationName: (state, action: PayloadAction<string>) => {
      state.presentationName = action.payload;
    },

    clearSlides: (state) => {
      state.slides = [];
      state.currentSlideId = null;
      state.pendingDataPoints = {};
    },

    clearCachedSlides: (state) => {
      state.cachedSlides = [];
    },

    restoreVersion: (
      state,
      action: PayloadAction<{ slideNumber: number; versionNumber: number }>
    ) => {
      const { slideNumber, versionNumber } = action.payload;
      const versions = state.versionHistory[slideNumber];
      if (!versions) return;

      const version = versions.find((v) => v.versionNumber === versionNumber);
      if (!version) return;

      const slide = state.slides.find((s) => s.slideNumber === slideNumber);
      if (slide) {
        const nextVer = versions.length + 1;
        versions.push({
          code: slide.code,
          timestamp: slide.timestamp,
          versionNumber: nextVer,
        });
        slide.code = version.code;
        slide.timestamp = Date.now();
      }
    },

    clearVersionHistory: (state) => {
      state.versionHistory = {};
    },

    reorderSlides: (state, action: PayloadAction<{ fromIndex: number; toIndex: number }>) => {
      const { fromIndex, toIndex } = action.payload;
      console.log(`[slidesSlice] reorderSlides: moving slide from index ${fromIndex} to ${toIndex}`);

      if (
        fromIndex === toIndex ||
        fromIndex < 0 ||
        toIndex < 0 ||
        fromIndex >= state.slides.length ||
        toIndex >= state.slides.length
      ) {
        return;
      }

      // Sort by slideNumber first to ensure consistent indexing
      state.slides.sort((a, b) => a.slideNumber - b.slideNumber);

      const [movedSlide] = state.slides.splice(fromIndex, 1);
      state.slides.splice(toIndex, 0, movedSlide);

      // Snapshot old slideNumber → history keyed by slide id so versions
      // travel with the slide rather than staying on the old number.
      const historyById: Record<string, SlideVersion[]> = {};
      state.slides.forEach((slide) => {
        if (state.versionHistory[slide.slideNumber]) {
          historyById[slide.id] = state.versionHistory[slide.slideNumber];
        }
      });

      // Reassign slide numbers to match new array order
      state.slides.forEach((slide, index) => {
        slide.slideNumber = index + 1;
      });

      // Rebuild versionHistory keyed by new slideNumber
      const newVersionHistory: Record<number, SlideVersion[]> = {};
      state.slides.forEach((slide) => {
        if (historyById[slide.id]) {
          newVersionHistory[slide.slideNumber] = historyById[slide.id];
        }
      });
      state.versionHistory = newVersionHistory;

      // pendingDataPoints are keyed by slideNumber — clear them on reorder
      // because the mapping is now ambiguous. They are transient anyway.
      state.pendingDataPoints = {};

      console.log(
        `[slidesSlice] reorderSlides: new order = [${state.slides
          .map((s) => `${s.slideNumber}(${s.code.slice(0, 20)}...)`)
          .join(", ")}]`
      );
    },

    /**
     * Called when the agent emits a slide_data_points SSE event.
     *
     * If the slide already exists in state, data points are attached immediately.
     * If the slide doesn't exist yet (slide_generated hasn't fired), data points
     * are buffered in pendingDataPoints and drained by addSlide / updateSlide.
     */
    setSlideDataPoints: (
      state,
      action: PayloadAction<{ slideNumber: number; dataPoints: SlideDataPoint[] }>
    ) => {
      const { slideNumber, dataPoints } = action.payload;
      const slide = state.slides.find((s) => s.slideNumber === slideNumber);

      if (slide) {
        slide.dataPoints = dataPoints;
        console.log(
          `[slidesSlice] setSlideDataPoints: attached ${dataPoints.length} datapoints to existing slide #${slideNumber}`
        );
      } else {
        // Slide not here yet — buffer until addSlide / updateSlide fires
        state.pendingDataPoints[slideNumber] = dataPoints;
        console.log(
          `[slidesSlice] setSlideDataPoints: slide #${slideNumber} not found yet, ` +
          `buffering ${dataPoints.length} datapoints`
        );
      }
    },

    updateDataPointVerifications: (
      state,
      action: PayloadAction<{
        slideId: string;
        dataPointId: string;
        verifications: VerificationResult[];
      }>
    ) => {
      const { slideId, dataPointId, verifications } = action.payload;
      const slide = state.slides.find((s) => s.id === slideId);
      if (slide?.dataPoints) {
        const dataPoint = slide.dataPoints.find((dp) => dp.id === dataPointId);
        if (dataPoint) {
          dataPoint.verifications = verifications;
          console.log(
            `[slidesSlice] updateDataPointVerifications: updated verifications for datapoint ${dataPointId}`
          );
        }
      }
    },
  },
});

export const {
  addSlide,
  updateSlide,
  deleteSlide,
  setCurrentSlide,
  setGenerating,
  setError,
  setPresentationName,
  clearSlides,
  clearCachedSlides,
  restoreVersion,
  clearVersionHistory,
  reorderSlides,
  setSlideDataPoints,
  updateDataPointVerifications,
} = slidesSlice.actions;

export default slidesSlice.reducer;
