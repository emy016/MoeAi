/**
 * Auth glue for the ported pages.
 *
 * The original homepage shipped finished login and signup modals whose submit
 * buttons said "connect to Supabase". These are the functions those buttons
 * now call. Everything goes through /api/auth so the pages need no SDK and the
 * session cookie is written by the server.
 *
 * Hand-written, not generated. scripts/port-legacy.py only points the markup
 * at these names.
 */
(function () {
  'use strict';

  function say(message) {
    if (typeof showToast === 'function') showToast(message);
    else console.log('[auth]', message);
  }

  function value(id) {
    var el = document.getElementById(id);
    return el ? el.value.trim() : '';
  }

  function shut(id) {
    if (typeof closeModal === 'function') closeModal(id);
  }

  async function post(payload) {
    var res = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    var body = {};
    try { body = await res.json(); } catch (e) {}
    return { ok: res.ok, body: body };
  }

  window.EDUMOE_LOGIN = async function () {
    var email = value('loginId');
    var password = value('loginPassword');
    if (!email || !password) { say('Enter your email and password.'); return; }

    say('Signing you in…');
    var r = await post({ action: 'login', email: email, password: password });
    if (!r.ok) { say(r.body.error || 'Could not sign you in.'); return; }

    shut('loginModal');
    say('Welcome back.');
    // Reload so every page script re-reads state as the signed-in student:
    // progress, ranked rating and dashboard numbers all hydrate on load.
    setTimeout(function () { location.reload(); }, 500);
  };

  window.EDUMOE_SIGNUP = async function () {
    var email = value('signupEmail');
    var password = value('signupPassword');
    var name = value('signupUsername');
    if (!email || !password) { say('Enter an email and a password.'); return; }
    if (password.length < 8) { say('Use at least 8 characters.'); return; }

    say('Creating your account…');
    var r = await post({ action: 'signup', email: email, password: password, name: name });
    if (!r.ok) { say(r.body.error || 'Could not create that account.'); return; }

    shut('signupModal');
    say(r.body.message || 'Account created.');
    if (r.body.confirmed) setTimeout(function () { location.reload(); }, 600);
  };

  window.EDUMOE_GOOGLE = async function () {
    var r = await post({ action: 'google', next: location.pathname });
    if (!r.ok || !r.body.url) { say(r.body.error || 'Google sign-in is unavailable.'); return; }
    location.href = r.body.url;
  };

  window.EDUMOE_LOGOUT = async function () {
    await post({ action: 'logout' });
    say('Signed out.');
    setTimeout(function () { location.reload(); }, 400);
  };

  /**
   * Swap the Log in / Sign up pair for the student's name once they are signed
   * in. Every ported page carries the same two buttons, so this runs on all of
   * them rather than only the homepage.
   */
  window.EDUMOE_AUTH_REFRESH = async function () {
    var me;
    try {
      var res = await fetch('/api/auth', { cache: 'no-store' });
      if (!res.ok) return;
      me = await res.json();
    } catch (e) { return; }
    if (!me || !me.signedIn) return;

    var login = document.querySelector('.nav-auth-btn');
    var signup = document.querySelector('.nav-cta');

    if (login) {
      var label = login.querySelector('span');
      if (label) label.textContent = me.name;
      login.onclick = function () { location.href = '/dashboard'; };
      login.title = me.email || '';
    }

    if (signup) {
      signup.textContent = 'Sign out';
      signup.onclick = function () { window.EDUMOE_LOGOUT(); };
    }

    document.documentElement.setAttribute('data-signed-in', 'true');
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', window.EDUMOE_AUTH_REFRESH);
  } else {
    setTimeout(window.EDUMOE_AUTH_REFRESH, 0);
  }
})();
