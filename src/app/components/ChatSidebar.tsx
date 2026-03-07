import { useRef, useEffect } from "react";
import { X, Paperclip, PanelLeftClose } from "lucide-react";
import { ChatMessage } from "./ChatMessage";
import { ChatInput } from "./ChatInput";
import { fileToDataUri } from "../utils/fileToBase64";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { addAttachment, removeAttachment } from "../store/attachmentsSlice";
import type { Message } from "../pages/Workspace";
import type {
  AgentMessage,
  ToolActivity,
} from "../hooks/useAgentStream";

const ACCEPTED_IMAGE_TYPES = "image/png,image/jpeg,.jpg";

export interface AttachmentPreview {
  name: string;
  type: string;
  size: number;
  url: string;
}

interface ChatSidebarProps {
  messages: (Message | AgentMessage)[];
  onSendMessage: (content: string) => void;
  isStreaming?: boolean;
  activeTools?: ToolActivity[];
  onNewChat?: () => void;
  onToggleCollapse?: () => void;
}

export function ChatSidebar({
  messages,
  onSendMessage,
  isStreaming,
  activeTools,
  onNewChat,
  onToggleCollapse,
}: ChatSidebarProps) {
  const attachmentsState = useAppSelector((state) => state.attachments.attachments);
  const dispatch = useAppDispatch();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages, activeTools]);

  const handleFileSelect = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const files = Array.from(e.target.files || []);
    const imageFiles = files.filter((f) =>
      f.type.startsWith("image/"),
    );
    if (imageFiles.length === 0) return;

    // Upload each image to blob storage (or fallback to local storage)
    for (const file of imageFiles) {
      try {
        // Convert to data URI
        const dataUri = await fileToDataUri(file);
        
        // Extract media type from file
        const mediaType = file.type; // e.g., "image/png", "image/jpeg"
        
        let blobId: string;
        let blobUrl: string;

        // Try to upload to blob storage
        try {
          const response = await fetch('/api/upload-image', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ data: dataUri }),
          });

          if (!response.ok) {
            throw new Error(`Upload failed: ${response.statusText}`);
          }

          const contentType = response.headers.get('content-type');
          if (!contentType?.includes('application/json')) {
            throw new Error('Blob storage not available');
          }

          const result = await response.json();
          blobId = result.blobId;
          blobUrl = result.blobUrl;
          
          console.log(`[ChatSidebar] Uploaded ${file.name} to blob storage → ${blobId}`);
        } catch (uploadError: any) {
          // Fallback: use data URI as "blob" URL (for local development)
          console.warn(`[ChatSidebar] Blob storage unavailable, using data URI fallback:`, uploadError.message);
          blobId = `local-${Date.now()}-${file.name}`;
          blobUrl = dataUri;
          console.log(`[ChatSidebar] Using local fallback for ${file.name} → ${blobId}`);
        }

        // Create local preview URL
        const previewUrl = URL.createObjectURL(file);

        // Add to Redux with full metadata
        dispatch(addAttachment({
          blobId,
          blobUrl,
          mediaType,
          previewUrl,
          name: file.name,
        }));
      } catch (err: any) {
        console.error('[ChatSidebar] File processing error:', err);
        alert(`Failed to process ${file.name}: ${err.message}`);
      }
    }

    e.target.value = "";
  };

  const handleRemoveAttachment = async (blobId: string, previewUrl: string) => {
    // Revoke local preview URL
    URL.revokeObjectURL(previewUrl);
    
    // Remove from Redux
    dispatch(removeAttachment(blobId));
  };

  const handleSend = async (content: string) => {
    // Just send the message - imageIds will be extracted from Redux in Workspace
    onSendMessage(content);
  };

  return (
    <div className="w-full h-full bg-[var(--volute-bg)] border-r border-gray-200 flex flex-col">
      {/* Header with collapse button */}
      <div className="px-4 py-3 flex-shrink-0 flex items-center justify-end">
        {onToggleCollapse && (
          <button
            onClick={onToggleCollapse}
            className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
            title="Collapse chat panel"
          >
            <PanelLeftClose className="size-4" />
          </button>
        )}
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
        {attachmentsState.length > 0 && (
          <div className="flex gap-2 flex-wrap">
            {attachmentsState.map((file, index) => (
              <div
                key={index}
                className="relative group w-12 h-12 rounded-lg overflow-hidden border border-gray-200 bg-gray-50 flex-shrink-0"
              >
                <img
                  src={file.previewUrl}
                  alt={file.name}
                  className="w-full h-full object-cover"
                />
                <button
                  onClick={() => handleRemoveAttachment(file.blobId, file.previewUrl)}
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
            title="Attach files"
          >
            <Paperclip className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
}