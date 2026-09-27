/**
 * Linear algebra simulators, in exact fractions (no 0.333333):
 * a matrix calculator (sum, product, scalar multiple, transpose, symmetric /
 * skew-symmetric check, determinant, rank, and the inverse by Gauss–Jordan
 * with every row operation shown), and a linear system solver that row
 * reduces the augmented matrix and reads off a unique, infinite (parametric)
 * or empty solution set.
 */
import { KIT } from './kit';

const FRACTIONS = String.raw`<script>
function gcd(a, b) { a = Math.abs(a); b = Math.abs(b); while (b) { var t = b; b = a % b; a = t; } return a || 1; }
function Q(n, d) { if (d === undefined) d = 1; if (d < 0) { n = -n; d = -d; } var g = gcd(n, d); return { n: n / g, d: d / g }; }
function qParse(s) {
  s = String(s).trim(); if (!s) return Q(0);
  var m = s.match(/^(-?\d+)\s*\/\s*(\d+)$/); if (m) return Q(Number(m[1]), Number(m[2]));
  var x = Number(s); if (!isFinite(x)) throw new Error('"' + s + '" is not a number');
  var d = 1; while (Math.abs(x * d - Math.round(x * d)) > 1e-9 && d < 1e6) d *= 10; return Q(Math.round(x * d), d);
}
function add(a, b) { return Q(a.n * b.d + b.n * a.d, a.d * b.d); }
function sub(a, b) { return Q(a.n * b.d - b.n * a.d, a.d * b.d); }
function mul(a, b) { return Q(a.n * b.n, a.d * b.d); }
function div(a, b) { if (!b.n) throw new Error('division by zero'); return Q(a.n * b.d, a.d * b.n); }
function isZ(a) { return a.n === 0; }
function eq(a, b) { return a.n === b.n && a.d === b.d; }
function qt(a) { return a.d === 1 ? String(a.n) : (a.n < 0 ? '-' : '') + '\\tfrac{' + Math.abs(a.n) + '}{' + a.d + '}'; }
function mt(M, aug) {
  var cols = M[0].length, spec = aug ? 'c'.repeat(cols - 1) + '|c' : 'c'.repeat(cols);
  return '\\left(\\begin{array}{' + spec + '}' + M.map(function (r) { return r.map(qt).join(' & '); }).join(' \\\\ ') + '\\end{array}\\right)';
}
function readMatrix(text) {
  var rows = String(text).trim().split(/\n|;/).map(function (r) { return r.trim(); }).filter(Boolean).map(function (r) { return r.split(/[\s,]+/).filter(Boolean).map(qParse); });
  if (!rows.length) throw new Error('Enter at least one row');
  var w = rows[0].length; rows.forEach(function (r, i) { if (r.length !== w) throw new Error('Row ' + (i + 1) + ' has ' + r.length + ' entries, row 1 has ' + w); });
  return rows;
}
function copy(M) { return M.map(function (r) { return r.slice(); }); }
/** Row reduce to RREF, recording each operation. */
function rref(M, cols, log) {
  M = copy(M); var rows = M.length, lead = 0, pivots = [];
  for (var c = 0; c < cols && lead < rows; c++) {
    var p = -1; for (var r = lead; r < rows; r++) if (!isZ(M[r][c])) { p = r; break; }
    if (p < 0) continue;
    if (p !== lead) { var t = M[p]; M[p] = M[lead]; M[lead] = t; log && log('R_{' + (lead + 1) + '} \\leftrightarrow R_{' + (p + 1) + '}', M); }
    var pv = M[lead][c];
    if (!eq(pv, Q(1))) { M[lead] = M[lead].map(function (x) { return div(x, pv); }); log && log('R_{' + (lead + 1) + '} \\to ' + (pv.d === 1 && pv.n === -1 ? '-' : '\\left(' + qt(div(Q(1), pv)) + '\\right)') + 'R_{' + (lead + 1) + '}', M); }
    for (var r2 = 0; r2 < rows; r2++) {
      if (r2 === lead || isZ(M[r2][c])) continue;
      var k = M[r2][c];
      M[r2] = M[r2].map(function (x, j) { return sub(x, mul(k, M[lead][j])); });
      log && log('R_{' + (r2 + 1) + '} \\to R_{' + (r2 + 1) + '} ' + (k.n > 0 ? '-' : '+') + ' ' + (eq(Q(Math.abs(k.n), k.d), Q(1)) ? '' : qt(Q(Math.abs(k.n), k.d))) + 'R_{' + (lead + 1) + '}', M);
    }
    pivots.push(c); lead++;
  }
  return { M: M, pivots: pivots };
}
function det(M) {
  var n = M.length; if (n !== M[0].length) throw new Error('Determinant needs a square matrix');
  var A = copy(M), s = Q(1);
  for (var c = 0; c < n; c++) {
    var p = -1; for (var r = c; r < n; r++) if (!isZ(A[r][c])) { p = r; break; }
    if (p < 0) return Q(0);
    if (p !== c) { var t = A[p]; A[p] = A[c]; A[c] = t; s = mul(s, Q(-1)); }
    s = mul(s, A[c][c]);
    for (var r2 = c + 1; r2 < n; r2++) { var k = div(A[r2][c], A[c][c]); A[r2] = A[r2].map(function (x, j) { return sub(x, mul(k, A[c][j])); }); }
  }
  return s;
}
</script>`;

export const matrixCalculator = {
  id: 'matrix-calculator',
  title: 'Matrix calculator',
  topics: /matri(x|ces)|transpose|symmetric|inverse|determinant|gauss|linear algebra/,
  code: KIT + FRACTIONS + String.raw`
<div class="sim-grid">
<div class="m-card sim-grid">
  <div class="sim-row">
    <label>Matrix $A$ (one row per line)<textarea id="A" rows="3" style="font:14px ui-monospace,monospace">2 1
5 3</textarea></label>
    <label>Matrix $B$<textarea id="B" rows="3" style="font:14px ui-monospace,monospace">1 0
-1 4</textarea></label>
  </div>
  <div class="sim-tabs" id="ops"></div>
  <div class="sim-row"><label>Scalar $k$<input id="k" type="text" value="3"></label></div>
</div>
<div class="m-card"><div id="out" class="sim-out"></div><ol id="steps" class="sim-steps"></ol></div>
</div>
<script>
var OPS = [['inv', 'A⁻¹ (Gauss–Jordan)'], ['inv2', 'A⁻¹ (2×2 formula)'], ['det', 'det A'], ['T', 'Aᵀ'], ['sym', 'Symmetric?'], ['add', 'A + B'], ['mul', 'AB'], ['mulT', '(AB)ᵀ = BᵀAᵀ'], ['k', 'kA'], ['rank', 'rank A']];
var op = 'inv';
function li(h) { var el = document.createElement('li'); el.innerHTML = h; K.$('steps').appendChild(el); }
function matmul(A, B) { if (A[0].length !== B.length) throw new Error('AB needs columns of A = rows of B (' + A[0].length + ' vs ' + B.length + ')'); return A.map(function (r) { return B[0].map(function (_, j) { return r.reduce(function (s, x, k) { return add(s, mul(x, B[k][j])); }, Q(0)); }); }); }
function tr(A) { return A[0].map(function (_, j) { return A.map(function (r) { return r[j]; }); }); }
function run() {
  K.$('steps').innerHTML = ''; var out = K.$('out');
  try {
    var A = readMatrix(K.$('A').value), B = null; try { B = readMatrix(K.$('B').value); } catch (e) {}
    var n = A.length, html = '';
    if (op === 'inv') {
      if (n !== A[0].length) throw new Error('Only square matrices have inverses');
      var aug = A.map(function (r, i) { return r.concat(A.map(function (_, j) { return Q(i === j ? 1 : 0); })); });
      li('Augment with the identity: $' + mt(aug, true) + '$');
      var res = rref(aug, n, function (opTex, M) { li('$' + opTex + '$: $' + mt(M, true) + '$'); });
      var left = res.M.map(function (r) { return r.slice(0, n); }), ok = left.every(function (r, i) { return r.every(function (x, j) { return eq(x, Q(i === j ? 1 : 0)); }); });
      if (!ok) html = '$$\\det A = 0 \\Rightarrow A \\text{ is singular (no inverse)}$$';
      else html = '$$A^{-1} = ' + mt(res.M.map(function (r) { return r.slice(n); })) + '$$';
    } else if (op === 'inv2') {
      if (n !== 2 || A[0].length !== 2) throw new Error('The adjugate formula here is for 2×2 matrices');
      var D = sub(mul(A[0][0], A[1][1]), mul(A[0][1], A[1][0]));
      li('$\\det A = ad - bc = ' + qt(D) + '$');
      if (isZ(D)) html = '$$\\det A = 0 \\Rightarrow \\text{no inverse}$$';
      else { var adj = [[A[1][1], mul(Q(-1), A[0][1])], [mul(Q(-1), A[1][0]), A[0][0]]]; li('Swap $a$ and $d$, negate $b$ and $c$: $\\operatorname{adj} A = ' + mt(adj) + '$'); html = '$$A^{-1} = \\frac{1}{' + qt(D) + '}' + mt(adj) + ' = ' + mt(adj.map(function (r) { return r.map(function (x) { return div(x, D); }); })) + '$$'; }
    } else if (op === 'det') {
      html = '$$\\det A = ' + qt(det(A)) + '$$'; li('Computed by row reduction to upper-triangular form: the product of the pivots, with a sign change per row swap.');
    } else if (op === 'T') {
      html = '$$A^T = ' + mt(tr(A)) + '$$'; li('Row $i$ of $A$ becomes column $i$ of $A^T$.');
    } else if (op === 'sym') {
      var T = tr(A), sym = n === A[0].length && A.every(function (r, i) { return r.every(function (x, j) { return eq(x, T[i][j]); }); }), skew = n === A[0].length && A.every(function (r, i) { return r.every(function (x, j) { return eq(x, mul(Q(-1), T[i][j])); }); });
      html = '$$A^T = ' + mt(T) + '$$<div><span class="sim-tag">' + (sym ? 'Symmetric: A = Aᵀ' : skew ? 'Skew-symmetric: A = −Aᵀ' : 'Neither symmetric nor skew-symmetric') + '</span></div>';
      if (n === A[0].length) { var S = A.map(function (r, i) { return r.map(function (x, j) { return div(add(x, T[i][j]), Q(2)); }); }), Kk = A.map(function (r, i) { return r.map(function (x, j) { return div(sub(x, T[i][j]), Q(2)); }); }); html += '$$A = \\underbrace{' + mt(S) + '}_{\\frac{A + A^T}{2}} + \\underbrace{' + mt(Kk) + '}_{\\frac{A - A^T}{2}}$$'; li('Every square matrix splits into a symmetric part and a skew-symmetric part.'); }
    } else if (op === 'add') {
      if (!B) throw new Error('Enter B'); if (B.length !== n || B[0].length !== A[0].length) throw new Error('A and B must be the same size');
      html = '$$A + B = ' + mt(A.map(function (r, i) { return r.map(function (x, j) { return add(x, B[i][j]); }); })) + '$$';
    } else if (op === 'mul') {
      if (!B) throw new Error('Enter B'); var P = matmul(A, B); html = '$$AB = ' + mt(P) + '$$'; li('Entry $(i, j)$ is row $i$ of $A$ dotted with column $j$ of $B$.');
      if (B.length === B[0].length && n === A[0].length && n === B.length) { var P2 = matmul(B, A), same = P.every(function (r, i) { return r.every(function (x, j) { return eq(x, P2[i][j]); }); }); html += '$$BA = ' + mt(P2) + '$$<div class="m-muted" style="font-size:12px">' + (same ? 'Here AB = BA, but in general matrix multiplication does not commute.' : 'AB ≠ BA: matrix multiplication does not commute.') + '</div>'; }
    } else if (op === 'mulT') {
      if (!B) throw new Error('Enter B'); var AB = matmul(A, B); html = '$$(AB)^T = ' + mt(tr(AB)) + ' = B^T A^T = ' + mt(matmul(tr(B), tr(A))) + '$$'; li('The transpose of a product reverses the order.');
    } else if (op === 'k') {
      var k = qParse(K.$('k').value); html = '$$' + qt(k) + 'A = ' + mt(A.map(function (r) { return r.map(function (x) { return mul(k, x); }); })) + '$$';
    } else if (op === 'rank') {
      var R = rref(A, A[0].length, function (t, M) { li('$' + t + '$: $' + mt(M) + '$'); }); html = '$$\\operatorname{rref}(A) = ' + mt(R.M) + ' \\qquad \\operatorname{rank} A = ' + R.pivots.length + '$$';
    }
    out.innerHTML = html;
  } catch (e) { out.innerHTML = '<div class="sim-err">' + e.message + '</div>'; }
}
OPS.forEach(function (o) { var b = document.createElement('button'); b.type = 'button'; b.textContent = o[1]; b.onclick = function () { op = o[0]; Array.prototype.forEach.call(K.$('ops').children, function (x) { x.classList.toggle('on', x === b); }); run(); }; if (o[0] === op) b.classList.add('on'); K.$('ops').appendChild(b); });
K.on(['A', 'B', 'k'], K.debounce(run, 300));
window.addEventListener('load', run);
</script>`,
};

export const linearSystem = {
  id: 'linear-system',
  title: 'Linear system solver',
  topics: /linear system|system of (linear )?equations|gauss(ian)?.?(jordan|elimination)|homogeneous system|matrix equation|augmented/,
  code: KIT + FRACTIONS + String.raw`
<div class="sim-grid">
<div class="m-card sim-grid">
  <label class="m-label">Augmented matrix $[A \mid b]$: one equation per line, the last number is the right-hand side
  <textarea id="M" rows="4" style="font:14px ui-monospace,monospace;margin-top:6px">1 1 1 6
0 2 5 -4
2 5 -1 27</textarea></label>
  <div class="sim-examples" id="ex"></div>
</div>
<div class="m-card"><div id="kind"></div><div id="out" class="sim-out"></div><ol id="steps" class="sim-steps"></ol></div>
</div>
<script>
function li(h) { var el = document.createElement('li'); el.innerHTML = h; K.$('steps').appendChild(el); }
function run() {
  K.$('steps').innerHTML = ''; var out = K.$('out'), kind = K.$('kind');
  try {
    var M = readMatrix(K.$('M').value), n = M[0].length - 1; if (n < 1) throw new Error('Each line needs coefficients and a right-hand side');
    var names = n <= 4 ? ['x', 'y', 'z', 'w'].slice(0, n) : Array.from({ length: n }, function (_, i) { return 'x_{' + (i + 1) + '}'; });
    var homogeneous = M.every(function (r) { return isZ(r[n]); });
    li('Start: $' + mt(M, true) + '$' + (homogeneous ? ' (homogeneous: $b = 0$, so $x = 0$ is always a solution)' : ''));
    var R = rref(M, n, function (t, X) { li('$' + t + '$: $' + mt(X, true) + '$'); });
    var bad = R.M.some(function (r) { return r.slice(0, n).every(isZ) && !isZ(r[n]); });
    if (bad) { kind.innerHTML = '<span class="sim-tag">No solution (inconsistent)</span>'; out.innerHTML = '$$\\text{A row reads } 0 = c \\neq 0.$$'; return; }
    var free = names.map(function (_, j) { return R.pivots.indexOf(j) < 0; });
    var params = {}, t = 0, letters = ['t', 's', 'u', 'v'];
    free.forEach(function (f, j) { if (f) params[j] = letters[t++] || 't_{' + t + '}'; });
    var lines = names.map(function (name, j) {
      if (free[j]) return name + ' = ' + params[j];
      var row = R.M[R.pivots.indexOf(j)], expr = qt(row[n]) === '0' ? '' : qt(row[n]);
      free.forEach(function (f, k) { if (f && !isZ(row[k])) { var c = mul(Q(-1), row[k]); expr += (c.n < 0 ? ' - ' : (expr ? ' + ' : '')) + (eq(Q(Math.abs(c.n), c.d), Q(1)) ? '' : qt(Q(Math.abs(c.n), c.d))) + params[k]; } });
      return name + ' = ' + (expr || '0');
    });
    var count = Object.keys(params).length;
    kind.innerHTML = '<span class="sim-tag">' + (count ? 'Infinitely many solutions (' + count + ' free variable' + (count > 1 ? 's' : '') + ')' : homogeneous ? 'Only the trivial solution' : 'Unique solution') + '</span>';
    out.innerHTML = '$$\\begin{aligned}' + lines.map(function (l) { return l.replace('=', '&='); }).join(' \\\\ ') + '\\end{aligned}$$' + (count ? '<div class="m-muted" style="font-size:12px">' + Object.values(params).join(', ') + ' can be any real number.</div>' : '');
  } catch (e) { out.innerHTML = '<div class="sim-err">' + e.message + '</div>'; kind.innerHTML = ''; }
}
K.examples('ex', [
  { label: 'Unique (3×3)', m: '1 1 1 6\n0 2 5 -4\n2 5 -1 27' },
  { label: 'Infinitely many', m: '1 2 -1 3\n2 4 -2 6\n1 0 1 1' },
  { label: 'No solution', m: '1 1 2\n1 1 3' },
  { label: 'Homogeneous', m: '1 2 3 0\n4 5 6 0\n7 8 9 0' },
], function (ex) { K.$('M').value = ex.m; run(); });
K.on(['M'], K.debounce(run, 300));
window.addEventListener('load', run);
</script>`,
};

export const LINEAR_SIMS = [matrixCalculator, linearSystem];
