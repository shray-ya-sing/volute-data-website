import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('@vercel/blob', () => ({
  put: vi.fn(),
  del: vi.fn(),
}));

import handler from '../upload-image';
import { put, del } from '@vercel/blob';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mockReq(method: string, body?: any): any {
  return { method, headers: { 'content-type': 'application/json' }, body: body ?? {}, query: {} };
}

function mockRes(): any {
  const res: any = {
    _status: 200,
    _json: null as any,
    _headers: {} as Record<string, string>,
    setHeader: vi.fn().mockImplementation((_k: string, _v: string) => res),
    status: vi.fn().mockImplementation((code: number) => { res._status = code; return res; }),
    json: vi.fn().mockImplementation((data: any) => { res._json = data; return res; }),
    end: vi.fn().mockReturnValue(undefined),
    send: vi.fn().mockReturnValue(undefined),
  };
  return res;
}

// A tiny valid PNG in base64 (1x1 transparent pixel)
const TINY_PNG_B64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('upload-image handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── OPTIONS ──────────────────────────────────────────────────────────────
  it('OPTIONS returns 200', async () => {
    const res = mockRes();
    await handler(mockReq('OPTIONS'), res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.end).toHaveBeenCalled();
  });

  // ── Unsupported method ───────────────────────────────────────────────────
  it('GET returns 405', async () => {
    const res = mockRes();
    await handler(mockReq('GET'), res);
    expect(res.status).toHaveBeenCalledWith(405);
  });

  it('PATCH returns 405', async () => {
    const res = mockRes();
    await handler(mockReq('PATCH'), res);
    expect(res.status).toHaveBeenCalledWith(405);
  });

  // ── DELETE ───────────────────────────────────────────────────────────────
  describe('DELETE', () => {
    it('missing blobUrl returns 400', async () => {
      const res = mockRes();
      await handler(mockReq('DELETE', {}), res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res._json.error).toMatch(/blobUrl/);
    });

    it('non-string blobUrl returns 400', async () => {
      const res = mockRes();
      await handler(mockReq('DELETE', { blobUrl: 42 }), res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('successful delete returns 200', async () => {
      vi.mocked(del).mockResolvedValueOnce(undefined as any);
      const res = mockRes();
      await handler(mockReq('DELETE', { blobUrl: 'https://blob/img' }), res);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res._json.deleted).toBe(true);
    });

    it('blob delete error returns 500', async () => {
      vi.mocked(del).mockRejectedValueOnce(new Error('blob network error'));
      const res = mockRes();
      await handler(mockReq('DELETE', { blobUrl: 'https://blob/img' }), res);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res._json.error).toMatch(/blob network error/);
    });
  });

  // ── POST validation ──────────────────────────────────────────────────────
  describe('POST', () => {
    it('missing data returns 400', async () => {
      const res = mockRes();
      await handler(mockReq('POST', {}), res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res._json.error).toMatch(/data/);
    });

    it('non-string data returns 400', async () => {
      const res = mockRes();
      await handler(mockReq('POST', { data: 123 }), res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('unsupported media type returns 400', async () => {
      const res = mockRes();
      await handler(mockReq('POST', { data: TINY_PNG_B64, mediaType: 'image/bmp' }), res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res._json.error).toMatch(/Unsupported media type/);
    });

    it('data exceeding max base64 length returns 413', async () => {
      const hugeData = 'A'.repeat(Math.ceil(10 * 1024 * 1024 * 1.37) + 1);
      const res = mockRes();
      await handler(mockReq('POST', { data: hugeData, mediaType: 'image/png' }), res);
      expect(res.status).toHaveBeenCalledWith(413);
    });

    it('strips data URI prefix and detects media type', async () => {
      vi.mocked(put).mockResolvedValueOnce({ url: 'https://blob/img' } as any);
      const dataUri = `data:image/jpeg;base64,${TINY_PNG_B64}`;
      const res = mockRes();
      await handler(mockReq('POST', { data: dataUri }), res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res._json.mediaType).toBe('image/jpeg');
    });

    it('explicit mediaType takes precedence over detected type', async () => {
      vi.mocked(put).mockResolvedValueOnce({ url: 'https://blob/img' } as any);
      const dataUri = `data:image/jpeg;base64,${TINY_PNG_B64}`;
      const res = mockRes();
      await handler(mockReq('POST', { data: dataUri, mediaType: 'image/webp' }), res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res._json.mediaType).toBe('image/webp');
    });

    it('defaults to image/png when no media type is provided', async () => {
      vi.mocked(put).mockResolvedValueOnce({ url: 'https://blob/img' } as any);
      const res = mockRes();
      await handler(mockReq('POST', { data: TINY_PNG_B64 }), res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res._json.mediaType).toBe('image/png');
    });

    it('successful upload returns blobId, blobUrl, mediaType, sizeBytes', async () => {
      vi.mocked(put).mockResolvedValueOnce({ url: 'https://blob/img123' } as any);
      const res = mockRes();
      await handler(mockReq('POST', { data: TINY_PNG_B64, mediaType: 'image/png' }), res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res._json.blobId).toBeDefined();
      expect(typeof res._json.blobId).toBe('string');
      expect(res._json.blobUrl).toBe('https://blob/img123');
      expect(res._json.mediaType).toBe('image/png');
      expect(res._json.sizeBytes).toBeGreaterThan(0);
    });

    it('blob put error returns 500', async () => {
      vi.mocked(put).mockRejectedValueOnce(new Error('storage failure'));
      const res = mockRes();
      await handler(mockReq('POST', { data: TINY_PNG_B64, mediaType: 'image/png' }), res);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res._json.error).toMatch(/storage failure/);
    });
  });
});

// ---------------------------------------------------------------------------
// Logic tests — MAX_BASE64_LENGTH calculation
// ---------------------------------------------------------------------------

describe('upload-image: size limit constant', () => {
  it('MAX_BASE64_LENGTH allows ~10MB raw images (base64 inflated)', () => {
    // The source defines: const MAX_BASE64_LENGTH = 10 * 1024 * 1024 * 1.37;
    const MAX_BASE64_LENGTH = 10 * 1024 * 1024 * 1.37;
    // A 10MB raw file base64-encoded is ~13.33MB, which should be under the limit
    const tenMbBase64 = (10 * 1024 * 1024 * 4) / 3; // base64 is 4/3 of raw
    expect(MAX_BASE64_LENGTH).toBeGreaterThan(tenMbBase64);
  });
});
