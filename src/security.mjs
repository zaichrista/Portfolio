import { createHash, randomUUID, timingSafeEqual } from 'node:crypto';

const buckets = new Map();
const WINDOW_MS = 15 * 60 * 1000;
const MAX_CONTACT_REQUESTS = 5;

export function requestId(value) {
  return typeof value === 'string' && /^[a-zA-Z0-9._-]{1,80}$/.test(value)
    ? value
    : randomUUID();
}

export function setSecurityHeaders(response, { production, requestId: id }) {
  const directives = [
    "default-src 'self'",
    "base-uri 'none'",
    "connect-src 'self'",
    "font-src 'self'",
    "form-action 'self'",
    "img-src 'self' data:",
    "object-src 'none'",
    "script-src 'self'",
    "style-src 'self'"
  ];
  if (production) directives.push("frame-ancestors 'none'", 'upgrade-insecure-requests');

  response.setHeader('Content-Security-Policy', directives.join('; '));
  response.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  response.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
  response.setHeader('Permissions-Policy', 'camera=(), geolocation=(), microphone=(), payment=(), usb=()');
  response.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.setHeader('X-Content-Type-Options', 'nosniff');
  response.setHeader('X-Permitted-Cross-Domain-Policies', 'none');
  response.setHeader('X-Request-Id', id);
  if (production) {
    response.setHeader('X-Frame-Options', 'DENY');
    response.setHeader('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
  }
}

export function isAllowedOrigin(request, expectedOrigin) {
  const origin = request.headers.origin;
  if (typeof origin !== 'string') return false;
  const left = Buffer.from(origin);
  const right = Buffer.from(expectedOrigin);
  return left.length === right.length && timingSafeEqual(left, right);
}

export function clientIdentifier(request, trustProxy, secret) {
  let address = request.socket.remoteAddress || 'unknown';
  if (trustProxy) {
    const forwarded = request.headers['x-forwarded-for'];
    if (typeof forwarded === 'string') address = forwarded.split(',')[0].trim();
  }
  return createHash('sha256').update(secret).update('\0').update(address).digest('hex');
}

export function consumeContactLimit(identifier, now = Date.now()) {
  const bucket = buckets.get(identifier);
  if (!bucket || now >= bucket.resetAt) {
    buckets.set(identifier, { count: 1, resetAt: now + WINDOW_MS });
    return { allowed: true, retryAfter: 0 };
  }
  if (bucket.count >= MAX_CONTACT_REQUESTS) {
    return { allowed: false, retryAfter: Math.ceil((bucket.resetAt - now) / 1000) };
  }
  bucket.count += 1;
  return { allowed: true, retryAfter: 0 };
}

export function pruneRateLimits(now = Date.now()) {
  for (const [key, bucket] of buckets) {
    if (now >= bucket.resetAt) buckets.delete(key);
  }
}
