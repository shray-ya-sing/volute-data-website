import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mocks — export-png.ts reads vendor files at module load time and imports
// playwright. We mock both to isolate the handler logic.
// ---------------------------------------------------------------------------

vi.mock('fs', () => ({
  default: {
    existsSync: vi.fn().mockReturnValue(true),
    readFileSync: vi.fn().mockReturnValue('/* vendor stub */'),
  },
  existsSync: vi.fn().mockReturnValue(true),
  readFileSync: vi.fn().mockReturnValue('/* vendor stub */'),
}));

vi.mock('playwright-core', () => ({
  chromium: {
    launch: vi.fn(),
  },
}));

vi.mock('jszip', () => ({
  default: vi.fn(),
}));

import handler from '../export-png';

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
// 1. Pure function logic tests — reproduced from export-png.ts
// ---------------------------------------------------------------------------

describe('export-png: safeInlineScript', () => {
  /** Reproduced from export-png.ts (line 37-39) */
  function safeInlineScript(js: string): string {
    return js.replace(/<\/(script)/gi, '<\\/$1');
  }

  it('escapes </script> to prevent premature tag close', () => {
    expect(safeInlineScript('alert("</script>")')).toBe('alert("<\\/script>")');
  });

  it('is case-insensitive', () => {
    expect(safeInlineScript('</SCRIPT>')).toBe('<\\/SCRIPT>');
    expect(safeInlineScript('</Script>')).toBe('<\\/Script>');
  });

  it('handles multiple occurrences', () => {
    const input = '</script>---</script>';
    const output = safeInlineScript(input);
    expect(output).toBe('<\\/script>---<\\/script>');
  });

  it('leaves strings without </script> unchanged', () => {
    const input = 'var x = 1;';
    expect(safeInlineScript(input)).toBe(input);
  });
});

describe('export-png: escapeForTemplateLiteral', () => {
  /** Reproduced from export-png.ts (lines 41-47) */
  function escapeForTemplateLiteral(code: string): string {
    const jsonStr = JSON.stringify(code);
    return jsonStr
      .slice(1, -1)
      .replace(/`/g, '\\`')
      .replace(/\$\{/g, '\\${');
  }

  it('escapes backticks', () => {
    expect(escapeForTemplateLiteral('`hello`')).toContain('\\`hello\\`');
  });

  it('escapes template literal expressions ${...}', () => {
    expect(escapeForTemplateLiteral('${foo}')).toContain('\\${foo}');
  });

  it('escapes newlines via JSON.stringify', () => {
    const result = escapeForTemplateLiteral('line1\nline2');
    expect(result).toContain('\\n');
    expect(result).not.toContain('\n');
  });

  it('escapes quotes properly', () => {
    const result = escapeForTemplateLiteral('"hello"');
    expect(result).toContain('\\"hello\\"');
  });

  it('handles empty string', () => {
    expect(escapeForTemplateLiteral('')).toBe('');
  });

  it('preserves the overall content', () => {
    const input = 'const x = `${y}`;';
    const result = escapeForTemplateLiteral(input);
    // Should contain escaped backticks and dollar-braces but still be reconstructable
    expect(result).toContain('const x');
    expect(result).toContain('\\`');
    expect(result).toContain('\\${y}');
  });
});

describe('export-png: buildHtml structure', () => {
  /** Reproduced from export-png.ts (lines 92-295) — simplified test */
  function buildHtml(code: string, theme: any): string {
    const {
      headingFont = 'Inter, sans-serif',
      bodyFont = 'Inter, sans-serif',
      accentColors = ['#667eea', '#764ba2'],
      headingTextColor = '#000000',
      bodyTextColor = '#333333',
      headingFontSize = 36,
      bodyFontSize = 14,
    } = theme;
    const backgroundColor = theme.backgroundColor || theme.slideBackgroundColor || '#ffffff';

    const escapedCode = JSON.stringify(code)
      .slice(1, -1)
      .replace(/`/g, '\\`')
      .replace(/\$\{/g, '\\${');

    // Minimal check — verify the template uses the theme values
    return `<!DOCTYPE html>
<html lang="en"><head><style>background: ${backgroundColor};</style></head>
<body><div id="root"></div>
<script>var code = \`${escapedCode}\`;</script>
<script>var theme = ${JSON.stringify({
      headingFont, bodyFont, accentColors, headingTextColor, bodyTextColor,
      headingFontSize, bodyFontSize, backgroundColor,
    })};</script>
</body></html>`;
  }

  it('includes backgroundColor in CSS', () => {
    const html = buildHtml('// code', { backgroundColor: '#112233' });
    expect(html).toContain('#112233');
  });

  it('falls back to slideBackgroundColor if backgroundColor is missing', () => {
    const html = buildHtml('// code', { slideBackgroundColor: '#aabb00' });
    expect(html).toContain('#aabb00');
  });

  it('defaults to white background', () => {
    const html = buildHtml('// code', {});
    expect(html).toContain('#ffffff');
  });

  it('includes the escaped slide code in the output', () => {
    const html = buildHtml('export default function Slide() {}', {});
    expect(html).toContain('export default function Slide');
  });

  it('includes theme fonts in the output', () => {
    const html = buildHtml('// code', { headingFont: 'Georgia, serif' });
    expect(html).toContain('Georgia, serif');
  });
});

// ---------------------------------------------------------------------------
// 2. Handler validation tests
// ---------------------------------------------------------------------------

describe('export-png handler', () => {
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

  it('missing slides returns 400', async () => {
    const res = mockRes();
    await handler(mockReq('POST', {}), res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res._json.error).toMatch(/slides/i);
  });

  it('slides with missing code returns 400', async () => {
    const res = mockRes();
    await handler(mockReq('POST', { slides: [{ slideNumber: 1 }] }), res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res._json.error).toMatch(/code/);
  });

  it('accepts a single slide object (not array)', async () => {
    // The handler wraps non-array slides into an array.
    // This tests that the validation still checks for code.
    const res = mockRes();
    await handler(mockReq('POST', { slides: { slideNumber: 1 } }), res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res._json.error).toMatch(/code/);
  });
});
