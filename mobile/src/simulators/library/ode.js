/**
 * Differential equation simulators.
 *
 * First order: dy/dx = f(x, y) is classified (linear, separable, homogeneous)
 * and solved symbolically where nerdamer can do the integrals, with the
 * worked steps; M dx + N dy = 0 is tested for exactness (with an integrating
 * factor when it is not). Every case also gets a slope field and an RK4
 * solution through the chosen initial point, so the answer can be seen.
 * Second order: constant coefficients via the characteristic equation, with a
 * particular solution by variation of parameters. Systems: x' = Ax for 2x2 A,
 * eigenvalues, the type of equilibrium, and a phase portrait.
 */
import { KIT, MATHJS, NERDAMER } from './kit';

const HEAD = `${MATHJS}${NERDAMER}${KIT}`;

export const firstOrderOde = {
  id: 'ode-first-order',
  title: 'First-order ODE solver',
  topics: /first.order|separable|exact (differential )?equation|linear differential|integrating factor|differential equation|\bodes?\b/,
  code: HEAD + String.raw`
<div class="sim-grid">
<div class="m-card sim-grid">
  <div class="sim-tabs"><button id="t-f" class="on" type="button">dy/dx = f(x, y)</button><button id="t-e" type="button">M dx + N dy = 0</button></div>
  <div class="sim-row" id="row-f"><label>$\frac{dy}{dx} = f(x,y)$<input id="f" type="text" value="x*y"></label></div>
  <div class="sim-row" id="row-e" style="display:none"><label>$M(x,y)$<input id="M" type="text" value="2*x*y+3"></label><label>$N(x,y)$<input id="N" type="text" value="x^2-1"></label></div>
  <div class="sim-row"><label>$x_0$<input id="x0" type="number" value="0" step="any"></label><label>$y_0$<input id="y0" type="number" value="1" step="any"></label></div>
  <div class="sim-examples" id="ex"></div>
</div>
<div class="m-card"><div id="kind"></div><div id="out" class="sim-out"></div><ol id="steps" class="sim-steps"></ol></div>
<div class="m-card"><canvas id="plot" class="sim-plot"></canvas><div class="m-muted" style="font-size:12px;margin-top:6px">Slope field, and the solution through $(x_0, y_0)$ by Runge–Kutta 4.</div></div>
</div>
<script>
var mode = 'f';
function isZero(expr) { try { var s = nerdamer('simplify(' + expr + ')').toString(); if (s === '0') return true; var fn = K.compile(expr, ['x', 'y']); return [[0.3, 0.7], [1.1, -0.4], [-0.8, 1.9], [2.2, 0.5]].every(function (p) { var v = fn(p[0], p[1]); return isFinite(v) && Math.abs(v) < 1e-7; }); } catch (e) { return false; } }
function vars(expr) { try { return nerdamer(expr).variables(); } catch (e) { return ['x', 'y']; } }
function d(expr, v) { return nerdamer('diff(' + expr + ',' + v + ')').toString(); }
function integ(expr, v) { var r = K.integrate(expr, v); return r ? r.toString() : null; }
function T(s) { return K.tex(s); }
function li(html) { var el = document.createElement('li'); el.innerHTML = html; K.$('steps').appendChild(el); }
function solveF(src) {
  var fy = d(src, 'y'), fyy = d(fy, 'y');
  // Linear: y' + P(x) y = Q(x)  <=>  f is linear in y.
  if (isZero(fyy) && vars(fy).indexOf('y') < 0) {
    var P = nerdamer('-(' + fy + ')').toString(), Q = nerdamer('expand((' + src + ')-(' + fy + ')*y)').toString();
    K.$('kind').innerHTML = '<span class="sim-tag">Linear</span>';
    li('Write it as $y\' + P(x)\\,y = Q(x)$ with $P(x) = ' + T(P) + '$ and $Q(x) = ' + T(Q) + '$.');
    var IP = integ(P, 'x');
    if (IP === null) { li('$\\int P\\,dx$ has no elementary form; the numeric solution is plotted.'); return; }
    var mu = nerdamer('simplify(e^(' + IP + '))').toString();
    li('Integrating factor $\\mu(x) = e^{\\int P\\,dx} = ' + T(mu) + '$.');
    li('Multiply through: $\\left(\\mu y\\right)\' = \\mu Q$, so $\\mu y = \\int \\mu Q\\,dx + C$.');
    var IQ = integ('(' + mu + ')*(' + Q + ')', 'x');
    if (IQ === null) { li('$\\int \\mu Q\\,dx$ has no elementary form; the numeric solution is plotted.'); return; }
    var y = nerdamer('simplify((' + IQ + '+C)/(' + mu + '))').toString();
    K.$('out').innerHTML = '$$y = ' + T(y) + '$$';
    return;
  }
  // Separable: f = g(x) h(y)  <=>  f f_xy = f_x f_y everywhere.
  var fn = K.compile(src, ['x', 'y']), sep = true, h = 1e-4;
  [[0.4, 0.6], [1.3, -0.7], [-0.9, 1.4], [2.1, 2.3]].forEach(function (p) {
    var x = p[0], yv = p[1], F = fn(x, yv), Fx = (fn(x + h, yv) - fn(x - h, yv)) / (2 * h), Fy = (fn(x, yv + h) - fn(x, yv - h)) / (2 * h);
    var Fxy = (fn(x + h, yv + h) - fn(x + h, yv - h) - fn(x - h, yv + h) + fn(x - h, yv - h)) / (4 * h * h);
    if (isFinite(F) && Math.abs(F * Fxy - Fx * Fy) > 1e-4 * (1 + Math.abs(F * Fxy))) sep = false;
  });
  if (sep) {
    var x1 = null, y1 = null;
    [[1, 1], [2, 1], [1, 2], [0.5, 0.5], [3, 2]].some(function (p) { var v = fn(p[0], p[1]); if (isFinite(v) && Math.abs(v) > 1e-9) { x1 = p[0]; y1 = p[1]; return true; } return false; });
    if (x1 !== null) {
      var H = nerdamer(src, { x: String(x1) }).toString();
      var G = nerdamer('simplify((' + src + ')/(' + H + '))').toString();
      if (vars(G).indexOf('y') < 0 && vars(H).indexOf('x') < 0) {
        K.$('kind').innerHTML = '<span class="sim-tag">Separable</span>';
        li('Separate: $\\dfrac{dy}{' + T(H) + '} = ' + T(G) + '\\,dx$.');
        var Ly = integ('1/(' + H + ')', 'y'), Rx = integ(G, 'x');
        if (Ly !== null && Rx !== null) {
          li('Integrate both sides: $' + T(Ly) + ' = ' + T(Rx) + ' + C$.');
          var sol = null;
          try { var s = nerdamer('solve(' + Ly + '=' + Rx + '+C, y)').toString(); if (s && s !== '[]') sol = s.replace(/^\[|\]$/g, '').split(',')[0]; } catch (e) {}
          K.$('out').innerHTML = sol ? '$$y = ' + T(sol) + '$$' : '$$' + T(Ly) + ' = ' + T(Rx) + ' + C$$';
          if (!sol) li('That implicit form is the general solution.');
        } else li('One of the integrals has no elementary form; the numeric solution is plotted.');
        return;
      }
    }
  }
  // Homogeneous: f(tx, ty) = f(x, y).
  var homo = [[0.7, 1.3], [2, -1], [1.5, 0.4]].every(function (p) { var a = fn(p[0], p[1]), b = fn(2.5 * p[0], 2.5 * p[1]); return isFinite(a) && Math.abs(a - b) < 1e-6 * (1 + Math.abs(a)); });
  if (homo) {
    K.$('kind').innerHTML = '<span class="sim-tag">Homogeneous</span>';
    li('$f(tx, ty) = f(x, y)$: substitute $y = vx$, so $y\' = v + x v\'$, and the equation becomes separable in $v$ and $x$.');
    return;
  }
  K.$('kind').innerHTML = '<span class="sim-tag">No closed form found</span>';
  li('Not linear, separable or homogeneous in a form MoeAI recognises. The numeric solution below is still exact to plotting accuracy.');
}
function solveE(M, N) {
  var My = d(M, 'y'), Nx = d(N, 'x');
  li('$\\dfrac{\\partial M}{\\partial y} = ' + T(My) + '$, $\\dfrac{\\partial N}{\\partial x} = ' + T(Nx) + '$.');
  if (!isZero('(' + My + ')-(' + Nx + ')')) {
    var rx = nerdamer('simplify((' + My + '-(' + Nx + '))/(' + N + '))').toString(), ry = nerdamer('simplify((' + Nx + '-(' + My + '))/(' + M + '))').toString(), mu = null;
    if (vars(rx).indexOf('y') < 0) { var I = integ(rx, 'x'); if (I !== null) { mu = nerdamer('simplify(e^(' + I + '))').toString(); li('Not exact, but $\\frac{M_y - N_x}{N} = ' + T(rx) + '$ depends on $x$ only: $\\mu(x) = ' + T(mu) + '$.'); } }
    else if (vars(ry).indexOf('x') < 0) { var J = integ(ry, 'y'); if (J !== null) { mu = nerdamer('simplify(e^(' + J + '))').toString(); li('Not exact, but $\\frac{N_x - M_y}{M} = ' + T(ry) + '$ depends on $y$ only: $\\mu(y) = ' + T(mu) + '$.'); } }
    if (!mu) { K.$('kind').innerHTML = '<span class="sim-tag">Not exact</span>'; li('No integrating factor of $x$ or $y$ alone. The numeric solution is plotted.'); return; }
    M = nerdamer('expand((' + mu + ')*(' + M + '))').toString(); N = nerdamer('expand((' + mu + ')*(' + N + '))').toString();
    li('Multiply through by $\\mu$: $M = ' + T(M) + '$, $N = ' + T(N) + '$; now it is exact.');
  } else li('They are equal, so the equation is exact.');
  K.$('kind').innerHTML = '<span class="sim-tag">Exact</span>';
  var psi = integ(M, 'x'); if (psi === null) { li('$\\int M\\,dx$ has no elementary form.'); return; }
  li('$\\psi = \\int M\\,dx = ' + T(psi) + ' + h(y)$.');
  var hp = nerdamer('simplify((' + N + ')-(' + d(psi, 'y') + '))').toString();
  li("$h'(y) = N - \\psi_y = " + T(hp) + '$.');
  var hy = hp === '0' ? '0' : integ(hp, 'y'); if (hy === null) { li('$\\int h\'(y)\\,dy$ has no elementary form.'); return; }
  var full = nerdamer('simplify(' + psi + '+(' + hy + '))').toString();
  K.$('out').innerHTML = '$$' + T(full) + ' = C$$';
}
function rk4(f, x0, y0, x1, n) {
  var h = (x1 - x0) / n, x = x0, y = y0, pts = [[x, y]];
  for (var i = 0; i < n; i++) {
    var k1 = f(x, y), k2 = f(x + h / 2, y + h * k1 / 2), k3 = f(x + h / 2, y + h * k2 / 2), k4 = f(x + h, y + h * k3);
    y += h * (k1 + 2 * k2 + 2 * k3 + k4) / 6; x += h;
    if (!isFinite(y) || Math.abs(y) > 1e6) break; pts.push([x, y]);
  }
  return pts;
}
function run() {
  K.$('steps').innerHTML = ''; K.$('out').innerHTML = ''; K.$('kind').innerHTML = '';
  var x0 = Number(K.$('x0').value), y0 = Number(K.$('y0').value), slope;
  try {
    if (mode === 'f') { var src = K.$('f').value.trim(); slope = K.compile(src, ['x', 'y']); slope(0.3, 0.4); solveF(src); }
    else { var M = K.$('M').value.trim(), N = K.$('N').value.trim(), m = K.compile(M, ['x', 'y']), n = K.compile(N, ['x', 'y']); slope = function (x, y) { return -m(x, y) / n(x, y); }; solveE(M, N); }
  } catch (e) { K.$('out').innerHTML = '<div class="sim-err">' + e.message + '</div>'; return; }
  var right = rk4(slope, x0, y0, x0 + 4, 400), left = rk4(slope, x0, y0, x0 - 4, 400);
  var path = left.reverse().concat(right.slice(1)), ys = path.map(function (p) { return p[1]; }).filter(isFinite);
  var lo = Math.min.apply(null, ys.concat([y0 - 2])), hi = Math.max.apply(null, ys.concat([y0 + 2])), pad = (hi - lo) * 0.1;
  K.plot(K.$('plot'), { xmin: x0 - 4, xmax: x0 + 4, ymin: Math.max(lo - pad, y0 - 40), ymax: Math.min(hi + pad, y0 + 40), field: slope, paths: [path], points: [{ x: x0, y: y0, label: '(' + K.fmt(x0, 3) + ', ' + K.fmt(y0, 3) + ')' }] });
}
function setMode(m) { mode = m; K.$('t-f').classList.toggle('on', m === 'f'); K.$('t-e').classList.toggle('on', m === 'e'); K.$('row-f').style.display = m === 'f' ? '' : 'none'; K.$('row-e').style.display = m === 'e' ? '' : 'none'; run(); }
K.$('t-f').onclick = function () { setMode('f'); }; K.$('t-e').onclick = function () { setMode('e'); };
K.examples('ex', [
  { label: "y' = xy (separable)", mode: 'f', f: 'x*y', x0: 0, y0: 1 },
  { label: "y' + 2y = e^x (linear)", mode: 'f', f: 'e^x-2*y', x0: 0, y0: 1 },
  { label: "y' = y/x + x (linear)", mode: 'f', f: 'y/x+x', x0: 1, y0: 1 },
  { label: "y' = (x²+y²)/(xy) (homogeneous)", mode: 'f', f: '(x^2+y^2)/(x*y)', x0: 1, y0: 1 },
  { label: '(2xy+3)dx + (x²−1)dy = 0 (exact)', mode: 'e', M: '2*x*y+3', N: 'x^2-1', x0: 0, y0: 1 },
  { label: 'y dx − x dy = 0 (integrating factor)', mode: 'e', M: 'y', N: '-x', x0: 1, y0: 2 },
], function (ex) { if (ex.f) K.$('f').value = ex.f; if (ex.M) { K.$('M').value = ex.M; K.$('N').value = ex.N; } K.$('x0').value = ex.x0; K.$('y0').value = ex.y0; setMode(ex.mode); });
K.on(['f', 'M', 'N', 'x0', 'y0'], K.debounce(run, 350));
window.addEventListener('load', run);
</script>`,
};

export const secondOrderOde = {
  id: 'ode-second-order',
  title: 'Second-order linear ODE solver',
  topics: /second.order|higher.order|characteristic equation|constant coefficients|non.?homogeneous|variation of parameter|undetermined coefficient/,
  code: HEAD + String.raw`
<div class="sim-grid">
<div class="m-card sim-grid">
  <div class="m-label">$a\,y'' + b\,y' + c\,y = g(x)$</div>
  <div class="sim-row"><label>$a$<input id="a" type="number" value="1" step="any"></label><label>$b$<input id="b" type="number" value="-3" step="any"></label><label>$c$<input id="c" type="number" value="2" step="any"></label></div>
  <div class="sim-row"><label>$g(x)$ (0 for homogeneous)<input id="g" type="text" value="e^(3*x)"></label></div>
  <div class="sim-row"><label>$y(0)$<input id="y0" type="number" value="1" step="any"></label><label>$y'(0)$<input id="v0" type="number" value="0" step="any"></label></div>
  <div class="sim-examples" id="ex"></div>
</div>
<div class="m-card"><div id="kind"></div><div id="out" class="sim-out"></div><ol id="steps" class="sim-steps"></ol></div>
<div class="m-card"><canvas id="plot" class="sim-plot"></canvas><div class="m-muted" style="font-size:12px;margin-top:6px">The solution with your initial conditions (Runge–Kutta 4).</div></div>
</div>
<script>
function li(h) { var el = document.createElement('li'); el.innerHTML = h; K.$('steps').appendChild(el); }
function num(v) { return K.fmt(v, 6); }
/** e^{rx} exponent without the 1 in 1x. */
function ex(r) { return r === 1 ? 'x' : r === -1 ? '-x' : num(r) + 'x'; }
function run() {
  K.$('steps').innerHTML = ''; K.$('out').innerHTML = ''; K.$('kind').innerHTML = '';
  var a = Number(K.$('a').value), b = Number(K.$('b').value), c = Number(K.$('c').value), gs = K.$('g').value.trim() || '0';
  if (!a) { K.$('out').innerHTML = '<div class="sim-err">$a$ cannot be 0 for a second-order equation.</div>'; return; }
  var g; try { g = K.compile(gs); g(0.2); } catch (e) { K.$('out').innerHTML = '<div class="sim-err">' + e.message + '</div>'; return; }
  var disc = b * b - 4 * a * c, y1, y2, yh, kind;
  li('Characteristic equation: $' + num(a) + 'r^2 ' + (b < 0 ? '-' : '+') + ' ' + num(Math.abs(b)) + 'r ' + (c < 0 ? '-' : '+') + ' ' + num(Math.abs(c)) + ' = 0$, discriminant $' + num(disc) + '$.');
  if (disc > 1e-12) {
    var r1 = (-b + Math.sqrt(disc)) / (2 * a), r2 = (-b - Math.sqrt(disc)) / (2 * a); kind = 'Distinct real roots';
    y1 = 'e^(' + num(r1) + '*x)'; y2 = 'e^(' + num(r2) + '*x)';
    li('Roots $r_1 = ' + num(r1) + '$, $r_2 = ' + num(r2) + '$ (distinct, real).');
    yh = 'C_1 e^{' + ex(r1) + '} + C_2 e^{' + ex(r2) + '}';
  } else if (Math.abs(disc) <= 1e-12) {
    var r = -b / (2 * a); kind = 'Repeated root';
    y1 = 'e^(' + num(r) + '*x)'; y2 = 'x*e^(' + num(r) + '*x)';
    li('Repeated root $r = ' + num(r) + '$: the second solution gets an extra factor $x$.');
    yh = '(C_1 + C_2 x) e^{' + ex(r) + '}';
  } else {
    var al = -b / (2 * a), be = Math.sqrt(-disc) / (2 * a); kind = 'Complex roots';
    y1 = 'e^(' + num(al) + '*x)*cos(' + num(be) + '*x)'; y2 = 'e^(' + num(al) + '*x)*sin(' + num(be) + '*x)';
    li('Complex roots $r = ' + num(al) + ' \\pm ' + num(be) + 'i$.');
    yh = (al === 0 ? '' : 'e^{' + ex(al) + '}') + '\\left(C_1 \\cos ' + ex(be) + ' + C_2 \\sin ' + ex(be) + '\\right)';
  }
  K.$('kind').innerHTML = '<span class="sim-tag">' + kind + '</span>';
  var html = '$$y_h = ' + yh + '$$';
  if (gs !== '0') {
    li('Particular solution by variation of parameters: $y_p = -y_1\\int \\frac{y_2\\,g}{aW}dx + y_2\\int \\frac{y_1\\,g}{aW}dx$, with $W = y_1 y_2\' - y_1\' y_2$.');
    try {
      var W = nerdamer('simplify(' + y1 + '*diff(' + y2 + ',x)-diff(' + y1 + ',x)*' + y2 + ')').toString();
      li('$W = ' + K.tex(W) + '$.');
      var I1 = K.integrate('(' + y2 + ')*(' + gs + ')/(' + a + '*(' + W + '))'), I2 = K.integrate('(' + y1 + ')*(' + gs + ')/(' + a + '*(' + W + '))');
      if (I1 && I2) {
        var yp = nerdamer('simplify(-(' + y1 + ')*(' + I1.toString() + ')+(' + y2 + ')*(' + I2.toString() + '))').toString();
        html += '$$y_p = ' + K.tex(yp) + '$$$$y = y_h + y_p$$';
      } else { li('The integrals have no elementary form here; the numeric solution below still includes $g(x)$.'); html += '$$y = y_h + y_p$$'; }
    } catch (e) { li('MoeAI could not finish the symbolic integrals; the numeric solution below still includes $g(x)$.'); }
  }
  K.$('out').innerHTML = html;
  // y'' = (g - b y' - c y) / a, integrated forward and backward from x = 0.
  function step(dir) {
    var h = 0.01 * dir, x = 0, y = Number(K.$('y0').value), v = Number(K.$('v0').value), pts = [[0, y]];
    function acc(x, y, v) { return (g(x) - b * v - c * y) / a; }
    for (var i = 0; i < 600; i++) {
      var k1y = v, k1v = acc(x, y, v), k2y = v + h * k1v / 2, k2v = acc(x + h / 2, y + h * k1y / 2, v + h * k1v / 2);
      var k3y = v + h * k2v / 2, k3v = acc(x + h / 2, y + h * k2y / 2, v + h * k2v / 2), k4y = v + h * k3v, k4v = acc(x + h, y + h * k3y, v + h * k3v);
      y += h * (k1y + 2 * k2y + 2 * k3y + k4y) / 6; v += h * (k1v + 2 * k2v + 2 * k3v + k4v) / 6; x += h;
      if (!isFinite(y) || Math.abs(y) > 1e6) break; pts.push([x, y]);
    }
    return pts;
  }
  var path = step(-1).reverse().concat(step(1).slice(1)), ys = path.map(function (p) { return p[1]; });
  var lo = Math.min.apply(null, ys), hi = Math.max.apply(null, ys), pad = (hi - lo) * 0.1 + 0.1;
  K.plot(K.$('plot'), { xmin: -6, xmax: 6, ymin: Math.max(lo - pad, -50), ymax: Math.min(hi + pad, 50), paths: [path], points: [{ x: 0, y: Number(K.$('y0').value), label: 'y(0)' }] });
}
K.examples('ex', [
  { label: "y'' − 3y' + 2y = e^{3x}", a: 1, b: -3, c: 2, g: 'e^(3*x)', y0: 1, v0: 0 },
  { label: "y'' + 4y = 0 (oscillation)", a: 1, b: 0, c: 4, g: '0', y0: 1, v0: 0 },
  { label: "y'' + 2y' + y = 0 (repeated)", a: 1, b: 2, c: 1, g: '0', y0: 1, v0: 0 },
  { label: "y'' + 2y' + 5y = 0 (damped)", a: 1, b: 2, c: 5, g: '0', y0: 1, v0: 0 },
  { label: "y'' + y = tan x (var. of parameters)", a: 1, b: 0, c: 1, g: 'tan(x)', y0: 0, v0: 0 },
  { label: "y'' − y = x²", a: 1, b: 0, c: -1, g: 'x^2', y0: 0, v0: 0 },
], function (ex) { ['a', 'b', 'c', 'g', 'y0', 'v0'].forEach(function (k) { K.$(k).value = ex[k]; }); run(); });
K.on(['a', 'b', 'c', 'g', 'y0', 'v0'], K.debounce(run, 350));
window.addEventListener('load', run);
</script>`,
};

export const odeSystem = {
  id: 'ode-system',
  title: 'Systems of ODEs: phase portrait',
  topics: /system(s)? of (linear )?(differential equations|odes?)|phase (plane|portrait)|eigenvalue/,
  code: HEAD + String.raw`
<div class="sim-grid">
<div class="m-card sim-grid">
  <div class="m-label">$\begin{pmatrix} x' \\ y' \end{pmatrix} = A \begin{pmatrix} x \\ y \end{pmatrix}$</div>
  <div class="sim-row"><label>$a_{11}$<input id="a" type="number" value="0" step="any"></label><label>$a_{12}$<input id="b" type="number" value="1" step="any"></label></div>
  <div class="sim-row"><label>$a_{21}$<input id="c" type="number" value="-2" step="any"></label><label>$a_{22}$<input id="d" type="number" value="-1" step="any"></label></div>
  <div class="sim-examples" id="ex"></div>
</div>
<div class="m-card"><div id="kind"></div><div id="out" class="sim-out"></div></div>
<div class="m-card"><canvas id="plot" class="sim-plot" style="height:320px"></canvas><div class="m-muted" style="font-size:12px;margin-top:6px">Tap the plot to start a trajectory there.</div></div>
</div>
<script>
var extra = [];
function run() {
  var a = Number(K.$('a').value), b = Number(K.$('b').value), c = Number(K.$('c').value), d = Number(K.$('d').value);
  var tr = a + d, det = a * d - b * c, disc = tr * tr - 4 * det, kind, html = '';
  html += '$$\\lambda^2 - (' + K.fmt(tr) + ')\\lambda + (' + K.fmt(det) + ') = 0$$';
  if (disc > 1e-12) {
    var l1 = (tr + Math.sqrt(disc)) / 2, l2 = (tr - Math.sqrt(disc)) / 2;
    kind = l1 * l2 < 0 ? 'Saddle (unstable)' : l1 < 0 ? 'Stable node' : 'Unstable node';
    function vec(l) { return Math.abs(b) > 1e-12 ? [b, l - a] : Math.abs(c) > 1e-12 ? [l - d, c] : (Math.abs(l - a) < 1e-12 ? [1, 0] : [0, 1]); }
    var v1 = vec(l1), v2 = vec(l2);
    html += '$$\\lambda_1 = ' + K.fmt(l1) + ',\\ v_1 = \\begin{pmatrix}' + K.fmt(v1[0]) + '\\\\' + K.fmt(v1[1]) + '\\end{pmatrix} \\qquad \\lambda_2 = ' + K.fmt(l2) + ',\\ v_2 = \\begin{pmatrix}' + K.fmt(v2[0]) + '\\\\' + K.fmt(v2[1]) + '\\end{pmatrix}$$';
    html += '$$\\mathbf{x}(t) = C_1 e^{' + K.fmt(l1) + 't} v_1 + C_2 e^{' + K.fmt(l2) + 't} v_2$$';
  } else if (Math.abs(disc) <= 1e-12) {
    var l = tr / 2; kind = l < 0 ? 'Stable (degenerate) node' : l > 0 ? 'Unstable (degenerate) node' : 'Degenerate';
    html += '$$\\lambda = ' + K.fmt(l) + '\\ \\text{(repeated)}$$';
  } else {
    var al = tr / 2, be = Math.sqrt(-disc) / 2;
    kind = Math.abs(al) < 1e-12 ? 'Center (closed orbits)' : al < 0 ? 'Stable spiral' : 'Unstable spiral';
    html += '$$\\lambda = ' + K.fmt(al) + ' \\pm ' + K.fmt(be) + 'i$$';
  }
  K.$('kind').innerHTML = '<span class="sim-tag">' + kind + '</span>';
  K.$('out').innerHTML = html;
  function traj(x, y, dir) { var pts = [[x, y]], h = 0.02 * dir; for (var i = 0; i < 500; i++) { var dx = a * x + b * y, dy = c * x + d * y, mx = x + h / 2 * dx, my = y + h / 2 * dy; x += h * (a * mx + b * my); y += h * (c * mx + d * my); if (Math.abs(x) > 50 || Math.abs(y) > 50) break; pts.push([x, y]); } return pts; }
  var starts = [];
  for (var i = 0; i < 12; i++) { var t = i / 12 * Math.PI * 2; starts.push([3 * Math.cos(t), 3 * Math.sin(t)]); }
  starts = starts.concat(extra);
  var paths = [];
  starts.forEach(function (s) { var p = traj(s[0], s[1], -1).reverse().concat(traj(s[0], s[1], 1).slice(1)); p.color = K.color(1); p.width = 1.5; paths.push(p); });
  K.plot(K.$('plot'), { xmin: -4, xmax: 4, ymin: -4, ymax: 4, paths: paths, field: function (x, y) { return (c * x + d * y) / (a * x + b * y); }, points: [{ x: 0, y: 0 }] });
}
K.$('plot').addEventListener('click', function (e) { var r = e.target.getBoundingClientRect(); extra.push([-4 + 8 * (e.clientX - r.left) / r.width, 4 - 8 * (e.clientY - r.top) / r.height]); run(); });
K.examples('ex', [
  { label: 'Stable spiral', a: 0, b: 1, c: -2, d: -1 },
  { label: 'Center', a: 0, b: 1, c: -1, d: 0 },
  { label: 'Saddle', a: 1, b: 0, c: 0, d: -1 },
  { label: 'Stable node', a: -2, b: 1, c: 1, d: -2 },
  { label: 'Unstable node', a: 2, b: 1, c: 0, d: 3 },
], function (ex) { ['a', 'b', 'c', 'd'].forEach(function (k) { K.$(k).value = ex[k]; }); extra = []; run(); });
K.on(['a', 'b', 'c', 'd'], K.debounce(run, 250));
window.addEventListener('load', run);
</script>`,
};

export const ODE_SIMS = [firstOrderOde, secondOrderOde, odeSystem];
