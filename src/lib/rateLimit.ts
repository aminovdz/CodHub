// In-memory rate limiting utility
// Note: In a multi-instance/serverless environment, you'd want to use Redis (e.g. Upstash) for rate limiting.

interface RateLimitInfo {
  count: number;
  resetTime: number;
}

const rateLimits = new Map<string, RateLimitInfo>();

export function checkRateLimit(ip: string, limit: number, windowMs: number): { success: boolean; limit: number; remaining: number; reset: number } {
  const now = Date.now();
  
  if (!rateLimits.has(ip)) {
    rateLimits.set(ip, { count: 1, resetTime: now + windowMs });
    return { success: true, limit, remaining: limit - 1, reset: now + windowMs };
  }

  const info = rateLimits.get(ip)!;

  if (now > info.resetTime) {
    info.count = 1;
    info.resetTime = now + windowMs;
    return { success: true, limit, remaining: limit - 1, reset: info.resetTime };
  }

  if (info.count >= limit) {
    return { success: false, limit, remaining: 0, reset: info.resetTime };
  }

  info.count += 1;
  return { success: true, limit, remaining: limit - info.count, reset: info.resetTime };
}
