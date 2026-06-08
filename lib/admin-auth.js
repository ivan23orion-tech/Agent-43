import crypto from 'crypto';

const ADMIN_TOKEN_HEADER_NAMES = ['x-admin-token', 'admin-token'];

function normalizeToken(value) {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmedValue = value.trim();
  return trimmedValue ? trimmedValue : null;
}

function readHeaderToken(req) {
  for (const headerName of ADMIN_TOKEN_HEADER_NAMES) {
    const value = req.headers[headerName];

    if (Array.isArray(value)) {
      const firstToken = value.find((headerValue) => normalizeToken(headerValue));
      if (firstToken) {
        return normalizeToken(firstToken);
      }
      continue;
    }

    const token = normalizeToken(value);
    if (token) {
      return token;
    }
  }

  return null;
}

export function getAdminToken(req) {
  return normalizeToken(req.body?.adminToken)
    ?? normalizeToken(req.query?.adminToken)
    ?? readHeaderToken(req);
}

export function isAdminRequest(req) {
  const configuredToken = normalizeToken(process.env.AGENT43_ADMIN_TOKEN);
  const providedToken = getAdminToken(req);

  if (!configuredToken || !providedToken) {
    return false;
  }

  const configuredBuffer = Buffer.from(configuredToken);
  const providedBuffer = Buffer.from(providedToken);

  return configuredBuffer.length === providedBuffer.length
    && crypto.timingSafeEqual(configuredBuffer, providedBuffer);
}

export function requireAdmin(req, res) {
  const configuredToken = normalizeToken(process.env.AGENT43_ADMIN_TOKEN);

  if (!configuredToken) {
    res.status(503).json({ error: 'Admin ainda não configurado' });
    return false;
  }

  const providedToken = getAdminToken(req);

  if (!providedToken) {
    res.status(401).json({ error: 'Token de admin obrigatório' });
    return false;
  }

  if (!isAdminRequest(req)) {
    res.status(401).json({ error: 'Token de admin inválido' });
    return false;
  }

  return true;
}
