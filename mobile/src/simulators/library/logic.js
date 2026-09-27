/**
 * Logic design simulators: a Karnaugh map simplifier (Quine–McCluskey with a
 * minimal cover, groups drawn on the map), a number systems workbench (bases,
 * fractions, signed representations, BCD, Gray, ASCII, parity, with the
 * division/multiplication steps), combinational building blocks (adders,
 * decoder, multiplexer) and flip-flops with a live timing diagram.
 */
import { KIT } from './kit';

export const kmap = {
  id: 'kmap',
  title: 'Karnaugh map simplifier',
  topics: /karnaugh|k.?map|simplif|minterm|maxterm|sum of products|product of sums|canonical|boolean/,
  code: KIT + String.raw`
<div class="sim-grid">
<div class="m-card sim-grid">
  <div class="sim-row">
    <label>Variables<select id="n"><option>2</option><option>3</option><option selected>4</option></select></label>
    <label>Minterms $\sum m$<input id="mins" type="text" value="0,2,5,7,8,10,13,15"></label>
    <label>Don't cares $d$<input id="dc" type="text" value=""></label>
  </div>
  <div class="m-muted" style="font-size:12px">Tap a cell to cycle 0 → 1 → X (don't care).</div>
</div>
<div class="m-card"><div id="map" style="overflow-x:auto"></div></div>
<div class="m-card"><div id="out" class="sim-out"></div><ol id="steps" class="sim-steps"></ol></div>
</div>
<style>
.km{border-collapse:collapse;margin:0 auto;font:14px ui-monospace,monospace}
.km td,.km th{width:52px;height:44px;text-align:center;position:relative}
.km th{color:var(--m-muted);font-size:12px;font-weight:700}
.km td.c{background:var(--m-surface-2);border-radius:8px;cursor:pointer;font-weight:800;border:2px solid var(--m-bg)}
.km td.c.one{color:var(--m-text)} .km td.c.zero{color:var(--m-muted)} .km td.c.x{color:#EDC645}
.km td .dot{position:absolute;bottom:3px;right:5px;font-size:10px;color:var(--m-muted);font-weight:400}
.km td .grp{position:absolute;inset:3px;border-radius:9px;border:2.5px solid;pointer-events:none}
</style>
<script>
var V = ['A', 'B', 'C', 'D'];
function gray(k) { return k === 1 ? ['0', '1'] : ['00', '01', '11', '10']; }
function parseList(s) { return String(s).split(/[\s,]+/).filter(Boolean).map(Number).filter(function (x) { return Number.isInteger(x) && x >= 0; }); }
function bits(m, n) { return m.toString(2).padStart(n, '0'); }
function combine(a, b) { var diff = 0, out = ''; for (var i = 0; i < a.length; i++) { if (a[i] !== b[i]) { if (a[i] === '-' || b[i] === '-') return null; diff++; out += '-'; } else out += a[i]; } return diff === 1 ? out : null; }
function covers(imp, m, n) { var b = bits(m, n); for (var i = 0; i < n; i++) if (imp[i] !== '-' && imp[i] !== b[i]) return false; return true; }
function primes(terms, n) {
  var groups = terms.map(function (t) { return bits(t, n); }), all = [], used;
  while (groups.length) {
    used = new Set(); var next = new Set();
    for (var i = 0; i < groups.length; i++) for (var j = i + 1; j < groups.length; j++) { var c = combine(groups[i], groups[j]); if (c) { next.add(c); used.add(groups[i]); used.add(groups[j]); } }
    groups.forEach(function (g) { if (!used.has(g) && all.indexOf(g) < 0) all.push(g); });
    groups = Array.from(next);
  }
  return all;
}
/** Minimal cover: essentials first, then the fewest (and cheapest) extra primes by search. */
function cover(pis, mins, n) {
  var chosen = [], left = mins.slice();
  mins.forEach(function (m) { var who = pis.filter(function (p) { return covers(p, m, n); }); if (who.length === 1 && chosen.indexOf(who[0]) < 0) chosen.push(who[0]); });
  left = left.filter(function (m) { return !chosen.some(function (p) { return covers(p, m, n); }); });
  var rest = pis.filter(function (p) { return chosen.indexOf(p) < 0; }), best = null;
  function cost(set) { return set.length * 100 + set.reduce(function (s, p) { return s + p.replace(/-/g, '').length; }, 0); }
  (function search(i, pick) {
    if (best && cost(pick) >= cost(best)) return;
    if (left.every(function (m) { return pick.some(function (p) { return covers(p, m, n); }); })) { best = pick.slice(); return; }
    if (i >= rest.length) return;
    search(i + 1, pick.concat([rest[i]])); search(i + 1, pick);
  })(0, []);
  return { essential: chosen, extra: best || [] };
}
function term(imp, pos) {
  var parts = [];
  for (var i = 0; i < imp.length; i++) { if (imp[i] === '-') continue; var one = imp[i] === '1'; parts.push(pos ? (one ? V[i] + "'" : V[i]) : (one ? V[i] : V[i] + "'")); }
  if (!parts.length) return pos ? '0' : '1';
  return pos ? '(' + parts.join(' + ') + ')' : parts.join('');
}
function texTerm(t) { return t.replace(/([A-D])'/g, '\\overline{$1}'); }
var cells = {};
function state() { var n = Number(K.$('n').value), mins = parseList(K.$('mins').value), dc = parseList(K.$('dc').value), max = 1 << n; mins = mins.filter(function (m) { return m < max; }); dc = dc.filter(function (m) { return m < max && mins.indexOf(m) < 0; }); return { n: n, mins: mins, dc: dc }; }
function run() {
  var s = state(), n = s.n, steps = K.$('steps'); steps.innerHTML = '';
  var rv = n === 2 ? 1 : n === 3 ? 1 : 2, cv = n - rv, rows = gray(rv), cols = gray(cv);
  var pis = primes(s.mins.concat(s.dc).sort(function (a, b) { return a - b; }), n);
  var sol = s.mins.length ? cover(pis, s.mins, n) : { essential: [], extra: [] }, picked = sol.essential.concat(sol.extra);
  var zeros = []; for (var m = 0; m < (1 << n); m++) if (s.mins.indexOf(m) < 0 && s.dc.indexOf(m) < 0) zeros.push(m);
  var pisPos = primes(zeros.concat(s.dc).sort(function (a, b) { return a - b; }), n), solPos = zeros.length ? cover(pisPos, zeros, n) : { essential: [], extra: [] }, pickedPos = solPos.essential.concat(solPos.extra);
  var colors = ['#EB6674', '#38C9DB', '#EDC645', '#A5D64A', '#E464D2', '#8766EB', '#F2856D', '#93A3BA'];
  var html = '<table class="km"><tr><th>' + V.slice(0, rv).join('') + '\\' + V.slice(rv, n).join('') + '</th>' + cols.map(function (c) { return '<th>' + c + '</th>'; }).join('') + '</tr>';
  rows.forEach(function (r) {
    html += '<tr><th>' + r + '</th>';
    cols.forEach(function (c) {
      var idx = parseInt(r + c, 2), v = s.mins.indexOf(idx) >= 0 ? '1' : s.dc.indexOf(idx) >= 0 ? 'X' : '0';
      var rings = picked.map(function (p, i) { return covers(p, idx, n) ? '<span class="grp" style="border-color:' + colors[i % colors.length] + ';inset:' + (3 + i * 3) + 'px"></span>' : ''; }).join('');
      html += '<td class="c ' + (v === '1' ? 'one' : v === 'X' ? 'x' : 'zero') + '" data-i="' + idx + '">' + v + '<span class="dot">' + idx + '</span>' + rings + '</td>';
    });
    html += '</tr>';
  });
  K.$('map').innerHTML = html + '</table>';
  Array.prototype.forEach.call(document.querySelectorAll('.km td.c'), function (td) { td.onclick = function () { var i = Number(td.dataset.i), mm = parseList(K.$('mins').value), dd = parseList(K.$('dc').value); if (mm.indexOf(i) >= 0) { mm = mm.filter(function (x) { return x !== i; }); dd.push(i); } else if (dd.indexOf(i) >= 0) dd = dd.filter(function (x) { return x !== i; }); else mm.push(i); K.$('mins').value = mm.sort(function (a, b) { return a - b; }).join(','); K.$('dc').value = dd.sort(function (a, b) { return a - b; }).join(','); run(); }; });
  var sop = picked.length ? picked.map(function (p) { return term(p, false); }).join(' + ') : '0';
  var pos = !zeros.length ? '1' : pickedPos.map(function (p) { return term(p, true); }).join('');
  var vars = V.slice(0, n).join(',');
  K.$('out').innerHTML = '$$F(' + vars + ') = \\sum m(' + s.mins.join(',') + ')' + (s.dc.length ? ' + \\sum d(' + s.dc.join(',') + ')' : '') + '$$'
    + '$$\\text{SOP: } F = ' + texTerm(sop) + '$$$$\\text{POS: } F = ' + texTerm(pos) + '$$';
  var li = function (h) { var el = document.createElement('li'); el.innerHTML = h; steps.appendChild(el); };
  li('Prime implicants (largest groups of 1s and Xs, sizes 1, 2, 4, 8): ' + pis.map(function (p) { return '$' + texTerm(term(p, false)) + '$'; }).join(', '));
  if (sol.essential.length) li('Essential (the only group covering some minterm): ' + sol.essential.map(function (p) { return '$' + texTerm(term(p, false)) + '$'; }).join(', '));
  if (sol.extra.length) li('Added to cover the rest with the fewest, smallest terms: ' + sol.extra.map(function (p) { return '$' + texTerm(term(p, false)) + '$'; }).join(', '));
  li('Groups wrap around the edges: the map is a torus, and rows/columns follow Gray code (00, 01, 11, 10).');
}
K.on(['n', 'mins', 'dc'], K.debounce(run, 250));
window.addEventListener('load', run);
</script>`,
};

export const numberSystems = {
  id: 'number-systems',
  title: 'Number systems workbench',
  topics: /number system|numbering|binary|octal|hexadecimal|radix|base conversion|complement|bcd|gray code|ascii|parity|binary arithmetic/,
  code: KIT + String.raw`
<div class="sim-grid">
<div class="m-card sim-grid">
  <div class="sim-row"><label>Number<input id="v" type="text" value="45.625"></label><label>Written in base<select id="from"><option value="10" selected>10</option><option value="2">2</option><option value="8">8</option><option value="16">16</option></select></label><label>Bits (signed forms)<select id="w"><option>4</option><option selected>8</option><option>16</option></select></label></div>
  <div class="sim-examples" id="ex"></div>
</div>
<div class="m-card"><div id="out" class="sim-out"></div></div>
<div class="m-card"><div class="m-label">How the conversion works</div><ol id="steps" class="sim-steps"></ol></div>
<div class="m-card sim-grid"><div class="m-label">Binary arithmetic</div>
  <div class="sim-row"><label>$A$ (binary)<input id="a" type="text" value="1011"></label><label>Operation<select id="op"><option value="+">A + B</option><option value="-">A − B (2's complement)</option><option value="*">A × B</option></select></label><label>$B$ (binary)<input id="b" type="text" value="0110"></label></div>
  <div id="arith" class="sim-out" style="font-family:ui-monospace,monospace"></div>
</div>
</div>
<script>
var DIG = '0123456789ABCDEF';
function toBase(x, base, fracDigits) {
  var neg = x < 0; x = Math.abs(x); var ip = Math.floor(x), fp = x - ip, s = ip.toString(base).toUpperCase(), f = '';
  for (var i = 0; i < (fracDigits || 8) && fp > 1e-12; i++) { fp *= base; var d = Math.floor(fp + 1e-12); f += DIG[d]; fp -= d; }
  return (neg ? '-' : '') + s + (f ? '.' + f : '');
}
function fromBase(str, base) {
  str = String(str).trim().toUpperCase(); var neg = str[0] === '-'; if (neg) str = str.slice(1);
  var parts = str.split('.'), v = 0;
  for (var i = 0; i < parts[0].length; i++) { var d = DIG.indexOf(parts[0][i]); if (d < 0 || d >= base) throw new Error('"' + parts[0][i] + '" is not a base-' + base + ' digit'); v = v * base + d; }
  if (parts[1]) for (var j = 0; j < parts[1].length; j++) { var e = DIG.indexOf(parts[1][j]); if (e < 0 || e >= base) throw new Error('"' + parts[1][j] + '" is not a base-' + base + ' digit'); v += e / Math.pow(base, j + 1); }
  return neg ? -v : v;
}
function pad(s, w) { return s.padStart(w, '0'); }
function row(name, value, note) { return '<tr><td class="m-muted" style="padding:5px 10px 5px 0;white-space:nowrap">' + name + '</td><td style="font:600 14px ui-monospace,monospace;padding:5px 0;word-break:break-all">' + value + '</td><td class="m-muted" style="font-size:12px;padding-left:8px">' + (note || '') + '</td></tr>'; }
function run() {
  var steps = K.$('steps'); steps.innerHTML = ''; var li = function (h) { var el = document.createElement('li'); el.innerHTML = h; steps.appendChild(el); };
  try {
    var base = Number(K.$('from').value), w = Number(K.$('w').value), x = fromBase(K.$('v').value, base), n = Math.trunc(x);
    var t = '<table style="border-collapse:collapse;width:100%">';
    t += row('Decimal', String(Number(x.toFixed(10)))) + row('Binary', toBase(x, 2, 12)) + row('Octal', toBase(x, 8)) + row('Hexadecimal', toBase(x, 16));
    var lim = Math.pow(2, w - 1);
    if (Number.isInteger(x) && Math.abs(n) < lim) {
      var mag = pad(Math.abs(n).toString(2), w - 1);
      var sm = (n < 0 ? '1' : '0') + mag, ones = n < 0 ? (sm[0] + mag.split('').map(function (b) { return b === '0' ? '1' : '0'; }).join('')) : sm, twos = n < 0 ? pad(((1 << w) + n).toString(2), w) : pad(n.toString(2), w);
      t += row('Sign-magnitude (' + w + ' bits)', sm, 'sign bit, then |x|') + row("1's complement", ones, n < 0 ? 'flip every bit of +|x|' : 'same as positive') + row("2's complement", twos, n < 0 ? "1's complement + 1" : 'same as positive');
      if (n >= 0) {
        t += row('BCD', String(n).split('').map(function (d) { return pad(Number(d).toString(2), 4); }).join(' '), 'each decimal digit in 4 bits');
        var g = n ^ (n >> 1); t += row('Gray code', pad(g.toString(2), Math.max(1, n.toString(2).length)), 'b XOR (b >> 1)');
        var ones1 = n.toString(2).split('').filter(function (b) { return b === '1'; }).length;
        t += row('Parity bit', 'even: ' + (ones1 % 2) + ', odd: ' + (1 - ones1 % 2), ones1 + ' ones');
        if (n >= 32 && n < 127) t += row('ASCII', "'" + String.fromCharCode(n) + "'", '7-bit code ' + n);
      }
    } else if (Number.isInteger(x)) t += row('Signed forms', '—', 'needs more than ' + w + ' bits');
    K.$('out').innerHTML = t + '</table>';
    if (base !== 10) li('To decimal: multiply each digit by its place value $' + base + '^k$ and add: $' + K.$('v').value.toUpperCase().split('.')[0].split('').map(function (d, i, a) { return DIG.indexOf(d) + '\\cdot ' + base + '^{' + (a.length - 1 - i) + '}'; }).join(' + ') + '$.');
    var ip = Math.floor(Math.abs(x)), fp = Math.abs(x) - ip, divs = [];
    if (ip > 0) { var q = ip; while (q > 0 && divs.length < 24) { divs.push(q + ' ÷ 2 = ' + Math.floor(q / 2) + ' remainder <b>' + (q % 2) + '</b>'); q = Math.floor(q / 2); } li('Integer part to binary, repeated division by 2 (read the remainders bottom-up):<br>' + divs.join('<br>')); }
    if (fp > 1e-12) { var mults = [], f = fp; for (var i = 0; i < 8 && f > 1e-12; i++) { var p = f * 2; mults.push(K.fmt(f, 6) + ' × 2 = ' + K.fmt(p, 6) + ' → <b>' + Math.floor(p + 1e-12) + '</b>'); f = p - Math.floor(p + 1e-12); } li('Fraction part, repeated multiplication by 2 (read the integer parts top-down):<br>' + mults.join('<br>')); }
    li('Octal and hex from binary: group bits in 3s or 4s from the point outward.');
  } catch (e) { K.$('out').innerHTML = '<div class="sim-err">' + e.message + '</div>'; }
  arith();
}
function arith() {
  var box = K.$('arith');
  try {
    var A = K.$('a').value.trim(), B = K.$('b').value.trim(), op = K.$('op').value; if (!/^[01]+$/.test(A) || !/^[01]+$/.test(B)) throw new Error('A and B must be binary');
    var w = Math.max(A.length, B.length), a = parseInt(A, 2), b = parseInt(B, 2), lines;
    if (op === '+') { var s = a + b, carry = ''; var c = 0; for (var i = w - 1; i >= 0; i--) { var x = (a >> (w - 1 - i)) & 1, y = (b >> (w - 1 - i)) & 1; carry = c + carry; c = (x + y + c) >> 1; } carry = c + carry;
      lines = ['carries ' + carry, '   ' + pad(A, w), ' + ' + pad(B, w), ' ' + '─'.repeat(w + 3), '  ' + pad(s.toString(2), w + 1) + '   (' + a + ' + ' + b + ' = ' + s + ')']; }
    else if (op === '-') { var nb = ((~b) & ((1 << w) - 1)) + 1, r = (a + nb) & ((1 << w) - 1), neg = a < b;
      lines = ["2's complement of B: " + pad(nb.toString(2).slice(-w), w), '   ' + pad(A, w), ' + ' + pad(nb.toString(2).slice(-w), w), ' ' + '─'.repeat(w + 3), '   ' + pad(r.toString(2), w) + (neg ? '   no end carry → negative: −(2\'s complement) = −' + (b - a) : '   drop the end carry → ' + (a - b))]; }
    else { var prod = a * b, partial = B.split('').reverse().map(function (bit, i) { return (bit === '1' ? A : '0'.repeat(A.length)) + '0'.repeat(i); });
      lines = ['   ' + A, ' × ' + B, ' ' + '─'.repeat(w + 3)].concat(partial.map(function (p) { return '   ' + p.padStart(A.length + B.length, ' '); })).concat([' ' + '─'.repeat(A.length + B.length + 3), '   ' + prod.toString(2) + '   (' + a + ' × ' + b + ' = ' + prod + ')']); }
    box.innerHTML = '<pre style="margin:0;white-space:pre">' + lines.join('\n') + '</pre>';
  } catch (e) { box.innerHTML = '<div class="sim-err">' + e.message + '</div>'; }
}
K.examples('ex', [
  { label: '45.625 (decimal)', v: '45.625', from: '10' },
  { label: '−13 (signed)', v: '-13', from: '10' },
  { label: '1011 0110 (binary)', v: '10110110', from: '2' },
  { label: '3F (hex)', v: '3F', from: '16' },
  { label: '65 (ASCII A)', v: '65', from: '10' },
], function (ex) { K.$('v').value = ex.v; K.$('from').value = ex.from; run(); });
K.on(['v', 'from', 'w'], K.debounce(run, 250)); K.on(['a', 'b', 'op'], K.debounce(arith, 200));
window.addEventListener('load', run);
</script>`,
};

export const combinational = {
  id: 'combinational-blocks',
  title: 'Adders, decoders and multiplexers',
  topics: /adder|decoder|multiplexer|\bmux\b|encoder|combinational|half adder|full adder/,
  code: KIT + String.raw`
<div class="sim-grid">
<div class="m-card sim-grid">
  <div class="sim-tabs" id="tabs"></div>
</div>
<div class="m-card" id="panel"></div>
</div>
<style>
.bit{min-width:44px;background:var(--m-surface-2);color:var(--m-text);font:800 14px ui-monospace,monospace}
.bit.on{background:var(--m-accent);color:#fff}
.led{display:inline-grid;place-items:center;width:34px;height:34px;border-radius:50%;background:var(--m-surface-2);font:800 13px ui-monospace,monospace;color:var(--m-muted)}
.led.on{background:#66C98D;color:#0b1a10;box-shadow:0 0 12px #66C98D}
.eq{font:13px ui-monospace,monospace;color:var(--m-secondary);margin-top:8px}
.chain{display:flex;gap:8px;flex-wrap:wrap;align-items:flex-end;margin-top:10px}
.fa{background:var(--m-surface-2);border-radius:12px;padding:8px 10px;text-align:center;font:12px ui-monospace,monospace;min-width:72px}
.fa.carry{outline:2px solid #EDC645}
</style>
<script>
var tab = 'full', S = { A: 0, B: 0, Cin: 0, a4: [1, 0, 1, 1], b4: [0, 1, 1, 0], dec: [0, 1, 0], sel: [1, 0], data: [0, 1, 1, 0], en: 1 };
var TABS = [['half', 'Half adder'], ['full', 'Full adder'], ['ripple', '4-bit ripple adder'], ['dec', '3-to-8 decoder'], ['mux', '4-to-1 MUX']];
function bitBtn(label, v, onclick) { var b = document.createElement('button'); b.type = 'button'; b.className = 'bit' + (v ? ' on' : ''); b.textContent = label + '=' + v; b.onclick = onclick; return b; }
function led(label, v) { return '<div style="display:grid;gap:4px;justify-items:center"><span class="led' + (v ? ' on' : '') + '">' + v + '</span><span class="m-muted" style="font-size:11px">' + label + '</span></div>'; }
function draw() {
  var p = K.$('panel'); p.innerHTML = ''; var row = document.createElement('div'); row.className = 'sim-row'; p.appendChild(row);
  var outs = document.createElement('div'); outs.className = 'sim-row'; outs.style.marginTop = '12px'; p.appendChild(outs);
  var eq = document.createElement('div'); eq.className = 'eq'; p.appendChild(eq);
  if (tab === 'half' || tab === 'full') {
    ['A', 'B'].concat(tab === 'full' ? ['Cin'] : []).forEach(function (k) { row.appendChild(bitBtn(k, S[k], function () { S[k] ^= 1; draw(); })); });
    var cin = tab === 'full' ? S.Cin : 0, sum = S.A ^ S.B ^ cin, cout = (S.A & S.B) | (cin & (S.A ^ S.B));
    outs.innerHTML = led('Sum', sum) + led(tab === 'full' ? 'Cout' : 'Carry', cout);
    eq.innerHTML = tab === 'half' ? 'S = A ⊕ B = ' + sum + '<br>C = A · B = ' + cout : 'S = A ⊕ B ⊕ Cin = ' + sum + '<br>Cout = A·B + Cin·(A ⊕ B) = ' + cout;
    var tt = '<table style="margin-top:10px;border-collapse:collapse;font:12px ui-monospace,monospace">' + '<tr>' + (tab === 'full' ? '<th>A</th><th>B</th><th>Cin</th>' : '<th>A</th><th>B</th>') + '<th>S</th><th>C</th></tr>';
    for (var m = 0; m < (tab === 'full' ? 8 : 4); m++) { var a = tab === 'full' ? m >> 2 & 1 : m >> 1 & 1, b = tab === 'full' ? m >> 1 & 1 : m & 1, c = tab === 'full' ? m & 1 : 0, cur = a === S.A && b === S.B && c === cin;
      tt += '<tr style="' + (cur ? 'color:var(--m-accent);font-weight:800' : '') + '">' + '<td style="padding:2px 8px">' + a + '</td><td style="padding:2px 8px">' + b + '</td>' + (tab === 'full' ? '<td style="padding:2px 8px">' + c + '</td>' : '') + '<td style="padding:2px 8px">' + (a ^ b ^ c) + '</td><td style="padding:2px 8px">' + ((a & b) | (c & (a ^ b))) + '</td></tr>'; }
    p.insertAdjacentHTML('beforeend', tt + '</table>');
  } else if (tab === 'ripple') {
    var ra = document.createElement('div'), rb = document.createElement('div'); ra.className = rb.className = 'sim-row';
    S.a4.forEach(function (v, i) { ra.appendChild(bitBtn('A' + (3 - i), v, function () { S.a4[i] ^= 1; draw(); })); });
    S.b4.forEach(function (v, i) { rb.appendChild(bitBtn('B' + (3 - i), v, function () { S.b4[i] ^= 1; draw(); })); });
    row.appendChild(ra); p.insertBefore(rb, outs);
    var c = 0, sums = [], carries = [];
    for (var i = 3; i >= 0; i--) { var s = S.a4[i] ^ S.b4[i] ^ c, co = (S.a4[i] & S.b4[i]) | (c & (S.a4[i] ^ S.b4[i])); sums[i] = s; carries[i] = co; c = co; }
    var chain = '<div class="chain">' + [0, 1, 2, 3].map(function (i) { return '<div class="fa' + (carries[i] ? ' carry' : '') + '">FA' + (3 - i) + '<br>' + S.a4[i] + '+' + S.b4[i] + (i < 3 ? '+c' : '') + '<br>S=' + sums[i] + ' C=' + carries[i] + '</div>'; }).join('') + '</div>';
    outs.innerHTML = led('Cout', c) + sums.map(function (s, i) { return led('S' + (3 - i), s); }).join('');
    var av = parseInt(S.a4.join(''), 2), bv = parseInt(S.b4.join(''), 2);
    eq.innerHTML = S.a4.join('') + ' + ' + S.b4.join('') + ' = ' + c + sums.join('') + '   (' + av + ' + ' + bv + ' = ' + (av + bv) + ')<br>Each full adder waits for the carry from the one on its right: the delay grows with the width.' + chain;
  } else if (tab === 'dec') {
    row.appendChild(bitBtn('EN', S.en, function () { S.en ^= 1; draw(); }));
    S.dec.forEach(function (v, i) { row.appendChild(bitBtn(['A2', 'A1', 'A0'][i], v, function () { S.dec[i] ^= 1; draw(); })); });
    var k = parseInt(S.dec.join(''), 2);
    outs.innerHTML = [0, 1, 2, 3, 4, 5, 6, 7].map(function (j) { return led('D' + j, S.en && j === k ? 1 : 0); }).join('');
    eq.innerHTML = 'Input ' + S.dec.join('') + ' = ' + k + ' → only D' + k + ' is 1' + (S.en ? '' : ' (but EN = 0, so all outputs are 0)') + '.<br>D' + k + ' = ' + S.dec.map(function (b, i) { return (b ? '' : '¬') + ['A2', 'A1', 'A0'][i]; }).join('·') + ' : each output is one minterm, so a decoder + OR gates builds any function.';
  } else {
    S.data.forEach(function (v, i) { row.appendChild(bitBtn('I' + i, v, function () { S.data[i] ^= 1; draw(); })); });
    var sr = document.createElement('div'); sr.className = 'sim-row'; S.sel.forEach(function (v, i) { sr.appendChild(bitBtn(['S1', 'S0'][i], v, function () { S.sel[i] ^= 1; draw(); })); }); p.insertBefore(sr, outs);
    var sel = parseInt(S.sel.join(''), 2);
    outs.innerHTML = led('Y', S.data[sel]);
    eq.innerHTML = 'S1S0 = ' + S.sel.join('') + ' selects I' + sel + ', so Y = ' + S.data[sel] + '.<br>Y = ¬S1·¬S0·I0 + ¬S1·S0·I1 + S1·¬S0·I2 + S1·S0·I3';
  }
}
TABS.forEach(function (t) { var b = document.createElement('button'); b.type = 'button'; b.textContent = t[1]; b.onclick = function () { tab = t[0]; Array.prototype.forEach.call(K.$('tabs').children, function (x) { x.classList.toggle('on', x === b); }); draw(); }; if (t[0] === tab) b.classList.add('on'); K.$('tabs').appendChild(b); });
draw();
</script>`,
};

export const flipFlops = {
  id: 'flip-flops',
  title: 'Flip-flops and timing diagrams',
  topics: /flip.?flop|latch|sequential|clock|register|counter|jk|state machine/,
  code: KIT + String.raw`
<div class="sim-grid">
<div class="m-card sim-grid">
  <div class="sim-tabs" id="tabs"></div>
  <div class="sim-row" id="ins"></div>
  <div class="sim-row"><button id="clk" type="button">Clock pulse ↑</button><button id="reset" type="button" class="m-btn-ghost">Reset</button><span class="m-stat" id="q">Q = 0</span></div>
</div>
<div class="m-card"><div id="eq" class="sim-out"></div></div>
<div class="m-card"><canvas id="wave" class="sim-plot" style="height:220px"></canvas></div>
</div>
<script>
var type = 'D', inputs = { D: 0, S: 0, R: 0, J: 0, K: 0, T: 0 }, Q = 0, hist = [];
var DEFS = {
  D: { ins: ['D'], next: function () { return inputs.D; }, eq: "Q^+ = D", table: [['0', '0'], ['1', '1']] },
  SR: { ins: ['S', 'R'], next: function () { if (inputs.S && inputs.R) return null; return inputs.S ? 1 : inputs.R ? 0 : Q; }, eq: "Q^+ = S + \\overline{R}Q \\quad (SR = 0)", table: [['00', 'Q (hold)'], ['01', '0 (reset)'], ['10', '1 (set)'], ['11', 'invalid']] },
  JK: { ins: ['J', 'K'], next: function () { return inputs.J && inputs.K ? 1 - Q : inputs.J ? 1 : inputs.K ? 0 : Q; }, eq: "Q^+ = J\\overline{Q} + \\overline{K}Q", table: [['00', 'Q (hold)'], ['01', '0 (reset)'], ['10', '1 (set)'], ['11', "Q' (toggle)"]] },
  T: { ins: ['T'], next: function () { return inputs.T ? 1 - Q : Q; }, eq: "Q^+ = T \\oplus Q", table: [['0', 'Q (hold)'], ['1', "Q' (toggle)"]] },
};
function draw() {
  var d = DEFS[type], ins = K.$('ins'); ins.innerHTML = '';
  d.ins.forEach(function (k) { var b = document.createElement('button'); b.type = 'button'; b.className = inputs[k] ? '' : 'm-btn-ghost'; b.textContent = k + ' = ' + inputs[k]; b.onclick = function () { inputs[k] ^= 1; draw(); }; ins.appendChild(b); });
  K.$('q').textContent = 'Q = ' + Q + ", Q' = " + (1 - Q);
  K.$('eq').innerHTML = '$$' + d.eq + '$$<table style="border-collapse:collapse;font:13px ui-monospace,monospace"><tr><th style="padding:3px 10px">' + d.ins.join('') + '</th><th style="padding:3px 10px">Q⁺</th></tr>' + d.table.map(function (r) { var cur = r[0] === d.ins.map(function (k) { return inputs[k]; }).join(''); return '<tr style="' + (cur ? 'color:var(--m-accent);font-weight:800' : '') + '"><td style="padding:3px 10px">' + r[0] + '</td><td style="padding:3px 10px">' + r[1] + '</td></tr>'; }).join('') + '</table>';
  wave();
}
function wave() {
  var c = K.$('wave'), dpr = window.devicePixelRatio || 1, W = c.clientWidth || 600, H = c.clientHeight || 220; c.width = W * dpr; c.height = H * dpr;
  var g = c.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, W, H);
  var sigs = ['CLK'].concat(DEFS[type].ins).concat(['Q']), lane = H / sigs.length, n = Math.max(8, hist.length), step = (W - 50) / n;
  g.font = '12px ui-monospace,monospace';
  sigs.forEach(function (s, i) {
    var y0 = i * lane + lane * 0.75, hgt = lane * 0.5; g.fillStyle = K.css('--m-muted', '#888'); g.fillText(s, 4, y0 - hgt / 3);
    g.strokeStyle = s === 'Q' ? K.css('--m-accent', '#8766EB') : s === 'CLK' ? '#EDC645' : K.css('--m-text', '#eee'); g.lineWidth = 2; g.beginPath();
    for (var k = 0; k < hist.length; k++) {
      var x = 44 + k * step, v;
      if (s === 'CLK') { g.moveTo(x, y0); g.lineTo(x, y0 - hgt); g.lineTo(x + step / 2, y0 - hgt); g.lineTo(x + step / 2, y0); g.lineTo(x + step, y0); continue; }
      v = hist[k][s]; var yy = v === null ? y0 - hgt / 2 : y0 - v * hgt;
      if (k === 0) g.moveTo(x, yy); else g.lineTo(x, yy); g.lineTo(x + step, yy);
    }
    g.stroke();
  });
}
K.$('clk').onclick = function () { var nx = DEFS[type].next(); var snap = { Q: Q }; DEFS[type].ins.forEach(function (k) { snap[k] = inputs[k]; }); if (nx === null) { snap.Q = null; } else Q = nx; snap.Q = nx === null ? null : Q; hist.push(snap); if (hist.length > 24) hist.shift(); draw(); };
K.$('reset').onclick = function () { Q = 0; hist = []; draw(); };
Object.keys(DEFS).forEach(function (t) { var b = document.createElement('button'); b.type = 'button'; b.textContent = t + ' flip-flop'; b.onclick = function () { type = t; hist = []; Q = 0; Array.prototype.forEach.call(K.$('tabs').children, function (x) { x.classList.toggle('on', x === b); }); draw(); }; if (t === type) b.classList.add('on'); K.$('tabs').appendChild(b); });
window.addEventListener('load', draw); draw();
</script>`,
};

export const LOGIC_SIMS = [kmap, numberSystems, combinational, flipFlops];
