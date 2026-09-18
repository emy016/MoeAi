/**
 * Where the tutor lives.
 *
 * Point this at a deployment to talk to a real MoeAI. On a physical phone,
 * `localhost` is the phone, not your laptop — use the deployed URL, or your
 * machine's LAN address (http://192.168.x.x:3000) while developing.
 *
 * Override without editing this file by setting `extra.apiBaseUrl` in
 * app.json, or EXPO_PUBLIC_MOEAI_API_URL in the environment.
 */
import Constants from 'expo-constants';

const fromConfig = Constants?.expoConfig?.extra?.apiBaseUrl;
// Metro inlines EXPO_PUBLIC_* at build time; guard anyway so this module
// also loads anywhere `process` is not defined.
const fromEnv = typeof process !== 'undefined' ? process.env?.EXPO_PUBLIC_MOEAI_API_URL : undefined;

/**
 * Served from the EduMoe site itself, the tutor is on this very origin — which
 * also means the request carries the student's session cookie, so a signed-in
 * student gets their rooms, their library and their memory. Falls back to the
 * deployment for a native build, where there is no origin to speak of.
 */
const sameOrigin = typeof window !== 'undefined' && window.location?.origin
  && !/^file:/.test(window.location.origin) ? window.location.origin : '';

export const API_BASE_URL = String(fromEnv || fromConfig || sameOrigin || 'https://moe-ai-sable.vercel.app').replace(/\/+$/, '');

/** Where EduMoe's students already are. */
export const TELEGRAM_URL = 'https://t.me/CS_Epic_Save';
