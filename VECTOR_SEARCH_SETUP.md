# Vector Search Setup Guide

This guide explains how to set up hybrid semantic + full-text search for articles using pgvector, VoyageAI, and Neon PostgreSQL.

## Architecture

- **Vector Database**: pgvector (PostgreSQL extension) on Neon
- **Embeddings**: VoyageAI `voyage-3` model (1024 dimensions)
- **Search Strategy**: Hybrid search combining:
  - Semantic search (pgvector cosine similarity)
  - Full-text search (PostgreSQL `tsvector`)
  - Reciprocal Rank Fusion (RRF) for result merging

## Prerequisites

1. **Neon Database** with connection string in `.env.local`:
   ```
   DATABASE_URL=postgresql://...
   ```

2. **VoyageAI API Key** in `.env.local`:
   ```
   VOYAGE_API_KEY=your_voyage_api_key_here
   ```
   Get your API key from: https://dash.voyageai.com/

3. **Node.js dependencies**:
   ```bash
   npm install
   ```

## Setup Steps

### 1. Create Database Schema

Run this to create the `articles` table with pgvector and full-text search:

```bash
npm run articles:create-schema
```

This will:
- Enable the `vector` extension in your Neon database
- Create the `articles` table with:
  - `embedding` column (vector(1024)) for semantic search
  - `search_vector` column (tsvector) for full-text search
  - Indexes for both search types
- Store article URLs, titles, content, and metadata

### 2. Ingest Articles

Run this to read HTML files from `clean-articles/`, generate embeddings, and store in DB:

```bash
npm run articles:ingest
```

This will:
- Read all `.html` files from `clean-articles/` directory
- Extract text content and metadata (title, URL)
- Generate VoyageAI embeddings in batches of 128
- Insert articles into the database
- Process ~100+ articles in a few minutes

**Note**: You need VoyageAI credits for this step. Pricing: ~$0.12 per 1M tokens.

### 3. Test the Search API

The search endpoint is available at `/api/search`:

**POST request:**
```bash
curl -X POST http://localhost:3000/api/search \
  -H "Content-Type: application/json" \
  -d '{
    "query": "EV/EBITDA multiples 20mm EBITDA transactions",
    "limit": 20
  }'
```

**GET request:**
```bash
curl "http://localhost:3000/api/search?q=EV/EBITDA+multiples&limit=10"
```

**Response format:**
```json
{
  "query": "EV/EBITDA multiples 20mm EBITDA transactions",
  "results": [
    {
      "id": 1,
      "title": "Article Title",
      "url": "https://example.com/article",
      "contentPreview": "First 500 chars of content...",
      "score": 0.0234,
      "semanticScore": 0.85,
      "fulltextScore": 0.12,
      "wordCount": 1500
    }
  ],
  "count": 20,
  "weights": {
    "semantic": 0.6,
    "fulltext": 0.4
  }
}
```

## How It Works

### Hybrid Search Algorithm

1. **User enters query** → Single search box input

2. **Backend processes in parallel:**
   - **Semantic search**: Query → VoyageAI embedding → pgvector cosine similarity → Top 50 results
   - **Full-text search**: Query → PostgreSQL websearch_to_tsquery → tsvector match → Top 50 results

3. **Result fusion using RRF:**
   ```sql
   combined_score = (semantic_weight / (60 + semantic_rank)) + 
                    (fulltext_weight / (60 + fulltext_rank))
   ```
   - Default weights: 60% semantic, 40% full-text
   - Articles matching both searches rank highest
   - Returns top 20 combined results

### Why This Approach?

| Search Type | Strengths | Example Queries |
|------------|-----------|-----------------|
| **Semantic** | Conceptual matching, synonyms, context | "healthcare valuation trends" |
| **Full-text** | Exact phrases, technical terms, acronyms | "EV/EBITDA", "20mm EBITDA" |
| **Hybrid** | Best of both worlds | "EV/EBITDA multiples 20mm EBITDA transactions" |

## Database Schema

```sql
CREATE TABLE articles (
  id SERIAL PRIMARY KEY,
  title TEXT,
  url TEXT NOT NULL,
  source_file TEXT NOT NULL UNIQUE,
  content TEXT NOT NULL,
  content_preview TEXT,
  
  -- Vector embedding (1024 dimensions)
  embedding vector(1024),
  
  -- Full-text search vector (auto-generated)
  search_vector tsvector GENERATED ALWAYS AS (
    setweight(to_tsvector('english', COALESCE(title, '')), 'A') ||
    setweight(to_tsvector('english', content), 'B')
  ) STORED,
  
  word_count INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## API Reference

### POST /api/search

**Request body:**
```typescript
{
  query: string;           // Search query
  limit?: number;          // Max results (default: 20)
  semanticWeight?: number; // Semantic weight 0-1 (default: 0.6)
  fulltextWeight?: number; // Fulltext weight 0-1 (default: 0.4)
}
```

**Response:**
```typescript
{
  query: string;
  results: Array<{
    id: number;
    title: string;
    url: string;
    contentPreview: string;
    score: number;
    semanticScore?: number;
    fulltextScore?: number;
    wordCount: number;
  }>;
  count: number;
  weights: {
    semantic: number;
    fulltext: number;
  };
}
```

## Cost Estimates

### VoyageAI Embeddings
- **Model**: voyage-3 (1024 dimensions)
- **Pricing**: ~$0.12 per 1M tokens
- **Typical article**: 1000-3000 tokens
- **100 articles**: ~$0.02-0.05

### Neon Database
- **Free tier**: Sufficient for development
- **Storage**: ~1 KB per article (text + embedding)
- **1000 articles**: ~1 MB storage

## Troubleshooting

### "Extension vector does not exist"
```bash
# Connect to your Neon database and run:
CREATE EXTENSION vector;
```

### "VoyageAI API error"
- Check your API key in `.env.local`
- Verify you have credits: https://dash.voyageai.com/

### "No results found"
- Ensure articles are ingested: `npm run articles:ingest`
- Check article count: `SELECT COUNT(*) FROM articles;`

## Next Steps

1. **Update frontend**: Modify search UI to call `/api/search`
2. **Add filters**: Date range, source, word count, etc.
3. **Caching**: Add Redis for query caching
4. **Monitoring**: Track search latency and quality
