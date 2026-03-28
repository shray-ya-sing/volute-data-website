/**
 * Anonymous User Rate Limiting
 * 
 * Tracks unauthenticated users using:
 * 1. localStorage (client-side tracking)
 * 2. Backend IP tracking (ready for implementation)
 */

const STORAGE_KEY = 'volute_anon_user';
const USAGE_KEY = 'volute_anon_usage';
const MAX_ANONYMOUS_REQUESTS = 30; // Max requests per 24-hour window
const RESET_WINDOW_MS = 24 * 60 * 60 * 1000; // 24 hours

interface AnonymousUser {
  id: string;
  createdAt: number;
}

interface UsageRecord {
  count: number;
  firstRequestAt: number;
  lastRequestAt: number;
  windowResetAt: number;
}

/**
 * Generate a random anonymous user ID
 */
function generateAnonId(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 15);
  return `anon_${timestamp}_${random}`;
}

/**
 * Get or create anonymous user ID
 */
export function getAnonymousUserId(): string {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const user: AnonymousUser = JSON.parse(stored);
      return user.id;
    }
  } catch (e) {
    console.warn('[anonymousRateLimit] Failed to read from localStorage:', e);
  }

  // Create new anonymous user
  const newUser: AnonymousUser = {
    id: generateAnonId(),
    createdAt: Date.now(),
  };

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newUser));
  } catch (e) {
    console.warn('[anonymousRateLimit] Failed to write to localStorage:', e);
  }

  return newUser.id;
}

/**
 * Get current usage record
 */
function getUsageRecord(): UsageRecord | null {
  try {
    const stored = localStorage.getItem(USAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.warn('[anonymousRateLimit] Failed to read usage record:', e);
  }
  return null;
}

/**
 * Save usage record
 */
function saveUsageRecord(record: UsageRecord): void {
  try {
    localStorage.setItem(USAGE_KEY, JSON.stringify(record));
  } catch (e) {
    console.warn('[anonymousRateLimit] Failed to save usage record:', e);
  }
}

/**
 * Check if user has exceeded rate limit
 * Returns { allowed: boolean, remaining: number, resetAt: number }
 */
export function checkRateLimit(): {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  message?: string;
} {
  const now = Date.now();
  const usage = getUsageRecord();

  // No usage record yet - first request
  if (!usage) {
    return {
      allowed: true,
      remaining: MAX_ANONYMOUS_REQUESTS - 1,
      resetAt: now + RESET_WINDOW_MS,
    };
  }

  // Check if window has expired and should reset
  if (now >= usage.windowResetAt) {
    console.log('[anonymousRateLimit] Usage window expired, resetting counter');
    return {
      allowed: true,
      remaining: MAX_ANONYMOUS_REQUESTS - 1,
      resetAt: now + RESET_WINDOW_MS,
    };
  }

  // Within the window - check count
  if (usage.count >= MAX_ANONYMOUS_REQUESTS) {
    const hoursRemaining = Math.ceil((usage.windowResetAt - now) / (1000 * 60 * 60));
    return {
      allowed: false,
      remaining: 0,
      resetAt: usage.windowResetAt,
      message: `You've reached the preview limit of ${MAX_ANONYMOUS_REQUESTS} requests. Your limit will reset in ${hoursRemaining} hour${hoursRemaining !== 1 ? 's' : ''}.`,
    };
  }

  return {
    allowed: true,
    remaining: MAX_ANONYMOUS_REQUESTS - usage.count,
    resetAt: usage.windowResetAt,
  };
}

/**
 * Record a request (increment usage counter)
 */
export function recordRequest(): void {
  const now = Date.now();
  const usage = getUsageRecord();

  if (!usage) {
    // First request
    saveUsageRecord({
      count: 1,
      firstRequestAt: now,
      lastRequestAt: now,
      windowResetAt: now + RESET_WINDOW_MS,
    });
    return;
  }

  // Check if window expired
  if (now >= usage.windowResetAt) {
    // Reset window
    saveUsageRecord({
      count: 1,
      firstRequestAt: now,
      lastRequestAt: now,
      windowResetAt: now + RESET_WINDOW_MS,
    });
    return;
  }

  // Increment within window
  saveUsageRecord({
    ...usage,
    count: usage.count + 1,
    lastRequestAt: now,
  });
}

/**
 * Get remaining requests for display
 */
export function getRemainingRequests(): number {
  const { remaining } = checkRateLimit();
  return remaining;
}

/**
 * Clear rate limit (for development/testing)
 */
export function clearRateLimit(): void {
  try {
    localStorage.removeItem(USAGE_KEY);
    console.log('[anonymousRateLimit] Rate limit cleared');
  } catch (e) {
    console.warn('[anonymousRateLimit] Failed to clear rate limit:', e);
  }
}

/**
 * Format time until reset
 */
export function getTimeUntilReset(): string {
  const { resetAt } = checkRateLimit();
  const now = Date.now();
  const diff = resetAt - now;

  if (diff <= 0) return 'now';

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}