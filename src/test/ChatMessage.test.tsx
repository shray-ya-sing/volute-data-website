import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ChatMessage } from "../app/components/ChatMessage";
import type { AgentMessage } from "../app/hooks/useAgentStream";

function makeUserMessage(overrides: Partial<AgentMessage> = {}): AgentMessage {
  return {
    id: "msg-1",
    role: "user",
    content: "Hello",
    timestamp: new Date("2025-01-01"),
    ...overrides,
  };
}

function makeAssistantMessage(overrides: Partial<AgentMessage> = {}): AgentMessage {
  return {
    id: "msg-2",
    role: "assistant",
    content: "Hi there",
    timestamp: new Date("2025-01-01"),
    ...overrides,
  };
}

describe("ChatMessage", () => {
  it("renders user message content", () => {
    render(<ChatMessage message={makeUserMessage({ content: "Test user text" })} />);
    expect(screen.getByText("Test user text")).toBeInTheDocument();
  });

  it("renders assistant message content via markdown", () => {
    render(<ChatMessage message={makeAssistantMessage({ content: "**bold text**" })} />);
    expect(screen.getByText("bold text")).toBeInTheDocument();
  });

  it("applies user message styling (right-aligned, dark background)", () => {
    const { container } = render(<ChatMessage message={makeUserMessage()} />);
    const outerDiv = container.firstChild as HTMLElement;
    expect(outerDiv.className).toContain("justify-end");
  });

  it("applies assistant message styling (left-aligned)", () => {
    const { container } = render(<ChatMessage message={makeAssistantMessage()} />);
    const outerDiv = container.firstChild as HTMLElement;
    expect(outerDiv.className).toContain("justify-start");
  });

  it("renders user message attachments", () => {
    const msg = makeUserMessage({
      content: "See images",
      attachments: [
        { url: "https://example.com/img.png", name: "img.png" },
      ],
    });
    render(<ChatMessage message={msg} />);
    const img = screen.getByAltText("img.png");
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute("src", "https://example.com/img.png");
  });

  it("shows 'Data fetched successfully' when all vector_search tools are done", () => {
    const msg: AgentMessage = {
      ...makeAssistantMessage({ content: "" }),
      toolActivity: [
        { name: "vector_search", status: "done", startTime: 0, endTime: 1 },
        { name: "vector_search", status: "done", startTime: 0, endTime: 1 },
      ],
    };
    render(<ChatMessage message={msg} />);
    expect(screen.getByText("Data fetched successfully")).toBeInTheDocument();
  });

  it("shows 'Fetching data...' when vector_search tools are still running", () => {
    const msg: AgentMessage = {
      ...makeAssistantMessage({ content: "" }),
      toolActivity: [
        { name: "vector_search", status: "running", startTime: 0 },
        { name: "vector_search", status: "done", startTime: 0, endTime: 1 },
      ],
    };
    render(<ChatMessage message={msg} />);
    expect(screen.getByText("Fetching data...")).toBeInTheDocument();
  });

  it("shows 'Slide generated' when all create_or_edit_slide tools are done", () => {
    const msg: AgentMessage = {
      ...makeAssistantMessage({ content: "" }),
      toolActivity: [
        { name: "create_or_edit_slide", status: "done", startTime: 0, endTime: 1 },
      ],
    };
    render(<ChatMessage message={msg} />);
    expect(screen.getByText("Slide generated")).toBeInTheDocument();
  });

  it("shows 'Generating slide...' when create_or_edit_slide tools are still running", () => {
    const msg: AgentMessage = {
      ...makeAssistantMessage({ content: "" }),
      toolActivity: [
        { name: "create_or_edit_slide", status: "running", startTime: 0 },
      ],
    };
    render(<ChatMessage message={msg} />);
    expect(screen.getByText("Generating slide...")).toBeInTheDocument();
  });

  it("does not render tool activity section when toolActivity is empty", () => {
    const msg: AgentMessage = {
      ...makeAssistantMessage({ content: "Just text" }),
      toolActivity: [],
    };
    render(<ChatMessage message={msg} />);
    expect(screen.queryByText("Fetching data...")).not.toBeInTheDocument();
    expect(screen.queryByText("Generating slide...")).not.toBeInTheDocument();
  });
});
