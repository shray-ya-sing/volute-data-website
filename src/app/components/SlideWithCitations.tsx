import { useCallback, useEffect, useRef } from 'react';
import { SandboxSlide } from './SandboxSlide';

interface SlideWithCitationsProps {
  code: string;
  slideNumber: number;
  onCitationClick: (citationId: number) => void;
  onRendered?: () => void;
}

export function SlideWithCitations({
  code,
  slideNumber,
  onCitationClick,
  onRendered,
}: SlideWithCitationsProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Listen for clicks on [data-citation] elements inside the iframe/sandpack
  const handleMessage = useCallback(
    (event: MessageEvent) => {
      if (event.data?.type === 'citation-click' && typeof event.data.id === 'number') {
        onCitationClick(event.data.id);
      }
    },
    [onCitationClick],
  );

  useEffect(() => {
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [handleMessage]);

  // Inject a small script into the Sandpack code that adds click listeners
  // to all [data-citation] elements and posts a message to the parent
  const codeWithCitationHandlers = code + `\n
// --- Citation click handler (injected) ---
if (typeof window !== 'undefined') {
  document.addEventListener('click', (e) => {
    const badge = e.target.closest('[data-citation]');
    if (badge) {
      const id = parseInt(badge.getAttribute('data-citation'), 10);
      if (!isNaN(id)) {
        window.parent.postMessage({ type: 'citation-click', id }, '*');
      }
    }
  });
}`;

  return (
    <div ref={containerRef} className="w-full h-full">
      <SandboxSlide
        code={codeWithCitationHandlers}
        slideNumber={slideNumber}
        onRendered={onRendered}
      />
    </div>
  );
}