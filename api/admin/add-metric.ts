// Admin API endpoint to add/update a metric with sources
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Pool } from '@neondatabase/serverless';
import { put } from '@vercel/blob';

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
    const { companyId, metricId, aggregatedValue, notes, sources } = req.body;

    if (!companyId || !metricId || !aggregatedValue) {
      return res.status(400).json({
        error: 'Company ID, metric ID, and aggregated value are required'
      });
    }

    // Check if metric definition exists
    const metricDef = await pool.query(
      'SELECT id FROM metrics_definitions WHERE id = $1',
      [metricId]
    );

    if (metricDef.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid metric ID' });
    }

    // Get or create old value for audit log
    const existingMetric = await pool.query(
      'SELECT aggregated_value FROM company_metrics WHERE company_id = $1 AND metric_id = $2',
      [companyId, metricId]
    );

    const oldValue = existingMetric.rows.length > 0 ? existingMetric.rows[0].aggregated_value : null;

    // Upsert company metric
    const metricResult = await pool.query(
      `INSERT INTO company_metrics (company_id, metric_id, aggregated_value, last_updated, validated_at, validated_by, notes)
       VALUES ($1, $2, $3, NOW(), NOW(), $4, $5)
       ON CONFLICT (company_id, metric_id) DO UPDATE SET
         aggregated_value = EXCLUDED.aggregated_value,
         last_updated = NOW(),
         validated_at = NOW(),
         validated_by = EXCLUDED.validated_by,
         notes = EXCLUDED.notes,
         updated_at = NOW()
       RETURNING id`,
      [companyId, metricId, aggregatedValue, 'Admin', notes || null]
    );

    const companyMetricId = metricResult.rows[0].id;

    // Log change to audit trail if value changed
    if (oldValue && oldValue !== aggregatedValue) {
      await pool.query(
        `INSERT INTO data_audit_log (company_id, metric_id, old_value, new_value, changed_by, change_reason)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [companyId, metricId, oldValue, aggregatedValue, 'Admin', 'Manual update']
      );
    }

    // Delete existing sources for this metric
    await pool.query(
      'DELETE FROM sources WHERE company_metric_id = $1',
      [companyMetricId]
    );

    // Insert sources
    if (sources && Array.isArray(sources) && sources.length > 0) {
      for (const source of sources) {
        if (!source.id || !source.type || !source.name || !source.value || !source.date) {
          continue; // Skip invalid sources
        }

        await pool.query(
          `INSERT INTO sources (id, company_metric_id, type, name, value, source_date, url, content_type, blob_storage_key, highlights)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
          [
            source.id,
            companyMetricId,
            source.type,
            source.name,
            source.value,
            source.date,
            source.url || null,
            source.contentType || null,
            source.blobUrl || null,
            source.highlights ? JSON.stringify(source.highlights) : null
          ]
        );
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Metric added/updated successfully',
      companyMetricId
    });

  } catch (error: any) {
    console.error('Error adding metric:', error);
    return res.status(500).json({
      error: 'Failed to add metric',
      message: error.message
    });
  } finally {
    await pool.end();
  }
}
