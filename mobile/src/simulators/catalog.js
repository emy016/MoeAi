/**
 * MoeAI's built-in simulators.
 *
 * Each one is a small self-contained page that runs in the same sandbox as
 * the chat's interactive cards (src/chat/blocks), styled by the same MoeAI
 * kit, so it follows the student's theme and accent. A student never sees
 * the whole catalog: `matches` decides which of their courses a simulator
 * belongs to, and the Simulators tab shows only those.
 */

import { PHET_SIMS } from './phet';

const LOGIC = /logic|digital|boolean|circuit design|computer (architecture|organi[sz]ation)|embedded|microprocessor/;
const DISCRETE = /discrete|mathematics? (for|of) comput|set theory|combinatoric|graph theory/;
const PROGRAMMING = /python|programming|computer science|\bcs\b|computing|coding|software|algorithm|data structure|\boop\b|object.oriented/;
// Continuous maths; discrete maths has its own simulators.
const MATH = /^(?!.*discrete).*(math|calculus|algebra|pre.?calc|analysis|differential|trigonometr)/;
const PHYSICS = /physics|mechanic|dynamics|kinematic|oscillat|wave/;
const ELECTRIC = /physics|electric|electronic|circuit/;
const STATS = /statistic|probability|data science|data analysis|econometric/;
const CHEM = /chem|thermo/;

export const SIMULATORS = [
  {
    id: 'logic-gates', title: 'Logic gates lab', blurb: 'Toggle inputs and watch every gate, plus a half adder.', matches: LOGIC, kind: 'visualizer',
    code: `<div class="m-card"><div class="m-row" style="justify-content:space-between"><div class="m-title" style="margin:0">Inputs</div><span class="m-muted" style="font-size:12px">Tap a switch</span></div>
<div class="m-row" style="margin:12px 0 4px"><button class="sw" data-k="A">A = 0</button><button class="sw" data-k="B">B = 0</button></div></div>
<div class="m-card" style="margin-top:10px"><table id="t" style="width:100%;border-collapse:collapse;font-size:14px"></table></div>
<style>.sw{min-width:92px;background:var(--m-surface-2);color:var(--m-text)}.sw.on{background:var(--m-accent);color:#fff}
td{padding:7px 4px;border-bottom:1px solid var(--m-border)}td.f{color:var(--m-muted);font:12px ui-monospace,monospace}
.led{display:inline-block;width:14px;height:14px;border-radius:50%;background:var(--m-surface-2);border:1px solid var(--m-border);vertical-align:middle}
.led.on{background:#66C98D;box-shadow:0 0 10px #66C98D;border-color:#66C98D}</style>
<script>
var v={A:0,B:0};var G=[["AND","A · B",function(a,b){return a&b}],["OR","A + B",function(a,b){return a|b}],["NOT A","A'",function(a){return 1-a}],["NAND","(A · B)'",function(a,b){return 1-(a&b)}],["NOR","(A + B)'",function(a,b){return 1-(a|b)}],["XOR","A ⊕ B",function(a,b){return a^b}],["XNOR","(A ⊕ B)'",function(a,b){return 1-(a^b)}],["Half adder: Sum","A ⊕ B",function(a,b){return a^b}],["Half adder: Carry","A · B",function(a,b){return a&b}]];
function draw(){document.querySelectorAll('.sw').forEach(function(b){var k=b.dataset.k;b.textContent=k+' = '+v[k];b.classList.toggle('on',!!v[k]);});
document.getElementById('t').innerHTML=G.map(function(g){var o=g[2](v.A,v.B);return '<tr><td><b>'+g[0]+'</b></td><td class="f">'+g[1]+'</td><td style="text-align:end">'+o+' <span class="led'+(o?' on':'')+'"></span></td></tr>';}).join('');}
document.querySelectorAll('.sw').forEach(function(b){b.onclick=function(){v[b.dataset.k]^=1;draw();};});draw();
</script>`,
  },
  {
    id: 'truth-table', title: 'Truth table builder', blurb: 'Type any Boolean expression and get its full table and minterms.', matches: new RegExp(`${LOGIC.source}|${DISCRETE.source}`), kind: 'visualizer',
    code: `<div class="m-card"><div class="m-label">Expression (and · or + not ' xor ^ -> <->)</div>
<input id="e" type="text" value="(A and B) or not C" style="width:100%;margin-top:6px;font:14px ui-monospace,monospace">
<div id="info" class="m-muted" style="font-size:12px;margin-top:8px"></div></div>
<div class="m-card" style="margin-top:10px;overflow:auto;max-height:340px"><table id="t" style="border-collapse:collapse;font:13px ui-monospace,monospace;width:100%"></table></div>
<style>th,td{padding:5px 8px;text-align:center;border-bottom:1px solid var(--m-border)}th{color:var(--m-muted);position:sticky;top:0;background:var(--m-surface)}td.r{font-weight:800}td.r.one{color:var(--m-accent)}</style>
<script>
function tokens(s){var re=/\\s*(<->|↔|->|→|\\(|\\)|'|[A-Za-z_]\\w*|[01]|[&|^!~+*·⊕¬∧∨])/y,out=[],m;while(re.lastIndex<s.length){var at=re.lastIndex;m=re.exec(s);if(!m){if(s.slice(at).trim())throw new Error('Unexpected "'+s.slice(at).trim()[0]+'"');break;}out.push(m[1]);}return out;}
var WORD={and:'&',or:'|',not:'!',xor:'^',nand:'nand',nor:'nor',implies:'->',iff:'<->'};
function parse(ts){var i=0;function peek(){var t=ts[i];return t&&WORD[t.toLowerCase()]||t;}function eat(){return ts[i++];}
function prim(){var t=peek();if(t==='('){eat();var e=iff();if(peek()!==')')throw new Error('Missing )');eat();return post(e);}if(t==='!'||t==='~'||t==='¬'){eat();var x=prim();return function(v){return !x(v)};}
if(t==='0'||t==='1'){eat();var c=t==='1';return post(function(){return c});}if(t&&/^[A-Za-z_]\\w*$/.test(t)){var n=eat();vars[n]=1;return post(function(v){return v[n]});}throw new Error(t?'Unexpected "'+t+'"':'Expression ends too early');}
function post(e){while(ts[i]==="'"){i++;var x=e;e=function(v){return !x(v)};}return e;}
function and(){var l=prim();for(;;){var t=peek();if(t==='&'||t==='*'||t==='·'||t==='∧'){eat();var r=prim(),a=l;l=function(v){return a(v)&&r(v)};}else if(t==='nand'){eat();var r2=prim(),a2=l;l=function(v){return !(a2(v)&&r2(v))};}else return l;}}
function xor(){var l=and();while(peek()==='^'||peek()==='⊕'){eat();var r=and(),a=l;l=function(v){return a(v)!==r(v)};}return l;}
function or(){var l=xor();for(;;){var t=peek();if(t==='|'||t==='+'||t==='∨'){eat();var r=xor(),a=l;l=function(v){return a(v)||r(v)};}else if(t==='nor'){eat();var r2=xor(),a2=l;l=function(v){return !(a2(v)||r2(v))};}else return l;}}
function imp(){var l=or();if(peek()==='->'||peek()==='→'){eat();var r=imp(),a=l;return function(v){return !a(v)||r(v)};}return l;}
function iff(){var l=imp();while(peek()==='<->'||peek()==='↔'){eat();var r=imp(),a=l;l=function(v){return a(v)===r(v)};}return l;}
var vars={};var f=iff();if(i<ts.length)throw new Error('Unexpected "'+ts[i]+'"');return {f:f,vars:Object.keys(vars).sort()};}
function build(){var info=document.getElementById('info'),t=document.getElementById('t');try{var p=parse(tokens(document.getElementById('e').value));var n=p.vars.length;if(n>6)throw new Error('Up to 6 variables');
var rows=[],mins=[];for(var k=0;k<(1<<n);k++){var v={};p.vars.forEach(function(x,j){v[x]=!!(k>>(n-1-j)&1)});var r=!!p.f(v);if(r)mins.push(k);rows.push('<tr>'+p.vars.map(function(x){return '<td>'+(v[x]?1:0)+'</td>'}).join('')+'<td class="r'+(r?' one':'')+'">'+(r?1:0)+'</td></tr>');}
t.innerHTML='<tr>'+p.vars.map(function(x){return '<th>'+x+'</th>'}).join('')+'<th>F</th></tr>'+rows.join('');
info.textContent=(mins.length===1<<n?'Tautology':mins.length?'Contingency':'Contradiction')+' · F = Σm('+mins.join(', ')+')';}catch(e){info.textContent=e.message;t.innerHTML='';}}
document.getElementById('e').oninput=build;build();
</script>`,
  },
  {
    id: 'number-bases', title: 'Number bases & bits', blurb: 'Binary, octal, decimal, hex and two’s complement, bit by bit.', matches: new RegExp(`${LOGIC.source}|${PROGRAMMING.source}`), kind: 'visualizer',
    code: `<div class="m-card"><div class="m-row"><input id="n" type="text" value="42" style="flex:1;min-width:120px;font:15px ui-monospace,monospace"><select id="b"><option value="10">decimal</option><option value="2">binary</option><option value="8">octal</option><option value="16">hex</option></select><select id="w"><option>8</option><option selected>16</option><option>32</option></select></div>
<div id="bits" style="display:flex;flex-wrap:wrap;gap:4px;margin:12px 0 6px"></div><div id="o" class="m-col" style="gap:6px;font:13px ui-monospace,monospace"></div></div>
<style>.bit{width:28px;height:34px;border-radius:8px;padding:0;background:var(--m-surface-2);color:var(--m-text);font:700 13px ui-monospace,monospace}.bit.on{background:var(--m-accent);color:#fff}.k{color:var(--m-muted);display:inline-block;width:130px}</style>
<script>
var val=42;function width(){return +document.getElementById('w').value}
function show(){var w=width(),mask=w===32?0xFFFFFFFF:(1<<w)-1,u=(val>>>0)&mask>>>0;if(w===32)u=val>>>0;var s=u>=Math.pow(2,w-1)?u-Math.pow(2,w):u;
var bits=document.getElementById('bits');bits.innerHTML='';for(var i=w-1;i>=0;i--){var on=Math.floor(u/Math.pow(2,i))%2===1,b=document.createElement('button');b.className='bit'+(on?' on':'');b.textContent=on?1:0;b.title='2^'+i;(function(i){b.onclick=function(){var cur=Math.floor(u/Math.pow(2,i))%2;val=u+(cur?-1:1)*Math.pow(2,i);sync();};})(i);bits.appendChild(b);}
document.getElementById('o').innerHTML=[['Unsigned',u],['Signed (two’s c.)',s],['Binary',u.toString(2).padStart(w,'0').replace(/(.{4})(?=.)/g,'$1 ')],['Octal',u.toString(8)],['Hex','0x'+u.toString(16).toUpperCase()]].map(function(r){return '<div><span class="k">'+r[0]+'</span>'+r[1]+'</div>'}).join('');}
function sync(){document.getElementById('n').value=(val>>>0).toString(+document.getElementById('b').value);show();}
document.getElementById('n').oninput=function(e){var p=parseInt(e.target.value.replace(/^0x/i,'').replace(/\\s/g,''),+document.getElementById('b').value);if(!isNaN(p)){val=p;show();}};
document.getElementById('b').onchange=sync;document.getElementById('w').onchange=show;show();
</script>`,
  },
  {
    id: 'python-ide', title: 'Python IDE', blurb: 'Write and run Python right here: numpy included, no setup.', matches: PROGRAMMING, kind: 'ide', language: 'python',
    code: `# Try it: edit and press Run
def fib(n):
    a, b = 0, 1
    for _ in range(n):
        a, b = b, a + b
    return a

print([fib(i) for i in range(12)])
`,
  },
  {
    id: 'sorting', title: 'Sorting visualizer', blurb: 'Step through bubble, insertion, selection, merge and quick sort.', matches: PROGRAMMING, kind: 'visualizer',
    code: `<div class="m-card"><div class="m-row"><select id="alg"><option value="bubble">Bubble</option><option value="insertion">Insertion</option><option value="selection">Selection</option><option value="merge">Merge</option><option value="quick">Quick</option></select>
<button id="play" class="m-btn">Play</button><button id="step" class="m-btn m-btn-ghost">Step</button><button id="shuffle" class="m-btn m-btn-ghost">Shuffle</button></div>
<svg id="s" viewBox="0 0 400 180" style="width:100%;height:auto;margin-top:12px"></svg>
<div class="m-row" style="font-size:12px"><span class="m-stat" id="c">0 comparisons</span><span class="m-stat" id="w">0 writes</span><span class="m-muted" id="st"></span></div></div>
<script>
var N=24,a=[],frames=[],fi=0,timer=null;
function shuffle(){a=[];for(var i=0;i<N;i++)a.push(8+Math.round(Math.random()*160));record();}
function record(){var x=a.slice(),F=[],c=0,w=0;function snap(hi,done){F.push({a:x.slice(),hi:hi||[],c:c,w:w,done:done})}function cmp(i,j){c++;snap([i,j]);return x[i]>x[j]}function set(i,v){x[i]=v;w++;snap([i])}function swap(i,j){var t=x[i];x[i]=x[j];x[j]=t;w+=2;snap([i,j])}
var alg=document.getElementById('alg').value;snap();
if(alg==='bubble')for(var i=0;i<x.length;i++)for(var j=0;j<x.length-1-i;j++){if(cmp(j,j+1))swap(j,j+1)}
if(alg==='insertion')for(var i=1;i<x.length;i++){var j=i;while(j>0&&cmp(j-1,j)){swap(j-1,j);j--}}
if(alg==='selection')for(var i=0;i<x.length;i++){var m=i;for(var j=i+1;j<x.length;j++)if(cmp(m,j))m=j;if(m!==i)swap(i,m)}
if(alg==='merge')(function ms(l,r){if(r-l<2)return;var mid=(l+r)>>1;ms(l,mid);ms(mid,r);var L=x.slice(l,mid),R=x.slice(mid,r),i=0,j=0,k=l;while(i<L.length&&j<R.length){c++;set(k++,L[i]<=R[j]?L[i++]:R[j++])}while(i<L.length)set(k++,L[i++]);while(j<R.length)set(k++,R[j++])})(0,x.length);
if(alg==='quick')(function qs(l,r){if(l>=r)return;var p=r,i=l;for(var j=l;j<r;j++){if(!cmp(j,p)){swap(i,j);i++}}swap(i,r);qs(l,i-1);qs(i+1,r)})(0,x.length-1);
snap([],true);frames=F;fi=0;draw();}
function draw(){var f=frames[fi],s=document.getElementById('s'),bw=400/N;s.innerHTML=f.a.map(function(v,i){var hot=f.hi.indexOf(i)>=0;return '<rect x="'+(i*bw+1)+'" y="'+(180-v)+'" width="'+(bw-2)+'" height="'+v+'" rx="2" fill="'+(f.done?'#66C98D':hot?'var(--m-accent)':'var(--m-surface-2)')+'"/>'}).join('');
document.getElementById('c').textContent=f.c+' comparisons';document.getElementById('w').textContent=f.w+' writes';document.getElementById('st').textContent=f.done?'Sorted':'Step '+fi+' / '+(frames.length-1);}
function step(){if(fi<frames.length-1){fi++;draw()}else stop()}function stop(){clearInterval(timer);timer=null;document.getElementById('play').textContent='Play'}
document.getElementById('play').onclick=function(){if(timer)return stop();if(fi>=frames.length-1){fi=0}this.textContent='Pause';timer=setInterval(step,60)};
document.getElementById('step').onclick=function(){stop();step()};document.getElementById('shuffle').onclick=function(){stop();shuffle()};document.getElementById('alg').onchange=function(){stop();record()};shuffle();
</script>`,
  },
  {
    id: 'graph-search', title: 'BFS & DFS on a graph', blurb: 'Pick a start node and watch the frontier grow, step by step.', matches: new RegExp(`${DISCRETE.source}|${PROGRAMMING.source}`), kind: 'visualizer',
    code: `<div class="m-card"><div class="m-row"><select id="mode"><option>BFS</option><option>DFS</option></select><span class="m-label">Start</span><select id="start"></select><button id="go" class="m-btn">Run</button><button id="nx" class="m-btn m-btn-ghost">Step</button></div>
<svg id="g" viewBox="0 0 420 240" style="width:100%;height:auto;margin-top:8px"></svg><div class="m-row" style="font:12px ui-monospace,monospace"><span class="m-stat" id="order">Order: –</span><span class="m-stat" id="front">Queue: –</span></div></div>
<script>
var P={A:[60,50],B:[170,30],C:[290,50],D:[380,120],E:[60,170],F:[180,130],G:[290,190],H:[160,215]},E=[['A','B'],['A','E'],['B','C'],['B','F'],['C','D'],['C','G'],['E','F'],['E','H'],['F','G'],['G','D'],['H','G']];
var adj={};Object.keys(P).forEach(function(k){adj[k]=[]});E.forEach(function(e){adj[e[0]].push(e[1]);adj[e[1]].push(e[0])});Object.keys(adj).forEach(function(k){adj[k].sort()});
var sel=document.getElementById('start');Object.keys(P).forEach(function(k){sel.innerHTML+='<option>'+k+'</option>'});
var steps=[],si=0,timer=null;
function plan(){var mode=document.getElementById('mode').value,s=sel.value,seen={},order=[],fr=[s],S=[];seen[s]=1;
while(fr.length){var u=mode==='BFS'?fr.shift():fr.pop();if(mode==='DFS'){if(order.indexOf(u)>=0)continue}order.push(u);S.push({cur:u,order:order.slice(),fr:fr.slice()});
var ns=mode==='BFS'?adj[u]:adj[u].slice().reverse();ns.forEach(function(v){if(mode==='BFS'){if(!seen[v]){seen[v]=1;fr.push(v)}}else if(order.indexOf(v)<0)fr.push(v)});S.push({cur:u,order:order.slice(),fr:fr.slice()})}
steps=S;si=0;draw()}
function draw(){var st=steps[si]||{order:[],fr:[]},g=document.getElementById('g'),mode=document.getElementById('mode').value;
g.innerHTML=E.map(function(e){var a=P[e[0]],b=P[e[1]];return '<line x1="'+a[0]+'" y1="'+a[1]+'" x2="'+b[0]+'" y2="'+b[1]+'" stroke="var(--m-border)" stroke-width="2"/>'}).join('')+Object.keys(P).map(function(k){var p=P[k],vi=st.order.indexOf(k),cur=st.cur===k,inF=st.fr.indexOf(k)>=0;
return '<circle cx="'+p[0]+'" cy="'+p[1]+'" r="17" fill="'+(cur?'var(--m-accent)':vi>=0?'#66C98D':inF?'#E0B84A':'var(--m-surface-2)')+'"/><text x="'+p[0]+'" y="'+(p[1]+5)+'" text-anchor="middle" font-weight="800" font-size="14" fill="'+(cur||vi>=0?'#fff':'var(--m-text)')+'">'+k+'</text>'+(vi>=0?'<text x="'+(p[0]+17)+'" y="'+(p[1]-14)+'" font-size="11" fill="var(--m-muted)">'+(vi+1)+'</text>':'')}).join('');
document.getElementById('order').textContent='Order: '+(st.order.join(' → ')||'–');document.getElementById('front').textContent=(mode==='BFS'?'Queue: ':'Stack: ')+(st.fr.join(' ')||'–')}
function stop(){clearInterval(timer);timer=null}
document.getElementById('go').onclick=function(){stop();plan();timer=setInterval(function(){if(si<steps.length-1){si++;draw()}else stop()},600)};
document.getElementById('nx').onclick=function(){stop();if(!steps.length)plan();else if(si<steps.length-1){si++;draw()}};
sel.onchange=document.getElementById('mode').onchange=function(){stop();plan()};plan();
</script>`,
  },
  {
    id: 'sets', title: 'Sets & Venn diagrams', blurb: 'Union, intersection, difference and symmetric difference, drawn.', matches: new RegExp(`${DISCRETE.source}|${STATS.source}`), kind: 'visualizer',
    code: `<div class="m-card"><div class="m-col"><label class="m-label">A <input id="a" type="text" value="1, 2, 3, 4, 5" style="width:100%"></label><label class="m-label">B <input id="b" type="text" value="4, 5, 6, 7" style="width:100%"></label>
<div class="m-row" id="ops"></div></div><svg viewBox="0 0 320 170" style="width:100%;height:auto;margin-top:10px"><defs><clipPath id="ca"><circle cx="125" cy="85" r="70"/></clipPath><clipPath id="cb"><circle cx="195" cy="85" r="70"/></clipPath></defs><g id="fill"></g>
<circle cx="125" cy="85" r="70" fill="none" stroke="var(--m-text)" stroke-width="2"/><circle cx="195" cy="85" r="70" fill="none" stroke="var(--m-text)" stroke-width="2"/><text x="70" y="30" font-weight="800" fill="var(--m-text)">A</text><text x="243" y="30" font-weight="800" fill="var(--m-text)">B</text><g id="labels"></g></svg>
<div id="res" style="font:14px ui-monospace,monospace;margin-top:6px"></div></div>
<style>#ops button{background:var(--m-surface-2);color:var(--m-text)}#ops button.on{background:var(--m-accent);color:#fff}</style>
<script>
var OPS={'A ∪ B':['a','b','ab'],'A ∩ B':['ab'],'A − B':['a'],'B − A':['b'],'A △ B':['a','b']},op='A ∪ B';
Object.keys(OPS).forEach(function(k){var b=document.createElement('button');b.textContent=k;b.onclick=function(){op=k;draw()};document.getElementById('ops').appendChild(b)});
function set(id){return document.getElementById(id).value.split(',').map(function(s){return s.trim()}).filter(Boolean).filter(function(v,i,a){return a.indexOf(v)===i})}
function draw(){var A=set('a'),B=set('b'),only=function(x,y){return x.filter(function(v){return y.indexOf(v)<0})},both=A.filter(function(v){return B.indexOf(v)>=0});
var reg={a:only(A,B),b:only(B,A),ab:both},on=OPS[op],acc='var(--m-accent)';
document.getElementById('fill').innerHTML=(on.indexOf('a')>=0?'<rect x="0" y="0" width="320" height="170" fill="'+acc+'" opacity=".35" clip-path="url(#ca)"/><rect x="0" y="0" width="320" height="170" fill="var(--m-bg)" clip-path="url(#cb)"/>':'')+(on.indexOf('b')>=0?'<g clip-path="url(#cb)"><rect x="0" y="0" width="320" height="170" fill="'+acc+'" opacity=".35"/></g><g clip-path="url(#ca)"><rect x="0" y="0" width="320" height="170" fill="var(--m-bg)" clip-path="url(#cb)"/></g>':'')+(on.indexOf('ab')>=0?'<g clip-path="url(#ca)"><rect x="0" y="0" width="320" height="170" fill="'+acc+'" opacity=".55" clip-path="url(#cb)"/></g>':'');
var lab=function(xs,x){return xs.slice(0,6).map(function(v,i){return '<text x="'+x+'" y="'+(62+i*16)+'" text-anchor="middle" font-size="13" fill="var(--m-text)">'+v+'</text>'}).join('')};
document.getElementById('labels').innerHTML=lab(reg.a,95)+lab(reg.ab,160)+lab(reg.b,225);
var result=[].concat.apply([],on.map(function(k){return reg[k]}));document.getElementById('res').textContent=op+' = { '+result.join(', ')+' }   |'+op.split(' ')[1]+'| = '+result.length;
document.querySelectorAll('#ops button').forEach(function(b){b.classList.toggle('on',b.textContent===op)})}
document.getElementById('a').oninput=document.getElementById('b').oninput=draw;draw();
</script>`,
  },
  {
    id: 'function-plotter', title: 'Function plotter', blurb: 'Plot f(x) with sliders for a and b, the derivative, and a tangent line.', matches: MATH, kind: 'visualizer',
    code: `<div class="m-card"><div class="m-row"><span class="m-label">f(x) =</span><input id="f" type="text" value="a*sin(b*x) + x/3" style="flex:1;min-width:160px;font:14px ui-monospace,monospace"></div>
<div class="m-row" style="margin-top:8px"><span class="m-label">a</span><input id="a" type="range" min="-3" max="3" step="0.1" value="1.5" style="flex:1"><span class="m-stat" id="av"></span><span class="m-label">b</span><input id="b" type="range" min="0.1" max="4" step="0.1" value="1" style="flex:1"><span class="m-stat" id="bv"></span></div>
<div class="m-row" style="margin-top:6px"><label class="m-label"><input id="d" type="checkbox"> f′(x)</label><span class="m-label">tangent at x₀</span><input id="x0" type="range" min="-6" max="6" step="0.05" value="1" style="flex:1"><span class="m-stat" id="tv"></span></div>
<canvas id="c" width="640" height="360" style="width:100%;margin-top:8px;border-radius:10px"></canvas><div id="err" class="m-muted" style="font-size:12px"></div></div>
<script>
var cv=document.getElementById('c'),g=cv.getContext('2d'),css=getComputedStyle(document.documentElement),C=function(n){return css.getPropertyValue(n).trim()};
function make(src,a,b){src=src.replace(/\\^/g,'**').replace(/(\\d)([a-z(])/gi,'$1*$2');var fn=new Function('x','a','b','with(Math){return ('+src+')}');return function(x){return fn(x,a,b)}}
function draw(){var a=+document.getElementById('a').value,b=+document.getElementById('b').value,x0=+document.getElementById('x0').value;document.getElementById('av').textContent=a;document.getElementById('bv').textContent=b;
var W=cv.width,H=cv.height,X0=-7,X1=7,Y0=-4.2,Y1=4.2,sx=function(x){return (x-X0)/(X1-X0)*W},sy=function(y){return H-(y-Y0)/(Y1-Y0)*H};
g.fillStyle=C('--m-bg');g.fillRect(0,0,W,H);g.strokeStyle=C('--m-border');g.lineWidth=1;for(var i=-7;i<=7;i++){g.beginPath();g.moveTo(sx(i),0);g.lineTo(sx(i),H);g.stroke()}for(var j=-4;j<=4;j++){g.beginPath();g.moveTo(0,sy(j));g.lineTo(W,sy(j));g.stroke()}
g.strokeStyle=C('--m-muted');g.lineWidth=1.5;g.beginPath();g.moveTo(0,sy(0));g.lineTo(W,sy(0));g.moveTo(sx(0),0);g.lineTo(sx(0),H);g.stroke();
var f;try{f=make(document.getElementById('f').value,a,b);f(1);document.getElementById('err').textContent=''}catch(e){document.getElementById('err').textContent='Can’t read that: '+e.message;return}
function curve(fn,color,w){g.strokeStyle=color;g.lineWidth=w;g.beginPath();var pen=false;for(var px=0;px<=W;px+=2){var x=X0+px/W*(X1-X0),y=fn(x);if(!isFinite(y)||Math.abs(y)>50){pen=false;continue}pen?g.lineTo(px,sy(y)):g.moveTo(px,sy(y));pen=true}g.stroke()}
var h=1e-4,df=function(x){return (f(x+h)-f(x-h))/(2*h)};curve(f,C('--m-accent'),3);if(document.getElementById('d').checked)curve(df,'#66C98D',2);
var y0=f(x0),m=df(x0);if(isFinite(y0)){curve(function(x){return y0+m*(x-x0)},'#E0B84A',1.5);g.fillStyle='#E0B84A';g.beginPath();g.arc(sx(x0),sy(y0),5,0,7);g.fill()}
document.getElementById('tv').textContent='x₀='+x0.toFixed(2)+'  slope='+(isFinite(m)?m.toFixed(3):'–')}
['f','a','b','x0','d'].forEach(function(id){document.getElementById(id).oninput=draw});draw();
</script>`,
  },
  {
    id: 'projectile', title: 'Projectile motion', blurb: 'Launch speed, angle and gravity; range, peak and flight time live.', matches: PHYSICS, kind: 'visualizer',
    code: `<div class="m-card"><div class="m-col"><div class="m-row"><span class="m-label" style="width:70px">v₀ (m/s)</span><input id="v" type="range" min="5" max="40" value="22" style="flex:1"><span class="m-stat" id="vv"></span></div>
<div class="m-row"><span class="m-label" style="width:70px">angle</span><input id="t" type="range" min="5" max="85" value="45" style="flex:1"><span class="m-stat" id="tv"></span></div>
<div class="m-row"><span class="m-label" style="width:70px">g</span><select id="g"><option value="9.81">Earth 9.81</option><option value="1.62">Moon 1.62</option><option value="3.71">Mars 3.71</option><option value="24.79">Jupiter 24.79</option></select><button id="go" class="m-btn">Launch</button></div></div>
<canvas id="c" width="640" height="300" style="width:100%;margin-top:10px;border-radius:10px"></canvas><div class="m-row" id="st" style="font-size:12px"></div></div>
<script>
var cv=document.getElementById('c'),ctx=cv.getContext('2d'),css=getComputedStyle(document.documentElement),C=function(n){return css.getPropertyValue(n).trim()},anim=null;
function p(){var v=+document.getElementById('v').value,a=+document.getElementById('t').value*Math.PI/180,g=+document.getElementById('g').value;return {v:v,a:a,g:g,T:2*v*Math.sin(a)/g,R:v*v*Math.sin(2*a)/g,H:Math.pow(v*Math.sin(a),2)/(2*g)}}
function frame(t){var q=p(),W=cv.width,H=cv.height,scale=Math.min((W-40)/Math.max(q.R,1),(H-40)/Math.max(q.H,1),(W-40)/170);
document.getElementById('vv').textContent=q.v;document.getElementById('tv').textContent=Math.round(q.a*180/Math.PI)+'°';
ctx.fillStyle=C('--m-bg');ctx.fillRect(0,0,W,H);ctx.strokeStyle=C('--m-border');ctx.beginPath();ctx.moveTo(20,H-20);ctx.lineTo(W,H-20);ctx.stroke();
ctx.setLineDash([4,5]);ctx.strokeStyle=C('--m-muted');ctx.beginPath();for(var s=0;s<=1.0001;s+=0.01){var tt=s*q.T,x=q.v*Math.cos(q.a)*tt,y=q.v*Math.sin(q.a)*tt-q.g*tt*tt/2;s?ctx.lineTo(20+x*scale,H-20-y*scale):ctx.moveTo(20+x*scale,H-20-y*scale)}ctx.stroke();ctx.setLineDash([]);
var tt2=Math.min(t,q.T),bx=q.v*Math.cos(q.a)*tt2,by=q.v*Math.sin(q.a)*tt2-q.g*tt2*tt2/2;ctx.fillStyle=C('--m-accent');ctx.beginPath();ctx.arc(20+bx*scale,H-20-by*scale,8,0,7);ctx.fill();
document.getElementById('st').innerHTML=['Range '+q.R.toFixed(1)+' m','Peak '+q.H.toFixed(1)+' m','Flight '+q.T.toFixed(2)+' s','t = '+tt2.toFixed(2)+' s'].map(function(s){return '<span class="m-stat">'+s+'</span>'}).join('')}
function launch(){cancelAnimationFrame(anim);var start=performance.now();(function loop(now){var t=(now-start)/1000;frame(t);if(t<p().T)anim=requestAnimationFrame(loop)})(start)}
['v','t','g'].forEach(function(id){document.getElementById(id).oninput=function(){cancelAnimationFrame(anim);frame(p().T)}});document.getElementById('go').onclick=launch;launch();
</script>`,
  },
  {
    id: 'pendulum', title: 'Pendulum & SHM', blurb: 'Length, amplitude and damping; period vs. the small-angle formula.', matches: PHYSICS, kind: 'visualizer',
    code: `<div class="m-card"><div class="m-col"><div class="m-row"><span class="m-label" style="width:86px">length (m)</span><input id="L" type="range" min="0.2" max="3" step="0.05" value="1.2" style="flex:1"><span class="m-stat" id="Lv"></span></div>
<div class="m-row"><span class="m-label" style="width:86px">amplitude</span><input id="A" type="range" min="2" max="80" value="25" style="flex:1"><span class="m-stat" id="Av"></span></div>
<div class="m-row"><span class="m-label" style="width:86px">damping</span><input id="D" type="range" min="0" max="0.5" step="0.01" value="0.05" style="flex:1"><span class="m-stat" id="Dv"></span></div></div>
<canvas id="c" width="640" height="300" style="width:100%;margin-top:10px;border-radius:10px"></canvas><div class="m-row" id="st" style="font-size:12px"></div></div>
<script>
var cv=document.getElementById('c'),ctx=cv.getContext('2d'),css=getComputedStyle(document.documentElement),C=function(n){return css.getPropertyValue(n).trim()};
var th,w,last=performance.now(),trace=[];function reset(){th=+document.getElementById('A').value*Math.PI/180;w=0;trace=[]}
function loop(now){var dt=Math.min(0.03,(now-last)/1000);last=now;var L=+document.getElementById('L').value,d=+document.getElementById('D').value,g=9.81;
for(var i=0;i<4;i++){var a=-g/L*Math.sin(th)-d*w;w+=a*dt/4;th+=w*dt/4}trace.push(th);if(trace.length>300)trace.shift();
var W=cv.width,H=cv.height,px=W*0.3,py=24,len=Math.min(240,L*90),bx=px+len*Math.sin(th),by=py+len*Math.cos(th);
ctx.fillStyle=C('--m-bg');ctx.fillRect(0,0,W,H);ctx.strokeStyle=C('--m-text');ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(px,py);ctx.lineTo(bx,by);ctx.stroke();ctx.fillStyle=C('--m-accent');ctx.beginPath();ctx.arc(bx,by,14,0,7);ctx.fill();
ctx.strokeStyle=C('--m-border');ctx.beginPath();ctx.moveTo(W*0.55,H/2);ctx.lineTo(W-10,H/2);ctx.stroke();ctx.strokeStyle='#66C98D';ctx.beginPath();trace.forEach(function(t,i){var x=W*0.55+i*(W*0.45-10)/300,y=H/2-t*80;i?ctx.lineTo(x,y):ctx.moveTo(x,y)});ctx.stroke();
var T0=2*Math.PI*Math.sqrt(L/g),A=+document.getElementById('A').value*Math.PI/180,T=T0*(1+A*A/16+11*Math.pow(A,4)/3072);
document.getElementById('Lv').textContent=L.toFixed(2);document.getElementById('Av').textContent=document.getElementById('A').value+'°';document.getElementById('Dv').textContent=d.toFixed(2);
document.getElementById('st').innerHTML='<span class="m-stat">T ≈ 2π√(L/g) = '+T0.toFixed(3)+' s</span><span class="m-stat">large-angle T ≈ '+T.toFixed(3)+' s</span>';requestAnimationFrame(loop)}
['L','A','D'].forEach(function(id){document.getElementById(id).oninput=reset});reset();requestAnimationFrame(loop);
</script>`,
  },
  {
    id: 'circuit', title: 'Series & parallel circuit', blurb: 'Ohm’s law with two resistors: current, voltages and power.', matches: ELECTRIC, kind: 'visualizer',
    code: `<div class="m-card"><div class="m-col"><div class="m-row"><span class="m-label" style="width:64px">V (volts)</span><input id="V" type="range" min="1" max="24" value="12" style="flex:1"><span class="m-stat" id="Vv"></span></div>
<div class="m-row"><span class="m-label" style="width:64px">R₁ (Ω)</span><input id="R1" type="range" min="1" max="100" value="20" style="flex:1"><span class="m-stat" id="R1v"></span></div>
<div class="m-row"><span class="m-label" style="width:64px">R₂ (Ω)</span><input id="R2" type="range" min="1" max="100" value="60" style="flex:1"><span class="m-stat" id="R2v"></span></div>
<div class="m-row"><select id="m"><option value="s">Series</option><option value="p">Parallel</option></select></div></div>
<svg id="s" viewBox="0 0 360 170" style="width:100%;height:auto;margin-top:6px"></svg><div id="o" class="m-row" style="font-size:12px"></div></div>
<script>
function z(x,y,w){return '<path d="M'+x+' '+y+' l6 -8 l12 16 l12 -16 l12 16 l12 -16 l6 8" fill="none" stroke="var(--m-accent)" stroke-width="3" stroke-linejoin="round"/>'}
function draw(){var V=+document.getElementById('V').value,R1=+document.getElementById('R1').value,R2=+document.getElementById('R2').value,par=document.getElementById('m').value==='p';
['V','R1','R2'].forEach(function(k){document.getElementById(k+'v').textContent=document.getElementById(k).value});
var Rt=par?R1*R2/(R1+R2):R1+R2,I=V/Rt,I1=par?V/R1:I,I2=par?V/R2:I,V1=I1*R1,V2=I2*R2,wire='stroke="var(--m-text)" stroke-width="2" fill="none"',s='';
s+='<line x1="40" y1="60" x2="40" y2="110" '+wire+'/><line x1="28" y1="78" x2="52" y2="78" stroke="var(--m-text)" stroke-width="3"/><line x1="34" y1="90" x2="46" y2="90" stroke="var(--m-text)" stroke-width="3"/><text x="10" y="88" font-size="12" fill="var(--m-muted)">'+V+'V</text>';
if(!par){s+='<path d="M40 60 V30 H120" '+wire+'/>'+z(120,30)+'<path d="M180 30 H230" '+wire+'/>'+z(230,30)+'<path d="M290 30 H330 V140 H40 V110" '+wire+'/><text x="135" y="58" font-size="12" fill="var(--m-muted)">R₁ '+V1.toFixed(2)+'V</text><text x="245" y="58" font-size="12" fill="var(--m-muted)">R₂ '+V2.toFixed(2)+'V</text>'}
else{s+='<path d="M40 60 V30 H150 M150 30 V20 H160 M150 30 V70 H160" '+wire+'/>'+z(160,20)+z(160,70)+'<path d="M220 20 H240 V30 M220 70 H240 V30 M240 30 H330 V140 H40 V110" '+wire+'/><text x="165" y="48" font-size="11" fill="var(--m-muted)">R₁ '+(I1*1000).toFixed(0)+'mA</text><text x="165" y="98" font-size="11" fill="var(--m-muted)">R₂ '+(I2*1000).toFixed(0)+'mA</text>'}
var dots='';for(var k=0;k<6;k++)dots+='<circle r="3" fill="#E0B84A"><animateMotion dur="'+Math.max(0.6,3/I/10).toFixed(2)+'s" begin="'+(k*0.5)+'s" repeatCount="indefinite" path="M40 60 V30 H330 V140 H40 Z"/></circle>';
document.getElementById('s').innerHTML=s+dots;
document.getElementById('o').innerHTML=['R_total '+Rt.toFixed(2)+' Ω','I '+(I*1000).toFixed(1)+' mA','P '+(V*I).toFixed(2)+' W'].map(function(x){return '<span class="m-stat">'+x+'</span>'}).join('')}
['V','R1','R2','m'].forEach(function(id){document.getElementById(id).oninput=draw});draw();
</script>`,
  },
  {
    id: 'normal', title: 'Normal distribution', blurb: 'Move μ and σ and shade P(a ≤ X ≤ b).', matches: STATS, kind: 'visualizer',
    code: `<div class="m-card"><div class="m-col"><div class="m-row"><span class="m-label" style="width:30px">μ</span><input id="mu" type="range" min="-3" max="3" step="0.1" value="0" style="flex:1"><span class="m-stat" id="muv"></span><span class="m-label" style="width:30px">σ</span><input id="sd" type="range" min="0.3" max="3" step="0.05" value="1" style="flex:1"><span class="m-stat" id="sdv"></span></div>
<div class="m-row"><span class="m-label" style="width:30px">a</span><input id="a" type="range" min="-6" max="6" step="0.1" value="-1" style="flex:1"><span class="m-stat" id="av"></span><span class="m-label" style="width:30px">b</span><input id="b" type="range" min="-6" max="6" step="0.1" value="1" style="flex:1"><span class="m-stat" id="bv"></span></div></div>
<canvas id="c" width="640" height="280" style="width:100%;margin-top:10px;border-radius:10px"></canvas><div class="m-row" id="o" style="font-size:12px"></div></div>
<script>
function erf(x){var s=x<0?-1:1;x=Math.abs(x);var t=1/(1+0.3275911*x),y=1-((((1.061405429*t-1.453152027)*t+1.421413741)*t-0.284496736)*t+0.254829592)*t*Math.exp(-x*x);return s*y}
var cv=document.getElementById('c'),g=cv.getContext('2d'),css=getComputedStyle(document.documentElement),C=function(n){return css.getPropertyValue(n).trim()};
function draw(){var mu=+document.getElementById('mu').value,sd=+document.getElementById('sd').value,a=+document.getElementById('a').value,b=+document.getElementById('b').value;if(a>b){var t=a;a=b;b=t}
['mu','sd','a','b'].forEach(function(k){document.getElementById(k+'v').textContent=(+document.getElementById(k).value).toFixed(1)});
var W=cv.width,H=cv.height,x0=-6,x1=6,pdf=function(x){return Math.exp(-Math.pow((x-mu)/sd,2)/2)/(sd*Math.sqrt(2*Math.PI))},ymax=pdf(mu)*1.15,sx=function(x){return (x-x0)/(x1-x0)*W},sy=function(y){return H-24-y/ymax*(H-40)};
g.fillStyle=C('--m-bg');g.fillRect(0,0,W,H);g.fillStyle=C('--m-accent');g.globalAlpha=.35;g.beginPath();g.moveTo(sx(a),sy(0));for(var x=a;x<=b;x+=0.02)g.lineTo(sx(x),sy(pdf(x)));g.lineTo(sx(b),sy(0));g.fill();g.globalAlpha=1;
g.strokeStyle=C('--m-accent');g.lineWidth=3;g.beginPath();for(var x2=x0;x2<=x1;x2+=0.02){x2===x0?g.moveTo(sx(x2),sy(pdf(x2))):g.lineTo(sx(x2),sy(pdf(x2)))}g.stroke();
g.strokeStyle=C('--m-border');g.lineWidth=1;g.beginPath();g.moveTo(0,sy(0));g.lineTo(W,sy(0));g.stroke();g.fillStyle=C('--m-muted');g.font='12px sans-serif';for(var k=-6;k<=6;k+=2)g.fillText(k,sx(k)-4,H-6);
var P=0.5*(erf((b-mu)/(sd*Math.SQRT2))-erf((a-mu)/(sd*Math.SQRT2)));
document.getElementById('o').innerHTML='<span class="m-stat">P('+a.toFixed(1)+' ≤ X ≤ '+b.toFixed(1)+') = '+(P*100).toFixed(2)+'%</span><span class="m-stat">z = '+((a-mu)/sd).toFixed(2)+' … '+((b-mu)/sd).toFixed(2)+'</span>'}
['mu','sd','a','b'].forEach(function(id){document.getElementById(id).oninput=draw});draw();
</script>`,
  },
  {
    id: 'ideal-gas', title: 'Ideal gas law', blurb: 'PV = nRT with a piston: hold one quantity and change another.', matches: CHEM, kind: 'visualizer',
    code: `<div class="m-card"><div class="m-col"><div class="m-row"><span class="m-label" style="width:88px">T (K)</span><input id="T" type="range" min="100" max="800" value="300" style="flex:1"><span class="m-stat" id="Tv"></span></div>
<div class="m-row"><span class="m-label" style="width:88px">V (L)</span><input id="V" type="range" min="5" max="50" value="24" style="flex:1"><span class="m-stat" id="Vv"></span></div>
<div class="m-row"><span class="m-label" style="width:88px">n (mol)</span><input id="n" type="range" min="0.2" max="3" step="0.1" value="1" style="flex:1"><span class="m-stat" id="nv"></span></div></div>
<canvas id="c" width="640" height="260" style="width:100%;margin-top:10px;border-radius:10px"></canvas><div class="m-row" id="o" style="font-size:12px"></div></div>
<script>
var cv=document.getElementById('c'),g=cv.getContext('2d'),css=getComputedStyle(document.documentElement),C=function(n){return css.getPropertyValue(n).trim()},ps=[];
for(var i=0;i<90;i++)ps.push({x:Math.random(),y:Math.random(),a:Math.random()*6.28});
function loop(){var T=+document.getElementById('T').value,V=+document.getElementById('V').value,n=+document.getElementById('n').value,P=n*0.082057*T/V;
['T','V','n'].forEach(function(k){document.getElementById(k+'v').textContent=document.getElementById(k).value});
var W=cv.width,H=cv.height,box=40+(V/50)*(W-120),speed=Math.sqrt(T)/900,count=Math.round(30*n);g.fillStyle=C('--m-bg');g.fillRect(0,0,W,H);
g.strokeStyle=C('--m-text');g.lineWidth=3;g.strokeRect(30,30,box,H-60);g.fillStyle=C('--m-surface-2');g.fillRect(30+box,30,14,H-60);g.fillStyle=C('--m-accent');
for(var i=0;i<count;i++){var p=ps[i];p.x+=Math.cos(p.a)*speed;p.y+=Math.sin(p.a)*speed*box/(H-60);if(p.x<0||p.x>1){p.a=Math.PI-p.a;p.x=Math.max(0,Math.min(1,p.x))}if(p.y<0||p.y>1){p.a=-p.a;p.y=Math.max(0,Math.min(1,p.y))}g.beginPath();g.arc(36+p.x*(box-12),36+p.y*(H-72),4,0,7);g.fill()}
var bar=Math.min(1,P/10);g.fillStyle=C('--m-surface-2');g.fillRect(W-50,30,20,H-60);g.fillStyle='#EB6674';g.fillRect(W-50,30+(H-60)*(1-bar),20,(H-60)*bar);
document.getElementById('o').innerHTML='<span class="m-stat">P = nRT/V = '+P.toFixed(2)+' atm</span><span class="m-stat">R = 0.08206 L·atm/(mol·K)</span>';requestAnimationFrame(loop)}
requestAnimationFrame(loop);
</script>`,
  },
];

// PhET's own simulations, run from phet.colorado.edu: a few per field, after MoeAI's.
const phet = (sim, matches, blurb) => ({ id: `phet-${sim}`, title: `${PHET_SIMS[sim].title} (PhET)`, blurb, matches, kind: 'phet', code: JSON.stringify({ sim }) });
SIMULATORS.push(
  phet('circuit-construction-kit-dc', new RegExp(`${LOGIC.source}|${ELECTRIC.source}`), 'Build real circuits with batteries, bulbs, switches and meters.'),
  phet('ohms-law', ELECTRIC, 'Change voltage and resistance and watch the current respond.'),
  phet('calculus-grapher', MATH, 'Draw a function and see its derivative and integral live.'),
  phet('graphing-quadratics', MATH, 'Vertex, roots and coefficients of a parabola, interactively.'),
  phet('trig-tour', MATH, 'The unit circle, sine, cosine and tangent, together.'),
  phet('vector-addition', new RegExp(`${MATH.source}|${PHYSICS.source}`), 'Add vectors tip to tail and read off components.'),
  phet('projectile-motion', PHYSICS, 'Cannons, drag and trajectories, measured.'),
  phet('masses-and-springs', PHYSICS, 'Springs, oscillation and energy with real controls.'),
  phet('wave-on-a-string', PHYSICS, 'Frequency, amplitude, damping and standing waves.'),
  phet('plinko-probability', STATS, 'Binomial distributions from falling balls.'),
  phet('curve-fitting', STATS, 'Fit polynomials to data and watch χ² change.'),
  phet('gas-properties', CHEM, 'Pressure, volume and temperature, particle by particle.'),
  phet('build-an-atom', CHEM, 'Protons, neutrons, electrons: build and identify atoms.'),
  phet('molecule-shapes', CHEM, 'VSEPR shapes and bond angles in 3D.'),
);

/** Shown when none of a student's courses matches any simulator yet. */
export const STARTER_IDS = ['function-plotter', 'python-ide', 'truth-table'];

/** For each course, the simulators that belong to it (each simulator listed once, under its first course). */
export function simulatorsForSubjects(subjects) {
  const seen = new Set();
  const groups = [];
  for (const subject of subjects) {
    const name = String(subject.name || '').toLowerCase();
    const sims = SIMULATORS.filter((sim) => sim.matches.test(name) && !seen.has(sim.id));
    sims.forEach((sim) => seen.add(sim.id));
    if (sims.length) groups.push({ subject, sims });
  }
  return groups;
}
