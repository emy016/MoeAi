"use client";
/**
 * Runtime support for the ported pages.
 *
 * The original site was seven standalone HTML documents: markup, a <style>
 * block, and one big vanilla-JS <script> at the end of <body>. The port keeps
 * all three intact, so this module's only job is to reproduce the two things
 * the browser used to do for free.
 */
import { useEffect, useRef } from "react";

/**
 * Reproduce inline-handler semantics for a converted `onclick="..."`.
 *
 * The originals use both `this` (the element) and, in places, `event`. Rather
 * than hand-translating ~180 handlers — every one a chance to introduce a bug
 * the compiler cannot catch — each is compiled the same way the browser
 * compiles an inline handler: as a function body, with `this` bound to the
 * element it sits on. The code is our own, copied verbatim from files in this
 * repository; no user input ever reaches it.
 */
export function legacyHandler(code: string) {
  return (event: { currentTarget: unknown }) => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-implied-eval, no-new-func
      new Function("event", code).call(event.currentTarget, event);
    } catch (err) {
      console.error("[legacy handler]", code, err);
    }
  };
}


/**
 * Keys the pages own. Anything under this prefix follows the student between
 * devices; anything else stays local to the browser.
 */
const SYNCED_PREFIX = "edumoe";

/**
 * Pull the student's saved state into localStorage before any page script runs.
 *
 * Order matters: every page reads localStorage during its own initialisation,
 * so this has to finish first or the page renders an empty account and then
 * quietly overwrites the real one.
 *
 * Conflict rule: the server wins for keys it already holds, and local-only keys
 * are pushed up. That means a student who used the site signed-out keeps the
 * progress they made, and a second device starts from what the account knows
 * rather than from nothing.
 */
async function hydrateState(): Promise<void> {
  let serverState: Record<string, unknown> = {};
  try {
    const res = await fetch("/api/state", { cache: "no-store" });
    if (!res.ok) return;
    serverState = (await res.json()).state ?? {};
  } catch {
    return; // Offline or signed out: the page works from localStorage alone.
  }

  const localOnly: Record<string, unknown> = {};

  try {
    for (const [key, value] of Object.entries(serverState)) {
      localStorage.setItem(key, typeof value === "string" ? value : JSON.stringify(value));
    }

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key || !key.startsWith(SYNCED_PREFIX)) continue;
      if (key in serverState) continue;
      const raw = localStorage.getItem(key);
      if (raw !== null) localOnly[key] = raw;
    }
  } catch {
    return; // Private mode or a full quota: not worth failing the page over.
  }

  if (Object.keys(localOnly).length) {
    void pushState(localOnly);
  }
}

async function pushState(state: Record<string, unknown>) {
  try {
    await fetch("/api/state", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ state }),
    });
  } catch {
    // A failed sync must never interrupt studying; the next write retries.
  }
}

let mirrorInstalled = false;

/**
 * Mirror future localStorage writes up to the account.
 *
 * The pages call localStorage.setItem directly and often — every answered
 * question, every lecture ticked off. Writes are batched and flushed on idle so
 * a quiz session is one request, not forty, and flushed again on pagehide so
 * closing the tab does not lose the last few seconds.
 */
function installMirror() {
  if (mirrorInstalled) return;
  mirrorInstalled = true;

  const pending = new Map<string, unknown>();
  let timer: number | undefined;

  const flush = () => {
    if (!pending.size) return;
    const batch = Object.fromEntries(pending);
    pending.clear();
    void pushState(batch);
  };

  const schedule = () => {
    window.clearTimeout(timer);
    timer = window.setTimeout(flush, 1500);
  };

  const original = localStorage.setItem.bind(localStorage);
  localStorage.setItem = (key: string, value: string) => {
    original(key, value);
    if (key.startsWith(SYNCED_PREFIX)) {
      pending.set(key, value);
      schedule();
    }
  };

  // pagehide rather than unload: it is the one that fires reliably on mobile.
  window.addEventListener("pagehide", flush);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") flush();
  });
}

function loadStylesheet(href: string) {
  if (document.querySelector(`link[href="${CSS.escape(href)}"]`)) return;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = href;
  document.head.appendChild(link);
}

function loadScript(src: string): Promise<void> {
  return new Promise((resolve) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${CSS.escape(src)}"]`);
    if (existing) {
      if (existing.dataset.loaded === "1") resolve();
      else existing.addEventListener("load", () => resolve(), { once: true });
      return;
    }
    const el = document.createElement("script");
    el.src = src;
    el.async = false; // preserve execution order between dependencies
    el.addEventListener("load", () => {
      el.dataset.loaded = "1";
      resolve();
    }, { once: true });
    // A missing CDN must not stop the page script from running.
    el.addEventListener("error", () => resolve(), { once: true });
    document.body.appendChild(el);
  });
}

/**
 * Load a page's third-party dependencies, then its own script.
 *
 * Two details matter:
 *
 *  1. The script is injected as a real <script> element rather than imported,
 *     so its top-level `function foo()` declarations land on `window` exactly
 *     as they did in the original document. The converted markup's handlers
 *     resolve against those globals.
 *
 *  2. Every page's script sets up through `DOMContentLoaded` and `load`. Both
 *     fired long before React mounted, so those listeners would never run.
 *     They are re-dispatched once the script has registered them, which is
 *     what actually starts the page: hiding the loader, animating the stats,
 *     wiring the canvas.
 */
export function useLegacyScripts(
  stylesheets: string[],
  dependencies: string[],
  pageScript: string,
) {
  const started = useRef(false);

  useEffect(() => {
    // React runs effects twice in development StrictMode; the script must not
    // be evaluated twice or its listeners would double up.
    if (started.current) return;
    started.current = true;

    let cancelled = false;

    (async () => {
      stylesheets.forEach(loadStylesheet);

      // Before anything else: the page is about to read localStorage during
      // its own init, so the account's state has to be in place already.
      await hydrateState();
      if (cancelled) return;
      installMirror();

      for (const src of dependencies) {
        await loadScript(src);
        if (cancelled) return;
      }

      // Auth glue before the page script: every ported page carries the same
      // Log in / Sign up buttons, and the homepage's modals call into it.
      await loadScript("/legacy/edumoe-auth.js");
      if (cancelled) return;

      await loadScript(pageScript);
      if (cancelled) return;

      document.dispatchEvent(new Event("DOMContentLoaded"));
      window.dispatchEvent(new Event("load"));
    })();

    return () => {
      cancelled = true;
    };
  }, [stylesheets, dependencies, pageScript]);
}
