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
};

const initialState: SlidesState = loadSlidesState() || defaultState;

// ---------------------------------------------------------------------------
// Helper: merge incoming data points into existing ones, deduplicating by label.
// Incoming points win over existing ones when labels collide.
// ---------------------------------------------------------------------------
function mergeDataPoints(
  existing: SlideDataPoint[],
  incoming: SlideDataPoint[]
): SlideDataPoint[] {
  // Build a map keyed by label from the existing points
  const byLabel = new Map<string, SlideDataPoint>(
    existing.map((dp) => [dp.label, dp])
  );

  // Overwrite / add with incoming points
  for (const dp of incoming) {
    byLabel.set(dp.label, dp);
  }

  return Array.from(byLabel.values());
}

export const slidesSlice = createSlice({
  name: "slides",
  initialState,
  reducers: {
    // -----------------------------------------------------------------------
    addSlide: (
      state,
      action: PayloadAction<{ slideNumber: number; code: string }>
    ) => {
      const { slideNumber, code } = action.payload;
      console.log(
        `[slidesSlice] addSlide called: slideNumber=${slideNumber}, ` +
          `codeLength=${code.length}, ` +
          `existingSlides=[${state.slides.map((s) => s.slideNumber).join(", ")}]`
      );

      const existingIndex = state.slides.findIndex(
        (s) => s.slideNumber === slideNumber
      );

      if (existingIndex !== -1) {
        const existing = state.slides[existingIndex];
        console.log(
          `[slidesSlice] addSlide: replacing existing slide #${slideNumber} ` +
            `(id=${existing.id}) at index ${existingIndex}`
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
          // Preserve any data points that were already attached to this slide
          dataPoints: existing.dataPoints,
        };
        state.slides[existingIndex] = newSlide;
        state.currentSlideId = newSlide.id;
        console.log(
          `[slidesSlice] addSlide: replaced → new id=${newSlide.id}, ` +
            `version history count=${state.versionHistory[slideNumber]?.length}`
        );
      } else {
        const newSlide: Slide = {
          id: `slide-${Date.now()}`,
          slideNumber,
          code,
          timestamp: Date.now(),
        };
        state.slides.push(newSlide);
        state.currentSlideId = newSlide.id;
        console.log(
          `[slidesSlice] addSlide: appended new slide #${slideNumber} ` +
            `(id=${newSlide.id}), total slides=${state.slides.length}`
        );
      }
    },

    // -----------------------------------------------------------------------
    updateSlide: (
      state,
      action: PayloadAction<{ id: string; code: string }>
    ) => {
      const slide = state.slides.find((s) => s.id === action.payload.id);
      console.log(
        `[slidesSlice] updateSlide called: id=${action.payload.id}, ` +
          `found=${!!slide}${slide ? `, slideNumber=${slide.slideNumber}` : ""}`
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
      }
    },

    // -----------------------------------------------------------------------
    deleteSlide: (state, action: PayloadAction<string>) => {
      state.slides = state.slides.filter((s) => s.id !== action.payload);
      if (state.currentSlideId === action.payload) {
        state.currentSlideId = state.slides[0]?.id || null;
      }
    },

    // -----------------------------------------------------------------------
    setCurrentSlide: (state, action: PayloadAction<string>) => {
      state.currentSlideId = action.payload;
    },

    // -----------------------------------------------------------------------
    setGenerating: (state, action: PayloadAction<boolean>) => {
      state.isGenerating = action.payload;
    },

    // -----------------------------------------------------------------------
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },

    // -----------------------------------------------------------------------
    setPresentationName: (state, action: PayloadAction<string>) => {
      state.presentationName = action.payload;
    },

    // -----------------------------------------------------------------------
    clearSlides: (state) => {
      state.slides = [];
      state.currentSlideId = null;
    },

    // -----------------------------------------------------------------------
    clearCachedSlides: (state) => {
      state.cachedSlides = [];
    },

    // -----------------------------------------------------------------------
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

    // -----------------------------------------------------------------------
    clearVersionHistory: (state) => {
      state.versionHistory = {};
    },

    // -----------------------------------------------------------------------
    reorderSlides: (
      state,
      action: PayloadAction<{ fromIndex: number; toIndex: number }>
    ) => {
      const { fromIndex, toIndex } = action.payload;
      console.log(
        `[slidesSlice] reorderSlides: moving slide from index ${fromIndex} to ${toIndex}`
      );

      if (
        fromIndex === toIndex ||
        fromIndex < 0 ||
        toIndex < 0 ||
        fromIndex >= state.slides.length ||
        toIndex >= state.slides.length
      ) {
        return;
      }

      // Sort by slideNumber first for consistent indexing
      state.slides.sort((a, b) => a.slideNumber - b.slideNumber);

      const [movedSlide] = state.slides.splice(fromIndex, 1);
      state.slides.splice(toIndex, 0, movedSlide);

      // Snapshot old slideNumber → history mapping keyed by slide id
      const historyById: Record<string, SlideVersion[]> = {};
      state.slides.forEach((slide) => {
        if (state.versionHistory[slide.slideNumber]) {
          historyById[slide.id] = state.versionHistory[slide.slideNumber];
        }
      });

      // Reassign slide numbers to match new order
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

      console.log(
        `[slidesSlice] reorderSlides: new order = [${state.slides
          .map((s) => `${s.slideNumber}(${s.code.slice(0, 20)}...)`)
          .join(", ")}]`
      );
    },

    // -----------------------------------------------------------------------
    // KEY FIX: setSlideDataPoints now supports replace (default) and append modes.
    //
    // Payload:
    //   slideNumber  – which slide to update
    //   dataPoints   – the incoming points from the SSE payload
    //   mode         – "replace" (default) | "append"
    //                  "append"  → merge with existing, deduplicate by label
    //                  "replace" → wipe existing and set fresh (legacy behaviour)
    // -----------------------------------------------------------------------
    setSlideDataPoints: (
      state,
      action: PayloadAction<{
        slideNumber: number;
        dataPoints: SlideDataPoint[];
        mode?: "replace" | "append";
      }>
    ) => {
      const { slideNumber, dataPoints, mode = "replace" } = action.payload;
      const slide = state.slides.find((s) => s.slideNumber === slideNumber);

      if (!slide) {
        console.warn(
          `[slidesSlice] setSlideDataPoints: no slide found for #${slideNumber}`
        );
        return;
      }

      if (mode === "append") {
        const existing = slide.dataPoints ?? [];
        const merged = mergeDataPoints(existing, dataPoints);
        slide.dataPoints = merged;
        console.log(
          `[slidesSlice] setSlideDataPoints (append): slide #${slideNumber} — ` +
            `existing=${existing.length}, incoming=${dataPoints.length}, ` +
            `merged=${merged.length}`
        );
      } else {
        // "replace" — original behaviour, kept for cases where a full refresh
        // of data points is explicitly requested (e.g. slide regeneration).
        slide.dataPoints = dataPoints;
        console.log(
          `[slidesSlice] setSlideDataPoints (replace): slide #${slideNumber} — ` +
            `set ${dataPoints.length} datapoints`
        );
      }
    },

    // -----------------------------------------------------------------------
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
            `[slidesSlice] updateDataPointVerifications: updated verifications ` +
              `for datapoint ${dataPointId}`
          );
        }
      }
    },

    // -----------------------------------------------------------------------
    updateDataPointScreenshots: (
      state,
      action: PayloadAction<{
        slideNumber: number;
        dataPointId: string;
        screenshots: Record<string, string>;
      }>
    ) => {
      const { slideNumber, dataPointId, screenshots } = action.payload;
      const slide = state.slides.find((s) => s.slideNumber === slideNumber);
      if (slide?.dataPoints) {
        const dataPoint = slide.dataPoints.find((dp) => dp.id === dataPointId);
        if (dataPoint) {
          dataPoint.screenshots = screenshots;
          console.log(
            `[slidesSlice] updateDataPointScreenshots: updated ` +
              `${Object.keys(screenshots).length} screenshots for datapoint ${dataPointId}`
          );
        }
      }
    },

    // -----------------------------------------------------------------------
    // Utility: explicitly clear all data points for a slide (e.g. before a
    // full regeneration where you want a clean slate).
    // -----------------------------------------------------------------------
    clearSlideDataPoints: (
      state,
      action: PayloadAction<{ slideNumber: number }>
    ) => {
      const slide = state.slides.find(
        (s) => s.slideNumber === action.payload.slideNumber
      );
      if (slide) {
        slide.dataPoints = [];
        console.log(
          `[slidesSlice] clearSlideDataPoints: cleared datapoints for slide #${action.payload.slideNumber}`
        );
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
  updateDataPointScreenshots,
  clearSlideDataPoints,
} = slidesSlice.actions;

export default slidesSlice.reducer;