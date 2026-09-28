/**
 * Moe, the EduMoe mascot: a small round MoeAI blob with the MoeAI peaks as a
 * crown. It is shy: never there when the page loads, it lives behind the
 * page's buttons and cards and peeks out from their edges.
 *
 * - A few seconds after load it picks a button or card on screen and peeks
 *   over its top edge (or round its side), looks around, blinks, follows
 *   your pointer with its eyes, then ducks back and turns up somewhere else.
 * - "Behind" is done with a clip at the element's edge, so it works whatever
 *   the page's stacking looks like.
 * - Get the pointer close and it ducks ("eep!"); tap it and it giggles
 *   first. Scrolling sends it into hiding until the page settles.
 * - Its colours come from the site's accent (--accent), so it follows the
 *   theme and custom colours.
 * - With reduced motion it appears and disappears without sliding.
 */
(function () {
  if (window.__moeMascot) return;
  window.__moeMascot = true;
  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var W = 46, H = 50;

  var mix = function (pct, other) { return 'color-mix(in srgb, var(--moe) ' + pct + '%, ' + other + ')'; };
  var css = [
    '.moe-pet { --moe: var(--accent, #e11d48); position: fixed; left: 0; top: 0; width: ' + W + 'px; height: ' + H + 'px; z-index: 1300; cursor: pointer;',
    '  opacity: 0; pointer-events: none; will-change: transform, clip-path; -webkit-tap-highlight-color: transparent; }',
    '.moe-pet.out { opacity: 1; pointer-events: auto; }',
    '.moe-pet .body { position: absolute; inset: 0; transform-origin: 50% 100%; transition: transform .25s; }',
    '.moe-pet.side-left .body { transform: rotate(-14deg); } .moe-pet.side-right .body { transform: rotate(14deg); }',
    '.moe-pet.giggle .body { animation: moe-giggle .12s linear infinite alternate; }',
    '.moe-pet svg { width: 100%; height: 100%; overflow: visible; filter: drop-shadow(0 4px 8px ' + mix(35, 'transparent') + '); }',
    '.moe-pet .s1 { stop-color: ' + mix(40, '#fff') + '; } .moe-pet .s2 { stop-color: ' + mix(78, '#fff') + '; }',
    '.moe-pet .crown { fill: var(--moe); } .moe-pet .cheek { fill: ' + mix(55, '#ff6f86') + '; opacity: .55; }',
    '.moe-pet .lid { fill: ' + mix(62, '#fff') + '; transform-origin: center; transform-box: fill-box; transform: scaleY(0); transition: transform .08s; }',
    '.moe-pet.blink .lid { transform: scaleY(1); }',
    '.moe-pet .pupil { transition: transform .15s; }',
    '.moe-pet .arm-line { stroke: ' + mix(80, '#fff') + '; } .moe-pet .arm-hand { fill: var(--moe); }',
    '.moe-pet .m-happy, .moe-pet .m-o, .moe-pet .eyes-joy, .moe-pet .arm { display: none; }',
    '.moe-pet.mood-happy .m-happy, .moe-pet.mood-giggle .m-happy { display: block; }',
    '.moe-pet.mood-giggle .eyes-open { display: none; } .moe-pet.mood-giggle .eyes-joy { display: block; }',
    '.moe-pet.mood-surprised .m-o { display: block; }',
    '.moe-pet.wave .arm { display: block; } .moe-pet.wave .arm { transform-origin: 38px 30px; transform-box: view-box; animation: moe-wave .3s ease-in-out 4 alternate; }',
    '.moe-bubble { position: fixed; z-index: 1301; pointer-events: none; font: 800 13px "Nunito Sans", system-ui, sans-serif; color: #fff; background: var(--accent, #e11d48); padding: 3px 9px; border-radius: 999px;',
    '  opacity: 0; transform: translate(-50%, 4px) scale(.8); transition: opacity .2s, transform .2s; white-space: nowrap; }',
    '.moe-bubble.show { opacity: 1; transform: translate(-50%, 0) scale(1); }',
    '@keyframes moe-giggle { from { transform: rotate(-6deg) translateY(-1px); } to { transform: rotate(6deg) translateY(0); } }',
    '@keyframes moe-wave { from { transform: rotate(-16deg); } to { transform: rotate(14deg); } }',
  ].join('\n');
  var style = document.createElement('style'); style.textContent = css; document.head.appendChild(style);

  // The original round Moe, with the crown resting lower on the head.
  var SVG = '<svg viewBox="0 0 46 50" aria-hidden="true">'
    + '<defs><radialGradient id="moeg" cx="40%" cy="35%" r="70%"><stop offset="0" class="s1"/><stop offset="1" class="s2"/></radialGradient></defs>'
    + '<path class="crown" d="M9 20.5 L14 7 L19 17 L23 11 L27 17 L32 7 L37 20.5 Z"/>'
    + '<ellipse cx="23" cy="31" rx="19" ry="17" fill="url(#moeg)"/>'
    + '<g class="arm"><path class="arm-line" d="M38 30 Q46 24 49 18" stroke-width="4.5" stroke-linecap="round" fill="none"/><circle class="arm-hand" cx="49.5" cy="17.5" r="2.6"/></g>'
    + '<ellipse class="cheek" cx="12" cy="35" rx="3.4" ry="2.2"/><ellipse class="cheek" cx="34" cy="35" rx="3.4" ry="2.2"/>'
    + '<g class="eyes-open"><ellipse cx="16" cy="28" rx="3.6" ry="4.4" fill="#fff"/><ellipse cx="30" cy="28" rx="3.6" ry="4.4" fill="#fff"/>'
    + '<circle class="pupil" cx="16.4" cy="28.6" r="2.2" fill="#2b0d10"/><circle class="pupil" cx="30.4" cy="28.6" r="2.2" fill="#2b0d10"/>'
    + '<rect class="lid" x="12" y="23.4" width="8" height="9.4" rx="4"/><rect class="lid" x="26" y="23.4" width="8" height="9.4" rx="4"/></g>'
    + '<g class="eyes-joy" stroke="#2b0d10" stroke-width="2" stroke-linecap="round" fill="none"><path d="M12.5 29 Q16 25 19.5 29"/><path d="M26.5 29 Q30 25 33.5 29"/></g>'
    + '<path class="m-happy" d="M18.5 36 Q23 40.5 27.5 36" stroke="#2b0d10" stroke-width="2" stroke-linecap="round" fill="#b8323a"/>'
    + '<ellipse class="m-o" cx="23" cy="37.5" rx="2.6" ry="3" fill="#2b0d10"/>'
    + '</svg>';

  var pet = document.createElement('div');
  pet.className = 'moe-pet mood-happy';
  pet.setAttribute('role', 'img');
  pet.setAttribute('aria-label', 'Moe, the EduMoe mascot, peeking out');
  pet.innerHTML = '<div class="body">' + SVG + '</div>';
  var bubble = document.createElement('div'); bubble.className = 'moe-bubble';

  // Page coordinates: edumoe-shell.js zooms the page on computers, and rects
  // come back in screen pixels while Moe's own translate() is zoomed.
  function zoom() { return parseFloat(getComputedStyle(document.documentElement).zoom) || 1; }
  function rect(el) {
    var r = el.getBoundingClientRect(), z = zoom();
    return { left: r.left / z, top: r.top / z, right: r.right / z, bottom: r.bottom / z, width: r.width / z, height: r.height / z };
  }
  function vw() { return window.innerWidth / zoom(); }
  function vh() { return window.innerHeight / zoom(); }

  var spot = null, pos = { x: 0, y: 0 }, tween = 0, timer = 0, state = 'hidden', mood = 'happy';

  function setMood(m) { mood = m; pet.className = pet.className.replace(/\bmood-\w+/, 'mood-' + m); pet.classList.toggle('giggle', m === 'giggle'); }
  function say(text, ms) {
    bubble.textContent = text; bubble.style.left = (pos.x + W / 2) + 'px'; bubble.style.top = (pos.y - 22) + 'px';
    bubble.classList.add('show'); clearTimeout(say.t); say.t = setTimeout(function () { bubble.classList.remove('show'); }, ms || 1300);
  }

  /** Put Moe at (x, y) and cut away whatever is on the far side of the edge it hides behind. */
  function place(x, y) {
    pos = { x: x, y: y };
    pet.style.transform = 'translate(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px)';
    if (!spot) return;
    var e = spot.edge, clip;
    if (spot.side === 'top') clip = 'inset(-40px -40px ' + Math.max(0, y + H - e) + 'px -40px)';
    else if (spot.side === 'left') clip = 'inset(-40px ' + Math.max(0, x + W - e) + 'px -40px -40px)';
    else clip = 'inset(-40px -40px -40px ' + Math.max(0, e - x) + 'px)';
    pet.style.clipPath = clip; pet.style.webkitClipPath = clip;
  }
  function slide(from, to, ms, done) {
    cancelAnimationFrame(tween);
    if (reduced) { place(to.x, to.y); if (done) done(); return; }
    var t0 = performance.now();
    (function step(now) {
      var t = Math.min(1, (now - t0) / ms), e = 1 - Math.pow(1 - t, 3);
      place(from.x + (to.x - from.x) * e, from.y + (to.y - from.y) * e);
      if (t < 1) tween = requestAnimationFrame(step); else if (done) done();
    })(t0);
  }

  /** Something on screen big enough to hide behind, away from the bars at the top and bottom. */
  function candidates() {
    var list = Array.prototype.slice.call(document.querySelectorAll('a.btn, button.btn, .btn-fire, .stat-card, .feature-card, .subj-card, .lg-card, .see-shots figure, .card, .chat, .demo-phone, .see-phone, .tl-copy img, .cta-section, .hero-ctas a'));
    var top = 96, bottom = vh() - (window.innerWidth <= 1024 ? 110 : 30), right = vw();
    return list.filter(function (el) {
      var r = rect(el);
      return r.width >= 70 && r.height >= 36 && r.top > top + H && r.bottom < bottom && r.left > 8 && r.right < right - 8;
    });
  }
  function pickSpot() {
    var list = candidates();
    if (!list.length) return null;
    var el = list[Math.floor(Math.random() * list.length)], r = rect(el);
    var sides = ['top', 'top', 'top'];
    if (r.height >= H + 10) { if (r.left > W + 10) sides.push('left'); if (r.right < vw() - W - 10) sides.push('right'); }
    var side = sides[Math.floor(Math.random() * sides.length)];
    if (side === 'top') {
      var x = r.left + 10 + Math.random() * Math.max(0, r.width - W - 20);
      return { el: el, side: side, edge: r.top, hidden: { x: x, y: r.top + 4 }, out: { x: x, y: r.top - H * 0.7 } };
    }
    var y = r.top + 6 + Math.random() * Math.max(0, r.height - H - 12);
    if (side === 'left') return { el: el, side: side, edge: r.left, hidden: { x: r.left + 4, y: y }, out: { x: r.left - W * 0.62, y: y } };
    return { el: el, side: side, edge: r.right, hidden: { x: r.right - W - 4, y: y }, out: { x: r.right - W * 0.38, y: y } };
  }

  function schedule(ms) { clearTimeout(timer); timer = setTimeout(peek, ms); }
  function peek() {
    if (document.visibilityState !== 'visible' || state !== 'hidden') return schedule(3000);
    spot = pickSpot();
    if (!spot) return schedule(2500);
    state = 'peeking';
    pet.classList.remove('side-left', 'side-right'); if (spot.side !== 'top') pet.classList.add('side-' + spot.side);
    setMood('happy');
    place(spot.hidden.x, spot.hidden.y);
    pet.classList.add('out');
    slide(spot.hidden, spot.out, 420, function () {
      state = 'out';
      if (Math.random() < 0.35) say(['👀', 'psst', 'hi', 'boo'][Math.floor(Math.random() * 4)], 1100);
      if (Math.random() < 0.3) { pet.classList.add('wave'); setTimeout(function () { pet.classList.remove('wave'); }, 1300); }
      clearTimeout(timer); timer = setTimeout(function () { duck(1500 + Math.random() * 3500); }, 2600 + Math.random() * 3600);
    });
  }
  function duck(next, fast) {
    if (state === 'hidden' || !spot) { schedule(next); return; }
    state = 'ducking';
    bubble.classList.remove('show');
    slide(pos, spot.hidden, fast ? 160 : 320, function () {
      pet.classList.remove('out'); state = 'hidden'; spot = null; pet.style.clipPath = ''; pet.style.webkitClipPath = '';
      schedule(next);
    });
  }

  // Eyes follow the pointer; get too close and it hides.
  document.addEventListener('pointermove', function (e) {
    if (state === 'hidden') return;
    var z = zoom(), px = e.clientX / z, py = e.clientY / z;
    var cx = pos.x + W / 2, cy = pos.y + H * 0.56, dx = px - cx, dy = py - cy, d = Math.hypot(dx, dy) || 1;
    pet.querySelectorAll('.pupil').forEach(function (p) { p.style.transform = 'translate(' + (dx / d * 1.3).toFixed(2) + 'px,' + (dy / d * 1.3).toFixed(2) + 'px)'; });
    if (state === 'out' && d < 70 && e.pointerType === 'mouse' && mood === 'happy') { setMood('surprised'); say('eep!', 700); setTimeout(function () { duck(1800 + Math.random() * 2500, true); }, 180); }
  }, { passive: true });

  // Tap: giggles, then ducks.
  pet.addEventListener('click', function (e) {
    e.stopPropagation(); if (state !== 'out') return;
    setMood('giggle'); say(['hehe', 'hihi', 'found me 😆', 'ticklish!'][Math.floor(Math.random() * 4)], 1200);
    clearTimeout(timer); timer = setTimeout(function () { duck(2500 + Math.random() * 3000); }, 1100);
  });

  // Scrolling moves its hiding place, so it hides until the page settles.
  var settle = 0;
  window.addEventListener('scroll', function () {
    if (state === 'out' || state === 'peeking') { cancelAnimationFrame(tween); pet.classList.remove('out'); bubble.classList.remove('show'); state = 'hidden'; spot = null; clearTimeout(timer); }
    clearTimeout(settle); settle = setTimeout(function () { if (state === 'hidden') schedule(900 + Math.random() * 1500); }, 400);
  }, { passive: true });
  window.addEventListener('resize', function () { if (state !== 'hidden') duck(1500, true); });

  (function blink() {
    setTimeout(function () { if (state === 'out' && mood === 'happy') { pet.classList.add('blink'); setTimeout(function () { pet.classList.remove('blink'); }, 130); } blink(); }, 2000 + Math.random() * 2600);
  })();

  function start() {
    document.body.appendChild(pet); document.body.appendChild(bubble);
    schedule(2500 + Math.random() * 2500); // never there at load
  }
  if (document.readyState === 'complete') start(); else window.addEventListener('load', start);
})();
