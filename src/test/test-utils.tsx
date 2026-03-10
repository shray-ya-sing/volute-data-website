import { render, type RenderOptions } from "@testing-library/react";
import { configureStore, type PreloadedState } from "@reduxjs/toolkit";
import { Provider } from "react-redux";
import type { PropsWithChildren, ReactElement } from "react";
import themeReducer from "../app/store/themeSlice";
import slidesReducer from "../app/store/slidesSlice";
import attachmentsReducer from "../app/store/attachmentsSlice";
import type { RootState } from "../app/store/store";

/**
 * Creates a fresh Redux store with optional preloaded state.
 */
export function createTestStore(preloadedState?: PreloadedState<RootState>) {
  return configureStore({
    reducer: {
      theme: themeReducer,
      slides: slidesReducer,
      attachments: attachmentsReducer,
    },
    preloadedState,
  });
}

type AppStore = ReturnType<typeof createTestStore>;

interface ExtendedRenderOptions extends Omit<RenderOptions, "queries"> {
  preloadedState?: PreloadedState<RootState>;
  store?: AppStore;
}

/**
 * Custom render that wraps the component in a Redux Provider.
 */
export function renderWithProviders(
  ui: ReactElement,
  {
    preloadedState,
    store = createTestStore(preloadedState),
    ...renderOptions
  }: ExtendedRenderOptions = {}
) {
  function Wrapper({ children }: PropsWithChildren) {
    return <Provider store={store}>{children}</Provider>;
  }

  return { store, ...render(ui, { wrapper: Wrapper, ...renderOptions }) };
}
