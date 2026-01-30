#!/usr/bin/env tsx
/**
 * Create database schema for article vector search with pgvector and full-text search
 */

import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const sql = neon(process.env.DATABASE_URL!);

async function createSchema() {
  console.log('Creating database schema for article search...\n');

  try {
    // Enable pgvector extension
    await sql`CREATE EXTENSION IF NOT EXISTS vector`;
    console.log('✓ Enabled pgvector extension');

    // Create articles table with vector embeddings and full-text search
    await sql`
      CREATE TABLE IF NOT EXISTS articles (
        id SERIAL PRIMARY KEY,
        title TEXT,
        url TEXT NOT NULL,
        source_file TEXT NOT NULL,
        content TEXT NOT NULL,
        content_preview TEXT,
        
        -- Vector embedding for semantic search (VoyageAI voyage-3 = 1024 dimensions)
        embedding vector(1024),
        
        -- Full-text search vector
        search_vector tsvector GENERATED ALWAYS AS (
          setweight(to_tsvector('english', COALESCE(title, '')), 'A') ||
          setweight(to_tsvector('english', content), 'B')
        ) STORED,
        
        -- Metadata
        word_count INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        
        UNIQUE(source_file)
      )
    `;
    console.log('✓ Created articles table');

    // Create indexes for vector similarity search
    await sql`
      CREATE INDEX IF NOT EXISTS idx_articles_embedding 
      ON articles 
      USING ivfflat (embedding vector_cosine_ops)
      WITH (lists = 100)
    `;
    console.log('✓ Created vector similarity index');

    // Create GIN index for full-text search
    await sql`
      CREATE INDEX IF NOT EXISTS idx_articles_search_vector 
      ON articles 
      USING GIN (search_vector)
    `;
    console.log('✓ Created full-text search index');

    // Create standard indexes
    await sql`CREATE INDEX IF NOT EXISTS idx_articles_url ON articles(url)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_articles_created_at ON articles(created_at DESC)`;
    console.log('✓ Created standard indexes');

    console.log('\n✅ Database schema created successfully!');

    // Show table info
    const tables = await sql`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name = 'articles'
    `;
    console.log('\nTables created:');
    tables.forEach((t: any) => console.log(`  - ${t.table_name}`));

  } catch (error) {
    console.error('Error creating schema:', error);
    process.exit(1);
  }
}

createSchema();
