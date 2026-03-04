import { useState } from "react";
import { Plus, Book, Sparkles } from "lucide-react";
import { Message } from "../pages/Workspace";
import { ChatMessage } from "./ChatMessage";
import { ChatInput } from "./ChatInput";

interface ChatSidebarProps {
  messages: Message[];
  onSendMessage: (content: string) => void;
}

export function ChatSidebar({ messages, onSendMessage }: ChatSidebarProps) {
  return (
    <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <button className="w-full flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors">
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
      </div>

      {/* Bottom Controls */}
      <div className="p-4 border-t border-gray-200 space-y-3">
        <ChatInput onSend={onSendMessage} />
        
        <div className="flex items-center gap-2 text-xs">
          <button className="flex items-center gap-1 px-2 py-1 rounded hover:bg-gray-100">
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
