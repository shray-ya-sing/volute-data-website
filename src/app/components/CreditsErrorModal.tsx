import { X, CreditCard, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface CreditsErrorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CreditsErrorModal({ isOpen, onClose }: CreditsErrorModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", duration: 0.3 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
          >
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 pointer-events-auto relative">
              {/* Close button */}
              <button
                onClick={onClose}
                className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-lg transition-colors"
                aria-label="Close"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>

              {/* Icon */}
              <div className="flex justify-center mb-6">
                <div className="w-16 h-16 bg-gradient-to-br from-red-400 to-red-600 rounded-full flex items-center justify-center">
                  <AlertCircle className="w-8 h-8 text-white" />
                </div>
              </div>

              {/* Title */}
              <h2 className="text-2xl font-bold text-gray-900 text-center mb-3">
                Out of AI Credits
              </h2>

              {/* Message */}
              <p className="text-gray-600 text-center mb-6">
                We couldn't process your request because your AI credits have run out. Create an account to purchase more credits and continue building presentations.
              </p>

              {/* Info Section */}
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <CreditCard className="w-5 h-5 text-indigo-600" />
                  <h3 className="font-semibold text-gray-900">
                    With an Account
                  </h3>
                </div>
                <ul className="space-y-2 text-sm text-gray-700">
                  <li className="flex items-start gap-2">
                    <span className="text-indigo-600 mt-0.5">✓</span>
                    <span>Purchase credits to power your presentations</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-indigo-600 mt-0.5">✓</span>
                    <span>Track your usage and credit balance</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-indigo-600 mt-0.5">✓</span>
                    <span>Save and access your presentations anytime</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-indigo-600 mt-0.5">✓</span>
                    <span>Priority support and faster processing</span>
                  </li>
                </ul>
              </div>

              {/* CTA Buttons */}
              <div className="flex flex-col gap-3">
                <button
                  onClick={() => {
                    // TODO: Navigate to signup/billing page
                    console.log('Navigate to signup/billing');
                  }}
                  className="w-full py-3 px-4 bg-[var(--volute-accent)] text-white font-semibold rounded-lg hover:opacity-90 transition-opacity"
                >
                  Create Account & Get Credits
                </button>
                <button
                  onClick={onClose}
                  className="w-full py-3 px-4 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Close
                </button>
              </div>

              {/* Footer note */}
              <p className="text-xs text-gray-500 text-center mt-4">
                Flexible pricing plans available for individuals and teams
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
