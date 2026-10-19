// Decrypts private musings off the main thread (scrypt KDF + AES-GCM), so the
// page (e.g. the decrypt button's animation) stays responsive.
import scryptPkg from 'scrypt-js';

const { scrypt } = scryptPkg;

function b64ToBytes(b64) {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

self.onmessage = async (ev) => {
  const { id, blob, pass } = ev.data;
  try {
    if (!pass) throw new Error('Empty passphrase');
    const enc = new TextEncoder();
    const derived = await scrypt(enc.encode(pass), b64ToBytes(blob.kdf.salt), blob.kdf.N, blob.kdf.r, blob.kdf.p, 32);
    const key = await crypto.subtle.importKey('raw', derived, { name: 'AES-GCM' }, false, ['decrypt']);
    const ad = enc.encode(blob.ad ?? `musings:${blob.id}:v${blob.v ?? 1}`);
    const plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: b64ToBytes(blob.iv), additionalData: ad }, key, b64ToBytes(blob.ct));
    self.postMessage({ id, ok: true, md: JSON.parse(new TextDecoder().decode(plaintext)).md });
  } catch (err) {
    self.postMessage({ id, ok: false, error: err?.message ?? String(err) });
  }
};
