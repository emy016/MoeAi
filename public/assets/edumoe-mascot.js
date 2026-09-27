/**
 * Moe, the EduMoe mascot: a small light-red MoeAI blob that lives on the
 * page's navigation, like the anime-navbar pet, with more personality.
 *
 * - Sits on the active nav item (top navbar on desktop, the bottom dock on
 *   phones) and hops to whichever item you hover.
 * - Blinks, bobs, and its eyes follow your pointer.
 * - Moods: happy (default), confused (a "?" and a tilted head, when you click
 *   empty space a few times), lazy (droops and snores "z" after 25 seconds
 *   without input), giggling (tap it), surprised (when you scroll fast).
 * - Every 20–40 seconds it gets up to something: points at a random button on
 *   screen and giggles, or hides behind a card and peeks out.
 * - Respects prefers-reduced-motion (no hopping or pranks, just blinks).
 */
(function () {
  if (window.__moeMascot) return;
  window.__moeMascot = true;
  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var css = [
    '.moe-pet { position: fixed; left: 0; top: 0; width: 46px; height: 50px; z-index: 1300; pointer-events: auto; cursor: pointer;',
    '  transition: transform 0.55s cubic-bezier(.34,1.56,.64,1), opacity .3s; will-change: transform; -webkit-tap-highlight-color: transparent; }',
    '.moe-pet.hiding { z-index: 1; transition: transform 0.9s cubic-bezier(.5,0,.3,1), opacity .3s; }',
    '.moe-pet .body { position: absolute; inset: 0; animation: moe-bob 2.4s ease-in-out infinite; transform-origin: 50% 100%; }',
    '.moe-pet.lazy .body { animation: moe-bob 4.2s ease-in-out infinite; }',
    '.moe-pet.giggle .body { animation: moe-giggle .12s linear infinite alternate; }',
    '.moe-pet.confused .body { transform: rotate(-12deg); animation: none; transition: transform .3s; }',
    '.moe-pet.hop .body { animation: moe-hop .45s ease-out; }',
    '.moe-pet svg { width: 100%; height: 100%; overflow: visible; filter: drop-shadow(0 4px 8px rgba(234,67,73,.35)); }',
    '.moe-pet .lid { transform-origin: center; transform: scaleY(0); transition: transform .08s; }',
    '.moe-pet.blink .lid, .moe-pet.lazy .lid { transform: scaleY(1); }',
    '.moe-pet.lazy .lid { transform: scaleY(.6); }',
    '.moe-pet .pupil { transition: transform .15s; }',
    '.moe-pet .m-happy, .moe-pet .m-o, .moe-pet .m-wave, .moe-pet .m-flat, .moe-pet .eyes-joy, .moe-pet .arm { display: none; }',
    '.moe-pet.mood-happy .m-happy, .moe-pet.mood-giggle .m-happy { display: block; }',
    '.moe-pet.mood-giggle .eyes-open { display: none; } .moe-pet.mood-giggle .eyes-joy { display: block; }',
    '.moe-pet.mood-surprised .m-o { display: block; }',
    '.moe-pet.mood-confused .m-wave { display: block; }',
    '.moe-pet.mood-lazy .m-flat { display: block; }',
    '.moe-pet.point .arm { display: block; }',
    '.moe-bubble { position: fixed; z-index: 1301; pointer-events: none; font: 800 13px "Nunito Sans", system-ui, sans-serif; color: #fff; background: #ea4349; padding: 3px 9px; border-radius: 999px;',
    '  opacity: 0; transform: translate(-50%, 4px) scale(.8); transition: opacity .2s, transform .2s; white-space: nowrap; }',
    '.moe-bubble.show { opacity: 1; transform: translate(-50%, 0) scale(1); }',
    '.moe-z { position: fixed; z-index: 1301; pointer-events: none; font: 800 12px system-ui; color: #ff9aa0; animation: moe-z 2.2s ease-out forwards; }',
    '.moe-target { outline: 3px solid #ff8a8f !important; outline-offset: 3px; border-radius: 12px; transition: outline-color .3s; }',
    '@keyframes moe-bob { 0%,100% { transform: translateY(0) scaleY(1); } 50% { transform: translateY(-3px) scaleY(1.03); } }',
    '@keyframes moe-hop { 0% { transform: translateY(0) scale(1,1); } 30% { transform: translateY(-14px) scale(.92,1.08); } 70% { transform: translateY(0) scale(1.08,.92); } 100% { transform: translateY(0) scale(1); } }',
    '@keyframes moe-giggle { from { transform: rotate(-6deg) translateY(-1px); } to { transform: rotate(6deg) translateY(0); } }',
    '@keyframes moe-z { from { opacity: 1; transform: translate(0,0) scale(.8); } to { opacity: 0; transform: translate(14px,-26px) scale(1.3); } }',
  ].join('\n');
  var style = document.createElement('style'); style.textContent = css; document.head.appendChild(style);

  // Light-red blob with the MoeAI peaks as ears, cheeks, eyes, several mouths and a pointing arm.
  var SVG = '<svg viewBox="0 0 46 50" aria-hidden="true">'
    + '<defs><radialGradient id="moeg" cx="40%" cy="35%" r="70%"><stop offset="0" stop-color="#ffb3b6"/><stop offset="1" stop-color="#f06a70"/></radialGradient></defs>'
    + '<path d="M9 16 L14 3 L19 13 L23 7 L27 13 L32 3 L37 16 Z" fill="#ea4349"/>'
    + '<ellipse cx="23" cy="31" rx="19" ry="17" fill="url(#moeg)"/>'
    + '<g class="arm"><path d="M40 30 Q48 26 52 22" stroke="#f06a70" stroke-width="4.5" stroke-linecap="round" fill="none"/><circle cx="52.5" cy="21.5" r="2.6" fill="#ea4349"/></g>'
    + '<ellipse cx="12" cy="35" rx="3.4" ry="2.2" fill="#ff6f86" opacity=".55"/><ellipse cx="34" cy="35" rx="3.4" ry="2.2" fill="#ff6f86" opacity=".55"/>'
    + '<g class="eyes-open"><ellipse cx="16" cy="28" rx="3.6" ry="4.4" fill="#fff"/><ellipse cx="30" cy="28" rx="3.6" ry="4.4" fill="#fff"/>'
    + '<circle class="pupil" cx="16.4" cy="28.6" r="2.2" fill="#2b0d10"/><circle class="pupil" cx="30.4" cy="28.6" r="2.2" fill="#2b0d10"/>'
    + '<rect class="lid" x="12" y="23.4" width="8" height="9.4" rx="4" fill="#f58c91"/><rect class="lid" x="26" y="23.4" width="8" height="9.4" rx="4" fill="#f58c91"/></g>'
    + '<g class="eyes-joy" stroke="#2b0d10" stroke-width="2" stroke-linecap="round" fill="none"><path d="M12.5 29 Q16 25 19.5 29"/><path d="M26.5 29 Q30 25 33.5 29"/></g>'
    + '<path class="m-happy" d="M18.5 36 Q23 40.5 27.5 36" stroke="#2b0d10" stroke-width="2" stroke-linecap="round" fill="#b8323a"/>'
    + '<ellipse class="m-o" cx="23" cy="37.5" rx="2.6" ry="3" fill="#2b0d10"/>'
    + '<path class="m-wave" d="M18 37.5 Q20 35.5 22 37.5 T26 37.5 T28 36.5" stroke="#2b0d10" stroke-width="1.8" stroke-linecap="round" fill="none"/>'
    + '<path class="m-flat" d="M19.5 37.5 H26.5" stroke="#2b0d10" stroke-width="2" stroke-linecap="round"/>'
    + '</svg>';

  var pet = document.createElement('div');
  pet.className = 'moe-pet mood-happy';
  pet.setAttribute('role', 'img');
  pet.setAttribute('aria-label', 'Moe, the EduMoe mascot');
  pet.innerHTML = '<div class="body">' + SVG + '</div>';
  var bubble = document.createElement('div'); bubble.className = 'moe-bubble';
  var pos = { x: -100, y: -100 }, home = null, busy = false, lastInput = Date.now(), mood = 'happy';

  function setMood(m) { mood = m; pet.className = pet.className.replace(/\bmood-\w+/, 'mood-' + m); pet.classList.toggle('lazy', m === 'lazy'); pet.classList.toggle('giggle', m === 'giggle'); pet.classList.toggle('confused', m === 'confused'); }
  function say(text, ms) {
    bubble.textContent = text; bubble.style.left = (pos.x + 23) + 'px'; bubble.style.top = (pos.y - 24) + 'px';
    bubble.classList.add('show'); clearTimeout(say.t); say.t = setTimeout(function () { bubble.classList.remove('show'); }, ms || 1400);
  }
  function moveTo(x, y, hop) {
    pos = { x: x, y: y };
    pet.style.transform = 'translate(' + Math.round(x) + 'px,' + Math.round(y) + 'px)';
    if (hop && !reduced) { pet.classList.remove('hop'); void pet.offsetWidth; pet.classList.add('hop'); }
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
    moveTo(r.left + r.width / 2 - 23, r.top - 42, hop);
  }
  function rest(hop) {
    var items = navItems();
    home = items.find(function (a) { return a.classList.contains('active') || a.classList.contains('on') || a.getAttribute('aria-current') === 'page'; }) || items[0];
    perchOn(home, hop);
  }

  // Eyes follow the pointer.
  document.addEventListener('pointermove', function (e) {
    lastInput = Date.now(); if (mood === 'lazy') setMood('happy');
    var cx = pos.x + 23, cy = pos.y + 28, dx = e.clientX - cx, dy = e.clientY - cy, d = Math.hypot(dx, dy) || 1;
    var px = dx / d * 1.3, py = dy / d * 1.3;
    pet.querySelectorAll('.pupil').forEach(function (p) { p.style.transform = 'translate(' + px + 'px,' + py + 'px)'; });
  }, { passive: true });

  // Hop to hovered nav items.
  document.addEventListener('pointerover', function (e) {
    if (busy || reduced) return;
    var a = e.target.closest && e.target.closest('.nav-links a, .navbar a.nav-btn-link, .em-dock a');
    if (a) { perchOn(a, true); if (Math.random() < 0.25) say(['ooh', 'this one?', 'go go', 'pick me'][Math.floor(Math.random() * 4)], 900); }
  });
  document.addEventListener('pointerout', function (e) {
    if (busy || reduced) return;
    var a = e.target.closest && e.target.closest('.nav-links, .navbar, .em-dock');
    if (a && !(e.relatedTarget && a.contains(e.relatedTarget))) setTimeout(function () { if (!busy) rest(true); }, 250);
  });

  // Tap Moe: giggles.
  pet.addEventListener('click', function (e) { e.stopPropagation(); giggle(['hehe', 'hihi', 'stop it 😆', 'ticklish!'][Math.floor(Math.random() * 4)]); });
  function giggle(text) { setMood('giggle'); say(text, 1300); setTimeout(function () { if (mood === 'giggle') setMood('happy'); }, 1300); }

  // Clicking empty space a few times: confused.
  var misses = [];
  document.addEventListener('click', function (e) {
    lastInput = Date.now();
    if (e.target.closest('a, button, input, textarea, select, label, [role=button], .moe-pet')) return;
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

  // Blinking, and getting lazy when nobody is around.
  (function blink() {
    setTimeout(function () { if (mood !== 'lazy') { pet.classList.add('blink'); setTimeout(function () { pet.classList.remove('blink'); }, 130); } blink(); }, 2500 + Math.random() * 3000);
  })();
  setInterval(function () {
    if (!busy && Date.now() - lastInput > 25000 && mood === 'happy') { setMood('lazy'); say('*yawn*', 1400); }
    if (mood === 'lazy') { var z = document.createElement('div'); z.className = 'moe-z'; z.textContent = 'z'; z.style.left = (pos.x + 34) + 'px'; z.style.top = (pos.y + 4) + 'px'; document.body.appendChild(z); setTimeout(function () { z.remove(); }, 2300); }
  }, 1600);

  // Mischief: point at a random button and giggle, or hide behind a card.
  function visible(el) { var r = el.getBoundingClientRect(); return r.width > 30 && r.height > 20 && r.top > 70 && r.bottom < window.innerHeight - 90 && r.left > 0 && r.right < window.innerWidth; }
  function pointAtButton() {
    var buttons = Array.prototype.slice.call(document.querySelectorAll('main a.btn, a.btn, button, .nav-cta, .feature-card, .subj-card, .cta-section a')).filter(visible);
    if (!buttons.length) return false;
    var target = buttons[Math.floor(Math.random() * buttons.length)], r = target.getBoundingClientRect();
    busy = true;
    moveTo(Math.max(6, r.left - 60), Math.max(70, r.top + r.height / 2 - 26), true);
    setTimeout(function () {
      pet.classList.add('point'); target.classList.add('moe-target'); setMood('giggle'); say(['psst, this one', 'click it 👀', 'hehe look'][Math.floor(Math.random() * 3)], 1800);
      setTimeout(function () { pet.classList.remove('point'); target.classList.remove('moe-target'); setMood('happy'); busy = false; rest(true); }, 2200);
    }, 650);
    return true;
  }
  function hideBehindCard() {
    var cards = Array.prototype.slice.call(document.querySelectorAll('.feature-card, .subj-card, .stat-card, .lg-card')).filter(visible);
    if (!cards.length) return false;
    var card = cards[Math.floor(Math.random() * cards.length)], r = card.getBoundingClientRect();
    busy = true; pet.classList.add('hiding');
    if (getComputedStyle(card).position === 'static') card.style.position = 'relative';
    card.style.zIndex = '2';
    moveTo(r.right - 36, r.top + 6, false);
    setTimeout(function () { moveTo(r.right - 30, r.top - 26, false); setMood('giggle'); say('peekaboo', 1200); }, 1300);
    setTimeout(function () { pet.classList.remove('hiding'); card.style.zIndex = ''; setMood('happy'); busy = false; rest(true); }, 3200);
    return true;
  }
  function mischief() {
    setTimeout(function () {
      if (!busy && !reduced && document.visibilityState === 'visible' && mood !== 'lazy') (Math.random() < 0.55 ? pointAtButton() : hideBehindCard()) || pointAtButton();
      mischief();
    }, 20000 + Math.random() * 20000);
  }

  function start() {
    document.body.appendChild(pet); document.body.appendChild(bubble);
    rest(false);
    setTimeout(function () { if (!busy) { rest(true); say('hi!', 1200); } }, 900);
    window.addEventListener('resize', function () { if (!busy) rest(false); });
    if (!reduced) mischief();
  }
  if (document.readyState === 'complete') start(); else window.addEventListener('load', function () { setTimeout(start, 600); });
})();
