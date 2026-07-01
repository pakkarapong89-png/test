import crypto from 'crypto';

/**
 * Hash a password using PBKDF2 (native Node.js crypto — no native binary needed)
 * Returns { hash, salt }
 */
export function hashPassword(password) {
  const salt = crypto.randomBytes(32).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 100_000, 64, 'sha512').toString('hex');
  return { hash, salt };
}

/**
 * Verify a plaintext password against a stored hash+salt.
 * Returns true if correct.
 */
export function verifyPassword(password, storedHash, salt) {
  const hash = crypto.pbkdf2Sync(password, salt, 100_000, 64, 'sha512').toString('hex');
  return hash === storedHash;
}

/**
 * Create a signed session token as a JSON string encoded in base64.
 * Not cryptographically signed (we rely on HTTP-only cookie for security),
 * but still not tamper-evident without a server-side secret check.
 */
const SESSION_SECRET = process.env.SESSION_SECRET || 'default-secret-change-me-in-production';

export function createSessionToken(user) {
  const payload = JSON.stringify({
    id: user.id,
    username: user.username,
    name: user.name,
    role: user.role,
    jiraDisplayName: user.jiraDisplayName,
    jiraAccountId: user.jiraAccountId,
    iat: Date.now()
  });
  const signature = crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(payload)
    .digest('hex');
  const token = Buffer.from(payload).toString('base64') + '.' + signature;
  return token;
}

/**
 * Parse and verify a session token.
 * Returns the user payload or null if invalid.
 */
export function parseSessionToken(token) {
  try {
    const [payloadB64, signature] = token.split('.');
    if (!payloadB64 || !signature) return null;

    const payload = Buffer.from(payloadB64, 'base64').toString('utf8');
    const expectedSig = crypto
      .createHmac('sha256', SESSION_SECRET)
      .update(payload)
      .digest('hex');

    if (signature !== expectedSig) return null;

    const data = JSON.parse(payload);
    // Session expires after 7 days
    if (Date.now() - data.iat > 7 * 24 * 60 * 60 * 1000) return null;

    return data;
  } catch {
    return null;
  }
}
