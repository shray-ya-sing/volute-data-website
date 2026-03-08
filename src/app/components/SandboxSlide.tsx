import { Component, ReactNode, useMemo } from "react";
import { SandpackProvider, SandpackPreview } from "@codesandbox/sandpack-react";
import { useAppSelector } from "../store/hooks";
import { validateSlideCode } from "../utils/validateSlideCode";
import { repairSlideCode } from "../utils/repairSlideCode";
import { AlertTriangle } from "lucide-react";

const CORE_DEPENDENCIES = {
  "lucide-react": "^0.487.0",
  recharts: "^2.15.2",
};

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

// ── Main Component ──────────────────────────────────────────────
interface SandboxSlideProps {
  code: string;
  slideNumber: number;
}

export function SandboxSlide({ code, slideNumber }: SandboxSlideProps) {
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

  const files = {
    [`/Slide${slideNumber}.tsx`]: {
      code: renderCode,
    },
    "/App.tsx": {
      code: `import Slide from './Slide${slideNumber}';

const theme = ${JSON.stringify(theme, null, 2)};

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
          <SandpackPreview
            showNavigator={false}
            showOpenInCodeSandbox={false}
            showRefreshButton={false}
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
        `}</style>
      </div>
    </SlideErrorBoundary>
  );
}