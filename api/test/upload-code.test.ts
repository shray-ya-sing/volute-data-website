import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mocks — hoisted before module import
// ---------------------------------------------------------------------------

vi.mock('@vercel/blob', () => ({
  put: vi.fn(),
  del: vi.fn(),
  list: vi.fn(),
}));

import handler from '../upload-code';
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

// ---------------------------------------------------------------------------
// 1. Internal logic — codePath / slidePrefix
//    (Reproduced here because they are not exported)
// ---------------------------------------------------------------------------

describe('upload-code: path helper logic', () => {
  function codePath(presentationId: string, slideNumber: number, version: number): string {
    return `code_store/${presentationId}/slide_${slideNumber}_v${version}.tsx`;
  }

  function slidePrefix(presentationId: string, slideNumber: number): string {
    return `code_store/${presentationId}/slide_${slideNumber}_v`;
  }

  it('codePath produces the correct blob path', () => {
    expect(codePath('abc-123', 2, 3)).toBe('code_store/abc-123/slide_2_v3.tsx');
  });

  it('slidePrefix produces the correct listing prefix', () => {
    expect(slidePrefix('abc-123', 2)).toBe('code_store/abc-123/slide_2_v');
  });

  it('codePath does not sanitize directory-traversal characters', () => {
    // Potential security issue: presentationId is used unsanitized in the path
    const path = codePath('../../etc', 1, 1);
    expect(path).toContain('../../etc');
  });
});

// ---------------------------------------------------------------------------
// 2. Handler tests
// ---------------------------------------------------------------------------

describe('upload-code handler', () => {
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
    expect(res._json.error).toMatch(/not allowed/i);
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

    it('non-numeric slideNumber returns 400', async () => {
      const res = mockRes();
      await handler(mockReq('GET', {}, { presentationId: 'p1', slideNumber: 'abc' }), res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res._json.error).toMatch(/slideNumber/);
    });

    it('returns 404 when no blobs found for latest version', async () => {
      vi.mocked(list).mockResolvedValueOnce({ blobs: [], cursor: undefined, hasMore: false, folders: [] } as any);
      const res = mockRes();
      await handler(mockReq('GET', {}, { presentationId: 'p1', slideNumber: '1' }), res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('returns latest version when multiple exist', async () => {
      const blobs = [
        { pathname: 'code_store/p1/slide_1_v1.tsx', url: 'https://blob/v1', uploadedAt: '2024-01-01' },
        { pathname: 'code_store/p1/slide_1_v3.tsx', url: 'https://blob/v3', uploadedAt: '2024-01-03' },
        { pathname: 'code_store/p1/slide_1_v2.tsx', url: 'https://blob/v2', uploadedAt: '2024-01-02' },
      ];
      vi.mocked(list).mockResolvedValueOnce({ blobs, cursor: undefined, hasMore: false, folders: [] } as any);
      // Mock fetch for reading the blob text
      globalThis.fetch = vi.fn().mockResolvedValueOnce({ text: () => Promise.resolve('// slide code v3') } as any);

      const res = mockRes();
      await handler(mockReq('GET', {}, { presentationId: 'p1', slideNumber: '1' }), res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res._json.version).toBe(3);
      expect(res._json.code).toBe('// slide code v3');
    });

    it('returns specific version when requested', async () => {
      const blobs = [
        { pathname: 'code_store/p1/slide_1_v2.tsx', url: 'https://blob/v2', uploadedAt: '2024-01-02' },
      ];
      vi.mocked(list).mockResolvedValueOnce({ blobs, cursor: undefined, hasMore: false, folders: [] } as any);
      globalThis.fetch = vi.fn().mockResolvedValueOnce({ text: () => Promise.resolve('// v2') } as any);

      const res = mockRes();
      await handler(mockReq('GET', {}, { presentationId: 'p1', slideNumber: '1', version: '2' }), res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res._json.version).toBe(2);
    });
  });

  // ── DELETE validation ────────────────────────────────────────────────────
  describe('DELETE', () => {
    it('missing blobUrl returns 400', async () => {
      const res = mockRes();
      await handler(mockReq('DELETE', {}), res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res._json.error).toMatch(/blobUrl/);
    });

    it('non-string blobUrl returns 400', async () => {
      const res = mockRes();
      await handler(mockReq('DELETE', { blobUrl: 123 }), res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('successful delete returns 200', async () => {
      vi.mocked(del).mockResolvedValueOnce(undefined as any);
      const res = mockRes();
      await handler(mockReq('DELETE', { blobUrl: 'https://blob/v1' }), res);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res._json.deleted).toBe(true);
    });
  });

  // ── POST validation ──────────────────────────────────────────────────────
  describe('POST', () => {
    it('missing presentationId returns 400', async () => {
      const res = mockRes();
      await handler(mockReq('POST', { slideNumber: 1, version: 1, code: 'x' }), res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res._json.error).toMatch(/presentationId/);
    });

    it('missing slideNumber returns 400', async () => {
      const res = mockRes();
      await handler(mockReq('POST', { presentationId: 'p1', version: 1, code: 'x' }), res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res._json.error).toMatch(/slideNumber/);
    });

    it('non-numeric slideNumber returns 400', async () => {
      const res = mockRes();
      await handler(mockReq('POST', { presentationId: 'p1', slideNumber: 'abc', version: 1, code: 'x' }), res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('missing version returns 400', async () => {
      const res = mockRes();
      await handler(mockReq('POST', { presentationId: 'p1', slideNumber: 1, code: 'x' }), res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res._json.error).toMatch(/version/);
    });

    it('version 0 returns 400 (must be >= 1)', async () => {
      const res = mockRes();
      await handler(mockReq('POST', { presentationId: 'p1', slideNumber: 1, version: 0, code: 'x' }), res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('negative version returns 400', async () => {
      const res = mockRes();
      await handler(mockReq('POST', { presentationId: 'p1', slideNumber: 1, version: -1, code: 'x' }), res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('missing code returns 400', async () => {
      const res = mockRes();
      await handler(mockReq('POST', { presentationId: 'p1', slideNumber: 1, version: 1 }), res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res._json.error).toMatch(/code/);
    });

    it('non-string code returns 400', async () => {
      const res = mockRes();
      await handler(mockReq('POST', { presentationId: 'p1', slideNumber: 1, version: 1, code: 123 }), res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('code exceeding 512KB returns 413', async () => {
      const bigCode = 'x'.repeat(512 * 1024 + 1);
      const res = mockRes();
      await handler(mockReq('POST', { presentationId: 'p1', slideNumber: 1, version: 1, code: bigCode }), res);
      expect(res.status).toHaveBeenCalledWith(413);
    });

    it('successful POST stores code and returns metadata', async () => {
      vi.mocked(put).mockResolvedValueOnce({ url: 'https://blob/stored' } as any);
      const res = mockRes();
      await handler(mockReq('POST', {
        presentationId: 'p1',
        slideNumber: 2,
        version: 3,
        code: 'export default function Slide2() {}',
      }), res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res._json.presentationId).toBe('p1');
      expect(res._json.slideNumber).toBe(2);
      expect(res._json.version).toBe(3);
      expect(res._json.blobUrl).toBe('https://blob/stored');
      expect(put).toHaveBeenCalledWith(
        'code_store/p1/slide_2_v3.tsx',
        expect.any(String),
        expect.objectContaining({ access: 'public' }),
      );
    });
  });
});
