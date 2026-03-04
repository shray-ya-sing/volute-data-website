import { Download, PanelRightOpen, PanelRightClose } from "lucide-react";
import { useState } from "react";

export function CanvasView() {
  const [isSourcePanelOpen, setIsSourcePanelOpen] = useState(true);

  return (
    <div className="flex-1 flex flex-col">
      {/* Header */}
      <div className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6">
        <div className="flex items-center gap-4">
          <h2 className="font-medium">Untitled Presentation</h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsSourcePanelOpen(!isSourcePanelOpen)}
            className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            {isSourcePanelOpen ? (
              <PanelRightClose className="w-4 h-4" />
            ) : (
              <PanelRightOpen className="w-4 h-4" />
            )}
            <span className="text-sm">Sources</span>
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            <Download className="w-4 h-4" />
            <span className="text-sm">Export to PDF</span>
          </button>
        </div>
      </div>

      {/* Canvas Area */}
      <div className="flex-1 flex">
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="relative">
            {/* Slide thumbnail sidebar */}
            <div className="absolute left-0 top-0 bottom-0 w-20 bg-white border border-gray-200 rounded-lg shadow-sm p-2 mr-4">
              <div className="w-full aspect-[3/4] bg-white border-2 border-blue-500 rounded shadow-sm mb-2">
                <div className="w-full h-full bg-gradient-to-br from-gray-50 to-white" />
              </div>
            </div>

            {/* Main slide canvas */}
            <div className="ml-24 bg-white rounded-lg shadow-xl border border-gray-200" style={{ width: "960px", height: "540px" }}>
              {/* Empty white slide */}
              <div className="w-full h-full flex items-center justify-center text-gray-300">
                <div className="text-center">
                  <p className="text-sm">Slide canvas</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Source Panel */}
        <div
          className={`bg-white border-l border-gray-200 transition-all duration-300 ease-in-out ${
            isSourcePanelOpen ? "w-80" : "w-0"
          } overflow-hidden`}
        >
          <div className="w-80 h-full p-4">
            <h3 className="font-medium text-gray-900 mb-4">Sources</h3>
            <div className="text-sm text-gray-500">
              {/* Empty for now */}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}