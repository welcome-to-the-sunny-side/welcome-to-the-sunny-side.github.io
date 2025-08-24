// Dedicated worker to perform scrypt KDF and AES-GCM decryption off the main thread
// This keeps the UI responsive (e.g., decrypt button animation) during heavy computation.

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import scryptPkg from 'scrypt-js';
const { scrypt } = scryptPkg as any;

// Types duplicated locally to avoid importing from Svelte files
export type PrivateBlob = {
  v: number;
  id: string;
  ts: string;
  tier: 'master';
  kdf: { name: 'scrypt'; N: number; r: number; p: number; salt: string };
  alg: 'AES-256-GCM';
  iv: string; // base64
  ad: string; // additional authenticated data
  ct: string; // base64 (ciphertext+tag)
};

function b64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

self.onmessage = async (ev: MessageEvent) => {
  const { id, blob, pass } = ev.data as { id: string; blob: PrivateBlob; pass: string };
  try {
    if (!pass) throw new Error('Empty passphrase');

    const enc = new TextEncoder();
    const passBytes = enc.encode(pass);
    const salt = b64ToBytes(blob.kdf.salt);
    const dkLen = 32;

    // Using progress callback just in case the library yields internally
    const derived = await scrypt(
      passBytes,
      salt,
      blob.kdf.N,
      blob.kdf.r,
      blob.kdf.p,
      dkLen,
      (_progress: number) => {}
    );

    const key = await crypto.subtle.importKey('raw', derived, { name: 'AES-GCM' } as any, false, ['decrypt']);
    const iv = b64ToBytes(blob.iv);
    const ct = b64ToBytes(blob.ct);
    const ad = enc.encode(blob.ad ?? `musings:${blob.id}:v${blob.v ?? 1}`);

    const plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv, additionalData: ad } as any, key, ct);
    const json = new TextDecoder().decode(plaintext);
    const obj = JSON.parse(json);

    (self as any).postMessage({ id, ok: true, md: obj.md });
  } catch (err: any) {
    (self as any).postMessage({ id, ok: false, error: err?.message ?? String(err) });
  }
};
