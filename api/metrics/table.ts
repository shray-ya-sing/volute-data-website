// API endpoint to get metrics table data (all companies with their metrics)
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

  const pool = new Pool({ connectionString: process.env.POSTGRES_URL });

  try {
    const { category } = req.query;

    // Get companies (optionally filtered by category)
    let companiesQuery = `
      SELECT DISTINCT c.id, c.name, c.ticker, c.logo_url
      FROM companies c
    `;

    const params: any[] = [];

    if (category && typeof category === 'string') {
      companiesQuery += `
        JOIN company_category_mappings ccm ON c.id = ccm.company_id
        WHERE ccm.category_id = $1
      `;
      params.push(category);
    }

    companiesQuery += ' ORDER BY c.name';

    const companiesResult = await pool.query(companiesQuery, params);
    const companies = companiesResult.rows;

    // Get all metrics definitions
    const metricsResult = await pool.query(
      'SELECT * FROM metrics_definitions ORDER BY display_order'
    );
    const metrics = metricsResult.rows;

    // Get all metric values with sources for these companies
    const companyIds = companies.map(c => c.id);

    if (companyIds.length === 0) {
      return res.status(200).json({
        companies: [],
        metrics: [],
        metricValues: []
      });
    }

    const valuesResult = await pool.query(
      `SELECT
        cm.company_id,
        cm.metric_id,
        cm.aggregated_value,
        cm.last_updated,
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
       LEFT JOIN sources s ON s.company_metric_id = cm.id
       WHERE cm.company_id = ANY($1)
       GROUP BY cm.company_id, cm.metric_id, cm.aggregated_value, cm.last_updated`,
      [companyIds]
    );

    // Transform to match frontend format
    const metricValues = valuesResult.rows.map(row => ({
      companyId: row.company_id,
      metricId: row.metric_id,
      value: row.aggregated_value,
      sources: row.sources
    }));

    return res.status(200).json({
      companies: companies.map(c => ({
        id: c.id,
        name: c.name,
        ticker: c.ticker,
        logo: c.logo_url
      })),
      metrics: metrics.map(m => ({
        id: m.id,
        name: m.name
      })),
      metricValues
    });

  } catch (error: any) {
    console.error('Error fetching table data:', error);
    return res.status(500).json({
      error: 'Failed to fetch table data',
      message: error.message
    });
  } finally {
    await pool.end();
  }
}
