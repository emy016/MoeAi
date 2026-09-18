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

export const API_BASE_URL = String(fromEnv || fromConfig || 'https://moe-ai-sable.vercel.app').replace(/\/+$/, '');
