import type { VercelRequest, VercelResponse } from '@vercel/node';
import { put, del } from '@vercel/blob';
import { randomUUID } from 'crypto';

// ---------------------------------------------------------------------------
// Vercel config
// ---------------------------------------------------------------------------

export const config = {
  maxDuration: 30,
};

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

type SupportedMediaType = 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp';

const SUPPORTED_MEDIA_TYPES: SupportedMediaType[] = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
];

const SUPPORTED_EXTENSIONS: Record<SupportedMediaType, string> = {
  'image/jpeg': 'jpg',
  'image/png':  'png',
  'image/gif':  'gif',
  'image/webp': 'webp',
};

// Max image size: 10MB (base64 inflates by ~33%, so raw limit ~7.5MB)
const MAX_BASE64_LENGTH = 10 * 1024 * 1024 * 1.37;

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  // ── DELETE /api/upload-image — explicit cleanup before TTL ────────────────
  if (req.method === 'DELETE') {
    const { blobUrl } = req.body ?? {};

    if (!blobUrl || typeof blobUrl !== 'string') {
      return res.status(400).json({ error: '`blobUrl` is required for deletion.' });
    }

    try {
      await del(blobUrl);
      console.log(`[upload-image] 🗑  Deleted blob: ${blobUrl}`);
      return res.status(200).json({ deleted: true });
    } catch (err: any) {
      console.error('[upload-image] Delete error:', err.message);
      return res.status(500).json({ error: err.message });
    }
  }

  // ── POST /api/upload-image — upload base64 image to Vercel Blob ───────────
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { data, mediaType: explicitMediaType } = req.body ?? {};

  if (!data || typeof data !== 'string') {
    return res.status(400).json({
      error: '`data` is required and must be a base64 string (with or without a data URI prefix).',
    });
  }

  // ── Strip data URI prefix if present ──────────────────────────────────────
  let rawBase64 = data;
  let detectedMediaType: SupportedMediaType | undefined;

  const dataUriMatch = rawBase64.match(/^data:([^;]+);base64,(.+)$/s);
  if (dataUriMatch) {
    detectedMediaType = dataUriMatch[1] as SupportedMediaType;
    rawBase64 = dataUriMatch[2];
  }

  const mediaType: SupportedMediaType =
    explicitMediaType ?? detectedMediaType ?? 'image/png';

  if (!SUPPORTED_MEDIA_TYPES.includes(mediaType)) {
    return res.status(400).json({
      error: `Unsupported media type "${mediaType}". Supported: ${SUPPORTED_MEDIA_TYPES.join(', ')}`,
    });
  }

  if (rawBase64.length > MAX_BASE64_LENGTH) {
    return res.status(413).json({
      error: `Image too large. Maximum size is 10MB.`,
    });
  }

  // ── Decode base64 → Buffer ─────────────────────────────────────────────────
  let imageBuffer: Buffer;
  try {
    imageBuffer = Buffer.from(rawBase64, 'base64');
  } catch {
    return res.status(400).json({ error: 'Invalid base64 encoding.' });
  }

  // ── Upload to Vercel Blob ─────────────────────────────────────────────────
  // Filename pattern: tmp-images/<uuid>.<ext>
  // All uploads live under tmp-images/ so they're easy to identify and bulk-clean.
  const blobId  = randomUUID();
  const ext     = SUPPORTED_EXTENSIONS[mediaType];
  const pathname = `tmp-images/${blobId}.${ext}`;

  console.log(
    `[upload-image] ⬆️  Uploading ${(imageBuffer.length / 1024).toFixed(1)} KB ` +
    `(${mediaType}) → ${pathname}`,
  );

  try {
    const blob = await put(pathname, imageBuffer, {
      access:      'public',       // must be public so the backend can fetch by URL
      contentType: mediaType,
      // Vercel Blob doesn't support TTL natively yet — delete explicitly via
      // the DELETE endpoint after the tool consumes the image, or run a
      // scheduled cleanup job against the tmp-images/ prefix.
    });

    console.log(`[upload-image] ✅ Stored at: ${blob.url}`);

    return res.status(200).json({
      blobId,          // UUID — pass this to the agent as imageIds[]
      blobUrl: blob.url, // Full Vercel Blob URL — needed for deletion
      mediaType,
      sizeBytes: imageBuffer.length,
    });

  } catch (err: any) {
    console.error('[upload-image] Blob put error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
