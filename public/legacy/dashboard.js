// ============================================================
    // ICONS
    // ============================================================
    const ICONS = {
      'graduation-cap': '<path d="M22 10L12 5 2 10l10 5 10-5z"/><path d="M6 12v5c0 1 2.7 2.5 6 2.5s6-1.5 6-2.5v-5"/><line x1="22" y1="10" x2="22" y2="15"/>',
      'arrow-left': '<line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>',
      'tv': '<rect x="2" y="5" width="20" height="13" rx="2"/><polyline points="8 21 12 18 16 21"/>',
      'calendar': '<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>',
      'play': '<polygon points="6 4 20 12 6 20 6 4" fill="currentColor" stroke="none"/>',
      'check': '<polyline points="20 6 9 17 4 12"/>',
      'chart-line': '<polyline points="3 3 3 21 21 21"/><polyline points="7 15 11 10 14 13 20 6"/>',
      'terminal': '<polyline points="5 8 9 12 5 16"/><line x1="12" y1="16" x2="18" y2="16"/><rect x="2" y="4" width="20" height="16" rx="2"/>',
      'microchip': '<rect x="6" y="6" width="12" height="12" rx="1"/><path d="M9 2v4M15 2v4M9 18v4M15 18v4M2 9h4M2 15h4M18 9h4M18 15h4"/>',
      'infinity': '<path d="M6 8a4 4 0 1 0 0 8c3 0 4-4 6-4s3 4 6 4a4 4 0 1 0 0-8c-3 0-4 4-6 4S9 8 6 8z"/>',
      'dice': '<rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8.5" cy="8.5" r="1" fill="currentColor" stroke="none"/><circle cx="15.5" cy="15.5" r="1" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1" fill="currentColor" stroke="none"/>',
      'square-root-alt': '<path d="M3 12h2l2 7 4-16h10"/>',
      'bolt': '<polygon points="13 2 4 14 11 14 10 22 20 9 13 9 13 2" fill="currentColor" stroke="none"/>',
      'project-diagram': '<rect x="2" y="4" width="6" height="5" rx="1"/><rect x="16" y="4" width="6" height="5" rx="1"/><rect x="9" y="15" width="6" height="5" rx="1"/><path d="M5 9v2a2 2 0 0 0 2 2h3M19 9v2a2 2 0 0 1-2 2h-3"/>',
      'binary': '<rect x="4" y="3" width="7" height="8" rx="1"/><rect x="13" y="13" width="7" height="8" rx="1"/><path d="M6 21h4M8 21v-6M18 3l-2 1"/>',
      'clock': '<circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 16 14"/>',
      'trophy': '<path d="M6 4h12v4a6 6 0 0 1-12 0V4z"/><path d="M6 6H3v2a3 3 0 0 0 3 3M18 6h3v2a3 3 0 0 1-3 3"/><line x1="12" y1="14" x2="12" y2="18"/><path d="M8 21h8M9 18h6v3H9z"/>',
      'fire': '<path d="M12 2C10 6 6 8 8 12c2 4 0 8 4 10 4-2 2-6 4-10 2-4-2-6-4-10z" fill="currentColor" stroke="none"/>',
      'zap': '<polygon points="13 2 4 14 11 14 10 22 20 9 13 9 13 2" fill="currentColor" stroke="none"/>',
      'book': '<path d="M4 4a2 2 0 0 1 2-2h13v18H6a2 2 0 0 0-2 2V4z"/><line x1="8" y1="7" x2="15" y2="7"/>',
      'brain': '<path d="M9 4a3 3 0 0 0-3 3 3 3 0 0 0-1 5.8V15a3 3 0 0 0 4 2.8A2.5 2.5 0 0 0 12 20V5a2.5 2.5 0 0 0-3-1z"/><path d="M15 4a3 3 0 0 1 3 3 3 3 0 0 1 1 5.8V15a3 3 0 0 1-4 2.8A2.5 2.5 0 0 1 12 20"/>',
      'telegram': '<path d="M22 3L2 11l6 2 2 6 3-4 5 4 4-16z" fill="currentColor" stroke="none"/><path d="M8 13l9-6-6 7" fill="none" stroke="var(--bg1,#0a0a0f)" stroke-width="1"/>',
    };

    function injectIcons(root) {
      (root || document).querySelectorAll('i.ic[data-ic]').forEach(el => {
        if (el.dataset.done) return;
        const p = ICONS[el.dataset.ic];
        if (p) { el.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true">' + p + '</svg>'; el.dataset.done = '1'; }
      });
    }

    // ============================================================
    // THEME SYSTEM
    // ============================================================
    function clearCustomInlineStyles() {
      const root = document.documentElement;
      ['--custom-accent','--custom-accent2','--custom-accent3','--custom-glow','--custom-glow2','--custom-border','--custom-border2','--custom-tint','--custom-tint2','--custom-tint3'].forEach(v => root.style.removeProperty(v));
      document.querySelectorAll('.theme-dot').forEach(el => { el.style.removeProperty('background'); el.style.removeProperty('box-shadow'); });
      document.getElementById('customColorWrap')?.style.removeProperty('box-shadow');
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
        const cm = { lava: '#ff5a1f', space: '#7c3aed', oxford: '#00d4ff', gray: '#6b7280', light: '#111111' };
        if (cm[theme]) { document.getElementById('customColorPicker').value = cm[theme]; document.getElementById('customColorWrap').style.background = cm[theme]; }
        showToast('Theme: ' + theme.charAt(0).toUpperCase() + theme.slice(1));
      }
      document.querySelectorAll('.theme-dot').forEach(d => d.classList.remove('active'));
      if (el) el.classList.add('active');
      updateCRTButton();
    }

    function setCustomTheme(color) {
      clearCustomInlineStyles();
      const r = parseInt(color.slice(1,3),16), g = parseInt(color.slice(3,5),16), b = parseInt(color.slice(5,7),16);
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
      const html = document.documentElement, btn = document.getElementById('crtToggle');
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

    const savedTheme = localStorage.getItem('edumoe-theme') || 'ruby';
    const savedColor = localStorage.getItem('edumoe-custom-color');
    if (savedTheme === 'custom' && savedColor) { setCustomTheme(savedColor); document.getElementById('customColorPicker').value = savedColor; }
    else if (savedTheme !== 'ruby' && savedTheme !== 'custom') { document.documentElement.setAttribute('data-theme', savedTheme); }
    const crtPref = localStorage.getItem('edumoe-crt');
    if (crtPref === 'off' || (crtPref === null && window.matchMedia('(prefers-reduced-motion: reduce)').matches)) { document.documentElement.classList.add('no-crt'); }
    document.getElementById('customColorPicker').addEventListener('input', function(e) { setCustomTheme(e.target.value); });
    document.addEventListener('DOMContentLoaded', () => {
      const dot = document.getElementById('td-' + savedTheme);
      if (dot && savedTheme !== 'custom' && savedTheme !== 'ruby') dot.classList.add('active');
      else if (savedTheme === 'ruby') document.getElementById('td-ruby')?.classList.add('active');
      updateCRTButton();
      const crtBtn = document.getElementById('crtToggle');
      if (crtBtn && document.documentElement.classList.contains('no-crt')) crtBtn.classList.add('off');
    });

    // ============================================================
    // TOAST
    // ============================================================
    let toastTimer;

    function showToast(msg) {
      const t = document.getElementById('toast'), m = document.getElementById('toastMsg');
      if (!t || !m) return;
      m.textContent = msg;
      t.classList.add('show');
      clearTimeout(toastTimer);
      toastTimer = setTimeout(() => t.classList.remove('show'), 2800);
    }

    // ============================================================
    // MOEAI
    // ============================================================
    function toggleMoeAI() {
      const panel = document.getElementById('moeaiPanel');
      panel.classList.toggle('open');
      if (panel.classList.contains('open')) {
        document.getElementById('moeaiInput').focus();
      }
    }

    function askMoeAI() {
      // ── PORT PATCH (scripts/port-legacy.py) ────────────────────────────
      // This picked a random line out of a canned list. It now streams from
      // /api/moeai, the same endpoint the full tutor uses, so the answer is
      // grounded in the student's own curriculum and library.
      //
      // Message text is set with textContent rather than interpolated into
      // innerHTML: the original built HTML out of whatever was typed.
      const input = document.getElementById('moeaiInput');
      const msg = input.value.trim();
      if (!msg) return;
      const container = document.getElementById('moeaiMessages');

      const mine = document.createElement('div');
      mine.className = 'msg user';
      mine.textContent = msg;
      container.appendChild(mine);
      input.value = '';

      const reply = document.createElement('div');
      reply.className = 'msg ai';
      reply.textContent = '…';
      container.appendChild(reply);
      container.scrollTop = container.scrollHeight;

      (async () => {
        try {
          const res = await fetch('/api/moeai', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: msg, conversationId: EDUMOE_DASH_CHAT })
          });

          if (!res.ok || !res.body) {
            let text = 'MoeAI is unavailable right now.';
            try { const j = await res.json(); if (j && j.error) text = j.error; } catch (e) {}
            reply.textContent = text;
            return;
          }

          EDUMOE_DASH_CHAT = res.headers.get('x-conversation-id') || EDUMOE_DASH_CHAT;

          const reader = res.body.getReader();
          const dec = new TextDecoder();
          let answer = '';
          reply.textContent = '';
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            answer += dec.decode(value, { stream: true });
            reply.textContent = answer;
            container.scrollTop = container.scrollHeight;
          }
          if (!answer) reply.textContent = 'No answer came back. Try again.';
        } catch (e) {
          reply.textContent = 'Could not reach MoeAI.';
        }
      })();
    }

    let EDUMOE_DASH_CHAT = null;

    // ── PORT PATCH ────────────────────────────────────────────────────────
    // The stat pills, course bars and activity feed shipped with placeholder
    // numbers. Fill them from /api/dashboard, which counts what the student
    // actually did. Signed-out visitors keep the placeholders rather than
    // being shown a wall of zeroes.
    async function EDUMOE_DASH_HYDRATE() {
      let d;
      try {
        const res = await fetch('/api/dashboard', { cache: 'no-store' });
        if (!res.ok) return;
        d = await res.json();
      } catch (e) { return; }
      if (!d || !d.signedIn) return;

      const nums = document.querySelectorAll('.stats-row .stat-pill .num');
      const values = [d.stats.courses, d.stats.lecturesDone, d.stats.xp, d.stats.achievements];
      nums.forEach((el, i) => {
        if (values[i] === undefined || values[i] === null) return;
        el.textContent = Number(values[i]).toLocaleString();
      });

      const items = document.querySelectorAll('.course-progress-item');
      items.forEach((row, i) => {
        const c = d.courseProgress[i];
        if (!c) { row.style.display = 'none'; return; }
        const name = row.querySelector('.cp-name');
        const pct = row.querySelector('.cp-pct');
        const fill = row.querySelector('.cp-bar .fill');
        if (name) name.textContent = c.title;
        if (pct) pct.textContent = c.percent + '%';
        if (fill) fill.style.width = c.percent + '%';
      });

      const acts = document.querySelectorAll('.activity-item');
      acts.forEach((row, i) => {
        const a = d.activity[i];
        if (!a) { row.style.display = 'none'; return; }
        const text = row.querySelector('.act-text');
        const time = row.querySelector('.act-time');
        if (text) text.textContent = a.text;
        if (time) time.textContent = EDUMOE_AGO(a.at);
      });
    }

    function EDUMOE_AGO(iso) {
      const secs = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
      if (secs < 90) return 'just now';
      if (secs < 3600) return Math.round(secs / 60) + 'm ago';
      if (secs < 86400) return Math.round(secs / 3600) + 'h ago';
      return Math.round(secs / 86400) + 'd ago';
    }

    setTimeout(EDUMOE_DASH_HYDRATE, 0);

    function suggest(text) {
      document.getElementById('moeaiInput').value = text;
      askMoeAI();
    }

    // ============================================================
    // INIT
    // ============================================================
    document.addEventListener('DOMContentLoaded', () => {
      injectIcons();
      console.log('📊 EDUMOE Dashboard loaded.');
    });

    window.setTheme = setTheme;
    window.setCustomTheme = setCustomTheme;
    window.toggleCRT = toggleCRT;
    window.showToast = showToast;
    window.toggleMoeAI = toggleMoeAI;
    window.askMoeAI = askMoeAI;
    window.suggest = suggest;
