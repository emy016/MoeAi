// ============================================================
    //  ICONS DEFINITION (inline SVG paths)
    // ============================================================
    const ICONS = {
      'graduation-cap': '<path d="M22 10L12 5 2 10l10 5 10-5z"/><path d="M6 12v5c0 1 2.7 2.5 6 2.5s6-1.5 6-2.5v-5"/><line x1="22" y1="10" x2="22" y2="15"/>',
      'rocket': '<path d="M4.5 16.5c-1.5 1.3-2 5-2 5s3.7-.5 5-2c.7-.8.7-2 0-2.8a2 2 0 0 0-3 0z"/><path d="M12 15l-3-3a12 12 0 0 1 3-8c2.5-2.5 5-3 7-3 0 2-.5 4.5-3 7a12 12 0 0 1-4 3z"/><path d="M9 12H4s.5-3 2-4 5 0 5 0"/><path d="M12 15v5s3-.5 4-2 0-5 0-5"/>',
      'play': '<polygon points="6 4 20 12 6 20 6 4" fill="currentColor" stroke="none"/>',
      'terminal': '<polyline points="5 8 9 12 5 16"/><line x1="12" y1="16" x2="18" y2="16"/><rect x="2" y="4" width="20" height="16" rx="2"/>',
      'brain': '<path d="M9 4a3 3 0 0 0-3 3 3 3 0 0 0-1 5.8V15a3 3 0 0 0 4 2.8A2.5 2.5 0 0 0 12 20V5a2.5 2.5 0 0 0-3-1z"/><path d="M15 4a3 3 0 0 1 3 3 3 3 0 0 1 1 5.8V15a3 3 0 0 1-4 2.8A2.5 2.5 0 0 1 12 20"/>',
      'trophy': '<path d="M6 4h12v4a6 6 0 0 1-12 0V4z"/><path d="M6 6H3v2a3 3 0 0 0 3 3M18 6h3v2a3 3 0 0 1-3 3"/><line x1="12" y1="14" x2="12" y2="18"/><path d="M8 21h8M9 18h6v3H9z"/>',
      'user': '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.5-6 8-6s8 2 8 6"/>',
      'eye': '<path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z"/><circle cx="12" cy="12" r="3"/>',
      'eye-slash': '<path d="M9.9 5A11 11 0 0 1 12 5c7 0 11 7 11 7a18 18 0 0 1-3 3.5M6 6a18 18 0 0 0-5 6s4 7 11 7a11 11 0 0 0 4-.7"/><path d="M10 10a3 3 0 0 0 4 4"/><line x1="2" y1="2" x2="22" y2="22"/>',
      'heart': '<path d="M12 21C-4 11 5 2 12 8 19 2 28 11 12 21z" fill="currentColor" stroke="none"/>',
      'times': '<line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/>',
      'tv': '<rect x="2" y="5" width="20" height="13" rx="2"/><polyline points="8 21 12 18 16 21"/>',
      'table': '<rect x="3" y="4" width="18" height="16" rx="1"/><line x1="3" y1="10" x2="21" y2="10"/><line x1="9" y1="4" x2="9" y2="20"/><line x1="15" y1="4" x2="15" y2="20"/>',
      'code': '<polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>',
      'layer-group': '<polygon points="12 2 22 8.5 12 15 2 8.5 12 2"/><polyline points="2 15.5 12 22 22 15.5"/>',
      'pencil-alt': '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/>',
      'envelope': '<rect x="2" y="4" width="20" height="16" rx="2"/><polyline points="2 6 12 13 22 6"/>',
      'microchip': '<rect x="6" y="6" width="12" height="12" rx="1"/><path d="M9 2v4M15 2v4M9 18v4M15 18v4M2 9h4M2 15h4M18 9h4M18 15h4"/>',
      'square-root-alt': '<path d="M3 12h2l2 7 4-16h10"/>',
      'dice': '<rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8.5" cy="8.5" r="1" fill="currentColor" stroke="none"/><circle cx="15.5" cy="15.5" r="1" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1" fill="currentColor" stroke="none"/>',
      'percent': '<line x1="19" y1="5" x2="5" y2="19"/><circle cx="7" cy="7" r="2.2"/><circle cx="17" cy="17" r="2.2"/>',
      'infinity': '<path d="M6 8a4 4 0 1 0 0 8c3 0 4-4 6-4s3 4 6 4a4 4 0 1 0 0-8c-3 0-4 4-6 4S9 8 6 8z"/>',
      'bolt': '<polygon points="13 2 4 14 11 14 10 22 20 9 13 9 13 2" fill="currentColor" stroke="none"/>',
      'atom': '<circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none"/><ellipse cx="12" cy="12" rx="10" ry="4.5"/><ellipse cx="12" cy="12" rx="10" ry="4.5" transform="rotate(60 12 12)"/><ellipse cx="12" cy="12" rx="10" ry="4.5" transform="rotate(120 12 12)"/>',
      'project-diagram': '<rect x="2" y="4" width="6" height="5" rx="1"/><rect x="16" y="4" width="6" height="5" rx="1"/><rect x="9" y="15" width="6" height="5" rx="1"/><path d="M5 9v2a2 2 0 0 0 2 2h3M19 9v2a2 2 0 0 1-2 2h-3"/>',
      'check-double': '<polyline points="1 12 5 16 13 8"/><polyline points="9 14 12 17 21 8"/>',
      'binary': '<rect x="4" y="3" width="7" height="8" rx="1"/><rect x="13" y="13" width="7" height="8" rx="1"/><path d="M6 21h4M8 21v-6M18 3l-2 1"/>',
      'memory': '<rect x="2" y="7" width="20" height="10" rx="1"/><path d="M6 7v-2M10 7v-2M14 7v-2M18 7v-2M6 21v-4M18 21v-4"/><line x1="6" y1="12" x2="18" y2="12"/>',
      'book': '<path d="M4 4a2 2 0 0 1 2-2h13v18H6a2 2 0 0 0-2 2V4z"/><line x1="8" y1="7" x2="15" y2="7"/>',
      'chart-line': '<polyline points="3 3 3 21 21 21"/><polyline points="7 15 11 10 14 13 20 6"/>',
      'telegram': '<path d="M22 3L2 11l6 2 2 6 3-4 5 4 4-16z" fill="currentColor" stroke="none"/><path d="M8 13l9-6-6 7" fill="none" stroke="var(--bg1,#0a0a0f)" stroke-width="1"/>',
      'youtube': '<rect x="2" y="5" width="20" height="14" rx="4"/><polygon points="10 9 16 12 10 15 10 9" fill="currentColor" stroke="none"/>',
    };

    function injectIcons(root) {
      (root || document).querySelectorAll('i.ic[data-ic]').forEach(el => {
        if (el.dataset.done) return;
        const p = ICONS[el.dataset.ic];
        if (p) { el.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true">' + p + '</svg>'; el.dataset.done = '1'; }
      });
    }

    // ─── Inject icons immediately on load ──────────────────────
    document.addEventListener('DOMContentLoaded', () => injectIcons());

    // ============================================================
    //  PERFORMANCE DETECTION
    // ============================================================
    (function() {
      const html = document.documentElement;
      const cores = navigator.hardwareConcurrency || 4;
      const mem = navigator.deviceMemory || 4;
      const smallScreen = window.matchMedia('(max-width: 900px)').matches;
      const coarse = window.matchMedia('(pointer: coarse)').matches;
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      if (cores <= 4 || mem <= 4 || (coarse && smallScreen)) html.classList.add('perf-low');
      if (reduce) html.classList.add('reduce-motion');
      window.__perfLow = cores <= 4 || mem <= 4 || (coarse && smallScreen);
      window.__reduceMotion = reduce;
    })();

    // ============================================================
    //  SCRAMBLE TEXT ENGINE
    //
    //  A small, dependency-free port of the Originkit "Scramble Text"
    //  component's core ideas, adapted to run without a React runtime:
    //
    //   • Enter modes
    //     - 'oneLine'   reveals every character in reading order.
    //     - 'multiLine' reveals each visual line in parallel, so a
    //                   heading that wraps onto two lines builds both
    //                   at once instead of finishing one before the
    //                   next starts.
    //     - 'random'    reveals every character in shuffled order.
    //     Each glyph rolls through a few random look-alikes before
    //     locking to its real value, then flickers briefly in an
    //     accent colour — the same shape as the source component's
    //     scramble-then-lock-then-flicker sequence.
    //
    //   • Hover modes
    //     - 'diffusion' lights a small radius of characters around
    //                   the cursor as it moves, fading them back out
    //                   once the cursor moves away.
    //     - 'wave'      sweeps a ░▒▓█ cursor across the whole line on
    //                   mouseenter, glitching everything ahead of the
    //                   sweep and settling everything behind it —
    //                   the vanilla-JS analogue of the source
    //                   component's waveOneLine / waveMultiLine modes.
    //
    //  Every effect falls back to an instant, static reveal when the
    //  visitor prefers reduced motion, on low-power devices, or (for
    //  hover only) on touch input, where hovering has no meaning.
    //
    //  Usage:
    //    createScrambleText(el, {
    //      words,          // optional raw string, '\n' = line break.
    //                      // Omit to use the element's existing text.
    //      gradientWords,  // array of word strings painted with the
    //                      // site's accent gradient.
    //      blockLines,     // true: '\n' becomes a forced block-level
    //                      // line break (for short, hand-set headings
    //                      // like the hero). false: text reflows
    //                      // naturally and lines are measured after
    //                      // layout (for ordinary paragraph text).
    //      mode,           // 'oneLine' | 'multiLine' | 'random'
    //      hover,          // 'none' | 'diffusion' | 'wave'
    //      hoverRadius, waveDurationMs, scrambleFrames,
    //      frameDelayMs, revealDurationMs, flickerMs,
    //    })
    // ============================================================
    const GLYPHS_UPPER = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const GLYPHS_LOWER = 'abcdefghijklmnopqrstuvwxyz';
    const WAVE_CURSOR_CHARS = '░▒▓█';

    function lookalikeGlyph(char) {
      const isLower = char === char.toLowerCase() && char !== char.toUpperCase();
      const pool = isLower ? GLYPHS_LOWER : GLYPHS_UPPER;
      return pool[Math.floor(Math.random() * pool.length)];
    }

    function createScrambleText(el, options) {
      if (!el) return;
      const config = Object.assign({
        words: null,
        gradientWords: [],
        blockLines: false,
        mode: 'oneLine',
        hover: 'none',
        hoverRadius: 2,
        waveDurationMs: 900,
        scrambleFrames: 4,
        frameDelayMs: 30,
        revealDurationMs: 1200,
        flickerMs: 130,
      }, options);

      const reduceMotion = document.documentElement.classList.contains('reduce-motion');
      const perfLow = document.documentElement.classList.contains('perf-low');
      const coarsePointer = window.matchMedia('(pointer: coarse)').matches;
      const sourceText = config.words != null ? config.words : el.textContent;

      el.setAttribute('aria-label', sourceText.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim());
      el.innerHTML = '';
      const chars = []; // flat, reading-order list of { el, char, line }

      // Tokenize a single line into words + the exact whitespace that
      // precedes each one, mirroring the source component's approach:
      // gaps are rendered verbatim but never wrapped in a char span.
      function appendLine(text, container) {
        const tokens = text.match(/\s+|\S+/g) || [];
        tokens.forEach((tok) => {
          if (/^\s+$/.test(tok)) {
            container.appendChild(document.createTextNode(tok));
            return;
          }
          const wordEl = document.createElement('span');
          wordEl.className = 'stx-word' + (config.gradientWords.includes(tok) ? ' gradient-text' : '');
          tok.split('').forEach((char) => {
            const charEl = document.createElement('span');
            charEl.className = 'hc is-hidden';
            charEl.textContent = char;
            charEl.setAttribute('aria-hidden', 'true');
            wordEl.appendChild(charEl);
            chars.push({ el: charEl, char, line: 0 });
          });
          container.appendChild(wordEl);
        });
      }

      const sourceLines = sourceText.split('\n');
      if (config.blockLines) {
        sourceLines.forEach((line) => {
          const lineEl = document.createElement('span');
          lineEl.className = 'stx-line';
          appendLine(line, lineEl);
          el.appendChild(lineEl);
        });
      } else {
        sourceLines.forEach((line, i) => {
          appendLine(line, el);
          if (i < sourceLines.length - 1) el.appendChild(document.createElement('br'));
        });
      }

      // Measure each character's rendered row so 'multiLine' mode and
      // both hover modes can reason about "this line" even when the
      // browser — not an authored '\n' — decided where text wraps.
      function detectLines() {
        const tops = chars.map((c) => Math.round(c.el.getBoundingClientRect().top));
        const uniqueTops = [...new Set(tops)].sort((a, b) => a - b);
        chars.forEach((c, i) => { c.line = uniqueTops.indexOf(tops[i]); });
        return uniqueTops.length;
      }

      // ── Enter animation ─────────────────────────────────────────
      function revealChar(item) {
        const frames = perfLow ? Math.min(2, config.scrambleFrames) : config.scrambleFrames;
        item.el.classList.remove('is-hidden');
        let frame = 0;
        (function tick() {
          if (frame < frames) {
            item.el.textContent = lookalikeGlyph(item.char);
            item.el.classList.add('is-ghost');
            frame++;
            setTimeout(tick, config.frameDelayMs);
          } else {
            item.el.textContent = item.char;
            item.el.classList.remove('is-ghost');
            item.el.classList.add('is-flicker');
            setTimeout(() => item.el.classList.remove('is-flicker'), config.flickerMs);
          }
        })();
      }

      function playReveal() {
        if (reduceMotion) {
          chars.forEach((item) => item.el.classList.remove('is-hidden'));
          return;
        }
        detectLines();
        if (config.mode === 'multiLine') {
          const byLine = new Map();
          chars.forEach((c) => {
            if (!byLine.has(c.line)) byLine.set(c.line, []);
            byLine.get(c.line).push(c);
          });
          byLine.forEach((lineChars) => {
            const stepDelay = Math.max(14, config.revealDurationMs / Math.max(1, lineChars.length));
            lineChars.forEach((c, i) => setTimeout(() => revealChar(c), i * stepDelay));
          });
        } else if (config.mode === 'random') {
          const shuffled = [...chars].sort(() => Math.random() - 0.5);
          const stepDelay = Math.max(10, config.revealDurationMs / Math.max(1, shuffled.length));
          shuffled.forEach((c, i) => setTimeout(() => revealChar(c), i * stepDelay));
        } else {
          const stepDelay = Math.max(14, config.revealDurationMs / Math.max(1, chars.length));
          chars.forEach((c, i) => setTimeout(() => revealChar(c), i * stepDelay));
        }
      }

      let hasPlayed = false;
      const revealObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !hasPlayed) {
            hasPlayed = true;
            playReveal();
            revealObserver.disconnect();
          }
        });
      }, { threshold: 0.2 });
      revealObserver.observe(el);

      // ── Hover ────────────────────────────────────────────────────
      // Skipped on touch input, low-power devices, or reduced motion —
      // there's no pointer to hover with, or no budget to spend on it.
      if (config.hover === 'none' || perfLow || reduceMotion || coarsePointer) return;

      if (config.hover === 'diffusion') {
        let pendingFrame = null;
        let active = new Set();
        const clear = (indices) => indices.forEach((i) => {
          chars[i].el.classList.remove('is-glitch');
          chars[i].el.textContent = chars[i].char;
        });

        el.addEventListener('mousemove', (event) => {
          if (pendingFrame) return;
          const { clientX, clientY } = event;
          pendingFrame = requestAnimationFrame(() => {
            pendingFrame = null;
            detectLines();
            let pivot = null, pivotDist = Infinity;
            chars.forEach((item, i) => {
              const rect = item.el.getBoundingClientRect();
              if (clientY < rect.top - 6 || clientY > rect.bottom + 6) return;
              const centerX = rect.left + rect.width / 2;
              const dist = Math.abs(centerX - clientX);
              if (dist < pivotDist) { pivotDist = dist; pivot = i; }
            });
            if (pivot === null) { clear(active); active = new Set(); return; }

            const line = chars[pivot].line;
            const next = new Set();
            for (let offset = -config.hoverRadius; offset <= config.hoverRadius; offset++) {
              const i = pivot + offset;
              if (i < 0 || i >= chars.length || chars[i].line !== line) continue;
              next.add(i);
            }
            clear([...active].filter((i) => !next.has(i)));
            next.forEach((i) => {
              chars[i].el.classList.add('is-glitch');
              chars[i].el.textContent = lookalikeGlyph(chars[i].char);
            });
            active = next;
          });
        });

        el.addEventListener('mouseleave', () => { clear(active); active = new Set(); });
      }

      if (config.hover === 'wave') {
        let playing = false;
        el.addEventListener('mouseenter', () => {
          if (playing) return;
          playing = true;
          detectLines();
          const start = performance.now();
          const total = chars.length;
          (function tick() {
            const t = Math.min(1, (performance.now() - start) / config.waveDurationMs);
            const frontier = t * total;
            chars.forEach((c, i) => {
              if (i === Math.floor(frontier)) {
                c.el.classList.add('is-glitch');
                c.el.textContent = WAVE_CURSOR_CHARS[Math.floor(Math.random() * WAVE_CURSOR_CHARS.length)];
              } else if (i < frontier) {
                c.el.classList.remove('is-glitch');
                c.el.textContent = c.char;
              } else {
                c.el.classList.add('is-glitch');
                c.el.textContent = lookalikeGlyph(c.char);
              }
            });
            if (t < 1) {
              requestAnimationFrame(tick);
            } else {
              chars.forEach((c) => { c.el.classList.remove('is-glitch'); c.el.textContent = c.char; });
              playing = false;
            }
          })();
        });
      }
    }

    // ── Apply the engine ─────────────────────────────────────────
    // Hero: hand-set line breaks and two gradient words, exactly as
    // designed; diffusion hover mirrors the original single-line mode.
    createScrambleText(document.getElementById('heroTitle'), {
      words: 'Learn\nComputer Science\nThe Cool Way',
      gradientWords: ['Computer', 'Cool'],
      blockLines: true,
      mode: 'oneLine',
      hover: 'diffusion',
      hoverRadius: 2,
      revealDurationMs: 1300,
    });

    // Section titles: reuse the same engine with the two enter/hover
    // modes the hero doesn't exercise, for closer parity with the
    // full set of modes the source Originkit component exposes.
    document.querySelectorAll('.sf-title').forEach((el, i) => {
      createScrambleText(el, i === 0
        ? { mode: 'random', hover: 'wave', waveDurationMs: 700, revealDurationMs: 900 }
        : { mode: 'multiLine', hover: 'diffusion', revealDurationMs: 900 });
    });

    // ============================================================
    //  CANVAS BACKGROUND
    // ============================================================
    (function() {
      const canvas = document.getElementById('bg-canvas');
      if (!canvas) return;
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      const ctx = canvas.getContext('2d');

      const texts = [
        "V = IR", "P = VI", "ε = -dΦ/dt", "∮E·dA = Q/ε₀", "∑V = 0",
        "V = L·dI/dt", "F = qE", "F = ma", "U = kq₁q₂/r", "C = Q/V",
        "R = ρL/A", "Lenz's Law", "Kirchhoff's Law", "Ohm's Law",
        "∫x²dx = x³/3 + C", "d/dx sin(x) = cos(x)", "lim(x→0) sinx/x = 1",
        "Σ 1/n² = π²/6", "dy/dx + P(x)y = Q(x)", "y'' + 2y' + 5y = 0",
        "A·B = Y", "A+B = Y", "A' = Y", "(AB)' = Y", "(A+B)' = Y",
        "A⊕B = Y", "A⊙B = Y",
        "cout << hello;", "int* ptr = &x;", "#include <iostream>",
        "using namespace std;", "for(int i=0;i<10;i++)", "if(x>0) {}",
        "struct Node { int data; };", "class Student { };",
        "A ∪ B", "A ∩ B", "A ⊆ B", "(A∪B)' = A'∩B'", "P ∧ Q → P",
        "∀x ∃y", "∅", "{}",
        "1010₂ = 10₁₀", "1111₂ = 15₁₀", "0101₂ = 5₁₀", "1100₂ = 12₁₀",
        "P(A|B) = P(B|A)P(A)/P(B)", "P(X=k)=C(n,k)pᵏ(1-p)ⁿ⁻ᵏ",
        "P(X=k)=e⁻ˡλᵏ/k!", "E[X] = μ", "Var(X) = σ²"
      ];

      const particles = [];
      const count = window.__perfLow ? 60 : 150;
      for (let i = 0; i < count; i++) {
        particles.push({
          text: texts[Math.floor(Math.random() * texts.length)],
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          vx: (Math.random() - 0.5) * 0.3,
          vy: (Math.random() - 0.5) * 0.2,
          alpha: 0.06 + Math.random() * 0.12,
          size: 12 + Math.random() * 14
        });
      }

      let mouseX = 0,
        mouseY = 0;
      canvas.addEventListener('mousemove', (e) => { mouseX = e.clientX;
        mouseY = e.clientY; });
      canvas.addEventListener('mouseleave', () => { mouseX = -9999;
        mouseY = -9999; });

      function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const isTerm = document.documentElement.getAttribute('data-theme') === 'terminal';
        for (const p of particles) {
          const dx = p.x - mouseX,
            dy = p.y - mouseY;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 120) {
            const force = (120 - dist) / 120 * 0.8;
            const angle = Math.atan2(dy, dx);
            p.x += Math.cos(angle) * force;
            p.y += Math.sin(angle) * force;
          }
          p.x += p.vx;
          p.y += p.vy;
          if (p.x < -50) p.x = canvas.width + 50;
          if (p.x > canvas.width + 50) p.x = -50;
          if (p.y < -50) p.y = canvas.height + 50;
          if (p.y > canvas.height + 50) p.y = -50;
          ctx.font = `${p.size}px var(--font-mono)`;
          ctx.fillStyle = isTerm ?
            `rgba(79, 255, 143, ${p.alpha * 1.4})` :
            `rgba(100, 100, 150, ${p.alpha})`;
          ctx.fillText(p.text, p.x, p.y);
        }
        requestAnimationFrame(draw);
      }
      draw();

      window.addEventListener('resize', () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
      });
    })();

    // ============================================================
    //  THEME SYSTEM
    // ============================================================
    function clearCustomInlineStyles() {
      const root = document.documentElement;
      ['--custom-accent', '--custom-accent2', '--custom-accent3', '--custom-glow',
        '--custom-glow2', '--custom-border', '--custom-border2', '--custom-tint',
        '--custom-tint2', '--custom-tint3'
      ].forEach(v => root.style.removeProperty(v));
      document.querySelectorAll('.bg-orb-1, .bg-orb-2, .bg-orb-3, .btn-fire, .nav-cta, ' +
          '.nav-logo-mark, .m-btn-fire, .feature-icon, .float-win-badge, ' +
          '.gradient-text, .section-label-dot, .tab-item')
        .forEach(el => {
          el.style.removeProperty('background');
          el.style.removeProperty('color');
          el.style.removeProperty('-webkit-background-clip');
          el.style.removeProperty('-webkit-text-fill-color');
          el.style.removeProperty('background-clip');
        });
      const wrap = document.getElementById('customColorWrap');
      if (wrap) wrap.style.removeProperty('box-shadow');
    }

    function setTheme(theme, el) {
      clearCustomInlineStyles();
      if (theme === 'terminal') {
        document.documentElement.setAttribute('data-theme', 'terminal');
        localStorage.setItem('edumoe-theme', 'terminal');
        localStorage.removeItem('edumoe-custom-color');
        showToast('$ mode --terminal');
        document.querySelectorAll('.theme-dot').forEach(d => d.classList.remove('active'));
        if (el) el.classList.add('active');
        updateCRTButton();
        return;
      }
      if (theme === 'ruby') {
        document.documentElement.removeAttribute('data-theme');
        document.getElementById('customColorPicker').value = '#e11d48';
        document.getElementById('customColorWrap').style.background = '#e11d48';
        localStorage.removeItem('edumoe-custom-color');
        localStorage.setItem('edumoe-theme', 'ruby');
        showToast('Theme: Ruby');
      } else {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('edumoe-theme', theme);
        localStorage.removeItem('edumoe-custom-color');
        const colorMap = { lava: '#ff5a1f', space: '#7c3aed', oxford: '#00d4ff', gray: '#6b7280', light: '#111111' };
        if (colorMap[theme]) {
          document.getElementById('customColorPicker').value = colorMap[theme];
          document.getElementById('customColorWrap').style.background = colorMap[theme];
        }
        showToast('Theme: ' + theme.charAt(0).toUpperCase() + theme.slice(1));
      }
      document.querySelectorAll('.theme-dot').forEach(d => d.classList.remove('active'));
      if (el) el.classList.add('active');
      updateCRTButton();
    }

    function setCustomTheme(color) {
      clearCustomInlineStyles();
      const r = parseInt(color.slice(1, 3), 16);
      const g = parseInt(color.slice(3, 5), 16);
      const b = parseInt(color.slice(5, 7), 16);
      document.documentElement.setAttribute('data-theme', 'custom');
      const root = document.documentElement;
      root.style.setProperty('--custom-accent', color);
      root.style.setProperty('--custom-accent2', `rgb(${Math.min(r+40,255)}, ${Math.min(g+40,255)}, ${Math.min(b+40,255)})`);
      root.style.setProperty('--custom-accent3', `rgb(${Math.min(r+80,255)}, ${Math.min(g+80,255)}, ${Math.min(b+80,255)})`);
      root.style.setProperty('--custom-glow', `rgba(${r},${g},${b},0.35)`);
      root.style.setProperty('--custom-glow2', `rgba(${r},${g},${b},0.14)`);
      root.style.setProperty('--custom-border', `rgba(${r},${g},${b},0.18)`);
      root.style.setProperty('--custom-border2', `rgba(${r},${g},${b},0.32)`);
      root.style.setProperty('--custom-tint', `rgba(${r},${g},${b},0.05)`);
      root.style.setProperty('--custom-tint2', `rgba(${r},${g},${b},0.10)`);
      root.style.setProperty('--custom-tint3', `rgba(${r},${g},${b},0.16)`);
      document.getElementById('customColorWrap').style.background = color;
      document.querySelectorAll('.theme-dot').forEach(d => d.classList.remove('active'));
      localStorage.setItem('edumoe-theme', 'custom');
      localStorage.setItem('edumoe-custom-color', color);
      updateCRTButton();
      showToast('🎨 Custom color');
    }

    function toggleCRT() {
      const html = document.documentElement;
      const btn = document.getElementById('crtToggle');
      const off = html.classList.toggle('no-crt');
      localStorage.setItem('edumoe-crt', off ? 'off' : 'on');
      if (btn) btn.classList.toggle('off', off);
      showToast(off ? '$ crt --off' : '$ crt --on');
    }

    function updateCRTButton() {
      const btn = document.getElementById('crtToggle');
      if (!btn) return;
      const isTerminal = document.documentElement.getAttribute('data-theme') === 'terminal';
      btn.style.display = isTerminal ? 'inline-flex' : 'none';
      btn.classList.toggle('off', document.documentElement.classList.contains('no-crt'));
    }

    // ─── Restore theme ──────────────────────────────────────────
    const savedTheme = localStorage.getItem('edumoe-theme') || 'ruby';
    const savedColor = localStorage.getItem('edumoe-custom-color');
    if (savedTheme === 'custom' && savedColor) {
      setCustomTheme(savedColor);
      document.getElementById('customColorPicker').value = savedColor;
      document.getElementById('customColorWrap').style.background = savedColor;
    } else if (savedTheme !== 'ruby' && savedTheme !== 'custom') {
      document.documentElement.setAttribute('data-theme', savedTheme);
    }
    const crtPref = localStorage.getItem('edumoe-crt');
    if (crtPref === 'off' || (crtPref === null && window.matchMedia('(prefers-reduced-motion: reduce)').matches)) {
      document.documentElement.classList.add('no-crt');
    }

    // ─── Color picker ──────────────────────────────────────────
    document.getElementById('customColorPicker').addEventListener('input', function(e) {
      setCustomTheme(e.target.value);
    });

    document.addEventListener('DOMContentLoaded', () => {
      const dot = document.getElementById('td-' + savedTheme);
      if (dot && savedTheme !== 'custom' && savedTheme !== 'ruby') dot.classList.add('active');
      else if (savedTheme === 'ruby') document.getElementById('td-ruby')?.classList.add('active');
      updateCRTButton();
      const crtBtn = document.getElementById('crtToggle');
      if (crtBtn && document.documentElement.classList.contains('no-crt')) crtBtn.classList.add('off');
    });

    // ============================================================
    //  TOAST
    // ============================================================
    let toastTimer;

    function showToast(msg) {
      const t = document.getElementById('toast'),
        m = document.getElementById('toast-msg');
      if (!t || !m) return;
      m.textContent = msg;
      t.classList.add('show');
      clearTimeout(toastTimer);
      toastTimer = setTimeout(() => t.classList.remove('show'), 3000);
    }

    // ============================================================
    //  SCROLL REVEAL + NAV CONDENSE (glass stays transparent)
    // ============================================================
    function initScrollEffects() {
      document.querySelectorAll('.subj-card[onclick]').forEach(el => {
        if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '0');
        el.setAttribute('role', 'button');
        el.addEventListener('keydown', ev => {
          if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault();
            el.click(); }
        });
      });

      const reveals = document.querySelectorAll('.reveal');
      if (window.__reduceMotion || !('IntersectionObserver' in window)) {
        reveals.forEach(r => r.classList.add('in'));
      } else {
        const io = new IntersectionObserver((entries) => {
          entries.forEach(e => {
            if (e.isIntersecting) { e.target.classList.add('in');
              io.unobserve(e.target); }
          });
        }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
        reveals.forEach(r => io.observe(r));
      }

      const nav = document.querySelector('.navbar');
      if (nav && 'IntersectionObserver' in window) {
        const sentinel = document.createElement('div');
        sentinel.style.cssText = 'position:absolute;top:120px;height:1px;width:1px;';
        document.body.appendChild(sentinel);
        new IntersectionObserver(([e]) => {
          nav.classList.toggle('scrolled', !e.isIntersecting);
        }, { threshold: 0 }).observe(sentinel);
      }
    }

    // ============================================================
    //  ORBIT ANIMATION (Smooth Elliptical with Depth) + KaTeX Render
    // ============================================================
    // ============================================================
    //  SPHERE GALLERY (8 CS-themed image nodes orbiting the core)
    // ============================================================
    // ============================================================
    //  SPHERE GALLERY 3D — raw WebGL nucleus + orbiting equation nodes
    //  (ported from the Originkit component source, no dependencies)
    // ============================================================
    function initOrbits() {
      const hostEl = document.getElementById('orbitContainer');
      if (!hostEl) return;
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      if (window.matchMedia('(max-width: 700px)').matches) return;

      // ─── shaders ────────────────────────────────────────────
      const QUAD_VERT = `
precision highp float;
attribute vec2 aCorner;
uniform mat4 uMVP;
varying vec2 vUv;
void main() {
  vUv = aCorner + 0.5;
  gl_Position = uMVP * vec4(aCorner, 0.0, 1.0);
}`;
      const QUAD_FRAG = `
precision highp float;
varying vec2 vUv;
uniform sampler2D uMap;
uniform float uHasTex;
uniform vec2  uHalf;
uniform float uRadius;
uniform float uAA;
uniform float uOpacity;
uniform float uDim;
uniform vec3  uPlaceholder;
float sdRoundBox(vec2 p, vec2 b, float r) {
  vec2 q = abs(p) - b + r;
  return min(max(q.x, q.y), 0.0) + length(max(q, 0.0)) - r;
}
void main() {
  vec2 p = (vUv - 0.5) * 2.0 * uHalf;
  float sHalf = min(uHalf.x, uHalf.y);
  float t = sHalf > 0.0 ? clamp(uRadius / sHalf, 0.0, 1.0) : 0.0;
  vec2 box = mix(uHalf, vec2(sHalf), t);
  float d = sdRoundBox(p, box, uRadius);
  float aa = max(uAA, 1e-5);
  float mask = 1.0 - smoothstep(-aa, aa, d);
  if (mask <= 0.002) discard;
  vec3 col = mix(uPlaceholder, texture2D(uMap, vUv).rgb, uHasTex);
  col *= uDim;
  float a = mask * uOpacity;
  if (a <= 0.002) discard;
  gl_FragColor = vec4(col * a, a);
}`;
      const SOLID_VERT = `
precision highp float;
attribute vec3 aPos;
uniform mat4 uMVP;
uniform float uScale;
void main() { gl_Position = uMVP * vec4(aPos * uScale, 1.0); }`;
      const SOLID_FRAG = `
precision mediump float;
uniform vec4 uColor;
void main() { gl_FragColor = vec4(uColor.rgb * uColor.a, uColor.a); }`;

      // ─── constants ──────────────────────────────────────────
      const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));
      const BASE_SPIN = 0.22;
      const SPRING_STIFFNESS = 70;
      const HOVER_POP = 0.3;
      const BILLBOARD_BLEND = 0.75;
      const RADIUS = 12;
      const DAMPING = 0.6;
      const FOV = 45;
      const MIN_DIST = 18;
      const MAX_DIST = 70;
      const REST_DIST_MUL = 2.8;
      const MAX_BRANCHES = 60;
      const ZOOM_GAIN = 1;
      const ORBIT_SPEED = 0.25;
      const ORBIT_DAMPING = 0.6;
      const ORBIT_LIMIT = 70;
      const DEPTH_FLOOR = 0.32;
      const ZOOM_RATE = 9;
      const CLICK_SLOP_PX = 5;
      const CLICK_MS = 450;
      const PLACEHOLDER = '#1b1b20';
      const SPHERE_W = 32;
      const SPHERE_H = 24;
      const NEAR = 0.1;
      const FAR = 2000;

      function hash01(i) { const s = Math.sin(i * 12.9898 + 78.233) * 43758.5453; return s - Math.floor(s); }
      function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }

      function parseColor(input, fallback) {
        if (!input) return fallback.slice();
        const s = String(input).trim();
        const m = s.match(/^rgba?\(([^)]+)\)$/i);
        if (m) {
          const parts = m[1].split(/[,\s/]+/).filter(Boolean);
          const ch = (t) => t.indexOf('%') >= 0 ? parseFloat(t) / 100 : parseFloat(t) / 255;
          const r = ch(parts[0] || '0'), g = ch(parts[1] || '0'), b = ch(parts[2] || '0');
          const a = parts[3] === undefined ? 1 : parseFloat(parts[3]);
          if ([r, g, b, a].some((v) => !isFinite(v))) return fallback.slice();
          return [clamp(r, 0, 1), clamp(g, 0, 1), clamp(b, 0, 1), clamp(a, 0, 1)];
        }
        let h = s.replace(/^#/, '');
        if (h.length === 3 || h.length === 4) h = h.split('').map((c) => c + c).join('');
        if (h.length !== 6 && h.length !== 8) return fallback.slice();
        const n = parseInt(h, 16);
        if (!isFinite(n)) return fallback.slice();
        if (h.length === 6) return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255, 1];
        return [((n >>> 24) & 255) / 255, ((n >>> 16) & 255) / 255, ((n >>> 8) & 255) / 255, (n & 255) / 255];
      }

      function mat4() { const m = new Float32Array(16); m[0] = m[5] = m[10] = m[15] = 1; return m; }
      function perspectiveMat(out, fovyRad, aspect) {
        const f = 1 / Math.tan(fovyRad / 2);
        out.fill(0);
        out[0] = f / aspect; out[5] = f;
        out[10] = (FAR + NEAR) / (NEAR - FAR); out[11] = -1;
        out[14] = (2 * FAR * NEAR) / (NEAR - FAR);
        return out;
      }
      function mul(out, a, b) {
        for (let c = 0; c < 4; c++) {
          const b0 = b[c * 4], b1 = b[c * 4 + 1], b2 = b[c * 4 + 2], b3 = b[c * 4 + 3];
          out[c * 4] = a[0] * b0 + a[4] * b1 + a[8] * b2 + a[12] * b3;
          out[c * 4 + 1] = a[1] * b0 + a[5] * b1 + a[9] * b2 + a[13] * b3;
          out[c * 4 + 2] = a[2] * b0 + a[6] * b1 + a[10] * b2 + a[14] * b3;
          out[c * 4 + 3] = a[3] * b0 + a[7] * b1 + a[11] * b2 + a[15] * b3;
        }
        return out;
      }
      function rigView(out, yaw, pitch, camZ) {
        const a = Math.cos(pitch), b = Math.sin(pitch), c = Math.cos(yaw), d = Math.sin(yaw);
        out[0] = c; out[1] = 0; out[2] = -d; out[3] = 0;
        out[4] = d * b; out[5] = a; out[6] = c * b; out[7] = 0;
        out[8] = a * d; out[9] = -b; out[10] = a * c; out[11] = 0;
        out[12] = 0; out[13] = 0; out[14] = -camZ; out[15] = 1;
        return out;
      }
      function rigBasis(yaw, pitch) {
        const a = Math.cos(pitch), b = Math.sin(pitch), c = Math.cos(yaw), d = Math.sin(yaw);
        return [c, d * b, a * d, 0, a, -b, -d, c * b, a * c];
      }
      function applyBasis(R, x, y, z, out) {
        out[0] = R[0] * x + R[1] * y + R[2] * z;
        out[1] = R[3] * x + R[4] * y + R[5] * z;
        out[2] = R[6] * x + R[7] * y + R[8] * z;
      }
      function applyBasisT(R, x, y, z, out) {
        out[0] = R[0] * x + R[3] * y + R[6] * z;
        out[1] = R[1] * x + R[4] * y + R[7] * z;
        out[2] = R[2] * x + R[5] * y + R[8] * z;
      }
      function quatFromYawPitch(yaw, pitch, out) {
        const cy = Math.cos(yaw / 2), sy = Math.sin(yaw / 2), cx = Math.cos(pitch / 2), sx = Math.sin(pitch / 2);
        out[0] = cy * sx; out[1] = sy * cx; out[2] = -sy * sx; out[3] = cy * cx;
        return out;
      }
      function quatFromZTo(dx, dy, dz, out) {
        let r = dz + 1, x, y, z, w;
        if (r < 1e-6) { x = 0; y = -1; z = 0; w = 0; }
        else { x = -dy; y = dx; z = 0; w = r; }
        const len = Math.hypot(x, y, z, w) || 1;
        out[0] = x / len; out[1] = y / len; out[2] = z / len; out[3] = w / len;
        return out;
      }
      function quatSlerp(a, b, t, out) {
        if (t <= 0) { out[0]=a[0]; out[1]=a[1]; out[2]=a[2]; out[3]=a[3]; return out; }
        if (t >= 1) { out[0]=b[0]; out[1]=b[1]; out[2]=b[2]; out[3]=b[3]; return out; }
        const ax=a[0], ay=a[1], az=a[2], aw=a[3];
        let bx=b[0], by=b[1], bz=b[2], bw=b[3];
        let cosHalf = aw*bw + ax*bx + ay*by + az*bz;
        if (cosHalf < 0) { cosHalf = -cosHalf; bx=-bx; by=-by; bz=-bz; bw=-bw; }
        if (cosHalf >= 1) { out[0]=ax; out[1]=ay; out[2]=az; out[3]=aw; return out; }
        const sqrSin = 1 - cosHalf*cosHalf;
        if (sqrSin <= Number.EPSILON) {
          const s = 1 - t;
          out[0]=s*ax+t*bx; out[1]=s*ay+t*by; out[2]=s*az+t*bz; out[3]=s*aw+t*bw;
          const len = Math.hypot(out[0], out[1], out[2], out[3]) || 1;
          out[0]/=len; out[1]/=len; out[2]/=len; out[3]/=len;
          return out;
        }
        const sinHalf = Math.sqrt(sqrSin);
        const half = Math.atan2(sinHalf, cosHalf);
        const ra = Math.sin((1 - t) * half) / sinHalf;
        const rb = Math.sin(t * half) / sinHalf;
        out[0]=ax*ra+bx*rb; out[1]=ay*ra+by*rb; out[2]=az*ra+bz*rb; out[3]=aw*ra+bw*rb;
        return out;
      }
      function compose(out, px, py, pz, q, sx, sy, sz) {
        const x=q[0], y=q[1], z=q[2], w=q[3];
        const x2=x+x, y2=y+y, z2=z+z;
        const xx=x*x2, xy=x*y2, xz=x*z2, yy=y*y2, yz=y*z2, zz=z*z2, wx=w*x2, wy=w*y2, wz=w*z2;
        out[0]=(1-(yy+zz))*sx; out[1]=(xy+wz)*sx; out[2]=(xz-wy)*sx; out[3]=0;
        out[4]=(xy-wz)*sy; out[5]=(1-(xx+zz))*sy; out[6]=(yz+wx)*sy; out[7]=0;
        out[8]=(xz+wy)*sz; out[9]=(yz-wx)*sz; out[10]=(1-(xx+yy))*sz; out[11]=0;
        out[12]=px; out[13]=py; out[14]=pz; out[15]=1;
        return out;
      }
      function quatAxes(q, right, up, normal) {
        const x=q[0], y=q[1], z=q[2], w=q[3];
        const x2=x+x, y2=y+y, z2=z+z;
        const xx=x*x2, xy=x*y2, xz=x*z2, yy=y*y2, yz=y*z2, zz=z*z2, wx=w*x2, wy=w*y2, wz=w*z2;
        right[0]=1-(yy+zz); right[1]=xy+wz; right[2]=xz-wy;
        up[0]=xy-wz; up[1]=1-(xx+zz); up[2]=yz+wx;
        normal[0]=xz+wy; normal[1]=yz-wx; normal[2]=1-(xx+yy);
      }
      function buildSphere(widthSeg, heightSeg) {
        const pos = [], grid = []; let index = 0;
        for (let iy = 0; iy <= heightSeg; iy++) {
          const row = []; const v = iy / heightSeg; const theta = v * Math.PI;
          for (let ix = 0; ix <= widthSeg; ix++) {
            const u = ix / widthSeg; const phi = u * Math.PI * 2;
            pos.push(-Math.cos(phi) * Math.sin(theta), Math.cos(theta), Math.sin(phi) * Math.sin(theta));
            row.push(index++);
          }
          grid.push(row);
        }
        const tris = [];
        for (let iy = 0; iy < heightSeg; iy++) {
          for (let ix = 0; ix < widthSeg; ix++) {
            const a = grid[iy][ix+1], b = grid[iy][ix], c = grid[iy+1][ix], d = grid[iy+1][ix+1];
            if (iy !== 0) tris.push(a, b, d);
            if (iy !== heightSeg - 1) tris.push(b, c, d);
          }
        }
        const edges = [];
        for (let i = 0; i < tris.length; i += 3) {
          const a = tris[i], b = tris[i+1], c = tris[i+2];
          edges.push(a, b, b, c, c, a);
        }
        return { positions: new Float32Array(pos), tris: new Uint16Array(tris), edges: new Uint16Array(edges) };
      }
      function compileShader(gl, type, src) {
        const sh = gl.createShader(type);
        if (!sh) return null;
        gl.shaderSource(sh, src);
        gl.compileShader(sh);
        if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
          console.error('[SphereGallery3D] shader', gl.getShaderInfoLog(sh));
          gl.deleteShader(sh);
          return null;
        }
        return sh;
      }
      function linkProgram(gl, vertSrc, fragSrc) {
        const v = compileShader(gl, gl.VERTEX_SHADER, vertSrc);
        const f = compileShader(gl, gl.FRAGMENT_SHADER, fragSrc);
        if (!v || !f) return null;
        const p = gl.createProgram();
        if (!p) return null;
        gl.attachShader(p, v); gl.attachShader(p, f); gl.linkProgram(p);
        gl.deleteShader(v); gl.deleteShader(f);
        if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
          console.error('[SphereGallery3D] link', gl.getProgramInfoLog(p));
          gl.deleteProgram(p);
          return null;
        }
        return p;
      }

      // ─── CS "cards": drawn on <canvas>, used as GL textures ───
      // No photos on hand yet, so the gallery nodes carry equations /
      // snippets from the actual FUE curriculum instead of images.
      function drawCard(w, h, accent, title, lines, mono) {
        const c = document.createElement('canvas');
        c.width = w; c.height = h;
        const ctx = c.getContext('2d');
        ctx.fillStyle = '#0a0a10';
        ctx.fillRect(0, 0, w, h);
        const grad = ctx.createLinearGradient(0, 0, w, h);
        grad.addColorStop(0, 'rgba(255,255,255,0.05)');
        grad.addColorStop(1, 'rgba(0,0,0,0.15)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);
        ctx.strokeStyle = accent;
        ctx.globalAlpha = 0.55;
        ctx.lineWidth = Math.max(2, w * 0.01);
        ctx.strokeRect(ctx.lineWidth / 2, ctx.lineWidth / 2, w - ctx.lineWidth, h - ctx.lineWidth);
        ctx.globalAlpha = 1;
        // topbar dots + title, like the site's other code windows
        const pad = w * 0.07;
        ctx.fillStyle = '#ff5f57'; ctx.beginPath(); ctx.arc(pad, pad, w * 0.014, 0, 7); ctx.fill();
        ctx.fillStyle = '#febc2e'; ctx.beginPath(); ctx.arc(pad + w * 0.035, pad, w * 0.014, 0, 7); ctx.fill();
        ctx.fillStyle = '#28c840'; ctx.beginPath(); ctx.arc(pad + w * 0.07, pad, w * 0.014, 0, 7); ctx.fill();
        ctx.fillStyle = accent;
        ctx.font = `700 ${Math.round(h * 0.075)}px 'Fira Code', monospace`;
        ctx.textBaseline = 'middle';
        ctx.fillText(title, pad + w * 0.11, pad);
        // body lines
        ctx.font = `${mono ? 500 : 500} ${Math.round(h * 0.095)}px ${mono ? "'Fira Code', monospace" : "'Space Grotesk', sans-serif"}`;
        ctx.fillStyle = '#f3f4f6';
        let y = h * 0.32;
        const lh = h * 0.135;
        lines.forEach((ln) => {
          ctx.fillText(ln, pad, y);
          y += lh;
        });
        return c;
      }
      const CS_CARDS = [
        { badge: 'CALC', accent: '#f43f5e', lines: ['lim(x→0) sinx/x = 1', '∫ x²dx = x³/3 + C'] },
        { badge: 'ODE', accent: '#fb7185', lines: ["y'' + 2y' + 5y = 0", 'y = e⁻ˣ(Acos2x+Bsin2x)'] },
        { badge: 'DISCRETE', accent: '#e11d48', lines: ['A∩B = {3,4}', '|A∪B| = |A|+|B|-|A∩B|'] },
        { badge: 'C / SP', accent: '#61afef', lines: ['int factorial(int n){', ' return n<=1?1:n*f(n-1);}'], mono: true },
        { badge: 'LOGIC', accent: '#e5c07b', lines: ['Sum = A⊕B⊕Cin', 'Cout = AB+Cin(A⊕B)'] },
        { badge: 'STATS', accent: '#98c379', lines: ['μ ± σ, μ ± 2σ, μ ± 3σ', 'z = (x-μ)/σ'] },
        { badge: 'BINARY', accent: '#c678dd', lines: ['1010₂ = 8+0+2+0', '= 10₁₀'] },
        { badge: 'PHYSICS', accent: '#4fff8f', lines: ['v = u + at', 's = ut + ½at²'] }
      ];
      function buildEquationCards() {
        return CS_CARDS.map((d) => {
          const canvas = drawCard(560, 380, d.accent, d.badge, d.lines, d.mono);
          return { source: canvas, aspect: canvas.width / canvas.height };
        });
      }

      // ─── preset (from the Originkit component's own defaults) ─
      const sgProps = {
        branches: 60,
        background: 'transparent',
        scale: 75,
        size: 25,
        scatter: 44,
        speed: 47,
        direction: 'clockwise',
        hover: 108,
        rounded: 44,
        core: { coreSize: 41, coreColor: '#FF4C0059', lineColor: '#1735AE80' }
      };

      const branches = clamp(Math.round(sgProps.branches), 1, MAX_BRANCHES);
      const spinSign = sgProps.direction === 'clockwise' ? -1 : 1;
      const coreColor = sgProps.core.coreColor;
      const lineColor = sgProps.core.lineColor;
      const coreAlpha = parseColor(coreColor, [0.48, 0.72, 1, 1])[3];
      const lineAlpha = parseColor(lineColor, [0.29, 0.42, 0.6, 0.35])[3];

      const live = {
        count: branches,
        radius: RADIUS,
        depthRand: clamp(sgProps.scatter / 100, 0, 1),
        itemSize: RADIUS * clamp(sgProps.size / 100, 0.01, 2),
        coreColor,
        coreSize: RADIUS * clamp((sgProps.core.coreSize || 0) / 100, 0, 1),
        coreGlow: coreAlpha,
        lineColor,
        lineOpacity: lineAlpha,
        rounded: clamp(sgProps.rounded / 100, 0, 1),
        spin: (BASE_SPIN * sgProps.speed * spinSign) / 50,
        force: clamp(sgProps.hover / 100, 0, 3),
        hoverDist: RADIUS * clamp((sgProps.hover / 100) * 0.35, 0, 3),
        scale: clamp(sgProps.scale / 100, 0.2, 4),
        minZoom: MIN_DIST, maxZoom: MAX_DIST, zoomGain: ZOOM_GAIN,
        orbitSpeed: ORBIT_SPEED, orbitDamping: ORBIT_DAMPING, orbitLimit: ORBIT_LIMIT
      };

      // ─── DOM: canvas host, sized to the hero orbit area ───────
      const host = document.createElement('div');
      host.className = 'sg-canvas-host';
      hostEl.appendChild(host);
      const canvas = document.createElement('canvas');
      host.appendChild(canvas);

      // ─── media: equation cards (no network fetch needed) ──────
      const media = buildEquationCards();
      const graveyard = [];
      const linksTable = Array.from({ length: branches }, () => ''); // no click-through targets yet

      // ─── GL setup ───────────────────────────────────────────
      const attrs = { antialias: true, alpha: true, premultipliedAlpha: true, depth: true, powerPreference: 'high-performance' };
      const gl = canvas.getContext('webgl2', attrs) || canvas.getContext('webgl', attrs) || canvas.getContext('experimental-webgl', attrs);
      if (!gl) { console.error('[SphereGallery3D] WebGL unavailable'); return; }
      const isGL2 = typeof WebGL2RenderingContext !== 'undefined' && gl instanceof WebGL2RenderingContext;
      const aniso = gl.getExtension('EXT_texture_filter_anisotropic') || gl.getExtension('WEBKIT_EXT_texture_filter_anisotropic');

      const quadProg = linkProgram(gl, QUAD_VERT, QUAD_FRAG);
      const solidProg = linkProgram(gl, SOLID_VERT, SOLID_FRAG);
      if (!quadProg || !solidProg) return;

      const qLoc = {
        aCorner: gl.getAttribLocation(quadProg, 'aCorner'), uMVP: gl.getUniformLocation(quadProg, 'uMVP'),
        uMap: gl.getUniformLocation(quadProg, 'uMap'), uHasTex: gl.getUniformLocation(quadProg, 'uHasTex'),
        uHalf: gl.getUniformLocation(quadProg, 'uHalf'), uRadius: gl.getUniformLocation(quadProg, 'uRadius'),
        uAA: gl.getUniformLocation(quadProg, 'uAA'), uOpacity: gl.getUniformLocation(quadProg, 'uOpacity'),
        uDim: gl.getUniformLocation(quadProg, 'uDim'), uPlaceholder: gl.getUniformLocation(quadProg, 'uPlaceholder')
      };
      const sLoc = {
        aPos: gl.getAttribLocation(solidProg, 'aPos'), uMVP: gl.getUniformLocation(solidProg, 'uMVP'),
        uScale: gl.getUniformLocation(solidProg, 'uScale'), uColor: gl.getUniformLocation(solidProg, 'uColor')
      };

      const quadBuf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, quadBuf);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-0.5,-0.5, 0.5,-0.5, 0.5,0.5, -0.5,-0.5, 0.5,0.5, -0.5,0.5]), gl.STATIC_DRAW);

      const ball = buildSphere(SPHERE_W, SPHERE_H);
      const ballBuf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, ballBuf);
      gl.bufferData(gl.ARRAY_BUFFER, ball.positions, gl.STATIC_DRAW);
      const ballTri = gl.createBuffer();
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ballTri);
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, ball.tris, gl.STATIC_DRAW);
      const ballEdge = gl.createBuffer();
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ballEdge);
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, ball.edges, gl.STATIC_DRAW);

      const lineBuf = gl.createBuffer();
      let lineData = new Float32Array(0);
      function ensureLines(n) {
        if (lineData.length === n * 6) return;
        lineData = new Float32Array(n * 6);
        gl.bindBuffer(gl.ARRAY_BUFFER, lineBuf);
        gl.bufferData(gl.ARRAY_BUFFER, lineData, gl.DYNAMIC_DRAW);
      }

      const white = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, white);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([255,255,255,255]));
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

      const isPOT = (v) => (v & (v - 1)) === 0 && v > 0;
      function upload(source, w, h) {
        const tex = gl.createTexture();
        if (!tex) return null;
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
        gl.texImage2D(gl.TEXTURE_2D, 0, isGL2 ? gl.SRGB8_ALPHA8 : gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        const mip = isGL2 || (isPOT(w) && isPOT(h));
        if (mip) {
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
          gl.generateMipmap(gl.TEXTURE_2D);
          if (aniso) {
            const max = gl.getParameter(aniso.MAX_TEXTURE_MAX_ANISOTROPY_EXT);
            gl.texParameterf(gl.TEXTURE_2D, aniso.TEXTURE_MAX_ANISOTROPY_EXT, Math.min(8, max || 1));
          }
        } else {
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        }
        return tex;
      }

      let vw = 1, vh = 1;
      function resize() {
        const w = Math.max(1, hostEl.clientWidth);
        const h = Math.max(1, hostEl.clientHeight);
        const dpr = Math.min(2, window.devicePixelRatio || 1);
        vw = Math.max(1, Math.round(w * dpr));
        vh = Math.max(1, Math.round(h * dpr));
        if (canvas.width !== vw) canvas.width = vw;
        if (canvas.height !== vh) canvas.height = vh;
      }
      resize();
      const ro = new ResizeObserver(resize);
      ro.observe(hostEl);

      // ─── input ──────────────────────────────────────────────
      const pointer = { nx: 0, ny: 0, inside: false, dragging: false, lastX: 0, lastY: 0, downX: 0, downY: 0, downAt: 0 };
      const orbit = {
        yaw: 0, pitch: 0, yawVel: 0, pitchVel: 0, spin: 0,
        zoom: clamp(live.radius * REST_DIST_MUL, live.minZoom, live.maxZoom), zoomTarget: 0
      };
      orbit.zoomTarget = orbit.zoom;
      let camDist = orbit.zoom / live.scale;

      const nodes = [];
      function makeNode() { return { ox:0, oy:0, oz:0, vx:0, vy:0, vz:0, px:0, py:0, pz:0, q:[0,0,0,1], hx:0, hy:0, hovered:false }; }

      function setNdc(e) {
        const r = hostEl.getBoundingClientRect();
        pointer.nx = ((e.clientX - r.left) / Math.max(1, r.width)) * 2 - 1;
        pointer.ny = -((e.clientY - r.top) / Math.max(1, r.height)) * 2 + 1;
      }

      const rayO = [0,0,0], rayD = [0,0,-1], rayOL = [0,0,0], rayDL = [0,0,-1];
      const tmpA = [0,0,0], axR = [0,0,0], axU = [0,0,0], axN = [0,0,0];

      function buildRay(camZ, fovRad, aspect) {
        const th = Math.tan(fovRad / 2);
        const dx = pointer.nx * th * aspect, dy = pointer.ny * th, dz = -1;
        const len = Math.hypot(dx, dy, dz) || 1;
        rayO[0] = 0; rayO[1] = 0; rayO[2] = camZ;
        rayD[0] = dx / len; rayD[1] = dy / len; rayD[2] = dz / len;
      }

      function hitTest(R) {
        applyBasisT(R, rayO[0], rayO[1], rayO[2], rayOL);
        applyBasisT(R, rayD[0], rayD[1], rayD[2], rayDL);
        let best = -1, bestT = Infinity;
        for (let i = 0; i < nodes.length; i++) {
          const nd = nodes[i];
          quatAxes(nd.q, axR, axU, axN);
          const denom = rayDL[0]*axN[0] + rayDL[1]*axN[1] + rayDL[2]*axN[2];
          if (Math.abs(denom) < 1e-8) continue;
          const ox = nd.px - rayOL[0], oy = nd.py - rayOL[1], oz = nd.pz - rayOL[2];
          const t = (ox*axN[0] + oy*axN[1] + oz*axN[2]) / denom;
          if (t <= 0 || t >= bestT) continue;
          const hx = rayOL[0] + rayDL[0]*t - nd.px, hy = rayOL[1] + rayDL[1]*t - nd.py, hz = rayOL[2] + rayDL[2]*t - nd.pz;
          const u = hx*axR[0] + hy*axR[1] + hz*axR[2], v = hx*axU[0] + hy*axU[1] + hz*axU[2];
          if (Math.abs(u) > nd.hx || Math.abs(v) > nd.hy) continue;
          bestT = t; best = i;
        }
        return best;
      }

      let frameBasis = rigBasis(0, 0);

      function onPointerDown(e) {
        setNdc(e);
        pointer.inside = true; pointer.dragging = true;
        pointer.lastX = e.clientX; pointer.lastY = e.clientY;
        pointer.downX = e.clientX; pointer.downY = e.clientY; pointer.downAt = performance.now();
        orbit.yawVel = 0; orbit.pitchVel = 0;
        canvas.style.cursor = 'grabbing';
      }
      function onPointerMove(e) {
        const r = hostEl.getBoundingClientRect();
        const inBox = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
        pointer.inside = inBox || pointer.dragging;
        if (pointer.inside) setNdc(e);
        if (!pointer.dragging) {
          if (inBox) {
            buildRay(camDist, (FOV * Math.PI) / 180, vw / vh);
            const idx = hitTest(frameBasis);
            canvas.style.cursor = idx >= 0 && linksTable[idx] ? 'pointer' : 'grab';
          }
          return;
        }
        const dx = e.clientX - pointer.lastX, dy = e.clientY - pointer.lastY;
        pointer.lastX = e.clientX; pointer.lastY = e.clientY;
        orbit.yaw += (dx * live.orbitSpeed * Math.PI) / 180;
        orbit.pitch += (dy * live.orbitSpeed * Math.PI) / 180;
        const lim = (live.orbitLimit * Math.PI) / 180;
        orbit.pitch = clamp(orbit.pitch, -lim, lim);
        orbit.yawVel = dx * live.orbitSpeed * 60;
        orbit.pitchVel = dy * live.orbitSpeed * 60;
      }
      function release(e) {
        if (!pointer.dragging) return;
        pointer.dragging = false;
        canvas.style.cursor = 'grab';
        const dt = performance.now() - pointer.downAt;
        const dist = Math.abs(e.clientX - pointer.downX) + Math.abs(e.clientY - pointer.downY);
        if (dist <= CLICK_SLOP_PX && dt <= CLICK_MS) {
          orbit.yawVel = 0; orbit.pitchVel = 0;
          setNdc(e);
          buildRay(camDist, (FOV * Math.PI) / 180, vw / vh);
          const idx = hitTest(frameBasis);
          const url = idx >= 0 ? linksTable[idx] : '';
          if (url) window.open(url, '_blank', 'noopener,noreferrer');
        }
      }
      function onLeave() { if (!pointer.dragging) pointer.inside = false; }
      function onWheel(e) {
        e.preventDefault();
        orbit.zoomTarget = clamp(orbit.zoomTarget + e.deltaY * 0.02 * live.zoomGain, live.minZoom, live.maxZoom);
      }

      canvas.style.cursor = 'grab';
      canvas.style.touchAction = 'none';
      canvas.addEventListener('pointerdown', onPointerDown);
      canvas.addEventListener('pointerleave', onLeave);
      canvas.addEventListener('wheel', onWheel, { passive: false });
      window.addEventListener('pointermove', onPointerMove);
      window.addEventListener('pointerup', release);
      window.addEventListener('pointercancel', release);

      // ─── loop state ─────────────────────────────────────────
      const proj = mat4(), view = mat4(), viewProj = mat4(), model = mat4(), mvp = mat4();
      const qRig = [0,0,0,1], qCamLocal = [0,0,0,1], qRadial = [0,0,0,1];
      const forwardLocal = [0,0,-1];
      const placeholderRGB = parseColor(PLACEHOLDER, [0,0,0,1]);
      const order = [];

      gl.clearColor(0, 0, 0, 0);
      gl.enable(gl.DEPTH_TEST);

      let raf = 0, prev = performance.now();

      function mediaFor(i) { return media.length ? media[i % media.length] : undefined; }

      function frame() {
        raf = requestAnimationFrame(frame);
        const now = performance.now();
        const dt = Math.min(0.05, (now - prev) / 1000);
        prev = now;

        const L = live;
        const n = Math.max(0, L.count | 0);

        while (graveyard.length) gl.deleteTexture(graveyard.pop());

        while (nodes.length < n) nodes.push(makeNode());
        if (nodes.length > n) nodes.length = n;
        ensureLines(n);

        gl.viewport(0, 0, vw, vh);
        gl.depthMask(true);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        const lo = Math.min(L.minZoom, L.maxZoom), hi = Math.max(L.minZoom, L.maxZoom);
        orbit.zoomTarget = clamp(orbit.zoomTarget, lo, hi);
        orbit.zoom += (orbit.zoomTarget - orbit.zoom) * (1 - Math.exp(-ZOOM_RATE * dt));
        camDist = orbit.zoom / Math.max(0.001, L.scale);

        const fovRad = (FOV * Math.PI) / 180;
        const aspect = vw / vh;
        perspectiveMat(proj, fovRad, aspect);

        if (!pointer.dragging) {
          const keep = L.orbitDamping <= 0 ? 0 : Math.exp((-6 / Math.max(0.001, L.orbitDamping)) * dt);
          orbit.yaw += ((orbit.yawVel * dt * Math.PI) / 180) * keep;
          orbit.pitch += ((orbit.pitchVel * dt * Math.PI) / 180) * keep;
          orbit.yawVel *= keep; orbit.pitchVel *= keep;
          const lim = (L.orbitLimit * Math.PI) / 180;
          orbit.pitch = clamp(orbit.pitch, -lim, lim);
        }
        orbit.spin += L.spin * dt;
        if (orbit.spin > Math.PI * 2) orbit.spin -= Math.PI * 2;

        const yaw = orbit.spin + orbit.yaw, pitch = orbit.pitch;
        rigView(view, yaw, pitch, camDist);
        mul(viewProj, proj, view);

        const R = rigBasis(yaw, pitch);
        frameBasis = R;
        quatFromYawPitch(yaw, pitch, qRig);
        qCamLocal[0] = -qRig[0]; qCamLocal[1] = -qRig[1]; qCamLocal[2] = -qRig[2]; qCamLocal[3] = qRig[3];
        applyBasisT(R, 0, 0, -1, forwardLocal);

        const coreR = Math.max(0.001, L.coreSize);

        gl.useProgram(solidProg);
        gl.uniformMatrix4fv(sLoc.uMVP, false, viewProj);
        gl.bindBuffer(gl.ARRAY_BUFFER, ballBuf);
        gl.enableVertexAttribArray(sLoc.aPos);
        gl.vertexAttribPointer(sLoc.aPos, 3, gl.FLOAT, false, 0, 0);

        if (L.coreSize > 0.001) {
          const c = parseColor(L.coreColor, [0.48, 0.72, 1, 1]);
          gl.disable(gl.BLEND);
          gl.enable(gl.CULL_FACE); gl.cullFace(gl.BACK);
          gl.depthMask(true);
          gl.uniform1f(sLoc.uScale, coreR);
          gl.uniform4f(sLoc.uColor, c[0], c[1], c[2], 1);
          gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ballTri);
          gl.drawElements(gl.TRIANGLES, ball.tris.length, gl.UNSIGNED_SHORT, 0);
          gl.disable(gl.CULL_FACE);
        }
        gl.disableVertexAttribArray(sLoc.aPos);

        gl.enable(gl.BLEND);
        gl.depthMask(false);
        gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

        function drawHalo() {
          if (L.coreGlow <= 0.002) return;
          const c = parseColor(L.coreColor, [0.48, 0.72, 1, 1]);
          gl.useProgram(solidProg);
          gl.uniformMatrix4fv(sLoc.uMVP, false, viewProj);
          gl.bindBuffer(gl.ARRAY_BUFFER, ballBuf);
          gl.enableVertexAttribArray(sLoc.aPos);
          gl.vertexAttribPointer(sLoc.aPos, 3, gl.FLOAT, false, 0, 0);
          gl.blendFunc(gl.ONE, gl.ONE);
          gl.uniform1f(sLoc.uScale, coreR * 1.45);
          gl.uniform4f(sLoc.uColor, c[0], c[1], c[2], L.coreGlow);
          gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ballEdge);
          gl.drawElements(gl.LINES, ball.edges.length, gl.UNSIGNED_SHORT, 0);
          gl.disableVertexAttribArray(sLoc.aPos);
          gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
        }

        if (!n) { gl.disableVertexAttribArray(sLoc.aPos); drawHalo(); return; }

        const hovering = pointer.inside && L.force > 0 && L.hoverDist > 0;
        if (hovering) buildRay(camDist, fovRad, aspect);

        const worldPerPixel = (2 * Math.tan(fovRad / 2)) / vh;

        for (let i = 0; i < n; i++) {
          const nd = nodes[i];
          const y = 1 - (2 * (i + 0.5)) / n;
          const rr = Math.sqrt(Math.max(0, 1 - y * y));
          const th = GOLDEN_ANGLE * i;
          const jitter = 1 + (hash01(i) - 0.5) * L.depthRand;
          const Rr = L.radius * jitter;
          const bx = Math.cos(th) * rr * Rr, by = y * Rr, bz = Math.sin(th) * rr * Rr;

          let capture = 0, tx = 0, ty = 0, tz = 0;
          if (hovering) {
            applyBasis(R, bx, by, bz, tmpA);
            const wx = tmpA[0], wy = tmpA[1], wz = tmpA[2];
            const t = Math.max(0, (wx-rayO[0])*rayD[0] + (wy-rayO[1])*rayD[1] + (wz-rayO[2])*rayD[2]);
            const cx = rayO[0]+rayD[0]*t, cy = rayO[1]+rayD[1]*t, cz = rayO[2]+rayD[2]*t;
            const d = Math.hypot(cx-wx, cy-wy, cz-wz);
            if (d < L.hoverDist) {
              const u = 1 - d / L.hoverDist;
              capture = u * u * (3 - 2 * u);
              applyBasisT(R, cx-wx, cy-wy, cz-wz, tmpA);
              const k = capture * L.force;
              tx = tmpA[0]*k; ty = tmpA[1]*k; tz = tmpA[2]*k;
              const pop = -k * L.radius * 0.12;
              tx += forwardLocal[0]*pop; ty += forwardLocal[1]*pop; tz += forwardLocal[2]*pop;
            }
          }
          nd.hovered = capture > 0.2;

          const damp = 2 + DAMPING * 16;
          nd.vx += (tx - nd.ox) * SPRING_STIFFNESS * dt;
          nd.vy += (ty - nd.oy) * SPRING_STIFFNESS * dt;
          nd.vz += (tz - nd.oz) * SPRING_STIFFNESS * dt;
          const decay = Math.exp(-damp * dt);
          nd.vx *= decay; nd.vy *= decay; nd.vz *= decay;
          nd.ox += nd.vx * dt; nd.oy += nd.vy * dt; nd.oz += nd.vz * dt;

          const px = bx + nd.ox, py = by + nd.oy, pz = bz + nd.oz;
          nd.px = px; nd.py = py; nd.pz = pz;

          const radLen = Math.hypot(px, py, pz) || 1;
          quatFromZTo(px/radLen, py/radLen, pz/radLen, qRadial);
          quatSlerp(qRadial, qCamLocal, BILLBOARD_BLEND, nd.q);

          const m = mediaFor(i);
          const aspectI = m ? m.aspect : 1;
          const s = L.itemSize * (1 + HOVER_POP * capture);
          nd.hx = (s * aspectI) / 2;
          nd.hy = s / 2;

          order[i] = i;
        }
        order.length = n;

        const depthOf = (nd) => R[6]*nd.px + R[7]*nd.py + R[8]*nd.pz;
        order.sort((a, b) => depthOf(nodes[a]) - depthOf(nodes[b]));

        let split = 0;
        while (split < n && depthOf(nodes[order[split]]) < 0) split++;

        for (let o = 0; o < n; o++) {
          const nd = nodes[order[o]];
          const len = Math.hypot(nd.px, nd.py, nd.pz) || 1;
          const k = coreR / len;
          lineData[o*6+0] = nd.px*k; lineData[o*6+1] = nd.py*k; lineData[o*6+2] = nd.pz*k;
          lineData[o*6+3] = nd.px; lineData[o*6+4] = nd.py; lineData[o*6+5] = nd.pz;
        }
        if (L.lineOpacity > 0.002) {
          gl.bindBuffer(gl.ARRAY_BUFFER, lineBuf);
          gl.bufferSubData(gl.ARRAY_BUFFER, 0, lineData);
        }

        function drawStrings(from, count) {
          if (count <= 0 || L.lineOpacity <= 0.002) return;
          const c = parseColor(L.lineColor, [0.29, 0.42, 0.6, 1]);
          gl.useProgram(solidProg);
          gl.uniformMatrix4fv(sLoc.uMVP, false, viewProj);
          gl.bindBuffer(gl.ARRAY_BUFFER, lineBuf);
          gl.enableVertexAttribArray(sLoc.aPos);
          gl.vertexAttribPointer(sLoc.aPos, 3, gl.FLOAT, false, 0, 0);
          gl.uniform1f(sLoc.uScale, 1);
          gl.uniform4f(sLoc.uColor, c[0], c[1], c[2], L.lineOpacity);
          gl.drawArrays(gl.LINES, from * 2, count * 2);
          gl.disableVertexAttribArray(sLoc.aPos);
        }
        function beginQuads() {
          gl.useProgram(quadProg);
          gl.bindBuffer(gl.ARRAY_BUFFER, quadBuf);
          gl.enableVertexAttribArray(qLoc.aCorner);
          gl.vertexAttribPointer(qLoc.aCorner, 2, gl.FLOAT, false, 0, 0);
          gl.uniform1i(qLoc.uMap, 0);
          gl.uniform3f(qLoc.uPlaceholder, placeholderRGB[0], placeholderRGB[1], placeholderRGB[2]);
          gl.uniform1f(qLoc.uOpacity, 1);
          gl.activeTexture(gl.TEXTURE0);
        }
        function drawQuads(from, to) {
          for (let o = from; o < to; o++) {
            const i = order[o];
            const nd = nodes[i];
            const m = mediaFor(i);

            if (m && m.source && !m.texture) {
              m.texture = upload(m.source, m.source.width, m.source.height);
              m.applied = true;
            }

            const aspectI = m ? m.aspect : 1;
            const hasTex = m && m.texture ? 1 : 0;
            gl.bindTexture(gl.TEXTURE_2D, hasTex ? m.texture : white);
            gl.uniform1f(qLoc.uHasTex, hasTex);
            if (hasTex) {
              gl.uniform2f(qLoc.uHalf, aspectI / 2, 0.5);
              gl.uniform1f(qLoc.uRadius, L.rounded * Math.min(aspectI / 2, 0.5));
            } else {
              gl.uniform2f(qLoc.uHalf, 0.5, 0.5);
              gl.uniform1f(qLoc.uRadius, L.rounded * 0.5);
            }

            const sy = nd.hy * 2, sx = nd.hx * 2;
            compose(model, nd.px, nd.py, nd.pz, nd.q, sx, sy, 1);
            mul(mvp, viewProj, model);
            gl.uniformMatrix4fv(qLoc.uMVP, false, mvp);

            const depth = R[6]*nd.px + R[7]*nd.py + R[8]*nd.pz;
            const tt = clamp((depth + L.radius) / (2 * L.radius), 0, 1);
            gl.uniform1f(qLoc.uDim, DEPTH_FLOOR + (1 - DEPTH_FLOOR) * tt);

            const dist = Math.max(0.001, camDist - depth);
            gl.uniform1f(qLoc.uAA, (worldPerPixel * dist) / Math.max(1e-4, sy));

            gl.drawArrays(gl.TRIANGLES, 0, 6);
          }
        }

        drawStrings(0, split);
        beginQuads(); drawQuads(0, split);
        gl.disableVertexAttribArray(qLoc.aCorner);

        drawHalo();

        drawStrings(split, n - split);
        beginQuads(); drawQuads(split, n);
        gl.disableVertexAttribArray(qLoc.aCorner);
      }
      raf = requestAnimationFrame(frame);
    }

    // ============================================================
    //  STATS COUNTER
    // ============================================================
    function animateStats() {
      const el = document.getElementById('stat-students');
      if (!el) return;
      let count = 0;
      const target = 230;
      const interval = setInterval(() => {
        count += Math.ceil(target / 45);
        if (count >= target) {
          el.textContent = target + '+';
          clearInterval(interval);
        } else {
          el.textContent = count;
        }
      }, 25);
    }

    // ============================================================
    //  MODAL SYSTEM
    // ============================================================
    let lastFocused = null;

    function openModal(id) {
      const modal = document.getElementById(id);
      if (!modal) return;
      lastFocused = document.activeElement;
      document.querySelectorAll('.modal-overlay.open').forEach(m => m.classList.remove('open'));
      modal.classList.add('open');
      document.body.style.overflow = 'hidden';
      const focusTarget = modal.querySelector('input, button');
      if (focusTarget) setTimeout(() => focusTarget.focus(), 60);
    }

    function closeModal(id) {
      const modal = document.getElementById(id);
      if (!modal) return;
      modal.classList.remove('open');
      document.body.style.overflow = '';
      if (lastFocused) { lastFocused.focus();
        lastFocused = null; }
    }

    function switchModal(fromId, toId) {
      const from = document.getElementById(fromId);
      if (from) from.classList.remove('open');
      openModal(toId);
    }

    function togglePass(inputId, btn) {
      const input = document.getElementById(inputId);
      if (!input) return;
      const show = input.type === 'password';
      input.type = show ? 'text' : 'password';
      btn.innerHTML = show ? '<i class="ic" data-ic="eye-slash"></i>' : '<i class="ic" data-ic="eye"></i>';
      btn.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
    }

    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('modal-overlay')) {
        closeModal(e.target.id);
      }
    });

    document.addEventListener('keydown', (e) => {
      const open = document.querySelector('.modal-overlay.open');
      if (!open) return;
      if (e.key === 'Escape') { closeModal(open.id); return; }
      if (e.key === 'Tab') {
        const f = open.querySelectorAll('input, button, a[href]');
        if (!f.length) return;
        const first = f[0],
          last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault();
          last.focus(); } else if (!e.shiftKey && document.activeElement === last) { e.preventDefault();
          first.focus(); }
      }
    });

    // ============================================================
    //  MOBILE TAB BAR
    // ============================================================
    document.querySelectorAll('.tab-item').forEach(tab => {
      tab.addEventListener('click', function(e) {
        e.preventDefault();
        document.querySelectorAll('.tab-item').forEach(t => t.classList.remove('active'));
        this.classList.add('active');
      });
    });

    // ============================================================
    //  FOOTER YEAR
    // ============================================================
    document.getElementById('yr').textContent = new Date().getFullYear();

    // ============================================================
    //  LOADER & INIT
    // ============================================================
    window.addEventListener('load', () => {
      setTimeout(() => {
        const loader = document.getElementById('loader');
        if (loader) {
          loader.classList.add('out');
          setTimeout(() => loader.style.display = 'none', 500);
        }
        animateStats();
        initOrbits();
        initScrollEffects();
        document.querySelectorAll('.tab-item').forEach(t => t.classList.remove('active'));
        document.querySelector('.tab-item:first-child')?.classList.add('active');
      }, 800);
    });

    console.log('🚀 EDUMOE V3 Ultimate Homepage loaded.');
