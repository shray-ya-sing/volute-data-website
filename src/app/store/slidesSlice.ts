import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export interface Slide {
  id: string;
  slideNumber: number;
  code: string;
  timestamp: number;
}

export interface SlidesState {
  slides: Slide[];
  cachedSlides: Slide[];
  currentSlideId: string | null;
  isGenerating: boolean;
  error: string | null;
  presentationName: string;
}

const STORAGE_KEY = "volute_slides";

function loadSlidesState(): SlidesState | undefined {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      // Keep cached slides for reference but don't auto-load into canvas
      return {
        slides: [],
        cachedSlides: parsed.slides || [],
        currentSlideId: null,
        isGenerating: false,
        error: null,
        presentationName: parsed.presentationName || "Untitled Presentation",
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
};

const initialState: SlidesState = loadSlidesState() || defaultState;

export const slidesSlice = createSlice({
  name: "slides",
  initialState,
  reducers: {
    addSlide: (state, action: PayloadAction<{ slideNumber: number; code: string }>) => {
      const newSlide: Slide = {
        id: `slide-${Date.now()}`,
        slideNumber: action.payload.slideNumber,
        code: action.payload.code,
        timestamp: Date.now(),
      };
      state.slides.push(newSlide);
      state.currentSlideId = newSlide.id;
    },
    updateSlide: (state, action: PayloadAction<{ id: string; code: string }>) => {
      const slide = state.slides.find((s) => s.id === action.payload.id);
      if (slide) {
        slide.code = action.payload.code;
        slide.timestamp = Date.now();
      }
    },
    deleteSlide: (state, action: PayloadAction<string>) => {
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
    },
    clearCachedSlides: (state) => {
      state.cachedSlides = [];
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
} = slidesSlice.actions;

export default slidesSlice.reducer;