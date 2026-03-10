import { useState, useCallback } from "react";
import { Download, Loader2 } from "lucide-react";
import { useAppSelector } from "../store/hooks";

/** Helper: trigger a browser download from a Blob */
function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/** Sanitise presentation name for use in filenames */
function safeName(name: string) {
  return name.replace(/[^a-zA-Z0-9\s-_]/g, "").trim() || "presentation";
}

export function ExportButton() {
  const slides = useAppSelector((s) => s.slides.slides);
  const presentationName = useAppSelector((s) => s.slides.presentationName);
  const theme = useAppSelector((s) => s.theme);

  const [showDropdown, setShowDropdown] = useState(false);
  const [exporting, setExporting] = useState<"pdf" | "png" | "pptx" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isBusy = exporting !== null;
  const disabled = isBusy || slides.length === 0;

  // ── PDF ──────────────────────────────────────────────────────────────────
  const handleExportPDF = useCallback(async () => {
    if (slides.length === 0) return;
    setExporting("pdf");
    setError(null);

    const payload = {
      slides: slides.map((s) => ({ code: s.code, slideNumber: s.slideNumber })),
      theme,
      format: "pdf",
      dependencies: {
        "lucide-react": "^0.487.0",
        recharts: "^2.15.2",
      },
    };

    try {
      console.log("[Export] Sending slides to PDF endpoint…", {
        slideCount: slides.length,
        payloadSize: `${(new Blob([JSON.stringify(payload)]).size / 1024).toFixed(1)} KB`,
      });

      const res = await fetch("https://www.getvolute.com/api/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const ct = res.headers.get("content-type") || "";

      if (res.ok && ct.includes("application/pdf")) {
        const blob = await res.blob();
        console.log(`[Export] PDF received: ${(blob.size / 1024).toFixed(1)} KB`);
        downloadBlob(blob, `${safeName(presentationName)}.pdf`);
      } else {
        let msg = `Server returned ${res.status}`;
        const raw = await res.text();
        try {
          const body = JSON.parse(raw);
          msg = body.error || body.message || msg;
          console.error("[Export] PDF error:", body);
        } catch {
          console.error("[Export] PDF raw error:", raw.slice(0, 500));
        }
        setError(msg);
      }
    } catch (err: any) {
      console.error("[Export] PDF failed:", err);
      setError(err.message || "Network error — could not reach PDF server");
    } finally {
      setExporting(null);
    }
  }, [slides, theme, presentationName]);

  // ── PNG ──────────────────────────────────────────────────────────────────
  const handleExportPng = useCallback(async () => {
    if (slides.length === 0) return;
    setExporting("png");
    setError(null);

    const name = safeName(presentationName);
    const payload = {
      slides: slides.map((s) => ({ code: s.code, slideNumber: s.slideNumber })),
      theme,
      filename: name,
    };

    try {
      console.log("[Export] Sending slides to PNG endpoint…", {
        slideCount: slides.length,
        payloadSize: `${(new Blob([JSON.stringify(payload)]).size / 1024).toFixed(1)} KB`,
      });

      const res = await fetch("https://www.getvolute.com/api/export-png", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const ct = res.headers.get("content-type") || "";

      if (res.ok && (ct.includes("image/png") || ct.includes("application/zip"))) {
        const blob = await res.blob();
        console.log(`[Export] PNG export received: ${(blob.size / 1024).toFixed(1)} KB`);
        const ext = ct.includes("image/png") ? ".png" : ".zip";
        downloadBlob(blob, `${name}${ext}`);
      } else {
        let msg = `Server returned ${res.status}`;
        const raw = await res.text();
        try {
          const body = JSON.parse(raw);
          msg = body.error || body.message || msg;
          console.error("[Export] PNG error:", body);
        } catch {
          console.error("[Export] PNG raw error:", raw.slice(0, 500));
        }
        setError(msg);
      }
    } catch (err: any) {
      console.error("[Export] PNG failed:", err);
      setError(err.message || "Network error — could not reach PNG server");
    } finally {
      setExporting(null);
    }
  }, [slides, theme, presentationName]);

  // ── PPTX ─────────────────────────────────────────────────────────────────
  const handleExportPptx = useCallback(async () => {
    if (slides.length === 0) return;
    setExporting("pptx");
    setError(null);

    try {
      // Step 1: Convert TSX → JSON in parallel
      console.log(`[Export] Converting ${slides.length} slide(s) to JSON…`);

      const jsonResults = await Promise.all(
        slides.map(async (slide) => {
          const res = await fetch("https://www.getvolute.com/api/generate-slide-json", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ code: slide.code, slideNumber: slide.slideNumber, theme }),
          });

          if (!res.ok) {
            const errBody = await res.json().catch(() => ({}));
            throw new Error(
              `Slide ${slide.slideNumber} JSON conversion failed: ${errBody.error || res.status}`
            );
          }

          const { slideNumber, slideJson } = await res.json();
          console.log(`[Export] Slide ${slideNumber} JSON ready`);
          return { slideNumber, slideJson };
        })
      );

      jsonResults.sort((a, b) => a.slideNumber - b.slideNumber);
      const slideJsonArray = jsonResults.map((r) => r.slideJson);

      console.log(`[Export] All ${slideJsonArray.length} slide(s) converted. Sending to export endpoint…`, {
        payloadSize: `${(new Blob([JSON.stringify(slideJsonArray)]).size / 1024).toFixed(1)} KB`,
      });

      // Step 2: Send JSON array to C# export endpoint
      const exportRes = await fetch("https://doclayer.onrender.com/api/Presentation/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ presentationName, slideJsonArray }),
      });

      const ct = exportRes.headers.get("content-type") || "";

      if (
        exportRes.ok &&
        (ct.includes("application/vnd.openxmlformats-officedocument.presentationml") ||
          ct.includes("application/octet-stream"))
      ) {
        const blob = await exportRes.blob();
        console.log(`[Export] PPTX received: ${(blob.size / 1024).toFixed(1)} KB`);
        downloadBlob(blob, `${safeName(presentationName)}.pptx`);
      } else {
        let msg = `Export server returned ${exportRes.status}`;
        const raw = await exportRes.text();
        try {
          const body = JSON.parse(raw);
          msg = body.error || body.message || msg;
          console.error("[Export] PPTX error:", body);
        } catch {
          console.error("[Export] PPTX raw error:", raw.slice(0, 500));
        }
        setError(msg);
      }
    } catch (err: any) {
      console.error("[Export] PPTX failed:", err);
      setError(err.message || "Network error during PPTX export");
    } finally {
      setExporting(null);
    }
  }, [slides, theme, presentationName]);

  // ── Dropdown items ──────────────────────────────────────────────────────
  const items: { label: string; handler: () => void }[] = [
    { label: "PDF", handler: handleExportPDF },
    { label: "PNG", handler: handleExportPng },
    { label: "PPTX", handler: handleExportPptx },
  ];

  return (
    <div className="flex items-center gap-2">
      {error && (
        <span className="text-xs text-gray-500 max-w-[200px] truncate relative z-0" title={error}>
          Error exporting, please try again
        </span>
      )}
      <div
        className="relative z-[100]"
        onMouseEnter={() => !disabled && setShowDropdown(true)}
        onMouseLeave={() => setShowDropdown(false)}
      >
        <button
          disabled={disabled}
          className={`p-2 transition-colors ${
            slides.length === 0
              ? "text-gray-400 cursor-not-allowed"
              : isBusy
                ? "text-gray-700 cursor-wait"
                : "text-gray-700 hover:text-gray-900"
          }`}
          title="Export"
        >
          {isBusy ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Download className="w-5 h-5" />
          )}
        </button>

        {showDropdown && !disabled && (
          <div className="absolute top-full right-0 mt-1 bg-white border border-gray-200 rounded shadow-lg py-1 min-w-[120px] z-[100]">
            {items.map(({ label, handler }) => (
              <button
                key={label}
                onClick={(e) => {
                  e.stopPropagation();
                  setShowDropdown(false);
                  handler();
                }}
                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              >
                {label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}