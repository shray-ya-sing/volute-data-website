import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * /api/upload-image
 * 
 * DEPLOYMENT NOTES:
 * - This endpoint should be deployed to Vercel as a serverless function
 * - Place this file at: /api/upload-image.ts in your Vercel project
 * - Install dependencies: npm install @vercel/blob @vercel/node
 * - Set environment variable: BLOB_READ_WRITE_TOKEN (get from Vercel dashboard)
 * 
 * For local development, you can mock this endpoint by creating a local server
 * or use Vercel CLI: vercel dev
 * 
 * POST: Upload an image to blob storage
 * - Body: { data: "base64String" }
 * - Returns: { blobId: string, blobUrl: string }
 * 
 * DELETE: Delete an image from blob storage
 * - Body: { blobUrl: string }
 * - Returns: { success: true }
 */

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method === 'POST') {
    try {
      const { data } = req.body;

      if (!data || typeof data !== 'string') {
        return res.status(400).json({ error: '`data` (base64 string) is required' });
      }

      // Extract MIME type from data URI
      const match = data.match(/^data:([^;]+);base64,(.+)$/);
      if (!match) {
        return res.status(400).json({ error: 'Invalid data URI format. Expected: data:image/xxx;base64,...' });
      }

      const [, contentType, base64Data] = match;

      // Validate it's an image
      if (!contentType.startsWith('image/')) {
        return res.status(400).json({ error: 'Only image uploads are supported' });
      }

      // Convert base64 to buffer
      const buffer = Buffer.from(base64Data, 'base64');

      // Upload to Vercel Blob
      const { put } = await import('@vercel/blob');
      const blob = await put(`volute-attachment-${Date.now()}.${contentType.split('/')[1]}`, buffer, {
        access: 'public',
        contentType,
      });

      console.log(`[upload-image] Uploaded: ${blob.url} (${(buffer.length / 1024).toFixed(1)} KB)`);

      // Return blobId (just the filename/key) and blobUrl (full URL)
      const blobId = blob.pathname; // e.g., "/volute-attachment-123456.png"
      
      return res.status(200).json({
        blobId,
        blobUrl: blob.url,
      });
    } catch (error: any) {
      console.error('[upload-image] POST error:', error.message);
      return res.status(500).json({ error: error.message });
    }
  }

  if (req.method === 'DELETE') {
    try {
      const { blobUrl } = req.body;

      if (!blobUrl || typeof blobUrl !== 'string') {
        return res.status(400).json({ error: '`blobUrl` is required' });
      }

      // Delete from Vercel Blob
      const { del } = await import('@vercel/blob');
      await del(blobUrl);

      console.log(`[upload-image] Deleted: ${blobUrl}`);

      return res.status(200).json({ success: true });
    } catch (error: any) {
      console.error('[upload-image] DELETE error:', error.message);
      return res.status(500).json({ error: error.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}