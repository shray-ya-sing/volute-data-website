import type { VercelRequest, VercelResponse } from '@vercel/node';
import { chromium, type Page, type BrowserContext } from 'playwright-core';
import Anthropic from '@anthropic-ai/sdk';
import { put, head } from '@vercel/blob';
import { createHash } from 'crypto';
import Browserbase from '@browserbasehq/sdk';

// ---------------------------------------------------------------------------
// Vercel config
// ---------------------------------------------------------------------------

export const config = { maxDuration: 300 };

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Credentials {
  email: string;
  password: string;
}

// Browserbase Context ID stored in Vercel Blob.
// A Context persists the full browser profile (cookies, localStorage, cache)
// server-side inside Browserbase. Each domain gets one long-lived context.
interface DomainContext {
  contextId: string;
  savedAt: number;
}

interface RequestBody {
  url: string;
  searchText: string;
}

interface ScreenshotResult {
  screenshotUrl: string;
  fromCache: boolean;
  authed: boolean;
  domain: string;
}

// ---------------------------------------------------------------------------
// Clients
// ---------------------------------------------------------------------------

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const bb = new Browserbase({ apiKey: process.env.BROWSERBASE_API_KEY! });

// ---------------------------------------------------------------------------
// Credentials — pulled from environment variables
// ---------------------------------------------------------------------------

const CREDENTIALS: Record<string, Credentials> = {
  'reuters.com':   { email: process.env.REUTERS_EMAIL!,   password: process.env.REUTERS_PASSWORD! },
  'wsj.com':       { email: process.env.WSJ_EMAIL!,        password: process.env.WSJ_PASSWORD! },
  'ft.com':        { email: process.env.FT_EMAIL!,         password: process.env.FT_PASSWORD! },
  'bloomberg.com': { email: process.env.BLOOMBERG_EMAIL!,  password: process.env.BLOOMBERG_PASSWORD! },
  'nytimes.com':   { email: process.env.NYT_EMAIL!,        password: process.env.NYT_PASSWORD! },
  'economist.com': { email: process.env.ECONOMIST_EMAIL!,  password: process.env.ECONOMIST_PASSWORD! },
};

// ---------------------------------------------------------------------------
// Per-domain deterministic login handlers
// ---------------------------------------------------------------------------

type LoginHandler = (page: Page, creds: Credentials) => Promise<void>;

const LOGIN_HANDLERS: Record<string, LoginHandler> = {
  'reuters.com': async (page, creds) => {
    await page.goto('https://www.reuters.com/account/sign-in/', {
      waitUntil: 'domcontentloaded',
      timeout: 60000,
    });
    await page.waitForTimeout(1000);
    await page.fill('#email', creds.email);
    await page.fill('#password', creds.password);
    await page.click('[data-testid="sign-in-button"]');
    await page.waitForURL(url => !url.includes('/sign-in'), { timeout: 15000 });
  },

  'wsj.com': async (page, creds) => {
    await page.goto('https://accounts.wsj.com/login', {
      waitUntil: 'domcontentloaded',
      timeout: 60000,
    });
    await page.waitForTimeout(1000);
    await page.fill('#username', creds.email);
    await page.fill('#password', creds.password);
    await page.click('.login-button');
    await page.waitForNavigation({ waitUntil: 'domcontentloaded' });
  },

  'ft.com': async (page, creds) => {
    await page.goto('https://accounts.ft.com/login', {
      waitUntil: 'domcontentloaded',
      timeout: 60000,
    });
    await page.waitForTimeout(1000);
    await page.fill('#email', creds.email);
    await page.fill('#password', creds.password);
    await page.click('[type="submit"]');
    await page.waitForNavigation({ waitUntil: 'domcontentloaded' });
  },

  'bloomberg.com': async (page, creds) => {
    // Bloomberg has persistent long-polling — networkidle never fires here
    await page.goto('https://login.bloomberg.com/', {
      waitUntil: 'domcontentloaded',
      timeout: 60000,
    });
    await page.waitForTimeout(1500);
    await page.fill('[name="email"]', creds.email);
    await page.click('[type="submit"]');
    await page.waitForTimeout(1500);
    await page.fill('[name="password"]', creds.password);
    await page.click('[type="submit"]');
    await page.waitForNavigation({ waitUntil: 'domcontentloaded' });
  },

  'nytimes.com': async (page, creds) => {
    await page.goto('https://myaccount.nytimes.com/auth/login', {
      waitUntil: 'domcontentloaded',
      timeout: 60000,
    });
    await page.waitForTimeout(1000);
    await page.fill('#email', creds.email);
    await page.click('[data-testid="submit-email-button"]');
    await page.waitForTimeout(1200);
    await page.fill('[name="password"]', creds.password);
    await page.click('[data-testid="login-button"]');
    await page.waitForNavigation({ waitUntil: 'domcontentloaded' });
  },

  'economist.com': async (page, creds) => {
    await page.goto('https://www.economist.com/api/auth/login', {
      waitUntil: 'domcontentloaded',
      timeout: 60000,
    });
    await page.waitForTimeout(1000);
    await page.fill('[name="email"]', creds.email);
    await page.fill('[name="password"]', creds.password);
    await page.click('[type="submit"]');
    await page.waitForNavigation({ waitUntil: 'domcontentloaded' });
  },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function sha256(input: string): string {
  return createHash('sha256').update(input).digest('hex');
}

function normalizeDomain(hostname: string): string {
  return hostname.replace(/^www\./, '');
}

// ---------------------------------------------------------------------------
// Browserbase Context persistence — Vercel Blob
//
// Contexts persist the full browser profile server-side in Browserbase.
// We store only the context ID (UUID) in Vercel Blob — no cookie extraction.
// TTL is 28 days (Browserbase contexts expire at 30).
// ---------------------------------------------------------------------------

const CONTEXT_TTL_MS = 28 * 24 * 60 * 60 * 1000;

async function saveDomainContext(domain: string, contextId: string): Promise<void> {
  const payload: DomainContext = { contextId, savedAt: Date.now() };
  await put(
    `browser_contexts/${domain}.json`,
    JSON.stringify(payload),
    { access: 'public', addRandomSuffix: false },
  );
}

async function loadDomainContext(domain: string): Promise<string | null> {
  try {
    const blobUrl = `${process.env.BLOB_BASE_URL}/browser_contexts/${domain}.json`;
    const res = await fetch(blobUrl, { cache: 'no-store' });
    if (!res.ok) return null;
    const data: DomainContext = await res.json();
    if (Date.now() - data.savedAt > CONTEXT_TTL_MS) {
      console.log(`[browser-agent] 🔄 Context for ${domain} expired — will recreate`);
      return null;
    }
    return data.contextId;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Create a fresh authenticated Browserbase Context for a domain.
// Spins up a dedicated login session, performs login with persist: true,
// then closes — Browserbase writes auth state into the context on close.
// Session replay URL is logged so login flow is auditable without screenshots.
// ---------------------------------------------------------------------------

async function createAuthenticatedContext(
  domain: string,
  creds: Credentials,
  targetUrl: string,
): Promise<string> {
  console.log(`[browser-agent] 🔐 Creating authenticated context for ${domain}`);

  // FIX: contexts.create() takes no arguments — projectId is sessions-only
  const context = await bb.contexts.create();
  const contextId = context.id;
  console.log(`[browser-agent] 🔐 Context created: ${contextId}`);

  const loginSession = await bb.sessions.create({
    projectId: process.env.BROWSERBASE_PROJECT_ID!,
    browserSettings: {
      viewport: { width: 1280, height: 800 },
      context: {
        id: contextId,
        persist: true, // auth state written back into context on browser close
      },
    },
  });

  // Log replay URL — watch the login flow in Browserbase dashboard, no screenshots needed
  console.log(`[browser-agent] 🎥 Login session replay: https://browserbase.com/sessions/${loginSession.id}`);

  const loginBrowser = await chromium.connectOverCDP(loginSession.connectUrl);
  const loginContext: BrowserContext = loginBrowser.contexts()[0];
  const loginPage = loginContext.pages()[0] ?? await loginContext.newPage();

  try {
    const handler = LOGIN_HANDLERS[domain];
    if (handler) {
      console.log(`[browser-agent] 🔑 Deterministic login for ${domain}`);
      await handler(loginPage, creds);
    } else {
      // Navigate to the target URL so LLM sees the actual paywall/login state
      await loginPage.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
      console.log(`[browser-agent] 🤖 LLM-driven login for ${domain}`);
      await llmDrivenLogin(loginPage, domain, creds);
    }
    console.log(`[browser-agent] 🔐 Login complete — auth state will be saved to context ${contextId}`);
  } finally {
    // Closing flushes the session; Browserbase persists auth state into context
    await loginBrowser.close();
  }

  await saveDomainContext(domain, contextId);
  return contextId;
}

// ---------------------------------------------------------------------------
// Paywall / login detection — fast heuristics, no LLM needed
// ---------------------------------------------------------------------------

async function detectPaywall(page: Page, originalUrl: string): Promise<boolean> {
  const currentUrl = page.url();

  if (/\/(login|signin|sign-in|subscribe|account\/sign)/.test(currentUrl)) return true;

  const originalPath = new URL(originalUrl).pathname;
  const currentPath  = new URL(currentUrl).pathname;
  if (originalPath !== currentPath && /login|auth|account/.test(currentPath)) return true;

  const hasPaywall = await page.evaluate(() => {
    const bodyText = document.body.innerText.toLowerCase();
    const hasPasswordInput = !!document.querySelector('input[type="password"]');
    const paywallPhrases = [
      'subscribe to read',
      'sign in to read',
      'create a free account',
      'subscribe for full access',
      'already a subscriber',
      'to continue reading',
      'unlock this article',
      'register to continue',
    ];
    const hasPaywallText = paywallPhrases.some(p => bodyText.includes(p));
    return hasPasswordInput || hasPaywallText;
  });

  return hasPaywall;
}

// ---------------------------------------------------------------------------
// LLM-driven login fallback (Claude vision)
// Only fires for unknown domains with no handler in LOGIN_HANDLERS.
// ---------------------------------------------------------------------------

interface LLMAction {
  action: 'fill' | 'click' | 'waitForNavigation' | 'waitForTimeout';
  selector?: string;
  value?: string;
  ms?: number;
}

async function llmDrivenLogin(
  page: Page,
  domain: string,
  creds: Credentials,
): Promise<void> {
  const screenshotBuf = await page.screenshot({ type: 'jpeg', quality: 60 });
  const base64 = screenshotBuf.toString('base64');

  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 600,
    messages: [{
      role: 'user',
      content: [
        {
          type: 'image',
          source: { type: 'base64', media_type: 'image/jpeg', data: base64 },
        },
        {
          type: 'text',
          text:
            `This is a login/paywall page for ${domain}.\n` +
            `Log in with email: {{email}} and password: {{password}}.\n\n` +
            `Return ONLY a JSON array of Playwright actions. Use {{email}} and {{password}} as ` +
            `placeholders — do NOT include real values. Supported actions:\n` +
            `  { "action": "fill", "selector": "CSS_SELECTOR", "value": "VALUE" }\n` +
            `  { "action": "click", "selector": "CSS_SELECTOR" }\n` +
            `  { "action": "waitForNavigation" }\n` +
            `  { "action": "waitForTimeout", "ms": NUMBER }\n\n` +
            `Return raw JSON only — no markdown, no explanation.`,
        },
      ],
    }],
  });

  const raw = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map(b => b.text)
    .join('');

  let actions: LLMAction[];
  try {
    actions = JSON.parse(raw.replace(/```json|```/g, '').trim());
  } catch {
    throw new Error(`[browser-agent] LLM returned unparseable actions: ${raw}`);
  }

  for (const action of actions) {
    if (action.action === 'fill' && action.selector && action.value) {
      const val = action.value
        .replace('{{email}}', creds.email)
        .replace('{{password}}', creds.password);
      await page.fill(action.selector, val);
    } else if (action.action === 'click' && action.selector) {
      await page.click(action.selector);
    } else if (action.action === 'waitForNavigation') {
      await page.waitForNavigation({ waitUntil: 'domcontentloaded' }).catch(() => { /* non-fatal */ });
    } else if (action.action === 'waitForTimeout') {
      await page.waitForTimeout(action.ms ?? 1000);
    }
  }
}

// ---------------------------------------------------------------------------
// Text highlight injection
// ---------------------------------------------------------------------------

async function injectHighlight(page: Page, searchText: string): Promise<boolean> {
  return page.evaluate((text) => {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let node: Text | null;

    while ((node = walker.nextNode() as Text | null)) {
      const content = node.textContent ?? '';
      const idx = content.toLowerCase().indexOf(text.toLowerCase());
      if (idx === -1) continue;

      const before = document.createTextNode(content.slice(0, idx));
      const mark   = document.createElement('mark');
      mark.style.cssText =
        'background:#FFD600;color:#000;padding:2px 4px;border-radius:3px;' +
        'font-weight:700;box-shadow:0 0 0 2px #FFD600;';
      mark.textContent = content.slice(idx, idx + text.length);
      const after = document.createTextNode(content.slice(idx + text.length));

      const parent = node.parentNode!;
      parent.replaceChild(after, node);
      parent.insertBefore(mark, after);
      parent.insertBefore(before, mark);
      mark.scrollIntoView({ behavior: 'instant', block: 'center' });
      return true;
    }
    return false;
  }, searchText);
}

// ---------------------------------------------------------------------------
// CDP screenshot
//
// Faster than page.screenshot() — talks directly to Chrome DevTools Protocol.
// captureBeyondViewport: false captures exactly the 1280×800 viewport window,
// already scrolled to the highlighted text via scrollIntoView above.
//
// FIX: removed client.detach() — that method does not exist on Playwright's
// CDPSession. The CDP session is cleaned up when browser.close() is called.
// ---------------------------------------------------------------------------

async function cdpScreenshot(
  context: BrowserContext,
  page: Page,
): Promise<Buffer> {
  const client = await context.newCDPSession(page);

  const { data } = await client.send('Page.captureScreenshot', {
    format: 'jpeg',
    quality: 85,
    captureBeyondViewport: false,
  });

  // No client.detach() — does not exist on Playwright CDPSession.
  // Cleanup happens automatically when browser.close() is called.
  return Buffer.from(data, 'base64');
}

// ---------------------------------------------------------------------------
// Core screenshot function
// ---------------------------------------------------------------------------

async function fetchScreenshotWithAuth(
  url: string,
  searchText: string,
): Promise<ScreenshotResult> {
  const cacheKey = `source_screenshots/${sha256(url + searchText)}.jpg`;
  const domain   = normalizeDomain(new URL(url).hostname);

  // 1. Screenshot cache check
  try {
    const existing = await head(cacheKey);
    if (existing?.url) {
      console.log(`[browser-agent] 💾 Cache hit for ${url}`);
      return { screenshotUrl: existing.url, fromCache: true, authed: false, domain };
    }
  } catch {
    // not cached — continue
  }

  // 2. Resolve or create a Browserbase Context for this domain
  const creds    = CREDENTIALS[domain];
  let contextId  = await loadDomainContext(domain);
  let authed     = false;

  if (!contextId) {
    if (creds) {
      // Slow path — runs once per domain. All future requests skip this.
      contextId = await createAuthenticatedContext(domain, creds, url);
      authed = true;
    } else {
      // No credentials — anonymous context for basic session continuity
      // FIX: contexts.create() takes no arguments
      const anonContext = await bb.contexts.create();
      contextId = anonContext.id;
      await saveDomainContext(domain, contextId);
      console.log(`[browser-agent] 🌐 Anonymous context created for ${domain}: ${contextId}`);
    }
  } else {
    console.log(`[browser-agent] ♻️  Reusing context for ${domain}: ${contextId}`);
    if (creds) authed = true;
  }

  // 3. Create screenshot session using the resolved context
  const session = await bb.sessions.create({
    projectId: process.env.BROWSERBASE_PROJECT_ID!,
    browserSettings: {
      viewport: { width: 1280, height: 800 },
      context: {
        id: contextId,
        persist: true,
      },
    },
  });

  // Log replay URL for every screenshot session — auditable without screenshots
  console.log(`[browser-agent] 🎥 Session replay: https://browserbase.com/sessions/${session.id}`);

  const browser = await chromium.connectOverCDP(session.connectUrl);
  const context: BrowserContext = browser.contexts()[0];
  const page = context.pages()[0] ?? await context.newPage();

  try {
    // 4. Navigate — domcontentloaded + 60s timeout per Browserbase docs pattern
    console.log(`[browser-agent] 🌐 Navigating to ${url}`);
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });

    // 5. Paywall check — should not fire for authenticated contexts, but handles
    //    edge cases like expired sessions or site-side session invalidation.
    const needsLogin = await detectPaywall(page, url);

    if (needsLogin && creds) {
      console.log(`[browser-agent] ⚠️  Paywall detected despite stored context for ${domain} — reauthenticating`);
      await browser.close();

      const freshContextId = await createAuthenticatedContext(domain, creds, url);
      authed = true;

      const freshSession = await bb.sessions.create({
        projectId: process.env.BROWSERBASE_PROJECT_ID!,
        browserSettings: {
          viewport: { width: 1280, height: 800 },
          context: { id: freshContextId, persist: true },
        },
      });

      console.log(`[browser-agent] 🎥 Re-auth session replay: https://browserbase.com/sessions/${freshSession.id}`);

      const freshBrowser = await chromium.connectOverCDP(freshSession.connectUrl);
      const freshContext: BrowserContext = freshBrowser.contexts()[0];
      const freshPage = freshContext.pages()[0] ?? await freshContext.newPage();

      await freshPage.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });

      const highlighted = await injectHighlight(freshPage, searchText);
      if (!highlighted) {
        console.warn(`[browser-agent] ⚠️  Text "${searchText}" not found on page`);
      }
      await freshPage.waitForTimeout(500);

      const screenshotBuffer = await cdpScreenshot(freshContext, freshPage);
      await freshBrowser.close();

      const blob = await put(cacheKey, screenshotBuffer, {
        access: 'public',
        contentType: 'image/jpeg',
        addRandomSuffix: false,
      });
      console.log(`[browser-agent] ✅ Screenshot uploaded → ${blob.url}`);
      return { screenshotUrl: blob.url, fromCache: false, authed, domain };

    } else if (needsLogin) {
      console.warn(`[browser-agent] ⚠️  No credentials for ${domain} — screenshotting paywall`);
    }

    // 6. Inject highlight
    const highlighted = await injectHighlight(page, searchText);
    if (!highlighted) {
      console.warn(`[browser-agent] ⚠️  Text "${searchText}" not found on page`);
    }
    await page.waitForTimeout(500);

    // 7. CDP screenshot — directly via Chrome DevTools Protocol
    const screenshotBuffer = await cdpScreenshot(context, page);

    // 8. Upload to Vercel Blob
    const blob = await put(cacheKey, screenshotBuffer, {
      access: 'public',
      contentType: 'image/jpeg',
      addRandomSuffix: false,
    });

    console.log(`[browser-agent] ✅ Screenshot uploaded → ${blob.url}`);
    return { screenshotUrl: blob.url, fromCache: false, authed, domain };

  } finally {
    await browser.close();
  }
}

// ---------------------------------------------------------------------------
// Request handler
// ---------------------------------------------------------------------------

export default async function handler(req: VercelRequest, res: VercelResponse) {
  console.log(`[browser-agent] ${req.method} /api/browser-agent`);

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { url, searchText } = req.body as RequestBody;

  if (!url || typeof url !== 'string' || url.trim() === '') {
    return res.status(400).json({ error: '`url` is required and must be a non-empty string.' });
  }
  if (!searchText || typeof searchText !== 'string' || searchText.trim() === '') {
    return res.status(400).json({ error: '`searchText` is required and must be a non-empty string.' });
  }

  try {
    new URL(url);
  } catch {
    return res.status(400).json({ error: '`url` is not a valid URL.' });
  }

  console.log(`[browser-agent] url: ${url} | searchText: "${searchText}"`);

  try {
    const result = await fetchScreenshotWithAuth(url, searchText);
    return res.status(200).json(result);
  } catch (error: unknown) {
    const err = error as Error;
    console.error('[browser-agent] ❌ Unhandled error:', err.message);
    console.error('[browser-agent] Stack:', err.stack);
    return res.status(500).json({ error: 'Screenshot failed', detail: err.message ?? 'Unknown error' });
  }
}

// ---------------------------------------------------------------------------
// Required environment variables
// ---------------------------------------------------------------------------
//
// ANTHROPIC_API_KEY=          ← LLM login fallback only
// BROWSERBASE_API_KEY=
// BROWSERBASE_PROJECT_ID=
// BLOB_BASE_URL=              ← e.g. https://xxxx.public.blob.vercel-storage.com
//
// Per-domain credentials (add only for domains you have accounts on):
// REUTERS_EMAIL=     REUTERS_PASSWORD=
// WSJ_EMAIL=         WSJ_PASSWORD=
// FT_EMAIL=          FT_PASSWORD=
// BLOOMBERG_EMAIL=   BLOOMBERG_PASSWORD=
// NYT_EMAIL=         NYT_PASSWORD=
// ECONOMIST_EMAIL=   ECONOMIST_PASSWORD=
//
// ---------------------------------------------------------------------------
// npm install @browserbasehq/sdk playwright-core @anthropic-ai/sdk @vercel/blob
// ---------------------------------------------------------------------------
