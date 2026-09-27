/**
 * Browser notifications for MoeAI's messages (web only): the service worker
 * at /sw.js shows them even when the app is closed, like YouTube's in Chrome.
 */
import { API_BASE_URL } from '../ai/client';

const supported = () => typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

export const pushState = () => (!supported() ? 'unsupported' : Notification.permission); // 'default' | 'granted' | 'denied'

function keyBytes(base64) {
  const padded = `${base64}${'='.repeat((4 - (base64.length % 4)) % 4)}`.replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(padded);
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

/** Asks permission, subscribes this browser and saves it. Resolves to the new state. */
export async function enablePush() {
  if (!supported()) return 'unsupported';
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return permission;
  const { publicKey } = await fetch(`${API_BASE_URL}/api/push`).then((r) => r.json()).catch(() => ({}));
  if (!publicKey) return 'unavailable';
  const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
  await navigator.serviceWorker.ready;
  const subscription = (await registration.pushManager.getSubscription())
    || await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(publicKey) });
  const res = await fetch(`${API_BASE_URL}/api/push`, {
    method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ subscription: subscription.toJSON() }),
  });
  return res.ok ? 'granted' : 'unavailable';
}

/** Keeps an existing subscription registered (the browser can rotate it). */
export async function refreshPush() {
  if (!supported() || Notification.permission !== 'granted') return;
  try {
    const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    const subscription = await registration.pushManager.getSubscription();
    if (subscription) {
      await fetch(`${API_BASE_URL}/api/push`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ subscription: subscription.toJSON() }) });
    }
  } catch (_) {}
}
