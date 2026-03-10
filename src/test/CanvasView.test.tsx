import { describe, it, expect, vi } from "vitest";
import { screen, fireEvent } from "@testing-library/react";
import { CanvasView } from "../app/components/CanvasView";
import { renderWithProviders } from "./test-utils";
import type { Slide } from "../app/store/slidesSlice";

// Mock heavy child components to avoid Sandpack/DnD complexity
vi.mock("../app/components/SlideWithCitations", () => ({
  SlideWithCitations: ({ slideNumber }: { slideNumber: number }) => (
    <div data-testid={`slide-content-${slideNumber}`}>Slide {slideNumber}</div>
  ),
}));

vi.mock("../app/components/ThemeToolbar", () => ({
  ThemeToolbar: () => <div data-testid="theme-toolbar">ThemeToolbar</div>,
}));

vi.mock("../app/components/DraggableThumbnail", () => ({
  DraggableThumbnail: ({
    slideNumber,
    isSelected,
    onClick,
  }: {
    slideNumber: number;
    isSelected: boolean;
    onClick: () => void;
  }) => (
    <div
      data-testid={`thumbnail-${slideNumber}`}
      data-selected={isSelected}
      onClick={onClick}
    >
      Thumb {slideNumber}
    </div>
  ),
}));

vi.mock("react-dnd", () => ({
  DndProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("react-dnd-html5-backend", () => ({
  HTML5Backend: {},
}));

const mockSlides: Slide[] = [
  { id: "s1", slideNumber: 1, code: "code1", timestamp: Date.now() },
  { id: "s2", slideNumber: 2, code: "code2", timestamp: Date.now() },
];

function renderCanvas(slides: Slide[] = []) {
  return renderWithProviders(
    <CanvasView
      onCitationClick={vi.fn()}
      onSlideRendered={vi.fn()}
      presentationId="pres-1"
      onReorderUpload={vi.fn()}
    />,
    {
      preloadedState: {
        slides: {
          slides,
          cachedSlides: [],
          currentSlideId: slides[0]?.id ?? null,
          isGenerating: false,
          error: null,
          presentationName: "Test",
          versionHistory: {},
        },
      },
    }
  );
}

describe("CanvasView", () => {
  it("renders empty state when there are no slides", () => {
    renderCanvas();
    expect(
      screen.getByText(/No slides yet. Start by sending a prompt/)
    ).toBeInTheDocument();
  });

  it("renders ThemeToolbar", () => {
    renderCanvas();
    expect(screen.getByTestId("theme-toolbar")).toBeInTheDocument();
  });

  it("renders slide canvases for each slide", () => {
    renderCanvas(mockSlides);
    expect(screen.getByTestId("slide-content-1")).toBeInTheDocument();
    expect(screen.getByTestId("slide-content-2")).toBeInTheDocument();
  });

  it("renders thumbnails for each slide", () => {
    renderCanvas(mockSlides);
    expect(screen.getByTestId("thumbnail-1")).toBeInTheDocument();
    expect(screen.getByTestId("thumbnail-2")).toBeInTheDocument();
  });

  it("marks the first slide as the current slide", () => {
    renderCanvas(mockSlides);
    const thumb1 = screen.getByTestId("thumbnail-1");
    expect(thumb1.getAttribute("data-selected")).toBe("true");
  });

  it("dispatches setCurrentSlide when a slide canvas is clicked", () => {
    const { store } = renderCanvas(mockSlides);
    const slideCanvas = screen.getByTestId("slide-content-2").parentElement!;
    fireEvent.click(slideCanvas);
    expect(store.getState().slides.currentSlideId).toBe("s2");
  });

  it("does not render thumbnail sidebar when no slides", () => {
    renderCanvas();
    expect(screen.queryByTestId("thumbnail-1")).not.toBeInTheDocument();
  });
});
