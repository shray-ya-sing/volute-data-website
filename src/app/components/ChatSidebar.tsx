import { useState, useRef, useEffect } from "react";
import { X, Plus, Book, Sparkles } from "lucide-react";
import { ChatMessage } from "./ChatMessage";
import { ChatInput } from "./ChatInput";
import { fileToDataUri } from "../utils/fileToBase64";
import type { Message } from "../pages/Workspace";
import type {
  AgentMessage,
  ToolActivity,
} from "../hooks/useAgentStream";

const ACCEPTED_IMAGE_TYPES = "image/png,image/jpeg,image/jpg";

export interface AttachmentPreview {
  name: string;
  type: string;
  size: number;
  url: string;
}

interface ChatSidebarProps {
  messages: (Message | AgentMessage)[];
  onSendMessage: (
    content: string,
    attachments?: AttachmentPreview[],
  ) => void;
  isStreaming?: boolean;
  activeTools?: ToolActivity[];
  onNewChat?: () => void;
}

export function ChatSidebar({
  messages,
  onSendMessage,
  isStreaming,
  activeTools,
  onNewChat,
}: ChatSidebarProps) {
  const [attachments, setAttachments] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages, activeTools]);

  const handleFileSelect = (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const files = Array.from(e.target.files || []);
    const imageFiles = files.filter((f) =>
      f.type.startsWith("image/"),
    );
    if (imageFiles.length === 0) return;

    setAttachments((prev) => [...prev, ...imageFiles]);
    const newUrls = imageFiles.map((f) =>
      URL.createObjectURL(f),
    );
    setPreviewUrls((prev) => [...prev, ...newUrls]);
    e.target.value = "";
  };

  const removeAttachment = (index: number) => {
    URL.revokeObjectURL(previewUrls[index]);
    setAttachments((prev) =>
      prev.filter((_, i) => i !== index),
    );
    setPreviewUrls((prev) =>
      prev.filter((_, i) => i !== index),
    );
  };

  const handleSend = async (content: string) => {
    // Convert files to data URIs so they persist and can be sent to API
    const attachmentData = await Promise.all(
      attachments.map(async (f, i) => {
        const dataUri = await fileToDataUri(f);
        return {
          name: f.name,
          type: f.type,
          size: f.size,
          url: dataUri,
        };
      }),
    );
    onSendMessage(
      content,
      attachmentData.length > 0 ? attachmentData : undefined,
    );
    // Clear attachments after sending
    previewUrls.forEach((url) => URL.revokeObjectURL(url));
    setAttachments([]);
    setPreviewUrls([]);
  };

  return (
    <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <button
          onClick={onNewChat}
          disabled={isStreaming}
          className="w-full flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus className="w-4 h-4" />
          <span className="text-sm">New Chat</span>
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center text-gray-400 mt-8">
            <p className="text-sm">Start a conversation</p>
          </div>
        ) : (
          messages.map((message) => (
            <ChatMessage key={message.id} message={message} />
          ))
        )}

        {/* Active tool indicators */}
        {isStreaming &&
          activeTools &&
          activeTools.length > 0 && (
            <div className="space-y-2">
              {activeTools
                .filter((t) => t.status === "running")
                .map((tool, i) => {
                  const label =
                    tool.name === "vector_search"
                      ? `Searching: "${(tool.input?.query ?? "").slice(0, 40)}..."`
                      : tool.name === "create_or_edit_slide"
                        ? `${tool.input?.existingCode ? "Editing" : "Generating"} slide...`
                        : `Running ${tool.name}...`;

                  return (
                    <div
                      key={i}
                      className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg text-xs text-gray-600 animate-pulse"
                    >
                      <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-ping" />
                      {label}
                    </div>
                  );
                })}
            </div>
          )}

        {/* Streaming cursor */}
        {isStreaming &&
          (!activeTools ||
            activeTools.filter((t) => t.status === "running")
              .length === 0) && (
            <div className="flex justify-start">
              <div className="bg-gray-100 text-gray-900 rounded-2xl px-4 py-2">
                <span className="inline-block w-2 h-4 bg-gray-400 animate-pulse">
                  ▊
                </span>
              </div>
            </div>
          )}

        {/* Auto-scroll anchor */}
        <div ref={messagesEndRef} />
      </div>

      {/* Bottom Controls */}
      <div className="p-4 border-t border-gray-200 space-y-3">
        {/* Attachment previews */}
        {attachments.length > 0 && (
          <div className="flex gap-2 flex-wrap">
            {attachments.map((file, index) => (
              <div
                key={index}
                className="relative group w-12 h-12 rounded-lg overflow-hidden border border-gray-200 bg-gray-50 flex-shrink-0"
              >
                <img
                  src={previewUrls[index]}
                  alt={file.name}
                  className="w-full h-full object-cover"
                />
                <button
                  onClick={() => removeAttachment(index)}
                  className="absolute -top-1 -right-1 w-4 h-4 bg-gray-800 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-2.5 h-2.5" />
                </button>
                <div className="absolute bottom-0 left-0 right-0 bg-black/50 px-0.5">
                  <span className="text-[7px] text-white truncate block">
                    {file.name}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        <ChatInput onSend={handleSend} disabled={isStreaming} />

        <input
          type="file"
          accept={ACCEPTED_IMAGE_TYPES}
          multiple
          className="hidden"
          id="chat-file-input"
          onChange={handleFileSelect}
        />

        <div className="flex items-center gap-2 text-xs">
          <button
            onClick={() =>
              document
                .getElementById("chat-file-input")
                ?.click()
            }
            className="flex items-center gap-1 px-2 py-1 rounded hover:bg-gray-100"
            title="Attach images"
          >
            <Plus className="w-3 h-3" />
          </button>
          <button className="flex items-center gap-1 px-2 py-1 rounded hover:bg-gray-100">
            <Book className="w-3 h-3" />
          </button>
          <button className="flex items-center gap-1 px-2 py-1 rounded hover:bg-gray-100">
            <Sparkles className="w-3 h-3" />
          </button>
          <div className="flex-1" />
          <select className="text-xs border border-gray-300 rounded px-2 py-1">
            <option>Default</option>
          </select>
          <button className="w-5 h-5 rounded-full bg-gray-700 text-white flex items-center justify-center text-xs">
            ?
          </button>
        </div>
      </div>
    </div>
  );
}