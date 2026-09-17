// ============================================================
    //  ICONS
    // ============================================================
    const ICONS = {
      'trophy': '<path d="M6 4h12v4a6 6 0 0 1-12 0V4z"/><path d="M6 6H3v2a3 3 0 0 0 3 3M18 6h3v2a3 3 0 0 1-3 3"/><line x1="12" y1="14" x2="12" y2="18"/><path d="M8 21h8M9 18h6v3H9z"/>',
      'user': '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.5-6 8-6s8 2 8 6"/>',
      'zap': '<polygon points="13 2 4 14 11 14 10 22 20 9 13 9 13 2" fill="currentColor" stroke="none"/>',
      'fire': '<path d="M12 2C10 6 6 8 8 12c2 4 0 8 4 10 4-2 2-6 4-10 2-4-2-6-4-10z" fill="currentColor" stroke="none"/>',
      'list': '<line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><circle cx="3.5" cy="6" r="1" fill="currentColor"/><circle cx="3.5" cy="12" r="1" fill="currentColor"/><circle cx="3.5" cy="18" r="1" fill="currentColor"/>',
      'clock': '<circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 16 14"/>',
      'medal': '<circle cx="12" cy="12" r="9"/><polyline points="9 10 11 14 15 10"/>',
      'check': '<polyline points="20 6 9 17 4 12"/>',
      'x': '<line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/>',
      'arrow-right': '<line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>',
      'arrow-left': '<line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>',
      'redo': '<path d="M21 7v6h-6"/><path d="M21 13a9 9 0 1 0-3 7.7L21 18"/>',
      'book': '<path d="M4 4a2 2 0 0 1 2-2h13v18H6a2 2 0 0 0-2 2V4z"/><line x1="8" y1="7" x2="15" y2="7"/>',
      'tv': '<rect x="2" y="5" width="20" height="13" rx="2"/><polyline points="8 21 12 18 16 21"/>',
      'clipboard': '<rect x="8" y="2" width="8" height="4" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M9 12l2 2 4-4"/>',
      'play': '<polygon points="6 4 20 12 6 20 6 4" fill="currentColor" stroke="none"/>',
      'flag': '<path d="M5 21V3h14l-2 5 2 5H7v8"/>',
      'shield': '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
      'star': '<polygon points="12 2 15 9 22 9 16 14 19 21 12 17 5 21 8 14 2 9 9 9 12 2" fill="currentColor" stroke="none"/>',
    };

    function injectIcons(root) {
      (root || document).querySelectorAll('i.ic[data-ic]').forEach(el => {
        if (el.dataset.done) return;
        const p = ICONS[el.dataset.ic];
        if (p) { el.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true">' + p + '</svg>'; el.dataset.done = '1'; }
      });
    }

    // ============================================================
    //  THEME SYSTEM
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
    //  ELO SYSTEM & DATA
    // ============================================================
    const INITIAL_ELO = 1200;
    const K_FACTOR = 32;

    function expectedScore(eloA, eloB) {
      return 1 / (1 + Math.pow(10, (eloB - eloA) / 400));
    }

    function updateElo(winnerElo, loserElo) {
      const expected = expectedScore(winnerElo, loserElo);
      const change = Math.round(K_FACTOR * (1 - expected));
      return { winnerNew: winnerElo + change, loserNew: loserElo - change };
    }

    // ─── 8 Bot Difficulties ──────────────────────────────────────
    const BOT_DIFFICULTIES = [
      { id: 'rookie', name: 'Rookie Bot', elo: 800, accuracy: 0.40, icon: '🌱', desc: 'New to the game, makes many mistakes', color: '#4ade80' },
      { id: 'novice', name: 'Novice Bot', elo: 950, accuracy: 0.50, icon: '📘', desc: 'Learning the ropes, inconsistent', color: '#60a5fa' },
      { id: 'adept', name: 'Adept Bot', elo: 1100, accuracy: 0.60, icon: '⚡', desc: 'Solid understanding, occasional errors', color: '#c084fc' },
      { id: 'pro', name: 'Pro Bot', elo: 1250, accuracy: 0.70, icon: '🔥', desc: 'Strong competitor, knows the basics well', color: '#fb923c' },
      { id: 'expert', name: 'Expert Bot', elo: 1400, accuracy: 0.80, icon: '🧠', desc: 'Tough opponent, rarely misses', color: '#f472b6' },
      { id: 'master', name: 'Master Bot', elo: 1550, accuracy: 0.88, icon: '🏆', desc: 'Elite-level, almost perfect', color: '#fbbf24' },
      { id: 'legend', name: 'Legend Bot', elo: 1700, accuracy: 0.94, icon: '👑', desc: 'The final boss of EduMoe', color: '#fb7185' },
      { id: 'moeai', name: 'MoeAI Bot', elo: 1850, accuracy: 0.97, icon: '🤖', desc: 'Powered by AI — the ultimate challenge', color: '#34d399' },
    ];

    // ─── Player State ─────────────────────────────────────────────
    let player = {
      name: 'You',
      elo: INITIAL_ELO,
      wins: 0,
      losses: 0,
      draws: 0,
      streak: 0,
      bestStreak: 0,
      matches: [],
      tournamentWins: 0,
      totalQuestions: 0,
      correctAnswers: 0,
      botStats: {},
      seasonElo: INITIAL_ELO,
      placementMatches: 0,
      achievements: {},
      gauntletComplete: false,
      perfectGames: 0,
    };

    let leaderboardData = [];
    let matchHistory = [];
    let tournaments = [];
    let currentTournament = null;
    let matchState = null;
    let gauntletState = null;
    let currentMode = 'profile';
    let lbPeriod = 'all';

    // ─── Achievements ─────────────────────────────────────────────
    const ACHIEVEMENTS = [
      { id: 'first_win', name: 'First Victory', desc: 'Win your first ranked match', icon: '🏆', condition: (p) => p.wins >= 1 },
      { id: 'win_5', name: 'Rising Star', desc: 'Win 5 ranked matches', icon: '⭐', condition: (p) => p.wins >= 5 },
      { id: 'win_25', name: 'Seasoned Warrior', desc: 'Win 25 ranked matches', icon: '⚔️', condition: (p) => p.wins >= 25 },
      { id: 'streak_3', name: 'On Fire', desc: 'Win 3 matches in a row', icon: '🔥', condition: (p) => p.bestStreak >= 3 },
      { id: 'streak_5', name: 'Unstoppable', desc: 'Win 5 matches in a row', icon: '💀', condition: (p) => p.bestStreak >= 5 },
      { id: 'streak_10', name: 'Legendary Streak', desc: 'Win 10 matches in a row', icon: '🌟', condition: (p) => p.bestStreak >= 10 },
      { id: 'elo_1500', name: 'Elite', desc: 'Reach 1500 Elo', icon: '👑', condition: (p) => p.elo >= 1500 },
      { id: 'elo_1800', name: 'Legendary', desc: 'Reach 1800 Elo', icon: '🌟', condition: (p) => p.elo >= 1800 },
      { id: 'elo_2000', name: 'Immortal', desc: 'Reach 2000 Elo', icon: '💀', condition: (p) => p.elo >= 2000 },
      { id: 'tournament_win', name: 'Tournament Champion', desc: 'Win a tournament', icon: '🏆', condition: (p) => p.tournamentWins >= 1 },
      { id: 'gauntlet', name: 'Gauntlet Runner', desc: 'Complete the Gauntlet mode', icon: '🏃', condition: (p) => p.gauntletComplete },
      { id: 'beast', name: 'The Beast', desc: 'Beat all 8 bots in ranked', icon: '🐉', condition: (p) => Object.values(p.botStats).filter(b => b.wins > 0).length >= 8 },
      { id: 'perfect', name: 'Perfect Game', desc: 'Get 100% accuracy in a match', icon: '💯', condition: (p) => p.perfectGames >= 1 },
      { id: 'perfect_5', name: 'Perfectionist', desc: 'Get 5 perfect games', icon: '💎', condition: (p) => p.perfectGames >= 5 },
      { id: 'tournament_3', name: 'Tournament Dominator', desc: 'Win 3 tournaments', icon: '🏅', condition: (p) => p.tournamentWins >= 3 },
      { id: 'rookie_beat', name: 'First Blood', desc: 'Beat the Rookie Bot', icon: '🥊', condition: (p) => p.botStats.rookie?.wins >= 1 },
      { id: 'moeai_beat', name: 'AI Slayer', desc: 'Beat the MoeAI Bot', icon: '🤖', condition: (p) => p.botStats.moeai?.wins >= 1 },
    ];

    // Load saved data
    try {
      const p = localStorage.getItem('edumoe_ranked_player');
      if (p) { const parsed = JSON.parse(p); Object.assign(player, parsed); }
      const lb = localStorage.getItem('edumoe_ranked_leaderboard');
      if (lb) leaderboardData = JSON.parse(lb);
      const mh = localStorage.getItem('edumoe_ranked_history');
      if (mh) matchHistory = JSON.parse(mh);
      const t = localStorage.getItem('edumoe_ranked_tournaments');
      if (t) tournaments = JSON.parse(t);
    } catch (e) {}

    // Seed leaderboard
    if (!leaderboardData.length) {
      leaderboardData = BOT_DIFFICULTIES.map(b => ({
        id: 'bot-' + b.id,
        name: b.name,
        elo: b.elo,
        wins: 0,
        losses: 0,
        draws: 0,
        isBot: true,
        botId: b.id,
        matches: 0,
        streak: 0,
      }));
      leaderboardData.push({ id: 'me', name: 'You', elo: player.elo, wins: player.wins, losses: player.losses, draws: player.draws, isBot: false, matches: 0, streak: 0 });
      saveData();
    }

    function ensurePlayerInLeaderboard() {
      let entry = leaderboardData.find(d => d.id === 'me');
      if (!entry) {
        entry = { id: 'me', name: 'You', elo: player.elo, wins: player.wins, losses: player.losses, draws: player.draws, isBot: false, matches: 0, streak: player.streak };
        leaderboardData.push(entry);
      }
      return entry;
    }

    function saveData() {
      const entry = ensurePlayerInLeaderboard();
      entry.elo = player.elo;
      entry.wins = player.wins;
      entry.losses = player.losses;
      entry.draws = player.draws;
      entry.matches = player.wins + player.losses + player.draws;
      entry.streak = player.streak;
      localStorage.setItem('edumoe_ranked_player', JSON.stringify(player));
      localStorage.setItem('edumoe_ranked_leaderboard', JSON.stringify(leaderboardData));
      localStorage.setItem('edumoe_ranked_history', JSON.stringify(matchHistory));
      localStorage.setItem('edumoe_ranked_tournaments', JSON.stringify(tournaments));
    }

    // ============================================================
    //  QUESTION BANK
    // ============================================================
    const RANKED_QUESTIONS = [
      // C++ / Structured Programming
      { q: 'Which header must you include to use <code>cout</code>?', choices: ['&lt;stdio.h&gt;', '&lt;iostream&gt;', '&lt;string&gt;', '&lt;conio.h&gt;'], correct: 1, exp: '<code>&lt;iostream&gt;</code> provides cout and cin.', diff: 'easy' },
      { q: 'What does every C++ program need exactly one of?', choices: ['A loop', 'A class', 'A <code>main()</code> function', 'A comment'], correct: 2, exp: 'Execution always begins at <code>main()</code>.', diff: 'easy' },
      { q: 'What is printed?<pre>int x = 5;\ncout &lt;&lt; x++ &lt;&lt; " " &lt;&lt; x;</pre>', choices: ['5 5', '6 6', '5 6', '6 5'], correct: 2, exp: 'Post-increment uses 5 first, then x becomes 6.', diff: 'medium' },
      { q: 'Which is a valid variable declaration?', choices: ['<code>int 2x;</code>', '<code>double my-var;</code>', '<code>int _count;</code>', '<code>float class;</code>'], correct: 2, exp: 'Identifiers start with letter or underscore.', diff: 'easy' },
      { q: 'The statement <code>if (x = 5)</code> is a bug because…', choices: ['5 is too large', '= assigns instead of compares, and is always true', 'You can\'t compare integers', 'It needs a semicolon'], correct: 1, exp: '<code>=</code> is assignment; comparison needs <code>==</code>.', diff: 'medium' },
      { q: 'What is the output?<pre>int x = 3;\ncout &lt;&lt; ++x * 2;</pre>', choices: ['6', '7', '8', '9'], correct: 2, exp: 'Pre-increment ++x increments x to 4, then ×2 = 8.', diff: 'medium' },
      { q: 'Which loop is best for known iteration count?', choices: ['while', 'do-while', 'for', 'goto'], correct: 2, exp: 'The <code>for</code> loop bundles init, condition, update.', diff: 'easy' },
      // Logic Design
      { q: 'The output of a <b>NAND</b> gate is 0 only when…', choices: ['Both inputs are 0', 'Both inputs are 1', 'Inputs differ', 'Never'], correct: 1, exp: 'NAND = NOT AND. Only 0 when both are 1.', diff: 'easy' },
      { q: 'By De Morgan\'s law, (A·B)\' equals…', choices: ["A'·B'", "A'+B'", "A+B", "A·B"], correct: 1, exp: "(A·B)' = A'+B'.", diff: 'medium' },
      { q: 'A·B ⊕ A·B equals…', choices: ['A·B', '1', '0', 'A'], correct: 2, exp: 'XOR with itself = 0.', diff: 'easy' },
      { q: 'How many rows in a truth table with 4 inputs?', choices: ['4', '8', '16', '32'], correct: 2, exp: '2⁴ = 16 rows.', diff: 'easy' },
      // Probability
      { q: 'P(A∪B) equals…', choices: ['P(A)+P(B)', 'P(A)+P(B)−P(A∩B)', 'P(A)·P(B)', 'P(A∩B)/P(B)'], correct: 1, exp: 'Addition rule subtracts the overlap.', diff: 'easy' },
      { q: 'Two events are <b>independent</b> when…', choices: ['P(A∩B)=0', 'P(A∩B)=P(A)·P(B)', 'P(A)=P(B)', 'They can\'t both happen'], correct: 1, exp: 'Independence means the joint equals the product.', diff: 'easy' },
      { q: '"Average of 3 arrivals per hour" signals which distribution?', choices: ['Binomial', 'Normal', 'Poisson', 'Uniform'], correct: 2, exp: '"Per unit time / average rate" → Poisson.', diff: 'easy' },
      // Calculus
      { q: '∫ xⁿ dx equals (n ≠ −1)…', choices: ['n·xⁿ⁻¹', 'xⁿ⁺¹/(n+1) + C', 'xⁿ⁻¹/(n−1)', 'n·xⁿ⁺¹ + C'], correct: 1, exp: 'Power rule: xⁿ⁺¹/(n+1) + C.', diff: 'easy' },
      { q: 'd/dx [sin(x)] = …', choices: ['−cos(x)', 'cos(x)', '−sin(x)', 'tan(x)'], correct: 1, exp: 'Derivative of sin is cos.', diff: 'easy' },
      // Differential Equations
      { q: 'What is the order of y\'\' + 2y\' + 5y = 0?', choices: ['1', '2', '3', '4'], correct: 1, exp: 'Highest derivative is y\'\' (2nd).', diff: 'easy' },
      // Physics
      { q: 'What does Ohm\'s Law state?', choices: ['V = IR', 'I = VR', 'R = VI', 'V = I/R'], correct: 0, exp: 'Ohm\'s Law: V = IR.', diff: 'easy' },
      // Discrete Math
      { q: 'What is the contrapositive of p → q?', choices: ['¬q → ¬p', '¬p → ¬q', 'q → p', '¬q → p'], correct: 0, exp: 'Contrapositive of p → q is ¬q → ¬p.', diff: 'medium' },
      { q: 'What is the union of sets A and B?', choices: ['Elements in both', 'Elements in either', 'Elements in neither', 'Elements in A only'], correct: 1, exp: 'A∪B = {x | x∈A or x∈B}.', diff: 'easy' },
      // Computing Fundamentals
      { q: 'What is the decimal value of binary 1010?', choices: ['8', '10', '12', '5'], correct: 1, exp: '1010₂ = 8+0+2+0 = 10.', diff: 'easy' },
      { q: 'What is the ASCII value of \'A\'?', choices: ['65', '97', '48', '32'], correct: 0, exp: 'ASCII \'A\' = 65.', diff: 'easy' },
      // More depth
      { q: 'What is the output?<pre>int arr[] = {1,2,3,4,5};\ncout &lt;&lt; arr[3];</pre>', choices: ['1', '2', '3', '4'], correct: 3, exp: 'Array indexing is 0-based: arr[0]=1, arr[3]=4.', diff: 'easy' },
      { q: 'Which is a correct function prototype?', choices: ['int myFunc();', 'void myFunc() { }', 'int myFunc() { }', 'myFunc(int x);'], correct: 0, exp: 'A prototype ends with a semicolon and has no body.', diff: 'medium' },
      { q: 'What is the output?<pre>int x = 10;\nint &amp;r = x;\nr = 20;\ncout &lt;&lt; x;</pre>', choices: ['10', '20', 'Compile error', 'Undefined'], correct: 1, exp: 'A reference is an alias; modifying r modifies x.', diff: 'medium' },
      { q: 'What is the correct way to allocate memory in C++?', choices: ['malloc', 'new', 'calloc', 'alloc'], correct: 1, exp: 'The <code>new</code> keyword allocates memory on the heap.', diff: 'medium' },
    ];

    function getRandomQuestions(count) {
      const shuffled = [...RANKED_QUESTIONS];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      return shuffled.slice(0, Math.min(count, shuffled.length));
    }

    // ============================================================
    //  BOT AI (with personality)
    // ============================================================
    function botAnswer(question, botId, questionIndex) {
      const bot = BOT_DIFFICULTIES.find(b => b.id === botId);
      if (!bot) return question.correct;
      const variance = (Math.random() - 0.5) * 0.08;
      const effectiveAccuracy = Math.min(0.99, Math.max(0.15, bot.accuracy + variance));
      if (Math.random() < effectiveAccuracy) {
        return question.correct;
      } else {
        let wrongIdx;
        do {
          wrongIdx = Math.floor(Math.random() * question.choices.length);
        } while (wrongIdx === question.correct);
        return wrongIdx;
      }
    }

    // ============================================================
    //  SHOW MODE (FIXED)
    // ============================================================
    function showMode(mode) {
      currentMode = mode;
      document.querySelectorAll('.mode-tab').forEach(t => t.classList.toggle('active', t.dataset.mode === mode));
      document.querySelectorAll('#profileMode, #playMode, #gauntletMode, #tournamentMode, #leaderboardMode, #historyMode, #achievementsMode')
        .forEach(el => el.style.display = 'none');
      document.getElementById('matchContainer').style.display = 'none';
      document.getElementById('resultsContainer').style.display = 'none';

      if (mode === 'profile') { document.getElementById('profileMode').style.display = 'block'; renderProfile(); }
      else if (mode === 'play') { document.getElementById('playMode').style.display = 'block'; renderPlay(); }
      else if (mode === 'gauntlet') { document.getElementById('gauntletMode').style.display = 'block'; renderGauntlet(); }
      else if (mode === 'tournament') { document.getElementById('tournamentMode').style.display = 'block'; renderTournament(); }
      else if (mode === 'leaderboard') { document.getElementById('leaderboardMode').style.display = 'block'; renderLeaderboard(); }
      else if (mode === 'history') { document.getElementById('historyMode').style.display = 'block'; renderHistory(); }
      else if (mode === 'achievements') { document.getElementById('achievementsMode').style.display = 'block'; renderAchievements(); }
    }

    // ============================================================
    //  PROFILE (FIXED)
    // ============================================================
    function renderProfile() {
      const container = document.getElementById('profileContainer');
      if (!container) return;
      const total = player.wins + player.losses + player.draws;
      const wr = total ? Math.round(player.wins / total * 100) : 0;
      const emoji = player.elo >= 1800 ? '👑' : player.elo >= 1500 ? '🌟' : player.elo >= 1300 ? '🔥' : player.elo >= 1100 ? '💪' : '🌱';
      const rank = player.elo >= 1800 ? 'Legend' : player.elo >= 1500 ? 'Elite' : player.elo >= 1300 ? 'Challenger' : player.elo >= 1100 ? 'Contender' : 'Rookie';

      let botStatsHtml = '';
      BOT_DIFFICULTIES.forEach(b => {
        const s = player.botStats[b.id] || { wins: 0, losses: 0, draws: 0 };
        const t = s.wins + s.losses + s.draws;
        const wr2 = t ? Math.round(s.wins / t * 100) : 0;
        botStatsHtml += `
          <div style="display:flex;align-items:center;gap:8px;padding:6px 10px;border-radius:6px;background:var(--tint);border:1px solid var(--glass-border);">
            <span style="font-size:18px;">${b.icon}</span>
            <span style="font-size:12px;font-weight:600;flex:1;">${b.name}</span>
            <span style="font-size:11px;color:var(--txt3);">${t} matches</span>
            <span style="font-size:11px;font-weight:700;color:${wr2 >= 60 ? 'var(--ok)' : 'var(--no)'};">${wr2}%</span>
          </div>
        `;
      });

      container.innerHTML = `
        <div class="profile-card">
          <div class="profile-avatar">${emoji}</div>
          <div class="profile-info">
            <h2>${player.name}</h2>
            <div class="p-elo">${player.elo} Elo</div>
            <div class="p-rank-badge">${rank}</div>
            <div class="p-stats">
              <div class="p-stat">🏆 <span class="num">${player.tournamentWins}</span> tournament wins</div>
              <div class="p-stat">✅ <span class="num">${player.wins}</span> wins</div>
              <div class="p-stat">❌ <span class="num">${player.losses}</span> losses</div>
              <div class="p-stat">🤝 <span class="num">${player.draws}</span> draws</div>
              <div class="p-stat">📊 <span class="num">${wr}%</span> win rate</div>
              <div class="p-stat">🔥 <span class="num">${player.streak}</span> streak (best: ${player.bestStreak})</div>
              <div class="p-stat">📝 <span class="num">${player.totalQuestions}</span> questions</div>
              <div class="p-stat">🎯 <span class="num">${player.totalQuestions ? Math.round(player.correctAnswers/player.totalQuestions*100) : 0}%</span> accuracy</div>
              <div class="p-stat">🏅 <span class="num">${Object.keys(player.achievements).filter(k => player.achievements[k]).length}</span> achievements</div>
            </div>
          </div>
        </div>
        <div style="margin-top:20px;">
          <h3 style="font-size:15px;font-weight:700;margin-bottom:12px;">🤖 Performance vs Bots</h3>
          <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:8px;">
            ${botStatsHtml}
          </div>
          <div style="margin-top:16px;display:flex;gap:8px;flex-wrap:wrap;">
            <button class="btn btn-sm" onclick="resetRanked()" style="border-color:var(--no);color:var(--no);">Reset Stats</button>
            <button class="btn btn-sm btn-primary" onclick="showMode('play')">⚔️ Battle Now</button>
          </div>
        </div>
      `;
      injectIcons(container);
      updateStats();
    }

    // ============================================================
    //  PLAY (FIXED)
    // ============================================================
    function renderPlay() {
      const grid = document.getElementById('playGrid');
      if (!grid) return;
      grid.innerHTML = BOT_DIFFICULTIES.map(b => {
        const s = player.botStats[b.id] || { wins: 0, losses: 0, draws: 0 };
        const t = s.wins + s.losses + s.draws;
        const wr2 = t ? Math.round(s.wins / t * 100) : 0;
        return `
          <div class="rank-card" onclick="startMatch('${b.id}', 5)">
            <div class="rank-badge ${t > 0 ? 'completed' : 'active'}">${t > 0 ? 'Played' : 'New'}</div>
            <div class="rank-icon" style="background:${b.color}22;border-color:${b.color};">${b.icon}</div>
            <h3>${b.name}</h3>
            <div class="rank-sub">${b.desc}</div>
            <div class="rank-meta">
              <span>🏆 ${b.elo} Elo</span>
              <span>${b.accuracy > 0.85 ? '🔥 Hard' : b.accuracy > 0.65 ? '⚡ Medium' : '🌱 Easy'}</span>
              ${t > 0 ? `<span>📊 ${wr2}% WR</span>` : ''}
            </div>
            ${t > 0 ? `<div class="rank-progress"><div class="rank-progress-fill" style="width:${Math.min(100, wr2)}%"></div></div>` : ''}
            <div style="margin-top:12px;">
              <button class="btn btn-primary btn-sm">⚔️ Battle (5 Qs)</button>
              <button class="btn btn-sm" onclick="event.stopPropagation();startMatch('${b.id}', 10)" style="margin-left:4px;">10 Qs</button>
            </div>
          </div>
        `;
      }).join('');

      grid.innerHTML += `
        <div class="rank-card" style="cursor:default;background:var(--tint2);border-color:var(--glass-border2);">
          <div class="rank-icon" style="background:var(--tint3);"><i class="ic" data-ic="zap"></i></div>
          <h3>Quick Match</h3>
          <div class="rank-sub">Random opponent, 3 questions</div>
          <div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap;">
            <button class="btn btn-sm" onclick="quickMatch('easy')" style="border-color:var(--ok);">Easy</button>
            <button class="btn btn-sm" onclick="quickMatch('medium')" style="border-color:var(--warn);">Medium</button>
            <button class="btn btn-sm" onclick="quickMatch('hard')" style="border-color:var(--no);">Hard</button>
            <button class="btn btn-sm" onclick="quickMatch('legend')" style="border-color:var(--accent3);">Legend</button>
          </div>
        </div>
      `;
      injectIcons(grid);
    }

    function quickMatch(diff) {
      const difficultyMap = {
        'easy': ['rookie', 'novice', 'adept'],
        'medium': ['adept', 'pro', 'expert'],
        'hard': ['expert', 'master', 'legend'],
        'legend': ['master', 'legend', 'moeai'],
      };
      const pool = difficultyMap[diff] || ['adept', 'pro', 'expert'];
      const botId = pool[Math.floor(Math.random() * pool.length)];
      startMatch(botId, 3);
    }

    // ============================================================
    //  MATCH SYSTEM
    // ============================================================
    function startMatch(botId, questionCount) {
      const bot = BOT_DIFFICULTIES.find(b => b.id === botId);
      if (!bot) { showToast('⚠️ Bot not found'); return; }

      const questions = getRandomQuestions(questionCount || 5);
      if (questions.length < 3) { showToast('⚠️ Not enough questions'); return; }

      matchState = {
        botId: botId,
        botName: bot.name,
        botElo: bot.elo,
        botIcon: bot.icon,
        questions: questions,
        total: questions.length,
        current: 0,
        playerCorrect: 0,
        botCorrect: 0,
        answered: false,
        results: [],
        startTime: Date.now(),
        isTournament: false,
        isGauntlet: false,
        questionTimers: [],
      };

      document.querySelectorAll('#profileMode, #playMode, #gauntletMode, #tournamentMode, #leaderboardMode, #historyMode, #achievementsMode')
        .forEach(el => el.style.display = 'none');
      document.getElementById('matchContainer').style.display = 'block';
      renderMatch();
    }

    function renderMatch() {
      const container = document.getElementById('matchContainer');
      const ms = matchState;
      const q = ms.questions[ms.current];
      const pct = Math.round(ms.current / ms.total * 100);

      container.innerHTML = `
        <div class="runner" style="max-width:760px;margin:0 auto;animation:card-in 0.3s ease;">
          <div style="display:flex;align-items:center;gap:14px;margin-bottom:16px;flex-wrap:wrap;">
            <span class="q-count" style="font-size:13px;color:var(--txt3);font-weight:600;">Q${ms.current+1}/${ms.total}</span>
            <div style="flex:1;height:6px;border-radius:99px;background:var(--tint2);overflow:hidden;min-width:40px;">
              <div style="height:100%;border-radius:99px;background:linear-gradient(90deg,var(--accent),var(--accent3));width:${pct}%;transition:width 0.5s ease;"></div>
            </div>
            <span style="font-size:13px;font-weight:700;font-family:'Fira Code',monospace;color:var(--txt2);">
              ${ms.playerCorrect} ✓ ${ms.botCorrect} 🤖
            </span>
            <span style="font-size:12px;color:var(--txt3);">
              vs ${ms.botIcon} ${ms.botName}
            </span>
          </div>
          <div class="lg lg-card" style="padding:28px;background:var(--bg2);border:1px solid var(--glass-border);">
            <div class="lg-effect"></div><div class="lg-tint"></div><div class="lg-shine"></div>
            <div style="font-size:11px;text-transform:uppercase;letter-spacing:.07em;color:var(--accent3);font-weight:700;margin-bottom:10px;display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
              <span>${q.diff || 'medium'}</span>
              <span style="opacity:0.5;">·</span>
              <span style="opacity:0.7;">${q.concept || 'General'}</span>
            </div>
            <div style="font-size:19px;font-weight:600;line-height:1.5;margin-bottom:22px;">${q.q}</div>
            <div class="options" id="opts" style="display:flex;flex-direction:column;gap:10px;">
              ${q.choices.map((c, i) => `
                <button class="btn" onclick="matchAnswer(${i})" data-idx="${i}" style="justify-content:flex-start;text-align:left;padding:12px 16px;border:1px solid var(--glass-border);background:var(--tint);">
                  <span style="width:26px;height:26px;border-radius:8px;background:var(--tint2);border:1px solid var(--glass-border);display:grid;place-items:center;font-size:13px;font-weight:700;flex-shrink:0;">${String.fromCharCode(65+i)}</span>
                  <span>${c}</span>
                  <span class="opt-check" style="margin-left:auto;opacity:0;transition:opacity 0.2s;"><i class="ic" data-ic="check"></i></span>
                </button>
              `).join('')}
            </div>
            <div class="feedback" id="fb" style="margin-top:16px;padding:14px 18px;border-radius:12px;display:none;font-size:14px;line-height:1.6;"></div>
            <div style="display:flex;justify-content:space-between;align-items:center;margin-top:20px;flex-wrap:wrap;gap:10px;">
              <span style="font-size:11px;color:var(--txt3);"><kbd style="background:var(--tint2);border:1px solid var(--glass-border);border-radius:4px;padding:1px 6px;font-size:10px;">1-4</kbd> select</span>
              <div id="ract"></div>
            </div>
          </div>
          <div style="text-align:center;margin-top:16px;">
            <button class="btn" onclick="cancelMatch()"><i class="ic" data-ic="x"></i> Cancel</button>
          </div>
        </div>
      `;
      injectIcons(container);
      const firstOpt = container.querySelector('#opts .btn');
      if (firstOpt && !ms.answered) setTimeout(() => firstOpt.focus(), 100);
    }

    function matchAnswer(playerIdx) {
      if (matchState.answered) return;
      matchState.answered = true;
      const q = matchState.questions[matchState.current];
      const playerCorrect = playerIdx === q.correct;

      const botIdx = botAnswer(q, matchState.botId, matchState.current);
      const botCorrect = botIdx === q.correct;

      if (playerCorrect) matchState.playerCorrect++;
      if (botCorrect) matchState.botCorrect++;

      matchState.results.push({ playerCorrect, botCorrect, playerIdx, botIdx, correct: q.correct });

      const opts = document.querySelectorAll('#opts .btn');
      opts.forEach((o, idx) => {
        o.disabled = true;
        if (idx === q.correct) {
          o.style.borderColor = 'var(--okbd)';
          o.style.background = 'var(--okbg)';
          const check = o.querySelector('.opt-check');
          if (check) { check.style.opacity = '1'; check.style.color = 'var(--ok)'; }
        } else if (idx === playerIdx && !playerCorrect) {
          o.style.borderColor = 'var(--nobd)';
          o.style.background = 'var(--nobg)';
          const check = o.querySelector('.opt-check');
          if (check) { check.style.opacity = '1'; check.style.color = 'var(--no)'; }
        } else if (idx === botIdx && botCorrect && idx !== q.correct) {
          o.style.borderColor = 'var(--warn)';
          o.style.background = 'var(--warnbg)';
        }
      });

      const fb = document.getElementById('fb');
      fb.style.display = 'block';
      fb.className = 'feedback ' + (playerCorrect ? 'right' : 'wrong');
      fb.style.border = playerCorrect ? '1px solid var(--okbd)' : '1px solid var(--nobd)';
      fb.style.background = playerCorrect ? 'var(--okbg)' : 'var(--nobg)';
      fb.innerHTML = `
        <div style="font-weight:700;margin-bottom:4px;display:flex;align-items:center;gap:6px;color:${playerCorrect ? 'var(--ok)' : 'var(--no)'};">
          <i class="ic" data-ic="${playerCorrect ? 'check' : 'x'}"></i> ${playerCorrect ? 'Correct!' : 'Not quite'}
        </div>
        <div style="color:var(--txt2);">${q.exp}</div>
        <div style="margin-top:6px;font-size:13px;color:var(--txt3);">
          ${matchState.botIcon} ${matchState.botName} ${botCorrect ? '✅ got it right' : '❌ missed it'}
        </div>
      `;
      injectIcons(fb);

      const last = matchState.current === matchState.total - 1;
      document.getElementById('ract').innerHTML = `
        <button class="btn btn-primary" onclick="matchNext()" id="nextBtn">
          ${last ? 'See results' : 'Next question'}
          <i class="ic" data-ic="arrow-right"></i>
        </button>
      `;
      injectIcons(document.getElementById('ract'));
      document.getElementById('nextBtn')?.focus();
    }

    function matchNext() {
      if (matchState.current < matchState.total - 1) {
        matchState.current++;
        matchState.answered = false;
        renderMatch();
      } else {
        finishMatch();
      }
    }

    function finishMatch() {
      const ms = matchState;
      const playerScore = ms.playerCorrect;
      const botScore = ms.botCorrect;
      const total = ms.total;

      let result;
      if (playerScore > botScore) result = 'win';
      else if (botScore > playerScore) result = 'loss';
      else result = 'draw';

      const bot = BOT_DIFFICULTIES.find(b => b.id === ms.botId);
      const botElo = bot ? bot.elo : 1200;

      let eloChange = 0;
      if (result === 'win') {
        const expected = expectedScore(player.elo, botElo);
        eloChange = Math.round(K_FACTOR * (1 - expected));
        player.elo += eloChange;
        player.wins++;
        player.streak++;
        if (player.streak > player.bestStreak) player.bestStreak = player.streak;
        if (!player.botStats[ms.botId]) player.botStats[ms.botId] = { wins: 0, losses: 0, draws: 0 };
        player.botStats[ms.botId].wins++;
        if (playerScore === total) { player.perfectGames = (player.perfectGames || 0) + 1; }
      } else if (result === 'loss') {
        const expected = expectedScore(player.elo, botElo);
        eloChange = Math.round(K_FACTOR * (expected - 0) || -16);
        player.elo = Math.max(100, player.elo - Math.abs(eloChange));
        player.losses++;
        player.streak = 0;
        if (!player.botStats[ms.botId]) player.botStats[ms.botId] = { wins: 0, losses: 0, draws: 0 };
        player.botStats[ms.botId].losses++;
      } else {
        player.draws++;
        if (!player.botStats[ms.botId]) player.botStats[ms.botId] = { wins: 0, losses: 0, draws: 0 };
        player.botStats[ms.botId].draws++;
        player.streak = 0;
      }

      player.totalQuestions += total;
      player.correctAnswers += playerScore;

      checkAchievements();

      const matchRecord = {
        opponent: ms.botName,
        opponentId: 'bot-' + ms.botId,
        opponentIcon: ms.botIcon,
        result: result,
        playerScore: playerScore,
        opponentScore: botScore,
        total: total,
        eloChange: eloChange,
        newElo: player.elo,
        date: new Date().toISOString(),
        isBot: true,
        accuracy: Math.round(playerScore / total * 100),
      };
      matchHistory.push(matchRecord);
      if (matchHistory.length > 200) matchHistory = matchHistory.slice(-200);

      const entry = ensurePlayerInLeaderboard();
      entry.elo = player.elo;
      entry.wins = player.wins;
      entry.losses = player.losses;
      entry.draws = player.draws;
      entry.matches = player.wins + player.losses + player.draws;
      entry.streak = player.streak;

      saveData();
      const matchResult = { ...matchRecord };
      matchState = null;

      document.getElementById('matchContainer').style.display = 'none';
      document.getElementById('resultsContainer').style.display = 'block';
      renderMatchResults(matchResult, playerScore, botScore, total, result, eloChange);
    }

    function renderMatchResults(record, pScore, bScore, total, result, eloChange) {
      const container = document.getElementById('resultsContainer');
      const passed = result === 'win';
      const eloColor = eloChange > 0 ? 'var(--ok)' : eloChange < 0 ? 'var(--no)' : 'var(--warn)';
      const emoji = result === 'win' ? '🎉' : result === 'loss' ? '💪' : '🤝';
      const accuracy = Math.round(pScore / total * 100);

      container.innerHTML = `
        <div class="results" style="max-width:560px;margin:40px auto;text-align:center;animation:card-in 0.5s ease;">
          <div style="font-size:64px;margin-bottom:8px;">${emoji}</div>
          <div class="result-verdict" style="font-size:28px;font-weight:800;color:${passed ? 'var(--ok)' : 'var(--no)'};">
            ${result === 'win' ? 'Victory!' : result === 'loss' ? 'Defeated' : 'Draw'}
          </div>
          <div style="color:var(--txt3);font-size:14px;margin-bottom:8px;">
            ${record.opponentIcon} ${record.opponent} · ${pScore} - ${bScore}
          </div>
          <div style="font-size:13px;color:var(--txt2);margin-bottom:16px;">
            Accuracy: <span style="font-weight:700;color:${accuracy >= 80 ? 'var(--ok)' : 'var(--warn)'};">${accuracy}%</span>
            ${accuracy === 100 ? ' 💯 Perfect!' : ''}
          </div>
          <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;max-width:400px;margin:0 auto 20px;">
            <div style="padding:12px;background:var(--tint);border-radius:8px;border:1px solid var(--glass-border);">
              <div style="font-size:20px;font-weight:800;color:var(--accent2);">${pScore}</div>
              <div style="font-size:10px;color:var(--txt3);">You</div>
            </div>
            <div style="padding:12px;background:var(--tint);border-radius:8px;border:1px solid var(--glass-border);">
              <div style="font-size:20px;font-weight:800;color:var(--txt3);">${bScore}</div>
              <div style="font-size:10px;color:var(--txt3);">${record.opponent}</div>
            </div>
            <div style="padding:12px;background:var(--tint);border-radius:8px;border:1px solid var(--glass-border);">
              <div style="font-size:20px;font-weight:800;color:${eloColor};">${eloChange > 0 ? '+' : ''}${eloChange}</div>
              <div style="font-size:10px;color:var(--txt3);">Elo</div>
            </div>
          </div>
          <div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap;">
            <button class="btn btn-primary" onclick="closeMatchResults()"><i class="ic" data-ic="redo"></i> Back</button>
            <button class="btn" onclick="rematch()"><i class="ic" data-ic="zap"></i> Rematch</button>
          </div>
          ${result === 'win' ? `<div style="margin-top:12px;padding:8px 14px;border-radius:999px;background:var(--okbg);border:1px solid var(--okbd);font-size:12px;color:var(--ok);display:inline-block;">🏅 +${Math.floor(eloChange)} Elo</div>` : ''}
        </div>
      `;
      injectIcons(container);
      updateStats();
    }

    function closeMatchResults() {
      document.getElementById('resultsContainer').style.display = 'none';
      showMode(currentMode);
      if (currentMode === 'play') renderPlay();
      else if (currentMode === 'gauntlet') renderGauntlet();
    }

    function rematch() {
      if (matchState) {
        const botId = matchState.botId;
        const count = matchState.total;
        document.getElementById('resultsContainer').style.display = 'none';
        startMatch(botId, count);
      } else {
        closeMatchResults();
      }
    }

    function cancelMatch() {
      matchState = null;
      document.getElementById('matchContainer').style.display = 'none';
      showMode(currentMode);
      if (currentMode === 'play') renderPlay();
      else if (currentMode === 'gauntlet') renderGauntlet();
      showToast('Match cancelled');
    }

    // ============================================================
    //  GAUNTLET
    // ============================================================
    function renderGauntlet() {
      const container = document.getElementById('gauntletContainer');
      if (!container) return;
      const completed = gauntletState ? gauntletState.completed : [];
      const currentIndex = gauntletState ? gauntletState.currentIndex : 0;

      let html = `
        <div style="background:var(--tint);border-radius:var(--radius-lg);border:1px solid var(--glass-border);padding:24px;margin-bottom:16px;">
          <h3 style="font-size:18px;font-weight:800;display:flex;align-items:center;gap:8px;">
            <i class="ic" data-ic="fire"></i> The Gauntlet
          </h3>
          <p style="color:var(--txt3);font-size:13px;">Fight all 8 bots in order. Win streak bonuses apply. Complete it to unlock the Gauntlet achievement.</p>
          <div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap;">
            ${gauntletState && gauntletState.inProgress ? `
              <button class="btn btn-primary" onclick="gauntletNext()">Continue Gauntlet</button>
              <button class="btn" onclick="gauntletReset()">Reset</button>
            ` : `
              <button class="btn btn-primary" onclick="startGauntlet()">Start Gauntlet</button>
            `}
          </div>
        </div>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:12px;">
          ${BOT_DIFFICULTIES.map((b, i) => {
            const done = completed.includes(b.id);
            const isCurrent = gauntletState && gauntletState.inProgress && i === currentIndex && !done;
            const color = done ? 'var(--ok)' : isCurrent ? 'var(--accent2)' : 'var(--txt3)';
            return `
              <div style="padding:14px;border-radius:var(--radius-sm);background:${done ? 'var(--okbg)' : isCurrent ? 'var(--tint3)' : 'var(--tint)'};border:1px solid ${color};text-align:center;transition:all 0.3s;">
                <div style="font-size:28px;">${b.icon}</div>
                <div style="font-size:13px;font-weight:600;margin-top:4px;">${b.name}</div>
                <div style="font-size:10px;color:var(--txt3);">${done ? '✅ Complete' : isCurrent ? '⚔️ Current' : '⏳ Pending'}</div>
                ${done ? `<div style="font-size:10px;color:var(--ok);margin-top:2px;">🏆 ${gauntletState?.scores?.[b.id] || '0'}%</div>` : ''}
              </div>
            `;
          }).join('')}
        </div>
      `;
      container.innerHTML = html;
      injectIcons(container);
    }

    function startGauntlet() {
      gauntletState = {
        inProgress: true,
        currentIndex: 0,
        completed: [],
        scores: {},
        streak: 0,
        totalBonus: 0,
      };
      gauntletNext();
    }

    function gauntletNext() {
      if (!gauntletState) return;
      const nextBot = BOT_DIFFICULTIES[gauntletState.currentIndex];
      if (!nextBot) {
        player.gauntletComplete = true;
        checkAchievements();
        saveData();
        showToast('🏆 Gauntlet complete! You\'ve defeated all 8 bots!');
        gauntletState.inProgress = false;
        renderGauntlet();
        return;
      }
      showToast(`⚔️ Gauntlet: ${nextBot.name} (${gauntletState.currentIndex + 1}/8)`);
      startMatch(nextBot.id, 5);
      // Override match finish for gauntlet progression
      const originalFinish = finishMatch;
      finishMatch = function() {
        const ms = matchState;
        const playerScore = ms.playerCorrect;
        const botScore = ms.botCorrect;
        const total = ms.total;
        const result = playerScore > botScore ? 'win' : playerScore < botScore ? 'loss' : 'draw';

        if (result === 'win') {
          gauntletState.completed.push(ms.botId);
          gauntletState.scores[ms.botId] = Math.round(playerScore / total * 100);
          gauntletState.streak++;
          gauntletState.totalBonus += gauntletState.streak * 5;
          const bonus = 5 + gauntletState.streak * 2;
          player.elo += bonus;
          showToast(`🔥 Streak ${gauntletState.streak}! +${bonus} Elo bonus`);
        } else {
          gauntletState.streak = 0;
        }

        const bot = BOT_DIFFICULTIES.find(b => b.id === ms.botId);
        const botElo = bot ? bot.elo : 1200;
        let eloChange = 0;
        if (result === 'win') {
          const expected = expectedScore(player.elo, botElo);
          eloChange = Math.round(K_FACTOR * (1 - expected));
          player.elo += eloChange - (5 + gauntletState.streak * 2);
          player.wins++;
          if (player.streak > player.bestStreak) player.bestStreak = player.streak;
        } else if (result === 'loss') {
          const expected = expectedScore(player.elo, botElo);
          eloChange = Math.round(K_FACTOR * (expected - 0) || -16);
          player.elo = Math.max(100, player.elo - Math.abs(eloChange));
          player.losses++;
        } else {
          player.draws++;
        }
        player.totalQuestions += total;
        player.correctAnswers += playerScore;

        const matchRecord = {
          opponent: ms.botName,
          opponentId: 'bot-' + ms.botId,
          opponentIcon: ms.botIcon,
          result: result,
          playerScore: playerScore,
          opponentScore: botScore,
          total: total,
          eloChange: eloChange,
          newElo: player.elo,
          date: new Date().toISOString(),
          isBot: true,
          isGauntlet: true,
          accuracy: Math.round(playerScore / total * 100),
        };
        matchHistory.push(matchRecord);
        if (matchHistory.length > 200) matchHistory = matchHistory.slice(-200);

        const entry = ensurePlayerInLeaderboard();
        entry.elo = player.elo;
        entry.wins = player.wins;
        entry.losses = player.losses;
        entry.draws = player.draws;
        entry.matches = player.wins + player.losses + player.draws;
        entry.streak = player.streak;

        saveData();
        checkAchievements();
        matchState = null;

        gauntletState.currentIndex++;

        document.getElementById('matchContainer').style.display = 'none';
        document.getElementById('resultsContainer').style.display = 'block';
        renderMatchResults(matchRecord, playerScore, botScore, total, result, eloChange);

        const originalClose = closeMatchResults;
        closeMatchResults = function() {
          document.getElementById('resultsContainer').style.display = 'none';
          if (gauntletState && gauntletState.inProgress) {
            gauntletNext();
          } else {
            showMode('gauntlet');
            renderGauntlet();
          }
          closeMatchResults = originalClose;
        };
      };
    }

    function gauntletReset() {
      gauntletState = null;
      renderGauntlet();
    }

    // ============================================================
    //  TOURNAMENT (32 & 64 Player Brackets)
    // ============================================================
    function renderTournament() {
      const container = document.getElementById('tournamentContainer');
      if (!container) return;

      if (currentTournament) {
        renderTournamentBracket(container);
        return;
      }

      container.innerHTML = `
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:16px;max-width:900px;margin:0 auto;">
          <div class="rank-card" onclick="startTournament(4)">
            <div class="rank-icon">🏆</div>
            <h3>4-Player</h3>
            <div class="rank-sub">Semi-finals + Final</div>
            <div class="rank-meta"><span>⚡ Quick</span></div>
            <button class="btn btn-primary btn-sm" style="margin-top:12px;">Start</button>
          </div>
          <div class="rank-card" onclick="startTournament(8)">
            <div class="rank-icon">🏆</div>
            <h3>8-Player</h3>
            <div class="rank-sub">Quarter-finals + Semi-finals + Final</div>
            <div class="rank-meta"><span>🔥 Full</span></div>
            <button class="btn btn-primary btn-sm" style="margin-top:12px;">Start</button>
          </div>
          <div class="rank-card" onclick="startTournament(16)">
            <div class="rank-icon">🏆</div>
            <h3>16-Player</h3>
            <div class="rank-sub">Ultimate bracket</div>
            <div class="rank-meta"><span>👑 Epic</span></div>
            <button class="btn btn-primary btn-sm" style="margin-top:12px;">Start</button>
          </div>
          <div class="rank-card" onclick="startTournament(32)">
            <div class="rank-icon">🏆</div>
            <h3>32-Player</h3>
            <div class="rank-sub">Massive tournament</div>
            <div class="rank-meta"><span>🔥 Mega</span></div>
            <button class="btn btn-primary btn-sm" style="margin-top:12px;">Start</button>
          </div>
          <div class="rank-card" onclick="startTournament(64)">
            <div class="rank-icon">🏆</div>
            <h3>64-Player</h3>
            <div class="rank-sub">The Ultimate Challenge</div>
            <div class="rank-meta"><span>👑 Legendary</span></div>
            <button class="btn btn-primary btn-sm" style="margin-top:12px;">Start</button>
          </div>
        </div>
        <div style="margin-top:20px;text-align:center;color:var(--txt3);font-size:13px;">
          ${tournaments.length} tournaments played · ${player.tournamentWins} wins
        </div>
        ${tournaments.length ? `
          <div style="margin-top:16px;">
            <h3 style="font-size:14px;font-weight:700;margin-bottom:8px;">Past Tournaments</h3>
            ${tournaments.slice(-5).reverse().map(t => `
              <div class="match-item">
                <span>🏆 ${t.size}-player bracket</span>
                <span class="m-result ${t.winner === 'You' ? 'win' : 'loss'}">${t.winner || '—'}</span>
                <span class="m-date">${new Date(t.date).toLocaleDateString()}</span>
              </div>
            `).join('')}
          </div>
        ` : ''}
      `;
      injectIcons(container);
    }

    function startTournament(size) {
      if (currentTournament) { showToast('⚠️ Tournament already in progress'); return; }

      const players = [
        { id: 'me', name: 'You', elo: player.elo, isBot: false },
      ];

      const botPool = BOT_DIFFICULTIES.map(b => ({
        id: 'bot-' + b.id,
        name: b.name,
        elo: b.elo,
        isBot: true,
        botId: b.id,
        icon: b.icon,
      }));

      const shuffledBots = [...botPool];
      for (let i = shuffledBots.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffledBots[i], shuffledBots[j]] = [shuffledBots[j], shuffledBots[i]];
      }
      const selected = shuffledBots.slice(0, size - 1);

      while (selected.length < size - 1) {
        const fallback = { id: 'bot-fallback-' + selected.length, name: `Bot ${selected.length+1}`, elo: 1200, isBot: true, icon: '🤖' };
        selected.push(fallback);
      }

      const allPlayers = [players[0], ...selected];
      const shuffled = [...allPlayers];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }

      const bracket = [];
      for (let i = 0; i < shuffled.length; i += 2) {
        bracket.push({
          p1: shuffled[i],
          p2: shuffled[i + 1] || null,
          winner: null,
          matchId: bracket.length,
        });
      }

      currentTournament = {
        size: size,
        players: shuffled,
        bracket: bracket,
        round: 0,
        winner: null,
        inProgress: true,
        matchIndex: 0,
        currentMatch: null,
        results: [],
      };

      renderTournament();
      showToast(`🏆 ${size}-player tournament started!`);
      setTimeout(() => playTournamentMatch(), 500);
    }

    function playTournamentMatch() {
      if (!currentTournament) return;
      const bracket = currentTournament.bracket;
      for (let i = 0; i < bracket.length; i++) {
        const m = bracket[i];
        if (m.winner === null && m.p1 && m.p2) {
          currentTournament.currentMatch = m;
          currentTournament.matchIndex = i;
          if (m.p1.id === 'me' || m.p2.id === 'me') {
            const opponent = m.p1.id === 'me' ? m.p2 : m.p1;
            showToast(`⚔️ Match vs ${opponent.icon} ${opponent.name}!`);
            const botId = opponent.id.replace('bot-', '');
            const bot = BOT_DIFFICULTIES.find(b => b.id === botId) || BOT_DIFFICULTIES[1];
            matchState = {
              botId: bot.id,
              botName: opponent.name,
              botElo: bot.elo,
              botIcon: opponent.icon || '🤖',
              questions: getRandomQuestions(3),
              total: 3,
              current: 0,
              playerCorrect: 0,
              botCorrect: 0,
              answered: false,
              results: [],
              startTime: Date.now(),
              isTournament: true,
              tournamentMatch: m,
            };
            document.querySelectorAll('#profileMode, #playMode, #gauntletMode, #tournamentMode, #leaderboardMode, #historyMode, #achievementsMode')
              .forEach(el => el.style.display = 'none');
            document.getElementById('matchContainer').style.display = 'block';
            renderMatch();
            return;
          } else {
            const winner = autoSimulateMatch(m.p1, m.p2);
            m.winner = winner;
            m.result = `${winner.icon || ''} ${winner.name} wins`;
            currentTournament.results.push({ match: i, winner: winner });
            setTimeout(() => advanceTournament(), 300);
          }
          return;
        }
      }
      finishTournament();
    }

    function autoSimulateMatch(p1, p2) {
      const acc1 = p1.isBot ? 0.6 + Math.random() * 0.3 : 0.75;
      const acc2 = p2.isBot ? 0.6 + Math.random() * 0.3 : 0.75;
      const score1 = Math.floor(Math.random() * 3) + (acc1 > acc2 ? 1 : 0);
      const score2 = Math.floor(Math.random() * 3) + (acc2 > acc1 ? 1 : 0);
      return score1 >= score2 ? p1 : p2;
    }

    function advanceTournament() {
      if (!currentTournament) return;
      const bracket = currentTournament.bracket;
      const allDone = bracket.every(m => m.winner !== null);
      if (allDone) {
        const winners = bracket.map(m => m.winner).filter(w => w);
        if (winners.length <= 1) {
          finishTournament();
          return;
        }
        const nextRound = [];
        for (let i = 0; i < winners.length; i += 2) {
          nextRound.push({
            p1: winners[i],
            p2: winners[i + 1] || null,
            winner: null,
            matchId: bracket.length + nextRound.length,
          });
        }
        if (winners.length % 2 === 1 && winners.length > 1) {
          nextRound[nextRound.length - 1].p2 = null;
          nextRound[nextRound.length - 1].winner = winners[winners.length - 1];
        }
        currentTournament.bracket = nextRound;
        currentTournament.round++;
        showToast(`🏆 Round ${currentTournament.round + 1} starting!`);
        setTimeout(() => playTournamentMatch(), 300);
      } else {
        setTimeout(() => playTournamentMatch(), 200);
      }
    }

    function finishTournament() {
      if (!currentTournament) return;
      const winner = currentTournament.bracket[0]?.winner || currentTournament.players[0];
      currentTournament.winner = winner;
      currentTournament.inProgress = false;

      const isWinner = winner.id === 'me';
      if (isWinner) {
        player.tournamentWins++;
        const bonus = Math.round(15 + Math.random() * 10);
        player.elo += bonus;
        showToast(`🏆 You won the tournament! +${bonus} Elo bonus!`);
        checkAchievements();
        saveData();
      }

      tournaments.push({
        size: currentTournament.size,
        winner: winner.name,
        date: new Date().toISOString(),
        players: currentTournament.players.map(p => p.name),
      });
      saveData();

      const finalWinner = winner;
      const tourn = currentTournament;
      currentTournament = null;

      document.getElementById('matchContainer').style.display = 'none';
      document.getElementById('resultsContainer').style.display = 'block';
      document.getElementById('resultsContainer').innerHTML = `
        <div class="results" style="max-width:560px;margin:40px auto;text-align:center;animation:card-in 0.5s ease;">
          <div style="font-size:64px;margin-bottom:12px;">🏆</div>
          <div class="result-verdict pass" style="font-size:28px;font-weight:800;color:${isWinner ? 'var(--ok)' : 'var(--txt3)'};">
            ${isWinner ? 'Tournament Champion!' : `${finalWinner.name} wins!`}
          </div>
          <div class="result-sub" style="color:var(--txt3);font-size:14px;margin-bottom:20px;">
            ${tourn.size}-player bracket · ${isWinner ? '🏅 You are the champion!' : 'Better luck next time!'}
          </div>
          <div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap;">
            <button class="btn btn-primary" onclick="closeTournamentResults()"><i class="ic" data-ic="redo"></i> Back</button>
            <button class="btn" onclick="startTournament(4)"><i class="ic" data-ic="trophy"></i> New Tournament</button>
          </div>
        </div>
      `;
      injectIcons(document.getElementById('resultsContainer'));
      updateStats();
    }

    function closeTournamentResults() {
      document.getElementById('resultsContainer').style.display = 'none';
      showMode('tournament');
      renderTournament();
    }

    function closeTournamentModal() {
      document.getElementById('tournamentModal').classList.remove('open');
    }

    function renderTournamentBracket(container) {
      const t = currentTournament;
      if (!t) { renderTournament(); return; }

      const bracketHtml = t.bracket.map((m, idx) => `
        <div class="bracket-match">
          <div class="bm-players">
            ${m.p1 ? (m.p1.icon || '') + ' ' + m.p1.name : '—'} vs ${m.p2 ? (m.p2.icon || '') + ' ' + m.p2.name : '—'}
          </div>
          <div class="bm-result">
            ${m.winner ? `🏆 ${m.winner.icon || ''} ${m.winner.name}` : m.p2 === null ? '⬅️ Bye' : '⏳ Pending'}
          </div>
        </div>
      `).join('');

      container.innerHTML = `
        <div class="tournament-bracket">
          <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;">
            <h3 style="font-size:18px;font-weight:700;">🏆 ${t.size}-Player Tournament</h3>
            <span style="font-size:13px;color:var(--txt3);">Round ${t.round + 1}</span>
          </div>
          <div class="bracket-round">
            ${bracketHtml}
          </div>
          <div style="text-align:center;font-size:13px;color:var(--txt3);">
            ${t.winner ? `Winner: ${t.winner.icon || ''} ${t.winner.name}` : 'In progress...'}
          </div>
        </div>
      `;
      injectIcons(container);
    }

    // ============================================================
    //  LEADERBOARD
    // ============================================================
    function setLeaderboardPeriod(period, el) {
      lbPeriod = period;
      document.querySelectorAll('.lb-filter').forEach(f => f.classList.remove('active'));
      if (el) el.classList.add('active');
      renderLeaderboard();
    }

    function renderLeaderboard() {
      const container = document.getElementById('leaderboardContainer');
      if (!container) return;
      const sorted = [...leaderboardData].sort((a, b) => b.elo - a.elo);
      const top = sorted.slice(0, 30);

      let filtered = top;
      if (lbPeriod === 'weekly') filtered = sorted.slice(0, 15);
      else if (lbPeriod === 'monthly') filtered = sorted.slice(0, 20);
      else if (lbPeriod === 'season') filtered = sorted.slice(0, 25);

      container.innerHTML = `
        <div class="lb-header">
          <span>Rank</span>
          <span>Player</span>
          <span>Elo</span>
          <span>W/L/D</span>
          <span>Streak</span>
        </div>
        ${filtered.map((p, i) => {
          const rank = i + 1;
          const rankClass = rank === 1 ? 'gold' : rank === 2 ? 'silver' : rank === 3 ? 'bronze' : '';
          const isPlayer = p.id === 'me';
          return `
            <div class="lb-row" style="${isPlayer ? 'background:var(--tint3);border-color:var(--accent2);' : ''}">
              <span class="lb-rank ${rankClass}">#${rank}</span>
              <span class="lb-name">
                ${p.isBot ? '🤖 ' : ''}${p.name}
                ${isPlayer ? '<span class="lb-badge">You</span>' : ''}
                ${p.isBot ? '<span class="lb-badge bot">Bot</span>' : ''}
              </span>
              <span class="lb-elo">${p.elo}</span>
              <span class="lb-stats">${p.wins || 0}/${p.losses || 0}/${p.draws || 0}</span>
              <span class="lb-streak">${p.streak || 0}🔥</span>
            </div>
          `;
        }).join('')}
        ${filtered.length === 0 ? '<div class="empty-state"><i class="ic" data-ic="list"></i>No players yet</div>' : ''}
      `;
      injectIcons(container);
    }

    // ============================================================
    //  HISTORY
    // ============================================================
    function renderHistory() {
      const container = document.getElementById('historyContainer');
      if (!container) return;
      if (!matchHistory.length) {
        container.innerHTML = `<div class="empty-state"><i class="ic" data-ic="clock"></i>No matches yet. Play your first ranked game!</div>`;
        return;
      }
      container.innerHTML = `<h3 style="font-size:16px;font-weight:700;margin-bottom:12px;">Match History (${matchHistory.length})</h3>` +
        matchHistory.slice().reverse().map(m => `
          <div class="match-item">
            <span style="font-weight:600;">${m.opponentIcon || '🤖'} ${m.opponent}</span>
            <span class="m-result ${m.result}">${m.result === 'win' ? '✅' : m.result === 'loss' ? '❌' : '🤝'} ${m.playerScore}-${m.opponentScore}</span>
            <span class="m-elo">${m.eloChange > 0 ? '+' : ''}${m.eloChange || 0} → ${m.newElo}</span>
            ${m.accuracy ? `<span style="font-size:11px;color:var(--txt3);">${m.accuracy}%</span>` : ''}
            <span class="m-date">${new Date(m.date).toLocaleDateString()}</span>
            ${m.isGauntlet ? '<span style="font-size:10px;color:var(--accent3);">⚔️ Gauntlet</span>' : ''}
          </div>
        `).join('');
      injectIcons(container);
    }

    // ============================================================
    //  ACHIEVEMENTS
    // ============================================================
    function checkAchievements() {
      let anyNew = false;
      ACHIEVEMENTS.forEach(a => {
        if (!player.achievements[a.id] && a.condition(player)) {
          player.achievements[a.id] = true;
          anyNew = true;
          showToast(`🏅 Achievement unlocked: ${a.icon} ${a.name}`);
        }
      });
      if (anyNew) saveData();
      updateAchievementBadge();
    }

    function updateAchievementBadge() {
      const count = ACHIEVEMENTS.filter(a => player.achievements[a.id]).length;
      const badge = document.getElementById('achBadge');
      if (badge) badge.textContent = count;
      const stat = document.getElementById('statAchievements');
      if (stat) stat.textContent = count;
    }

    function renderAchievements() {
      const container = document.getElementById('achievementsContainer');
      if (!container) return;
      const unlocked = ACHIEVEMENTS.filter(a => player.achievements[a.id]);
      const locked = ACHIEVEMENTS.filter(a => !player.achievements[a.id]);

      container.innerHTML = `
        <div style="display:flex;gap:16px;flex-wrap:wrap;margin-bottom:20px;">
          <div class="stat-pill">🏅 <span class="num">${unlocked.length}</span> / ${ACHIEVEMENTS.length} unlocked</div>
          <div class="stat-pill">📊 <span class="num">${Math.round(unlocked.length/ACHIEVEMENTS.length*100)}%</span> completion</div>
        </div>
        <h3 style="font-size:15px;font-weight:700;margin-bottom:12px;">Unlocked</h3>
        <div class="achievement-grid">
          ${unlocked.map(a => `
            <div class="achievement-item unlocked">
              <span class="ach-icon">${a.icon}</span>
              <div class="ach-name">${a.name}</div>
              <div class="ach-desc">${a.desc}</div>
              <div style="margin-top:4px;font-size:10px;color:var(--ok);">✅ Unlocked</div>
            </div>
          `).join('')}
          ${unlocked.length === 0 ? '<div style="color:var(--txt3);padding:20px;">Keep playing to unlock achievements!</div>' : ''}
        </div>
        <h3 style="font-size:15px;font-weight:700;margin:24px 0 12px;">Locked</h3>
        <div class="achievement-grid">
          ${locked.map(a => `
            <div class="achievement-item locked">
              <span class="ach-icon">🔒</span>
              <div class="ach-name">${a.name}</div>
              <div class="ach-desc">${a.desc}</div>
              <div style="font-size:10px;color:var(--txt3);margin-top:4px;">🔒 Locked</div>
            </div>
          `).join('')}
        </div>
      `;
      injectIcons(container);
      updateAchievementBadge();
    }

    // ============================================================
    //  STATS UPDATE
    // ============================================================
    function updateStats() {
      const total = player.wins + player.losses + player.draws;
      const wr = total ? Math.round(player.wins / total * 100) : 0;
      const eloEl = document.getElementById('statElo');
      const winsEl = document.getElementById('statWins');
      const wrEl = document.getElementById('statWR');
      const matchesEl = document.getElementById('statMatches');
      const streakEl = document.getElementById('statStreak');
      if (eloEl) eloEl.textContent = player.elo;
      if (winsEl) winsEl.textContent = player.wins;
      if (wrEl) wrEl.textContent = wr + '%';
      if (matchesEl) matchesEl.textContent = total;
      if (streakEl) streakEl.textContent = player.streak;
      updateAchievementBadge();
    }

    // ============================================================
    //  RESET
    // ============================================================
    function resetRanked() {
      if (!confirm('Reset all ranked stats? This cannot be undone.')) return;
      player.elo = INITIAL_ELO;
      player.wins = 0;
      player.losses = 0;
      player.draws = 0;
      player.streak = 0;
      player.bestStreak = 0;
      player.tournamentWins = 0;
      player.totalQuestions = 0;
      player.correctAnswers = 0;
      player.botStats = {};
      player.achievements = {};
      matchHistory = [];
      const entry = ensurePlayerInLeaderboard();
      entry.elo = player.elo;
      entry.wins = 0;
      entry.losses = 0;
      entry.draws = 0;
      entry.matches = 0;
      entry.streak = 0;
      saveData();
      renderProfile();
      updateStats();
      showToast('🗑️ Stats reset');
    }

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
      injectIcons();
      showMode('profile');
      updateStats();
      checkAchievements();
      console.log('🏆 EDUMOE Ultimate Ranked loaded.');
    });

    // Expose functions globally
    window.setTheme = setTheme;
    window.setCustomTheme = setCustomTheme;
    window.toggleCRT = toggleCRT;
    window.showMode = showMode;
    window.startMatch = startMatch;
    window.startGauntlet = startGauntlet;
    window.gauntletNext = gauntletNext;
    window.gauntletReset = gauntletReset;
    window.startTournament = startTournament;
    window.setLeaderboardPeriod = setLeaderboardPeriod;
    window.resetRanked = resetRanked;
    window.quickMatch = quickMatch;
    window.matchAnswer = matchAnswer;
    window.matchNext = matchNext;
    window.cancelMatch = cancelMatch;
    window.closeMatchResults = closeMatchResults;
    window.rematch = rematch;
    window.closeTournamentResults = closeTournamentResults;
    window.closeTournamentModal = closeTournamentModal;
    window.showToast = showToast;
