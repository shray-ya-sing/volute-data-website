// API endpoint to get a single company with all metrics and sources
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Pool } from '@neondatabase/serverless';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { companyId } = req.query;

  if (!companyId || typeof companyId !== 'string') {
    return res.status(400).json({ error: 'Company ID is required' });
  }

  const pool = new Pool({ connectionString: process.env.POSTGRES_URL });

  try {
    // Get company data
    const companyResult = await pool.query(
      `SELECT
        c.*,
        COALESCE(
          json_agg(
            DISTINCT jsonb_build_object('id', cat.id, 'name', cat.name, 'description', cat.description)
          ) FILTER (WHERE cat.id IS NOT NULL),
          '[]'
        ) as categories
       FROM companies c
       LEFT JOIN company_category_mappings ccm ON c.id = ccm.company_id
       LEFT JOIN comps_categories cat ON ccm.category_id = cat.id
       WHERE c.id = $1
       GROUP BY c.id`,
      [companyId]
    );

    if (companyResult.rows.length === 0) {
      return res.status(404).json({ error: 'Company not found' });
    }

    const company = companyResult.rows[0];

    // Get metrics with sources
    const metricsResult = await pool.query(
      `SELECT
        cm.id as metric_id,
        cm.metric_id as metric_key,
        md.name as metric_name,
        md.category as metric_category,
        cm.aggregated_value,
        cm.last_updated,
        cm.validated_at,
        cm.validated_by,
        cm.notes,
        COALESCE(
          json_agg(
            json_build_object(
              'id', s.id,
              'type', s.type,
              'name', s.name,
              'value', s.value,
              'date', s.source_date,
              'url', s.url,
              'contentType', s.content_type,
              'blobUrl', s.blob_storage_key,
              'highlights', s.highlights
            )
            ORDER BY s.source_date DESC
          ) FILTER (WHERE s.id IS NOT NULL),
          '[]'
        ) as sources
       FROM company_metrics cm
       JOIN metrics_definitions md ON cm.metric_id = md.id
       LEFT JOIN sources s ON s.company_metric_id = cm.id
       WHERE cm.company_id = $1
       GROUP BY cm.id, cm.metric_id, md.name, md.category, md.display_order
       ORDER BY md.display_order`,
      [companyId]
    );

    // Transform metrics into a more usable format
    const metrics: { [key: string]: any } = {};
    metricsResult.rows.forEach(row => {
      metrics[row.metric_key] = {
        aggregatedValue: row.aggregated_value,
        lastUpdated: row.last_updated,
        validatedAt: row.validated_at,
        validatedBy: row.validated_by,
        notes: row.notes,
        sources: row.sources
      };
    });

    return res.status(200).json({
      companyId: company.id,
      companyName: company.name,
      ticker: company.ticker,
      status: company.status,
      logoUrl: company.logo_url,
      updatedAt: company.updated_at,
      lastValidatedAt: company.last_validated_at,
      categories: company.categories,
      metrics
    });

  } catch (error: any) {
    console.error('Error fetching company:', error);
    return res.status(500).json({
      error: 'Failed to fetch company',
      message: error.message
    });
  } finally {
    await pool.end();
  }
}
