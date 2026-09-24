/**
 * The student's MoeAI account, from the app's side.
 *
 * Signing in goes through the site's own /api/auth (Supabase Auth behind
 * it), which sets the session cookie; served from the same site, the app then
 * carries that session on every request, so the tutor sees who is asking
 * (their memory, course material, rate limit) and /api/state keeps their
 * data. Signed out, everything keeps working on the device as before.
 */
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Linking, Platform } from 'react-native';
import { API_BASE_URL } from '../ai/client';
import { startCloudSync } from './cloudSync';

const AccountContext = createContext(null);

/** A page of the site (onboarding, account settings): same tab on the web, the browser on a phone. */
function openSite(path) {
  const url = `${API_BASE_URL}${path}`;
  if (Platform.OS === 'web' && typeof window !== 'undefined') window.location.assign(url);
  else Linking.openURL(url);
}

async function call(path, body) {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: body ? 'POST' : 'GET',
    credentials: 'include',
    headers: body ? { 'Content-Type': 'application/json', Accept: 'application/json' } : { Accept: 'application/json' },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  let data = {};
  try { data = await res.json(); } catch (_) {}
  if (!res.ok) throw new Error(data?.error || 'Something went wrong. Try again.');
  return data;
}

export function AccountProvider({ children }) {
  const [account, setAccount] = useState({ status: 'loading' });
  const [sync, setSync] = useState({ state: 'idle', at: 0 });
  const [sheetOpen, setSheetOpen] = useState(false);
  // Bumped when another device's data arrives, so every store reloads it.
  const [revision, setRevision] = useState(0);
  const syncRef = useRef(null);

  const refresh = useCallback(async () => {
    try {
      const me = await call('/api/auth');
      setAccount(me?.signedIn ? { status: 'signedIn', name: me.name, email: me.email, handle: me.handle || null, onboarded: me.onboarded !== false, org: me.org || null } : { status: 'guest' });
    } catch (_) {
      setAccount({ status: 'guest', offline: true });
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  useEffect(() => {
    if (account.status !== 'signedIn') return undefined;
    const session = startCloudSync({ onStatus: setSync, onRemoteApplied: () => setRevision((n) => n + 1) });
    syncRef.current = session;
    return () => { session.stop(); syncRef.current = null; };
  }, [account.status]);

  const signIn = useCallback(async (identifier, password) => {
    const result = await call('/api/auth', { action: 'login', identifier, password });
    // Two-step verification finishes on the site's verification page.
    if (result?.mfa) { openSite('/start/mfa?next=/moeai'); return result; }
    await refresh();
    return result;
  }, [refresh]);


  // Google and Apple come back through the onboarding router, so a first-time
  // account still picks a handle and accepts the terms before reaching the app.
  const signInWithProvider = useCallback(async (provider) => {
    const { url } = await call('/api/auth', { action: 'oauth', provider, next: '/start/continue?next=/moeai' });
    if (Platform.OS === 'web' && typeof window !== 'undefined') window.location.assign(url);
    else Linking.openURL(url);
  }, []);
  const signInWithGoogle = useCallback(() => signInWithProvider('google'), [signInWithProvider]);
  const signInWithApple = useCallback(() => signInWithProvider('apple'), [signInWithProvider]);

  // A university account's courses: what its faculty set up, replacing the sample subjects.
  const [orgCourses, setOrgCourses] = useState([]);
  useEffect(() => {
    if (account.status !== 'signedIn' || !account.org) { setOrgCourses([]); return undefined; }
    let alive = true;
    call('/api/org/courses').then((data) => { if (alive) setOrgCourses(Array.isArray(data?.courses) ? data.courses : []); }).catch(() => {});
    return () => { alive = false; };
  }, [account.status, account.org]);

  /** The university sign-in lives on the site; it comes back to the app signed in. */
  const signInWithUniversity = useCallback(() => openSite('/sso?next=/moeai'), []);

  const signOut = useCallback(async () => {
    await syncRef.current?.flush().catch?.(() => {});
    await call('/api/auth', { action: 'logout' }).catch(() => {});
    setSync({ state: 'idle', at: 0 });
    setAccount({ status: 'guest' });
  }, []);

  const value = useMemo(() => ({
    account, sync, revision, sheetOpen, orgCourses, signInWithUniversity,
    openAccount: () => setSheetOpen(true),
    closeAccount: () => setSheetOpen(false),
    refresh, signIn, signInWithGoogle, signInWithApple, signOut, openSite,
  }), [account, orgCourses, refresh, revision, sheetOpen, signIn, signInWithApple, signInWithGoogle, signInWithUniversity, signOut, sync]);

  return <AccountContext.Provider value={value}>{children}</AccountContext.Provider>;
}

export function useAccount() {
  return useContext(AccountContext) || { account: { status: 'guest' }, sync: { state: 'idle' }, revision: 0, sheetOpen: false, orgCourses: [], openAccount() {}, closeAccount() {}, signInWithUniversity() {}, openSite };
}

/** "Mariam Adel" and "@mariam.adel" for the profile pill; guests see a sign-in prompt. */
export function accountLabels(account, t) {
  if (account.status !== 'signedIn') return { displayName: t('guest'), handle: t('signInShort') };
  const handle = account.handle || String(account.email || '').split('@')[0];
  return { displayName: account.name || handle || t('student'), handle: handle ? `@${handle}` : '' };
}
