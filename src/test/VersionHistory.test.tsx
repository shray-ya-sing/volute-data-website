import { describe, it, expect, vi } from "vitest";
import { screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { VersionHistory } from "../app/components/VersionHistory";
import { renderWithProviders } from "./test-utils";
import type { Slide, SlideVersion } from "../app/store/slidesSlice";

const slides: Slide[] = [
  { id: "s1", slideNumber: 1, code: "current-code", timestamp: Date.now() },
];

const versionHistory: Record<number, SlideVersion[]> = {
  1: [
    { code: "old-code-v1", timestamp: Date.now() - 60000, versionNumber: 1 },
    { code: "old-code-v2", timestamp: Date.now() - 30000, versionNumber: 2 },
  ],
};

function renderVersionHistory(
  overrides: {
    slides?: Slide[];
    versionHistory?: Record<number, SlideVersion[]>;
  } = {}
) {
  return renderWithProviders(<VersionHistory />, {
    preloadedState: {
      slides: {
        slides: overrides.slides ?? [],
        cachedSlides: [],
        currentSlideId: null,
        isGenerating: false,
        error: null,
        presentationName: "Test",
        versionHistory: overrides.versionHistory ?? {},
      },
    },
  });
}

describe("VersionHistory", () => {
  it("renders disabled button when there is no version history", () => {
    renderVersionHistory();
    const btn = screen.getByTitle("No version history yet");
    expect(btn).toBeDisabled();
  });

  it("renders enabled button when there is version history", () => {
    renderVersionHistory({ slides, versionHistory });
    const btn = screen.getByTitle("Version history");
    expect(btn).not.toBeDisabled();
  });

  it("opens dropdown when clicking the history button", async () => {
    const user = userEvent.setup();
    renderVersionHistory({ slides, versionHistory });

    await user.click(screen.getByTitle("Version history"));
    expect(screen.getByText("Version History")).toBeInTheDocument();
    expect(screen.getByText("Slide 1")).toBeInTheDocument();
  });

  it("shows version count for each slide", async () => {
    const user = userEvent.setup();
    renderVersionHistory({ slides, versionHistory });

    await user.click(screen.getByTitle("Version history"));
    expect(screen.getByText("2 versions")).toBeInTheDocument();
  });

  it("navigates to version list for a specific slide", async () => {
    const user = userEvent.setup();
    renderVersionHistory({ slides, versionHistory });

    await user.click(screen.getByTitle("Version history"));
    // Click on Slide 1 to expand
    await user.click(screen.getByText("Slide 1"));

    // Should see Current and Version 2, Version 1
    expect(screen.getByText("Current")).toBeInTheDocument();
    expect(screen.getByText("Version 2")).toBeInTheDocument();
    expect(screen.getByText("Version 1")).toBeInTheDocument();
  });

  it("restores a version when clicking on it", async () => {
    const user = userEvent.setup();
    const { store } = renderVersionHistory({ slides, versionHistory });

    await user.click(screen.getByTitle("Version history"));
    await user.click(screen.getByText("Slide 1"));
    await user.click(screen.getByText("Version 1"));

    // After restoring, the current slide code should be the old version
    const currentSlide = store.getState().slides.slides.find(
      (s) => s.slideNumber === 1
    );
    expect(currentSlide?.code).toBe("old-code-v1");
  });

  it("closes the dropdown after restoring a version", async () => {
    const user = userEvent.setup();
    renderVersionHistory({ slides, versionHistory });

    await user.click(screen.getByTitle("Version history"));
    await user.click(screen.getByText("Slide 1"));
    await user.click(screen.getByText("Version 1"));

    // Dropdown should be closed
    expect(screen.queryByText("Version History")).not.toBeInTheDocument();
  });

  it("navigates back from version list to slide list", async () => {
    const user = userEvent.setup();
    renderVersionHistory({ slides, versionHistory });

    await user.click(screen.getByTitle("Version history"));
    await user.click(screen.getByText("Slide 1"));

    // Should be in version list mode — find back button (shows "Slide 1" text)
    // Click the back button area
    const backBtn = screen.getByText("Slide 1");
    await user.click(backBtn);

    // Should be back at the slide list showing version count
    expect(screen.getByText("2 versions")).toBeInTheDocument();
  });
});
