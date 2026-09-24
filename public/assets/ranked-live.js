/**
 * Live Ranked: real students, in real time, over the Realtime websocket.
 *
 * The rest of the Ranked page plays bots on this device. This adds the live
 * layer on top of it:
 *   - a lobby (Realtime presence): who is online right now, their rating and
 *     whether they are looking for a match;
 *   - matchmaking: two students searching are paired automatically, or one
 *     challenges another directly;
 *   - the match itself (Realtime broadcast): both see the same questions, in
 *     the same order, and each other's answers land the moment they happen;
 *   - a leaderboard that updates live (Postgres changes on ranked_profiles),
 *     so a win anywhere moves the table everywhere.
 *
 * Ratings are saved through /api/ranked, which clamps what one match can
 * change; the websocket only carries the game, never the score of record.
 */
(function () {
  'use strict';

  var QUESTIONS_PER_MATCH = 5;
  var QUESTION_SECONDS = 15;
  var START_DELAY_MS = 4500;
  var SDK = '/vendor/supabase-2.116.0.js';

  var cfg = null;          // /api/realtime
  var client = null;       // supabase-js
  var lobby = null;        // presence + invites
  var board = null;        // postgres changes
  var me = null;           // presence payload
  var online = [];         // presence list
  var match = null;        // current match state
  var pendingChallenge = null;
  var incoming = null;
  var boardRows = [];
  var flashId = null;
  var status = 'connecting';
  var root = null;

  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var uid = function () { return Math.random().toString(36).slice(2, 10) + Date.now().toString(36); };
  function rng(seed) { return function () { seed |= 0; seed = seed + 0x6D2B79F5 | 0; var t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function bank() { try { return RANKED_QUESTIONS; } catch (e) { return []; } } // eslint-disable-line no-undef
  function toast(text) { try { showToast(text); } catch (e) { /* the page's toast is optional */ } } // eslint-disable-line no-undef

  // ── Page wiring ─────────────────────────────────────────────────────────
  function mount() {
    var tabs = document.getElementById('modeTabs');
    if (!tabs || document.getElementById('liveMode')) return false;
    var tab = document.createElement('button');
    tab.className = 'mode-tab';
    tab.dataset.mode = 'live';
    tab.innerHTML = '<span class="live-dot"></span> Live 1v1';
    tab.onclick = function () { window.showMode('live'); };
    tabs.insertBefore(tab, tabs.children[1] || null);

    root = document.createElement('div');
    root.id = 'liveMode';
    root.style.display = 'none';
    tabs.parentNode.insertBefore(root, document.getElementById('profileMode'));

    var style = document.createElement('style');
    style.textContent = [
      '.live-dot{display:inline-block;width:8px;height:8px;border-radius:50%;background:#ef4444;box-shadow:0 0 0 0 rgba(239,68,68,.6);animation:livePulse 1.6s infinite;margin-inline-end:4px;vertical-align:middle}',
      '.live-dot.off{background:#71717a;animation:none}',
      '@keyframes livePulse{0%{box-shadow:0 0 0 0 rgba(239,68,68,.55)}70%{box-shadow:0 0 0 8px rgba(239,68,68,0)}100%{box-shadow:0 0 0 0 rgba(239,68,68,0)}}',
      '.live-grid{display:grid;grid-template-columns:minmax(0,1.1fr) minmax(0,1fr);gap:16px}',
      '@media (max-width:860px){.live-grid{grid-template-columns:minmax(0,1fr)}}',
      '.live-card{border:1px solid var(--glass-border);background:var(--tint);border-radius:16px;padding:18px;min-width:0}',
      '.live-card h3{font-size:15px;font-weight:800;margin:0 0 10px;display:flex;align-items:center;gap:8px}',
      '.live-muted{color:var(--txt3);font-size:13px}',
      '.live-row{display:flex;align-items:center;gap:10px;padding:9px 10px;border-radius:10px;border:1px solid transparent}',
      '.live-row+.live-row{margin-top:4px}',
      '.live-row.me{background:var(--tint2);border-color:var(--glass-border2)}',
      '.live-row.flash{animation:liveFlash 1.6s ease}',
      '@keyframes liveFlash{0%{background:var(--tint3);border-color:var(--accent2)}100%{background:transparent;border-color:transparent}}',
      '.live-name{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:600;font-size:14px}',
      '.live-pill{font-size:11px;font-weight:700;padding:3px 8px;border-radius:999px;background:var(--tint2);color:var(--txt2);white-space:nowrap}',
      '.live-pill.search{background:rgba(250,204,21,.14);color:#fde047}.live-pill.play{background:rgba(239,68,68,.16);color:#fca5a5}',
      '.live-elo{font-variant-numeric:tabular-nums;font-weight:800;color:var(--accent3)}',
      '.live-banner{display:flex;flex-wrap:wrap;align-items:center;gap:10px;padding:12px 14px;border-radius:12px;background:var(--tint2);border:1px solid var(--accent2);margin-bottom:14px}',
      '.live-vs{display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:12px;text-align:center;margin-bottom:14px}',
      '.live-vs .who{font-weight:800;font-size:15px;overflow:hidden;text-overflow:ellipsis}.live-vs .score{font-size:28px;font-weight:900;font-variant-numeric:tabular-nums}',
      '.live-q{font-size:16px;font-weight:700;line-height:1.5;margin:10px 0 14px}.live-q pre{white-space:pre-wrap;background:var(--bg3);padding:10px;border-radius:10px;font-size:13px}',
      '.live-opts{display:grid;gap:8px}.live-opt{text-align:start;padding:12px 14px;border-radius:12px;border:1px solid var(--glass-border);background:var(--bg2);color:var(--txt1);font:inherit;font-size:14px;cursor:pointer}',
      '.live-opt:hover:not(:disabled){border-color:var(--accent2)}.live-opt.pick{border-color:var(--accent2);background:var(--tint3)}',
      '.live-opt.right{border-color:#22c55e;background:rgba(34,197,94,.14)}.live-opt.wrong{border-color:#ef4444;background:rgba(239,68,68,.14)}',
      '.live-timer{height:5px;border-radius:5px;background:var(--tint2);overflow:hidden}.live-timer i{display:block;height:100%;background:linear-gradient(90deg,var(--accent),var(--accent2));transition:width .25s linear}',
      '.live-opp{display:flex;justify-content:space-between;font-size:12px;color:var(--txt3);margin-top:10px}',
      '.live-big{font-size:44px;font-weight:900;text-align:center;margin:8px 0}',
    ].join('\n');
    document.head.appendChild(style);

    var original = window.showMode;
    window.showMode = function (mode) {
      if (mode !== 'live') { root.style.display = 'none'; return original(mode); }
      document.querySelectorAll('.mode-tab').forEach(function (t) { t.classList.toggle('active', t.dataset.mode === 'live'); });
      document.querySelectorAll('#profileMode, #playMode, #gauntletMode, #tournamentMode, #leaderboardMode, #historyMode, #achievementsMode, #matchContainer, #resultsContainer')
        .forEach(function (el) { el.style.display = 'none'; });
      root.style.display = 'block';
      render();
    };
    return true;
  }

  function setStatus(next) {
    status = next;
    var dot = document.querySelector('.mode-tab[data-mode="live"] .live-dot');
    if (dot) dot.classList.toggle('off', next !== 'live');
    render();
  }

  // ── Connection ─────────────────────────────────────────────────────────
  function loadSdk() {
    return new Promise(function (resolve, reject) {
      if (window.supabase && window.supabase.createClient) return resolve();
      var s = document.createElement('script');
      s.src = SDK; s.onload = resolve; s.onerror = function () { reject(new Error('sdk')); };
      document.head.appendChild(s);
    });
  }

  function fetchConfig() {
    return fetch('/api/realtime', { credentials: 'same-origin', cache: 'no-store' }).then(function (r) { return r.json(); });
  }

  function connect() {
    fetchConfig().then(function (data) {
      cfg = data;
      if (!data || !data.signedIn) { setStatus('guest'); return; }
      return loadSdk().then(function () {
        client = window.supabase.createClient(cfg.url, cfg.anonKey, {
          auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
          global: { headers: { Authorization: 'Bearer ' + cfg.token } },
          realtime: { params: { eventsPerSecond: 20 } },
        });
        client.realtime.setAuth(cfg.token);
        me = { id: cfg.user.id, name: cfg.user.name, elo: (cfg.profile && cfg.profile.rating) || 1000, status: 'idle', since: Date.now() };
        joinLobby();
        watchBoard();
        loadBoard();
        // Access tokens last an hour; hand the socket a fresh one well before.
        setInterval(function () {
          fetchConfig().then(function (d) { if (d && d.signedIn) { cfg.token = d.token; client.realtime.setAuth(d.token); } }).catch(function () {});
        }, 40 * 60 * 1000);
      });
    }).catch(function () { setStatus('offline'); });
  }

  function joinLobby() {
    lobby = client.channel('ranked-lobby', { config: { presence: { key: me.id }, broadcast: { self: false } } });
    lobby
      .on('presence', { event: 'sync' }, function () {
        var state = lobby.presenceState();
        online = Object.keys(state).map(function (k) { return state[k][state[k].length - 1]; }).filter(Boolean);
        render();
        tryPair();
      })
      .on('broadcast', { event: 'invite' }, function (msg) { onInvite(msg.payload); })
      .on('broadcast', { event: 'challenge' }, function (msg) { onChallenge(msg.payload); })
      .on('broadcast', { event: 'decline' }, function (msg) {
        var p = msg.payload;
        if (pendingChallenge && p.to === me.id && p.id === pendingChallenge.id) { pendingChallenge = null; toast('Challenge declined'); render(); }
      })
      .subscribe(function (s) {
        if (s === 'SUBSCRIBED') { setStatus('live'); lobby.track(me); }
        else if (s === 'CHANNEL_ERROR' || s === 'TIMED_OUT' || s === 'CLOSED') setStatus('offline');
      });
  }

  function track(patch) {
    for (var k in patch) me[k] = patch[k];
    if (lobby) lobby.track(me);
    render();
  }

  // ── Matchmaking ────────────────────────────────────────────────────────
  function tryPair() {
    if (!me || me.status !== 'searching' || match) return;
    var searching = online.filter(function (p) { return p.status === 'searching'; })
      .sort(function (a, b) { return a.since - b.since || (a.id < b.id ? -1 : 1); });
    var i = searching.findIndex(function (p) { return p.id === me.id; });
    // Pairs are (0,1), (2,3), …; the earlier searcher of each pair hosts.
    if (i < 0 || i % 2 === 1 || !searching[i + 1]) return;
    invite(searching[i + 1]);
  }

  function invite(opponent) {
    var payload = {
      matchId: uid(), seed: Math.floor(Math.random() * 2147483647), count: QUESTIONS_PER_MATCH,
      host: { id: me.id, name: me.name, elo: me.elo }, guest: { id: opponent.id, name: opponent.name, elo: opponent.elo },
    };
    lobby.send({ type: 'broadcast', event: 'invite', payload: payload });
    startMatch(payload, true);
  }

  function onInvite(p) {
    if (!p || !p.guest || p.guest.id !== me.id || match) return;
    var wanted = me.status === 'searching' || (pendingChallenge && pendingChallenge.to === p.host.id);
    if (!wanted) return;
    pendingChallenge = null;
    startMatch(p, false);
  }

  function challenge(id) {
    var target = online.find(function (p) { return p.id === id; });
    if (!target || match) return;
    pendingChallenge = { id: uid(), to: target.id, name: target.name };
    lobby.send({ type: 'broadcast', event: 'challenge', payload: { id: pendingChallenge.id, from: { id: me.id, name: me.name, elo: me.elo }, to: target.id } });
    toast('⚔️ Challenge sent to ' + target.name);
    render();
  }

  function onChallenge(p) {
    if (!p || p.to !== me.id || match) return;
    incoming = p;
    toast('⚔️ ' + p.from.name + ' challenged you!');
    render();
  }

  function answerChallenge(accept) {
    var p = incoming; incoming = null;
    if (!p) return render();
    if (!accept) { lobby.send({ type: 'broadcast', event: 'decline', payload: { id: p.id, to: p.from.id } }); return render(); }
    var opponent = online.find(function (x) { return x.id === p.from.id; }) || p.from;
    invite(opponent);
  }

  // ── The match ──────────────────────────────────────────────────────────
  function startMatch(p, host) {
    var questions = bank();
    if (!questions.length) { toast('No questions available'); return; }
    var random = rng(p.seed), order = questions.map(function (_, i) { return i; });
    for (var i = order.length - 1; i > 0; i--) { var j = Math.floor(random() * (i + 1)); var t = order[i]; order[i] = order[j]; order[j] = t; }
    var opp = host ? p.guest : p.host;
    match = {
      id: p.matchId, host: host, opp: opp, qs: order.slice(0, p.count).map(function (i) { return questions[i]; }),
      index: -1, phase: 'waiting', mine: {}, theirs: {}, startedAt: 0, joined: false, oppHere: false, oppLeftAt: 0,
      startTimer: null, tick: null,
    };
    incoming = null; pendingChallenge = null;
    track({ status: 'playing' });

    var ch = client.channel('ranked-match-' + p.matchId, { config: { presence: { key: me.id }, broadcast: { self: false } } });
    match.channel = ch;
    ch.on('presence', { event: 'sync' }, function () {
      if (!match || match.channel !== ch) return;
      var here = Object.keys(ch.presenceState()).indexOf(opp.id) >= 0;
      if (here && !match.oppHere && match.phase === 'waiting') beginCountdown();
      if (!here && match.oppHere && match.phase !== 'done') match.oppLeftAt = Date.now();
      if (here) match.oppLeftAt = 0;
      match.oppHere = here;
      render();
    })
      .on('broadcast', { event: 'answer' }, function (msg) {
        if (!match || match.channel !== ch) return;
        var a = msg.payload; match.theirs[a.i] = a;
        if (match.phase === 'question' && a.i === match.index && match.mine[a.i]) reveal();
        render();
      })
      .subscribe(function (s) { if (s === 'SUBSCRIBED') { match.joined = true; ch.track({ id: me.id, name: me.name }); } });

    // The other student never showed up: back to the lobby.
    setTimeout(function () {
      if (match && match.id === p.matchId && match.phase === 'waiting') { toast('Opponent did not join. Searching again…'); leaveMatch(true); }
    }, 12000);
    render();
  }

  function beginCountdown() {
    match.phase = 'countdown';
    match.countdownEnds = Date.now() + START_DELAY_MS;
    clearInterval(match.tick);
    match.tick = setInterval(loop, 200);
  }

  function loop() {
    if (!match) return;
    var now = Date.now(), before = match.phase + ':' + match.index;
    if (match.phase === 'countdown' && now >= match.countdownEnds) nextQuestion();
    else if (match.phase === 'question' && now >= match.deadline) reveal();
    else if (match.phase === 'reveal' && now >= match.revealEnds) nextQuestion();
    // Left mid-match for more than ten seconds: that is a forfeit.
    if (match && match.oppLeftAt && now - match.oppLeftAt > 10000 && match.phase !== 'done') { toast(match.opp.name + ' left the match'); finish(true); return; }
    // Rebuilding the page every tick would swallow clicks mid-press; only the clock moves.
    if (match.phase + ':' + match.index !== before) render(); else clock();
  }

  function clock() {
    if (!root || !match) return;
    var count = root.querySelector('#live-count'), left = root.querySelector('#live-left'), bar = root.querySelector('#live-bar');
    if (count && match.phase === 'countdown') count.textContent = Math.max(1, Math.ceil((match.countdownEnds - Date.now()) / 1000));
    if (match.phase === 'question') {
      var ms = Math.max(0, match.deadline - Date.now());
      if (left) left.textContent = Math.ceil(ms / 1000) + 's';
      if (bar) bar.style.width = (100 * ms / (QUESTION_SECONDS * 1000)) + '%';
    }
  }

  function nextQuestion() {
    match.index += 1;
    if (match.index >= match.qs.length) { match.phase = 'finishing'; setTimeout(function () { finish(false); }, 1500); return; }
    match.phase = 'question';
    match.startedAt = Date.now();
    match.deadline = match.startedAt + QUESTION_SECONDS * 1000;
  }

  function pick(choice) {
    if (!match || match.phase !== 'question' || match.mine[match.index]) return;
    var q = match.qs[match.index], ms = Date.now() - match.startedAt;
    var a = { i: match.index, choice: choice, correct: choice === q.correct, ms: ms };
    match.mine[match.index] = a;
    match.channel.send({ type: 'broadcast', event: 'answer', payload: { i: a.i, correct: a.correct, ms: ms } });
    if (match.theirs[match.index]) reveal();
    render();
  }

  function reveal() {
    if (match.phase !== 'question') return;
    match.phase = 'reveal';
    match.revealEnds = Date.now() + 1800;
  }

  var points = function (a) { return a && a.correct ? 100 + Math.max(0, Math.round(50 * (1 - a.ms / (QUESTION_SECONDS * 1000)))) : 0; };
  function scores() {
    var mine = 0, theirs = 0;
    for (var i = 0; i < match.qs.length; i++) { mine += points(match.mine[i]); theirs += points(match.theirs[i]); }
    return { mine: mine, theirs: theirs };
  }

  function finish(forfeit) {
    if (!match || match.phase === 'done') return;
    clearInterval(match.tick);
    var s = scores();
    var result = forfeit ? 1 : s.mine > s.theirs ? 1 : s.mine < s.theirs ? 0 : 0.5;
    var expected = 1 / (1 + Math.pow(10, ((match.opp.elo || 1000) - me.elo) / 400));
    var delta = Math.max(-64, Math.min(64, Math.round(32 * (result - expected))));
    match.phase = 'done';
    match.result = { score: s, outcome: result, delta: delta, forfeit: forfeit };
    var prof = cfg.profile || {};
    var next = {
      displayName: me.name, rating: me.elo + delta,
      wins: (prof.wins || 0) + (result === 1 ? 1 : 0), losses: (prof.losses || 0) + (result === 0 ? 1 : 0),
      draws: (prof.draws || 0) + (result === 0.5 ? 1 : 0), matches: (prof.matches || 0) + 1, bestStreak: prof.best_streak || 0,
    };
    fetch('/api/ranked', { method: 'POST', credentials: 'same-origin', headers: { 'content-type': 'application/json' }, body: JSON.stringify(next) })
      .then(function (r) { return r.json(); })
      .then(function (d) {
        if (d && d.rating != null) {
          cfg.profile = { rating: d.rating, wins: next.wins, losses: next.losses, draws: next.draws, matches: next.matches, best_streak: next.bestStreak };
          me.elo = d.rating;
        }
        render();
      }).catch(function () {});
    render();
  }

  function leaveMatch(searchAgain) {
    if (match) { clearInterval(match.tick); try { client.removeChannel(match.channel); } catch (e) { /* already gone */ } }
    match = null;
    track({ status: searchAgain ? 'searching' : 'idle', since: Date.now(), elo: me.elo });
    tryPair();
  }

  // ── Leaderboard ────────────────────────────────────────────────────────
  var boardTimer = null;
  function loadBoard() {
    fetch('/api/ranked?limit=20', { credentials: 'same-origin', cache: 'no-store' })
      .then(function (r) { return r.json(); })
      .then(function (d) { boardRows = (d && d.leaderboard) || []; render(); })
      .catch(function () {});
  }
  function watchBoard() {
    board = client.channel('ranked-board')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ranked_profiles' }, function (change) {
        flashId = change.new && change.new.user_id;
        clearTimeout(boardTimer);
        boardTimer = setTimeout(loadBoard, 250);
      })
      .subscribe();
  }

  // ── Rendering ──────────────────────────────────────────────────────────
  function render() {
    if (!root || root.style.display === 'none') return;
    if (status === 'guest') {
      root.innerHTML = '<div class="live-card" style="max-width:560px"><h3><span class="live-dot"></span> Live 1v1 against real students</h3>' +
        '<p class="live-muted">Play students who are online right now, on the same questions at the same moment, and climb a leaderboard that updates live. Sign in to join the lobby.</p>' +
        '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:14px"><a class="btn btn-primary" href="/sso?next=/ranked">Sign in with your university</a><a class="btn" href="/">Sign in</a></div></div>';
      return;
    }
    if (status === 'connecting' || status === 'offline') {
      root.innerHTML = '<div class="live-card"><p class="live-muted">' + (status === 'offline' ? 'Could not reach the live server. Check your connection and reload.' : 'Connecting to the live lobby…') + '</p></div>';
      return;
    }
    root.innerHTML = match ? matchView() : lobbyView();
    bind();
  }

  function lobbyView() {
    var others = online.filter(function (p) { return p.id !== me.id; });
    var searching = me.status === 'searching';
    var html = '';
    if (incoming) html += '<div class="live-banner"><b>⚔️ ' + esc(incoming.from.name) + '</b><span class="live-muted">(' + esc(incoming.from.elo) + ') challenged you</span><span style="flex:1"></span>' +
      '<button class="btn btn-primary btn-sm" data-act="accept">Accept</button><button class="btn btn-sm" data-act="decline">Decline</button></div>';
    if (pendingChallenge) html += '<div class="live-banner"><span>Waiting for <b>' + esc(pendingChallenge.name) + '</b> to accept…</span><span style="flex:1"></span><button class="btn btn-sm" data-act="cancel-challenge">Cancel</button></div>';
    html += '<div class="live-grid"><div class="live-card"><h3><span class="live-dot"></span> Lobby · ' + online.length + ' online</h3>' +
      '<div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:12px">' +
      (searching ? '<button class="btn btn-lg" data-act="stop">Stop searching</button><span class="live-muted">Looking for an opponent… matches start as soon as someone else searches.</span>'
        : '<button class="btn btn-primary btn-lg" data-act="search">⚡ Find a live match</button><span class="live-muted">' + QUESTIONS_PER_MATCH + ' questions · ' + QUESTION_SECONDS + 's each · speed counts</span>') +
      '</div>' + row(me, true);
    if (!others.length) html += '<p class="live-muted" style="margin-top:10px">Nobody else is online yet. Open this page on another device or send it to a classmate.</p>';
    others.forEach(function (p) { html += row(p, false); });
    html += '</div><div class="live-card"><h3>🏆 Live leaderboard</h3>' + boardView() + '</div></div>';
    return html;
  }

  function row(p, isMe) {
    var pill = p.status === 'searching' ? '<span class="live-pill search">searching</span>' : p.status === 'playing' ? '<span class="live-pill play">in a match</span>' : '<span class="live-pill">online</span>';
    var act = !isMe && p.status !== 'playing' && !match && !pendingChallenge ? '<button class="btn btn-sm" data-act="challenge" data-id="' + esc(p.id) + '">Challenge</button>' : '';
    return '<div class="live-row' + (isMe ? ' me' : '') + '"><span class="live-name">' + esc(p.name) + (isMe ? ' <span class="live-muted">(you)</span>' : '') + '</span>' + pill + '<span class="live-elo">' + esc(p.elo) + '</span>' + act + '</div>';
  }

  function boardView() {
    if (!boardRows.length) return '<p class="live-muted">No ranked students yet. Win the first live match to top it.</p>';
    return boardRows.map(function (r) {
      var cls = 'live-row' + (r.is_me ? ' me' : '') + (flashId && r.user_id === flashId ? ' flash' : '');
      return '<div class="' + cls + '"><span class="live-muted" style="width:28px">#' + esc(r.rank) + '</span><span class="live-name">' + esc(r.display_name || 'Student') + '</span>' +
        '<span class="live-muted" style="font-size:12px">' + esc(r.wins || 0) + 'W ' + esc(r.losses || 0) + 'L</span><span class="live-elo">' + esc(r.rating) + '</span></div>';
    }).join('');
  }

  function matchView() {
    var m = match, s = scores();
    var head = '<div class="live-vs"><div><div class="who">' + esc(me.name) + '</div><div class="live-muted">' + esc(me.elo) + '</div><div class="score">' + s.mine + '</div></div>' +
      '<div class="live-muted" style="font-weight:800">VS</div><div><div class="who">' + esc(m.opp.name) + (m.oppHere ? '' : ' <span class="live-muted">(connecting)</span>') + '</div><div class="live-muted">' + esc(m.opp.elo) + '</div><div class="score">' + s.theirs + '</div></div></div>';
    if (m.phase === 'waiting') return '<div class="live-card">' + head + '<p class="live-muted" style="text-align:center">Waiting for ' + esc(m.opp.name) + ' to join…</p><div style="text-align:center"><button class="btn btn-sm" data-act="leave">Cancel</button></div></div>';
    if (m.phase === 'countdown') return '<div class="live-card">' + head + '<div class="live-big" id="live-count">' + Math.max(1, Math.ceil((m.countdownEnds - Date.now()) / 1000)) + '</div><p class="live-muted" style="text-align:center">Get ready. Same questions, same time.</p></div>';
    if (m.phase === 'done' || m.phase === 'finishing') {
      var r = m.result;
      if (!r) return '<div class="live-card">' + head + '<p class="live-muted" style="text-align:center">Final answers coming in…</p></div>';
      var title = r.outcome === 1 ? (r.forfeit ? 'You win (opponent left)' : 'Victory!') : r.outcome === 0 ? 'Defeat' : 'Draw';
      return '<div class="live-card">' + head + '<div class="live-big">' + title + '</div><p style="text-align:center;font-weight:800;font-size:18px;color:' + (r.delta >= 0 ? '#4ade80' : '#f87171') + '">' + (r.delta >= 0 ? '+' : '') + r.delta + ' Elo</p>' +
        '<div style="display:flex;gap:8px;justify-content:center;margin-top:12px"><button class="btn btn-primary" data-act="again">Play again</button><button class="btn" data-act="lobby">Back to lobby</button></div></div>';
    }
    var q = m.qs[m.index], mine = m.mine[m.index], theirs = m.theirs[m.index], revealing = m.phase === 'reveal';
    var left = Math.max(0, m.deadline - Date.now());
    var opts = q.choices.map(function (c, i) {
      var cls = 'live-opt' + (mine && mine.choice === i ? ' pick' : '') + (revealing && i === q.correct ? ' right' : '') + (revealing && mine && mine.choice === i && !mine.correct ? ' wrong' : '');
      return '<button class="' + cls + '" data-act="pick" data-i="' + i + '"' + (mine || revealing ? ' disabled' : '') + '>' + String.fromCharCode(65 + i) + '. ' + c + '</button>';
    }).join('');
    var oppState = theirs ? (mine || revealing ? (theirs.correct ? '✓ answered correctly' : '✗ answered wrong') : '⚡ answered') : 'thinking…';
    return '<div class="live-card">' + head +
      '<div class="live-muted" style="display:flex;justify-content:space-between"><span>Question ' + (m.index + 1) + ' / ' + m.qs.length + '</span><span id="live-left">' + (revealing ? '' : Math.ceil(left / 1000) + 's') + '</span></div>' +
      '<div class="live-timer" style="margin-top:6px"><i id="live-bar" style="width:' + (revealing ? 0 : 100 * left / (QUESTION_SECONDS * 1000)) + '%"></i></div>' +
      '<div class="live-q">' + q.q + '</div><div class="live-opts">' + opts + '</div>' +
      (revealing && q.exp ? '<p class="live-muted" style="margin-top:10px">' + q.exp + '</p>' : '') +
      '<div class="live-opp"><span>' + esc(m.opp.name) + ': ' + oppState + '</span><span>' + (mine ? '+' + points(mine) : '') + '</span></div></div>';
  }

  function bind() {
    root.querySelectorAll('[data-act]').forEach(function (el) {
      el.onclick = function () {
        var act = el.dataset.act;
        if (act === 'search') { track({ status: 'searching', since: Date.now() }); tryPair(); }
        else if (act === 'stop') track({ status: 'idle' });
        else if (act === 'challenge') challenge(el.dataset.id);
        else if (act === 'cancel-challenge') { pendingChallenge = null; render(); }
        else if (act === 'accept') answerChallenge(true);
        else if (act === 'decline') answerChallenge(false);
        else if (act === 'pick') pick(Number(el.dataset.i));
        else if (act === 'leave' || act === 'lobby') leaveMatch(false);
        else if (act === 'again') leaveMatch(true);
      };
    });
  }

  function start() {
    if (!mount()) return;
    connect();
    // After the page's own start-up, which opens its Profile tab.
    if (/[?&]live\b/.test(location.search) || location.hash === '#live') {
      var open = function () { setTimeout(function () { window.showMode('live'); }, 0); };
      if (document.readyState === 'complete') open(); else window.addEventListener('load', open);
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
