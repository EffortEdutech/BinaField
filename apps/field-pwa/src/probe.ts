// Environment probe for real-device spikes (ADR-0001 spikes 1 and 4). Reports facts only.
export type Probe = Record<string, string>;
export async function probe(): Promise<Probe> {
  const p: Probe = {};
  p['secure context'] = String(window.isSecureContext);
  p['service worker'] = String('serviceWorker' in navigator);
  p['OPFS'] = String(!!(navigator.storage && (navigator.storage as any).getDirectory));
  p['standalone (installed)'] = String(window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone === true);
  try { p['storage persisted'] = String(await navigator.storage.persisted()); } catch { p['storage persisted'] = 'unsupported'; }
  try { const e = await navigator.storage.estimate(); p['quota / usage (MB)'] = `${Math.round((e.quota ?? 0) / 1048576)} / ${Math.round((e.usage ?? 0) / 1048576)}`; } catch { p['quota / usage (MB)'] = 'unsupported'; }
  p['user agent'] = navigator.userAgent;
  return p;
}
export async function requestPersist() { try { return await navigator.storage.persist(); } catch { return false; } }
