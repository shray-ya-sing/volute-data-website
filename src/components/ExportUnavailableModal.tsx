import { X } from "lucide-react";

interface ExportUnavailableModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ExportUnavailableModal({ isOpen, onClose }: ExportUnavailableModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Content */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-900">
            Export Currently Unavailable
          </h2>
          <p className="text-gray-600 leading-relaxed">
            Export functionality is currently unavailable in the general preview for non-enterprise users.
          </p>
          <div className="pt-2">
            <button
              onClick={onClose}
              className="w-full bg-gray-900 text-white px-4 py-2.5 rounded-lg hover:bg-gray-800 transition-colors font-medium"
            >
              Got it
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
