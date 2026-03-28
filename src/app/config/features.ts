/**
 * Feature Flags Configuration
 * 
 * Centralized location for all development/testing feature flags.
 * Modify these values before production deployment.
 */

/**
 * ENABLE_MOCK_AGENT
 * 
 * Controls whether the mock agent stream is available for Figma preview mode.
 * 
 * - true (default): Mock agent runs ONLY when hostname contains 'figma.site' or 'makeproxy'
 * - false: Mock agent disabled entirely (Figma previews won't work)
 * 
 * RECOMMENDATION: Leave as true in production.
 * The hostname check ensures your production domain never triggers mocks.
 */
export const ENABLE_MOCK_AGENT = true;

/**
 * ENABLE_MOCK_DATA
 * 
 * Controls whether the "Add Mock Data (Dev)" button appears on slides without data points.
 * 
 * - true: Shows amber button for manual mock data injection (development/testing)
 * - false: Hides mock button entirely (production recommended)
 * 
 * RECOMMENDATION: Set to false for production deployment.
 */
export const ENABLE_MOCK_DATA = true;

/**
 * Environment detection helpers
 */
export const isDevelopment = process.env.NODE_ENV === 'development';
export const isProduction = process.env.NODE_ENV === 'production';

/**
 * Figma preview detection
 * Returns true if running in Figma Make preview environment
 */
export function isFigmaPreview(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.location.hostname.includes('figma.site') ||
    window.location.hostname.includes('makeproxy')
  );
}

/**
 * Should show development-only features?
 * Combines environment and hostname checks
 */
export function shouldShowDevFeatures(): boolean {
  return isDevelopment || isFigmaPreview();
}

/**
 * Production safety check
 * Returns true if we're certain this is a production deployment
 */
export function isProductionDeployment(): boolean {
  return isProduction && !isFigmaPreview();
}
