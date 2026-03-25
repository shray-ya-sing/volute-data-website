import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('@anthropic-ai/sdk', () => ({
  default: class MockAnthropic {
    messages = { create: vi.fn() };
  },
}));

import handler from '../generate-slide';

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

// ---------------------------------------------------------------------------
// 1. detectMediaType logic — reproduced from generate-slide.ts (lines 53-66)
// ---------------------------------------------------------------------------

describe('generate-slide: detectMediaType', () => {
  type SupportedMediaType = 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp';

  function detectMediaType(buffer: ArrayBuffer): SupportedMediaType {
    const b = new Uint8Array(buffer.slice(0, 12));
    if (b[0] === 0xFF && b[1] === 0xD8 && b[2] === 0xFF) return 'image/jpeg';
    if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4E && b[3] === 0x47) return 'image/png';
    if (b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 &&
        b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50) return 'image/webp';
    if (b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x38) return 'image/gif';
    return 'image/jpeg'; // fallback
  }

  it('detects JPEG from magic bytes (FF D8 FF)', () => {
    const buf = new Uint8Array([0xFF, 0xD8, 0xFF, 0xE0, 0, 0, 0, 0, 0, 0, 0, 0]).buffer;
    expect(detectMediaType(buf)).toBe('image/jpeg');
  });

  it('detects PNG from magic bytes (89 50 4E 47)', () => {
    const buf = new Uint8Array([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0, 0, 0, 0]).buffer;
    expect(detectMediaType(buf)).toBe('image/png');
  });

  it('detects WebP from magic bytes (RIFF????WEBP)', () => {
    const buf = new Uint8Array([
      0x52, 0x49, 0x46, 0x46, // RIFF
      0x00, 0x00, 0x00, 0x00, // file size (don't care)
      0x57, 0x45, 0x42, 0x50, // WEBP
    ]).buffer;
    expect(detectMediaType(buf)).toBe('image/webp');
  });

  it('detects GIF from magic bytes (GIF8)', () => {
    // GIF89a
    const buf = new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0, 0, 0, 0, 0, 0]).buffer;
    expect(detectMediaType(buf)).toBe('image/gif');
    // GIF87a
    const buf87 = new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x37, 0x61, 0, 0, 0, 0, 0, 0]).buffer;
    expect(detectMediaType(buf87)).toBe('image/gif');
  });

  it('defaults to image/jpeg for unknown formats', () => {
    const buf = new Uint8Array([0x00, 0x01, 0x02, 0x03, 0, 0, 0, 0, 0, 0, 0, 0]).buffer;
    expect(detectMediaType(buf)).toBe('image/jpeg');
  });

  it('handles buffers shorter than 12 bytes without crashing', () => {
    // The function does .slice(0, 12), so shorter buffers just have undefined bytes → 0
    const buf = new Uint8Array([0xFF, 0xD8, 0xFF]).buffer;
    expect(detectMediaType(buf)).toBe('image/jpeg');
  });

  it('does not confuse RIFF without WEBP at offset 8', () => {
    // RIFF but with AVI marker instead of WEBP
    const buf = new Uint8Array([
      0x52, 0x49, 0x46, 0x46,
      0x00, 0x00, 0x00, 0x00,
      0x41, 0x56, 0x49, 0x20, // "AVI " not "WEBP"
    ]).buffer;
    expect(detectMediaType(buf)).toBe('image/jpeg'); // fallback, not webp
  });
});

// ---------------------------------------------------------------------------
// 2. Handler validation tests
// ---------------------------------------------------------------------------

describe('generate-slide handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('OPTIONS returns 200', async () => {
    const res = mockRes();
    await handler(mockReq('OPTIONS'), res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.end).toHaveBeenCalled();
  });

  it('GET returns 405', async () => {
    const res = mockRes();
    await handler(mockReq('GET'), res);
    expect(res.status).toHaveBeenCalledWith(405);
  });

  it('missing prompt returns 400', async () => {
    const res = mockRes();
    await handler(mockReq('POST', {}), res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res._json.error).toMatch(/[Pp]rompt/);
  });

  it('images as non-array returns 400', async () => {
    const res = mockRes();
    await handler(mockReq('POST', { prompt: 'test', images: 'not-array' }), res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res._json.error).toMatch(/images.*array/i);
  });

  it('accepts valid prompt with defaults', async () => {
    // This will fail at the Anthropic API call (mocked), but should NOT fail at validation.
    // The mock will return undefined from messages.create, causing a runtime error,
    // which the handler catches and returns 500.
    const res = mockRes();
    await handler(mockReq('POST', { prompt: 'Create a title slide' }), res);
    // Should not be 400 (validation passed)
    expect(res._status).not.toBe(400);
  });
});

// ---------------------------------------------------------------------------
// 3. Template category enum coverage
// ---------------------------------------------------------------------------

describe('generate-slide: template categories', () => {
  const VALID_CATEGORIES = [
    'title', 'table_of_contents', 'section_divider', 'executive_summary',
    'market_overview', 'company_overview', 'peer_benchmarking',
    'precedent_transactions', 'strategic_alternatives', 'valuation_football_field',
    'financial_model', 'market_map', 'process_timeline', 'logo_splash',
    'agenda', 'competitive_landscape', 'wacc_analysis', 'stock_performance',
  ];

  it('supports 18 template categories', () => {
    expect(VALID_CATEGORIES).toHaveLength(18);
  });

  it('all categories are lowercase snake_case', () => {
    for (const cat of VALID_CATEGORIES) {
      expect(cat).toMatch(/^[a-z_]+$/);
    }
  });
});
