import { configureStore } from "@reduxjs/toolkit";
import themeReducer from "./themeSlice";
import slidesReducer from "./slidesSlice";

export const store = configureStore({
  reducer: {
    theme: themeReducer,
    slides: slidesReducer,
  },
});

// Persist slides and theme to localStorage on every state change
store.subscribe(() => {
  const state = store.getState();
  try {
    localStorage.setItem("volute_slides", JSON.stringify(state.slides));
    localStorage.setItem("volute_theme", JSON.stringify(state.theme));
  } catch (e) {
    console.warn("[store] Failed to persist state to localStorage:", e);
  }
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;