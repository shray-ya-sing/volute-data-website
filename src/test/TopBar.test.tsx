import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TopBar } from "../app/components/TopBar";
import { renderWithProviders } from "./test-utils";
import type { Slide } from "../app/store/slidesSlice";

// Mock fetch globally (ExportButton + VersionHistory use it indirectly)
beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn());
});

const mockSlides: Slide[] = [
  { id: "s1", slideNumber: 1, code: "code1", timestamp: Date.now() },
  { id: "s2", slideNumber: 2, code: "code2", timestamp: Date.now() },
];

function renderTopBar(slides: Slide[] = [], name = "My Deck") {
  return renderWithProviders(
    <TopBar onNewChat={vi.fn()} isStreaming={false} />,
    {
      preloadedState: {
        slides: {
          slides,
          cachedSlides: [],
          currentSlideId: slides[0]?.id ?? null,
          isGenerating: false,
          error: null,
          presentationName: name,
          versionHistory: {},
        },
      },
    }
  );
}

describe("TopBar", () => {
  it("renders the VOLUTE brand", () => {
    renderTopBar();
    expect(screen.getByText("VOLUTE")).toBeInTheDocument();
  });

  it("renders the presentation name", () => {
    renderTopBar([], "Test Presentation");
    expect(screen.getByText("Test Presentation")).toBeInTheDocument();
  });

  it("shows slide count when slides exist", () => {
    renderTopBar(mockSlides);
    expect(screen.getByText("2 slides")).toBeInTheDocument();
  });

  it("shows singular slide count for one slide", () => {
    renderTopBar([mockSlides[0]]);
    expect(screen.getByText("1 slide")).toBeInTheDocument();
  });

  it("does not show slide count when no slides", () => {
    renderTopBar();
    expect(screen.queryByText(/slide/)).not.toBeInTheDocument();
  });

  it("enters edit mode when clicking the presentation name", async () => {
    const user = userEvent.setup();
    renderTopBar([], "My Deck");

    await user.click(screen.getByText("My Deck"));
    // Should now show an input with the name
    const input = screen.getByDisplayValue("My Deck");
    expect(input).toBeInTheDocument();
  });

  it("dispatches setPresentationName on blur after editing", async () => {
    const user = userEvent.setup();
    const { store } = renderTopBar([], "My Deck");

    await user.click(screen.getByText("My Deck"));
    const input = screen.getByDisplayValue("My Deck");
    await user.clear(input);
    await user.type(input, "New Name");
    fireEvent.blur(input);

    expect(store.getState().slides.presentationName).toBe("New Name");
  });

  it("dispatches setPresentationName on Enter after editing", async () => {
    const user = userEvent.setup();
    const { store } = renderTopBar([], "My Deck");

    await user.click(screen.getByText("My Deck"));
    const input = screen.getByDisplayValue("My Deck");
    await user.clear(input);
    await user.type(input, "Enter Name");
    await user.keyboard("{Enter}");

    expect(store.getState().slides.presentationName).toBe("Enter Name");
  });

  it("calls onNewChat when New Chat button is clicked", async () => {
    const onNewChat = vi.fn();
    const user = userEvent.setup();

    renderWithProviders(
      <TopBar onNewChat={onNewChat} isStreaming={false} />,
      {
        preloadedState: {
          slides: {
            slides: [],
            cachedSlides: [],
            currentSlideId: null,
            isGenerating: false,
            error: null,
            presentationName: "Test",
            versionHistory: {},
          },
        },
      }
    );

    await user.click(screen.getByTitle("New Chat"));
    expect(onNewChat).toHaveBeenCalled();
  });

  it("disables New Chat button when streaming", () => {
    renderWithProviders(
      <TopBar onNewChat={vi.fn()} isStreaming />,
      {
        preloadedState: {
          slides: {
            slides: [],
            cachedSlides: [],
            currentSlideId: null,
            isGenerating: false,
            error: null,
            presentationName: "Test",
            versionHistory: {},
          },
        },
      }
    );

    expect(screen.getByTitle("New Chat")).toBeDisabled();
  });
});
