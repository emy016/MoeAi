// ============================================================
    //  ICONS
    // ============================================================
    const ICONS = {
      'book': '<path d="M4 4a2 2 0 0 1 2-2h13v18H6a2 2 0 0 0-2 2V4z"/><line x1="8" y1="7" x2="15" y2="7"/>',
      'terminal': '<polyline points="5 8 9 12 5 16"/><line x1="12" y1="16" x2="18" y2="16"/><rect x="2" y="4" width="20" height="16" rx="2"/>',
      'microchip': '<rect x="6" y="6" width="12" height="12" rx="1"/><path d="M9 2v4M15 2v4M9 18v4M15 18v4M2 9h4M2 15h4M18 9h4M18 15h4"/>',
      'dice': '<rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8.5" cy="8.5" r="1" fill="currentColor" stroke="none"/><circle cx="15.5" cy="15.5" r="1" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1" fill="currentColor" stroke="none"/>',
      'infinity': '<path d="M6 8a4 4 0 1 0 0 8c3 0 4-4 6-4s3 4 6 4a4 4 0 1 0 0-8c-3 0-4 4-6 4S9 8 6 8z"/>',
      'code': '<polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>',
      'bolt': '<polygon points="13 2 4 14 11 14 10 22 20 9 13 9 13 2" fill="currentColor" stroke="none"/>',
      'project-diagram': '<rect x="2" y="4" width="6" height="5" rx="1"/><rect x="16" y="4" width="6" height="5" rx="1"/><rect x="9" y="15" width="6" height="5" rx="1"/><path d="M5 9v2a2 2 0 0 0 2 2h3M19 9v2a2 2 0 0 1-2 2h-3"/>',
      'binary': '<rect x="4" y="3" width="7" height="8" rx="1"/><rect x="13" y="13" width="7" height="8" rx="1"/><path d="M6 21h4M8 21v-6M18 3l-2 1"/>',
      'tv': '<rect x="2" y="5" width="20" height="13" rx="2"/><polyline points="8 21 12 18 16 21"/>',
      'arrow-left': '<line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>',
      'arrow-right': '<line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>',
      'check': '<polyline points="20 6 9 17 4 12"/>',
      'chevron': '<polyline points="9 6 15 12 9 18"/>',
      'play': '<polygon points="6 4 20 12 6 20 6 4" fill="currentColor" stroke="none"/>',
      'brain': '<path d="M9 4a3 3 0 0 0-3 3 3 3 0 0 0-1 5.8V15a3 3 0 0 0 4 2.8A2.5 2.5 0 0 0 12 20V5a2.5 2.5 0 0 0-3-1z"/><path d="M15 4a3 3 0 0 1 3 3 3 3 0 0 1 1 5.8V15a3 3 0 0 1-4 2.8A2.5 2.5 0 0 1 12 20"/>',
      'clock': '<circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 16 14"/>',
      'search': '<circle cx="11" cy="11" r="7"/><line x1="16.5" y1="16.5" x2="21" y2="21"/>',
    };

    function injectIcons(root) {
      (root || document).querySelectorAll('i.ic[data-ic]').forEach(el => {
        if (el.dataset.done) return;
        const p = ICONS[el.dataset.ic];
        if (p) { el.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true">' + p + '</svg>'; el.dataset.done = '1'; }
      });
    }

    // ============================================================
    //  THEME SYSTEM (same as homepage)
    // ============================================================
    function clearCustomInlineStyles() {
      const root = document.documentElement;
      ['--custom-accent','--custom-accent2','--custom-accent3','--custom-glow',
       '--custom-glow2','--custom-border','--custom-border2','--custom-tint',
       '--custom-tint2','--custom-tint3'].forEach(v => root.style.removeProperty(v));
      document.querySelectorAll('.td-ruby,.td-lava,.td-space,.td-oxford,.td-gray,.td-light,.td-terminal')
        .forEach(el => { el.style.removeProperty('background'); el.style.removeProperty('box-shadow'); });
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
    //  DATA — ALL 8 SUBJECTS, 60 UNITS
    // ============================================================
    const COURSES = [{
      id: 'sp',
      title: 'Structured Programming',
      term: 'Term 2',
      icon: 'terminal',
      color: '#e11d48',
      units: [
        { title: 'Introduction to C++ & Program Structure', lectures: [{ title: 'What is C++ & how a program is structured', dur: '14:20' }] },
        { title: 'Data Types, Variables & Operators', lectures: [{ title: 'int, double, char, bool & arithmetic operators', dur: '18:05' }] },
        { title: 'Strings & Formatted I/O', lectures: [{ title: 'string type, cin, getline & output formatting', dur: '15:40' }] },
        { title: 'Decision Making (if / else if / switch / ternary)', lectures: [{ title: 'Conditional logic & the switch statement', dur: '20:12' }] },
        { title: 'Loops Part 1 (while, for, trace tables)', lectures: [{ title: 'while & for loops, building trace tables', dur: '22:30' }] },
        { title: 'Loops Part 2 (do-while, nested, break, continue, flags)', lectures: [{ title: 'Nested loops, break & continue', dur: '19:15' }] },
        { title: 'Functions Part 1 (declaration, definition, call, void, return)', lectures: [{ title: 'Writing & calling functions', dur: '17:50' }] },
        { title: 'Functions Part 2 (scope, global/local, recursion, references)', lectures: [{ title: 'Scope, recursion & pass-by-reference', dur: '24:00' }] },
        { title: 'Arrays Part 1 (1D, indexing, algorithms, partially filled)', lectures: [{ title: 'Declaring & looping over 1D arrays', dur: '21:10' }] },
        { title: 'Arrays Part 2 (2D, matrices, arrays in functions, diagonal)', lectures: [{ title: '2D arrays & matrix operations', dur: '23:25' }] },
        { title: 'Pointers (address, dereference, arrays & pointers, C-strings)', lectures: [{ title: 'Addresses, dereferencing & pointer basics', dur: '25:40' }] },
        { title: 'File Streams (ifstream, ofstream, fstream, persistent data)', lectures: [{ title: 'Reading from & writing to files', dur: '18:30' }] },
        { title: 'Structures (struct — defining new types)', lectures: [{ title: 'Defining & using structs', dur: '16:45' }] }
      ]
    }, {
      id: 'ld',
      title: 'Logic Design',
      term: 'Term 2',
      icon: 'microchip',
      color: '#a855f7',
      units: [
        { title: 'Numbering Systems', lectures: [{ title: 'Binary, Octal, Hex, BCD, Gray Code', dur: '22:10' }] },
        { title: 'Logic Gates & Truth Tables', lectures: [{ title: 'AND, OR, NOT, NAND, NOR, XOR, XNOR', dur: '18:30' }] },
        { title: 'Boolean Algebra', lectures: [{ title: '12 identities, DeMorgan, Absorption, Consensus', dur: '20:40' }] },
        { title: 'Standard Forms (SOP & POS)', lectures: [{ title: 'Minterms, Maxterms, ∑m, ∏M', dur: '19:15' }] },
        { title: '3-Variable K-Maps', lectures: [{ title: 'Gray code grid, grouping, wrap-around', dur: '21:00' }] },
        { title: '4-Variable K-Maps & Don\'t Cares', lectures: [{ title: 'Group sizes 1/2/4/8/16, corner wraps, Don\'t Care', dur: '24:30' }] },
        { title: 'Adders (Half, Full, Ripple Carry, Subtractor)', lectures: [{ title: 'Half Adder, Full Adder, Ripple Carry, 2\'s complement', dur: '26:15' }] },
        { title: 'Decoders & Encoders', lectures: [{ title: 'n-to-2^n decoder, Enable pin, 7-Segment, Priority encoder', dur: '22:45' }] },
        { title: 'Multiplexers & DeMultiplexers', lectures: [{ title: 'MUX as universal logic, Full Adder with 4X1 MUX', dur: '20:30' }] }
      ]
    }, {
      id: 'de',
      title: 'Differential Equations',
      term: 'Term 2',
      icon: 'infinity',
      color: '#34d399',
      units: [
        { title: 'Introduction & Classification', lectures: [{ title: 'ODE vs PDE, order, degree, linear vs nonlinear', dur: '16:20' }] },
        { title: 'Separable Differential Equations', lectures: [{ title: 'Separation of variables, initial conditions', dur: '19:40' }] },
        { title: 'Linear First-Order ODEs', lectures: [{ title: 'Standard form, integrating factor', dur: '22:10' }] },
        { title: 'Exact Differential Equations', lectures: [{ title: 'Exactness test, solution method, integrating factors', dur: '21:30' }] },
        { title: 'Non-Exact DEs & Integrating Factors', lectures: [{ title: 'Type 1 (depends on x), Type 2 (depends on y)', dur: '23:15' }] },
        { title: 'Homogeneous First-Order DEs', lectures: [{ title: 'Test, v = y/x substitution, back-substitution', dur: '20:45' }] },
        { title: 'Higher-Order Homogeneous Linear DEs', lectures: [{ title: 'Characteristic equation, distinct/repeated/complex roots', dur: '25:30' }] },
        { title: 'Non-Homogeneous DEs: Undetermined Coefficients', lectures: [{ title: 'Guessing table, duplication rule', dur: '24:00' }] }
      ]
    }, {
      id: 'pr',
      title: 'Probability & Statistics',
      term: 'Term 2',
      icon: 'dice',
      color: '#f43f5e',
      units: [
        { title: 'Probability Theory Foundations', lectures: [{ title: 'Random experiments, sample space, events, axioms', dur: '18:20' }] },
        { title: 'Counting Rules (Permutations & Combinations)', lectures: [{ title: 'nPr, nCr, factorial, identical items, repetition', dur: '20:40' }] },
        { title: 'Conditional Probability & Bayes\' Theorem', lectures: [{ title: 'P(A|B), multiplication rule, total probability, Bayes', dur: '24:10' }] },
        { title: 'Discrete Random Variables & PMF', lectures: [{ title: 'PMF, CDF, expected value, variance', dur: '22:15' }] },
        { title: 'Continuous Random Variables & PDF', lectures: [{ title: 'PDF, CDF, probability as integral', dur: '21:30' }] },
        { title: 'Mathematical Expectation', lectures: [{ title: 'E(X), E(g(X)), variance, linearity properties', dur: '19:45' }] },
        { title: 'Binomial & Geometric Distributions', lectures: [{ title: 'Binomial PMF, mean, variance; Geometric', dur: '23:20' }] },
        { title: 'Poisson, Uniform, Normal & Exponential', lectures: [{ title: 'Poisson, Uniform(a,b), Normal Z-score, Exponential', dur: '26:00' }] }
      ]
    }, {
      id: 'ca',
      title: 'Calculus',
      term: 'Term 1',
      icon: 'infinity',
      color: '#00d4ff',
      units: [
        { title: 'Limits & Continuity', lectures: [{ title: 'Definition, one-sided, continuity, IVT', dur: '20:00' }] },
        { title: 'Derivatives (Power, Product, Quotient, Chain)', lectures: [{ title: 'Definition, rules, implicit differentiation', dur: '24:30' }] },
        { title: 'Applications of Derivatives', lectures: [{ title: 'Min/max, concavity, optimization, L\'Hôpital', dur: '22:45' }] },
        { title: 'Integration (Indefinite & Definite)', lectures: [{ title: 'Antiderivatives, FTC, substitution', dur: '23:10' }] },
        { title: 'Techniques of Integration', lectures: [{ title: 'Integration by parts, trig substitution, partial fractions', dur: '28:00' }] },
        { title: 'Applications of Integrals', lectures: [{ title: 'Area between curves, volume (disk method), arc length', dur: '25:15' }] }
      ]
    }, {
      id: 'ph',
      title: 'Physics',
      term: 'Term 1',
      icon: 'bolt',
      color: '#fb7185',
      units: [
        { title: 'Mechanics: Kinematics', lectures: [{ title: '1D/2D motion, projectile, relative motion', dur: '22:00' }] },
        { title: 'Mechanics: Dynamics (Newton\'s Laws)', lectures: [{ title: 'F=ma, friction, circular motion', dur: '24:30' }] },
        { title: 'Work, Energy & Power', lectures: [{ title: 'Work-energy theorem, conservation of energy, power', dur: '21:15' }] },
        { title: 'Electricity: Coulomb\'s Law & Electric Fields', lectures: [{ title: 'Coulomb\'s Law, electric field, Gauss\'s Law', dur: '23:40' }] },
        { title: 'Circuits: Ohm\'s Law, Kirchhoff\'s Laws', lectures: [{ title: 'V=IR, KVL, KCL, series/parallel', dur: '20:50' }] },
        { title: 'Magnetism & Lenz\'s Law', lectures: [{ title: 'Magnetic force, Faraday\'s Law, Lenz\'s Law', dur: '22:30' }] }
      ]
    }, {
      id: 'dm',
      title: 'Discrete Mathematics',
      term: 'Term 1',
      icon: 'project-diagram',
      color: '#c084fc',
      units: [
        { title: 'Propositional Logic', lectures: [{ title: 'Logical operators, truth tables, equivalences, tautologies', dur: '20:00' }] },
        { title: 'Predicate Logic & Proofs', lectures: [{ title: 'Quantifiers, negation, inference rules, induction', dur: '22:30' }] },
        { title: 'Set Theory', lectures: [{ title: 'Sets, subsets, operations, cardinality, power sets', dur: '18:45' }] },
        { title: 'Combinatorics', lectures: [{ title: 'Permutations, combinations, binomial theorem, pigeonhole', dur: '21:10' }] },
        { title: 'Functions & Relations', lectures: [{ title: 'Functions, injective/surjective/bijective, relations', dur: '19:30' }] }
      ]
    }, {
      id: 'cf',
      title: 'Computing Fundamentals',
      term: 'Term 1',
      icon: 'binary',
      color: '#60a5fa',
      units: [
        { title: 'Number Systems & Binary Arithmetic', lectures: [{ title: 'Binary, Octal, Hex, BCD, Gray Code, complements', dur: '22:00' }] },
        { title: 'Basic Hardware (CPU, Memory, I/O, Motherboard)', lectures: [{ title: 'Von Neumann architecture, CPU, RAM, ROM, BIOS', dur: '20:30' }] },
        { title: 'Basic Software (OS, Compilers, Interpreters)', lectures: [{ title: 'System vs application software, OS functions, compilers', dur: '18:45' }] },
        { title: 'Networking Fundamentals', lectures: [{ title: 'Topologies, devices, OSI model, TCP/IP', dur: '24:10' }] },
        { title: 'IP Addressing & Protocols', lectures: [{ title: 'IPv4, IPv6, subnetting, TCP vs UDP, DNS', dur: '21:50' }] }
      ]
    }];

    // Real notes for Unit 1, Lecture 1 of Structured Programming
    const REAL_NOTES = {
      'sp_0_0': `
        <p>Every C++ program starts from a fixed skeleton. Understanding each piece is the foundation for everything else in this course.</p>
        <h3>The Minimal Program</h3>
        <pre><span class="cm">// include the input/output library</span>
  <span class="kw">#include</span> &lt;iostream&gt;
  <span class="kw">using namespace</span> std;

  <span class="kw">int</span> main() {
      cout &lt;&lt; <span class="st">"Hello, EduMoe!"</span>;
      <span class="kw">return</span> 0;
  }</pre>
        <h3>Breaking It Down</h3>
        <ul>
          <li><code>#include &lt;iostream&gt;</code> — pulls in the library that gives you <code>cout</code> and <code>cin</code>.</li>
          <li><code>using namespace std;</code> — lets you write <code>cout</code> instead of <code>std::cout</code>.</li>
          <li><code>int main()</code> — every program starts executing here. Exactly one <code>main</code>.</li>
          <li><code>cout &lt;&lt; ...</code> — sends output to the screen. The <code>&lt;&lt;</code> is the insertion operator.</li>
          <li><code>return 0;</code> — tells the OS the program finished successfully.</li>
        </ul>
        <div class="callout"><b>Exam trap:</b> forgetting the semicolon <code>;</code> at the end of a statement is the #1 cause of compile errors. Every statement ends with one — but <code>#include</code> lines and function headers do <b>not</b>.</div>
        <p>Open the compiler tab and run the program above. Change the text inside the quotes and re-run it — that's the fastest way to build intuition.</p>
      `
    };

    // Get notes for a lecture
    function getNotes(courseId, unitIdx, lecIdx) {
      const key = `${courseId}_${unitIdx}_${lecIdx}`;
      return REAL_NOTES[key] || '';
    }

    // Flat list of all lectures
    let allLectures = [];
    COURSES.forEach(c => {
      c.units.forEach((u, ui) => {
        u.lectures.forEach((l, li) => {
          allLectures.push({ ...l, courseId: c.id, unitIdx: ui, lecIdx: li, unitTitle: u.title });
        });
      });
    });

    // ============================================================
    //  STATE
    // ============================================================
    let currentCourseId = null;
    let currentLecIdx = 0;
    let progress = {}; // { courseId: { unitIdx: { lecIdx: true } } }
    let lastVisited = null; // { courseId, lecIdx }

    // Load progress from localStorage
    try {
      const saved = localStorage.getItem('edumoe_course_progress');
      if (saved) progress = JSON.parse(saved);
      const lv = localStorage.getItem('edumoe_last_visited');
      if (lv) lastVisited = JSON.parse(lv);
    } catch (e) {}

    function saveProgress() {
      localStorage.setItem('edumoe_course_progress', JSON.stringify(progress));
    }

    function saveLastVisited(courseId, lecIdx) {
      lastVisited = { courseId, lecIdx };
      localStorage.setItem('edumoe_last_visited', JSON.stringify(lastVisited));
    }

    function getCourse(id) { return COURSES.find(c => c.id === id); }

    function getFlatLectures(courseId) {
      const c = getCourse(courseId);
      if (!c) return [];
      const flat = [];
      c.units.forEach((u, ui) => {
        u.lectures.forEach((l, li) => {
          flat.push({ ...l, courseId, unitIdx: ui, lecIdx: li, unitTitle: u.title });
        });
      });
      return flat;
    }

    function isDone(courseId, unitIdx, lecIdx) {
      return !!(progress[courseId] && progress[courseId][unitIdx] && progress[courseId][unitIdx][lecIdx]);
    }

    function toggleDone(courseId, unitIdx, lecIdx) {
      if (!progress[courseId]) progress[courseId] = {};
      if (!progress[courseId][unitIdx]) progress[courseId][unitIdx] = {};
      const key = String(lecIdx);
      progress[courseId][unitIdx][key] = !progress[courseId][unitIdx][key];
      saveProgress();
    }

    function getCourseProgress(courseId) {
      const flat = getFlatLectures(courseId);
      let done = 0;
      flat.forEach(l => { if (isDone(courseId, l.unitIdx, l.lecIdx)) done++; });
      return { done, total: flat.length, pct: flat.length ? Math.round(done / flat.length * 100) : 0 };
    }

    function getGlobalStats() {
      let total = 0, done = 0;
      COURSES.forEach(c => {
        const p = getCourseProgress(c.id);
        total += p.total;
        done += p.done;
      });
      return { total, done, pct: total ? Math.round(done / total * 100) : 0 };
    }

    // ============================================================
    //  RENDER OVERVIEW
    // ============================================================
    function renderOverview(filter = '') {
      const grid = document.getElementById('courseGrid');
      const stats = getGlobalStats();
      document.getElementById('statTotal').textContent = stats.total;
      document.getElementById('statDone').textContent = stats.done;
      document.getElementById('statPct').textContent = stats.pct + '%';

      let filtered = COURSES;
      if (filter.trim()) {
        const q = filter.trim().toLowerCase();
        filtered = COURSES.filter(c => c.title.toLowerCase().includes(q) || c.term.toLowerCase().includes(q));
      }

      if (filtered.length === 0) {
        grid.innerHTML = `<div class="no-results"><i class="ic" data-ic="search"></i>No courses match "${filter}"</div>`;
        return;
      }

      grid.innerHTML = filtered.map(c => {
        const p = getCourseProgress(c.id);
        const badge = p.total === 0 ? 'Not started' :
                      p.pct === 100 ? 'Complete' :
                      'In progress';
        const badgeClass = p.pct === 100 ? 'complete' : 'started';
        return `
          <div class="course-card" onclick="openCourse('${c.id}')">
            <div class="progress-badge ${badgeClass}">${p.pct === 100 ? '✓' : ''} ${badge}</div>
            <div class="card-icon"><i class="ic" data-ic="${c.icon}"></i></div>
            <h3>${c.title}</h3>
            <div class="sub">${c.term} · ${c.units.length} units</div>
            <div class="meta">
              <span><i class="ic" data-ic="clock"></i> ${p.total} lectures</span>
              <span><i class="ic" data-ic="check"></i> ${p.done} done</span>
            </div>
            <div class="prog-bar"><div class="prog-bar-fill" style="width:${p.pct}%"></div></div>
          </div>
        `;
      }).join('');
      injectIcons(grid);

      // Show Continue Learning section
      updateContinueSection();
    }

    function filterCourses(q) { renderOverview(q); }

    // ============================================================
    //  CONTINUE LEARNING
    // ============================================================
    function updateContinueSection() {
      const section = document.getElementById('continueSection');
      if (!lastVisited) { section.classList.add('hidden'); return; }
      const c = getCourse(lastVisited.courseId);
      if (!c) { section.classList.add('hidden'); return; }
      const flat = getFlatLectures(lastVisited.courseId);
      if (lastVisited.lecIdx >= flat.length) { section.classList.add('hidden'); return; }
      const lec = flat[lastVisited.lecIdx];
      section.classList.remove('hidden');
      document.getElementById('continueCourse').textContent = c.title;
      document.getElementById('continueLecture').textContent = lec.title;
    }

    function resumeLearning() {
      if (!lastVisited) return;
      openCourse(lastVisited.courseId);
      // openLecture will be called inside renderDetail, but we need to jump to the saved index
      // We'll store the intended index and use it after render
      window._resumeIdx = lastVisited.lecIdx;
    }

    // ============================================================
    //  RENDER DETAIL
    // ============================================================
    function openCourse(id) {
      currentCourseId = id;
      currentLecIdx = 0;
      document.getElementById('overviewView').style.display = 'none';
      document.getElementById('detailView').classList.add('active');
      renderDetail();

      // If we have a resume index, jump to it
      if (window._resumeIdx !== undefined && window._resumeIdx !== null) {
        const flat = getFlatLectures(id);
        if (window._resumeIdx < flat.length) {
          currentLecIdx = window._resumeIdx;
          renderDetail();
        }
        window._resumeIdx = null;
      }
    }

    function goBack() {
      document.getElementById('detailView').classList.remove('active');
      document.getElementById('overviewView').style.display = 'block';
      renderOverview();
      if (window.innerWidth <= 860) closeSidebar();
    }

    function renderDetail() {
      const c = getCourse(currentCourseId);
      if (!c) return;
      document.getElementById('detailTitle').textContent = c.title;
      document.getElementById('detailSub').textContent = c.term + ' · ' + c.units.length + ' units';
      document.getElementById('sideTitle').textContent = c.title + ' · Units';
      document.getElementById('sideMeta').textContent = c.units.length + ' units · ' + getFlatLectures(c.id).length + ' lectures';

      const flat = getFlatLectures(c.id);
      const p = getCourseProgress(c.id);
      document.getElementById('sideProgFill').style.width = p.pct + '%';
      document.getElementById('sideProgText').textContent = p.done + ' of ' + p.total + ' done';
      document.getElementById('sideProgPct').textContent = p.pct + '%';

      // Build unit list
      const list = document.getElementById('unitList');
      list.innerHTML = c.units.map((u, ui) => {
        const openClass = ui === 0 ? 'open' : '';
        return `
          <div class="unit-item ${openClass}" id="unit-${ui}">
            <div class="unit-head" onclick="toggleUnit(${ui})">
              <div class="unit-num">${ui+1}</div>
              <div class="unit-title">${u.title}</div>
              <i class="ic chev" data-ic="chevron"></i>
            </div>
            <div class="unit-lectures">
              ${u.lectures.map((l, li) => {
                const idx = flat.findIndex(f => f.unitIdx === ui && f.lecIdx === li);
                const done = isDone(c.id, ui, li);
                return `
                  <div class="lecture-item ${done ? 'done' : ''} ${idx === currentLecIdx ? 'active' : ''}" onclick="openLecture(${idx})">
                    <div class="lec-check"><i class="ic" data-ic="check"></i></div>
                    <div class="lec-title">${l.title}</div>
                    <div class="lec-dur">${l.dur}</div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        `;
      }).join('');
      injectIcons(list);

      // Open current lecture
      if (flat.length) {
        if (currentLecIdx >= flat.length) currentLecIdx = 0;
        openLecture(currentLecIdx);
      }
    }

    function toggleUnit(ui) {
      const el = document.getElementById('unit-' + ui);
      if (el) el.classList.toggle('open');
    }

    function openLecture(idx) {
      const flat = getFlatLectures(currentCourseId);
      if (idx < 0 || idx >= flat.length) return;
      currentLecIdx = idx;
      const L = flat[idx];
      const c = getCourse(currentCourseId);

      // Save last visited
      saveLastVisited(currentCourseId, idx);

      // Update active class on lectures
      document.querySelectorAll('.lecture-item').forEach(el => el.classList.remove('active'));
      const items = document.querySelectorAll('.lecture-item');
      if (items[idx]) items[idx].classList.add('active');

      // Expand the unit
      document.querySelectorAll('.unit-item').forEach(el => el.classList.remove('open'));
      const target = document.getElementById('unit-' + L.unitIdx);
      if (target) target.classList.add('open');

      // Render main content
      const main = document.getElementById('mainContent');
      const done = isDone(c.id, L.unitIdx, L.lecIdx);
      const notes = getNotes(c.id, L.unitIdx, L.lecIdx);
      const hasNotes = notes && notes.trim();

      main.innerHTML = `
        <div class="lec-header">
          <div class="lec-eyebrow">Unit ${L.unitIdx+1} · ${L.unitTitle}</div>
          <h1>${L.title}</h1>
          <div class="sub"><i class="ic" data-ic="clock"></i> ${L.dur} &nbsp;·&nbsp; Lecture ${idx+1} of ${flat.length}</div>
        </div>
        <div class="video-wrap">
          <div class="video-placeholder" onclick="showToast('🎬 Video coming soon — Moemen records these.')">
            <div class="play-btn"><i class="ic" data-ic="play"></i></div>
            <div class="vp-note">Video lecture coming soon</div>
          </div>
        </div>
        <div class="ai-strip">
          <div class="ai-avatar"><i class="ic" data-ic="brain"></i></div>
          <div class="ai-text"><b>MoeAI companion</b> — once the video's up, ask me to summarize it, jump to any topic, or explain anything you didn't catch. <span style="color:var(--txt3)">(coming soon)</span></div>
        </div>
        <div class="notes">
          ${hasNotes ? notes : '<p style="color:var(--txt3)">Written notes for this lecture are coming soon. The unit structure and video will be added by the EduMoe team.</p>'}
        </div>
        <button class="btn ${done ? '' : 'btn-primary'} mark-done-btn" onclick="toggleDoneLec(${L.unitIdx}, ${L.lecIdx})">
          <i class="ic" data-ic="check"></i> ${done ? 'Completed ✓ — click to undo' : 'Mark as complete'}
        </button>
        <div class="lec-nav">
          ${idx > 0 ? `<button class="btn nav-prev" onclick="openLecture(${idx-1})"><i class="ic" data-ic="arrow-left"></i> Previous</button>` : '<span></span>'}
          ${idx < flat.length-1 ? `<button class="btn nav-next" onclick="openLecture(${idx+1})">Next <i class="ic" data-ic="arrow-right"></i></button>` : '<span></span>'}
        </div>
      `;
      injectIcons(main);
      document.getElementById('mainContent').scrollTop = 0;
      if (window.innerWidth <= 860) closeSidebar();
    }

    function toggleDoneLec(unitIdx, lecIdx) {
      toggleDone(currentCourseId, unitIdx, lecIdx);
      renderDetail();
      // Re-render overview stats in background
      const stats = getGlobalStats();
      document.getElementById('statTotal').textContent = stats.total;
      document.getElementById('statDone').textContent = stats.done;
      document.getElementById('statPct').textContent = stats.pct + '%';
    }

    // ============================================================
    //  SIDEBAR TOGGLE (mobile)
    // ============================================================
    function toggleSidebar() {
      const s = document.getElementById('sidebar');
      const b = document.getElementById('sidebarBackdrop');
      s.classList.toggle('open');
      b.classList.toggle('show');
    }
    function closeSidebar() {
      document.getElementById('sidebar').classList.remove('open');
      document.getElementById('sidebarBackdrop').classList.remove('show');
    }

    // ============================================================
    //  KEYBOARD SHORTCUTS
    // ============================================================
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (document.getElementById('detailView').classList.contains('active')) {
          goBack();
        }
      }
      if (e.key === 'ArrowRight' && document.getElementById('detailView').classList.contains('active')) {
        const flat = getFlatLectures(currentCourseId);
        if (currentLecIdx < flat.length - 1) openLecture(currentLecIdx + 1);
      }
      if (e.key === 'ArrowLeft' && document.getElementById('detailView').classList.contains('active')) {
        if (currentLecIdx > 0) openLecture(currentLecIdx - 1);
      }
    });

    // ============================================================
    //  TOAST
    // ============================================================
    let toastTimer;
    function showToast(msg) {
      const t = document.getElementById('toast'), m = document.getElementById('toastMsg');
      if (!t || !m) return;
      m.textContent = msg;
      t.classList.add('show');
      clearTimeout(toastTimer);
      toastTimer = setTimeout(() => t.classList.remove('show'), 3000);
    }

    // ============================================================
    //  INIT
    // ============================================================
    document.addEventListener('DOMContentLoaded', () => {
      renderOverview();
      injectIcons();
      // Menu toggle for mobile
      const detailTop = document.querySelector('.detail-top');
      const menuBtn = document.createElement('button');
      menuBtn.className = 'btn btn-sm menu-toggle';
      menuBtn.innerHTML = '<i class="ic" data-ic="book"></i> Units';
      menuBtn.onclick = toggleSidebar;
      detailTop.insertBefore(menuBtn, detailTop.firstChild);
    });

    // Expose functions globally
    window.openCourse = openCourse;
    window.goBack = goBack;
    window.toggleUnit = toggleUnit;
    window.openLecture = openLecture;
    window.toggleDoneLec = toggleDoneLec;
    window.toggleSidebar = toggleSidebar;
    window.closeSidebar = closeSidebar;
    window.showToast = showToast;
    window.setTheme = setTheme;
    window.setCustomTheme = setCustomTheme;
    window.toggleCRT = toggleCRT;
    window.filterCourses = filterCourses;
    window.resumeLearning = resumeLearning;

    console.log('🎓 EDUMOE Ultimate Courses (Improved) loaded.');
