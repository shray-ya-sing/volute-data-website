import { useState } from "react";
import { useNavigate } from "react-router";
import { ArrowRight, Paperclip, X } from "lucide-react";
import { fileToDataUri } from "../utils/fileToBase64";

const ACCEPTED_IMAGE_TYPES = "image/png,image/jpeg,image/jpg";

export function Landing() {
  const [query, setQuery] = useState("");
  const [attachments, setAttachments] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const navigate = useNavigate();

  const samplePrompts = [
    "Build a deck summarizing 2025 IPOs and their performance",
    "Build a deck with profiles and financial data on all 2025 Industrials Buyouts",
    "Make a slide for US Middle Market PE Backed Software company EV/EBITDA comps",
  ];

  const handleSubmit = async (promptText?: string) => {
    const textToSubmit = promptText || query;
    if (textToSubmit.trim()) {
      // Convert attached files to data URIs so they survive navigation
      let initialAttachments: {
        name: string;
        type: string;
        size: number;
        url: string;
      }[] = [];
      if (attachments.length > 0) {
        const dataUris = await Promise.all(
          attachments.map((f) => fileToDataUri(f)),
        );
        initialAttachments = attachments.map((f, i) => ({
          name: f.name,
          type: f.type,
          size: f.size,
          url: dataUris[i],
        }));
      }

      navigate("/workspace", {
        state: {
          initialQuery: textToSubmit,
          initialAttachments,
        },
      });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

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

    // Reset input so the same file can be re-selected
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

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4">
      <div className="w-full max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-5xl mb-16">
            Analyze with{" "}
            <span className="font-medium">Volute</span>
          </h1>
        </div>

        <div className="relative mb-8">
          {/* Attachment previews */}
          {attachments.length > 0 && (
            <div className="flex gap-2 flex-wrap px-8 pt-4 pb-0 absolute top-0 left-0 right-0 z-10">
              {attachments.map((file, index) => (
                <div
                  key={index}
                  className="relative group w-16 h-16 rounded-lg overflow-hidden border border-gray-200 bg-gray-50 flex-shrink-0"
                >
                  <img
                    src={previewUrls[index]}
                    alt={file.name}
                    className="w-full h-full object-cover"
                  />
                  <button
                    onClick={() => removeAttachment(index)}
                    className="absolute -top-1 -right-1 w-5 h-5 bg-gray-800 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-3 h-3" />
                  </button>
                  <div className="absolute bottom-0 left-0 right-0 bg-black/50 px-1 py-0.5">
                    <span className="text-[9px] text-white truncate block">
                      {file.name}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
          <textarea
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="What do you want to make?"
            className={`w-full p-8 pr-28 rounded-3xl border border-gray-200 shadow-lg resize-none focus:outline-none focus:ring-2 focus:ring-gray-200 text-base ${
              attachments.length > 0 ? "pt-24" : ""
            }`}
            rows={3}
          />
          <input
            type="file"
            accept={ACCEPTED_IMAGE_TYPES}
            multiple
            className="hidden"
            id="landing-file-input"
            onChange={handleFileSelect}
          />
          <div className="absolute right-4 bottom-4 flex items-center gap-2">
            <button
              onClick={() =>
                document
                  .getElementById("landing-file-input")
                  ?.click()
              }
              className="p-3 rounded-full hover:bg-gray-100 transition-colors"
              title="Attach images"
            >
              <Paperclip className="w-5 h-5 text-gray-500" />
            </button>
            <button
              onClick={() => handleSubmit()}
              disabled={!query.trim()}
              className="p-3 rounded-full bg-gray-200 hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ArrowRight className="w-5 h-5 text-gray-700" />
            </button>
          </div>
        </div>

        <div className="flex gap-3 justify-center mb-16">
          {samplePrompts.map((prompt, index) => (
            <button
              key={index}
              onClick={() => handleSubmit(prompt)}
              className="px-6 py-3 rounded-full border border-gray-300 hover:border-gray-400 hover:bg-gray-50 transition-colors text-sm bg-gray-200"
            >
              {prompt}
            </button>
          ))}
        </div>

        <div className="text-center text-gray-600 max-w-2xl mx-auto">
          <p className="text-lg">
            Aggregate, analyze and present financial data with
            Volute. Start with instructions and prompt your way
            to a presentation ready deliverable, fast.
          </p>
        </div>
      </div>
    </div>
  );
}