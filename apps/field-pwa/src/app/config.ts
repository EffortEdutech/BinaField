// Pilot defaults point at the BinaField demo organisation and device. Only publishable values live here; every one can be changed on the Settings screen.
export interface Settings { apiBase: string; supabaseUrl: string; anonKey: string; organizationId: string; deviceId: string }
export const DEFAULTS: Settings = {
  apiBase: 'https://binafield-api.vercel.app/api',
  supabaseUrl: 'https://plpaixewllldutjrjljg.supabase.co',
  anonKey: 'sb_publishable_nwgPId71eV6WnxgZ91NtiA_N6VjGuKQ',
  organizationId: 'a0000000-0000-4000-8000-000000000001',
  deviceId: 'a0000000-0000-4000-8000-000000000005'
};
const KEY = 'bf.settings';
export function loadSettings(): Settings {
  try { return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) ?? '{}') }; } catch { return { ...DEFAULTS }; }
}
export function saveSettings(s: Settings) { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* storage unavailable */ } }
