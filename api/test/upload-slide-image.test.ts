import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('@vercel/blob', () => ({
  put: vi.fn(),
  del: vi.fn(),
  list: vi.fn(),
}));

import handler from '../upload-slide-image';
import { put, del, list } from '@vercel/blob';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mockReq(method: string, body?: any, query?: Record<string, any>): any {
  return { method, headers: { 'content-type': 'application/json' }, body: body ?? {}, query: query ?? {} };
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

const TINY_PNG_B64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

// ---------------------------------------------------------------------------
// 1. Internal path helper logic (reproduced — not exported)
// ---------------------------------------------------------------------------

describe('upload-slide-image: path helper logic', () => {
  function imagePath(presentationId: string, slideNumber: number, version: number, ext: string): string {
    return `code_store/${presentationId}/slide_${slideNumber}_v${version}.${ext}`;
  }

  function slideImagePrefix(presentationId: string, slideNumber: number): string {
    return `code_store/${presentationId}/slide_${slideNumber}_v`;
  }

  it('imagePath produces correct blob path', () => {
    expect(imagePath('pres-1', 3, 2, 'png')).toBe('code_store/pres-1/slide_3_v2.png');
  });

  it('imagePath uses the correct extension for different types', () => {
    expect(imagePath('p1', 1, 1, 'jpg')).toMatch(/\.jpg$/);
    expect(imagePath('p1', 1, 1, 'webp')).toMatch(/\.webp$/);
  });

  it('slideImagePrefix shares prefix with code files — could match .tsx blobs', () => {
    // This prefix is the same used by upload-code.ts.
    // The handler filters by image extension, but an overly broad list()
    // call will return both .tsx and .png blobs.
    const prefix = slideImagePrefix('pres-1', 1);
    expect(prefix).toBe('code_store/pres-1/slide_1_v');
    // A code blob 'code_store/pres-1/slide_1_v2.tsx' also starts with this prefix
    expect('code_store/pres-1/slide_1_v2.tsx'.startsWith(prefix)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 2. Handler tests
// ---------------------------------------------------------------------------

describe('upload-slide-image handler', () => {
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
  it('PATCH returns 405', async () => {
    const res = mockRes();
    await handler(mockReq('PATCH'), res);
    expect(res.status).toHaveBeenCalledWith(405);
  });

  // ── GET validation ───────────────────────────────────────────────────────
  describe('GET', () => {
    it('missing presentationId returns 400', async () => {
      const res = mockRes();
      await handler(mockReq('GET', {}, {}), res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res._json.error).toMatch(/presentationId/);
    });

    it('missing slideNumber returns 400', async () => {
      const res = mockRes();
      await handler(mockReq('GET', {}, { presentationId: 'p1' }), res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res._json.error).toMatch(/slideNumber/);
    });

    it('returns 404 when no image blobs found', async () => {
      vi.mocked(list).mockResolvedValueOnce({ blobs: [], cursor: undefined, hasMore: false, folders: [] } as any);
      const res = mockRes();
      await handler(mockReq('GET', {}, { presentationId: 'p1', slideNumber: '1' }), res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('filters out .tsx blobs and returns latest image version', async () => {
      const blobs = [
        { pathname: 'code_store/p1/slide_1_v1.tsx', url: 'https://blob/tsx1' },
        { pathname: 'code_store/p1/slide_1_v1.png', url: 'https://blob/png1', uploadedAt: '2024-01-01' },
        { pathname: 'code_store/p1/slide_1_v2.png', url: 'https://blob/png2', uploadedAt: '2024-01-02' },
      ];
      vi.mocked(list).mockResolvedValueOnce({ blobs, cursor: undefined, hasMore: false, folders: [] } as any);
      const res = mockRes();
      await handler(mockReq('GET', {}, { presentationId: 'p1', slideNumber: '1' }), res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res._json.version).toBe(2);
      expect(res._json.imageUrl).toBe('https://blob/png2');
    });
  });

  // ── DELETE validation ────────────────────────────────────────────────────
  describe('DELETE', () => {
    it('missing blobUrl returns 400', async () => {
      const res = mockRes();
      await handler(mockReq('DELETE', {}), res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('successful delete returns 200', async () => {
      vi.mocked(del).mockResolvedValueOnce(undefined as any);
      const res = mockRes();
      await handler(mockReq('DELETE', { blobUrl: 'https://blob/img' }), res);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res._json.deleted).toBe(true);
    });
  });

  // ── POST validation ──────────────────────────────────────────────────────
  describe('POST', () => {
    it('missing presentationId returns 400', async () => {
      const res = mockRes();
      await handler(mockReq('POST', { slideNumber: 1, version: 1, data: TINY_PNG_B64 }), res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res._json.error).toMatch(/presentationId/);
    });

    it('missing slideNumber returns 400', async () => {
      const res = mockRes();
      await handler(mockReq('POST', { presentationId: 'p1', version: 1, data: TINY_PNG_B64 }), res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('missing version returns 400', async () => {
      const res = mockRes();
      await handler(mockReq('POST', { presentationId: 'p1', slideNumber: 1, data: TINY_PNG_B64 }), res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('version 0 returns 400', async () => {
      const res = mockRes();
      await handler(mockReq('POST', { presentationId: 'p1', slideNumber: 1, version: 0, data: TINY_PNG_B64 }), res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('missing data returns 400', async () => {
      const res = mockRes();
      await handler(mockReq('POST', { presentationId: 'p1', slideNumber: 1, version: 1 }), res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res._json.error).toMatch(/data/);
    });

    it('unsupported media type returns 400', async () => {
      const res = mockRes();
      await handler(mockReq('POST', {
        presentationId: 'p1', slideNumber: 1, version: 1,
        data: TINY_PNG_B64, mediaType: 'image/gif', // gif not in upload-slide-image's supported list
      }), res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res._json.error).toMatch(/Unsupported media type/);
    });

    it('data too large returns 413', async () => {
      const hugeData = 'A'.repeat(Math.ceil(10 * 1024 * 1024 * 1.37) + 1);
      const res = mockRes();
      await handler(mockReq('POST', {
        presentationId: 'p1', slideNumber: 1, version: 1, data: hugeData,
      }), res);
      expect(res.status).toHaveBeenCalledWith(413);
    });

    it('strips data URI prefix correctly', async () => {
      vi.mocked(put).mockResolvedValueOnce({ url: 'https://blob/img' } as any);
      const dataUri = `data:image/png;base64,${TINY_PNG_B64}`;
      const res = mockRes();
      await handler(mockReq('POST', {
        presentationId: 'p1', slideNumber: 1, version: 1, data: dataUri,
      }), res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res._json.mediaType).toBe('image/png');
    });

    it('successful upload returns correct metadata', async () => {
      vi.mocked(put).mockResolvedValueOnce({ url: 'https://blob/slide-img' } as any);
      const res = mockRes();
      await handler(mockReq('POST', {
        presentationId: 'p1', slideNumber: 2, version: 3,
        data: TINY_PNG_B64, mediaType: 'image/png',
      }), res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res._json.presentationId).toBe('p1');
      expect(res._json.slideNumber).toBe(2);
      expect(res._json.version).toBe(3);
      expect(res._json.imageUrl).toBe('https://blob/slide-img');
      expect(res._json.sizeBytes).toBeGreaterThan(0);
      expect(put).toHaveBeenCalledWith(
        'code_store/p1/slide_2_v3.png',
        expect.any(Buffer),
        expect.objectContaining({ access: 'public', contentType: 'image/png' }),
      );
    });
  });
});
