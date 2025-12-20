// Migration script to move existing JSON data to Neon database
import { Pool } from '@neondatabase/serverless';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

interface SourceData {
  companyId: string;
  companyName: string;
  ticker: string;
  metrics: {
    [key: string]: {
      aggregatedValue: string;
      lastUpdated: string;
      sources: Array<{
        id: string;
        type: string;
        name: string;
        value: string;
        date: string;
        url?: string;
        contentType?: string;
        contentPath?: string;
        highlights?: any[];
      }>;
    };
  };
}

async function migrate() {
  const connectionString = process.env.POSTGRES_URL;

  if (!connectionString) {
    throw new Error('POSTGRES_URL environment variable is not set. Please create a .env.local file.');
  }

  const pool = new Pool({ connectionString });

  console.log('🚀 Starting migration to Neon database...\n');

  try {
    // Load JSON data files
    const asteraPath = path.join(process.cwd(), 'data', 'astera-sources.json');
    const rubrikPath = path.join(process.cwd(), 'data', 'rubrik-sources.json');

    const companies: SourceData[] = [];

    if (fs.existsSync(asteraPath)) {
      companies.push(JSON.parse(fs.readFileSync(asteraPath, 'utf-8')));
      console.log('✓ Loaded Astera Labs data');
    }

    if (fs.existsSync(rubrikPath)) {
      companies.push(JSON.parse(fs.readFileSync(rubrikPath, 'utf-8')));
      console.log('✓ Loaded Rubrik data');
    }

    if (companies.length === 0) {
      console.error('❌ No data files found to migrate');
      process.exit(1);
    }

    console.log(`\n📊 Migrating ${companies.length} companies...\n`);

    // Migrate each company
    for (const companyData of companies) {
      console.log(`\n📍 Migrating ${companyData.companyName} (${companyData.ticker})...`);

      // Insert company
      await pool.query(
        `INSERT INTO companies (id, name, ticker, status, last_validated_at, last_validated_by)
         VALUES ($1, $2, $3, $4, NOW(), $5)
         ON CONFLICT (id) DO UPDATE SET
           name = EXCLUDED.name,
           ticker = EXCLUDED.ticker,
           updated_at = NOW()`,
        [companyData.companyId, companyData.companyName, companyData.ticker, 'public', 'Migration Script']
      );

      console.log(`  ✓ Inserted company: ${companyData.companyName}`);

      // Insert metrics and sources
      let metricCount = 0;
      let sourceCount = 0;

      for (const [metricId, metricData] of Object.entries(companyData.metrics)) {
        // Insert company metric
        const result = await pool.query(
          `INSERT INTO company_metrics (company_id, metric_id, aggregated_value, last_updated, validated_at, validated_by)
           VALUES ($1, $2, $3, $4, NOW(), $5)
           ON CONFLICT (company_id, metric_id) DO UPDATE SET
             aggregated_value = EXCLUDED.aggregated_value,
             last_updated = EXCLUDED.last_updated,
             updated_at = NOW()
           RETURNING id`,
          [
            companyData.companyId,
            metricId,
            metricData.aggregatedValue,
            metricData.lastUpdated,
            'Migration Script'
          ]
        );

        const companyMetricId = result.rows[0].id;
        metricCount++;

        // Insert sources for this metric
        for (const source of metricData.sources) {
          await pool.query(
            `INSERT INTO sources (id, company_metric_id, type, name, value, source_date, url, content_type, blob_storage_key, highlights)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
             ON CONFLICT (id) DO UPDATE SET
               name = EXCLUDED.name,
               value = EXCLUDED.value`,
            [
              source.id,
              companyMetricId,
              source.type,
              source.name,
              source.value,
              source.date,
              source.url || null,
              source.contentType || null,
              source.contentPath || null, // Will be migrated to Vercel Blob later
              source.highlights ? JSON.stringify(source.highlights) : null
            ]
          );
          sourceCount++;
        }
      }

      console.log(`  ✓ Migrated ${metricCount} metrics with ${sourceCount} sources`);

      // Add to default category
      await pool.query(
        `INSERT INTO company_category_mappings (company_id, category_id)
         VALUES ($1, 'saas-ipos-2024')
         ON CONFLICT DO NOTHING`,
        [companyData.companyId]
      );
    }

    console.log('\n✅ Migration completed successfully!\n');
    console.log('Next steps:');
    console.log('1. Review the data in your Neon dashboard');
    console.log('2. Run the blob migration script to upload source files to Vercel Blob');
    console.log('3. Test the API endpoints\n');

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run migration
migrate();
