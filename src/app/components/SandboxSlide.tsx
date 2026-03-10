import { Component, ReactNode, useMemo, useEffect, useRef } from "react";
import { SandpackProvider, SandpackPreview, useSandpack } from "@codesandbox/sandpack-react";
import { useAppSelector } from "../store/hooks";
import { validateSlideCode } from "../utils/validateSlideCode";
import { repairSlideCode } from "../utils/repairSlideCode";
import { AlertTriangle } from "lucide-react";

const CORE_DEPENDENCIES = {
  "lucide-react": "^0.487.0",
  recharts: "^2.15.2",
};

// How long to wait after Sandpack signals "running" before calling onRendered.
// Covers compile + paint for even large slides in cold sandboxes.
const RENDER_SETTLE_MS = 1500;

// ── Error Boundary ──────────────────────────────────────────────
interface ErrorBoundaryProps {
  slideNumber: number;
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

class SlideErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error(
      `[SandboxSlide] Slide ${this.props.slideNumber} – React error boundary caught:`,
      {
        errorMessage: error.message,
        errorName: error.name,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
      }
    );
  }

  render() {
    if (this.state.hasError) {
      return <SlideErrorFallback />;
    }
    return this.props.children;
  }
}

// ── Generic error fallback (no details shown to user) ───────────
function SlideErrorFallback() {
  return (
    <div className="w-full h-full flex items-center justify-center bg-gray-50 p-8">
      <div className="text-center">
        <AlertTriangle className="w-8 h-8 text-gray-400 mx-auto mb-3" />
        <p className="text-sm text-gray-500">
          This slide couldn't be rendered. Try simplifying your prompt or generating it again.
        </p>
      </div>
    </div>
  );
}

// ── Render watcher — must live inside SandpackProvider ─────────
// Watches Sandpack's compilation status and fires onRendered once
// the iframe has settled after a code change.
interface RenderWatcherProps {
  code: string;
  slideNumber: number;
  onRendered?: () => void;
}

function RenderWatcher({ code, slideNumber, onRendered }: RenderWatcherProps) {
  const { sandpack } = useSandpack();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const firedRef = useRef(false);

  // Reset the fired flag on every code change so each new version
  // triggers a fresh onRendered callback
  useEffect(() => {
    firedRef.current = false;
    if (timerRef.current) clearTimeout(timerRef.current);
  }, [code]);

  useEffect(() => {
    if (!onRendered || firedRef.current) return;

    // Sandpack status: 'idle' | 'running' | 'timeout' | 'error'
    // Wait for 'running' (compilation started) then settle for RENDER_SETTLE_MS
    if (sandpack.status === 'running') {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        if (!firedRef.current) {
          firedRef.current = true;
          console.log(`[SandboxSlide] Slide ${slideNumber} rendered — firing onRendered`);
          onRendered();
        }
      }, RENDER_SETTLE_MS);
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [sandpack.status, onRendered, slideNumber]);

  return null;
}

// ── Main Component ──────────────────────────────────────────────
interface SandboxSlideProps {
  code: string;
  slideNumber: number;
  /** Called once the slide has settled in the Sandpack iframe.
   *  Use this to trigger screenshot capture + blob upload. */
  onRendered?: () => void;
}

export function SandboxSlide({ code, slideNumber, onRendered }: SandboxSlideProps) {
  const theme = useAppSelector((state) => state.theme);

  // Validate and attempt repair — all details go to console only
  const { renderCode, isValid } = useMemo(() => {
    let currentCode = code;
    const validation = validateSlideCode(currentCode);

    console.group(`[SandboxSlide] Slide ${slideNumber} – Code Diagnostics`);
    console.log(`Code length: ${currentCode.length} characters`);
    console.log(`Valid: ${validation.valid}`);

    if (validation.errors.length > 0) {
      console.error("Validation errors:", validation.errors);
    }
    if (validation.warnings.length > 0) {
      console.warn("Validation warnings:", validation.warnings);
    }

    if (!validation.valid) {
      console.log("First 200 chars:", currentCode.slice(0, 200));
      console.log("Last 200 chars:", currentCode.slice(-200));

      // Attempt repair
      const repair = repairSlideCode(currentCode);
      if (repair.repaired) {
        console.log("Repair applied:", repair.repairs);
        currentCode = repair.code;

        const revalidation = validateSlideCode(currentCode);
        if (revalidation.valid) {
          console.log("Code passes validation after repair ✓");
          console.groupEnd();
          return { renderCode: currentCode, isValid: true };
        } else {
          console.error("Still invalid after repair:", revalidation.errors);
          console.log("Full code (collapsed):");
          console.log(currentCode);
        }
      }

      console.groupEnd();
      return { renderCode: currentCode, isValid: false };
    }

    console.groupEnd();
    return { renderCode: currentCode, isValid: true };
  }, [code, slideNumber]);

  // If code is invalid even after repair, show generic fallback
  if (!isValid) {
    return <SlideErrorFallback />;
  }

  // Map Redux key `slideBackgroundColor` → `backgroundColor` expected by generated slides
  const slideTheme = {
    ...theme,
    backgroundColor: theme.slideBackgroundColor,
  };
  const { slideBackgroundColor: _unused, ...cleanSlideTheme } = slideTheme;

  const files = {
    [`/Slide${slideNumber}.tsx`]: {
      code: renderCode,
    },
    "/App.tsx": {
      code: `import Slide from './Slide${slideNumber}';

const theme = ${JSON.stringify(cleanSlideTheme, null, 2)};

export default function App() {
  return (
    <div style={{ 
      width: '100%', 
      height: '100vh', 
      overflow: 'auto',
      position: 'relative',
      margin: 0,
      padding: 0,
    }}>
      <Slide {...theme} />
    </div>
  );
}`,
    },
  };

  return (
    <SlideErrorBoundary slideNumber={slideNumber}>
      <div className="w-full h-full relative">
        <SandpackProvider
          template="react-ts"
          files={files}
          customSetup={{
            dependencies: CORE_DEPENDENCIES,
          }}
          theme="light"
        >
          {/* RenderWatcher must be inside SandpackProvider to access useSandpack() */}
          <RenderWatcher
            code={renderCode}
            slideNumber={slideNumber}
            onRendered={onRendered}
          />
          <SandpackPreview
            showNavigator={false}
            showOpenInCodeSandbox={false}
            showRefreshButton={false}
            actionsChildren={<div className="text-xs text-gray-500 px-2">Slide Preview</div>}
            style={{ width: "960px", height: "540px" }}
          />
        </SandpackProvider>
        <style>{`
          .sp-wrapper, .sp-layout, .sp-preview-container {
            width: 960px !important;
            height: 540px !important;
            max-width: 960px !important;
            max-height: 540px !important;
          }
          .sp-preview-iframe {
            width: 960px !important;
            height: 540px !important;
          }
          .sp-layout {
            border: none !important;
            border-radius: 0 !important;
          }
          .sp-preview-actions {
            display: none !important;
          }
          .sp-preview-container {
            overflow: auto !important;
          }
          .sp-preview-iframe {
            overflow: auto !important;
          }
          /* Hide Sandpack branding */
          .sp-preview-container::before {
            content: none !important;
          }
          /* Custom loading message */
          .sp-loading {
            background: white !important;
          }
          .sp-loading::after {
            content: 'Generating Slide...' !important;
            position: absolute !important;
            top: 50% !important;
            left: 50% !important;
            transform: translate(-50%, -50%) !important;
            color: #6b7280 !important;
            font-size: 14px !important;
          }
          /* Hide the default loading text/indicator */
          .sp-loading > * {
            display: none !important;
          }
        `}</style>
      </div>
    </SlideErrorBoundary>
  );
}
