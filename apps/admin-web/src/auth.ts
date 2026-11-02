export interface Session { accessToken: string; refreshToken: string; expiresAt: number; email: string }
const KEY = "bf.admin.session";
const SUPABASE_URL = "https://plpaixewllldutjrjljg.supabase.co";
const ANON_KEY = "sb_publishable_nwgPId71eV6WnxgZ91NtiA_N6VjGuKQ";
export const loadSession = (): Session | null => { try { return JSON.parse(localStorage.getItem(KEY) ?? "null"); } catch { return null; } };
const save = (session: Session | null) => { try { session ? localStorage.setItem(KEY, JSON.stringify(session)) : localStorage.removeItem(KEY); } catch { /* storage unavailable */ } };
export const logout = () => save(null);
export async function login(email: string, password: string): Promise<Session> {
  const r = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, { method: "POST", headers: { apikey: ANON_KEY, "content-type": "application/json" }, body: JSON.stringify({ email, password }) });
  if (!r.ok) throw new Error(r.status === 400 ? "LOGIN_REJECTED" : "AUTH_UNAVAILABLE");
  const j = await r.json(); const session = { accessToken: j.access_token, refreshToken: j.refresh_token, expiresAt: Date.now() + (j.expires_in ?? 3600) * 1000, email: j.user?.email ?? email }; save(session); return session;
}
export async function refreshSession(session: Session): Promise<Session> {
  const r = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, { method: "POST", headers: { apikey: ANON_KEY, "content-type": "application/json" }, body: JSON.stringify({ refresh_token: session.refreshToken }) });
  if (!r.ok) throw new Error("SESSION_EXPIRED");
  const j = await r.json(); const next = { accessToken: j.access_token, refreshToken: j.refresh_token ?? session.refreshToken, expiresAt: Date.now() + (j.expires_in ?? 3600) * 1000, email: j.user?.email ?? session.email }; save(next); return next;
}
