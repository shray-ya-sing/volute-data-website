# Database Schema

This directory contains the PostgreSQL database schema for Volute.

## Files

- `schema.sql` - Complete database schema with tables, indexes, and initial data

## Setup

### Using Neon SQL Editor (Recommended)

1. Go to https://console.neon.tech/
2. Open your project
3. Click on "SQL Editor"
4. Copy the contents of `schema.sql`
5. Paste and execute

### Using psql CLI

```bash
psql "postgresql://user:pass@host.neon.tech/volute?sslmode=require" -f schema.sql
```

### Using a Database Client

Import `schema.sql` using:
- DBeaver
- pgAdmin
- TablePlus
- Any PostgreSQL client

## Schema Overview

### Core Tables

**companies** - Company information
- id, name, ticker, status, logo_url
- Tracks validation timestamps

**metrics_definitions** - Predefined metrics (21 IPO metrics)
- id, name, category, data_type, display_order

**company_metrics** - Company-specific metric values
- Links companies to metrics
- Stores aggregated (validated) values
- Tracks who validated and when

**sources** - Source documents for each metric
- Links to company_metrics
- Stores source metadata (type, name, value, date, URL)
- Can store blob storage keys for uploaded files
- Supports JSON highlights for annotations

**data_audit_log** - Audit trail of changes
- Tracks all metric value changes
- Records who changed what and when

**comps_categories** - Category/grouping definitions
- For organizing companies (e.g., "SaaS IPOs 2024")

**company_category_mappings** - Many-to-many relationship
- Links companies to categories

## Initial Data

The schema includes:

- **21 metric definitions** - All IPO metrics predefined
- **3 default categories** - SaaS IPOs 2024, AI Infrastructure, Cloud Infrastructure

After running the schema, run the migration script to import existing Astera Labs and Rubrik data:

```bash
npm run db:migrate
```

## Schema Version

Current version: 1.0.0
Last updated: 2024
