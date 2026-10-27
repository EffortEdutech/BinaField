import type { Settings } from './config';

export interface Session { accessToken: string; refreshToken: string; expiresAt: number; email: string }
const KEY = 'bf.session';

export function loadSession(): Session | null { try { return JSON.parse(localStorage.getItem(KEY) ?? 'null'); } catch { return null; } }
function save(s: Session | null) { try { s ? localStorage.setItem(KEY, JSON.stringify(s)) : localStorage.removeItem(KEY); } catch { /* storage unavailable */ } }
export function logout() { save(null); }

async function token(set: Settings, body: Record<string, string>, grant: string): Promise<Session> {
  const r = await fetch(`${set.supabaseUrl}/auth/v1/token?grant_type=${grant}`, { method: 'POST', headers: { apikey: set.anonKey, 'content-type': 'application/json' }, body: JSON.stringify(body) });
  if (!r.ok) throw new Error(r.status === 400 ? 'LOGIN_REJECTED' : 'AUTH_UNAVAILABLE');
  const j = await r.json();
  const s: Session = { accessToken: j.access_token, refreshToken: j.refresh_token, expiresAt: Date.now() + (j.expires_in ?? 3600) * 1000, email: j.user?.email ?? '' };
  save(s); return s;
}
export const login = (set: Settings, email: string, password: string) => token(set, { email, password }, 'password');

/** Returns a usable access token. Offline, or when refresh is impossible, the stored session is returned and the server decides. */
export async function accessToken(set: Settings): Promise<string | null> {
  const s = loadSession(); if (!s) return null;
  if (s.expiresAt - Date.now() > 60_000) return s.accessToken;
  try { return (await token(set, { refresh_token: s.refreshToken }, 'refresh_token')).accessToken; }
  catch { return s.accessToken; }
}
export const hasSession = () => loadSession() !== null;
