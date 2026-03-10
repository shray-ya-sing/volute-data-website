import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { screen, fireEvent, waitFor } from "@testing-library/react";
import { ExportButton } from "../app/components/ExportButton";
import { renderWithProviders } from "./test-utils";
import type { Slide } from "../app/store/slidesSlice";

const mockSlide: Slide = {
  id: "slide-1",
  slideNumber: 1,
  code: "export default function Slide() { return <div>Slide 1</div>; }",
  timestamp: Date.now(),
};

// Stub URL.createObjectURL / revokeObjectURL
beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn());
  URL.createObjectURL = vi.fn(() => "blob:mock-url");
  URL.revokeObjectURL = vi.fn();
});

afterEach(() => {
  vi.restoreAllMocks();
});

function renderExport(slides: Slide[] = []) {
  return renderWithProviders(<ExportButton />, {
    preloadedState: {
      slides: {
        slides,
        cachedSlides: [],
        currentSlideId: slides[0]?.id ?? null,
        isGenerating: false,
        error: null,
        presentationName: "Test Deck",
        versionHistory: {},
      },
    },
  });
}

describe("ExportButton", () => {
  it("renders a disabled export button when there are no slides", () => {
    renderExport();
    const btn = screen.getByTitle("Export");
    expect(btn).toBeDisabled();
  });

  it("renders an enabled export button when slides exist", () => {
    renderExport([mockSlide]);
    const btn = screen.getByTitle("Export");
    expect(btn).not.toBeDisabled();
  });

  it("shows dropdown with PDF, PNG, PPTX options on mouse enter", async () => {
    renderExport([mockSlide]);
    const wrapper = screen.getByTitle("Export").parentElement!;
    fireEvent.mouseEnter(wrapper);

    expect(screen.getByText("PDF")).toBeInTheDocument();
    expect(screen.getByText("PNG")).toBeInTheDocument();
    expect(screen.getByText("PPTX")).toBeInTheDocument();
  });

  it("hides dropdown on mouse leave", () => {
    renderExport([mockSlide]);
    const wrapper = screen.getByTitle("Export").parentElement!;
    fireEvent.mouseEnter(wrapper);
    expect(screen.getByText("PDF")).toBeInTheDocument();

    fireEvent.mouseLeave(wrapper);
    expect(screen.queryByText("PDF")).not.toBeInTheDocument();
  });

  it("calls the PDF export endpoint when PDF is clicked", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      headers: { get: () => "application/pdf" },
      blob: () => Promise.resolve(new Blob(["pdf-data"], { type: "application/pdf" })),
    });
    vi.stubGlobal("fetch", mockFetch);

    renderExport([mockSlide]);
    const wrapper = screen.getByTitle("Export").parentElement!;
    fireEvent.mouseEnter(wrapper);
    fireEvent.click(screen.getByText("PDF"));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        "https://www.getvolute.com/api/pdf",
        expect.objectContaining({ method: "POST" })
      );
    });
  });

  it("calls the PNG export endpoint when PNG is clicked", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      headers: { get: () => "image/png" },
      blob: () => Promise.resolve(new Blob(["png-data"], { type: "image/png" })),
    });
    vi.stubGlobal("fetch", mockFetch);

    renderExport([mockSlide]);
    const wrapper = screen.getByTitle("Export").parentElement!;
    fireEvent.mouseEnter(wrapper);
    fireEvent.click(screen.getByText("PNG"));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        "https://www.getvolute.com/api/export-png",
        expect.objectContaining({ method: "POST" })
      );
    });
  });

  it("calls the PPTX export endpoints when PPTX is clicked", async () => {
    const mockFetch = vi.fn()
      // First call: generate-slide-json
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ slideNumber: 1, slideJson: { type: "slide" } }),
      })
      // Second call: Presentation/export
      .mockResolvedValueOnce({
        ok: true,
        headers: { get: () => "application/octet-stream" },
        blob: () => Promise.resolve(new Blob(["pptx"], { type: "application/octet-stream" })),
      });
    vi.stubGlobal("fetch", mockFetch);

    renderExport([mockSlide]);
    const wrapper = screen.getByTitle("Export").parentElement!;
    fireEvent.mouseEnter(wrapper);
    fireEvent.click(screen.getByText("PPTX"));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        "https://www.getvolute.com/api/generate-slide-json",
        expect.objectContaining({ method: "POST" })
      );
    });

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        "https://doclayer.onrender.com/api/Presentation/export",
        expect.objectContaining({ method: "POST" })
      );
    });
  });

  it("shows error text when export fails", async () => {
    const mockFetch = vi.fn().mockRejectedValue(new Error("Network error"));
    vi.stubGlobal("fetch", mockFetch);

    renderExport([mockSlide]);
    const wrapper = screen.getByTitle("Export").parentElement!;
    fireEvent.mouseEnter(wrapper);
    fireEvent.click(screen.getByText("PDF"));

    await waitFor(() => {
      expect(screen.getByText("Error exporting, please try again")).toBeInTheDocument();
    });
  });
});
