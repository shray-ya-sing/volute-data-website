import * as Dialog from '@radix-ui/react-dialog';
import * as VisuallyHidden from '@radix-ui/react-visually-hidden';
import { X } from 'lucide-react';
import { Source } from '../types';
import { HtmlSourceViewer } from './HtmlSourceViewer';
import { PdfSourceViewer } from './PdfSourceViewer';

interface SourcePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  source: Source;
  companyName: string;
  metricName: string;
}

export function SourcePreviewModal({
  isOpen,
  onClose,
  source,
  companyName,
  metricName,
}: SourcePreviewModalProps) {
  if (!isOpen || !source) return null;

  return (
    <Dialog.Root open={isOpen} onOpenChange={onClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50" />
        <Dialog.Content className="fixed inset-0 z-50 m-4 md:m-8 bg-white rounded-xl shadow-2xl overflow-hidden flex flex-col">
          <VisuallyHidden.Root>
            <Dialog.Title>Source Preview: {source.name}</Dialog.Title>
            <Dialog.Description>
              Viewing source content for {companyName} - {metricName}
            </Dialog.Description>
          </VisuallyHidden.Root>

          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200 bg-white flex-shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0 pr-4">
                <div className="flex items-center gap-3 mb-1">
                  <h2 className="text-lg font-semibold text-gray-900 truncate">
                    {companyName} - {metricName}
                  </h2>
                  <span className="px-2.5 py-0.5 rounded-full bg-gray-100 text-gray-700 text-xs font-medium flex-shrink-0">
                    {source.type}
                  </span>
                </div>
                <p className="text-gray-600 truncate">{source.name}</p>
                <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                  <span>Value: <span className="font-medium text-gray-900">{source.value}</span></span>
                  <span>•</span>
                  <span>{source.date}</span>
                  {source.highlights && source.highlights.length > 0 && (
                    <>
                      <span>•</span>
                      <span className="text-yellow-700 font-medium">
                        {source.highlights.length} highlight{source.highlights.length !== 1 ? 's' : ''}
                      </span>
                    </>
                  )}
                </div>
              </div>
              <Dialog.Close className="p-2 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0">
                <X className="w-5 h-5 text-gray-500" />
              </Dialog.Close>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-auto bg-gray-50">
            {source.contentType === 'pdf' ? (
              <PdfSourceViewer
                contentPath={source.contentPath}
                contentUrl={source.contentUrl}
                highlights={source.highlights || []}
              />
            ) : (
              <HtmlSourceViewer
                contentPath={source.contentPath}
                contentUrl={source.contentUrl}
                highlights={source.highlights || []}
              />
            )}
          </div>

          {/* Footer - Help text */}
          <div className="px-6 py-3 border-t border-gray-200 bg-gray-50 flex-shrink-0">
            <p className="text-sm text-gray-600 text-center">
              {source.highlights && source.highlights.length > 0 ? (
                <>Highlighted sections show where the datapoint value appears in the source</>
              ) : (
                <>No highlights available for this source</>
              )}
            </p>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
