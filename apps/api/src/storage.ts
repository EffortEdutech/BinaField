import { createHash } from 'node:crypto';

/** Private object storage for evidence bytes (ADR-0006). The API never proxies the upload; the phone PUTs to a short-lived signed URL. */
export interface EvidenceStorage {
  /** Returns a URL the phone can PUT the file to, valid for a short time. */
  signUpload(key: string): Promise<{ url: string }>;
  /** Reads the stored object and returns its size and SHA-256, or null when the object does not exist. */
  hashObject(key: string): Promise<{ size: number; sha256: string } | null>;
}

const BUCKET = 'evidence';

/** Supabase Storage over its REST API. The secret key stays in the API's environment and never reaches a client. */
export function createSupabaseStorage(supabaseUrl: string, secretKey: string): EvidenceStorage {
  const base = supabaseUrl.replace(/\/+$/, '');
  const auth = { apikey: secretKey, authorization: `Bearer ${secretKey}` };
  const path = (key: string) => key.split('/').map(encodeURIComponent).join('/');
  return {
    async signUpload(key) {
      const r = await fetch(`${base}/storage/v1/object/upload/sign/${BUCKET}/${path(key)}`, { method: 'POST', headers: auth });
      if (!r.ok) throw new Error('STORAGE_SIGN_FAILED');
      const b = (await r.json()) as { url?: string };
      if (!b.url) throw new Error('STORAGE_SIGN_FAILED');
      return { url: `${base}/storage/v1${b.url}` };
    },
    async hashObject(key) {
      const r = await fetch(`${base}/storage/v1/object/${BUCKET}/${path(key)}`, { headers: auth });
      if (r.status === 404 || r.status === 400) return null;
      if (!r.ok || !r.body) throw new Error('STORAGE_READ_FAILED');
      const h = createHash('sha256'); let size = 0;
      const reader = r.body.getReader();
      for (;;) { const { done, value } = await reader.read(); if (done) break; h.update(value); size += value.byteLength; }
      return { size, sha256: h.digest('hex') };
    }
  };
}
