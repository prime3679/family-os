// In-memory rate limiting (suitable for serverless)
const rateLimit = new Map<string, { count: number; resetAt: number }>();

// Clean up old entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of rateLimit.entries()) {
    if (now > record.resetAt) {
      rateLimit.delete(key);
    }
  }
}, 60000);

/**
 * Check if a request is rate limited
 * @param key Unique identifier (usually IP + endpoint)
 * @param limit Max requests per window
 * @param windowMs Window duration in milliseconds
 * @returns true if allowed, false if rate limited
 */
export function checkRateLimit(key: string, limit = 10, windowMs = 60000): boolean {
  const now = Date.now();
  const record = rateLimit.get(key);

  if (!record || now > record.resetAt) {
    rateLimit.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (record.count >= limit) {
    return false;
  }

  record.count++;
  return true;
}

/**
 * Get remaining requests for a key
 */
export function getRateLimitInfo(key: string, limit = 10): { remaining: number; resetAt: number } | null {
  const record = rateLimit.get(key);
  if (!record) return null;
  return { remaining: Math.max(0, limit - record.count), resetAt: record.resetAt };
}
