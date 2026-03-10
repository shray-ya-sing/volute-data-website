import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SourcePanel } from "../app/components/SourcePanel";
import type { TrackedSource } from "../app/hooks/useAgentStream";

const mockSources: TrackedSource[] = [
  {
    id: 1,
    title: "Annual Report 2024",
    url: "https://example.com/report-2024",
    relevance: "high",
    textPreview: "Revenue grew 15% year over year...",
  },
  {
    id: 2,
    title: "Market Analysis Q3",
    url: "https://example.com/q3-analysis",
    relevance: "medium",
    textPreview: "The market experienced volatility...",
  },
];

describe("SourcePanel", () => {
  it("renders empty state when no sources", () => {
    render(<SourcePanel sources={[]} highlightedSourceId={null} />);
    expect(
      screen.getByText(/Sources will appear here/)
    ).toBeInTheDocument();
  });

  it("renders all sources when provided", () => {
    render(<SourcePanel sources={mockSources} highlightedSourceId={null} />);
    expect(screen.getByText("Annual Report 2024")).toBeInTheDocument();
    expect(screen.getByText("Market Analysis Q3")).toBeInTheDocument();
  });

  it("displays source URLs as links", () => {
    render(<SourcePanel sources={mockSources} highlightedSourceId={null} />);
    const links = screen.getAllByText("https://example.com/report-2024");
    expect(links.length).toBeGreaterThan(0);
    expect(links[0].closest("a")).toHaveAttribute("href", "https://example.com/report-2024");
    expect(links[0].closest("a")).toHaveAttribute("target", "_blank");
  });

  it("renders citation number badges", () => {
    render(<SourcePanel sources={mockSources} highlightedSourceId={null} />);
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("highlights the correct source when highlightedSourceId is set", () => {
    const { container } = render(
      <SourcePanel sources={mockSources} highlightedSourceId={1} />
    );
    // The highlighted source should have bg-blue-50 class
    const highlightedEl = container.querySelector(".bg-blue-50");
    expect(highlightedEl).toBeInTheDocument();
    expect(highlightedEl?.textContent).toContain("Annual Report 2024");
  });

  it("shows text preview only for the highlighted source", () => {
    render(<SourcePanel sources={mockSources} highlightedSourceId={1} />);
    expect(screen.getByText("Revenue grew 15% year over year...")).toBeInTheDocument();
    // The non-highlighted source preview should not appear (wrapped in AnimatePresence)
    expect(screen.queryByText("The market experienced volatility...")).not.toBeInTheDocument();
  });

  it("calls onSourceClick when a source is clicked", async () => {
    const onSourceClick = vi.fn();
    const user = userEvent.setup();

    render(
      <SourcePanel
        sources={mockSources}
        highlightedSourceId={null}
        onSourceClick={onSourceClick}
      />
    );

    await user.click(screen.getByText("Annual Report 2024"));
    expect(onSourceClick).toHaveBeenCalledWith(mockSources[0]);
  });

  it("shows collapse button when onToggleCollapse is provided", async () => {
    const onToggle = vi.fn();
    render(
      <SourcePanel
        sources={mockSources}
        highlightedSourceId={null}
        onToggleCollapse={onToggle}
      />
    );
    const collapseBtn = screen.getByTitle("Collapse sources panel");
    expect(collapseBtn).toBeInTheDocument();
    await userEvent.click(collapseBtn);
    expect(onToggle).toHaveBeenCalled();
  });

  it("shows collapse button in empty state too", () => {
    render(
      <SourcePanel
        sources={[]}
        highlightedSourceId={null}
        onToggleCollapse={vi.fn()}
      />
    );
    expect(screen.getByTitle("Collapse sources panel")).toBeInTheDocument();
  });
});
