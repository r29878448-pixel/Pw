const crypto = require('crypto');

const PW_KEY = 'maggikhalo';

function decrypt(payload) {
  const colonIdx = payload.indexOf(':');
  if (colonIdx === -1) throw new Error('Invalid format');
  const iv = Buffer.from(payload.slice(0, colonIdx), 'hex');
  const encBytes = Buffer.from(payload.slice(colonIdx + 1), 'hex');
  const key = Buffer.alloc(32);
  Buffer.from(PW_KEY).copy(key);
  const authTag = encBytes.slice(-16);
  const ciphertext = encBytes.slice(0, -16);
  const d = crypto.createDecipheriv('aes-256-gcm', key, iv);
  d.setAuthTag(authTag);
  return JSON.parse(d.update(ciphertext, null, 'utf8') + d.final('utf8'));
}

function safeDecrypt(payload) {
  try {
    if (!payload || typeof payload !== 'string') return null;
    return decrypt(payload);
  } catch (_) { return null; }
}

module.exports = { decrypt, safeDecrypt };
