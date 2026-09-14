import { createServer } from 'node:http';
import { readFile, realpath, stat } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from './config.mjs';
import { deliverContact, validateContact } from './contact.mjs';
import {
  clientIdentifier,
  consumeContactLimit,
  isAllowedOrigin,
  pruneRateLimits,
  requestId,
  setSecurityHeaders
} from './security.mjs';

const publicDirectory = fileURLToPath(new URL('../public/', import.meta.url));
const BODY_LIMIT = 12 * 1024;
const MIME = new Map([
  ['.css', 'text/css; charset=utf-8'],
  ['.html', 'text/html; charset=utf-8'],
  ['.ico', 'image/x-icon'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.svg', 'image/svg+xml; charset=utf-8'],
  ['.txt', 'text/plain; charset=utf-8'],
  ['.webmanifest', 'application/manifest+json; charset=utf-8']
]);

function json(response, status, payload) {
  response.statusCode = status;
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  response.setHeader('Cache-Control', 'no-store');
  response.end(JSON.stringify(payload));
}

async function readJson(request) {
  const contentType = request.headers['content-type']?.split(';', 1)[0].trim().toLowerCase();
  if (contentType !== 'application/json') {
    const error = new Error('Unsupported media type');
    error.status = 415;
    throw error;
  }
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > BODY_LIMIT) {
      const error = new Error('Payload too large');
      error.status = 413;
      throw error;
    }
    chunks.push(chunk);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    const error = new Error('Invalid JSON');
    error.status = 400;
    throw error;
  }
}

async function serveStatic(pathname, response) {
  let decoded;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    return false;
  }
  const requested = decoded === '/' ? '/index.html' : decoded;
  const relative = normalize(requested).replace(/^[/\\]+/, '');
  const filePath = join(publicDirectory, relative);
  if (!filePath.startsWith(publicDirectory) || filePath.includes('\0')) return false;
  try {
    const resolvedPath = await realpath(filePath);
    if (!resolvedPath.startsWith(publicDirectory)) return false;
    const details = await stat(resolvedPath);
    if (!details.isFile()) return false;
    const type = MIME.get(extname(resolvedPath).toLowerCase());
    if (!type) return false;
    response.statusCode = 200;
    response.setHeader('Content-Type', type);
    response.setHeader('Cache-Control', ['.html', '.css'].includes(extname(resolvedPath)) ? 'no-cache' : 'public, max-age=3600');
    response.end(await readFile(resolvedPath));
    return true;
  } catch (error) {
    if (error.code === 'ENOENT' || error.code === 'EISDIR') return false;
    throw error;
  }
}

export function createApp(overrides = {}) {
  const settings = { ...config, ...overrides };
  return createServer(async (request, response) => {
    const id = requestId(request.headers['x-request-id']);
    setSecurityHeaders(response, { production: settings.production, requestId: id });

    try {
      if (!request.url?.startsWith('/')) return json(response, 400, { error: 'Invalid request target.' });
      const url = new URL(request.url, settings.siteOrigin);
      if (request.method === 'GET' && url.pathname === '/api/health') {
        return json(response, 200, { status: 'ok' });
      }

      if (request.method === 'POST' && url.pathname === '/api/contact') {
        if (!settings.contactEnabled) return json(response, 503, { error: 'Contact form is not configured.' });
        if (!isAllowedOrigin(request, settings.siteOrigin)) return json(response, 403, { error: 'Request origin is not allowed.' });
        const identifier = clientIdentifier(request, settings.trustProxy, settings.rateLimitSecret);
        const limit = consumeContactLimit(identifier);
        if (!limit.allowed) {
          response.setHeader('Retry-After', String(limit.retryAfter));
          return json(response, 429, { error: 'Too many requests. Please try again later.' });
        }
        const contact = validateContact(await readJson(request));
        if (!contact) return json(response, 400, { error: 'Please check the submitted details.' });

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8_000);
        try {
          await deliverContact(contact, settings.resend, controller.signal);
        } finally {
          clearTimeout(timeout);
        }
        return json(response, 202, { accepted: true });
      }

      if ((request.method === 'GET' || request.method === 'HEAD') && await serveStatic(url.pathname, response)) {
        return;
      }
      if (!['GET', 'HEAD', 'POST'].includes(request.method)) {
        response.setHeader('Allow', 'GET, HEAD, POST');
        return json(response, 405, { error: 'Method not allowed.' });
      }
      return json(response, 404, { error: 'Not found.' });
    } catch (error) {
      const status = Number.isInteger(error.status) ? error.status : 500;
      if (status === 500) console.error(`[${id}] Request failed:`, error.message);
      return json(response, status, { error: status === 500 ? 'Internal server error.' : error.message });
    }
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const server = createApp();
  server.requestTimeout = 10_000;
  server.headersTimeout = 12_000;
  server.keepAliveTimeout = 5_000;
  server.listen(config.port, '0.0.0.0', () => {
    console.log(`Portfolio server listening on port ${config.port}`);
  });
  setInterval(pruneRateLimits, 15 * 60 * 1000).unref();
}
