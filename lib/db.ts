// Database connection utilities for Neon PostgreSQL
import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';

// Configure WebSocket for local development
if (process.env.NODE_ENV !== 'production') {
  neonConfig.webSocketConstructor = ws;
}

let pool: Pool | null = null;

export function getPool() {
  if (!pool) {
    const connectionString = process.env.POSTGRES_URL;

    if (!connectionString) {
      throw new Error('POSTGRES_URL environment variable is not set');
    }

    pool = new Pool({ connectionString });
  }

  return pool;
}

export async function query<T = any>(text: string, params?: any[]): Promise<T[]> {
  const pool = getPool();
  const result = await pool.query(text, params);
  return result.rows as T[];
}

export async function queryOne<T = any>(text: string, params?: any[]): Promise<T | null> {
  const rows = await query<T>(text, params);
  return rows.length > 0 ? rows[0] : null;
}
