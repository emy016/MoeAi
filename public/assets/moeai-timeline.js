/**
 * MoeAI's product timeline for the showcase: a plain-JS port of the Hyperiux
 * "Timeline" component (21st.dev), with a picture on every milestone.
 *
 * The section pins while the track slides sideways; the line draws across,
 * and each milestone grows its stem, pops its dot and slides its copy up line
 * by line as it reaches the middle (GSAP ScrollTrigger + SplitText, both free
 * since GSAP 3.13, loaded from jsDelivr). With reduced motion, or if GSAP
 * cannot load, the same content is a normal horizontally scrollable strip.
 *
 * EDIT THE MILESTONES HERE: dates and wording are a draft to correct.
 * Items alternate above and below the line in date order (4 above, 3 below).
 */
(function () {
  var MILESTONES = [
    { id: 'm1', year: '2025', month: 'September', content: 'CS Epic Save starts on Telegram: shared notes and past exams for first-year Computer Science.', img: '/assets/showcase/tg-thanks.webp' },
    { id: 'm2', year: '2025', month: 'November', content: 'The channel passes 200 students before the first midterms.', img: '/assets/showcase/tg-video.webp' },
    { id: 'm3', year: '2026', month: 'January', content: 'Emy, the study bot, answers in Egyptian Arabic, Franco and English.', img: '/assets/showcase/tg-bot.webp' },
    { id: 'm4', year: '2026', month: 'March', content: 'EduMoe goes online: courses, simulators, quizzes and a ranked arena.', img: '/assets/showcase/edumoe-site.webp' },
    { id: 'm5', year: '2026', month: 'June', content: 'The MoeAI app, built in React Native, is tested by 11 students.', img: '/assets/showcase/home-orange.webp' },
    { id: 'm6', year: '2026', month: 'August', content: 'MoeAI is pitched at the GenAI Hackathon 2026.', img: '/assets/showcase/hackathon.webp' },
    { id: 'm7', year: '2026', month: 'September', content: 'Lecturers upload their courses; MoeAI teaches from their own slides.', img: '/assets/showcase/tutor-crop.webp' },
  ];
  var TITLE = 'MoeAI, so far';
  var PERIOD = '2025 — 2026';
  var ACCENT = '#ea4349';
  var CDN = 'https://cdn.jsdelivr.net/npm/gsap@3.13.0/dist/';

  var root = document.getElementById('journey');
  if (!root) return;
  var top = MILESTONES.filter(function (_, i) { return i % 2 === 0; });
  var bottom = MILESTONES.filter(function (_, i) { return i % 2 === 1; });

  function item(m, below) {
    var stem = '<div class="tl-stem' + (below ? ' below' : '') + '">'
      + (below ? '<div class="tl-line jl-' + m.id + '"></div><div class="tl-dot jd-' + m.id + '"></div>' : '<div class="tl-dot jd-' + m.id + '"></div><div class="tl-line jl-' + m.id + '"></div>')
      + '</div>';
    var copy = '<div class="tl-copy"><img class="tl-img" src="' + m.img + '" alt="" loading="lazy" decoding="async">'
      + '<h4 class="title-' + m.id + '">' + m.year + ' ' + m.month + '</h4><p class="description-' + m.id + '">' + m.content + '</p></div>';
    return '<div class="tl-item' + (below ? ' below' : '') + '">' + stem + copy + '</div>';
  }

  root.innerHTML = '<div class="tl-stick"><div class="tl-track">'
    + '<div class="tl-hero"><img src="/assets/moeai-hand.webp" alt="A hand holding the MoeAI book, surrounded by course notes"></div>'
    + '<div class="tl-body">'
    + '<div class="tl-axis"><span class="tl-cap"></span><span class="tl-grow journey-line"></span><span class="tl-cap"></span></div>'
    + '<div class="tl-half tl-top"><div class="tl-title"><h2>' + TITLE + '</h2></div><div class="tl-items">' + top.map(function (m) { return item(m, false); }).join('') + '</div></div>'
    + '<div class="tl-half tl-bottom"><div class="tl-period"><p>' + PERIOD + '</p></div><div class="tl-items">' + bottom.map(function (m) { return item(m, true); }).join('') + '</div></div>'
    + '</div></div></div>';
  root.style.setProperty('--tl-accent', ACCENT);

  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function staticStrip() { root.classList.add('tl-static'); }
  if (reduced) { staticStrip(); return; }

  function load(src) {
    return new Promise(function (resolve, reject) { var s = document.createElement('script'); s.src = src; s.onload = resolve; s.onerror = reject; document.head.appendChild(s); });
  }
  load(CDN + 'gsap.min.js').then(function () { return Promise.all([load(CDN + 'ScrollTrigger.min.js'), load(CDN + 'SplitText.min.js')]); }).then(animate).catch(staticStrip);

  function animate() {
    var gsap = window.gsap, ScrollTrigger = window.ScrollTrigger, SplitText = window.SplitText;
    if (!gsap || !ScrollTrigger) return staticStrip();
    gsap.registerPlugin(ScrollTrigger); if (SplitText) gsap.registerPlugin(SplitText);
    var mobile = window.innerWidth < 600;
    var track = root.querySelector('.tl-track');
    function shift() {
      var items = root.querySelectorAll('.tl-item'), right = 0, left = track.getBoundingClientRect().left;
      for (var i = 0; i < items.length; i++) right = Math.max(right, items[i].getBoundingClientRect().right - left);
      return Math.max(0, (right + window.innerWidth * 0.06 - window.innerWidth) / track.offsetWidth * 100);
    }
    gsap.timeline({ scrollTrigger: { trigger: root, start: 'top top', end: mobile ? '82% 50%' : '92% bottom', scrub: true }, defaults: { ease: 'none' } })
      // Slide exactly far enough for the last milestone to end on screen.
      .fromTo(track, { xPercent: 0 }, { xPercent: function () { return -shift(); }, immediateRender: false });
    gsap.to(root.querySelector('.journey-line'), { width: mobile ? '65%' : '98%', ease: 'none', scrollTrigger: { trigger: root, start: mobile ? 'top 30%' : 'top 25%', end: mobile ? '80% 50%' : '92% bottom', scrub: true } });
    var positions = mobile
      ? [[22, 32], [28, 38], [36, 46], [45, 55], [52, 62], [60, 70], [69, 79]]
      : [[6, 26], [16, 36], [26, 46], [35, 55], [45, 65], [55, 75], [65, 85]];
    MILESTONES.forEach(function (m, i) {
      var below = i % 2 === 1;
      gsap.set('.jl-' + m.id, { scaleY: 0, transformOrigin: below ? 'top' : 'bottom' });
      gsap.set('.jd-' + m.id, { scale: 0 });
      var title = SplitText ? new SplitText('.title-' + m.id, { type: 'lines', mask: 'lines' }).lines : root.querySelectorAll('.title-' + m.id);
      var desc = SplitText ? new SplitText('.description-' + m.id, { type: 'lines', mask: 'lines' }).lines : root.querySelectorAll('.description-' + m.id);
      var img = root.querySelector('.title-' + m.id).parentNode.querySelector('.tl-img');
      var d = 1.4;
      gsap.timeline({ scrollTrigger: { trigger: root, start: positions[i][0] + '% 30%', end: positions[i][1] + '% 50%', scrub: true } })
        .to('.jl-' + m.id, { scaleY: 1, duration: d * 0.4 })
        .to('.jd-' + m.id, { scale: 1, duration: d * 0.4 }, '<')
        .fromTo(img, { opacity: 0, y: 30, scale: 0.94 }, { opacity: 1, y: 0, scale: 1, duration: d * 0.8, ease: 'power2.out' }, '<')
        .fromTo(title, { y: 100 }, { y: 0, delay: -0.8 * d, duration: d, stagger: 0.02, ease: 'power2.out' })
        .fromTo(desc, { y: 100 }, { y: 0, duration: d, stagger: 0.02, ease: 'power2.out' }, '<');
    });
    window.addEventListener('resize', function () { ScrollTrigger.refresh(); });
  }
})();
