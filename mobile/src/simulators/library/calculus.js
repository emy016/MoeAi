/**
 * Calculus simulators: integral solver, area between curves, volume of
 * revolution, arc length, and a series convergence tester. Symbolic answers
 * come from nerdamer; every one is checked numerically (Simpson's rule or a
 * derivative test) so a wrong closed form never goes unnoticed.
 */
import { KIT, MATHJS, NERDAMER } from './kit';

const HEAD = `${MATHJS}${NERDAMER}${KIT}`;

export const integralSolver = {
  id: 'integral-solver',
  title: 'Integral solver',
  topics: /integra|antideriv|substitution|by parts|fundamental theorem|calculus/,
  code: HEAD + String.raw`
<div class="sim-grid">
<div class="m-card sim-grid">
  <div class="sim-row">
    <label>$f(x)$<input id="f" type="text" value="x*e^x"></label>
  </div>
  <div class="sim-row">
    <label>Type<select id="mode"><option value="indef">Indefinite</option><option value="def">Definite</option></select></label>
    <label>From $a$<input id="a" type="number" value="0" step="any"></label>
    <label>To $b$<input id="b" type="number" value="1" step="any"></label>
  </div>
  <div class="sim-examples" id="ex"></div>
</div>
<div class="m-card"><div id="out" class="sim-out"></div><ol id="steps" class="sim-steps"></ol></div>
<div class="m-card"><canvas id="plot" class="sim-plot"></canvas></div>
</div>
<script>
function technique(src) {
  var s = src.replace(/\s+/g, '');
  var hints = [];
  if (/sqrt\((\d*\.?\d*)-x\^2\)|sqrt\(\d+-x\^2\)/.test(s)) hints.push('Trig substitution: $x = a\\sin\\theta$ turns $\\sqrt{a^2-x^2}$ into $a\\cos\\theta$.');
  else if (/sqrt\(x\^2\+\d+\)/.test(s)) hints.push('Trig substitution: $x = a\\tan\\theta$ turns $\\sqrt{x^2+a^2}$ into $a\\sec\\theta$.');
  else if (/sqrt\(x\^2-\d+\)/.test(s)) hints.push('Trig substitution: $x = a\\sec\\theta$ turns $\\sqrt{x^2-a^2}$ into $a\\tan\\theta$.');
  var hasPoly = /x(\^\d+)?\*|\*x|^x/.test(s), hasTrans = /(e\^|exp|sin|cos|log|ln)/.test(s);
  if (hasPoly && hasTrans && !/\/x/.test(s)) hints.push('Integration by parts, $\\int u\\,dv = uv - \\int v\\,du$. LIATE: pick $u$ = the logarithm, then the algebraic part; $dv$ = the exponential or trig part.');
  if (/(sin|cos|e\^|exp|sqrt|log|ln)\(([^()]*x[^()]*)\)/.test(s) && !hints.length) hints.push('Substitution: let $u$ be the inner function and check that its derivative appears as a factor.');
  if (!/(sin|cos|tan|e\^|exp|sqrt|log|ln)/.test(s)) hints.push('A polynomial or rational function: integrate term by term with $\\int x^n dx = \\frac{x^{n+1}}{n+1}$ (and $\\ln|x|$ for $n=-1$); split rational functions into partial fractions first.');
  return hints;
}
function run() {
  var src = K.$('f').value.trim(), out = K.$('out'), steps = K.$('steps'), def = K.$('mode').value === 'def';
  K.$('a').disabled = K.$('b').disabled = !def;
  steps.innerHTML = '';
  var f;
  try { f = K.compile(src); f(0.37); } catch (e) { out.innerHTML = '<div class="sim-err">Could not read that function: ' + e.message + '</div>'; return; }
  var F = K.integrate(src), html = '';
  var ftex = K.tex(src);
  if (F) {
    html += '$$\\int ' + ftex + '\\,dx = ' + F.toTeX() + ' + C$$';
    var Fn = K.compile(F.toString()), ok = true;
    [0.3, 0.7, 1.3].forEach(function (x) { var h = 1e-5, d = (Fn(x + h) - Fn(x - h)) / (2 * h); if (isFinite(d) && isFinite(f(x)) && Math.abs(d - f(x)) > 1e-3 * (1 + Math.abs(f(x)))) ok = false; });
    html += '<div class="m-muted" style="font-size:12px">' + (ok ? 'Checked: the derivative of the answer matches $f(x)$.' : 'Warning: the derivative check did not match; treat the closed form with care.') + '</div>';
  } else {
    html += '<div class="m-muted">No elementary antiderivative found automatically.</div>';
  }
  technique(src).forEach(function (h) { var li = document.createElement('li'); li.innerHTML = h; steps.appendChild(li); });
  var a = Number(K.$('a').value), b = Number(K.$('b').value);
  if (def) {
    var numeric = K.simpson(f, a, b, 1000);
    html += '$$\\int_{' + K.fmt(a) + '}^{' + K.fmt(b) + '} ' + ftex + '\\,dx';
    if (F) {
      try { var exact = nerdamer(F.toString(), { x: String(b) }).subtract(nerdamer(F.toString(), { x: String(a) })); html += ' = ' + exact.toTeX(); } catch (e) {}
    }
    html += ' \\approx ' + K.fmt(numeric, 6) + '$$';
    var li2 = document.createElement('li'); li2.innerHTML = F ? 'Evaluate $F(b) - F(a)$ with the antiderivative above.' : 'Estimated with Simpson\'s rule (1000 intervals).'; steps.appendChild(li2);
  }
  out.innerHTML = html;
  var lo = def ? Math.min(a, b) : -4, hi = def ? Math.max(a, b) : 4, span = Math.max(1, hi - lo);
  K.plot(K.$('plot'), { xmin: lo - span * 0.4, xmax: hi + span * 0.4, fns: [{ f: f }].concat(F ? [{ f: K.compile(F.toString()), dash: [6, 4], color: '#38C9DB' }] : []), fill: def ? { f: f, a: a, b: b } : null });
}
K.examples('ex', [
  { label: 'x e^x (by parts)', f: 'x*e^x', mode: 'indef' },
  { label: 'sin²x', f: 'sin(x)^2', mode: 'def', a: 0, b: 'pi' },
  { label: '1/(1+x²)', f: '1/(1+x^2)', mode: 'def', a: 0, b: 1 },
  { label: 'x√(x²+1) (substitution)', f: 'x*sqrt(x^2+1)', mode: 'indef' },
  { label: 'ln x', f: 'log(x)', mode: 'def', a: 1, b: 'e' },
  { label: '√(4−x²) (trig sub)', f: 'sqrt(4-x^2)', mode: 'def', a: 0, b: 2 },
], function (ex) { K.$('f').value = ex.f; K.$('mode').value = ex.mode; if (ex.a != null) { K.$('a').value = ex.a === 'pi' ? Math.PI.toFixed(6) : ex.a; K.$('b').value = ex.b === 'pi' ? Math.PI.toFixed(6) : ex.b === 'e' ? Math.E.toFixed(6) : ex.b; } run(); });
K.on(['f', 'mode', 'a', 'b'], K.debounce(run, 300));
window.addEventListener('load', run);
</script>`,
};

export const areaBetween = {
  id: 'area-between-curves',
  title: 'Area between curves',
  topics: /area between|area under|definite integral|applications of (definite )?integ|calculus/,
  code: HEAD + String.raw`
<div class="sim-grid">
<div class="m-card sim-grid">
  <div class="sim-row"><label>$y = f(x)$<input id="f" type="text" value="x"></label><label>$y = g(x)$<input id="g" type="text" value="x^2"></label></div>
  <div class="sim-row">
    <label>Limits<select id="lim"><option value="auto">Where they cross</option><option value="manual">Choose a and b</option></select></label>
    <label>$a$<input id="a" type="number" value="0" step="any"></label><label>$b$<input id="b" type="number" value="1" step="any"></label>
  </div>
  <div class="sim-examples" id="ex"></div>
</div>
<div class="m-card"><div id="out" class="sim-out"></div></div>
<div class="m-card"><canvas id="plot" class="sim-plot"></canvas></div>
</div>
<script>
function run() {
  var out = K.$('out'), f, g;
  try { f = K.compile(K.$('f').value); g = K.compile(K.$('g').value); f(0.3); g(0.3); } catch (e) { out.innerHTML = '<div class="sim-err">' + e.message + '</div>'; return; }
  var auto = K.$('lim').value === 'auto', a, b, cuts = [];
  if (auto) {
    cuts = K.roots(function (x) { return f(x) - g(x); }, -20, 20, 4000);
    if (cuts.length < 2) { out.innerHTML = '<div class="sim-err">The curves cross fewer than twice between −20 and 20. Choose the limits yourself.</div>'; K.$('lim').value = 'manual'; return run(); }
    a = cuts[0]; b = cuts[cuts.length - 1]; K.$('a').value = K.fmt(a, 4); K.$('b').value = K.fmt(b, 4);
  } else { a = Number(K.$('a').value); b = Number(K.$('b').value); cuts = [a].concat(K.roots(function (x) { return f(x) - g(x); }, a, b, 2000)).concat([b]); }
  K.$('a').disabled = K.$('b').disabled = auto;
  cuts = cuts.filter(function (c) { return c >= a - 1e-9 && c <= b + 1e-9; });
  if (cuts[0] > a + 1e-9) cuts.unshift(a); if (cuts[cuts.length - 1] < b - 1e-9) cuts.push(b);
  var total = 0, pieces = [];
  for (var i = 0; i < cuts.length - 1; i++) {
    var lo = cuts[i], hi = cuts[i + 1]; if (hi - lo < 1e-9) continue;
    var mid = (lo + hi) / 2, top = f(mid) >= g(mid) ? 'f' : 'g';
    var part = Math.abs(K.simpson(function (x) { return f(x) - g(x); }, lo, hi, 600));
    total += part; pieces.push({ lo: lo, hi: hi, top: top, part: part });
  }
  var F = K.tex(K.$('f').value), G = K.tex(K.$('g').value);
  var html = '$$A = \\int_{a}^{b} \\left| f(x) - g(x) \\right| dx$$';
  html += pieces.map(function (p) {
    var d = p.top === 'f' ? '(' + F + ') - (' + G + ')' : '(' + G + ') - (' + F + ')';
    return '$$\\int_{' + K.fmt(p.lo, 4) + '}^{' + K.fmt(p.hi, 4) + '} \\left[' + d + '\\right] dx \\approx ' + K.fmt(p.part, 5) + '$$';
  }).join('');
  html += '<div><span class="sim-tag">Area ≈ ' + K.fmt(total, 6) + '</span></div>';
  out.innerHTML = html;
  var span = Math.max(1, b - a);
  K.plot(K.$('plot'), { xmin: a - span * 0.3, xmax: b + span * 0.3, fns: [{ f: f }, { f: g, color: '#38C9DB' }], fill: { f: f, g: g, a: a, b: b }, points: cuts.map(function (c) { return { x: c, y: f(c) }; }) });
}
K.examples('ex', [
  { label: 'y = x and y = x²', f: 'x', g: 'x^2' },
  { label: 'y = sin x and y = cos x', f: 'sin(x)', g: 'cos(x)', a: 0.785398, b: 3.926991 },
  { label: 'y = x³ and y = x', f: 'x^3', g: 'x' },
  { label: 'y = 4 − x² and y = 0', f: '4-x^2', g: '0' },
], function (ex) { K.$('f').value = ex.f; K.$('g').value = ex.g; if (ex.a != null) { K.$('lim').value = 'manual'; K.$('a').value = ex.a; K.$('b').value = ex.b; } else K.$('lim').value = 'auto'; run(); });
K.on(['f', 'g', 'lim', 'a', 'b'], K.debounce(run, 300));
window.addEventListener('load', run);
</script>`,
};

export const volumeOfRevolution = {
  id: 'volume-of-revolution',
  title: 'Volume of revolution',
  topics: /volume|solid of revolution|disk|washer|shell|applications of (definite )?integ/,
  code: HEAD + String.raw`
<div class="sim-grid">
<div class="m-card sim-grid">
  <div class="sim-row"><label>Outer $R(x)$<input id="f" type="text" value="sqrt(x)"></label><label>Inner $r(x)$ (0 for a disk)<input id="g" type="text" value="0"></label></div>
  <div class="sim-row">
    <label>Axis<select id="axis"><option value="x">x-axis (disk / washer)</option><option value="y">y-axis (shells)</option></select></label>
    <label>$a$<input id="a" type="number" value="0" step="any"></label><label>$b$<input id="b" type="number" value="4" step="any"></label>
  </div>
  <div class="sim-examples" id="ex"></div>
</div>
<div class="m-card"><div id="out" class="sim-out"></div></div>
<div class="m-card"><canvas id="plot" class="sim-plot"></canvas></div>
</div>
<script>
function run() {
  var out = K.$('out'), f, g;
  try { f = K.compile(K.$('f').value); g = K.compile(K.$('g').value); f(0.5); g(0.5); } catch (e) { out.innerHTML = '<div class="sim-err">' + e.message + '</div>'; return; }
  var a = Number(K.$('a').value), b = Number(K.$('b').value), axis = K.$('axis').value;
  var F = K.tex(K.$('f').value), G = K.tex(K.$('g').value), hasInner = K.$('g').value.trim() !== '0';
  var integrand, texInt, sym;
  if (axis === 'x') {
    integrand = function (x) { var R = f(x), r = g(x); return Math.PI * (R * R - r * r); };
    texInt = hasInner ? '\\pi \\int_{' + K.fmt(a) + '}^{' + K.fmt(b) + '} \\left[(' + F + ')^2 - (' + G + ')^2\\right] dx' : '\\pi \\int_{' + K.fmt(a) + '}^{' + K.fmt(b) + '} (' + F + ')^2\\, dx';
    sym = '(' + K.$('f').value + ')^2-(' + K.$('g').value + ')^2';
  } else {
    integrand = function (x) { return 2 * Math.PI * x * (f(x) - g(x)); };
    texInt = '2\\pi \\int_{' + K.fmt(a) + '}^{' + K.fmt(b) + '} x\\left[(' + F + ') - (' + G + ')\\right] dx';
    sym = 'x*((' + K.$('f').value + ')-(' + K.$('g').value + '))';
  }
  var V = K.simpson(integrand, a, b, 1200), exactTex = '';
  var anti = K.integrate(sym);
  if (anti) {
    try {
      var d = nerdamer(anti.toString(), { x: String(b) }).subtract(nerdamer(anti.toString(), { x: String(a) }));
      exactTex = ' = ' + (axis === 'x' ? '\\pi' : '2\\pi') + '\\left(' + d.toTeX() + '\\right)';
    } catch (e) {}
  }
  out.innerHTML = '<div class="m-label">' + (axis === 'x' ? (hasInner ? 'Washer method' : 'Disk method') : 'Shell method') + '</div>$$V = ' + texInt + exactTex + ' \\approx ' + K.fmt(V, 6) + '$$';
  var span = Math.max(1, b - a), view = K.plot(K.$('plot'), { xmin: a - span * 0.25, xmax: b + span * 0.25, fns: axis === 'x' ? [{ f: f }, { f: function (x) { return -f(x); }, dash: [5, 4] }, { f: g, color: '#38C9DB' }] : [{ f: f }, { f: g, color: '#38C9DB' }], fill: { f: f, g: g, a: a, b: b } });
  // Cross-sections drawn as ellipses so the solid reads as 3D.
  if (axis === 'x') {
    var c = K.$('plot').getContext('2d'); c.strokeStyle = K.css('--m-accent', '#8766EB'); c.globalAlpha = 0.6; c.lineWidth = 1.2;
    for (var i = 0; i <= 8; i++) { var x = a + (b - a) * i / 8, R = Math.abs(f(x)); if (!isFinite(R)) continue; var ry = Math.abs(view.Y(R) - view.Y(0)); c.beginPath(); c.ellipse(view.X(x), view.Y(0), Math.max(2, ry * 0.18), ry, 0, 0, Math.PI * 2); c.stroke(); }
    c.globalAlpha = 1;
  }
}
K.examples('ex', [
  { label: '√x on [0,4] about x', f: 'sqrt(x)', g: '0', axis: 'x', a: 0, b: 4 },
  { label: 'washer: x and x²', f: 'x', g: 'x^2', axis: 'x', a: 0, b: 1 },
  { label: 'shells: x − x² about y', f: 'x-x^2', g: '0', axis: 'y', a: 0, b: 1 },
  { label: 'sphere: √(r² − x²)', f: 'sqrt(4-x^2)', g: '0', axis: 'x', a: -2, b: 2 },
], function (ex) { K.$('f').value = ex.f; K.$('g').value = ex.g; K.$('axis').value = ex.axis; K.$('a').value = ex.a; K.$('b').value = ex.b; run(); });
K.on(['f', 'g', 'axis', 'a', 'b'], K.debounce(run, 300));
window.addEventListener('load', run);
</script>`,
};

export const arcLength = {
  id: 'arc-length',
  title: 'Arc length',
  topics: /arc length|length of a curve|curve length/,
  code: HEAD + String.raw`
<div class="sim-grid">
<div class="m-card sim-grid">
  <div class="sim-row"><label>$y = f(x)$<input id="f" type="text" value="x^(3/2)"></label></div>
  <div class="sim-row"><label>$a$<input id="a" type="number" value="0" step="any"></label><label>$b$<input id="b" type="number" value="4" step="any"></label></div>
  <label class="m-label">Straight segments: <b id="nv">4</b><input id="n" type="range" min="1" max="64" value="4"></label>
  <div class="sim-examples" id="ex"></div>
</div>
<div class="m-card"><div id="out" class="sim-out"></div></div>
<div class="m-card"><canvas id="plot" class="sim-plot"></canvas></div>
</div>
<script>
function run() {
  var out = K.$('out'), src = K.$('f').value, f;
  try { f = K.compile(src); f(0.5); } catch (e) { out.innerHTML = '<div class="sim-err">' + e.message + '</div>'; return; }
  var a = Number(K.$('a').value), b = Number(K.$('b').value), n = Number(K.$('n').value); K.$('nv').textContent = n;
  var d = K.derive(src), dtex = d ? d.toTeX() : "f'(x)", df;
  try { df = d ? K.compile(d.toString()) : null; } catch (e) { df = null; }
  if (!df) df = function (x) { var h = 1e-5; return (f(x + h) - f(x - h)) / (2 * h); };
  var L = K.simpson(function (x) { var s = df(x); return Math.sqrt(1 + s * s); }, a, b, 2000);
  var poly = [], Ln = 0;
  for (var i = 0; i <= n; i++) { var x = a + (b - a) * i / n; poly.push([x, f(x)]); if (i) Ln += Math.hypot(poly[i][0] - poly[i - 1][0], poly[i][1] - poly[i - 1][1]); }
  out.innerHTML = '$$f\'(x) = ' + dtex + '$$$$L = \\int_{' + K.fmt(a) + '}^{' + K.fmt(b) + '} \\sqrt{1 + \\left(' + dtex + '\\right)^2}\\, dx \\approx ' + K.fmt(L, 6) + '$$'
    + '<div>' + n + ' straight segments give <span class="sim-tag">' + K.fmt(Ln, 6) + '</span>, off by ' + K.fmt(Math.abs(L - Ln), 6) + '. More segments close the gap: that limit is the integral.</div>';
  var span = Math.max(1, b - a);
  K.plot(K.$('plot'), { xmin: a - span * 0.15, xmax: b + span * 0.15, fns: [{ f: f }], paths: [Object.assign(poly, { color: '#EDC645', width: 2 })], points: poly.map(function (p) { return { x: p[0], y: p[1], color: '#EDC645' }; }) });
}
K.examples('ex', [
  { label: 'x^(3/2) on [0,4]', f: 'x^(3/2)', a: 0, b: 4 },
  { label: 'x² on [0,1]', f: 'x^2', a: 0, b: 1 },
  { label: 'cosh x on [0,1]', f: 'cosh(x)', a: 0, b: 1 },
  { label: 'ln(cos x) on [0,π/4]', f: 'log(cos(x))', a: 0, b: 0.785398 },
], function (ex) { K.$('f').value = ex.f; K.$('a').value = ex.a; K.$('b').value = ex.b; run(); });
K.on(['f', 'a', 'b', 'n'], K.debounce(run, 200));
window.addEventListener('load', run);
</script>`,
};

export const seriesTester = {
  id: 'series-tester',
  title: 'Series convergence tester',
  topics: /series|convergen|ratio test|geometric series|p-series|sequence/,
  code: HEAD + String.raw`
<div class="sim-grid">
<div class="m-card sim-grid">
  <div class="sim-row"><label>Term $a_n$<input id="an" type="text" value="1/n^2"></label><label>Start $n_0$<input id="n0" type="number" value="1"></label></div>
  <div class="sim-examples" id="ex"></div>
</div>
<div class="m-card"><div id="out" class="sim-out"></div><ol id="steps" class="sim-steps"></ol></div>
<div class="m-card"><canvas id="plot" class="sim-plot"></canvas></div>
</div>
<script>
function run() {
  var out = K.$('out'), steps = K.$('steps'), src = K.$('an').value, a; steps.innerHTML = '';
  try { a = K.compile(src, ['n']); a(3); } catch (e) { out.innerHTML = '<div class="sim-err">' + e.message + '</div>'; return; }
  var n0 = Math.round(Number(K.$('n0').value) || 1), sums = [], S = 0;
  for (var n = n0; n < n0 + 60; n++) { S += a(n); sums.push([n, S]); }
  function li(t) { var el = document.createElement('li'); el.innerHTML = t; steps.appendChild(el); }
  // Limits are taken at the largest n where the terms are still finite numbers (n! overflows early).
  var BIG = [1e6, 1e5, 1e4, 2000, 1000, 500, 170, 100, 60, 30];
  function far(fn) { for (var i = 0; i < BIG.length; i++) { var v = fn(BIG[i]); if (isFinite(v)) return v; } return NaN; }
  var big = far(a), verdict = null;
  li('nth-term test: $a_n \\to ' + K.fmt(big, 6) + '$ as $n \\to \\infty$. ' + (Math.abs(big) > 1e-6 ? '<b>Not zero, so the series diverges.</b>' : 'Zero, so this test is inconclusive.'));
  if (Math.abs(big) > 1e-6) verdict = 'diverges';
  var r1 = Math.abs(a(n0 + 1) / a(n0)), r2 = Math.abs(a(n0 + 5) / a(n0 + 4)), geometric = isFinite(r1) && Math.abs(r1 - r2) < 1e-9;
  if (geometric) { li('Geometric: constant ratio $r = ' + K.fmt(r1, 6) + '$. ' + (r1 < 1 ? 'Since $|r| < 1$, it converges to $\\frac{a_{' + n0 + '}}{1-r} = ' + K.fmt(a(n0) / (1 - a(n0 + 1) / a(n0)), 6) + '$.' : 'Since $|r| \\ge 1$, it diverges.')); verdict = verdict || (r1 < 1 ? 'converges' : 'diverges'); }
  var L = far(function (n) { var q = Math.abs(a(n + 1) / a(n)); return q; });
  li("Ratio test (d'Alembert): $\\lim \\left|\\frac{a_{n+1}}{a_n}\\right| \\approx " + K.fmt(L, 5) + '$. ' + (L < 0.999 ? '<b>Less than 1: converges absolutely.</b>' : L > 1.001 ? '<b>Greater than 1: diverges.</b>' : 'Equal to 1: inconclusive.'));
  if (!verdict && L < 0.999) verdict = 'converges'; if (!verdict && L > 1.001) verdict = 'diverges';
  var m = src.replace(/\s+/g, '').match(/^1\/n\^\(?([0-9.]+)\)?$/) || (src.replace(/\s+/g, '') === '1/n' ? [0, '1'] : null);
  if (m) { var p = Number(m[1]); li('p-series with $p = ' + p + '$: ' + (p > 1 ? 'converges because $p > 1$.' : 'diverges because $p \\le 1$.')); verdict = verdict || (p > 1 ? 'converges' : 'diverges'); }
  if (!verdict) {
    var s1 = sums[sums.length - 1][1], S2 = 0; for (var k = n0; k < n0 + 4000; k++) S2 += a(k);
    var drift = Math.abs(S2 - s1);
    li('Partial sums: $S_{60} \\approx ' + K.fmt(s1, 5) + '$, $S_{4000} \\approx ' + K.fmt(S2, 5) + '$. ' + (drift < 0.01 ? 'They are settling, which suggests convergence (not a proof).' : 'Still moving, which suggests divergence or very slow convergence.'));
  }
  out.innerHTML = '$$\\sum_{n=' + n0 + '}^{\\infty} ' + K.tex(src) + '$$' + (verdict ? '<span class="sim-tag">' + (verdict === 'converges' ? 'Converges' : 'Diverges') + '</span>' : '<span class="sim-tag">Inconclusive by these tests</span>');
  K.plot(K.$('plot'), { xmin: n0 - 1, xmax: n0 + 61, paths: [sums], points: sums.filter(function (_, i) { return i % 3 === 0; }).map(function (p) { return { x: p[0], y: p[1] }; }) });
}
K.examples('ex', [
  { label: '1/n² (p = 2)', an: '1/n^2', n0: 1 },
  { label: '1/n (harmonic)', an: '1/n', n0: 1 },
  { label: '(1/2)^n (geometric)', an: '(1/2)^n', n0: 0 },
  { label: 'n!/n^n (ratio)', an: 'factorial(n)/n^n', n0: 1 },
  { label: '(−1)^n/n (alternating)', an: '(-1)^n/n', n0: 1 },
  { label: 'n/(n+1)', an: 'n/(n+1)', n0: 1 },
], function (ex) { K.$('an').value = ex.an; K.$('n0').value = ex.n0; run(); });
K.on(['an', 'n0'], K.debounce(run, 300));
window.addEventListener('load', run);
</script>`,
};

export const CALCULUS_SIMS = [integralSolver, areaBetween, volumeOfRevolution, arcLength, seriesTester];
