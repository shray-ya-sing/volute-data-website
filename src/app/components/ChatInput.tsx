import { useState } from "react";
import { ArrowRight } from "lucide-react";

interface ChatInputProps {
  onSend: (content: string) => void;
  disabled?: boolean;
}

export function ChatInput({ onSend, disabled }: ChatInputProps) {
  const [input, setInput] = useState("");

  const handleSubmit = () => {
    if (input.trim()) {
      onSend(input);
      setInput("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="relative">
      <textarea
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={disabled ? "Waiting for response..." : "Ask for changes"}
        className="w-full px-3 py-2 pr-10 text-sm border-none rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-200 resize-none disabled:opacity-50 disabled:cursor-not-allowed bg-gray-50"
        rows={3}
        disabled={disabled}
      />
      <button
        onClick={handleSubmit}
        disabled={disabled || !input.trim()}
        className="absolute bottom-2 right-2 w-6 h-6 rounded-full bg-gray-800 text-white flex items-center justify-center transition-opacity disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-900"
        title="Send message"
      >
        <ArrowRight className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}