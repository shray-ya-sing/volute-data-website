import { ErrorBoundary } from './ErrorBoundary';
import { ComponentType } from 'react';

interface RouteErrorBoundaryProps {
  Component: ComponentType;
}

export function RouteErrorBoundary({ Component }: RouteErrorBoundaryProps) {
  return (
    <ErrorBoundary>
      <Component />
    </ErrorBoundary>
  );
}
