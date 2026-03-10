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

// Max code size: 512KB — a 27k char TSX file is ~27KB, so this is very generous
const MAX_CODE_LENGTH = 512 * 1024;

// ---------------------------------------------------------------------------
// Path helpers
// ---------------------------------------------------------------------------

// code_store/{presentationId}/slide_{n}_v{version}.tsx
function codePath(presentationId: string, slideNumber: number, version: number): string {
  return `code_store/${presentationId}/slide_${slideNumber}_v${version}.tsx`;
}

// Prefix for listing all versions of a specific slide
function slidePrefix(presentationId: string, slideNumber: number): string {
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

  // ── GET /api/upload-code — fetch latest (or specific) version of slide code ──
  // Query params: presentationId, slideNumber, version? (omit for latest)
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
      // If a specific version requested, fetch it directly
      if (version && !isNaN(Number(version))) {
        const path = codePath(presentationId, sn, Number(version));
        const { blobs } = await list({ prefix: path });
        if (blobs.length === 0) {
          return res.status(404).json({ error: `Slide ${sn} v${version} not found.` });
        }
        const blob = blobs[0];
        const text = await fetch(blob.url).then(r => r.text());
        return res.status(200).json({
          presentationId,
          slideNumber: sn,
          version: Number(version),
          code: text,
          blobUrl: blob.url,
          uploadedAt: blob.uploadedAt,
        });
      }

      // Otherwise, list all versions and return the highest
      const { blobs } = await list({ prefix: slidePrefix(presentationId, sn) });
      if (blobs.length === 0) {
        return res.status(404).json({ error: `No versions found for slide ${sn}.` });
      }

      // Parse version numbers from filenames and find the max
      const versioned = blobs
        .map(b => {
          const match = b.pathname.match(/_v(\d+)\.tsx$/);
          return match ? { blob: b, version: Number(match[1]) } : null;
        })
        .filter(Boolean) as { blob: typeof blobs[0]; version: number }[];

      versioned.sort((a, b) => b.version - a.version);
      const latest = versioned[0];
      const text = await fetch(latest.blob.url).then(r => r.text());

      return res.status(200).json({
        presentationId,
        slideNumber: sn,
        version: latest.version,
        code: text,
        blobUrl: latest.blob.url,
        uploadedAt: latest.blob.uploadedAt,
        totalVersions: versioned.length,
      });

    } catch (err: any) {
      console.error('[upload-code] GET error:', err.message);
      return res.status(500).json({ error: err.message });
    }
  }

  // ── DELETE /api/upload-code — delete a specific blob by URL ──────────────
  if (req.method === 'DELETE') {
    const { blobUrl } = req.body ?? {};

    if (!blobUrl || typeof blobUrl !== 'string') {
      return res.status(400).json({ error: '`blobUrl` is required for deletion.' });
    }

    try {
      await del(blobUrl);
      console.log(`[upload-code] 🗑  Deleted: ${blobUrl}`);
      return res.status(200).json({ deleted: true });
    } catch (err: any) {
      console.error('[upload-code] DELETE error:', err.message);
      return res.status(500).json({ error: err.message });
    }
  }

  // ── POST /api/upload-code — store a slide's TSX code ─────────────────────
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { presentationId, slideNumber, version, code } = req.body ?? {};

  if (!presentationId || typeof presentationId !== 'string') {
    return res.status(400).json({ error: '`presentationId` is required.' });
  }
  if (slideNumber === undefined || isNaN(Number(slideNumber))) {
    return res.status(400).json({ error: '`slideNumber` must be a number.' });
  }
  if (version === undefined || isNaN(Number(version)) || Number(version) < 1) {
    return res.status(400).json({ error: '`version` must be a positive integer.' });
  }
  if (!code || typeof code !== 'string') {
    return res.status(400).json({ error: '`code` is required and must be a string.' });
  }
  if (code.length > MAX_CODE_LENGTH) {
    return res.status(413).json({ error: 'Code too large. Maximum is 512KB.' });
  }

  const sn = Number(slideNumber);
  const vn = Number(version);
  const pathname = codePath(presentationId, sn, vn);

  console.log(
    `[upload-code] ⬆️  Uploading slide ${sn} v${vn} ` +
    `(${code.length} chars) → ${pathname}`,
  );

  try {
    const blob = await put(pathname, code, {
      access: 'public',
      contentType: 'text/plain',
      allowOverwrite: true,
    });

    console.log(`[upload-code] ✅ Stored at: ${blob.url}`);

    return res.status(200).json({
      presentationId,
      slideNumber: sn,
      version: vn,
      blobUrl: blob.url,
      codeLength: code.length
    });

  } catch (err: any) {
    console.error('[upload-code] PUT error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
