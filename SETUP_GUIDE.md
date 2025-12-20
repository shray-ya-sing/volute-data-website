# Volute Database Setup Guide

This guide will walk you through setting up the Neon PostgreSQL database and Vercel Blob storage for the Volute application.

## Overview

The new architecture uses:
- **Neon PostgreSQL**: Serverless database for storing company data, metrics, and sources
- **Vercel Blob**: Cloud storage for PDF filings, HTML snapshots, and other source documents
- **Vercel Serverless Functions**: API endpoints for data access and admin operations

## Step 1: Set Up Neon Database

### 1.1 Create a Neon Account

1. Go to https://console.neon.tech/
2. Sign up with your email or GitHub account
3. Create a new project named "volute"
4. Select a region close to your Vercel deployment (e.g., US East if deploying to Vercel US)

### 1.2 Get Database Connection Strings

1. In your Neon dashboard, click on your project
2. Go to the "Connection Details" section
3. Copy the following connection strings:
   - **Pooled connection** (for serverless functions)
   - **Direct connection** (for migrations)

The connection strings will look like:
```
postgresql://user:password@ep-xyz.us-east-2.aws.neon.tech/volute?sslmode=require
```

### 1.3 Run the Database Schema

1. In your Neon dashboard, go to the SQL Editor
2. Copy the contents of `database/schema.sql`
3. Paste and execute the SQL script
4. Verify that all tables were created successfully:
   - companies
   - metrics_definitions
   - company_metrics
   - sources
   - data_audit_log
   - comps_categories
   - company_category_mappings

Alternatively, you can use a database client like DBeaver, pgAdmin, or the `psql` CLI:

```bash
psql "postgresql://user:password@ep-xyz.us-east-2.aws.neon.tech/volute?sslmode=require" -f database/schema.sql
```

## Step 2: Set Up Vercel Blob Storage

### 2.1 Enable Vercel Blob in Your Project

1. Go to https://vercel.com/dashboard
2. Select your volute project
3. Go to the "Storage" tab
4. Click "Create Database" → "Blob"
5. Name it "volute-sources"
6. Click "Create"

### 2.2 Get Blob Token

Vercel will automatically add the `BLOB_READ_WRITE_TOKEN` environment variable to your project. You can find it in:
- Project Settings → Environment Variables

For local development, you'll need to copy this token to your `.env.local` file.

## Step 3: Configure Environment Variables

### 3.1 Create `.env.local` File

In your project root, create a `.env.local` file (this is gitignored):

```bash
# Copy from .env.example
cp .env.example .env.local
```

### 3.2 Fill in the Variables

Edit `.env.local` with your actual values:

```env
# Anthropic API Key for query parsing
ANTHROPIC_API_KEY=sk-ant-api03-your-key-here

# Neon Database Connection (get from Neon dashboard)
POSTGRES_URL=postgresql://user:password@ep-xyz.us-east-2.aws.neon.tech/volute?sslmode=require
POSTGRES_PRISMA_URL=postgresql://user:password@ep-xyz.us-east-2.aws.neon.tech/volute?sslmode=require&pgbouncer=true
POSTGRES_URL_NON_POOLING=postgresql://user:password@ep-xyz.us-east-2.aws.neon.tech/volute?sslmode=require

# Vercel Blob Storage (get from Vercel dashboard)
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_your-token-here

# Admin Panel Password (choose a secure password)
ADMIN_PASSWORD=your_secure_password_here
```

### 3.3 Set Environment Variables in Vercel

1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Add each variable above for **Production**, **Preview**, and **Development** environments
3. Note: `BLOB_READ_WRITE_TOKEN` should already be set automatically

## Step 4: Install Dependencies

Install the new dependencies for Neon and Vercel Blob:

```bash
npm install
```

This will install:
- `@neondatabase/serverless` - Neon database client
- `@vercel/blob` - Vercel Blob storage SDK
- `@ai-sdk/anthropic` - Anthropic SDK (already in use)
- `zod` - Schema validation
- `dotenv` - Environment variable loading
- `ws` - WebSocket for local dev

## Step 5: Migrate Existing Data

Run the migration script to move your existing Astera Labs and Rubrik data from JSON files to the Neon database:

```bash
npm run db:migrate
```

This script will:
1. Read `data/astera-sources.json` and `data/rubrik-sources.json`
2. Insert companies into the database
3. Insert metrics and sources
4. Add companies to the default category

Expected output:
```
🚀 Starting migration to Neon database...

✓ Loaded Astera Labs data
✓ Loaded Rubrik data

📊 Migrating 2 companies...

📍 Migrating Astera Labs (ALAB)...
  ✓ Inserted company: Astera Labs
  ✓ Migrated 21 metrics with 63 sources

📍 Migrating Rubrik (RBRK)...
  ✓ Inserted company: Rubrik
  ✓ Migrated 5 metrics with 15 sources

✅ Migration completed successfully!
```

## Step 6: Test the API Endpoints

### 6.1 Start the Development Server

```bash
npm run dev
```

### 6.2 Test API Endpoints

Open your browser or use `curl` to test:

**Get all companies:**
```bash
curl http://localhost:5173/api/companies
```

**Get a specific company:**
```bash
curl http://localhost:5173/api/companies/astera-labs
```

**Get table data:**
```bash
curl http://localhost:5173/api/metrics/table
```

All endpoints should return JSON data from your Neon database.

## Step 7: Access the Admin Panel

### 7.1 Open the Admin Interface

Navigate to:
```
http://localhost:5173/#admin
```

### 7.2 Login with Your Password

Use the `ADMIN_PASSWORD` you set in `.env.local`

### 7.3 Test Adding a Company

1. Click "Add Company" tab
2. Fill in:
   - Company ID: `test-company`
   - Company Name: `Test Company`
   - Ticker: `TEST`
3. Click "Add Company"

### 7.4 Test Adding a Metric

1. Click "Add/Update Metric" tab
2. Select "Test Company" from the dropdown
3. Select a metric (e.g., "IPO Date")
4. Enter a value (e.g., "March 1, 2024")
5. Click "+ Add Source"
6. Fill in source details
7. Click "Save Metric"

## Step 8: Update Frontend to Use New API (Optional)

Currently, your frontend loads data from static JSON files. To switch to the database:

1. Update `src/App.tsx` to fetch from `/api/metrics/table` instead of `/data.json`
2. Update the data format transformation if needed

Example:
```typescript
// Replace this:
fetch('/data.json').then((res) => res.json())

// With this:
fetch('/api/metrics/table').then((res) => res.json())
```

## Step 9: Deploy to Vercel

### 9.1 Commit Your Changes

```bash
git add .
git commit -m "feat: add Neon database and admin panel"
git push
```

### 9.2 Verify Deployment

Vercel will automatically deploy your changes. After deployment:

1. Visit your production URL
2. Test the admin panel at `https://your-app.vercel.app/#admin`
3. Verify API endpoints work

## Next Steps: Scaling to More Companies

Now that your infrastructure is set up, you can scale to thousands of companies:

### Adding a New Company via Admin Panel

1. Go to `https://your-app.vercel.app/#admin`
2. Login with your admin password
3. Add the company details
4. For each metric:
   - Enter the aggregated value
   - Add all sources with:
     - Source type (filing, news, presentation)
     - Source name
     - Value found in source
     - Date
     - URL
   - Click "Save Metric"

### Uploading Source Documents to Vercel Blob

For now, source documents (PDFs, HTML) remain in the `public/source-content/` folder. To migrate them to Vercel Blob:

1. Create a blob upload script (future enhancement)
2. Upload files to `companies/{company-id}/sources/{type}/{filename}`
3. Update the `blob_storage_key` in the database

### Data Quality Tips

- Always validate data from multiple sources
- Use the "Notes" field to document any assumptions or caveats
- The audit log tracks all changes automatically
- Review the "Last Validated" date regularly to catch stale data

## Troubleshooting

### Migration Script Fails

**Error**: `POSTGRES_URL environment variable is not set`
- Make sure you created `.env.local` with the correct database URL

**Error**: `Connection refused`
- Check that your Neon database is active (free tier may pause after inactivity)
- Verify the connection string is correct

### API Endpoints Return 500 Error

**Error**: `Failed to fetch companies`
- Check Vercel logs for detailed error messages
- Verify environment variables are set in Vercel dashboard
- Ensure database schema was created successfully

### Admin Panel Login Fails

**Error**: Unauthorized
- Verify `ADMIN_PASSWORD` is set correctly in environment variables
- Check that you're using the correct password
- For local dev, restart the dev server after changing `.env.local`

### Source Files Not Loading

**Issue**: PDF/HTML sources don't display
- Currently, source files in `public/source-content/` should still work
- Blob migration is a future enhancement
- Verify `contentPath` fields in the database match file locations

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────┐
│                     Frontend (React)                     │
│  - Landing Page                                          │
│  - Table View                                            │
│  - Admin Panel (#admin)                                  │
└─────────────────┬───────────────────────────────────────┘
                  │
                  │ HTTP Requests
                  │
┌─────────────────▼───────────────────────────────────────┐
│              Vercel Serverless Functions                 │
│  /api/companies          - List companies                │
│  /api/companies/[id]     - Get company + metrics         │
│  /api/metrics/table      - Get table data                │
│  /api/admin/add-company  - Add/update company            │
│  /api/admin/add-metric   - Add/update metric             │
└─────────────┬──────────────────────┬─────────────────────┘
              │                      │
              │                      │
    ┌─────────▼─────────┐  ┌────────▼──────────┐
    │  Neon PostgreSQL  │  │  Vercel Blob      │
    │  - companies      │  │  - PDFs           │
    │  - metrics        │  │  - HTML snapshots │
    │  - sources        │  │  - Documents      │
    │  - audit_log      │  │                   │
    └───────────────────┘  └───────────────────┘
```

## Support

If you run into any issues:
1. Check the Vercel deployment logs
2. Review the Neon database logs
3. Verify all environment variables are set correctly
4. Check that the database schema was created successfully

Happy data scaling! 🚀
