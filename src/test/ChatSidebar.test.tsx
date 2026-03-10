import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ChatSidebar } from "../app/components/ChatSidebar";
import { renderWithProviders } from "./test-utils";
import type { AgentMessage } from "../app/hooks/useAgentStream";

// Mock fetch globally for image upload
beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn());
});

function makeMessage(overrides: Partial<AgentMessage> = {}): AgentMessage {
  return {
    id: "m-1",
    role: "user",
    content: "Hello",
    timestamp: new Date(),
    ...overrides,
  };
}

describe("ChatSidebar", () => {
  it("renders empty state when no messages", () => {
    renderWithProviders(
      <ChatSidebar messages={[]} onSendMessage={vi.fn()} />
    );
    expect(screen.getByText("Start a conversation")).toBeInTheDocument();
  });

  it("renders messages when provided", () => {
    const messages: AgentMessage[] = [
      makeMessage({ id: "1", role: "user", content: "User says hi" }),
      makeMessage({ id: "2", role: "assistant", content: "Assistant replies" }),
    ];
    renderWithProviders(
      <ChatSidebar messages={messages} onSendMessage={vi.fn()} />
    );
    expect(screen.getByText("User says hi")).toBeInTheDocument();
    expect(screen.getByText("Assistant replies")).toBeInTheDocument();
  });

  it("calls onSendMessage when user sends a message via ChatInput", async () => {
    const onSendMessage = vi.fn();
    const user = userEvent.setup();

    renderWithProviders(
      <ChatSidebar messages={[]} onSendMessage={onSendMessage} />
    );

    const textarea = screen.getByRole("textbox");
    await user.type(textarea, "My message");
    await user.keyboard("{Enter}");

    expect(onSendMessage).toHaveBeenCalledWith("My message");
  });

  it("shows streaming cursor when isStreaming and no active running tools", () => {
    renderWithProviders(
      <ChatSidebar
        messages={[makeMessage()]}
        onSendMessage={vi.fn()}
        isStreaming
        activeTools={[]}
      />
    );
    expect(screen.getByText("▊")).toBeInTheDocument();
  });

  it("shows active tool indicators when streaming with running tools", () => {
    renderWithProviders(
      <ChatSidebar
        messages={[makeMessage()]}
        onSendMessage={vi.fn()}
        isStreaming
        activeTools={[
          { name: "vector_search", status: "running", input: { query: "test query data" }, startTime: 0 },
        ]}
      />
    );
    expect(screen.getByText(/Searching:.*test query data/)).toBeInTheDocument();
  });

  it("shows collapse button when onToggleCollapse is provided", async () => {
    const onToggle = vi.fn();
    renderWithProviders(
      <ChatSidebar
        messages={[]}
        onSendMessage={vi.fn()}
        onToggleCollapse={onToggle}
      />
    );
    const collapseBtn = screen.getByTitle("Collapse chat panel");
    expect(collapseBtn).toBeInTheDocument();
    await userEvent.click(collapseBtn);
    expect(onToggle).toHaveBeenCalled();
  });

  it("renders attachment previews from Redux state", () => {
    renderWithProviders(
      <ChatSidebar messages={[]} onSendMessage={vi.fn()} />,
      {
        preloadedState: {
          attachments: {
            attachments: [
              {
                blobId: "blob-1",
                blobUrl: "https://blob.example.com/1",
                mediaType: "image/png",
                previewUrl: "blob:http://localhost/preview-1",
                name: "screenshot.png",
              },
            ],
          },
        },
      }
    );
    expect(screen.getByAltText("screenshot.png")).toBeInTheDocument();
    expect(screen.getByText("screenshot.png")).toBeInTheDocument();
  });

  it("passes disabled to ChatInput when isStreaming", () => {
    renderWithProviders(
      <ChatSidebar messages={[]} onSendMessage={vi.fn()} isStreaming />
    );
    expect(screen.getByRole("textbox")).toBeDisabled();
  });
});
