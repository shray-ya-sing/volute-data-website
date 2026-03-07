import { useState } from "react";
import { useNavigate } from "react-router";
import { ArrowRight, Paperclip, X } from "lucide-react";
import { fileToDataUri } from "../utils/fileToBase64";

const ACCEPTED_IMAGE_TYPES = "image/png,image/jpeg,.jpg";

export function Landing() {
  const [query, setQuery] = useState("");
  const [attachments, setAttachments] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const navigate = useNavigate();

  const samplePrompts = [
    "2025 IPO performance summary deck",
    "2025 Industrials Buyouts with financial profiles",
    "US Mid-Market PE Software EV/EBITDA comps",
  ];

  const handleSubmit = async (promptText?: string) => {
    const textToSubmit = promptText || query;
    if (textToSubmit.trim()) {
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
    <div className="volute-root">
      {/* Header */}
      <header className="v-header">
        <a className="v-logo" href="/">
          <span className="v-logo-name">Volute</span>
        </a>
      </header>

      {/* Main */}
      <main className="v-main">
        <div className="v-center">
          {/* Hero */}
          <p className="v-eyebrow">
            Private Markets · M&A · Public Equity
          </p>
          <h1 className="v-headline">
            Research at the
            <br />
            speed of <em>thought</em>
          </h1>
          <p className="v-subhead">
            Describe the analysis you need. Volute aggregates
            live financial data and builds presentation-ready
            deliverables in seconds.
          </p>

          {/* Input */}
          <div className="v-input-wrap">
            <div className="v-input-box">
              {attachments.length > 0 && (
                <div className="v-attachments">
                  {attachments.map((file, index) => (
                    <div
                      key={index}
                      className="v-attach-thumb"
                    >
                      <img
                        src={previewUrls[index]}
                        alt={file.name}
                      />
                      <button
                        className="v-attach-remove"
                        onClick={() =>
                          removeAttachment(index)
                        }
                      >
                        <X size={10} color="#0a0a0b" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <textarea
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="What do you want to analyze?"
                className="v-textarea"
                rows={3}
                style={{
                  paddingTop:
                    attachments.length > 0 ? "14px" : "22px",
                }}
              />
              <input
                type="file"
                accept={ACCEPTED_IMAGE_TYPES}
                multiple
                className="hidden"
                id="landing-file-input"
                onChange={handleFileSelect}
                style={{ display: "none" }}
              />
              <div className="v-input-actions">
                <button
                  className="v-btn-attach"
                  onClick={() =>
                    document
                      .getElementById("landing-file-input")
                      ?.click()
                  }
                  title="Attach image"
                >
                  <Paperclip size={15} />
                </button>
                <button
                  className="v-btn-submit"
                  onClick={() => handleSubmit()}
                  disabled={!query.trim()}
                >
                  <ArrowRight size={16} />
                </button>
              </div>
            </div>
          </div>

          {/* Prompt chips */}
          <div className="v-prompts">
            {samplePrompts.map((p, i) => (
              <button
                key={i}
                className="v-prompt-chip"
                onClick={() => handleSubmit(p)}
              >
                {p}
              </button>
            ))}
          </div>

          {/* Features */}
          <div className="v-features">
            <div className="v-feature">
              <span className="v-feature-num">01</span>
              <span className="v-feature-title">
                Live Data
              </span>
              <p className="v-feature-desc">
                Aggregated from primary sources with full
                citations on every figure.
              </p>
            </div>
            <div className="v-feature">
              <span className="v-feature-num">02</span>
              <span className="v-feature-title">
                Instant Decks
              </span>
              <p className="v-feature-desc">
                From prompt to a polished, presentation-ready
                slide in seconds.
              </p>
            </div>
            <div className="v-feature">
              <span className="v-feature-num">03</span>
              <span className="v-feature-title">
                Analyst-Grade
              </span>
              <p className="v-feature-desc">
                EV/EBITDA, LBO profiles, comp tables —
                formatted the way bankers expect.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="v-footer">
        <span className="v-footer-copy">© 2026 Volute</span>
        <div className="v-footer-links">
          <a href="#">Privacy</a>
          <a href="#">Terms</a>
          <a href="#">Contact</a>
        </div>
      </footer>
    </div>
  );
}
