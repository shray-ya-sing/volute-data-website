import { useState } from "react";
import { useNavigate, Link } from "react-router";
import { ArrowRight, Paperclip, X } from "lucide-react";
import { fileToDataUri } from "../utils/fileToBase64";

const ACCEPTED_IMAGE_TYPES = "image/png,image/jpeg,.jpg";

export function Marketing() {
  const [query, setQuery] = useState("");
  const [attachments, setAttachments] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const navigate = useNavigate();

  const samplePrompts = [
    "Make a slide on global PE Fundraising trends by strategy",
    "Make a precedent transactions slide on 2025 industrials buyouts and add slides with financial profiles of all targets",
    "Make a precedent transactions slide with 2024-2025 US Mid Market PE Software Buyouts with EV/EBITDA comps",
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
        <Link to="/enterprise" className="v-header-link">
          For Firms
        </Link>
      </header>

      {/* Main */}
      <main className="v-main">
        <div className="v-center">
          {/* Hero */}
          <h1 className="v-headline">
            Financial AI that
            <br />
            <em>gets the numbers right</em>
          </h1>

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
                placeholder="What information do you need to gather?"
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

          {/* Marketing Sections */}
          <div className="v-marketing">
            {/* Accuracy & Data Quality */}
            <section className="v-marketing-section">
              <div className="v-marketing-content">
                <span className="v-marketing-label">Accuracy First</span>
                <h2 className="v-marketing-title">
                  Differentiated Data Quality
                </h2>
                <p className="v-marketing-desc">
                  Unlike general LLMs that routinely get numbers wrong, Volute uses a proprietary data pre-processing layer with thoughtfully human-curated data. Our edge in data quality means you can find accurate metrics across dozens of online sources in minutes, not hours.
                </p>
              </div>
              <div className="v-marketing-visual">
                {/* Placeholder for future video/animation */}
                <div className="v-marketing-placeholder">
                  <span>Data Pipeline Demo</span>
                </div>
              </div>
            </section>

            {/* Auditability & Source Tracking */}
            <section className="v-marketing-section v-marketing-section-reverse">
              <div className="v-marketing-content">
                <span className="v-marketing-label">Built for Auditability</span>
                <h2 className="v-marketing-title">
                  Every Number, Fully Sourced and Reconciled
                </h2>
                <p className="v-marketing-desc">
                  Our deliverable-focused approach emphasizes complete source tracking and auditability. Check data sources, compare across different primary and secondary sources, and reconcile discrepancies—all in one seamless interface designed for finance professionals who need to trust their data.
                </p>
              </div>
              <div className="v-marketing-visual">
                {/* Placeholder for future video/animation */}
                <div className="v-marketing-placeholder">
                  <span>Data Audit Demo</span>
                </div>
              </div>
            </section>

            {/* Enterprise Deliverables */}
            <section className="v-marketing-section">
              <div className="v-marketing-content">
                <span className="v-marketing-label">Enterprise Ready</span>
                <h2 className="v-marketing-title">
                  Create Brand-Compliant Deliverables in Seconds
                </h2>
                <p className="v-marketing-desc">
                  Build enterprise-grade presentations quickly with our versatile slide designer that creates beautiful new graphics—not just template populations. From removing logo backgrounds to designing custom layouts, our attention to detail makes creating professional deliverables completely seamless.
                </p>
              </div>
              <div className="v-marketing-visual">
                {/* Placeholder for future video/animation */}
                <div className="v-marketing-placeholder">
                  <span>Slide Designer Demo</span>
                </div>
              </div>
            </section>

            {/* Speed & Thoroughness */}
            <section className="v-marketing-section v-marketing-section-reverse">
              <div className="v-marketing-content">
                <span className="v-marketing-label">Fast & Complete</span>
                <h2 className="v-marketing-title">
                  Speed Without Sacrificing Thoroughness
                </h2>
                <p className="v-marketing-desc">
                  We're perfecting automated data gathering that's both fast and thorough. Unlike other AI vendors that offer generic automations, Volute focuses exclusively on data aggregation from publicly available information—doing it with unmatched completeness and primary source accuracy.
                </p>
              </div>
              <div className="v-marketing-visual">
                {/* Placeholder for future video/animation */}
                <div className="v-marketing-placeholder">
                  <span>Speed Demo</span>
                </div>
              </div>
            </section>

            {/* Privacy & Security */}
            <section className="v-marketing-section">
              <div className="v-marketing-content">
                <span className="v-marketing-label">Privacy First</span>
                <h2 className="v-marketing-title">
                  Industry-Leading Privacy Standards
                </h2>
                <p className="v-marketing-desc">
                  We follow all leading industry standards of privacy: no storage or training on user data or prompts, no tracking or storage of any data passing through our servers. Your research stays yours, completely private and secure.
                </p>
              </div>
              <div className="v-marketing-visual">
                {/* Placeholder for future video/animation */}
                <div className="v-marketing-placeholder">
                  <span>Privacy Features</span>
                </div>
              </div>
            </section>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="v-footer">
        <span className="v-footer-copy">© 2026 Volute</span>
        <div className="v-footer-links">
          <Link to="/privacy">Privacy</Link>
          <Link to="/terms">Terms</Link>
          <a href="mailto:contact@getvolute.com">Contact</a>
        </div>
      </footer>
    </div>
  );
}
