/**
 * MoeAI's story so far, as a timeline. Used on the home page and on Why MoeAI:
 * a page adds <section id="journey"></section> and this script.
 *
 * Desktop: the section pins while a row of glass cards slides sideways. A line
 * along the top fills as you go, each dot lights up as its card reaches the
 * middle, and the card in the middle is brought forward. Phones: the same
 * cards stacked along a vertical line, each revealed as it scrolls in.
 *
 * Every picture is shown whole (object-fit: contain) over a blurred, dimmed
 * copy of itself, so tall phone screenshots and wide slides both fill the
 * frame without being cropped or left in empty bars.
 *
 * Needs GSAP + ScrollTrigger (loaded from jsDelivr) for the desktop version;
 * without them, or with reduced motion, it is a plain scrollable row.
 *
 * EDIT THE MILESTONES HERE.
 */
(function () {
  var MILESTONES = [
    { date: 'January 2026', text: 'CS Epic Save starts on Telegram: a study community for first-year Computer Science, built on revisions and summaries before exams.', img: '/assets/showcase/tg-thanks.webp' },
    { date: 'March 2026', text: 'The channel passes 140 students before the second semester of first year.', img: '/assets/showcase/tg-video.webp' },
    { date: 'Late April 2026', text: 'MoeAI is born: an AI that knows our Computer Science curriculum.', img: '/assets/showcase/tg-bot.webp' },
    { date: 'September 2026', text: 'The MoeAI app, built in React Native, opens to every university and organization.', img: '/assets/showcase/home-orange.webp' },
    { date: 'Late September 2026', text: 'Tutor mode arrives in the app: course staff upload lectures, run the calendar MoeAI is aware of, see their students and build simulators.', img: '/assets/showcase/tutor-app-light.webp' },
    { date: 'October 2026', text: 'MoeAI is pitched at the GenAI Hackathon 2026.', img: '/assets/showcase/hackathon.webp' },
  ];
  var CDN = 'https://cdn.jsdelivr.net/npm/gsap@3.13.0/dist/';

  var root = document.getElementById('journey');
  if (!root) return;

  var css = [
    '.mt { position: relative; --mt-accent: var(--accent, #e11d48); color: var(--txt1, #fff); }',
    '.mt-head { text-align: center; padding: 0 20px; margin-bottom: 34px; }',
    '.mt-eyebrow { display: inline-block; font-size: 12px; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; color: var(--mt-accent); margin-bottom: 10px; }',
    '.mt-head h2 { margin: 0; font-size: clamp(28px, 4vw, 46px); line-height: 1.05; letter-spacing: -.02em; }',
    '.mt-pin { position: relative; overflow: hidden; }',
    '.mt-track { position: relative; display: flex; gap: 56px; padding: 38px 8vw 40px; width: max-content; will-change: transform; }',
    '.mt-line { position: absolute; left: 0; right: 0; top: 49px; height: 2px; background: color-mix(in srgb, var(--mt-accent) 18%, transparent); border-radius: 2px; }',
    '.mt-fill { position: absolute; inset: 0; transform-origin: left; transform: scaleX(0); background: linear-gradient(90deg, color-mix(in srgb, var(--mt-accent) 55%, #fff), var(--mt-accent)); border-radius: 2px; box-shadow: 0 0 12px color-mix(in srgb, var(--mt-accent) 60%, transparent); }',
    '.mt-card { position: relative; flex: none; width: 390px; transition: transform .5s cubic-bezier(.2,.8,.2,1), opacity .5s; opacity: .55; transform: scale(.94); }',
    '.mt-card.on { opacity: 1; transform: none; }',
    '.mt-when { display: flex; align-items: center; gap: 10px; height: 24px; margin-bottom: 16px; }',
    '.mt-dot { width: 14px; height: 14px; border-radius: 50%; flex: none; background: var(--bg1, #07070b); border: 2px solid color-mix(in srgb, var(--mt-accent) 45%, transparent); transition: background .35s, border-color .35s, box-shadow .35s; }',
    '.mt-card.lit .mt-dot { background: var(--mt-accent); border-color: var(--mt-accent); box-shadow: 0 0 0 5px color-mix(in srgb, var(--mt-accent) 20%, transparent), 0 0 18px var(--mt-accent); }',
    '.mt-date { font-size: 13px; font-weight: 700; letter-spacing: .04em; text-transform: uppercase; color: var(--txt2, rgba(255,255,255,.7)); }',
    '.mt-card.lit .mt-date { color: var(--mt-accent); }',
    '.mt-body { border-radius: 22px; padding: 12px 12px 18px; border: 1px solid color-mix(in srgb, var(--mt-accent) 18%, rgba(255,255,255,.1));',
    '  background: color-mix(in srgb, var(--bg2, #0e0e16) 55%, transparent); -webkit-backdrop-filter: blur(14px) saturate(150%); backdrop-filter: blur(14px) saturate(150%);',
    '  box-shadow: inset 1px 1.5px 0 -0.5px rgba(255,255,255,.18), inset 0 0 0 1px rgba(255,255,255,.03), 0 18px 44px rgba(0,0,0,.32); transition: box-shadow .4s, border-color .4s; }',
    '.mt-card.on .mt-body { border-color: color-mix(in srgb, var(--mt-accent) 40%, rgba(255,255,255,.1)); box-shadow: inset 1px 1.5px 0 -0.5px rgba(255,255,255,.22), 0 24px 60px rgba(0,0,0,.4), 0 0 60px -18px color-mix(in srgb, var(--mt-accent) 60%, transparent); }',
    'html.perf-low .mt-body { -webkit-backdrop-filter: blur(8px); backdrop-filter: blur(8px); }',
    '.mt-shot { position: relative; height: 300px; border-radius: 14px; overflow: hidden; background: #0b0b10; }',
    '.mt-shot .bg { position: absolute; inset: -20px; width: calc(100% + 40px); height: calc(100% + 40px); object-fit: cover; filter: blur(18px) brightness(.45) saturate(1.3); }',
    '.mt-shot .fg { position: relative; display: block; width: 100%; height: 100%; object-fit: contain; padding: 10px; box-sizing: border-box; filter: drop-shadow(0 10px 20px rgba(0,0,0,.45)); transition: transform .6s cubic-bezier(.2,.8,.2,1); }',
    '.mt-card.on .mt-shot .fg { transform: scale(1.03); }',
    '.mt-body p { margin: 14px 6px 0; font-size: 15px; line-height: 1.5; color: var(--txt1, #fff); }',
    '@media (hover: hover) { .mt-card:hover .mt-body { transform: translateY(-4px); } .mt-body { transition: transform .35s, box-shadow .4s, border-color .4s; } }',
    // Phones and no-GSAP fallback
    '.mt.vertical .mt-pin { overflow: visible; }',
    '.mt.vertical .mt-track { flex-direction: column; width: auto; gap: 30px; padding: 0 18px 0 46px; max-width: 520px; margin: 0 auto; }',
    '.mt.vertical .mt-line { left: 24px; right: auto; top: 6px; bottom: 6px; width: 2px; height: auto; }',
    '.mt.vertical .mt-fill { transform-origin: top; transform: scaleY(0); }',
    '.mt.vertical .mt-card { width: 100%; opacity: 0; transform: translateY(26px); }',
    '.mt.vertical .mt-card.on { opacity: 1; transform: none; }',
    '.mt.vertical .mt-dot { position: absolute; left: -29px; top: 5px; }',
    '.mt.vertical .mt-shot { height: min(62vw, 300px); }',
    '.mt.static .mt-pin { overflow-x: auto; scroll-snap-type: x mandatory; } .mt.static .mt-card { opacity: 1; transform: none; scroll-snap-align: center; } .mt.static .mt-fill { transform: none; }',
    '@media (prefers-reduced-motion: reduce) { .mt-card, .mt-body, .mt-shot .fg { transition: none !important; } }',
  ].join('\n');
  var style = document.createElement('style'); style.textContent = css; document.head.appendChild(style);

  root.classList.add('mt');
  root.innerHTML = '<div class="mt-head"><span class="mt-eyebrow">So far</span><h2>From a Telegram channel to MoeAI.</h2></div>'
    + '<div class="mt-pin"><div class="mt-track"><div class="mt-line"><i class="mt-fill"></i></div>'
    + MILESTONES.map(function (m) {
      return '<article class="mt-card"><div class="mt-when"><span class="mt-dot"></span><span class="mt-date">' + m.date + '</span></div>'
        + '<div class="mt-body"><div class="mt-shot"><img class="bg" src="' + m.img + '" alt="" aria-hidden="true" loading="lazy" decoding="async">'
        + '<img class="fg" src="' + m.img + '" alt="" loading="lazy" decoding="async"></div><p>' + m.text + '</p></div></article>';
    }).join('')
    + '</div></div>';

  var cards = Array.prototype.slice.call(root.querySelectorAll('.mt-card'));
  var fill = root.querySelector('.mt-fill');
  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var narrow = window.matchMedia('(max-width: 899px)').matches;

  // ── Phones: vertical, revealed on scroll ────────────────────────────────
  function vertical() {
    root.classList.add('vertical');
    if (reduced || !('IntersectionObserver' in window)) { cards.forEach(function (c) { c.classList.add('on', 'lit'); }); fill.style.transform = 'scaleY(1)'; return; }
    var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) e.target.classList.add('on'); }); }, { rootMargin: '0px 0px -12% 0px' });
    cards.forEach(function (c) { io.observe(c); });
    var ticking = false;
    function update() {
      ticking = false;
      var track = root.querySelector('.mt-track').getBoundingClientRect(), mid = window.innerHeight * 0.55;
      var p = Math.max(0, Math.min(1, (mid - track.top) / Math.max(1, track.height)));
      fill.style.transform = 'scaleY(' + p.toFixed(3) + ')';
      cards.forEach(function (c) { c.classList.toggle('lit', c.getBoundingClientRect().top < mid); });
    }
    window.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
    update();
  }

  // ── Desktop: pinned, sliding sideways ───────────────────────────────────
  function load(src) {
    return new Promise(function (resolve, reject) { var s = document.createElement('script'); s.src = src; s.onload = resolve; s.onerror = reject; document.head.appendChild(s); });
  }
  function horizontal() {
    var gsap = window.gsap, ScrollTrigger = window.ScrollTrigger;
    if (!gsap || !ScrollTrigger) return fallback();
    gsap.registerPlugin(ScrollTrigger);
    var pin = root.querySelector('.mt-pin'), track = root.querySelector('.mt-track');
    function distance() { return Math.max(0, track.scrollWidth - pin.clientWidth); }
    function activate(progress) {
      fill.style.transform = 'scaleX(' + progress.toFixed(3) + ')';
      var centre = pin.getBoundingClientRect().left + pin.clientWidth / 2;
      var best = null, bestD = Infinity;
      cards.forEach(function (c) {
        var r = c.getBoundingClientRect(), mid = r.left + r.width / 2, d = Math.abs(mid - centre);
        c.classList.toggle('lit', mid < centre + r.width * 0.3);
        if (d < bestD) { bestD = d; best = c; }
      });
      cards.forEach(function (c) { c.classList.toggle('on', c === best); });
    }
    gsap.to(track, {
      x: function () { return -distance(); },
      ease: 'none',
      scrollTrigger: {
        trigger: pin, start: 'center center', end: function () { return '+=' + distance(); },
        pin: true, scrub: 0.6, invalidateOnRefresh: true, anticipatePin: 1,
        onUpdate: function (self) { activate(self.progress); },
        onRefresh: function (self) { activate(self.progress); },
      },
    });
    activate(0);
    window.addEventListener('load', function () { ScrollTrigger.refresh(); });
  }
  function fallback() { root.classList.add('static'); cards.forEach(function (c) { c.classList.add('on', 'lit'); }); }

  if (narrow) vertical();
  else if (reduced) fallback();
  else load(CDN + 'gsap.min.js').then(function () { return load(CDN + 'ScrollTrigger.min.js'); }).then(horizontal).catch(fallback);
})();
