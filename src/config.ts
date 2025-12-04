// Logo.dev API configuration
export const LOGO_DEV_PUBLIC_KEY = 'pk_FWXQQBIjTXq43nROeVQcWA';

// Helper function to get company logo URL from ticker
export function getCompanyLogoUrl(ticker: string): string {
  return `https://img.logo.dev/ticker/${ticker}?token=${LOGO_DEV_PUBLIC_KEY}`;
}
