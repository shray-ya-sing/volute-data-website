import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export interface ThemeState {
  headingFont: string;
  bodyFont: string;
  accentColors: string[];
  headingTextColor: string;
  bodyTextColor: string;
  headingFontSize: number;
  bodyFontSize: number;
}

const STORAGE_KEY = "volute_theme";

function loadThemeState(): ThemeState | undefined {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn("[themeSlice] Failed to load from localStorage:", e);
  }
  return undefined;
}

const defaultState: ThemeState = {
  headingFont: "Inter",
  bodyFont: "Inter",
  accentColors: ["#0d1b2a", "#1b263b", "#415a77", "#778da9", "#e0e1dd"],
  headingTextColor: "#111827",
  bodyTextColor: "#374151",
  headingFontSize: 32,
  bodyFontSize: 16,
};

const initialState: ThemeState = loadThemeState() || defaultState;

export const themeSlice = createSlice({
  name: "theme",
  initialState,
  reducers: {
    setHeadingFont: (state, action: PayloadAction<string>) => {
      state.headingFont = action.payload;
    },
    setBodyFont: (state, action: PayloadAction<string>) => {
      state.bodyFont = action.payload;
    },
    setAccentColor: (state, action: PayloadAction<{ index: number; color: string }>) => {
      state.accentColors[action.payload.index] = action.payload.color;
    },
    setHeadingTextColor: (state, action: PayloadAction<string>) => {
      state.headingTextColor = action.payload;
    },
    setBodyTextColor: (state, action: PayloadAction<string>) => {
      state.bodyTextColor = action.payload;
    },
    setHeadingFontSize: (state, action: PayloadAction<number>) => {
      state.headingFontSize = action.payload;
    },
    setBodyFontSize: (state, action: PayloadAction<number>) => {
      state.bodyFontSize = action.payload;
    },
  },
});

export const {
  setHeadingFont,
  setBodyFont,
  setAccentColor,
  setHeadingTextColor,
  setBodyTextColor,
  setHeadingFontSize,
  setBodyFontSize,
} = themeSlice.actions;

export default themeSlice.reducer;