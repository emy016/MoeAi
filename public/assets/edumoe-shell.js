/**
 * The EduMoe site's shared shell, on every page:
 *
 * 1. A bottom dock on phones and tablets (≤1024px), in the MoeAI app's style:
 *    a floating pill, the current page highlighted, links that actually
 *    navigate (the old bar cancelled its own clicks), and room for the phone's
 *    home indicator. Replaces each page's own bottom bar.
 * 2. Liquid glass everywhere, kept light where it costs the most. Desktop
 *    gets the full glass (blur, saturation, reflections, drifting orbs). On phones and low-power machines (html.perf-low, set by each
 *    page) the glass keeps its look with a smaller blur and no saturation
 *    pass, and the orbs behind it stop drifting: a backdrop blur over
 *    something that changes every frame is recomputed every frame.
 *
 * Not used inside the MoeAI app (embedded pages opt out with ?embed=1).
 */
(function () {
  if (/[?&]embed=1/.test(location.search) || document.documentElement.classList.contains('embed')) return;

  // Same rule the home page uses; the other pages never set it.
  (function () {
    var html = document.documentElement;
    if (html.classList.contains('perf-low')) return;
    var cores = navigator.hardwareConcurrency || 4, mem = navigator.deviceMemory || 4;
    var coarse = window.matchMedia('(pointer: coarse)').matches, small = window.matchMedia('(max-width: 900px)').matches;
    if (cores <= 4 || mem <= 4 || (coarse && small)) { html.classList.add('perf-low'); window.__perfLow = true; }
  })();

  var css = [
    'html.perf-low .lg-effect { -webkit-backdrop-filter: blur(9px) !important; backdrop-filter: blur(9px) !important; }',
    'html.perf-low .navbar { -webkit-backdrop-filter: blur(10px) !important; backdrop-filter: blur(10px) !important; }',
    // The orbs were radial gradients blurred by 120px, which cost more than all
    // the glass together (4 fps vs 33 in the test browser). The same soft glow
    // is drawn as a wider gradient with an eased falloff and no filter.
    '.bg-orb { filter: none !important; }',
    '.bg-orb-1 { background: radial-gradient(circle, color-mix(in srgb, var(--accent) 16%, transparent) 0%, color-mix(in srgb, var(--accent) 9%, transparent) 30%, color-mix(in srgb, var(--accent) 3%, transparent) 55%, transparent 72%) !important; }',
    '.bg-orb-2 { background: radial-gradient(circle, color-mix(in srgb, var(--accent2) 13%, transparent) 0%, color-mix(in srgb, var(--accent2) 7%, transparent) 30%, color-mix(in srgb, var(--accent2) 2.5%, transparent) 55%, transparent 72%) !important; }',
    '.bg-orb-3 { background: radial-gradient(circle, color-mix(in srgb, var(--accent3) 10%, transparent) 0%, color-mix(in srgb, var(--accent3) 5%, transparent) 30%, color-mix(in srgb, var(--accent3) 2%, transparent) 55%, transparent 72%) !important; }',
    'html.perf-low .bg-orb { animation: none !important; will-change: auto !important; }',
    // Bigger by default on computers: the pages were designed small, and
    // everyone was zooming in by hand. Phones and tablets keep 100%.
    'html, body { overflow-x: clip; }',
    // The top bar keeps its original size: it is zoomed back out by the same factor.
    '@media (min-width: 1025px) { html:not(.embed) { zoom: 1.1; } html:not(.embed) .navbar { zoom: 0.90909; } }',
    '@media (min-width: 1280px) { html:not(.embed) { zoom: 1.2; } html:not(.embed) .navbar { zoom: 0.83333; } }',
    '@media (min-width: 1600px) { html:not(.embed) { zoom: 1.25; } html:not(.embed) .navbar { zoom: 0.8; } }',
    '.bottom-tab-bar { display: none !important; }',
    '.em-dock { position: fixed; left: 50%; bottom: calc(10px + env(safe-area-inset-bottom, 0px)); transform: translateX(-50%); z-index: 1200;',
    '  display: none; align-items: center; gap: 2px; padding: 6px; border-radius: 28px; width: min(calc(100% - 24px), 440px); box-sizing: border-box;',
    '  background: rgba(35,37,44,0.62); -webkit-backdrop-filter: blur(18px) saturate(160%); backdrop-filter: blur(18px) saturate(160%);',
    '  box-shadow: inset 1px 1.5px 0 -0.5px rgba(255,255,255,0.22), inset -1px -1px 0 -0.5px rgba(255,255,255,0.12), inset 0 0 0 1px rgba(255,255,255,0.06), 0 10px 30px rgba(0,0,0,0.35);',
    '  font-family: "Nunito Sans", system-ui, sans-serif; }',
    'html.perf-low .em-dock { -webkit-backdrop-filter: blur(10px); backdrop-filter: blur(10px); background: rgba(35,37,44,0.78); }',
    'html[data-theme="light"] .em-dock { background: rgba(255,255,255,0.7); box-shadow: inset 1px 1.5px 0 -0.5px rgba(255,255,255,0.9), inset 0 0 0 1px rgba(20,10,40,0.06), 0 10px 30px rgba(20,10,40,0.15); }',
    '.em-dock a { flex: 1; min-width: 0; display: grid; justify-items: center; gap: 2px; padding: 7px 2px 6px; border-radius: 22px; color: #8d8f95; text-decoration: none; font-size: 10.5px; font-weight: 700; -webkit-tap-highlight-color: transparent; transition: color .2s, background .2s; }',
    '.em-dock a svg { width: 22px; height: 22px; }',
    '.em-dock a.on { color: #F5F4F2; background: rgba(255,255,255,0.09); }',
    'html[data-theme="light"] .em-dock a.on { color: #24212A; background: rgba(36,33,42,0.07); }',
    '.em-dock a.center { color: #fff; }',
    '.em-dock a.center .em-orb { width: 42px; height: 42px; margin-top: -2px; border-radius: 50%; display: grid; place-items: center; background: #ea4349; box-shadow: 0 6px 16px rgba(234,67,73,0.4); }',
    '.em-dock a.center span { display: none; }',
    '.em-dock a:active { transform: scale(0.95); }',
    '@media (max-width: 1024px) { .em-dock { display: flex; } body { padding-bottom: calc(86px + env(safe-area-inset-bottom, 0px)) !important; } }',
    '@media (max-width: 700px) { .navbar :not(.theme-pop) > .theme-dot, .navbar :not(.theme-pop) > .custom-color-wrap, .navbar [class*="theme-switch"]:not(:has(.theme-trigger)), .navbar .theme-dots { display: none !important; } .navbar { max-width: calc(100vw - 24px); box-sizing: border-box; } .hero { padding-left: 16px !important; padding-right: 16px !important; } h1, .hero h1 { overflow-wrap: anywhere; } }',
    '@media (prefers-reduced-motion: reduce) { .bg-orb { animation: none !important; } }',
  ].join('\n');
  var style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);

  var ICON = {
    home: '<path d="M3 11.5 12 4l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
    courses: '<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z"/><path d="M4 20.5A2.5 2.5 0 0 0 6.5 23H20v-5"/>',
    sims: '<rect x="6" y="6" width="12" height="12" rx="2"/><path d="M9 2v4M15 2v4M9 18v4M15 18v4M2 9h4M2 15h4M18 9h4M18 15h4"/>',
    ranked: '<path d="M8 21h8M12 17v4M7 4h10v4a5 5 0 0 1-10 0z"/><path d="M17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3"/>',
  };
  var MARK = '<svg viewBox="0 0 120 120" width="24" height="24" aria-hidden="true"><path fill="#fff" fill-rule="evenodd" d="M35.7 17.2L1 92.5L1 103.4L60.3 72.4L119 103.6L119 92.5L84.2 16.8L60.1 53L36.1 16.9ZM36.5 27.9L3.8 97.8L39.4 78.7L54.2 70.1L38.3 48.5L19.4 84.5L12 88.7L37.6 38.4L59.9 70L82.8 38.4L108 88.8L100.8 84.6L81.7 48.5L65.9 70.1L116.2 97.8L83.5 27.7L60.1 62.1L36.8 27.6Z"/></svg>';
  var ITEMS = [
    { href: '/', label: 'Home', icon: 'home', match: /^\/(index(\.html)?)?$/ },
    { href: '/courses', label: 'Courses', icon: 'courses', match: /^\/(courses|lecture)/ },
    { href: '/moeai', label: 'MoeAI', center: true, match: /^\/moeai/ },
    { href: '/simulators', label: 'Simulators', icon: 'sims', match: /^\/simulators/ },
    { href: '/ranked', label: 'Ranked', icon: 'ranked', match: /^\/(ranked|quizzes)/ },
  ];

  function build() {
    if (document.querySelector('.em-dock')) return;
    var nav = document.createElement('nav');
    nav.className = 'em-dock';
    nav.setAttribute('aria-label', 'EduMoe');
    var path = location.pathname.replace(/\/+$/, '') || '/';
    nav.innerHTML = ITEMS.map(function (it) {
      var on = it.match.test(path);
      var icon = it.center
        ? '<span class="em-orb">' + MARK + '</span>'
        : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + ICON[it.icon] + '</svg>';
      return '<a href="' + it.href + '" class="' + (on ? 'on ' : '') + (it.center ? 'center' : '') + '"' + (on ? ' aria-current="page"' : '') + '>' + icon + '<span>' + it.label + '</span></a>';
    }).join('');
    document.body.appendChild(nav);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build); else build();
})();
