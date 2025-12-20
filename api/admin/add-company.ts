// Admin API endpoint to add a new company
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Pool } from '@neondatabase/serverless';

function checkAuth(req: VercelRequest): boolean {
  const authHeader = req.headers.authorization;
  const password = process.env.ADMIN_PASSWORD;

  if (!password) {
    throw new Error('ADMIN_PASSWORD not configured');
  }

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return false;
  }

  const token = authHeader.substring(7);
  return token === password;
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Check authentication
  if (!checkAuth(req)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const pool = new Pool({ connectionString: process.env.POSTGRES_URL });

  try {
    const { id, name, ticker, status, logoUrl, categories } = req.body;

    if (!id || !name || !ticker) {
      return res.status(400).json({ error: 'Company id, name, and ticker are required' });
    }

    // Insert company
    await pool.query(
      `INSERT INTO companies (id, name, ticker, status, logo_url, last_validated_by)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (id) DO UPDATE SET
         name = EXCLUDED.name,
         ticker = EXCLUDED.ticker,
         status = EXCLUDED.status,
         logo_url = EXCLUDED.logo_url,
         updated_at = NOW()`,
      [id, name, ticker, status || 'public', logoUrl || null, 'Admin']
    );

    // Add to categories if provided
    if (categories && Array.isArray(categories)) {
      for (const categoryId of categories) {
        await pool.query(
          `INSERT INTO company_category_mappings (company_id, category_id)
           VALUES ($1, $2)
           ON CONFLICT DO NOTHING`,
          [id, categoryId]
        );
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Company added successfully',
      companyId: id
    });

  } catch (error: any) {
    console.error('Error adding company:', error);
    return res.status(500).json({
      error: 'Failed to add company',
      message: error.message
    });
  } finally {
    await pool.end();
  }
}
