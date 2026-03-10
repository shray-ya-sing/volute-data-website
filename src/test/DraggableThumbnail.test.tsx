import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { DraggableThumbnail } from "../app/components/DraggableThumbnail";

function renderThumbnail(overrides: Partial<Parameters<typeof DraggableThumbnail>[0]> = {}) {
  const props = {
    id: "slide-1",
    index: 0,
    slideNumber: 1,
    isSelected: false,
    onClick: vi.fn(),
    onMove: vi.fn(),
    ...overrides,
  };

  return {
    ...render(
      <DndProvider backend={HTML5Backend}>
        <DraggableThumbnail {...props} />
      </DndProvider>
    ),
    props,
  };
}

describe("DraggableThumbnail", () => {
  it("renders the slide number", () => {
    renderThumbnail({ slideNumber: 3 });
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("calls onClick when clicked", async () => {
    const user = userEvent.setup();
    const { props } = renderThumbnail();

    await user.click(screen.getByText("1"));
    expect(props.onClick).toHaveBeenCalled();
  });

  it("applies selected styling when isSelected is true", () => {
    const { container } = renderThumbnail({ isSelected: true });
    // Selected thumbnails should have border-blue-500 class
    const thumbnail = container.firstChild as HTMLElement;
    expect(thumbnail.className).toContain("border-blue-500");
  });

  it("applies non-selected styling when isSelected is false", () => {
    const { container } = renderThumbnail({ isSelected: false });
    const thumbnail = container.firstChild as HTMLElement;
    expect(thumbnail.className).toContain("border-gray-300");
  });

  it("renders with cursor-grab style", () => {
    const { container } = renderThumbnail();
    const thumbnail = container.firstChild as HTMLElement;
    expect(thumbnail.style.cursor).toBe("grab");
  });
});
