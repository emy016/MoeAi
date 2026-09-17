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

      for (const src of dependencies) {
        await loadScript(src);
        if (cancelled) return;
      }

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
