import { useEffect, useState } from "react";
import { useLocation } from "react-router";
import { ChatSidebar } from "../components/ChatSidebar";
import { CanvasView } from "../components/CanvasView";

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

export function Workspace() {
  const location = useLocation();
  const initialQuery = location.state?.initialQuery || "";
  const [messages, setMessages] = useState<Message[]>([]);

  useEffect(() => {
    if (initialQuery) {
      setMessages([
        {
          id: "1",
          role: "user",
          content: initialQuery,
          timestamp: new Date(),
        },
        {
          id: "2",
          role: "assistant",
          content: "I'll help you create that presentation. Let me gather the relevant data and build your slides.",
          timestamp: new Date(),
        },
      ]);
    }
  }, [initialQuery]);

  const handleSendMessage = (content: string) => {
    const newMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, newMessage]);

    // Simulate AI response
    setTimeout(() => {
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "I'm processing your request and updating the presentation.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
    }, 1000);
  };

  return (
    <div className="h-screen flex bg-gray-50">
      <ChatSidebar messages={messages} onSendMessage={handleSendMessage} />
      <CanvasView />
    </div>
  );
}
