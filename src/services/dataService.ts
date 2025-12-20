/**
 * Service for fetching IPO data from either Neon database (via API) or local JSON fallback
 */

export interface IPODataFromAPI {
  'Company Ticker': string;
  'Company Name'?: string;
  'Filing URL': string;
  'Filing Date'?: string;
  'IPO Date'?: string;
  'Final Price'?: string;
  'Shares Offered (Primary)'?: string;
  'Shares Offered (Secondary)'?: string;
  'Gross Proceeds'?: string;
  'Net Proceeds'?: string;
  'Proceeds to Company'?: string;
  'Proceeds to Selling Stockholders'?: string;
  'Greenshoe Option'?: string;
  'Underwriter Discount (Per Share)'?: string;
  'Underwriter Discount (Total)'?: string;
  'Lead Bookrunners'?: string;
  'Co-Bookrunners'?: string;
  'Syndicate Members'?: string;
  'Directed Share Program'?: string;
  'Shares Delivery Date'?: string;
  'Exchange'?: string;
  'Page Number'?: Record<string, number>;
  'Bounding Boxes'?: Record<string, { x: number; y: number; width: number; height: number }>;
  [key: string]: any;
}

/**
 * Fetch all filings from Neon database via API
 * Falls back to local JSON if API fails
 */
export async function fetchAllFilings(): Promise<IPODataFromAPI[]> {
  try {
    // Try to fetch from API first
    const response = await fetch('/api/filings');

    if (!response.ok) {
      console.warn('API fetch failed, falling back to local JSON');
      return fetchLocalJSON();
    }

    const data = await response.json();
    console.log('✅ Loaded data from Neon database via API:', data.length, 'filings');
    return data;
  } catch (error) {
    console.error('Error fetching from API, falling back to local JSON:', error);
    return fetchLocalJSON();
  }
}

/**
 * Fetch data from local JSON file (fallback)
 */
async function fetchLocalJSON(): Promise<IPODataFromAPI[]> {
  try {
    const response = await fetch('/data.json');
    const data = await response.json();
    console.log('📁 Loaded data from local JSON:', data.length, 'filings');
    return data;
  } catch (error) {
    console.error('Error loading local JSON:', error);
    return [];
  }
}

/**
 * Fetch a specific filing by ticker
 */
export async function fetchFilingByTicker(ticker: string): Promise<IPODataFromAPI | null> {
  try {
    const response = await fetch(`/api/filing/${ticker}`);

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching filing by ticker:', error);
    return null;
  }
}
