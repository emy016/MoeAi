/**
 * Moe, the EduMoe mascot: a small MoeAI blob with the MoeAI peaks as a crown,
 * living on the page's navigation.
 *
 * - Takes the site's accent colour (--accent), live: switch the theme or pick
 *   a custom colour and Moe changes with it. Every colour below is derived
 *   from that one variable with color-mix, so nothing is hard-coded pink.
 * - Sits on the active nav item (top navbar on desktop, the bottom dock on
 *   phones) and jumps to whichever item you hover: a real arc, leaning into
 *   the jump, stretching in the air and squashing on landing, with a ground
 *   shadow that shrinks as it rises.
 * - Breathes, blinks, and its eyes (with highlights) follow your pointer.
 * - Moods: happy, giggling (tap it), love (hover a sign-up or start button),
 *   confused (click empty space a few times), surprised (scroll fast), lazy
 *   and then asleep (no input for a while).
 * - Idle tricks every so often: a little hop, a wave, a spin, a wiggle, a look
 *   around. Now and then it points at a button or hides behind a card.
 * - With reduced motion it stays put and only blinks.
 */
(function () {
  if (window.__moeMascot) return;
  window.__moeMascot = true;
  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var W = 50, H = 54; // element size; the SVG's viewBox is 60 x 64

  var mix = function (pct, other) { return 'color-mix(in srgb, var(--moe) ' + pct + '%, ' + other + ')'; };
  var css = [
    '.moe-pet { --moe: var(--accent, #e11d48); position: fixed; left: 0; top: 0; width: ' + W + 'px; height: ' + H + 'px; z-index: 1300; cursor: pointer;',
    '  will-change: transform; -webkit-tap-highlight-color: transparent; }',
    '.moe-pet.hiding { z-index: 1; }',
    '.moe-pet svg { width: 100%; height: 100%; overflow: visible; filter: drop-shadow(0 5px 10px ' + mix(40, 'transparent') + '); }',
    '.moe-pet .rig { transform-origin: 30px 60px; transform-box: view-box; }',
    '.moe-pet .breathe { transform-origin: 30px 60px; transform-box: view-box; animation: moe-breathe 2.8s ease-in-out infinite; }',
    '.moe-pet.lazy .breathe, .moe-pet.mood-sleep .breathe { animation-duration: 4.6s; }',
    '.moe-pet.land .breathe { animation: moe-land .32s ease-out; }',
    '.moe-pet.giggle .breathe { animation: moe-giggle .11s linear infinite alternate; }',
    '.moe-pet.trick-spin .breathe { animation: moe-spin .7s ease-in-out; }',
    '.moe-pet.trick-wiggle .breathe { animation: moe-wiggle .9s ease-in-out; }',
    '.moe-pet.confused .breathe { animation: none; transform: rotate(-12deg); transition: transform .3s; }',
    '.moe-pet .s1 { stop-color: ' + mix(35, '#fff') + '; } .moe-pet .s2 { stop-color: ' + mix(78, '#fff') + '; } .moe-pet .s3 { stop-color: var(--moe); }',
    '.moe-pet .shade { stop-color: ' + mix(55, '#000') + '; }',
    '.moe-pet .crown { fill: ' + mix(78, '#000') + '; } .moe-pet .crown-hi { stroke: ' + mix(40, '#fff') + '; }',
    '.moe-pet .foot, .moe-pet .arm-fill { fill: ' + mix(82, '#000') + '; } .moe-pet .arm-line { stroke: ' + mix(88, '#fff') + '; }',
    '.moe-pet .cheek { fill: ' + mix(55, '#ff5c93') + '; opacity: .5; transition: opacity .2s; } .moe-pet.giggle .cheek, .moe-pet.mood-love .cheek { opacity: .85; }',
    '.moe-pet .lid { fill: ' + mix(70, '#fff') + '; transform-box: fill-box; transform-origin: 50% 0; transform: scaleY(0); transition: transform .07s; }',
    '.moe-pet.blink .lid { transform: scaleY(1); } .moe-pet.lazy .lid { transform: scaleY(.55); }',
    '.moe-pet .pupils { transition: transform .12s; }',
    '.moe-pet .mouth-in { fill: ' + mix(45, '#3a0a10') + '; }',
    '.moe-pet .x, .moe-pet .arm { display: none; }',
    '.moe-pet.mood-happy .m-happy, .moe-pet.mood-giggle .m-happy, .moe-pet.mood-love .m-happy { display: inline; }',
    '.moe-pet.mood-happy .e-open, .moe-pet.mood-surprised .e-open, .moe-pet.mood-confused .e-open, .moe-pet.mood-lazy .e-open { display: inline; }',
    '.moe-pet.mood-giggle .e-joy { display: inline; } .moe-pet.mood-love .e-love { display: inline; } .moe-pet.mood-sleep .e-sleep { display: inline; }',
    '.moe-pet.mood-surprised .m-o { display: inline; } .moe-pet.mood-confused .m-wave { display: inline; }',
    '.moe-pet.mood-lazy .m-flat, .moe-pet.mood-sleep .m-flat { display: inline; }',
    '.moe-pet.point .arm, .moe-pet.trick-wave .arm { display: inline; }',
    '.moe-pet.trick-wave .arm { transform-origin: 50px 40px; transform-box: view-box; animation: moe-wave .35s ease-in-out 3 alternate; }',
    '.moe-shadow { position: fixed; left: 0; top: 0; width: 30px; height: 6px; margin-left: -15px; border-radius: 50%; z-index: 1299; pointer-events: none;',
    '  background: radial-gradient(closest-side, rgba(0,0,0,.35), transparent); will-change: transform, opacity; }',
    '.moe-bubble { position: fixed; z-index: 1301; pointer-events: none; font: 800 13px "Nunito Sans", system-ui, sans-serif; color: #fff;',
    '  background: var(--accent, #e11d48); padding: 4px 10px; border-radius: 999px; box-shadow: 0 6px 16px rgba(0,0,0,.25);',
    '  opacity: 0; transform: translate(-50%, 4px) scale(.8); transition: opacity .2s, transform .25s cubic-bezier(.34,1.56,.64,1); white-space: nowrap; }',
    '.moe-bubble.show { opacity: 1; transform: translate(-50%, 0) scale(1); }',
    '.moe-z { position: fixed; z-index: 1301; pointer-events: none; font: 800 12px system-ui; color: color-mix(in srgb, var(--accent, #e11d48) 55%, #fff); animation: moe-z 2.2s ease-out forwards; }',
    '.moe-target { outline: 3px solid color-mix(in srgb, var(--accent, #e11d48) 70%, #fff) !important; outline-offset: 3px; border-radius: 12px; }',
    '@keyframes moe-breathe { 0%,100% { transform: scale(1,1); } 50% { transform: scale(1.02,.97) translateY(1px); } }',
    '@keyframes moe-land { 0% { transform: scale(1.18,.8); } 45% { transform: scale(.94,1.07); } 100% { transform: scale(1,1); } }',
    '@keyframes moe-giggle { from { transform: rotate(-7deg) translateY(-1px); } to { transform: rotate(7deg); } }',
    '@keyframes moe-spin { 0% { transform: scaleX(1); } 25% { transform: scaleX(-1) translateY(-6px); } 50% { transform: scaleX(1) translateY(-8px); } 75% { transform: scaleX(-1) translateY(-4px); } 100% { transform: scaleX(1); } }',
    '@keyframes moe-wiggle { 0%,100% { transform: rotate(0); } 20% { transform: rotate(-10deg); } 40% { transform: rotate(9deg); } 60% { transform: rotate(-6deg); } 80% { transform: rotate(4deg); } }',
    '@keyframes moe-wave { from { transform: rotate(-18deg); } to { transform: rotate(16deg); } }',
    '@keyframes moe-z { from { opacity: 1; transform: translate(0,0) scale(.8); } to { opacity: 0; transform: translate(14px,-26px) scale(1.3); } }',
  ].join('\n');
  var style = document.createElement('style'); style.textContent = css; document.head.appendChild(style);

  // A soft blob with a highlight, feet, cheeks, the MoeAI peaks as a crown
  // resting on the head, and one face per mood (only the matching one shows).
  var SVG = '<svg viewBox="0 0 60 64" aria-hidden="true">'
    + '<defs><radialGradient id="moe-body" cx="38%" cy="30%" r="75%"><stop offset="0" class="s1"/><stop offset=".55" class="s2"/><stop offset="1" class="s3"/></radialGradient>'
    + '<radialGradient id="moe-shade" cx="50%" cy="20%" r="85%"><stop offset=".6" class="shade" stop-opacity="0"/><stop offset="1" class="shade" stop-opacity=".45"/></radialGradient></defs>'
    + '<g class="rig"><g class="breathe">'
    + '<ellipse class="foot" cx="21.5" cy="57.5" rx="5.2" ry="3.3"/><ellipse class="foot" cx="38.5" cy="57.5" rx="5.2" ry="3.3"/>'
    + '<g class="arm"><path class="arm-line" d="M50 40 Q57 35 60 29" stroke-width="5" stroke-linecap="round" fill="none"/><circle class="arm-fill" cx="60.3" cy="28.4" r="3"/></g>'
    + '<path d="M30 17 C44.5 17 53.5 27 53.5 39.5 C53.5 51.5 43.5 58.5 30 58.5 C16.5 58.5 6.5 51.5 6.5 39.5 C6.5 27 15.5 17 30 17 Z" fill="url(#moe-body)"/>'
    + '<path d="M30 17 C44.5 17 53.5 27 53.5 39.5 C53.5 51.5 43.5 58.5 30 58.5 C16.5 58.5 6.5 51.5 6.5 39.5 C6.5 27 15.5 17 30 17 Z" fill="url(#moe-shade)"/>'
    + '<ellipse cx="19" cy="26.5" rx="6.5" ry="3.4" transform="rotate(-28 19 26.5)" fill="#fff" opacity=".5"/><circle cx="26" cy="22.3" r="1.4" fill="#fff" opacity=".6"/>'
    // Crown: the MoeAI peaks, base tucked 5 units into the head.
    + '<path class="crown" d="M17.5 23 L20.8 10.5 L25.6 18 L30 12 L34.4 18 L39.2 10.5 L42.5 23 Q30 19.5 17.5 23 Z"/>'
    + '<path class="crown-hi" d="M21.2 13.5 L22.6 18.6 M38.8 13.5 L37.4 18.6" stroke-width="1.1" stroke-linecap="round" fill="none" opacity=".7"/>'
    + '<circle cx="20.8" cy="10.5" r="1.6" class="crown"/><circle cx="30" cy="12" r="1.6" class="crown"/><circle cx="39.2" cy="10.5" r="1.6" class="crown"/>'
    + '<ellipse class="cheek" cx="15.5" cy="43.5" rx="4.2" ry="2.5"/><ellipse class="cheek" cx="44.5" cy="43.5" rx="4.2" ry="2.5"/>'
    + '<g class="x e-open"><ellipse cx="23" cy="37" rx="4.7" ry="5.6" fill="#fff"/><ellipse cx="37" cy="37" rx="4.7" ry="5.6" fill="#fff"/>'
    + '<g class="pupils"><circle cx="23.4" cy="37.8" r="3" fill="#1d0a0d"/><circle cx="37.4" cy="37.8" r="3" fill="#1d0a0d"/>'
    + '<circle cx="24.6" cy="36.4" r="1.1" fill="#fff"/><circle cx="38.6" cy="36.4" r="1.1" fill="#fff"/><circle cx="22.5" cy="39" r=".55" fill="#fff" opacity=".8"/><circle cx="36.5" cy="39" r=".55" fill="#fff" opacity=".8"/></g>'
    + '<rect class="lid" x="18" y="31.2" width="10" height="11.6" rx="5"/><rect class="lid" x="32" y="31.2" width="10" height="11.6" rx="5"/></g>'
    + '<g class="x e-joy" stroke="#1d0a0d" stroke-width="2.2" stroke-linecap="round" fill="none"><path d="M18.5 38.5 Q23 33 27.5 38.5"/><path d="M32.5 38.5 Q37 33 41.5 38.5"/></g>'
    + '<g class="x e-sleep" stroke="#1d0a0d" stroke-width="2" stroke-linecap="round" fill="none"><path d="M19 37.5 Q23 40.5 27 37.5"/><path d="M33 37.5 Q37 40.5 41 37.5"/></g>'
    + '<g class="x e-love" fill="#1d0a0d"><path d="M23 41.5 L18.9 37.4 A2.4 2.4 0 0 1 23 34.3 A2.4 2.4 0 0 1 27.1 37.4 Z"/><path d="M37 41.5 L32.9 37.4 A2.4 2.4 0 0 1 37 34.3 A2.4 2.4 0 0 1 41.1 37.4 Z"/></g>'
    + '<g class="x m-happy"><path class="mouth-in" d="M25.5 45.3 Q30 51 34.5 45.3 Z"/><path d="M25.5 45.3 Q30 51 34.5 45.3" stroke="#1d0a0d" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" fill="none"/></g>'
    + '<ellipse class="x m-o mouth-in" cx="30" cy="47" rx="2.7" ry="3.2" stroke="#1d0a0d" stroke-width="1.4"/>'
    + '<path class="x m-wave" d="M25 47 Q27 45 29 47 T33 47 T35.5 46" stroke="#1d0a0d" stroke-width="1.8" stroke-linecap="round" fill="none"/>'
    + '<path class="x m-flat" d="M26.5 47 H33.5" stroke="#1d0a0d" stroke-width="1.9" stroke-linecap="round"/>'
    + '</g></g></svg>';

  var pet = document.createElement('div');
  pet.className = 'moe-pet mood-happy';
  pet.setAttribute('role', 'img');
  pet.setAttribute('aria-label', 'Moe, the EduMoe mascot');
  pet.innerHTML = SVG;
  var rig = pet.querySelector('.rig'), pupils = pet.querySelector('.pupils');
  var shadow = document.createElement('div'); shadow.className = 'moe-shadow';
  var bubble = document.createElement('div'); bubble.className = 'moe-bubble';
  var pos = { x: -100, y: -100 }, busy = false, lastInput = Date.now(), mood = 'happy', flight = 0;

  function setMood(m) {
    mood = m;
    pet.className = pet.className.replace(/\bmood-\w+/, 'mood-' + m);
    pet.classList.toggle('lazy', m === 'lazy');
    pet.classList.toggle('giggle', m === 'giggle');
    pet.classList.toggle('confused', m === 'confused');
  }
  function say(text, ms) {
    bubble.textContent = text; bubble.style.left = (pos.x + W / 2) + 'px'; bubble.style.top = (pos.y - 26) + 'px';
    bubble.classList.add('show'); clearTimeout(say.t); say.t = setTimeout(function () { bubble.classList.remove('show'); }, ms || 1400);
  }
  function place(x, y, lift) {
    pet.style.transform = 'translate(' + Math.round(x) + 'px,' + Math.round(y - (lift || 0)) + 'px)';
    var s = Math.max(0.35, 1 - (lift || 0) / 60);
    shadow.style.transform = 'translate(' + Math.round(x + W / 2) + 'px,' + Math.round(y + H - 4) + 'px) scale(' + s + ')';
    shadow.style.opacity = String(0.25 + 0.75 * s);
  }
  function land() { pet.classList.remove('land'); void pet.offsetWidth; pet.classList.add('land'); setTimeout(function () { pet.classList.remove('land'); }, 340); }

  /** Jump along an arc to (x, y), leaning into it; or snap there when not hopping. */
  function moveTo(x, y, hop) {
    var from = { x: pos.x, y: pos.y }; pos = { x: x, y: y };
    cancelAnimationFrame(flight);
    var dx = x - from.x, dy = y - from.y, dist = Math.hypot(dx, dy);
    if (!hop || reduced || from.x < -50 || dist < 2) { rig.style.transform = ''; place(x, y, 0); return; }
    var dur = Math.min(720, Math.max(360, dist * 1.1)), arc = Math.min(46, 16 + dist * 0.09), t0 = performance.now();
    (function step(now) {
      var t = Math.min(1, (now - t0) / dur), e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2, up = Math.sin(Math.PI * t);
      var lean = Math.max(-16, Math.min(16, dx / 14)) * up;
      rig.style.transform = 'rotate(' + lean.toFixed(1) + 'deg) scale(' + (1 - 0.08 * up).toFixed(3) + ',' + (1 + 0.12 * up).toFixed(3) + ')';
      place(from.x + dx * e, from.y + dy * e, arc * up);
      if (t < 1) flight = requestAnimationFrame(step); else { rig.style.transform = ''; land(); }
    })(t0);
  }
  function hopInPlace(height) {
    if (reduced) return;
    var t0 = performance.now(), dur = 420;
    (function step(now) {
      var t = Math.min(1, (now - t0) / dur), up = Math.sin(Math.PI * t);
      rig.style.transform = 'scale(' + (1 - 0.06 * up) + ',' + (1 + 0.1 * up) + ')';
      place(pos.x, pos.y, height * up);
      if (t < 1) flight = requestAnimationFrame(step); else { rig.style.transform = ''; land(); }
    })(t0);
  }

  /** The navigation this page shows right now: the bottom dock on phones, else the top links. */
  function navItems() {
    var dock = document.querySelector('.em-dock');
    if (dock && getComputedStyle(dock).display !== 'none') return Array.prototype.slice.call(dock.querySelectorAll('a'));
    return Array.prototype.slice.call(document.querySelectorAll('.nav-links a, .navbar a.nav-btn-link'));
  }
  function perchOn(el, hop) {
    if (!el) return;
    var r = el.getBoundingClientRect();
    if (!r.width) return;
    moveTo(r.left + r.width / 2 - W / 2, r.top - H + 9, hop);
  }
  function rest(hop) {
    var items = navItems();
    var home = items.find(function (a) { return a.classList.contains('active') || a.classList.contains('on') || a.getAttribute('aria-current') === 'page'; }) || items[0];
    perchOn(home, hop);
  }

  // Eyes follow the pointer.
  document.addEventListener('pointermove', function (e) {
    lastInput = Date.now(); if (mood === 'lazy' || mood === 'sleep') { setMood('surprised'); setTimeout(function () { if (mood === 'surprised') setMood('happy'); }, 600); }
    var cx = pos.x + W / 2, cy = pos.y + H * 0.58, dx = e.clientX - cx, dy = e.clientY - cy, d = Math.hypot(dx, dy) || 1, k = Math.min(1, d / 120);
    pupils.style.transform = 'translate(' + (dx / d * 1.6 * k).toFixed(2) + 'px,' + (dy / d * 1.6 * k).toFixed(2) + 'px)';
  }, { passive: true });

  // Hop to hovered nav items; hearts for the buttons that sign you up.
  document.addEventListener('pointerover', function (e) {
    if (busy || reduced || !e.target.closest) return;
    var a = e.target.closest('.nav-links a, .navbar a.nav-btn-link, .em-dock a');
    if (a) { perchOn(a, true); if (Math.random() < 0.25) say(['ooh', 'this one?', 'go go', 'pick me'][Math.floor(Math.random() * 4)], 900); }
    if (e.target.closest('.nav-cta, .btn-fire, [data-open="signup"]') && mood === 'happy') { setMood('love'); setTimeout(function () { if (mood === 'love') setMood('happy'); }, 1400); }
  });
  document.addEventListener('pointerout', function (e) {
    if (busy || reduced || !e.target.closest) return;
    var a = e.target.closest('.nav-links, .navbar, .em-dock');
    if (a && !(e.relatedTarget && a.contains(e.relatedTarget))) setTimeout(function () { if (!busy) rest(true); }, 250);
  });

  // Tap Moe: giggles and bounces.
  pet.addEventListener('click', function (e) { e.stopPropagation(); lastInput = Date.now(); hopInPlace(10); giggle(['hehe', 'hihi', 'stop it 😆', 'ticklish!'][Math.floor(Math.random() * 4)]); });
  function giggle(text) { setMood('giggle'); say(text, 1300); setTimeout(function () { if (mood === 'giggle') setMood('happy'); }, 1300); }

  // Clicking empty space a few times: confused.
  var misses = [];
  document.addEventListener('click', function (e) {
    lastInput = Date.now();
    if (!e.target.closest || e.target.closest('a, button, input, textarea, select, label, [role=button], .moe-pet')) return;
    var now = Date.now(); misses = misses.filter(function (t) { return now - t < 2500; }); misses.push(now);
    if (misses.length >= 3) { misses = []; setMood('confused'); say('?', 1500); setTimeout(function () { if (mood === 'confused') setMood('happy'); }, 1600); }
  });

  // Scrolling fast: surprised.
  var lastY = window.scrollY, lastT = Date.now();
  window.addEventListener('scroll', function () {
    lastInput = Date.now();
    var now = Date.now(), v = Math.abs(window.scrollY - lastY) / Math.max(1, now - lastT); lastY = window.scrollY; lastT = now;
    if (v > 4 && mood === 'happy' && !busy) { setMood('surprised'); setTimeout(function () { if (mood === 'surprised') setMood('happy'); }, 700); }
    if (!busy) rest(false);
  }, { passive: true });

  // Blinking (sometimes twice), then lazy after 25 s alone, asleep after 50 s.
  (function blink() {
    setTimeout(function () {
      if (mood === 'happy' || mood === 'surprised' || mood === 'confused') {
        pet.classList.add('blink'); setTimeout(function () { pet.classList.remove('blink'); }, 120);
        if (Math.random() < 0.25) setTimeout(function () { pet.classList.add('blink'); setTimeout(function () { pet.classList.remove('blink'); }, 110); }, 260);
      }
      blink();
    }, 2200 + Math.random() * 3200);
  })();
  setInterval(function () {
    var idle = Date.now() - lastInput;
    if (!busy && idle > 25000 && mood === 'happy') { setMood('lazy'); say('*yawn*', 1400); }
    if (!busy && idle > 50000 && mood === 'lazy') setMood('sleep');
    if (mood === 'sleep') { var z = document.createElement('div'); z.className = 'moe-z'; z.textContent = 'z'; z.style.left = (pos.x + 40) + 'px'; z.style.top = (pos.y + 6) + 'px'; document.body.appendChild(z); setTimeout(function () { z.remove(); }, 2300); }
  }, 1600);

  // Idle tricks, so it never just sits there.
  function trick(name, ms) { pet.classList.add('trick-' + name); setTimeout(function () { pet.classList.remove('trick-' + name); }, ms); }
  var TRICKS = [
    function () { hopInPlace(14); },
    function () { trick('wave', 1100); say(['hey!', 'hi hi', 'o/'][Math.floor(Math.random() * 3)], 1100); },
    function () { trick('spin', 720); },
    function () { trick('wiggle', 920); },
    function () {
      pupils.style.transform = 'translate(-1.8px,0)';
      setTimeout(function () { pupils.style.transform = 'translate(1.8px,0)'; }, 600);
      setTimeout(function () { pupils.style.transform = 'translate(0,-1.2px)'; }, 1200);
    },
  ];
  (function idleTricks() {
    setTimeout(function () {
      if (!busy && !reduced && document.visibilityState === 'visible' && mood === 'happy') TRICKS[Math.floor(Math.random() * TRICKS.length)]();
      idleTricks();
    }, 7000 + Math.random() * 8000);
  })();

  // Mischief: point at a random button and giggle, or hide behind a card.
  function visible(el) { var r = el.getBoundingClientRect(); return r.width > 30 && r.height > 20 && r.top > 70 && r.bottom < window.innerHeight - 90 && r.left > 0 && r.right < window.innerWidth; }
  function pointAtButton() {
    var buttons = Array.prototype.slice.call(document.querySelectorAll('main a.btn, a.btn, button, .nav-cta, .feature-card, .subj-card, .cta-section a')).filter(visible);
    if (!buttons.length) return false;
    var target = buttons[Math.floor(Math.random() * buttons.length)], r = target.getBoundingClientRect();
    busy = true;
    moveTo(Math.max(6, r.left - 62), Math.max(70, r.top + r.height / 2 - 30), true);
    setTimeout(function () {
      pet.classList.add('point'); target.classList.add('moe-target'); setMood('giggle'); say(['psst, this one', 'click it 👀', 'hehe look'][Math.floor(Math.random() * 3)], 1800);
      setTimeout(function () { pet.classList.remove('point'); target.classList.remove('moe-target'); setMood('happy'); busy = false; rest(true); }, 2200);
    }, 760);
    return true;
  }
  function hideBehindCard() {
    var cards = Array.prototype.slice.call(document.querySelectorAll('.feature-card, .subj-card, .stat-card, .lg-card')).filter(visible);
    if (!cards.length) return false;
    var card = cards[Math.floor(Math.random() * cards.length)], r = card.getBoundingClientRect();
    busy = true; pet.classList.add('hiding'); shadow.style.opacity = '0';
    if (getComputedStyle(card).position === 'static') card.style.position = 'relative';
    card.style.zIndex = '2';
    moveTo(r.right - 40, r.top + 8, true);
    setTimeout(function () { moveTo(r.right - 34, r.top - 30, false); setMood('giggle'); say('peekaboo', 1200); }, 1300);
    setTimeout(function () { pet.classList.remove('hiding'); card.style.zIndex = ''; setMood('happy'); busy = false; rest(true); }, 3200);
    return true;
  }
  function mischief() {
    setTimeout(function () {
      if (!busy && !reduced && document.visibilityState === 'visible' && mood === 'happy') (Math.random() < 0.55 ? pointAtButton() : hideBehindCard()) || pointAtButton();
      mischief();
    }, 22000 + Math.random() * 20000);
  }

  function start() {
    document.body.appendChild(shadow); document.body.appendChild(pet); document.body.appendChild(bubble);
    rest(false);
    setTimeout(function () { if (!busy) { hopInPlace(12); say('hi!', 1200); } }, 700);
    window.addEventListener('resize', function () { if (!busy) rest(false); });
    if (!reduced) mischief();
  }
  if (document.readyState === 'complete') start(); else window.addEventListener('load', function () { setTimeout(start, 300); });
})();
