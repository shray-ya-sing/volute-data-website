import { SandpackProvider, SandpackPreview } from "@codesandbox/sandpack-react";

interface SlidePreviewProps {
  code: string;
  slideNumber: number;
}

export function SlidePreview({ code, slideNumber }: SlidePreviewProps) {
  return (
    <div className="relative rounded-lg overflow-hidden border border-gray-200 bg-white shadow-sm">
      <SandpackProvider
        template="react"
        files={{
          "/App.js": {
            code,
            active: true,
          },
        }}
        customSetup={{
          dependencies: {
            recharts: "2.15.2",
            "lucide-react": "0.487.0",
          },
        }}
        options={{
          externalResources: [
            "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap",
          ],
        }}
      >
        <div style={{ width: "480px", height: "270px" }}>
          <SandpackPreview
            showNavigator={false}
            showOpenInCodeSandbox={false}
            showRefreshButton={false}
            style={{
              width: "100%",
              height: "100%",
              border: "none",
            }}
          />
        </div>
      </SandpackProvider>
    </div>
  );
}
