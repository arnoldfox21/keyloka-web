import type { NextRequest } from "next/server";

const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

/**
 * Verifies that state-changing browser requests originate from the same host (CSRF mitigation).
 */
export function verifySameOrigin(req: NextRequest): boolean {
  const method = req.method.toUpperCase();
  if (method === "GET" || method === "HEAD" || method === "OPTIONS") {
    return true;
  }

  const expectedHost = (
    req.headers.get("x-forwarded-host") ||
    req.headers.get("host") ||
    req.nextUrl.host
  ).toLowerCase();

  if (!expectedHost) return true;

  const origin = req.headers.get("origin");
  if (origin) {
    try {
      return new URL(origin).host.toLowerCase() === expectedHost;
    } catch {
      return false;
    }
  }

  const referer = req.headers.get("referer");
  if (referer) {
    try {
      return new URL(referer).host.toLowerCase() === expectedHost;
    } catch {
      return false;
    }
  }

  return true;
}

/**
 * Extracts best-effort client IP for lightweight per-isolate rate limiting.
 */
export function getClientIp(req: NextRequest): string {
  const cfIp = req.headers.get("cf-connecting-ip");
  if (cfIp) return cfIp.trim();
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || "unknown";
  return req.headers.get("x-real-ip")?.trim() || "unknown";
}

/**
 * Fixed-window rate limiter per key. Suitable for edge/isolate abuse throttling.
 */
export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): { allowed: boolean; retryAfterSec: number } {
  const now = Date.now();

  if (rateLimitStore.size > 1000) {
    for (const [k, entry] of rateLimitStore.entries()) {
      if (entry.resetAt <= now) rateLimitStore.delete(k);
    }
  }

  const existing = rateLimitStore.get(key);
  if (!existing || existing.resetAt <= now) {
    rateLimitStore.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterSec: 0 };
  }

  if (existing.count >= limit) {
    return {
      allowed: false,
      retryAfterSec: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
    };
  }

  existing.count += 1;
  return { allowed: true, retryAfterSec: 0 };
}
