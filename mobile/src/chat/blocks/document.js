/**
 * Builds the sandboxed page each interactive block runs in.
 *
 * Every card is its own document, rendered in an <iframe sandbox> on the web
 * and a WebView on native: no access to the app, its storage or the
 * student's session. Heavy libraries (Mermaid, Chart.js, three.js, Pyodide,
 * highlight.js, KaTeX) load from jsDelivr only when a reply actually uses
 * them, so none of them is in the app bundle.
 *
 * The page talks back through one bridge: its height, runtime errors (so the
 * card can offer "fix it"), code-run state, and copy requests.
 */
import { renderMarkdownMarkup } from '../katexMessageUtils';
import { cleanMermaid } from './cleanMermaid';

const CDN = 'https://cdn.jsdelivr.net/npm';
export const LIBS = {
  mermaid: `${CDN}/mermaid@12.0.0/dist/mermaid.esm.min.mjs`,
  chart: `${CDN}/chart.js@4.5.1/dist/chart.umd.min.js`,
  three: `${CDN}/three@0.186.0/build/three.module.js`,
  threeAddons: `${CDN}/three@0.186.0/examples/jsm/`,
  pyodide: 'https://cdn.jsdelivr.net/pyodide/v314.0.7/full/',
  katexCss: `${CDN}/katex@0.16.47/dist/katex.min.css`,
  katexJs: `${CDN}/katex@0.16.47/dist/katex.min.js`,
  katexAuto: `${CDN}/katex@0.16.47/dist/contrib/auto-render.min.js`,
  hljs: `${CDN}/@highlightjs/cdn-assets@11.12.0/highlight.min.js`,
  hljsDark: `${CDN}/@highlightjs/cdn-assets@11.12.0/styles/github-dark.min.css`,
  hljsLight: `${CDN}/@highlightjs/cdn-assets@11.12.0/styles/github.min.css`,
};

/** A value safe to drop inside a <script>: JSON, with "</" broken up. */
const js = (value) => JSON.stringify(value).replace(/<\//g, '<\\/').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
const escapeHtml = (value) => String(value).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export function themeFrom(colors, dark) {
  return {
    dark: Boolean(dark),
    accent: colors.accent,
    text: colors.textPrimary,
    muted: colors.textMuted,
    secondary: colors.textSecondary,
    bg: colors.card,
    surface: colors.cardButton,
    surface2: colors.cardButtonPressed,
    border: colors.border,
    danger: colors.danger,
  };
}

const BASE_CSS = (t) => `
:root { --m-accent:${t.accent}; --m-text:${t.text}; --m-muted:${t.muted}; --m-secondary:${t.secondary}; --m-bg:${t.bg};
  --m-surface:${t.surface}; --m-surface-2:${t.surface2}; --m-border:${t.border}; --m-danger:${t.danger}; color-scheme:${t.dark ? 'dark' : 'light'}; }
* { box-sizing: border-box; }
html, body { margin: 0; background: var(--m-bg); color: var(--m-text); }
body { font: 14px/1.55 "Nunito Sans", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; overflow-x: hidden; -webkit-font-smoothing: antialiased; }
.m-pad { padding: 14px; }
.m-card { background: var(--m-surface); border: 1px solid var(--m-border); border-radius: 14px; padding: 14px; }
.m-title { font-weight: 800; font-size: 15px; margin: 0 0 10px; }
.m-row { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
.m-col { display: flex; flex-direction: column; gap: 8px; }
.m-label { font-size: 12px; font-weight: 700; color: var(--m-secondary); }
.m-muted { color: var(--m-muted); }
.m-stat { font: 600 12px ui-monospace, SFMono-Regular, Menlo, monospace; background: color-mix(in srgb, var(--m-accent) 16%, transparent); color: var(--m-text); padding: 3px 8px; border-radius: 8px; }
.m-btn, button { font: inherit; font-weight: 700; font-size: 13px; border: 0; border-radius: 999px; padding: 8px 14px; background: var(--m-accent); color: #fff; cursor: pointer; }
.m-btn-ghost { background: var(--m-surface-2); color: var(--m-text); }
button:disabled { opacity: .5; cursor: default; }
input[type=range] { accent-color: var(--m-accent); width: 100%; }
input[type=text], input[type=number], select, textarea { font: inherit; color: var(--m-text); background: var(--m-surface-2); border: 1px solid var(--m-border); border-radius: 10px; padding: 7px 10px; }
canvas, svg { max-width: 100%; }
.m-error { margin: 10px 14px; padding: 10px 12px; border-radius: 12px; background: color-mix(in srgb, var(--m-danger) 14%, transparent); color: var(--m-text); font-size: 13px; }
.m-loading { padding: 18px 14px; color: var(--m-muted); font-size: 13px; }
::-webkit-scrollbar { width: 8px; height: 8px; } ::-webkit-scrollbar-thumb { background: var(--m-border); border-radius: 4px; }
`;

/** Height, errors and commands between the page and the chat. */
const BRIDGE = (id) => `
<script>
(function () {
  var id = ${js(id)}, last = 0, errored = false;
  function post(msg) {
    msg.__moeai = id;
    try { if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(JSON.stringify(msg)); else parent.postMessage(msg, '*'); } catch (e) {}
  }
  window.moeai = { post: post, commands: {} };
  // The body's own height: the document's scrollHeight never drops below the
  // frame's, so a card could grow but never shrink to fit its content.
  function size() { var b = document.body; if (!b) return; var h = Math.ceil(Math.max(b.getBoundingClientRect().height, b.scrollHeight)); if (Math.abs(h - last) > 1) { last = h; post({ type: 'size', height: h }); } }
  window.addEventListener('load', size);
  if (window.ResizeObserver) new ResizeObserver(size).observe(document.documentElement);
  document.addEventListener('DOMContentLoaded', function () { if (window.ResizeObserver) new ResizeObserver(size).observe(document.body); size(); });
  setInterval(size, 600);
  function fail(message, line) {
    if (errored) return; errored = true;
    post({ type: 'error', message: String(message || 'Unknown error').slice(0, 600), line: line || null });
  }
  window.moeai.fail = fail;
  // A library that could not be downloaded is not a bug in the block: the
  // card offers a retry for that, and "fix it" only for real errors.
  var loadFailed = false;
  function loadError(url) { if (loadFailed) return; loadFailed = true; post({ type: 'load-error', url: String(url || '') }); }
  window.moeai.loadError = loadError;
  window.addEventListener('error', function (e) {
    var t = e.target;
    if (t && t !== window && (t.tagName === 'SCRIPT' || t.tagName === 'LINK')) { if (t.tagName === 'SCRIPT') loadError(t.src); return; }
    fail(e.message, e.lineno);
  }, true);
  window.addEventListener('unhandledrejection', function (e) { fail(e.reason && e.reason.message || e.reason); });
  function command(cmd) { var fn = window.moeai.commands[cmd && cmd.type]; if (fn) fn(cmd); }
  window.__moeaiCommand = command;
  window.addEventListener('message', function (e) { if (e.data && e.data.__moeaiCmd) command(e.data); });
})();
</script>`;

function page(id, theme, { head = '', body = '', css = '' }) {
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<style>${BASE_CSS(theme)}${css}</style>${BRIDGE(id)}${head}</head><body>${body}</body></html>`;
}

// ── Kinds ───────────────────────────────────────────────────────────────────

/**
 * Models often label sliders and results in LaTeX ("$A^T$", "$\\rightarrow$").
 * A visualizer is plain HTML, so that showed as raw source. When the page
 * contains math delimiters, KaTeX's auto-render typesets it, including text
 * the page's own script writes later (re-run on changes, throttled).
 */
function visualizer(code) {
  if (!/\$[^$\n]+\$|\\\(|\\\[/.test(code)) return { body: code };
  return {
    body: `${code}
<link rel="stylesheet" href="${LIBS.katexCss}">
<script src="${LIBS.katexJs}"></script>
<script src="${LIBS.katexAuto}"></script>
<script>
(function () {
  var busy = false;
  function typeset() {
    if (busy || !window.renderMathInElement) return;
    busy = true;
    try {
      window.renderMathInElement(document.body, { delimiters: [
        { left: '$$', right: '$$', display: true }, { left: '\\\\[', right: '\\\\]', display: true },
        { left: '$', right: '$', display: false }, { left: '\\\\(', right: '\\\\)', display: false },
      ], ignoredTags: ['script', 'noscript', 'style', 'textarea', 'pre', 'code', 'option', 'input'], throwOnError: false });
    } catch (e) {}
    setTimeout(function () { busy = false; }, 150);
  }
  var timer = null;
  function soon() { clearTimeout(timer); timer = setTimeout(typeset, 60); }
  window.addEventListener('load', typeset);
  setTimeout(typeset, 400);
  try { new MutationObserver(function (list) {
    for (var i = 0; i < list.length; i++) { var t = list[i].target; if (t && t.closest && t.closest('.katex')) return; }
    soon();
  }).observe(document.body, { childList: true, subtree: true, characterData: true }); } catch (e) {}
})();
</script>` };
}

function mermaid(code, theme) {
  code = cleanMermaid(code);
  return {
    css: `#m { padding: 14px; display: flex; justify-content: center; } #m svg { height: auto; }`,
    body: `<div id="m"><div class="m-loading">Drawing the diagram…</div></div>
<script type="module">
let mermaid;
try { mermaid = (await import(${js(LIBS.mermaid)})).default; }
catch (e) { document.getElementById('m').innerHTML = '<div class="m-loading">The diagram tools could not be downloaded.</div>'; window.moeai.loadError(${js(LIBS.mermaid)}); throw e; }
mermaid.initialize({ startOnLoad: false, securityLevel: 'strict', theme: ${js(theme.dark ? 'dark' : 'default')},
  themeVariables: { primaryColor: ${js(theme.surface)}, primaryTextColor: ${js(theme.text)}, primaryBorderColor: ${js(theme.accent)}, lineColor: ${js(theme.muted)}, fontFamily: 'Nunito Sans, system-ui, sans-serif' } });
try { const { svg } = await mermaid.render('moeai-diagram', ${js(code)}); document.getElementById('m').innerHTML = svg; }
catch (e) { document.getElementById('m').innerHTML = '<div class="m-error">This diagram has a syntax error.</div>'; window.moeai.fail('Mermaid: ' + (e && e.message || e)); }
</script>`,
  };
}

function chart(code, theme) {
  return {
    css: `.wrap { padding: 12px 14px 14px; } canvas { width: 100% !important; }`,
    head: `<script src="${LIBS.chart}"></script>`,
    body: `<div class="wrap"><canvas id="c" height="240"></canvas></div>
<script>
(function () {
  if (!window.Chart) { window.moeai.loadError(${js(LIBS.chart)}); return; }
  var raw = ${js(code)}, spec;
  try { spec = JSON.parse(raw.replace(/,\\s*([}\\]])/g, '$1')); }
  catch (e) { try { spec = Function('return (' + raw + ')')(); } catch (e2) { window.moeai.fail('Chart JSON: ' + e.message); return; } }
  var accent = ${js(theme.accent)}, text = ${js(theme.text)}, muted = ${js(theme.muted)}, grid = ${js(theme.border)};
  var palette = [accent, '#66C98D', '#EB8A66', '#668CEB', '#EB6674', '#E0B84A', '#5CC8D6', '#B07CE8'];
  var type = spec.type || 'line', round = type === 'pie' || type === 'doughnut';
  var datasets = (spec.datasets || []).map(function (d, i) {
    var c = d.color || palette[i % palette.length];
    return Object.assign({ borderWidth: 2, tension: 0.3, pointRadius: type === 'scatter' ? 4 : 2 }, d, {
      borderColor: round ? ${js(theme.bg)} : c,
      backgroundColor: round ? (d.data || []).map(function (_, j) { return palette[j % palette.length]; }) : (type === 'bar' ? c : c + '33'),
      fill: d.fill != null ? d.fill : false });
  });
  Chart.defaults.color = muted; Chart.defaults.font.family = 'Nunito Sans, system-ui, sans-serif';
  var axis = function (label) { return { grid: { color: grid }, ticks: { color: muted }, title: label ? { display: true, text: label, color: muted } : undefined }; };
  new Chart(document.getElementById('c'), {
    type: type,
    data: { labels: spec.labels, datasets: datasets },
    options: { responsive: true, animation: { duration: 500 },
      plugins: { title: spec.title ? { display: true, text: spec.title, color: text, font: { size: 14, weight: '700' } } : undefined, legend: { labels: { color: text } } },
      scales: round || type === 'radar' ? undefined : { x: Object.assign(axis(spec.x), type === 'scatter' ? { type: 'linear' } : {}), y: axis(spec.y) } }
  });
})();
</script>`,
  };
}

const RUNNERS = {
  javascript: `
self.onmessage = function (e) {
  var out = function (kind, args) { self.postMessage({ kind: kind, text: Array.prototype.map.call(args, function (a) {
    if (typeof a === 'string') return a; try { return JSON.stringify(a, null, 2); } catch (x) { return String(a); } }).join(' ') }); };
  self.console = { log: function () { out('out', arguments); }, info: function () { out('out', arguments); }, warn: function () { out('warn', arguments); }, error: function () { out('err', arguments); } };
  Promise.resolve().then(function () { return (0, eval)('(async () => {\\n' + e.data.code + '\\n})()'); })
    .then(function () { self.postMessage({ kind: 'done' }); }, function (err) { self.postMessage({ kind: 'err', text: String(err && err.stack || err) }); self.postMessage({ kind: 'done' }); });
};`,
  // A sandboxed (opaque-origin) page cannot start module workers, and a
  // classic worker cannot importScripts across origins; but a classic worker
  // can import() a module. Pyodide refuses to run where importScripts exists
  // (it takes that as a classic worker), so it is hidden first.
  python: (indexURL) => `
self.importScripts = undefined;
var ready = import(${js(indexURL + 'pyodide.mjs')}).then(function (m) { return m.loadPyodide({ indexURL: ${js(indexURL)},
  stdout: function (t) { self.postMessage({ kind: 'out', text: t }); }, stderr: function (t) { self.postMessage({ kind: 'err', text: t }); } }); });
self.onmessage = async function (e) {
  try {
    var py = await ready; self.postMessage({ kind: 'ready' });
    await py.loadPackagesFromImports(e.data.code);
    var result = await py.runPythonAsync(e.data.code);
    if (result !== undefined && result !== null) self.postMessage({ kind: 'out', text: String(result) });
  } catch (err) { self.postMessage({ kind: 'err', text: String(err && err.message || err) }); }
  self.postMessage({ kind: 'done' });
};`,
};

function code(source, theme, language) {
  const runnable = language === 'python' || language === 'javascript';
  return {
    head: `<link rel="stylesheet" href="${theme.dark ? LIBS.hljsDark : LIBS.hljsLight}"><script src="${LIBS.hljs}" defer></script>`,
    css: `pre { margin: 0; padding: 12px 14px; overflow-x: auto; font: 12.5px/1.55 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; background: var(--m-bg); }
pre code.hljs { background: transparent; padding: 0; }
#out { display: none; margin: 0; border-top: 1px solid var(--m-border); padding: 10px 14px; font: 12px/1.5 ui-monospace, Menlo, monospace; white-space: pre-wrap; word-break: break-word; max-height: 320px; overflow: auto; background: var(--m-surface); }
#out .err { color: var(--m-danger); } #out .warn { color: #E0B84A; } #out .note { color: var(--m-muted); }`,
    body: `<pre><code id="src" class="language-${escapeHtml(language)}">${escapeHtml(source)}</code></pre><div id="out"></div>
<script>
window.addEventListener('load', function () { if (window.hljs) try { hljs.highlightElement(document.getElementById('src')); } catch (e) {} });
${runnable ? `
(function () {
  var language = ${js(language)}, source = ${js(source)}, worker = null, timer = null;
  var out = document.getElementById('out');
  function line(kind, text) { out.style.display = 'block'; var s = document.createElement('div'); s.className = kind; s.textContent = text; out.appendChild(s); }
  function state(running) { window.moeai.post({ type: 'run-state', running: running }); }
  function stop(note) { if (worker) { worker.terminate(); worker = null; } clearTimeout(timer); if (note) line('note', note); state(false); }
  window.moeai.commands.run = function () {
    stop(); out.innerHTML = ''; state(true);
    var src = language === 'python' ? ${js(RUNNERS.python(LIBS.pyodide))} : ${js(RUNNERS.javascript)};
    try { worker = new Worker(URL.createObjectURL(new Blob([src], { type: 'text/javascript' }))); }
    catch (e) { line('err', 'This browser cannot run code here.'); state(false); return; }
    if (language === 'python') line('note', 'Starting Python… (the first run downloads it once)');
    var limit = language === 'python' ? 90000 : 8000;
    timer = setTimeout(function () { stop('Stopped: it ran for too long.'); }, limit);
    worker.onmessage = function (e) {
      var m = e.data;
      if (m.kind === 'ready') { out.innerHTML = ''; clearTimeout(timer); timer = setTimeout(function () { stop('Stopped: it ran for too long.'); }, 20000); return; }
      if (m.kind === 'done') { if (!out.textContent) line('note', '(no output)'); stop(); return; }
      line(m.kind, m.text);
    };
    // Handled here: a crash shows in the output, not as a page error.
    worker.onerror = function (e) { e.preventDefault(); line('err', e.message || 'The code crashed.'); stop(); };
    worker.postMessage({ code: source });
  };
  window.moeai.commands.stop = function () { stop('Stopped.'); };
})();` : ''}
</script>`,
  };
}

function steps(source) {
  const items = [];
  let current = null;
  for (const line of String(source).split('\n')) {
    const heading = /^#{1,6}\s+(.+)$/.exec(line.trim());
    if (heading) { current = { title: heading[1].replace(/^\d+[.)]\s*/, ''), body: [] }; items.push(current); continue; }
    if (current) current.body.push(line);
    else if (line.trim()) { current = { title: line.replace(/^[-*\d.)\s]+/, '').trim(), body: [] }; items.push(current); }
  }
  const html = items.map((item, i) => `<label class="step"><input type="checkbox"><span class="n">${i + 1}</span><span class="c"><b>${renderMarkdownMarkup(item.title).replace(/^<p>|<\/p>$/g, '')}</b>${item.body.join('\n').trim() ? `<div class="d">${renderMarkdownMarkup(item.body.join('\n'))}</div>` : ''}</span></label>`).join('');
  return {
    head: `<link rel="stylesheet" href="${LIBS.katexCss}">`,
    css: `.bar { height: 4px; background: var(--m-surface-2); } .bar i { display: block; height: 100%; width: 0; background: var(--m-accent); transition: width .3s; }
.head { display: flex; justify-content: space-between; padding: 10px 14px 4px; font-size: 12px; font-weight: 700; color: var(--m-muted); }
.list { padding: 4px 10px 12px; } .step { display: flex; gap: 10px; align-items: flex-start; padding: 9px 6px; border-radius: 10px; cursor: pointer; }
.step:hover { background: var(--m-surface); } .step input { display: none; }
.n { flex: none; width: 24px; height: 24px; border-radius: 50%; border: 2px solid var(--m-border); display: grid; place-items: center; font-size: 12px; font-weight: 800; color: var(--m-muted); transition: all .2s; }
.step input:checked + .n { background: var(--m-accent); border-color: var(--m-accent); color: #fff; }
.step input:checked ~ .c { opacity: .55; } .c { flex: 1; min-width: 0; } .d { color: var(--m-secondary); font-size: 13px; } .d p { margin: 4px 0; } .d pre { overflow-x: auto; }`,
    body: `<div class="bar"><i id="bar"></i></div><div class="head"><span>Steps</span><span id="count">0 / ${items.length}</span></div><div class="list">${html}</div>
<script>
document.addEventListener('change', function () {
  var boxes = document.querySelectorAll('.step input'), done = 0; boxes.forEach(function (b) { if (b.checked) done++; });
  document.getElementById('count').textContent = done + ' / ' + boxes.length;
  document.getElementById('bar').style.width = (boxes.length ? 100 * done / boxes.length : 0) + '%';
});
</script>`,
  };
}

function quiz(source) {
  let spec;
  try { spec = JSON.parse(String(source).replace(/,\s*([}\]])/g, '$1')); } catch (_) { spec = null; }
  if (!spec || !Array.isArray(spec.options)) return { body: `<div class="m-error">This quiz could not be read.</div><script>window.moeai.fail('Quiz JSON could not be parsed');</script>` };
  const inline = (s) => renderMarkdownMarkup(String(s ?? '')).replace(/^<p>|<\/p>$/g, '');
  const answer = Number.isInteger(spec.answer) ? spec.answer : spec.options.indexOf(spec.answer);
  return {
    head: `<link rel="stylesheet" href="${LIBS.katexCss}">`,
    css: `.q { padding: 14px 14px 6px; font-weight: 700; } .opts { display: flex; flex-direction: column; gap: 8px; padding: 6px 14px 14px; }
.opt { text-align: start; font-weight: 600; color: var(--m-text); background: var(--m-surface); border: 2px solid transparent; border-radius: 12px; padding: 10px 12px; display: flex; gap: 10px; align-items: center; }
.opt .k { flex: none; width: 24px; height: 24px; border-radius: 50%; background: var(--m-surface-2); display: grid; place-items: center; font-size: 12px; }
.opt.right { border-color: #66C98D; } .opt.right .k { background: #66C98D; color: #fff; } .opt.wrong { border-color: var(--m-danger); } .opt.wrong .k { background: var(--m-danger); color: #fff; }
.exp { display: none; margin: 0 14px 14px; padding: 10px 12px; border-radius: 12px; background: var(--m-surface); color: var(--m-secondary); font-size: 13px; } .exp b { color: var(--m-text); }`,
    body: `<div class="q">${inline(spec.question)}</div><div class="opts">${spec.options.map((o, i) => `<button class="opt" data-i="${i}"><span class="k">${String.fromCharCode(65 + i)}</span><span>${inline(o)}</span></button>`).join('')}</div><div class="exp" id="exp"></div>
<script>
(function () {
  var answer = ${js(answer)}, explain = ${js(spec.explain ? inline(spec.explain) : '')}, done = false;
  document.querySelectorAll('.opt').forEach(function (b) { b.addEventListener('click', function () {
    if (done) return; done = true; var i = +b.dataset.i, ok = i === answer;
    b.classList.add(ok ? 'right' : 'wrong'); var right = document.querySelector('.opt[data-i="' + answer + '"]'); if (right) right.classList.add('right');
    document.querySelectorAll('.opt').forEach(function (x) { x.disabled = true; });
    var e = document.getElementById('exp'); e.style.display = 'block'; e.innerHTML = '<b>' + (ok ? 'Correct!' : 'Not quite.') + '</b> ' + explain;
    window.moeai.post({ type: 'quiz', correct: ok });
  }); });
})();
</script>`,
  };
}

function scene3d(source, theme, fullscreen) {
  return {
    css: `#stage { position: relative; width: 100%; height: ${fullscreen ? '100vh' : '360px'}; } #stage canvas { display: block; width: 100% !important; height: 100% !important; }
.hint { position: absolute; left: 10px; bottom: 8px; font-size: 11px; color: var(--m-muted); pointer-events: none; }`,
    head: `<script type="importmap">${js({ imports: { three: LIBS.three, 'three/addons/': LIBS.threeAddons } })}</script>`,
    body: `<div id="stage"><span class="hint">Drag to rotate · scroll to zoom</span></div>
<script type="module">
let THREE, OrbitControls;
try { THREE = await import('three'); ({ OrbitControls } = await import('three/addons/controls/OrbitControls.js')); }
catch (e) { window.moeai.loadError(${js(LIBS.three)}); throw e; }
const stage = document.getElementById('stage');
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(2, devicePixelRatio));
stage.prepend(renderer.domElement);
const scene = new THREE.Scene(); scene.background = new THREE.Color(${js(theme.bg)});
const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 1000); camera.position.set(4, 3, 6);
const controls = new OrbitControls(camera, renderer.domElement); controls.enableDamping = true;
scene.add(new THREE.HemisphereLight(0xffffff, 0x444466, 1.2));
const sun = new THREE.DirectionalLight(0xffffff, 1.4); sun.position.set(5, 8, 6); scene.add(sun);
const frames = []; const onFrame = (fn) => frames.push(fn);
function fit() { const w = stage.clientWidth, h = stage.clientHeight; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); }
new ResizeObserver(fit).observe(stage); fit();
try { new Function('THREE', 'scene', 'camera', 'renderer', 'controls', 'onFrame', ${js(source)})(THREE, scene, camera, renderer, controls, onFrame); }
catch (e) { window.moeai.fail('3D scene: ' + e.message); }
const clock = new THREE.Clock();
renderer.setAnimationLoop(() => { const t = clock.getElapsedTime(); controls.update(); for (const f of frames) { try { f(t); } catch (e) { window.moeai.fail(e.message); frames.length = 0; } } renderer.render(scene, camera); });
</script>`,
  };
}

// A small Manim-style animator: shapes on an SVG stage in math coordinates,
// animated in sequence with a pausable clock, with play / pause / replay.
const ANIMATOR = `
(function () {
  var NS = 'http://www.w3.org/2000/svg', W = 14, H = 8, SCALE = 60;
  var svg = document.getElementById('stage'), layer = document.getElementById('labels'), cap = document.getElementById('caption');
  var X = function (x) { return (x + W / 2) * SCALE; }, Y = function (y) { return (H / 2 - y) * SCALE; };
  var css = getComputedStyle(document.documentElement), accent = css.getPropertyValue('--m-accent').trim(), ink = css.getPropertyValue('--m-text').trim(), dim = css.getPropertyValue('--m-muted').trim();
  var clock = { paused: false, t: 0, last: performance.now() };
  function tick(now) { if (!clock.paused) clock.t += now - clock.last; clock.last = now; requestAnimationFrame(tick); } requestAnimationFrame(tick);
  function sleep(ms) { var until = clock.t + ms; return new Promise(function (r) { (function loop() { if (clock.t >= until) r(); else requestAnimationFrame(loop); })(); }); }
  function tween(ms, fn) { var start = clock.t; return new Promise(function (r) { (function loop() { var p = Math.min(1, (clock.t - start) / Math.max(1, ms)); var e = p < .5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2; fn(e); if (p < 1) requestAnimationFrame(loop); else r(); })(); }); }
  function el(tag, attrs) { var n = document.createElementNS(NS, tag); for (var k in attrs) n.setAttribute(k, attrs[k]); n.style.opacity = 0; svg.appendChild(n); return n; }
  function shape(node, kind) { return { node: node, kind: kind, dx: 0, dy: 0 }; }
  function stroke(o) { return { stroke: (o && o.color) || accent, 'stroke-width': (o && o.width) || 3, fill: (o && o.fill) || 'none', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }; }
  function place(s) { s.node.style.transform = 'translate(' + s.dx * SCALE + 'px,' + (-s.dy * SCALE) + 'px)'; }
  var a = {
    axes: function (o) { o = o || {}; var xr = o.x || [-6, 6], yr = o.y || [-3.5, 3.5], g = el('g', { stroke: dim, 'stroke-width': 1.5 });
      var d = 'M' + X(xr[0]) + ' ' + Y(0) + 'H' + X(xr[1]) + 'M' + X(0) + ' ' + Y(yr[0]) + 'V' + Y(yr[1]);
      for (var i = Math.ceil(xr[0]); i <= xr[1]; i++) if (i) d += 'M' + X(i) + ' ' + (Y(0) - 4) + 'v8';
      for (var j = Math.ceil(yr[0]); j <= yr[1]; j++) if (j) d += 'M' + (X(0) - 4) + ' ' + Y(j) + 'h8';
      var p = document.createElementNS(NS, 'path'); p.setAttribute('d', d); p.setAttribute('fill', 'none'); p.setAttribute('pathLength', 1); g.appendChild(p); return shape(g, 'path'); },
    plot: function (fn, o) { o = o || {}; var r = o.x || [-6, 6], d = '', n = 160, s = true;
      for (var i = 0; i <= n; i++) { var x = r[0] + (r[1] - r[0]) * i / n, y = fn(x); if (!isFinite(y) || Math.abs(y) > 50) { s = true; continue; } d += (s ? 'M' : 'L') + X(x).toFixed(1) + ' ' + Y(y).toFixed(1); s = false; }
      return shape(el('path', Object.assign({ d: d, pathLength: 1 }, stroke(o))), 'path'); },
    line: function (x1, y1, x2, y2, o) { return shape(el('path', Object.assign({ d: 'M' + X(x1) + ' ' + Y(y1) + 'L' + X(x2) + ' ' + Y(y2), pathLength: 1 }, stroke(o))), 'path'); },
    arrow: function (x1, y1, x2, y2, o) { var ang = Math.atan2(Y(y2) - Y(y1), X(x2) - X(x1)), h = 12, ex = X(x2), ey = Y(y2);
      var d = 'M' + X(x1) + ' ' + Y(y1) + 'L' + ex + ' ' + ey + 'M' + (ex - h * Math.cos(ang - .45)) + ' ' + (ey - h * Math.sin(ang - .45)) + 'L' + ex + ' ' + ey + 'L' + (ex - h * Math.cos(ang + .45)) + ' ' + (ey - h * Math.sin(ang + .45));
      return shape(el('path', Object.assign({ d: d, pathLength: 1 }, stroke(o))), 'path'); },
    circle: function (x, y, r, o) { return shape(el('circle', Object.assign({ cx: X(x), cy: Y(y), r: r * SCALE, pathLength: 1 }, stroke(o))), 'path'); },
    rect: function (x, y, w, h, o) { return shape(el('rect', Object.assign({ x: X(x), y: Y(y + h), width: w * SCALE, height: h * SCALE, rx: 6, pathLength: 1 }, stroke(o))), 'path'); },
    polygon: function (pts, o) { return shape(el('path', Object.assign({ d: 'M' + pts.map(function (p) { return X(p[0]) + ' ' + Y(p[1]); }).join('L') + 'Z', pathLength: 1 }, stroke(o))), 'path'); },
    dot: function (x, y, o) { var s = shape(el('circle', { cx: X(x), cy: Y(y), r: (o && o.r) || 6, fill: (o && o.color) || accent }), 'fill'); s.x = x; s.y = y; return s; },
    text: function (t, x, y, o) { var d = document.createElement('div'); d.className = 'lbl'; d.textContent = t; return label(d, x, y, o); },
    tex: function (t, x, y, o) { var d = document.createElement('div'); d.className = 'lbl'; try { katex.render(t, d, { throwOnError: false }); } catch (e) { d.textContent = t; } return label(d, x, y, o); },
    create: function (s) { return function (ms) { s.node.style.opacity = 1;
      if (s.kind === 'path') { var ps = s.node.tagName === 'g' ? s.node.querySelectorAll('path') : [s.node]; ps.forEach(function (p) { p.style.strokeDasharray = 1; p.style.strokeDashoffset = 1; });
        return tween(ms, function (e) { ps.forEach(function (p) { p.style.strokeDashoffset = 1 - e; }); }); }
      return tween(ms, function (e) { s.node.style.opacity = e; }); }; },
    fadeIn: function (s) { return function (ms) { return tween(ms, function (e) { s.node.style.opacity = e; }); }; },
    fadeOut: function (s) { return function (ms) { return tween(ms, function (e) { s.node.style.opacity = 1 - e; }); }; },
    // Dots and labels move to (x, y); other shapes are shifted by (x, y) from where they were drawn.
    moveTo: function (s, x, y) { var bx = s.x != null ? s.x : 0, by = s.y != null ? s.y : 0, sx = s.dx, sy = s.dy;
      return function (ms) { return tween(ms, function (e) { s.dx = sx + (x - bx - sx) * e; s.dy = sy + (y - by - sy) * e;
        if (s.node.namespaceURI === NS) place(s); else { s.node.style.left = (X(bx + s.dx) / (W * SCALE) * 100) + '%'; s.node.style.top = (Y(by + s.dy) / (H * SCALE) * 100) + '%'; } }); }; },
    transform: function (from, to) { return function (ms) { return tween(ms, function (e) { from.node.style.opacity = 1 - e; to.node.style.opacity = e; }); }; },
    trace: function (fn, o) { o = o || {}; var r = [o.from != null ? o.from : -5, o.to != null ? o.to : 5], p = a.plot(fn, { x: r, color: o.color }), d = a.dot(r[0], fn(r[0]), { color: o.color });
      return function (ms) { p.node.style.opacity = 1; d.node.style.opacity = 1; p.node.style.strokeDasharray = 1;
        return tween(ms, function (e) { p.node.style.strokeDashoffset = 1 - e; var x = r[0] + (r[1] - r[0]) * e, y = fn(x); if (isFinite(y)) { d.node.setAttribute('cx', X(x)); d.node.setAttribute('cy', Y(y)); } }); }; },
    play: function () { var args = Array.prototype.slice.call(arguments), opts = typeof args[args.length - 1] === 'object' && typeof args[args.length - 1] !== 'function' ? args.pop() : {};
      var ms = (opts.duration || 1) * 1000; return Promise.all(args.map(function (f) { return typeof f === 'function' ? f(ms) : null; })); },
    wait: function (s) { return sleep((s || 1) * 1000); },
    caption: function (t) { cap.textContent = t || ''; cap.style.opacity = t ? 1 : 0; },
  };
  function label(d, x, y, o) { d.style.left = (X(x) / (W * SCALE) * 100) + '%'; d.style.top = (Y(y) / (H * SCALE) * 100) + '%'; if (o && o.color) d.style.color = o.color; d.style.opacity = 0; layer.appendChild(d);
    var s = shape(d, 'fill'); s.x = x; s.y = y; return s; }
  window.__animator = { a: a, clock: clock, reset: function () { svg.innerHTML = ''; layer.innerHTML = ''; a.caption(''); clock.t = 0; } };
})();`;

function animation(source, theme, fullscreen) {
  return {
    head: `<link rel="stylesheet" href="${LIBS.katexCss}"><script src="${LIBS.katexJs}"></script>`,
    css: `.frame { position: relative; width: 100%; ${fullscreen ? 'height: calc(100vh - 52px);' : 'aspect-ratio: 14 / 8;'} background: var(--m-bg); overflow: hidden; }
#stage { position: absolute; inset: 0; width: 100%; height: 100%; } #stage > * { transition: none; }
#labels { position: absolute; inset: 0; pointer-events: none; } .lbl { position: absolute; transform: translate(-50%, -50%); font-size: 18px; white-space: nowrap; color: var(--m-text); }
#caption { position: absolute; left: 50%; bottom: 10px; transform: translateX(-50%); max-width: 90%; padding: 6px 12px; border-radius: 10px; background: color-mix(in srgb, var(--m-surface) 88%, transparent); font-size: 13px; font-weight: 600; opacity: 0; transition: opacity .3s; text-align: center; }
.controls { display: flex; gap: 8px; padding: 8px 12px 10px; align-items: center; } .controls .m-muted { font-size: 12px; margin-inline-start: auto; }`,
    body: `<div class="frame"><svg id="stage" viewBox="0 0 840 480" preserveAspectRatio="xMidYMid meet"></svg><div id="labels"></div><div id="caption"></div></div>
<div class="controls"><button id="pp" class="m-btn">Pause</button><button id="rp" class="m-btn m-btn-ghost">Replay</button><span class="m-muted" id="st">Playing</span></div>
<script>${ANIMATOR}</script>
<script>
(function () {
  var A = window.__animator, run = 0, pp = document.getElementById('pp'), st = document.getElementById('st');
  var body = ${js(source)};
  async function start() {
    var id = ++run; A.reset(); A.clock.paused = false; pp.textContent = 'Pause'; st.textContent = 'Playing';
    var guard = function (f) { return function () { if (id !== run) return new Promise(function () {}); return f.apply(null, arguments); }; };
    var a = Object.assign({}, A.a, { play: guard(A.a.play), wait: guard(A.a.wait) });
    try { await new Function('a', 'return (async () => {\\n' + body + '\\n})()')(a); if (id === run) st.textContent = 'Done'; }
    catch (e) { window.moeai.fail('Animation: ' + e.message); st.textContent = 'Error'; }
  }
  pp.onclick = function () { A.clock.paused = !A.clock.paused; pp.textContent = A.clock.paused ? 'Play' : 'Pause'; st.textContent = A.clock.paused ? 'Paused' : 'Playing'; };
  document.getElementById('rp').onclick = start;
  window.addEventListener('load', start);
})();
</script>`,
  };
}

/** An editable Python or JavaScript editor with Run, for the Simulators tab. */
function ide(source, theme, fullscreen, language = 'python') {
  return {
    css: `.bar { display: flex; gap: 8px; align-items: center; padding: 10px 12px; border-bottom: 1px solid var(--m-border); }
.bar select { padding: 5px 8px; } .bar .m-muted { font-size: 12px; margin-inline-start: auto; }
textarea#code { display: block; width: 100%; height: ${fullscreen ? 'calc(60vh)' : '220px'}; resize: vertical; border: 0; border-radius: 0; padding: 12px 14px; background: var(--m-bg);
  font: 13px/1.55 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; color: var(--m-text); tab-size: 4; outline: none; }
#out { margin: 0; border-top: 1px solid var(--m-border); padding: 10px 14px; min-height: 64px; font: 12px/1.5 ui-monospace, Menlo, monospace; white-space: pre-wrap; word-break: break-word; max-height: ${fullscreen ? '30vh' : '220px'}; overflow: auto; background: var(--m-surface); }
#out .err { color: var(--m-danger); } #out .note { color: var(--m-muted); }`,
    body: `<div class="bar"><select id="lang"><option value="python">Python</option><option value="javascript">JavaScript</option></select><button id="run" class="m-btn">Run</button><span class="m-muted">Ctrl/⌘ + Enter runs</span></div>
<textarea id="code" spellcheck="false" autocapitalize="off" autocomplete="off">${escapeHtml(source)}</textarea><div id="out"><span class="note">Output appears here.</span></div>
<script>
(function () {
  var sources = { python: ${js(RUNNERS.python(LIBS.pyodide))}, javascript: ${js(RUNNERS.javascript)} };
  var lang = document.getElementById('lang'), code = document.getElementById('code'), out = document.getElementById('out'), btn = document.getElementById('run');
  var workers = {}, busy = false, timer = null;
  lang.value = ${js(language)};
  code.addEventListener('keydown', function (e) {
    if (e.key === 'Tab') { e.preventDefault(); var s = code.selectionStart; code.value = code.value.slice(0, s) + '    ' + code.value.slice(code.selectionEnd); code.selectionStart = code.selectionEnd = s + 4; }
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); run(); }
  });
  function line(kind, text) { var d = document.createElement('div'); d.className = kind; d.textContent = text; out.appendChild(d); out.scrollTop = out.scrollHeight; }
  function done(note) { busy = false; btn.textContent = 'Run'; clearTimeout(timer); if (note) line('note', note); }
  function kill(which) { if (workers[which]) { workers[which].terminate(); delete workers[which]; } }
  function worker(which) {
    // Python stays loaded between runs; JavaScript gets a fresh worker each time.
    if (which === 'javascript') kill(which);
    if (!workers[which]) {
      var w = new Worker(URL.createObjectURL(new Blob([sources[which]], { type: 'text/javascript' })));
      w.onerror = function (e) { e.preventDefault(); line('err', e.message || 'The code crashed.'); kill(which); done(); };
      workers[which] = w;
    }
    return workers[which];
  }
  function run() {
    var which = lang.value;
    if (busy) { kill(which); done('Stopped.'); return; }
    out.innerHTML = ''; busy = true; btn.textContent = 'Stop';
    if (which === 'python' && !workers.python) line('note', 'Starting Python… (the first run downloads it once)');
    var w = worker(which);
    timer = setTimeout(function () { kill(which); done('Stopped: it ran for too long.'); }, which === 'python' ? 90000 : 8000);
    w.onmessage = function (e) { var m = e.data;
      if (m.kind === 'ready') { var notes = out.querySelectorAll('.note'); notes.forEach(function (n) { n.remove(); }); clearTimeout(timer); timer = setTimeout(function () { kill(which); done('Stopped: it ran for too long.'); }, 20000); return; }
      if (m.kind === 'done') { if (!out.textContent.trim()) line('note', '(no output)'); done(); return; }
      line(m.kind, m.text); };
    w.postMessage({ code: code.value });
  }
  btn.onclick = run;
})();
</script>`,
  };
}

const KINDS = { visualizer, mermaid, chart, steps, quiz, scene3d, animation, ide };

/** The full HTML document for one block. */
export function blockDocument({ id, kind, language, code: source, theme, fullscreen = false }) {
  const build = KINDS[kind];
  const parts = build ? build(source, theme, fullscreen, language) : code(source, theme, language);
  return page(id, theme, parts);
}
