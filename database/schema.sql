-- Volute Database Schema
-- PostgreSQL schema for Neon database

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Core tables
CREATE TABLE companies (
  id TEXT PRIMARY KEY,              -- e.g., "astera-labs"
  name TEXT NOT NULL,               -- "Astera Labs"
  ticker TEXT UNIQUE NOT NULL,      -- "ALAB"
  status TEXT DEFAULT 'public',     -- 'public', 'private'
  logo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_validated_at TIMESTAMPTZ,    -- Track when data was last human-verified
  last_validated_by TEXT            -- Track who validated
);

CREATE TABLE metrics_definitions (
  id TEXT PRIMARY KEY,              -- e.g., "finalPrice"
  name TEXT NOT NULL,               -- "Final Price"
  category TEXT,                    -- "IPO Metrics", "Financial Metrics", etc.
  data_type TEXT,                   -- "currency", "percentage", "date", "text"
  display_order INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE company_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id TEXT REFERENCES companies(id) ON DELETE CASCADE,
  metric_id TEXT REFERENCES metrics_definitions(id),
  aggregated_value TEXT NOT NULL,   -- The final curated value you've validated
  last_updated TIMESTAMPTZ NOT NULL,
  validated_at TIMESTAMPTZ,         -- When you manually validated this value
  validated_by TEXT,                -- Your name or identifier
  notes TEXT,                       -- Any caveats or context
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, metric_id)
);

CREATE TABLE sources (
  id TEXT PRIMARY KEY,              -- e.g., "src-alab-filing-s1a"
  company_metric_id UUID REFERENCES company_metrics(id) ON DELETE CASCADE,
  type TEXT NOT NULL,               -- 'filing', 'news', 'presentation', 'database'
  name TEXT NOT NULL,               -- "S-1/A Filing (PDF)"
  value TEXT NOT NULL,              -- The value found in this source
  source_date DATE NOT NULL,        -- Date of the source document
  url TEXT,                         -- External URL if applicable
  content_type TEXT,                -- 'pdf', 'html', 'json'
  blob_storage_key TEXT,            -- Vercel Blob URL for stored content
  highlights JSONB,                 -- Store your highlight annotations
  credibility_score INTEGER,        -- Optional: rank source reliability
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Audit trail for data changes
CREATE TABLE data_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id TEXT REFERENCES companies(id),
  metric_id TEXT,
  old_value TEXT,
  new_value TEXT,
  changed_by TEXT NOT NULL,
  change_reason TEXT,
  changed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Categories/comps groupings
CREATE TABLE comps_categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE company_category_mappings (
  company_id TEXT REFERENCES companies(id) ON DELETE CASCADE,
  category_id TEXT REFERENCES comps_categories(id) ON DELETE CASCADE,
  PRIMARY KEY (company_id, category_id)
);

-- Indexes for performance
CREATE INDEX idx_company_metrics_company ON company_metrics(company_id);
CREATE INDEX idx_company_metrics_metric ON company_metrics(metric_id);
CREATE INDEX idx_sources_company_metric ON sources(company_metric_id);
CREATE INDEX idx_sources_type ON sources(type);
CREATE INDEX idx_audit_log_company ON data_audit_log(company_id);
CREATE INDEX idx_companies_ticker ON companies(ticker);
CREATE INDEX idx_companies_updated ON companies(updated_at);

-- Insert metrics definitions
INSERT INTO metrics_definitions (id, name, category, data_type, display_order) VALUES
  ('ipoDate', 'IPO Date', 'IPO Metrics', 'date', 1),
  ('finalPrice', 'Final Price', 'IPO Metrics', 'currency', 2),
  ('priceRange', 'Expected Price Range', 'IPO Metrics', 'text', 3),
  ('openingPrice', 'Opening Price', 'IPO Metrics', 'currency', 4),
  ('firstDayClosingPrice', 'First Day Closing Price', 'IPO Metrics', 'currency', 5),
  ('ipoValuation', 'IPO Valuation', 'Valuation Metrics', 'currency', 6),
  ('lastPrivateValuation', 'Last Private Valuation', 'Valuation Metrics', 'currency', 7),
  ('upsizedOrDownsized', 'Upsized/Downsized', 'IPO Metrics', 'text', 8),
  ('sharesOffered', 'Shares Offered (Primary)', 'Share Structure', 'text', 9),
  ('sharesCompany', 'Shares Sold by Company', 'Share Structure', 'text', 10),
  ('sharesSellingStockholders', 'Shares Sold by Selling Stockholders', 'Share Structure', 'text', 11),
  ('greenshoeShares', 'Greenshoe Shares', 'Share Structure', 'text', 12),
  ('commonStockOutstanding', 'Common Stock Outstanding', 'Share Structure', 'text', 13),
  ('grossProceeds', 'Gross Proceeds', 'Financial Metrics', 'currency', 14),
  ('netProceeds', 'Net Proceeds', 'Financial Metrics', 'currency', 15),
  ('proceedsToCompany', 'Proceeds to Company', 'Financial Metrics', 'currency', 16),
  ('proceedsToSellingStockholders', 'Proceeds to Selling Stockholders', 'Financial Metrics', 'currency', 17),
  ('underwriterDiscount', 'Underwriter Discount', 'Financial Metrics', 'currency', 18),
  ('bookrunners', 'Bookrunning Banks', 'Deal Information', 'text', 19),
  ('attorneys', 'Attorneys', 'Deal Information', 'text', 20),
  ('notes', 'Notes', 'Deal Information', 'text', 21);

-- Insert default comps categories
INSERT INTO comps_categories (id, name, description, category) VALUES
  ('saas-ipos-2024', 'SaaS IPOs 2024', 'Cloud security and infrastructure companies that went public in 2024', 'IPO Comps'),
  ('ai-infrastructure', 'AI Infrastructure', 'AI and machine learning infrastructure companies', 'Technology'),
  ('cloud-infrastructure', 'Cloud Infrastructure', 'Public cloud infrastructure and security platform companies', 'Technology');
