// API endpoint to list all companies or search companies
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
    const { search, category } = req.query;

    let query = `
      SELECT
        c.id,
        c.name,
        c.ticker,
        c.status,
        c.logo_url,
        c.updated_at,
        c.last_validated_at,
        COALESCE(
          json_agg(
            DISTINCT jsonb_build_object('id', cat.id, 'name', cat.name)
          ) FILTER (WHERE cat.id IS NOT NULL),
          '[]'
        ) as categories
      FROM companies c
      LEFT JOIN company_category_mappings ccm ON c.id = ccm.company_id
      LEFT JOIN comps_categories cat ON ccm.category_id = cat.id
    `;

    const params: any[] = [];
    const conditions: string[] = [];

    // Add search filter
    if (search && typeof search === 'string') {
      conditions.push(`(c.name ILIKE $${params.length + 1} OR c.ticker ILIKE $${params.length + 1})`);
      params.push(`%${search}%`);
    }

    // Add category filter
    if (category && typeof category === 'string') {
      conditions.push(`ccm.category_id = $${params.length + 1}`);
      params.push(category);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += `
      GROUP BY c.id, c.name, c.ticker, c.status, c.logo_url, c.updated_at, c.last_validated_at
      ORDER BY c.updated_at DESC
    `;

    const result = await pool.query(query, params);

    return res.status(200).json({
      companies: result.rows,
      count: result.rows.length
    });

  } catch (error: any) {
    console.error('Error fetching companies:', error);
    return res.status(500).json({
      error: 'Failed to fetch companies',
      message: error.message
    });
  } finally {
    await pool.end();
  }
}
