/**
 * Shared toolkit for MoeAI's simulators: loaded into each simulator page
 * (the chat's sandbox, themed with the student's colours). Math.js parses and
 * evaluates expressions; nerdamer does the symbolic work (integrals,
 * derivatives, simplification). Results written as $...$ are typeset by the
 * page's KaTeX.
 *
 * Sim code is written with String.raw and never uses template interpolation,
 * so backslashes and dollar signs reach the page exactly as written.
 */
const CDN = 'https://cdn.jsdelivr.net/npm';

export const MATHJS = `<script src="${CDN}/mathjs@13.2.0/lib/browser/math.js"></script>`;
export const NERDAMER = `<script src="${CDN}/nerdamer@1.1.13/all.min.js"></script>`;

export const KIT = String.raw`<style>
.sim-grid{display:grid;gap:10px}
.sim-row{display:flex;gap:8px;flex-wrap:wrap;align-items:center}
.sim-row>label{display:grid;gap:4px;font-size:12px;font-weight:700;color:var(--m-secondary);flex:1;min-width:110px}
.sim-row input[type=text],.sim-row input[type=number],.sim-row select{width:100%;box-sizing:border-box}
.sim-out{font-size:14px;line-height:1.6;overflow-x:auto}
.sim-out .katex-display{margin:6px 0;overflow-x:auto;overflow-y:hidden}
.sim-steps{margin:6px 0 0;padding-left:20px;font-size:13px;line-height:1.7;color:var(--m-secondary)}
.sim-steps li{margin:3px 0}
.sim-tag{display:inline-block;font-size:11px;font-weight:800;padding:3px 9px;border-radius:999px;background:color-mix(in srgb,var(--m-accent) 18%,transparent);color:var(--m-text)}
.sim-err{color:var(--m-danger);font-size:13px}
.sim-tabs{display:flex;gap:6px;flex-wrap:wrap}
.sim-tabs button{background:var(--m-surface-2);color:var(--m-text)}
.sim-tabs button.on{background:var(--m-accent);color:#fff}
canvas.sim-plot{width:100%;height:280px;display:block;border-radius:12px;background:var(--m-surface-2);touch-action:none}
.sim-examples{display:flex;gap:6px;flex-wrap:wrap;margin-top:6px}
.sim-examples button{font-size:12px;padding:5px 10px;background:var(--m-surface-2);color:var(--m-text)}
</style>
<script>
var K = (function () {
  function css(name, fallback) { var v = getComputedStyle(document.documentElement).getPropertyValue(name).trim(); return v || fallback; }
  function $(id) { return document.getElementById(id); }
  function fmt(n, d) {
    if (typeof n !== 'number' || !isFinite(n)) return String(n);
    if (Math.abs(n) < 1e-12) return '0';
    var s = Number(n.toFixed(d == null ? 6 : d));
    return String(s);
  }
  /** "sin(x)^2 + 3x" -> function of the named variables (math.js syntax; ln is natural log). */
  function compile(expr, vars) {
    var src = String(expr || '').replace(/\bln\s*\(/g, 'log(').replace(/\*\*/g, '^');
    var code = math.compile(src);
    vars = vars || ['x'];
    return function () {
      var scope = { e: Math.E, pi: Math.PI };
      for (var i = 0; i < vars.length; i++) scope[vars[i]] = arguments[i];
      var v = code.evaluate(scope);
      return typeof v === 'number' ? v : (v && typeof v.re === 'number' && Math.abs(v.im) < 1e-12 ? v.re : NaN);
    };
  }
  /** nerdamer expression -> LaTeX (falls back to the text). */
  function tex(expr) {
    try { return nerdamer(String(expr)).toTeX(); } catch (e) { return String(expr).replace(/\*/g, '\\cdot '); }
  }
  function nerd(expr) { return nerdamer(String(expr).replace(/\bln\s*\(/g, 'log(')); }
  /** Symbolic antiderivative, or null when nerdamer finds none. */
  function integrate(expr, v) {
    try {
      var r = nerdamer('integrate(' + String(expr).replace(/\bln\s*\(/g, 'log(') + ',' + (v || 'x') + ')');
      var s = r.toString();
      if (/integrate/.test(s)) return null;
      return r;
    } catch (e) { return null; }
  }
  function derive(expr, v) {
    try { return nerdamer('diff(' + String(expr).replace(/\bln\s*\(/g, 'log(') + ',' + (v || 'x') + ')'); } catch (e) { return null; }
  }
  /** Composite Simpson on [a, b]. */
  function simpson(f, a, b, n) {
    n = n || 400; if (n % 2) n++;
    var h = (b - a) / n, s = f(a) + f(b);
    for (var i = 1; i < n; i++) s += f(a + i * h) * (i % 2 ? 4 : 2);
    return s * h / 3;
  }
  /** Roots of f on [a, b] by sign changes + bisection. */
  function roots(f, a, b, steps) {
    steps = steps || 600; var out = [], h = (b - a) / steps, x0 = a, y0 = f(a);
    for (var i = 1; i <= steps; i++) {
      var x1 = a + i * h, y1 = f(x1);
      if (isFinite(y0) && isFinite(y1)) {
        if (y0 === 0) out.push(x0);
        else if (y0 * y1 < 0) { var lo = x0, hi = x1; for (var k = 0; k < 60; k++) { var m = (lo + hi) / 2, ym = f(m); if (f(lo) * ym <= 0) hi = m; else lo = m; } out.push((lo + hi) / 2); }
      }
      x0 = x1; y0 = y1;
    }
    return out.filter(function (r, i) { return i === 0 || Math.abs(r - out[i - 1]) > 1e-6; });
  }
  var PALETTE = ['--m-accent', '#38C9DB', '#EDC645', '#A5D64A', '#E464D2'];
  function color(i) { var c = PALETTE[i % PALETTE.length]; return c.indexOf('--') === 0 ? css(c, '#8766EB') : c; }
  /**
   * Plot on a canvas. opts: { xmin, xmax, ymin?, ymax?, fns:[{f,color,width,dash}],
   * fill:{f,g,a,b,color}, points:[{x,y,color,label}], field:{f(x,y)}, paths:[[x,y]...] }
   */
  function plot(canvas, opts) {
    var dpr = window.devicePixelRatio || 1, W = canvas.clientWidth || 600, H = canvas.clientHeight || 280;
    canvas.width = W * dpr; canvas.height = H * dpr;
    var g = canvas.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, W, H);
    var xmin = opts.xmin, xmax = opts.xmax, ymin = opts.ymin, ymax = opts.ymax;
    if (ymin == null || ymax == null) {
      var lo = Infinity, hi = -Infinity;
      (opts.fns || []).forEach(function (s) { for (var i = 0; i <= 200; i++) { var x = xmin + (xmax - xmin) * i / 200, y = s.f(x); if (isFinite(y) && Math.abs(y) < 1e6) { lo = Math.min(lo, y); hi = Math.max(hi, y); } } });
      (opts.paths || []).forEach(function (p) { p.forEach(function (q) { if (isFinite(q[1])) { lo = Math.min(lo, q[1]); hi = Math.max(hi, q[1]); } }); });
      if (!isFinite(lo)) { lo = -1; hi = 1; }
      if (hi - lo < 1e-9) { hi += 1; lo -= 1; }
      var pad = (hi - lo) * 0.12; ymin = ymin == null ? lo - pad : ymin; ymax = ymax == null ? hi + pad : ymax;
    }
    function X(x) { return (x - xmin) / (xmax - xmin) * W; }
    function Y(y) { return H - (y - ymin) / (ymax - ymin) * H; }
    var grid = css('--m-border', '#444'), muted = css('--m-muted', '#888'), text = css('--m-text', '#eee');
    g.lineWidth = 1; g.strokeStyle = grid; g.font = '11px system-ui'; g.fillStyle = muted;
    function nice(span) { var p = Math.pow(10, Math.floor(Math.log10(span / 6))); var m = span / 6 / p; return p * (m < 2 ? 1 : m < 5 ? 2 : 5); }
    var sx = nice(xmax - xmin), sy = nice(ymax - ymin);
    for (var gx = Math.ceil(xmin / sx) * sx; gx <= xmax; gx += sx) { g.globalAlpha = 0.5; g.beginPath(); g.moveTo(X(gx), 0); g.lineTo(X(gx), H); g.stroke(); g.globalAlpha = 1; if (Math.abs(gx) > 1e-9) g.fillText(fmt(gx, 3), X(gx) + 2, Math.min(H - 3, Math.max(12, Y(0) + 12))); }
    for (var gy = Math.ceil(ymin / sy) * sy; gy <= ymax; gy += sy) { g.globalAlpha = 0.5; g.beginPath(); g.moveTo(0, Y(gy)); g.lineTo(W, Y(gy)); g.stroke(); g.globalAlpha = 1; if (Math.abs(gy) > 1e-9) g.fillText(fmt(gy, 3), Math.min(W - 30, Math.max(2, X(0) + 3)), Y(gy) - 2); }
    g.strokeStyle = muted; g.lineWidth = 1.2; g.beginPath(); g.moveTo(0, Y(0)); g.lineTo(W, Y(0)); g.moveTo(X(0), 0); g.lineTo(X(0), H); g.stroke();
    if (opts.field) {
      g.strokeStyle = muted; g.lineWidth = 1;
      for (var i = 0; i <= 18; i++) for (var j = 0; j <= 12; j++) {
        var fx = xmin + (xmax - xmin) * i / 18, fy = ymin + (ymax - ymin) * j / 12, m = opts.field(fx, fy);
        if (!isFinite(m)) continue;
        var ang = Math.atan2(m * (H / (ymax - ymin)), W / (xmax - xmin)), L = 7;
        g.beginPath(); g.moveTo(X(fx) - L * Math.cos(ang), Y(fy) + L * Math.sin(ang)); g.lineTo(X(fx) + L * Math.cos(ang), Y(fy) - L * Math.sin(ang)); g.stroke();
      }
    }
    if (opts.fill) {
      var F = opts.fill, n = 240; g.fillStyle = F.color || color(0); g.globalAlpha = 0.25; g.beginPath();
      for (var k = 0; k <= n; k++) { var fx2 = F.a + (F.b - F.a) * k / n; var v = F.f(fx2); g.lineTo(X(fx2), Y(isFinite(v) ? v : 0)); }
      for (var k2 = n; k2 >= 0; k2--) { var fx3 = F.a + (F.b - F.a) * k2 / n; var v2 = F.g ? F.g(fx3) : 0; g.lineTo(X(fx3), Y(isFinite(v2) ? v2 : 0)); }
      g.closePath(); g.fill(); g.globalAlpha = 1;
    }
    (opts.paths || []).forEach(function (p, idx) {
      g.strokeStyle = p.color || color(idx + 1); g.lineWidth = p.width || 2; g.beginPath(); var started = false;
      p.forEach(function (q) { if (!isFinite(q[1]) || !isFinite(q[0])) { started = false; return; } if (!started) { g.moveTo(X(q[0]), Y(q[1])); started = true; } else g.lineTo(X(q[0]), Y(q[1])); });
      g.stroke();
    });
    (opts.fns || []).forEach(function (s, idx) {
      g.strokeStyle = s.color || color(idx); g.lineWidth = s.width || 2.2; g.setLineDash(s.dash || []); g.beginPath();
      var started = false, prev = null;
      for (var i = 0; i <= 600; i++) {
        var x = xmin + (xmax - xmin) * i / 600, y = s.f(x);
        if (!isFinite(y) || (prev !== null && Math.abs(Y(y) - Y(prev)) > H * 2)) { started = false; prev = null; continue; }
        if (!started) { g.moveTo(X(x), Y(y)); started = true; } else g.lineTo(X(x), Y(y));
        prev = y;
      }
      g.stroke(); g.setLineDash([]);
    });
    (opts.points || []).forEach(function (p) {
      g.fillStyle = p.color || text; g.beginPath(); g.arc(X(p.x), Y(p.y), 4, 0, Math.PI * 2); g.fill();
      if (p.label) { g.fillStyle = text; g.fillText(p.label, X(p.x) + 6, Y(p.y) - 6); }
    });
    return { X: X, Y: Y, xmin: xmin, xmax: xmax, ymin: ymin, ymax: ymax };
  }
  function on(ids, fn) { ids.forEach(function (id) { var el = $(id); if (el) { el.addEventListener('input', fn); el.addEventListener('change', fn); } }); }
  function examples(containerId, list, apply) {
    var box = $(containerId); if (!box) return;
    box.innerHTML = '';
    list.forEach(function (ex) { var b = document.createElement('button'); b.type = 'button'; b.textContent = ex.label; b.onclick = function () { apply(ex); }; box.appendChild(b); });
  }
  function debounce(fn, ms) { var t; return function () { clearTimeout(t); t = setTimeout(fn, ms || 250); }; }
  return { $: $, fmt: fmt, compile: compile, tex: tex, nerd: nerd, integrate: integrate, derive: derive, simpson: simpson, roots: roots, plot: plot, on: on, examples: examples, color: color, debounce: debounce, css: css };
})();
</script>`;
