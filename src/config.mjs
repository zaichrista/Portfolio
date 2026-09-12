const integer = (name, fallback, min, max) => {
  const value = process.env[name];
  if (value === undefined || value === '') return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < min || parsed > max) {
    throw new Error(`${name} must be an integer between ${min} and ${max}`);
  }
  return parsed;
};

const boolean = (name, fallback = false) => {
  const value = process.env[name];
  if (value === undefined || value === '') return fallback;
  if (value === 'true') return true;
  if (value === 'false') return false;
  throw new Error(`${name} must be true or false`);
};

const origin = process.env.SITE_ORIGIN || 'http://localhost:3000';
let siteUrl;
try {
  siteUrl = new URL(origin);
} catch {
  throw new Error('SITE_ORIGIN must be an absolute URL');
}
if (!['http:', 'https:'].includes(siteUrl.protocol) || siteUrl.pathname !== '/') {
  throw new Error('SITE_ORIGIN must be an http(s) origin without a path');
}

const production = process.env.NODE_ENV === 'production';
if (production && siteUrl.protocol !== 'https:') {
  throw new Error('SITE_ORIGIN must use HTTPS in production');
}

const resend = {
  apiKey: process.env.RESEND_API_KEY || '',
  to: process.env.CONTACT_TO_EMAIL || '',
  from: process.env.CONTACT_FROM_EMAIL || '',
  replyToVisitor: boolean('CONTACT_REPLY_TO', true)
};

export const config = Object.freeze({
  production,
  port: integer('PORT', 3000, 1, 65535),
  siteOrigin: siteUrl.origin,
  trustProxy: boolean('TRUST_PROXY'),
  rateLimitSecret: process.env.RATE_LIMIT_SECRET || 'development-only-secret',
  resend,
  contactEnabled: Boolean(resend.apiKey && resend.to && resend.from)
});

if (production && config.rateLimitSecret.length < 32) {
  throw new Error('RATE_LIMIT_SECRET must contain at least 32 characters in production');
}
