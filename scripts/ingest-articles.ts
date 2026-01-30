#!/usr/bin/env tsx
/**
 * Ingest articles from clean-articles directory into Neon DB with VoyageAI embeddings
 */

import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs/promises';
import { JSDOM } from 'jsdom';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const sql = neon(process.env.DATABASE_URL!);
const VOYAGE_API_KEY = process.env.VOYAGE_API_KEY!;

// VoyageAI API configuration
const VOYAGE_API_URL = 'https://api.voyageai.com/v1/embeddings';
const VOYAGE_MODEL = 'voyage-3'; // 1024 dimensions
const BATCH_SIZE = 128; // VoyageAI supports up to 128 texts per request
const MAX_TOKENS_PER_TEXT = 16000; // voyage-3 context length

interface Article {
  title: string;
  url: string;
  sourceFile: string;
  content: string;
  contentPreview: string;
  wordCount: number;
}

/**
 * Extract text content from HTML file
 */
async function extractTextFromHTML(filePath: string): Promise<{ title: string; content: string; url: string }> {
  const html = await fs.readFile(filePath, 'utf-8');
  const dom = new JSDOM(html);
  const doc = dom.window.document;

  // Extract title
  const title = doc.querySelector('title')?.textContent?.trim() || 
                doc.querySelector('h1')?.textContent?.trim() || 
                path.basename(filePath, '.html');

  // Try to extract URL from meta tags or content
  const canonicalUrl = doc.querySelector('link[rel="canonical"]')?.getAttribute('href') || '';
  const ogUrl = doc.querySelector('meta[property="og:url"]')?.getAttribute('content') || '';
  const url = canonicalUrl || ogUrl || path.basename(filePath, '.html');

  // Extract main text content (remove scripts, styles, nav, footer, etc.)
  const elementsToRemove = doc.querySelectorAll('script, style, nav, footer, header, aside, [role="navigation"]');
  elementsToRemove.forEach(el => el.remove());

  // Get text content
  const content = doc.body?.textContent?.trim() || '';
  
  // Clean up whitespace
  const cleanContent = content.replace(/\s+/g, ' ').trim();

  return { title, content: cleanContent, url };
}

/**
 * Generate embeddings using VoyageAI API
 */
async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  if (!VOYAGE_API_KEY) {
    throw new Error('VOYAGE_API_KEY environment variable is required');
  }

  console.log(`  Generating embeddings for ${texts.length} texts...`);

  const response = await fetch(VOYAGE_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${VOYAGE_API_KEY}`,
    },
    body: JSON.stringify({
      input: texts,
      model: VOYAGE_MODEL,
      input_type: 'document', // For indexing documents
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`VoyageAI API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  return data.data.map((item: any) => item.embedding);
}

/**
 * Chunk text to fit within token limits (rough approximation: 1 token ≈ 4 chars)
 */
function chunkText(text: string, maxChars: number = MAX_TOKENS_PER_TEXT * 4): string[] {
  if (text.length <= maxChars) {
    return [text];
  }

  const chunks: string[] = [];
  let currentChunk = '';

  // Split by sentences (rough)
  const sentences = text.split(/(?<=[.!?])\s+/);

  for (const sentence of sentences) {
    if ((currentChunk + sentence).length > maxChars) {
      if (currentChunk) {
        chunks.push(currentChunk.trim());
        currentChunk = sentence;
      } else {
        // Single sentence is too long, just truncate it
        chunks.push(sentence.slice(0, maxChars));
      }
    } else {
      currentChunk += (currentChunk ? ' ' : '') + sentence;
    }
  }

  if (currentChunk) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}

/**
 * Process and insert articles in batches
 */
async function ingestArticles() {
  console.log('Starting article ingestion...\n');

  const cleanArticlesDir = path.join(process.cwd(), 'clean-articles');
  
  try {
    const files = await fs.readdir(cleanArticlesDir);
    const htmlFiles = files.filter(f => f.endsWith('.html'));
    
    console.log(`Found ${htmlFiles.length} HTML files to process\n`);

    let processed = 0;
    let skipped = 0;
    let errors = 0;

    // Process files in batches for embedding generation
    for (let i = 0; i < htmlFiles.length; i += BATCH_SIZE) {
      const batch = htmlFiles.slice(i, Math.min(i + BATCH_SIZE, htmlFiles.length));
      console.log(`\nProcessing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(htmlFiles.length / BATCH_SIZE)}...`);

      const articlesData: Article[] = [];
      const textsForEmbedding: string[] = [];

      // Extract content from HTML files
      for (const file of batch) {
        try {
          const filePath = path.join(cleanArticlesDir, file);
          const { title, content, url } = await extractTextFromHTML(filePath);

          if (!content || content.length < 100) {
            console.log(`  ⚠️  Skipping ${file} - content too short`);
            skipped++;
            continue;
          }

          // Chunk if necessary (for very long articles)
          const chunks = chunkText(content);
          const contentForEmbedding = chunks[0]; // Use first chunk for embedding

          const article: Article = {
            title,
            url,
            sourceFile: file,
            content,
            contentPreview: content.slice(0, 500) + (content.length > 500 ? '...' : ''),
            wordCount: content.split(/\s+/).length,
          };

          articlesData.push(article);
          textsForEmbedding.push(contentForEmbedding);

        } catch (error) {
          console.error(`  ❌ Error processing ${file}:`, error);
          errors++;
        }
      }

      if (textsForEmbedding.length === 0) {
        console.log('  No valid articles in this batch');
        continue;
      }

      // Generate embeddings for the batch
      try {
        const embeddings = await generateEmbeddings(textsForEmbedding);

        // Insert into database
        for (let j = 0; j < articlesData.length; j++) {
          const article = articlesData[j];
          const embedding = embeddings[j];

          try {
            await sql`
              INSERT INTO articles (
                title, url, source_file, content, content_preview, 
                embedding, word_count
              ) VALUES (
                ${article.title},
                ${article.url},
                ${article.sourceFile},
                ${article.content},
                ${article.contentPreview},
                ${JSON.stringify(embedding)},
                ${article.wordCount}
              )
              ON CONFLICT (source_file) DO UPDATE SET
                title = EXCLUDED.title,
                url = EXCLUDED.url,
                content = EXCLUDED.content,
                content_preview = EXCLUDED.content_preview,
                embedding = EXCLUDED.embedding,
                word_count = EXCLUDED.word_count,
                updated_at = CURRENT_TIMESTAMP
            `;

            processed++;
            console.log(`  ✓ Processed: ${article.sourceFile}`);

          } catch (error) {
            console.error(`  ❌ Database error for ${article.sourceFile}:`, error);
            errors++;
          }
        }

      } catch (error) {
        console.error('  ❌ Error generating embeddings for batch:', error);
        errors += articlesData.length;
      }

      // Rate limiting: wait between batches
      if (i + BATCH_SIZE < htmlFiles.length) {
        console.log('  Waiting 1s before next batch...');
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    console.log('\n' + '='.repeat(50));
    console.log(`✅ Ingestion complete!`);
    console.log(`   Processed: ${processed}`);
    console.log(`   Skipped: ${skipped}`);
    console.log(`   Errors: ${errors}`);
    console.log('='.repeat(50));

  } catch (error) {
    console.error('Fatal error during ingestion:', error);
    process.exit(1);
  }
}

ingestArticles();
