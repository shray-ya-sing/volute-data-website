export interface IPOData {
  "Company Name": string;
  "Company Ticker": string;
  "Filing URL": string;
  "Exchange": string;
  "S1 Filing Date": string;
  "IPO Date": string;
  "IPO Price Range": string;
  "Final Price": string;
  "Shares Offered (Primary)": string;
  "Shares Offered (Secondary)": string;
  "Total Shares Outstanding": string;
  "Gross Proceeds": string;
  "Net Proceeds": string;
  "Greenshoe Option": string;
  "Underwriter Discount (Per Share)": string;
  "Underwriter Discount (Total)": string;
  "Lead Bookrunners": string;
  "Co-Bookrunners": string;
  "Syndicate Members": string;
  "Directed Share Program": string;
  "Post-IPO Voting Control": string;
  "Shares Delivery Date": string;
  "Notes"?: Record<string, string>;
  "Page Number"?: Record<string, string>;
}

export interface SearchResult {
  id: string;
  companyName: string;
  ticker: string;
  exchange: string;
  ipoDate: string;
  finalPrice: string;
  grossProceeds: string;
  category: string;
  description: string;
  fullData: IPOData;
}

// Comps category types
export interface CompsCategory {
  id: string;
  name: string;
  description: string;
  category: string;
  companyCount: number;
  metricCount: number;
}

// Metrics table types
export interface Company {
  id: string;
  name: string;
  ticker: string;
  logo: string;
}

export interface Metric {
  id: string;
  name: string;
}

export interface SourceHighlight {
  searchText: string;              // Exact text to highlight
  contextBefore?: string;          // Text before for disambiguation
  contextAfter?: string;           // Text after for disambiguation

  // For HTML
  cssSelector?: string;            // CSS selector to target element

  // For PDF
  pageNumber?: number;             // PDF page number (1-indexed)
  boundingBox?: {                  // Coordinates on page
    x: number;
    y: number;
    width: number;
    height: number;
  };

  highlightColor?: string;         // Default: #FFEB3B (yellow)
}

export interface Source {
  type: 'website' | 'news' | 'filing' | 'database';
  name: string;
  value: string;
  date: string;
  url?: string;

  // NEW FIELDS for source highlighting
  contentType?: 'html' | 'pdf';
  contentPath?: string;            // e.g., '/source-content/astera-labs/filing.html'
  contentUrl?: string;             // Vercel Blob URL for large files
  highlights?: SourceHighlight[];
  fetchedAt?: string;
}

export interface MetricValue {
  companyId: string;
  metricId: string;
  value: string;
  sources: Source[];
}
