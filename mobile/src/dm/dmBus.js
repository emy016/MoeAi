/**
 * Opening the DM from anywhere: an in-app notification, a web push the
 * student tapped (it lands on /moeai?dm=1&reply=...), or the Community tab.
 * The navigator listens and switches to Community; the DM picks up the
 * message being replied to.
 */
const listeners = new Set();
let pending = null;

export const DM_KINDS = new Set(['dm', 'deadline', 'start', 'fun', 'night', 'dormant']);

export function openDM(replyTo = '') {
  pending = { replyTo: String(replyTo || '').slice(0, 300), at: Date.now() };
  listeners.forEach((fn) => { try { fn(pending); } catch (_) {} });
}

export function onOpenDM(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** The reply a notification left for the DM, handed over once. */
export function takePendingReply() {
  const value = pending && Date.now() - pending.at < 60_000 ? pending.replyTo : '';
  pending = null;
  return value;
}

/** A push notification click opens /moeai?dm=1&reply=...: turn it into openDM once, then clean the URL. */
export function consumeLaunchLink() {
  if (typeof window === 'undefined' || !window.location) return;
  const params = new URLSearchParams(window.location.search);
  if (params.get('dm') !== '1') return;
  const reply = params.get('reply') || '';
  params.delete('dm'); params.delete('reply');
  const rest = params.toString();
  try { window.history.replaceState(null, '', `${window.location.pathname}${rest ? `?${rest}` : ''}${window.location.hash}`); } catch (_) {}
  setTimeout(() => openDM(reply), 300);
}
