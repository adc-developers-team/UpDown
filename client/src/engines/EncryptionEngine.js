const encoder = new TextEncoder();
const decoder = new TextDecoder();

const generateKey = async () => {
  return await crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );
};

const exportKey = async (key) => {
  const exported = await crypto.subtle.exportKey('jwk', key);
  return JSON.stringify(exported);
};

const importKey = async (jwkString) => {
  const jwk = JSON.parse(jwkString);
  return await crypto.subtle.importKey('jwk', jwk, { name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
};

const encrypt = async (text, key) => {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = encoder.encode(text);
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded);
  const combined = new Uint8Array(iv.length + ciphertext.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(ciphertext), iv.length);
  return btoa(String.fromCharCode(...combined));
};

const decrypt = async (ciphertext, key) => {
  const combined = Uint8Array.from(atob(ciphertext), c => c.charCodeAt(0));
  const iv = combined.slice(0, 12);
  const data = combined.slice(12);
  const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, data);
  return decoder.decode(decrypted);
};

export { generateKey, exportKey, importKey, encrypt, decrypt };
