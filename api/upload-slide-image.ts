import type { VercelRequest, VercelResponse } from '@vercel/node';
import { put, del, list } from '@vercel/blob';

// ---------------------------------------------------------------------------
// Vercel config
// ---------------------------------------------------------------------------

export const config = {
  maxDuration: 30,
};

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

type SupportedMediaType = 'image/png' | 'image/jpeg' | 'image/webp';

const SUPPORTED_MEDIA_TYPES: SupportedMediaType[] = ['image/png', 'image/jpeg', 'image/webp'];

const EXTENSIONS: Record<SupportedMediaType, string> = {
  'image/png':  'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
};

// Max image size: 10MB base64
const MAX_BASE64_LENGTH = 10 * 1024 * 1024 * 1.37;

// ---------------------------------------------------------------------------
// Path helpers
// ---------------------------------------------------------------------------

// code_store/{presentationId}/slide_{n}_v{version}.png
function imagePath(presentationId: string, slideNumber: number, version: number, ext: string): string {
  return `code_store/${presentationId}/slide_${slideNumber}_v${version}.${ext}`;
}

// Prefix for listing all image versions of a specific slide
function slideImagePrefix(presentationId: string, slideNumber: number): string {
  return `code_store/${presentationId}/slide_${slideNumber}_v`;
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  // ── GET /api/upload-slide-image — fetch latest (or specific) slide image URL ─
  // Query params: presentationId, slideNumber, version? (omit for latest)
  // Returns the blob URL — frontend fetches the image directly, no base64 over wire
  if (req.method === 'GET') {
    const { presentationId, slideNumber, version } = req.query;

    if (!presentationId || typeof presentationId !== 'string') {
      return res.status(400).json({ error: '`presentationId` is required.' });
    }
    if (!slideNumber || isNaN(Number(slideNumber))) {
      return res.status(400).json({ error: '`slideNumber` must be a number.' });
    }

    const sn = Number(slideNumber);

    try {
      const { blobs } = await list({ prefix: slideImagePrefix(presentationId, sn) });

      // Filter to only image files (exclude .tsx from the same prefix)
      const imageBlobs = blobs.filter(b =>
        b.pathname.match(/\.(png|jpg|webp)$/)
      );

      if (imageBlobs.length === 0) {
        return res.status(404).json({ error: `No images found for slide ${sn}.` });
      }

      // Parse version numbers and find the requested or latest
      const versioned = imageBlobs
        .map(b => {
          const match = b.pathname.match(/_v(\d+)\.(png|jpg|webp)$/);
          return match ? { blob: b, version: Number(match[1]) } : null;
        })
        .filter(Boolean) as { blob: typeof blobs[0]; version: number }[];

      versioned.sort((a, b) => b.version - a.version);

      const target = version && !isNaN(Number(version))
        ? versioned.find(v => v.version === Number(version))
        : versioned[0];

      if (!target) {
        return res.status(404).json({ error: `Slide ${sn} v${version} image not found.` });
      }

      return res.status(200).json({
        presentationId,
        slideNumber: sn,
        version: target.version,
        imageUrl: target.blob.url,
        uploadedAt: target.blob.uploadedAt,
        totalVersions: versioned.length,
      });

    } catch (err: any) {
      console.error('[upload-slide-image] GET error:', err.message);
      return res.status(500).json({ error: err.message });
    }
  }

  // ── DELETE /api/upload-slide-image — delete by blob URL ──────────────────
  if (req.method === 'DELETE') {
    const { blobUrl } = req.body ?? {};

    if (!blobUrl || typeof blobUrl !== 'string') {
      return res.status(400).json({ error: '`blobUrl` is required for deletion.' });
    }

    try {
      await del(blobUrl);
      console.log(`[upload-slide-image] 🗑  Deleted: ${blobUrl}`);
      return res.status(200).json({ deleted: true });
    } catch (err: any) {
      console.error('[upload-slide-image] DELETE error:', err.message);
      return res.status(500).json({ error: err.message });
    }
  }

  // ── POST /api/upload-slide-image — store a rendered slide PNG ────────────
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const {
    presentationId,
    slideNumber,
    version,
    data,                          // base64 image data (with or without data URI prefix)
    mediaType: explicitMediaType,
  } = req.body ?? {};

  if (!presentationId || typeof presentationId !== 'string') {
    return res.status(400).json({ error: '`presentationId` is required.' });
  }
  if (slideNumber === undefined || isNaN(Number(slideNumber))) {
    return res.status(400).json({ error: '`slideNumber` must be a number.' });
  }
  if (version === undefined || isNaN(Number(version)) || Number(version) < 1) {
    return res.status(400).json({ error: '`version` must be a positive integer.' });
  }
  if (!data || typeof data !== 'string') {
    return res.status(400).json({ error: '`data` is required and must be a base64 string.' });
  }

  // ── Strip data URI prefix if present ─────────────────────────────────────
  let rawBase64 = data;
  let detectedMediaType: SupportedMediaType | undefined;

  const dataUriMatch = rawBase64.match(/^data:([^;]+);base64,(.+)$/s);
  if (dataUriMatch) {
    detectedMediaType = dataUriMatch[1] as SupportedMediaType;
    rawBase64 = dataUriMatch[2];
  }

  const mediaType: SupportedMediaType =
    (explicitMediaType as SupportedMediaType) ?? detectedMediaType ?? 'image/png';

  if (!SUPPORTED_MEDIA_TYPES.includes(mediaType)) {
    return res.status(400).json({
      error: `Unsupported media type "${mediaType}". Supported: ${SUPPORTED_MEDIA_TYPES.join(', ')}`,
    });
  }

  if (rawBase64.length > MAX_BASE64_LENGTH) {
    return res.status(413).json({ error: 'Image too large. Maximum is 10MB.' });
  }

  let imageBuffer: Buffer;
  try {
    imageBuffer = Buffer.from(rawBase64, 'base64');
  } catch {
    return res.status(400).json({ error: 'Invalid base64 encoding.' });
  }

  const sn = Number(slideNumber);
  const vn = Number(version);
  const ext = EXTENSIONS[mediaType];
  const pathname = imagePath(presentationId, sn, vn, ext);

  console.log(
    `[upload-slide-image] ⬆️  Uploading slide ${sn} v${vn} ` +
    `(${(imageBuffer.length / 1024).toFixed(1)} KB, ${mediaType}) → ${pathname}`,
  );

  try {
    const blob = await put(pathname, imageBuffer, {
      access: 'public',
      contentType: mediaType,
    });

    console.log(`[upload-slide-image] ✅ Stored at: ${blob.url}`);

    return res.status(200).json({
      presentationId,
      slideNumber: sn,
      version: vn,
      imageUrl: blob.url,
      sizeBytes: imageBuffer.length,
      mediaType,
      uploadedAt: blob.uploadedAt,
    });

  } catch (err: any) {
    console.error('[upload-slide-image] PUT error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
