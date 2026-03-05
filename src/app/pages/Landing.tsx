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
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;1,9..40,300&display=swap');

        * { box-sizing: border-box; margin: 0; padding: 0; }

        :root {
          --bg: #faf9f7;
          --surface: #ffffff;
          --surface-2: #f2f0ed;
          --border: rgba(0,0,0,0.08);
          --border-hover: rgba(0,0,0,0.18);
          --text-primary: #1a1917;
          --text-secondary: #6b6a68;
          --text-muted: #b0aea9;
          --accent: #8a6a3a;
          --accent-dim: rgba(138,106,58,0.08);
          --accent-glow: rgba(138,106,58,0.06);
        }

        .volute-root {
          min-height: 100vh;
          background-color: var(--bg);
          color: var(--text-primary);
          font-family: 'DM Sans', sans-serif;
          display: flex;
          flex-direction: column;
          position: relative;
          overflow: hidden;
        }

        /* Subtle radial glow in center */
        .volute-root::before {
          content: '';
          position: fixed;
          top: 20%;
          left: 50%;
          transform: translateX(-50%);
          width: 900px;
          height: 600px;
          background: radial-gradient(ellipse at center, rgba(138,106,58,0.05) 0%, transparent 70%);
          pointer-events: none;
          z-index: 0;
        }

        /* Noise texture overlay */
        .volute-root::after {
          content: '';
          position: fixed;
          inset: 0;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.03'/%3E%3C/svg%3E");
          pointer-events: none;
          z-index: 0;
          opacity: 0.15;
        }

        /* ── Header ── */
        .v-header {
          position: relative;
          z-index: 10;
          padding: 28px 40px;
          display: flex;
          align-items: center;
          border-bottom: 1px solid var(--border);
        }

        .v-logo-name {
          font-family: 'DM Sans', sans-serif;
          font-size: 13px;
          font-weight: 500;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: var(--text-primary);
        }

        /* ── Main ── */
        .v-main {
          position: relative;
          z-index: 10;
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 60px 24px 80px;
        }

        .v-center {
          width: 100%;
          max-width: 760px;
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        /* ── Hero ── */
        .v-eyebrow {
          font-size: 11px;
          font-weight: 500;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: var(--accent);
          margin-bottom: 28px;
        }

        .v-headline {
          font-family: 'Instrument Serif', serif;
          font-size: clamp(52px, 7vw, 80px);
          line-height: 1.0;
          text-align: center;
          color: var(--text-primary);
          margin-bottom: 20px;
          letter-spacing: -0.01em;
        }

        .v-headline em {
          font-style: italic;
          color: var(--accent);
        }

        .v-subhead {
          font-size: 16px;
          font-weight: 300;
          color: var(--text-secondary);
          text-align: center;
          line-height: 1.65;
          max-width: 480px;
          margin-bottom: 52px;
          letter-spacing: 0.01em;
        }

        /* ── Input ── */
        .v-input-wrap {
          width: 100%;
          position: relative;
          margin-bottom: 16px;
        }

        .v-input-box {
          width: 100%;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 16px;
          transition: border-color 0.2s, box-shadow 0.2s;
          position: relative;
        }

        .v-input-box:focus-within {
          border-color: rgba(138,106,58,0.3);
          box-shadow: 0 0 0 4px var(--accent-glow), 0 8px 32px rgba(0,0,0,0.08);
        }

        .v-attachments {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          padding: 16px 16px 0;
        }

        .v-attach-thumb {
          position: relative;
          width: 52px;
          height: 52px;
          border-radius: 8px;
          overflow: hidden;
          border: 1px solid var(--border);
          flex-shrink: 0;
        }

        .v-attach-thumb img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .v-attach-remove {
          position: absolute;
          top: -4px;
          right: -4px;
          width: 18px;
          height: 18px;
          background: var(--accent);
          border: none;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          opacity: 0;
          transition: opacity 0.15s;
        }

        .v-attach-thumb:hover .v-attach-remove {
          opacity: 1;
        }

        .v-textarea {
          width: 100%;
          background: transparent;
          border: none;
          outline: none;
          resize: none;
          padding: 22px 130px 22px 22px;
          font-family: 'DM Sans', sans-serif;
          font-size: 15px;
          font-weight: 300;
          color: var(--text-primary);
          line-height: 1.6;
          caret-color: var(--accent);
        }

        .v-textarea::placeholder {
          color: var(--text-muted);
        }

        .v-input-actions {
          position: absolute;
          right: 14px;
          bottom: 14px;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .v-btn-attach {
          width: 36px;
          height: 36px;
          border: 1px solid var(--border);
          background: transparent;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: border-color 0.15s, background 0.15s;
          color: var(--text-secondary);
        }

        .v-btn-attach:hover {
          border-color: var(--border-hover);
          background: var(--surface-2);
          color: var(--text-primary);
        }

        .v-btn-submit {
          width: 36px;
          height: 36px;
          background: var(--text-primary);
          border: none;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: opacity 0.15s, transform 0.15s;
          color: var(--bg);
        }

        .v-btn-submit:disabled {
          opacity: 0.25;
          cursor: not-allowed;
          transform: none;
        }

        .v-btn-submit:not(:disabled):hover {
          opacity: 0.85;
          transform: scale(1.04);
        }

        /* ── Prompts ── */
        .v-prompts {
          width: 100%;
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          justify-content: center;
          margin-bottom: 72px;
        }

        .v-prompt-chip {
          background: transparent;
          border: 1px solid var(--border);
          border-radius: 100px;
          padding: 7px 16px;
          font-family: 'DM Sans', sans-serif;
          font-size: 12.5px;
          font-weight: 400;
          color: var(--text-secondary);
          cursor: pointer;
          transition: border-color 0.15s, color 0.15s, background 0.15s;
          white-space: nowrap;
        }

        .v-prompt-chip:hover {
          border-color: var(--border-hover);
          color: var(--text-primary);
          background: var(--surface);
        }

        /* ── Features ── */
        .v-features {
          width: 100%;
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1px;
          background: var(--border);
          border: 1px solid var(--border);
          border-radius: 16px;
          overflow: hidden;
        }

        .v-feature {
          background: var(--bg);
          padding: 28px 24px;
          display: flex;
          flex-direction: column;
          gap: 10px;
          transition: background 0.15s;
        }

        .v-feature:hover {
          background: #f5f3f0;
        }

        .v-feature-num {
          font-size: 11px;
          font-weight: 500;
          letter-spacing: 0.1em;
          color: var(--text-muted);
          font-variant-numeric: tabular-nums;
        }

        .v-feature-title {
          font-family: 'Instrument Serif', serif;
          font-size: 17px;
          color: var(--text-primary);
          line-height: 1.2;
        }

        .v-feature-desc {
          font-size: 13px;
          font-weight: 300;
          color: var(--text-secondary);
          line-height: 1.55;
        }

        /* ── Footer ── */
        .v-footer {
          position: relative;
          z-index: 10;
          padding: 20px 40px;
          border-top: 1px solid var(--border);
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .v-footer-copy {
          font-size: 12px;
          color: var(--text-muted);
          letter-spacing: 0.02em;
        }

        .v-footer-links {
          display: flex;
          gap: 24px;
        }

        .v-footer-links a {
          font-size: 12px;
          color: var(--text-muted);
          text-decoration: none;
          transition: color 0.15s;
        }

        .v-footer-links a:hover {
          color: var(--text-secondary);
        }

        /* ── Divider line ── */
        .v-divider {
          width: 1px;
          height: 48px;
          background: var(--border);
          margin: 0 auto 52px;
        }
      `}</style>

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
    </>
  );
}