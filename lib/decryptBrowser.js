/**
 * Browser-compatible decryption for PW API responses
 * Uses Web Crypto API instead of Node.js crypto
 */

const PW_KEY = 'maggikhalo';

// Convert string to Uint8Array
function str2buf(str) {
  const buf = new Uint8Array(str.length);
  for (let i = 0; i < str.length; i++) {
    buf[i] = str.charCodeAt(i);
  }
  return buf;
}

// Convert hex string to Uint8Array
function hex2buf(hex) {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
  }
  return bytes;
}

// Decrypt using Web Crypto API
export async function decrypt(payload) {
  try {
    const colonIdx = payload.indexOf(':');
    if (colonIdx === -1) throw new Error('Invalid format');
    
    const iv = hex2buf(payload.slice(0, colonIdx));
    const encBytes = hex2buf(payload.slice(colonIdx + 1));
    
    // Create 32-byte key from PW_KEY
    const keyBytes = new Uint8Array(32);
    const pwKeyBytes = str2buf(PW_KEY);
    keyBytes.set(pwKeyBytes);
    
    // Extract auth tag (last 16 bytes) and ciphertext
    const authTag = encBytes.slice(-16);
    const ciphertext = encBytes.slice(0, -16);
    
    // Combine ciphertext and auth tag for Web Crypto API
    const combined = new Uint8Array(ciphertext.length + authTag.length);
    combined.set(ciphertext);
    combined.set(authTag, ciphertext.length);
    
    // Import key
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyBytes,
      { name: 'AES-GCM' },
      false,
      ['decrypt']
    );
    
    // Decrypt
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: iv },
      cryptoKey,
      combined
    );
    
    // Convert to string and parse JSON
    const decoder = new TextDecoder();
    const jsonStr = decoder.decode(decrypted);
    return JSON.parse(jsonStr);
  } catch (e) {
    console.error('Decrypt error:', e);
    return null;
  }
}

// Safe decrypt with error handling
export async function safeDecrypt(payload) {
  try {
    if (!payload || typeof payload !== 'string') return null;
    return await decrypt(payload);
  } catch (_) {
    return null;
  }
}

// Alias for compatibility
export async function decryptData(payload) {
  try {
    if (!payload || typeof payload !== 'string') {
      return { success: false, data: null };
    }
    const result = await decrypt(payload);
    if (result) {
      return { success: true, data: result };
    }
    return { success: false, data: null };
  } catch (e) {
    console.error('decryptData error:', e);
    return { success: false, data: null };
  }
}
