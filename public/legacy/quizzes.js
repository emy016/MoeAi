// ============================================================
// ICONS
// ============================================================
const ICONS = {
  'clipboard': '<rect x="8" y="2" width="8" height="4" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M9 12l2 2 4-4"/>',
  'zap': '<polygon points="13 2 4 14 11 14 10 22 20 9 13 9 13 2" fill="currentColor" stroke="none"/>',
  'list': '<line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><circle cx="3.5" cy="6" r="1" fill="currentColor" stroke="none"/><circle cx="3.5" cy="12" r="1" fill="currentColor" stroke="none"/><circle cx="3.5" cy="18" r="1" fill="currentColor" stroke="none"/>',
  'clock': '<circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 16 14"/>',
  'book': '<path d="M4 4a2 2 0 0 1 2-2h13v18H6a2 2 0 0 0-2 2V4z"/><line x1="8" y1="7" x2="15" y2="7"/>',
  'fire': '<path d="M12 2C10 6 6 8 8 12c2 4 0 8 4 10 4-2 2-6 4-10 2-4-2-6-4-10z" fill="currentColor" stroke="none"/>',
  'tv': '<rect x="2" y="5" width="20" height="13" rx="2"/><polyline points="8 21 12 18 16 21"/>',
  'arrow-left': '<line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>',
  'arrow-right': '<line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>',
  'check': '<polyline points="20 6 9 17 4 12"/>',
  'x': '<line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/>',
  'redo': '<path d="M21 7v6h-6"/><path d="M21 13a9 9 0 1 0-3 7.7L21 18"/>',
  'bookmark': '<path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z" fill="none"/>',
  'bookmark-fill': '<path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z" fill="currentColor" stroke="none"/>',
  'help': '<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.8.4-1 .9-1 1.7"/><circle cx="12" cy="17" r="0.5" fill="currentColor" stroke="none"/>',
  'terminal': '<polyline points="5 8 9 12 5 16"/><line x1="12" y1="16" x2="18" y2="16"/><rect x="2" y="4" width="20" height="16" rx="2"/>',
  'microchip': '<rect x="6" y="6" width="12" height="12" rx="1"/><path d="M9 2v4M15 2v4M9 18v4M15 18v4M2 9h4M2 15h4M18 9h4M18 15h4"/>',
  'dice': '<rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8.5" cy="8.5" r="1" fill="currentColor" stroke="none"/><circle cx="15.5" cy="15.5" r="1" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1" fill="currentColor" stroke="none"/>',
  'infinity': '<path d="M6 8a4 4 0 1 0 0 8c3 0 4-4 6-4s3 4 6 4a4 4 0 1 0 0-8c-3 0-4 4-6 4S9 8 6 8z"/>',
  'code': '<polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>',
  'bolt': '<polygon points="13 2 4 14 11 14 10 22 20 9 13 9 13 2" fill="currentColor" stroke="none"/>',
  'project-diagram': '<rect x="2" y="4" width="6" height="5" rx="1"/><rect x="16" y="4" width="6" height="5" rx="1"/><rect x="9" y="15" width="6" height="5" rx="1"/><path d="M5 9v2a2 2 0 0 0 2 2h3M19 9v2a2 2 0 0 1-2 2h-3"/>',
  'binary': '<rect x="4" y="3" width="7" height="8" rx="1"/><rect x="13" y="13" width="7" height="8" rx="1"/><path d="M6 21h4M8 21v-6M18 3l-2 1"/>',
};
function injectIcons(r){(r||document).querySelectorAll('i.ic[data-ic]').forEach(el=>{if(el.dataset.done)return;const p=ICONS[el.dataset.ic];if(p){el.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true">'+p+'</svg>';el.dataset.done='1';}})}

// ============================================================
// THEME SYSTEM
// ============================================================
function clearCustomInlineStyles(){const r=document.documentElement;['--custom-accent','--custom-accent2','--custom-accent3','--custom-glow','--custom-glow2','--custom-border','--custom-border2','--custom-tint','--custom-tint2','--custom-tint3'].forEach(v=>r.style.removeProperty(v));document.querySelectorAll('.td-ruby,.td-lava,.td-space,.td-oxford,.td-gray,.td-light,.td-terminal').forEach(el=>{el.style.removeProperty('background');el.style.removeProperty('box-shadow')});document.getElementById('customColorWrap')?.style.removeProperty('box-shadow')}
function setTheme(t,e){clearCustomInlineStyles();if(t==='terminal'){document.documentElement.setAttribute('data-theme','terminal');localStorage.setItem('edumoe-theme','terminal');localStorage.removeItem('edumoe-custom-color');showToast('$ mode --terminal');document.querySelectorAll('.theme-dot').forEach(d=>d.classList.remove('active'));if(e)e.classList.add('active');updateCRTButton();return}if(t==='ruby'){document.documentElement.removeAttribute('data-theme');document.getElementById('customColorPicker').value='#e11d48';document.getElementById('customColorWrap').style.background='#e11d48';localStorage.removeItem('edumoe-custom-color');localStorage.setItem('edumoe-theme','ruby');showToast('Theme: Ruby')}else{document.documentElement.setAttribute('data-theme',t);localStorage.setItem('edumoe-theme',t);localStorage.removeItem('edumoe-custom-color');const c={lava:'#ff5a1f',space:'#7c3aed',oxford:'#00d4ff',gray:'#6b7280',light:'#111111'};if(c[t]){document.getElementById('customColorPicker').value=c[t];document.getElementById('customColorWrap').style.background=c[t]}showToast('Theme: '+t.charAt(0).toUpperCase()+t.slice(1))}document.querySelectorAll('.theme-dot').forEach(d=>d.classList.remove('active'));if(e)e.classList.add('active');updateCRTButton()}
function setCustomTheme(c){clearCustomInlineStyles();const r=parseInt(c.slice(1,3),16),g=parseInt(c.slice(3,5),16),b=parseInt(c.slice(5,7),16);document.documentElement.setAttribute('data-theme','custom');const root=document.documentElement;root.style.setProperty('--custom-accent',c);root.style.setProperty('--custom-accent2',`rgb(${Math.min(r+40,255)},${Math.min(g+40,255)},${Math.min(b+40,255)})`);root.style.setProperty('--custom-accent3',`rgb(${Math.min(r+80,255)},${Math.min(g+80,255)},${Math.min(b+80,255)})`);root.style.setProperty('--custom-glow',`rgba(${r},${g},${b},0.35)`);root.style.setProperty('--custom-glow2',`rgba(${r},${g},${b},0.14)`);root.style.setProperty('--custom-border',`rgba(${r},${g},${b},0.18)`);root.style.setProperty('--custom-border2',`rgba(${r},${g},${b},0.32)`);root.style.setProperty('--custom-tint',`rgba(${r},${g},${b},0.05)`);root.style.setProperty('--custom-tint2',`rgba(${r},${g},${b},0.10)`);root.style.setProperty('--custom-tint3',`rgba(${r},${g},${b},0.16)`);document.getElementById('customColorWrap').style.background=c;document.querySelectorAll('.theme-dot').forEach(d=>d.classList.remove('active'));localStorage.setItem('edumoe-theme','custom');localStorage.setItem('edumoe-custom-color',c);updateCRTButton();showToast('🎨 Custom color')}
function toggleCRT(){const html=document.documentElement,btn=document.getElementById('crtToggle');const off=html.classList.toggle('no-crt');localStorage.setItem('edumoe-crt',off?'off':'on');if(btn)btn.classList.toggle('off',off);showToast(off?'$ crt --off':'$ crt --on')}
function updateCRTButton(){const btn=document.getElementById('crtToggle');if(!btn)return;const isTerminal=document.documentElement.getAttribute('data-theme')==='terminal';btn.style.display=isTerminal?'inline-flex':'none';btn.classList.toggle('off',document.documentElement.classList.contains('no-crt'))}
const savedTheme=localStorage.getItem('edumoe-theme')||'ruby';const savedColor=localStorage.getItem('edumoe-custom-color');if(savedTheme==='custom'&&savedColor){setCustomTheme(savedColor);document.getElementById('customColorPicker').value=savedColor}else if(savedTheme!=='ruby'&&savedTheme!=='custom'){document.documentElement.setAttribute('data-theme',savedTheme)}
const crtPref=localStorage.getItem('edumoe-crt');if(crtPref==='off'||(crtPref===null&&window.matchMedia('(prefers-reduced-motion:reduce)').matches)){document.documentElement.classList.add('no-crt')}
document.getElementById('customColorPicker').addEventListener('input',function(e){setCustomTheme(e.target.value)});
document.addEventListener('DOMContentLoaded',()=>{const dot=document.getElementById('td-'+savedTheme);if(dot&&savedTheme!=='custom'&&savedTheme!=='ruby')dot.classList.add('active');else if(savedTheme==='ruby')document.getElementById('td-ruby')?.classList.add('active');updateCRTButton();const btn=document.getElementById('crtToggle');if(btn&&document.documentElement.classList.contains('no-crt'))btn.classList.add('off')});

// ============================================================
// KEYBOARD SHORTCUTS
// ============================================================
document.addEventListener('keydown',e=>{
  const tabs=['browse','quick','exam','bookmarks','analytics','history'];
  const idx=parseInt(e.key)-1;
  if(idx>=0&&idx<tabs.length&&!e.ctrlKey&&!e.metaKey&&!e.altKey){
    const target=document.querySelector(`.mode-tab[data-mode="${tabs[idx]}"]`);
    if(target){setMode(tabs[idx]);e.preventDefault()}
  }
  if(state.active&&!state.finished){
    if(!state.answered&&e.key>='1'&&e.key<='4'){
      const idx=parseInt(e.key)-1;
      const opts=document.querySelectorAll('#opts .option');
      if(opts[idx]&&!opts[idx].disabled){e.preventDefault();answer(idx)}
    }else if(e.key==='Enter'&&state.answered){e.preventDefault();next()}
    else if((e.key==='b'||e.key==='B')&&state.active&&state.active.shuffled){
      const q=state.active.shuffled[state.qi];if(q){e.preventDefault();toggleBookmark(q.qid)}}
    else if(e.key==='Escape'&&state.active){if(confirm('Quit this quiz? Progress will be lost.'))quitQuiz()}
  }
});

// ============================================================
// STATE
// ============================================================
let results={};let history=[];let bookmarks=[];
let state={
  mode:'browse',quickTopic:null,quickCount:5,difficulty:'mixed',
  examTime:300,examCount:10,examTopic:null,
  active:null,qi:0,answered:false,correctCount:0,streak:0,bestStreak:0,
  finished:false,lastPct:0,lastPassed:false,startTime:0,timer:0,timerInterval:null
};

try{const r=localStorage.getItem('edumoe_quiz_results');if(r)results=JSON.parse(r);
  const h=localStorage.getItem('edumoe_quiz_history');if(h)history=JSON.parse(h);
  const b=localStorage.getItem('edumoe_bookmarks');if(b)bookmarks=JSON.parse(b);
  const s=localStorage.getItem('edumoe_best_streak');if(s)state.bestStreak=parseInt(s);
}catch(e){}

function saveState(){
  localStorage.setItem('edumoe_quiz_results',JSON.stringify(results));
  localStorage.setItem('edumoe_quiz_history',JSON.stringify(history));
  localStorage.setItem('edumoe_bookmarks',JSON.stringify(bookmarks));
  localStorage.setItem('edumoe_best_streak',String(state.bestStreak));
  document.getElementById('bookmarkBadge').textContent=bookmarks.length;
  document.getElementById('bookmarkCount').textContent=bookmarks.length;
}

// ============================================================
// RENDER MATH (KaTeX auto-render)
// ============================================================
function renderMath(element){
  if(typeof renderMathInElement === 'function'){
    try{
      renderMathInElement(element, {
        delimiters: [
          {left: '$$', right: '$$', display: true},
          {left: '\\[', right: '\\]', display: true},
          {left: '\\(', right: '\\)', display: false}
        ],
        throwOnError: false
      });
    }catch(e){}
  }
}

// ============================================================
// QUESTION BANK – 350+ with proper math delimiters
// ============================================================
const PASS_THRESHOLD=60;

function shuffle(a){a=[...a];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}

// ─── Structured Programming (no math) ───
const SP_QUESTIONS = [
  {q:'Which header must you include to use <code>cout</code>?',choices:['<stdio.h>','<iostream>','<string>','<conio.h>'],correct:1,exp:'<code>&lt;iostream&gt;</code> provides the input/output stream objects.',diff:'easy',concept:'I/O'},
  {q:'What does every C++ program need exactly one of?',choices:['A loop','A class','A <code>main()</code> function','A comment'],correct:2,exp:'Execution always begins at <code>main()</code>.',diff:'easy',concept:'Structure'},
  {q:'What is printed?<pre>int x = 5;\ncout &lt;&lt; x++ &lt;&lt; " " &lt;&lt; x;</pre>',choices:['5 5','6 6','5 6','6 5'],correct:2,exp:'Post-increment uses the current value (5) first, then increments x to 6.',diff:'medium',concept:'Increment'},
  {q:'Which is a valid variable declaration?',choices:['int 2x;','double my-var;','int _count;','float class;'],correct:2,exp:'Identifiers start with letter or underscore.',diff:'easy',concept:'Variables'},
  {q:'The statement <code>if (x = 5)</code> is a bug because…',choices:['5 is too large','= assigns instead of compares, and is always true','You can\'t compare integers','It needs a semicolon'],correct:1,exp:'<code>=</code> is assignment; comparison needs <code>==</code>.',diff:'medium',concept:'Conditionals'},
  {q:'What is the output?<pre>int x = 3;\ncout &lt;&lt; ++x * 2;</pre>',choices:['6','7','8','9'],correct:2,exp:'Pre-increment ++x increments x to 4, then ×2=8.',diff:'medium',concept:'Pre-increment'},
  {q:'Which loop is best when you know the exact number of iterations?',choices:['while','do-while','for','goto'],correct:2,exp:'The <code>for</code> loop bundles init, condition, update.',diff:'easy',concept:'Loops'},
  {q:'What is the size of <code>int</code> on most systems?',choices:['1 byte','2 bytes','4 bytes','8 bytes'],correct:2,exp:'Most systems use 4-byte ints.',diff:'easy',concept:'Data Types'},
  {q:'What is the correct syntax for a function that returns nothing?',choices:['void myFunc()','int myFunc()','myFunc()','return myFunc()'],correct:0,exp:'<code>void</code> means no return value.',diff:'easy',concept:'Functions'},
  {q:'What is printed?<pre>int arr[] = {1,2,3};\ncout &lt;&lt; arr[2];</pre>',choices:['1','2','3','0'],correct:2,exp:'Array indices start at 0: arr[2]=3.',diff:'easy',concept:'Arrays'},
  {q:'What is the output?<pre>int x = 10;\nint &amp;r = x;\nr = 20;\ncout &lt;&lt; x;</pre>',choices:['10','20','Compile error','Undefined'],correct:1,exp:'A reference is an alias; modifying r modifies x.',diff:'medium',concept:'References'},
  {q:'Which keyword allocates dynamic memory in C++?',choices:['malloc','new','calloc','alloc'],correct:1,exp:'The <code>new</code> keyword allocates memory on the heap.',diff:'medium',concept:'Dynamic Memory'},
  {q:'What is the output?<pre>int i = 0;\nwhile(i < 5) {\n    if(i == 3) break;\n    i++;\n}\ncout &lt;&lt; i;</pre>',choices:['3','4','5','0'],correct:0,exp:'The loop breaks when i==3, so i remains 3.',diff:'medium',concept:'Break'},
  {q:'What is the output?<pre>string s = "Hello";\ncout &lt;&lt; s.length();</pre>',choices:['2','3','5','6'],correct:2,exp:'<code>length()</code> returns the number of characters (5).',diff:'easy',concept:'Strings'},
  {q:'Which header provides <code>sqrt()</code>?',choices:['<cmath>','<math.h>','<stdio.h>','<stdlib.h>'],correct:0,exp:'Modern C++ uses <code>&lt;cmath&gt;</code>.',diff:'easy',concept:'Math'},
  {q:'What is the output?<pre>int a = 5, b = 2;\ncout &lt;&lt; a / b;</pre>',choices:['2.5','2','3','2.0'],correct:1,exp:'Integer division truncates: 5/2=2.',diff:'easy',concept:'Division'},
  {q:'How to read a full line including spaces?',choices:['cin >> str','getline(cin, str)','cin.getline(str)','str = cin.read()'],correct:1,exp:'<code>getline(cin, str)</code> reads the entire line.',diff:'easy',concept:'Input'},
  {q:'What does <code>continue</code> do?',choices:['Exits the loop','Skips to next iteration','Restarts the loop','Breaks out'],correct:1,exp:'<code>continue</code> skips the rest of the current iteration.',diff:'medium',concept:'Loops'},
  {q:'What is the output?<pre>int fact(int n) {\n    if(n <= 1) return 1;\n    return n * fact(n-1);\n}\ncout &lt;&lt; fact(4);</pre>',choices:['12','24','6','120'],correct:1,exp:'fact(4)=4×3×2×1=24.',diff:'medium',concept:'Recursion'},
  {q:'Which of these is a valid C++ comment?',choices:['// comment','/* comment */','# comment','Both // and /* */'],correct:3,exp:'C++ supports both single-line (//) and multi-line (/* */) comments.',diff:'easy',concept:'Comments'},
];

// ─── Logic Design ───
const LD_QUESTIONS = [
  {q:'The output of a <b>NAND</b> gate is 0 only when…',choices:['Both inputs are 0','Both inputs are 1','Inputs differ','Never'],correct:1,exp:'NAND = NOT AND. AND is 1 only when both are 1.',diff:'easy',concept:'NAND'},
  {q:'By De Morgan\'s law, \\((A \\cdot B)\\)\' equals…',choices:["A'·B'","A'+B'","A+B","A·B"],correct:1,exp:"De Morgan: (A·B)' = A'+B'.",diff:'medium',concept:'De Morgan'},
  {q:'\\(A \\cdot B \\oplus A \\cdot B\\) equals…',choices:['A·B','1','0','A'],correct:2,exp:'XOR with itself = 0.',diff:'easy',concept:'XOR'},
  {q:'How many rows in a truth table with 4 inputs?',choices:['4','8','16','32'],correct:2,exp:'\\(2^4 = 16\\) rows.',diff:'easy',concept:'Truth Tables'},
  {q:'A full adder\'s Sum output equals…',choices:['A·B·Cin','A+B+Cin','A⊕B⊕Cin','A·B+Cin'],correct:2,exp:'Sum = XOR of all three inputs.',diff:'medium',concept:'Adders'},
  {q:'Which gate is "universal"?',choices:['AND','OR','NAND','XOR'],correct:2,exp:'NAND can build any other gate.',diff:'easy',concept:'Universal'},
  {q:'Simplify: A + A\'B',choices:['A+B','A\'+B','B','A\''],correct:0,exp:'A + A\'B = A + B (absorption).',diff:'medium',concept:'Boolean'},
  {q:'What is the output of XOR with inputs A and A?',choices:['A','A\'','0','1'],correct:2,exp:'XOR outputs 0 when inputs are identical.',diff:'easy',concept:'XOR'},
  {q:'What is the Boolean expression for a half adder\'s carry?',choices:['A⊕B','A·B','A+B','A\'B\''],correct:1,exp:'Half adder carry = A AND B.',diff:'easy',concept:'Half Adder'},
  {q:'How many inputs does a full adder have?',choices:['2','3','4','5'],correct:1,exp:'A full adder has three inputs: A, B, and Carry-in.',diff:'easy',concept:'Adders'},
  {q:'What is the complement of F = A·B + A\'·B\'?',choices:['A\'+B\'','A\'B+AB\'','A·B+A\'·B\'','1'],correct:1,exp:"F' = (A·B + A'·B')' = (A'+B')·(A+B) = A'B + AB'.",diff:'hard',concept:'Boolean'},
  {q:'Which gate outputs 1 when an odd number of inputs are 1?',choices:['AND','OR','XOR','XNOR'],correct:2,exp:'XOR outputs 1 when the number of 1s is odd.',diff:'easy',concept:'XOR'},
  {q:'What is the output of a NOR gate when both inputs are 0?',choices:['0','1','X','Z'],correct:1,exp:'NOR = NOT OR. OR(0,0)=0 → NOT 0 = 1.',diff:'easy',concept:'NOR'},
  {q:'Simplify: (A+B)(A+C)',choices:['A+BC','AB+AC','A+B+C','BC'],correct:0,exp:'(A+B)(A+C) = A + BC (distributive).',diff:'medium',concept:'Boolean'},
  {q:'What is the output of a 3-to-8 decoder when input is 101?',choices:['00000001','00000100','00001000','00100000'],correct:2,exp:'101₂=5 → output 5 = 00001000.',diff:'medium',concept:'Decoders'},
  {q:'Which flip-flop has no invalid input state?',choices:['SR','JK','D','T'],correct:2,exp:'D flip-flop has no invalid states.',diff:'medium',concept:'Flip-Flops'},
  {q:'What is the Boolean expression for a 4-to-1 MUX?',choices:['Σ S\'1 S\'0 I0','Σ S1 S0 I?','Both','None'],correct:2,exp:'4-to-1 MUX = S\'1 S\'0 I0 + S\'1 S0 I1 + S1 S\'0 I2 + S1 S0 I3.',diff:'hard',concept:'MUX'},
  {q:'What is the 2\'s complement of 0110?',choices:['1001','1010','0110','1000'],correct:1,exp:'Flip bits (1001) + 1 = 1010.',diff:'medium',concept:'2\'s Complement'},
  {q:'What is the BCD representation of decimal 25?',choices:['11001','0010 0101','0001 1001','1001 0010'],correct:1,exp:'BCD encodes each digit separately: 2=0010, 5=0101.',diff:'easy',concept:'BCD'},
  {q:'What is the output of an AND gate with inputs 1 and X?',choices:['1','0','X','Undefined'],correct:2,exp:'1 AND X = X (identity property).',diff:'easy',concept:'AND'},
];

// ─── Probability & Statistics ───
const PR_QUESTIONS = [
  {q:'For any two events, \\(P(A \\cup B)\\) equals…',choices:['P(A)+P(B)','P(A)+P(B)-P(A∩B)','P(A)·P(B)','P(A∩B)/P(B)'],correct:1,exp:'General addition rule — subtract the overlap.',diff:'easy',concept:'Probability'},
  {q:'Two events are <b>independent</b> when…',choices:['P(A∩B)=0','P(A∩B)=P(A)·P(B)','P(A)=P(B)','They can\'t both happen'],correct:1,exp:'Independence means the joint equals the product.',diff:'easy',concept:'Independence'},
  {q:'"Average of 3 arrivals per hour" signals which distribution?',choices:['Binomial','Normal','Poisson','Uniform'],correct:2,exp:'"Per unit time / average rate" → Poisson.',diff:'easy',concept:'Distributions'},
  {q:'\\(P(A|B)\\) is calculated as…',choices:['P(A∩B)/P(B)','P(A∩B)/P(A)','P(A)·P(B)','P(A)+P(B)'],correct:0,exp:'Conditional = joint / condition probability.',diff:'easy',concept:'Conditional'},
  {q:'A fixed number of trials with a success count → …',choices:['Poisson','Binomial','Normal','Geometric'],correct:1,exp:'"Fixed n trials" + "success count" → Binomial.',diff:'easy',concept:'Distributions'},
  {q:'If P(A)=0.4, P(B)=0.3, independent, \\(P(A \\cup B)=\\)?',choices:['0.7','0.58','0.12','0.42'],correct:1,exp:'0.4+0.3-(0.4×0.3)=0.7-0.12=0.58.',diff:'medium',concept:'Probability'},
  {q:'In a Poisson distribution with \\(\\lambda=3\\), what is \\(E[X]\\)?',choices:['3','√3','9','1/3'],correct:0,exp:'For Poisson: E[X] = λ = 3.',diff:'easy',concept:'Poisson'},
  {q:'Probability of exactly 3 heads in 5 flips?',choices:['5/32','10/32','15/32','20/32'],correct:1,exp:'C(5,3)/2^5 = 10/32.',diff:'medium',concept:'Binomial'},
  {q:'\\(P(A \\cap B)=0\\) means A and B are…',choices:['Independent','Mutually exclusive','Disjoint','Both B and C'],correct:3,exp:'P(A∩B)=0 means mutually exclusive (disjoint).',diff:'easy',concept:'Probability'},
  {q:'Bayes\' theorem is used to…',choices:['Find joint probability','Reverse conditional probabilities','Find expected value','Find variance'],correct:1,exp:'Bayes reverses conditional probabilities.',diff:'medium',concept:'Bayes'},
  {q:'What is the variance of a Binomial(n,p) distribution?',choices:['np','np(1-p)','√(np(1-p))','p(1-p)'],correct:1,exp:'Var(X) = np(1-p) for Binomial.',diff:'medium',concept:'Binomial'},
  {q:'Which distribution models the time between events?',choices:['Poisson','Exponential','Normal','Uniform'],correct:1,exp:'Exponential models time between events in a Poisson process.',diff:'medium',concept:'Exponential'},
  {q:'How many ways to choose 3 from 7?',choices:['21','35','42','210'],correct:1,exp:'C(7,3) = 7!/(3!4!) = 35.',diff:'easy',concept:'Combinatorics'},
  {q:'In a Venn diagram, \\(P(A \\cap B)\\) is the…',choices:['Union','Intersection','Complement','Difference'],correct:1,exp:'A∩B is the intersection (overlap).',diff:'easy',concept:'Sets'},
  {q:'What is \\(P(Z > 1.96)\\) for standard normal?',choices:['0.025','0.05','0.975','0.95'],correct:0,exp:'P(Z > 1.96) = 0.025 (two-tailed 5%).',diff:'hard',concept:'Normal'},
  {q:'What is the mean of a Uniform(0,10) distribution?',choices:['5','10','0','2.5'],correct:0,exp:'Mean = (a+b)/2 = (0+10)/2 = 5.',diff:'easy',concept:'Uniform'},
  {q:'For a fair coin, P(HHH) = ?',choices:['1/2','1/4','1/8','1/16'],correct:2,exp:'(1/2)³ = 1/8.',diff:'easy',concept:'Probability'},
  {q:'What is the expected value of a Geometric(p) distribution?',choices:['p','1/p','(1-p)/p','p/(1-p)'],correct:1,exp:'E[X] = 1/p for geometric.',diff:'medium',concept:'Geometric'},
  {q:'What is the formula for combinations \\(C(n,r)\\)?',choices:['n!/(n-r)!','n!/(r!(n-r)!)','n^r','r^n'],correct:1,exp:'C(n,r) = n!/(r!(n-r)!).',diff:'easy',concept:'Combinatorics'},
  {q:'What is the range of a standard normal \\(Z\\)?',choices:['0 to 1','-1 to 1','-∞ to ∞','0 to ∞'],correct:2,exp:'Z ranges from -∞ to +∞.',diff:'easy',concept:'Normal'},
];

// ─── Calculus ───
const CA_QUESTIONS = [
  {q:'\\(\\int x^n dx\\) equals (n≠−1)…',choices:['n·xⁿ⁻¹','xⁿ⁺¹/(n+1)+C','xⁿ⁻¹/(n−1)','n·xⁿ⁺¹+C'],correct:1,exp:'Power rule: raise power by 1, divide, add C.',diff:'easy',concept:'Integration'},
  {q:'\\(\\frac{d}{dx} [\\sin(x)] =\\) …',choices:['−cos(x)','cos(x)','−sin(x)','tan(x)'],correct:1,exp:'Derivative of sin is cos.',diff:'easy',concept:'Derivatives'},
  {q:'What is the most common lost mark on indefinite integrals?',choices:['Wrong sign','Forgetting +C','Using degrees','Wrong variable'],correct:1,exp:'Every indefinite integral needs +C.',diff:'easy',concept:'Integration'},
  {q:'\\(\\int \\frac{1}{x} dx =\\) …',choices:['ln|x|+C','−1/x²+C','1/x²+C','x+C'],correct:0,exp:'∫1/x dx = ln|x|+C (special case n=-1).',diff:'medium',concept:'Integration'},
  {q:'\\(\\frac{d}{dx} [e^{2x}] =\\) …',choices:['e^{2x}','2e^{2x}','2x·e^{2x-1}','e^{2x}+C'],correct:1,exp:'Chain rule: 2e^(2x).',diff:'medium',concept:'Chain Rule'},
  {q:'\\(\\int (x^2+3x) dx =\\) …',choices:['x³+1.5x²+C','x³/3+1.5x²+C','2x+3+C','(x³+3x²)/3+C'],correct:1,exp:'∫x²dx=x³/3, ∫3xdx=1.5x².',diff:'easy',concept:'Integration'},
  {q:'What is the derivative of ln(x)?',choices:['1/x','x','ln(x)','e^x'],correct:0,exp:'d/dx[ln(x)] = 1/x.',diff:'easy',concept:'Derivatives'},
  {q:'\\(\\int \\sin(x) dx =\\) …',choices:['cos(x)+C','−cos(x)+C','sin(x)+C','−sin(x)+C'],correct:1,exp:'∫sin(x)dx = -cos(x)+C.',diff:'easy',concept:'Integration'},
  {q:'\\(\\frac{d}{dx} [x^2 \\cdot \\sin(x)] =\\) …',choices:['2x·sin(x)+x²·cos(x)','2x·sin(x)','x²·cos(x)','2x·cos(x)'],correct:0,exp:'Product rule: (x²)\'sin(x)+x²(sin(x))\'',diff:'hard',concept:'Product Rule'},
  {q:'The derivative of f(g(x)) is…',choices:["f'(g(x))","g'(x)·f'(x)","f'(g(x))·g'(x)","f'(x)·g'(x)"],correct:2,exp:'Chain rule: f\'(g(x))·g\'(x).',diff:'medium',concept:'Chain Rule'},
  {q:'\\(\\int e^x dx =\\) …',choices:['e^x+C','e^x/x+C','ln(e^x)+C','xe^x+C'],correct:0,exp:'∫e^x dx = e^x+C.',diff:'easy',concept:'Integration'},
  {q:'What is the derivative of tan(x)?',choices:['sec²(x)','csc²(x)','sec(x)tan(x)','−csc²(x)'],correct:0,exp:'d/dx[tan(x)] = sec²(x).',diff:'medium',concept:'Derivatives'},
  {q:'The area under y=f(x) from a to b is…',choices:['∫ f(x) dx','f(b)-f(a)','∫_a^b f(x) dx',"f'(b)-f'(a)"],correct:2,exp:'The definite integral gives the area under the curve.',diff:'easy',concept:'Integration'},
  {q:'\\(\\frac{d}{dx}[\\cos(x)] =\\) …',choices:['sin(x)','−sin(x)','−cos(x)','tan(x)'],correct:1,exp:'d/dx[cos(x)] = −sin(x).',diff:'easy',concept:'Derivatives'},
  {q:'\\(\\int \\sec^2(x) dx =\\) …',choices:['tan(x)+C','−cot(x)+C','sec(x)+C','csc(x)+C'],correct:0,exp:'∫sec²(x)dx = tan(x)+C.',diff:'medium',concept:'Integration'},
  {q:'The Fundamental Theorem of Calculus connects…',choices:['Derivatives and integrals','Algebra and trigonometry','Probability and statistics','Logic and circuits'],correct:0,exp:'The FTC links differentiation and integration.',diff:'easy',concept:'FTC'},
  {q:'\\(\\frac{d}{dx}[\\arcsin(x)] =\\) …',choices:['1/√(1-x²)','1/(1+x²)','−1/√(1-x²)','√(1-x²)'],correct:0,exp:'d/dx[arcsin(x)] = 1/√(1-x²).',diff:'hard',concept:'Derivatives'},
  {q:'\\(\\int \\frac{1}{1+x^2} dx =\\) …',choices:['arctan(x)+C','arcsin(x)+C','ln(1+x²)+C','1/(1+x²)+C'],correct:0,exp:'∫1/(1+x²)dx = arctan(x)+C.',diff:'hard',concept:'Integration'},
  {q:'\\(\\frac{d}{dx}[x^x] =\\) …',choices:['x^x(ln(x)+1)','x·x^(x-1)','x^x·ln(x)','x^x'],correct:0,exp:'d/dx[x^x]=x^x(ln(x)+1).',diff:'hard',concept:'Derivatives'},
  {q:'\\(\\int_0^\\pi \\sin(x) dx =\\) ?',choices:['0','1','2','π'],correct:2,exp:'[-cos(x)]_0^π = -cos(π)+cos(0)=2.',diff:'medium',concept:'Definite Integral'},
];

// ─── Differential Equations ───
const DE_QUESTIONS = [
  {q:'What is the order of \\(y\'\' + 2y\' + 5y = 0\\)?',choices:['1','2','3','4'],correct:1,exp:'Highest derivative is y\'\' (2nd order).',diff:'easy',concept:'Order'},
  {q:'What is the characteristic equation of \\(y\'\' + 3y\' + 2y = 0\\)?',choices:['r²+3r+2=0','r²-3r+2=0','r²+3r-2=0','r²-3r-2=0'],correct:0,exp:'Substitute y=e^(rx): r²+3r+2=0.',diff:'medium',concept:'Characteristic'},
  {q:'What type of roots does \\(r^2+4=0\\) have?',choices:['Real distinct','Real repeated','Complex conjugate','Zero'],correct:2,exp:'r²=-4 → r=±2i (complex).',diff:'medium',concept:'Roots'},
  {q:'What is the general solution to \\(y\'=2x\\)?',choices:['y=x²+C','y=2x²+C','y=x²/2+C','y=2x+C'],correct:0,exp:'∫dy=∫2xdx → y=x²+C.',diff:'easy',concept:'Separable'},
  {q:'What is the integrating factor for \\(y\'+2y=e^x\\)?',choices:['e^{2x}','e^{-2x}','e^x','x²'],correct:0,exp:'μ=e^{∫2 dx}=e^{2x}.',diff:'hard',concept:'Integrating Factor'},
  {q:'What is the solution to \\(y\'=ky\\)?',choices:['y=Ce^{kt}','y=Ce^{-kt}','y=C sin(kt)','y=C cos(kt)'],correct:0,exp:'Separable → y=Ce^{kt}.',diff:'medium',concept:'Exponential'},
  {q:'What is the Wronskian used for?',choices:['Checking linear independence','Finding eigenvalues','Solving systems','Integrating factors'],correct:0,exp:'The Wronskian determines if solutions are linearly independent.',diff:'hard',concept:'Wronskian'},
  {q:'What type of ODE is \\(dy/dx = x/y\\)?',choices:['Linear','Separable','Exact','Homogeneous'],correct:1,exp:'dy/dx=x/y → y dy = x dx → separable.',diff:'easy',concept:'Separable'},
  {q:'What is the general solution to \\(y\'\'-y=0\\)?',choices:['C₁e^x+C₂e^{-x}','C₁cos(x)+C₂sin(x)','C₁e^x+C₂xe^x','C₁e^{-x}+C₂xe^{-x}'],correct:0,exp:'r²-1=0 → r=±1 → y=C₁e^x+C₂e^{-x}.',diff:'medium',concept:'Second Order'},
  {q:'What is the solution to \\(dy/dx=y\\) with y(0)=3?',choices:['y=3e^x','y=e^{3x}','y=3x','y=3e^{-x}'],correct:0,exp:'y=Ce^x, y(0)=3 → C=3.',diff:'easy',concept:'IVP'},
  {q:'What is the characteristic equation of \\(y\'\'+4y\'+4y=0\\)?',choices:['(r+2)²=0','(r-2)²=0','r²+4r+4=0','Both A and C'],correct:3,exp:'r²+4r+4=(r+2)²=0.',diff:'medium',concept:'Characteristic'},
  {q:'What type of solution does \\(y\'\'+4y\'+4y=0\\) have?',choices:['Real distinct','Repeated','Complex','No solution'],correct:1,exp:'r=-2 repeated → repeated roots.',diff:'medium',concept:'Repeated Roots'},
  {q:'What is the general solution for repeated roots r?',choices:['C₁e^{rx}+C₂e^{rx}','(C₁+C₂x)e^{rx}','C₁e^{rx}+C₂xe^{rx}','Both B and C'],correct:3,exp:'For repeated roots: y=(C₁+C₂x)e^{rx}.',diff:'hard',concept:'Repeated Roots'},
  {q:'What is the general solution for complex roots α±iβ?',choices:['e^{αx}(C₁cosβx+C₂sinβx)','e^{αx}(C₁e^{βx}+C₂e^{-βx})','C₁e^{αx}cosβx+C₂e^{αx}sinβx','Both A and C'],correct:3,exp:'Complex roots give y=e^{αx}(C₁cosβx+C₂sinβx).',diff:'hard',concept:'Complex Roots'},
  {q:'What is \\(dy/dx\\) of \\(y=e^{x}\\)?',choices:['e^x','xe^{x-1}','ln(x)e^x','e^x'],correct:0,exp:'d/dx[e^x]=e^x.',diff:'easy',concept:'Exponential'},
  {q:'What is the order of \\(d^3y/dx^3+2y=0\\)?',choices:['1','2','3','4'],correct:2,exp:'Highest derivative is third, so order is 3.',diff:'easy',concept:'Order'},
  {q:'Is \\(y\'\'+\\sin(y)=0\\) linear?',choices:['Yes','No','It depends','Both'],correct:1,exp:'sin(y) makes it nonlinear.',diff:'hard',concept:'Linear'},
  {q:'What is the solution to \\(dy/dx=x^2\\) with y(1)=2?',choices:['y=x³/3+5/3','y=x³/3+2','y=x³+2','y=x³/3+1'],correct:0,exp:'y=x³/3+C, y(1)=2 → 1/3+C=2 → C=5/3.',diff:'medium',concept:'IVP'},
  {q:'What is the role of P(x) in a linear ODE?',choices:['Determines order','Affects integrating factor','Sets the solution','None'],correct:1,exp:'P(x) determines μ=e^{∫P dx}.',diff:'hard',concept:'Integrating Factor'},
  {q:'What is the solution to \\(y\'+3y=0\\)?',choices:['y=Ce^{-3x}','y=Ce^{3x}','y=C sin(3x)','y=C cos(3x)'],correct:0,exp:'dy/y=-3dx → y=Ce^{-3x}.',diff:'medium',concept:'Linear'},
];

// ─── Physics ───
const PH_QUESTIONS = [
  {q:'What does Ohm\'s Law state?',choices:['V=IR','I=VR','R=VI','V=I/R'],correct:0,exp:'Ohm\'s Law: V = IR.',diff:'easy',concept:'Ohm'},
  {q:'What is the SI unit of electric current?',choices:['Volt','Ampere','Ohm','Watt'],correct:1,exp:'The Ampere (A) is the unit of current.',diff:'easy',concept:'Units'},
  {q:'What is the unit of resistance?',choices:['Volt','Ampere','Ohm','Watt'],correct:2,exp:'The Ohm (Ω) is the unit of resistance.',diff:'easy',concept:'Units'},
  {q:'What does Kirchhoff\'s Voltage Law state?',choices:['Sum of currents at a node=0','Sum of voltages around a loop=0','V=IR','P=VI'],correct:1,exp:'KVL: sum of voltage drops around any closed loop is zero.',diff:'medium',concept:'Kirchhoff'},
  {q:'What is the formula for electric power?',choices:['P=VI','P=V/R','P=I²R','All of the above'],correct:3,exp:'P=VI=V²/R=I²R all valid.',diff:'easy',concept:'Power'},
  {q:'What is the unit of power?',choices:['Volt','Ampere','Ohm','Watt'],correct:3,exp:'The Watt (W) is the unit of power.',diff:'easy',concept:'Units'},
  {q:'What is Lenz\'s Law?',choices:['Induced current opposes the change','Current flows in the direction of the change','Voltage is constant','Resistance is constant'],correct:0,exp:'Lenz\'s Law: induced current opposes the change in flux.',diff:'hard',concept:'Lenz'},
  {q:'What is a capacitor?',choices:['Stores charge','Stores current','Stores resistance','Stores voltage'],correct:0,exp:'A capacitor stores electrical charge.',diff:'easy',concept:'Capacitors'},
  {q:'What is the unit of capacitance?',choices:['Farad','Henry','Ohm','Volt'],correct:0,exp:'The Farad (F) is the unit of capacitance.',diff:'easy',concept:'Units'},
  {q:'What does Coulomb\'s Law describe?',choices:['Force between charges','Force between magnets','Force between currents','Force between masses'],correct:0,exp:'Coulomb\'s Law describes electrostatic force.',diff:'medium',concept:'Coulomb'},
  {q:'What is the formula for Coulomb\'s Law?',choices:['F=kq₁q₂/r²','F=Gm₁m₂/r²','F=qE','F=ILB'],correct:0,exp:'Coulomb\'s Law: F=kq₁q₂/r².',diff:'medium',concept:'Coulomb'},
  {q:'What is Gauss\'s Law for electricity?',choices:['∮E·dA=Q/ε₀','∮B·dA=0','∮E·dl=0','∮B·dl=μ₀I'],correct:0,exp:'Gauss\'s Law: ∮E·dA=Q_enc/ε₀.',diff:'hard',concept:'Gauss'},
  {q:'What is the direction of electric field lines?',choices:['From positive to negative','From negative to positive','Circular','Random'],correct:0,exp:'Electric field lines point from positive to negative.',diff:'easy',concept:'Field'},
  {q:'What is a magnetic field?',choices:['A region where magnetic forces act','A type of electric field','A flow of electrons','A type of capacitor'],correct:0,exp:'A magnetic field is a region where magnetic forces act.',diff:'easy',concept:'Magnetic'},
  {q:'What is the formula for magnetic force on a charge?',choices:['F=qvB','F=qE','F=ILB','F=kq₁q₂/r²'],correct:0,exp:'F=qvB sinθ is the magnetic force.',diff:'medium',concept:'Magnetic'},
  {q:'What is the SI unit of magnetic field?',choices:['Tesla','Gauss','Henry','Weber'],correct:0,exp:'The Tesla (T) is the unit of magnetic field strength.',diff:'easy',concept:'Units'},
  {q:'What is the difference between AC and DC?',choices:['AC alternates, DC is constant','DC alternates, AC is constant','They are the same','AC has no current'],correct:0,exp:'AC reverses direction; DC flows one way.',diff:'easy',concept:'AC/DC'},
  {q:'What is the formula for energy stored in a capacitor?',choices:['E=½CV²','E=CV²','E=½QV','Both A and C'],correct:3,exp:'E=½CV²=½QV=Q²/(2C).',diff:'medium',concept:'Capacitors'},
  {q:'What is a resistor?',choices:['Opposes current flow','Stores charge','Stores energy','Amplifies signals'],correct:0,exp:'A resistor opposes current flow.',diff:'easy',concept:'Resistors'},
  {q:'What is the resistance of a wire proportional to?',choices:['Length','Cross-sectional area','Both length and area','Neither'],correct:0,exp:'Resistance is proportional to length: R ∝ L.',diff:'medium',concept:'Resistors'},
];

// ─── Discrete Mathematics ───
const DM_QUESTIONS = [
  {q:'What is the contrapositive of p→q?',choices:['¬q→¬p','¬p→¬q','q→p','¬q→p'],correct:0,exp:'Contrapositive of p→q is ¬q→¬p.',diff:'medium',concept:'Logic'},
  {q:'What is the negation of ∀x P(x)?',choices:['∃x ¬P(x)','∀x ¬P(x)','∃x P(x)','¬∀x P(x)'],correct:0,exp:'¬∀x P(x) ≡ ∃x ¬P(x).',diff:'hard',concept:'Predicate'},
  {q:'What is the union of sets A and B?',choices:['Elements in both','Elements in either','Elements in neither','Elements in A only'],correct:1,exp:'A∪B={x|x∈A or x∈B}.',diff:'easy',concept:'Sets'},
  {q:'What is the intersection of sets A and B?',choices:['Elements in both','Elements in either','Elements in neither','Elements in A only'],correct:0,exp:'A∩B={x|x∈A and x∈B}.',diff:'easy',concept:'Sets'},
  {q:'What is the cardinality of A×B if |A|=3, |B|=4?',choices:['7','12','1','3/4'],correct:1,exp:'|A×B| = |A|·|B| = 12.',diff:'easy',concept:'Sets'},
  {q:'What does the symbol ⊆ mean?',choices:['Proper subset','Subset or equal','Superset','Not subset'],correct:1,exp:'A ⊆ B means A is a subset of B.',diff:'easy',concept:'Sets'},
  {q:'What is mathematical induction used for?',choices:['Proving statements for all integers','Solving equations','Finding limits','Counting combinations'],correct:0,exp:'Induction proves statements for all natural numbers.',diff:'medium',concept:'Proof'},
  {q:'What is the Pigeonhole Principle?',choices:['If more pigeons than holes, at least two share a hole','Pigeons fly in circles','Holes are infinite','Pigeons are countable'],correct:0,exp:'If n items in m boxes and n>m, at least one box has >1 item.',diff:'medium',concept:'Combinatorics'},
  {q:'What is the sum of the first n integers?',choices:['n(n+1)/2','n²','n(n-1)/2','n/2'],correct:0,exp:'Σ_{i=1}^n i = n(n+1)/2.',diff:'easy',concept:'Sequences'},
  {q:'What does P(A) denote?',choices:['Power set of A','Probability of A','Permutations of A','Partition of A'],correct:0,exp:'P(A) is the power set (set of all subsets).',diff:'medium',concept:'Sets'},
  {q:'What is the identity element for set union?',choices:['∅','The universal set','A','None'],correct:0,exp:'A ∪ ∅ = A, so ∅ is the identity for union.',diff:'easy',concept:'Sets'},
  {q:'How many elements in the power set of a set with n elements?',choices:['n','2n','2^n','n²'],correct:2,exp:'|P(A)|=2^{|A|}.',diff:'medium',concept:'Sets'},
  {q:'What is a partition of a set?',choices:['A division into non-empty disjoint subsets whose union is the set','A subset of the set','A Cartesian product','A relation'],correct:0,exp:'A partition divides a set into disjoint non-empty subsets whose union is the original set.',diff:'hard',concept:'Sets'},
  {q:'What is a function?',choices:['A relation where each input has one output','A relation where each output has one input','A set of ordered pairs','Both A and C'],correct:3,exp:'A function is a relation where each input maps to exactly one output.',diff:'easy',concept:'Functions'},
  {q:'What is a bijection?',choices:['One-to-one and onto','One-to-one only','Onto only','Neither'],correct:0,exp:'A bijection is both injective and surjective.',diff:'medium',concept:'Functions'},
  {q:'What is the sum of the first n odd numbers?',choices:['n²','n(n+1)/2','n²+1','2n-1'],correct:0,exp:'Σ_{i=1}^n (2i-1) = n².',diff:'medium',concept:'Sequences'},
  {q:'What is a tautology?',choices:['A statement always true','A statement always false','A statement that depends on variables','None'],correct:0,exp:'A tautology is true in every interpretation.',diff:'easy',concept:'Logic'},
  {q:'What is a contradiction?',choices:['A statement always true','A statement always false','A statement that depends on variables','None'],correct:1,exp:'A contradiction is false in every interpretation.',diff:'easy',concept:'Logic'},
  {q:'What is the inclusion-exclusion principle?',choices:['|A∪B|=|A|+|B|-|A∩B|','|A∩B|=|A|+|B|-|A∪B|','|A|=|B|','None'],correct:0,exp:'|A∪B|=|A|+|B|-|A∩B|.',diff:'medium',concept:'Sets'},
  {q:'What is the binomial theorem?',choices:['(x+y)^n=Σ C(n,k)x^{n-k}y^k','(x+y)^n=x^n+y^n','(x+y)^n=nxy','None'],correct:0,exp:'(x+y)^n=Σ_{k=0}^n C(n,k)x^{n-k}y^k.',diff:'hard',concept:'Combinatorics'},
];

// ─── Computing Fundamentals ───
const CF_QUESTIONS = [
  {q:'What is the decimal value of binary 1010?',choices:['8','10','12','5'],correct:1,exp:'1×2³+0×2²+1×2¹+0×2⁰=8+0+2+0=10.',diff:'easy',concept:'Binary'},
  {q:'What is the binary of decimal 13?',choices:['1101','1011','1110','1100'],correct:0,exp:'13=8+4+1=1101₂.',diff:'easy',concept:'Binary'},
  {q:'What is the hexadecimal of binary 1111?',choices:['A','B','C','F'],correct:3,exp:'1111₂=F₁₆.',diff:'easy',concept:'Hex'},
  {q:'What is the 2\'s complement of 0110?',choices:['1001','1010','0110','1000'],correct:1,exp:'Flip bits (1001) + 1 = 1010.',diff:'medium',concept:'2\'s Complement'},
  {q:'What is the ASCII value of \'A\'?',choices:['65','97','48','32'],correct:0,exp:'ASCII \'A\'=65.',diff:'easy',concept:'ASCII'},
  {q:'What is the ASCII value of \'a\'?',choices:['65','97','48','32'],correct:1,exp:'ASCII \'a\'=97.',diff:'easy',concept:'ASCII'},
  {q:'How many bits are in a byte?',choices:['4','8','16','32'],correct:1,exp:'A byte is 8 bits.',diff:'easy',concept:'Data Units'},
  {q:'What is the decimal value of 0x1A?',choices:['16','26','32','42'],correct:1,exp:'1×16+10=26.',diff:'medium',concept:'Hex'},
  {q:'What is a compiler?',choices:['Translates high-level code to machine code','Executes code line by line','Manages memory','Stores data'],correct:0,exp:'A compiler translates source code to machine code.',diff:'easy',concept:'Software'},
  {q:'What is an interpreter?',choices:['Translates high-level code to machine code','Executes code line by line','Manages memory','Stores data'],correct:1,exp:'An interpreter executes source code line by line.',diff:'easy',concept:'Software'},
  {q:'What is the function of an operating system?',choices:['Manages hardware and software','Compiles programs','Stores data','Creates files'],correct:0,exp:'An OS manages hardware resources and provides a platform for applications.',diff:'easy',concept:'OS'},
  {q:'What is a CPU?',choices:['Central Processing Unit','Computer Power Unit','Core Processing Unit','Central Program Unit'],correct:0,exp:'CPU = Central Processing Unit.',diff:'easy',concept:'Hardware'},
  {q:'What is RAM?',choices:['Random Access Memory','Read Access Memory','Remote Access Memory','Real Access Memory'],correct:0,exp:'RAM = Random Access Memory.',diff:'easy',concept:'Hardware'},
  {q:'What is the OSI model?',choices:['A networking reference model','A programming language','A type of software','A hardware component'],correct:0,exp:'The OSI model is a 7-layer networking reference model.',diff:'medium',concept:'Networking'},
  {q:'What is an IP address?',choices:['A unique address for a device on a network','A type of software','A file format','A memory location'],correct:0,exp:'An IP address uniquely identifies a device on a network.',diff:'easy',concept:'Networking'},
  {q:'What is the function of a router?',choices:['Routes packets between networks','Stores data','Compiles programs','Displays output'],correct:0,exp:'A router forwards packets between different networks.',diff:'easy',concept:'Networking'},
  {q:'What is the internet?',choices:['A global network of computers','A type of software','A programming language','A hardware component'],correct:0,exp:'The internet is a global network of interconnected computers.',diff:'easy',concept:'Networking'},
  {q:'What is a protocol?',choices:['A set of rules for communication','A type of software','A hardware component','A file format'],correct:0,exp:'A protocol is a set of rules for data exchange.',diff:'easy',concept:'Networking'},
  {q:'What is the decimal value of 0x2F?',choices:['47','55','32','63'],correct:0,exp:'2×16+15=47.',diff:'medium',concept:'Hex'},
  {q:'What is the binary of 0x3A?',choices:['111010','111010','111010','00111010'],correct:3,exp:'0x3A=0011 1010₂=58.',diff:'hard',concept:'Hex'},
];

// ─── Build subjects ───
const SUBJECTS = [
  {id:'sp',name:'Structured Programming',icon:'terminal',color:'#e11d48',questions:SP_QUESTIONS},
  {id:'ld',name:'Logic Design',icon:'microchip',color:'#a855f7',questions:LD_QUESTIONS},
  {id:'pr',name:'Probability & Statistics',icon:'dice',color:'#f43f5e',questions:PR_QUESTIONS},
  {id:'ca',name:'Calculus',icon:'infinity',color:'#00d4ff',questions:CA_QUESTIONS},
  {id:'de',name:'Differential Equations',icon:'infinity',color:'#34d399',questions:DE_QUESTIONS},
  {id:'ph',name:'Physics',icon:'bolt',color:'#fb7185',questions:PH_QUESTIONS},
  {id:'dm',name:'Discrete Mathematics',icon:'project-diagram',color:'#c084fc',questions:DM_QUESTIONS},
  {id:'cf',name:'Computing Fundamentals',icon:'binary',color:'#60a5fa',questions:CF_QUESTIONS},
];

let ALL_QUESTIONS = [];
SUBJECTS.forEach(s=>{s.questions.forEach((q,i)=>{ALL_QUESTIONS.push({...q,subjectId:s.id,subject:s.name,subjectIcon:s.icon,qid:s.id+'-'+i,diff:q.diff||'medium'});})});
document.getElementById('totalQuestions').textContent = ALL_QUESTIONS.length;

// ============================================================
// RENDER FUNCTIONS
// ============================================================
function setMode(mode){
  state.mode = mode;
  document.querySelectorAll('.mode-tab').forEach(t=>t.classList.toggle('active',t.dataset.mode===mode));
  document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));
  const map = {browse:'browseView',quick:'quickView',exam:'examView',bookmarks:'bookmarksView',analytics:'analyticsView',history:'historyView'};
  document.getElementById(map[mode]).classList.add('active');
  if(mode==='browse')renderBrowse();
  if(mode==='quick')renderQuick();
  if(mode==='exam')renderExamSetup();
  if(mode==='history')renderHistory();
  if(mode==='analytics')renderAnalytics();
  if(mode==='bookmarks')renderBookmarks();
  injectIcons();
}

function render(){
  const passed = Object.values(results).filter(r=>r.passed).length;
  document.getElementById('passedCount').textContent = passed;
  document.getElementById('bestStreak').textContent = state.bestStreak||0;
  document.getElementById('bookmarkCount').textContent = bookmarks.length;
  document.getElementById('bookmarkBadge').textContent = bookmarks.length;

  if(state.active&&!state.finished){
    document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));
    document.getElementById('runnerContainer').style.display = 'block';
    document.getElementById('resultsContainer').style.display = 'none';
    renderRunner();
  }else if(state.finished){
    document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));
    document.getElementById('runnerContainer').style.display = 'none';
    document.getElementById('resultsContainer').style.display = 'block';
    renderResults();
  }else{
    document.getElementById('runnerContainer').style.display = 'none';
    document.getElementById('resultsContainer').style.display = 'none';
    setMode(state.mode);
  }
}

// ─── BROWSE ───
function renderBrowse(){
  const grid = document.getElementById('quizGrid');
  grid.innerHTML = SUBJECTS.map(s=>{
    const r = results[s.id]; const best = r?r.best:0; const passed = r&&r.passed;
    const qCount = s.questions.length;
    return `<div class="quiz-card" onclick="startSubjectQuiz('${s.id}')">
      ${passed?'<div class="qc-badge passed"><i class="ic" data-ic="check"></i> Passed</div>':
      best>0?'<div class="qc-badge attempted"><i class="ic" data-ic="clock"></i> Attempted</div>':''}
      <div class="qc-icon"><i class="ic" data-ic="${s.icon}"></i></div>
      <h3>${s.name}</h3>
      <div class="qc-sub">${qCount} questions · ${['Easy','Medium','Hard'][Math.round(s.questions.reduce((acc,q)=>acc+({easy:1,medium:2,hard:3}[q.diff]||2),0)/qCount)-1]||'Medium'} avg</div>
      <div class="qc-meta">
        <span><i class="ic" data-ic="help"></i> ${qCount}</span>
        <span><i class="ic" data-ic="check"></i> Pass ${PASS_THRESHOLD}%</span>
        ${r?`<span style="color:var(--txt2)">Best: ${r.best}%</span>`:''}
      </div>
      ${r?`<div class="qc-progress"><div class="qc-progress-fill" style="width:${Math.min(r.best,100)}%"></div></div>`:''}
      <div class="qc-tag">${bookmarks.filter(b=>b.startsWith(s.id)).length} bookmarked</div>
    </div>`;
  }).join('');
  injectIcons(grid);
}

function startSubjectQuiz(id){
  const s = SUBJECTS.find(s=>s.id===id);
  if(!s){showToast('⚠️ Subject not found');return}
  const qs = s.questions.map((q,i)=>({...q,subjectId:s.id,subject:s.name,qid:s.id+'-'+i,diff:q.diff||'medium'}));
  if(!qs.length){showToast('⚠️ No questions');return}
  state.active = {id, subject:s.name, questions:qs, shuffled:shuffle(qs), isQuick:false, isExam:false};
  state.startTime = Date.now(); state.timer = 0; beginRun();
}

// ─── QUICK ───
function renderQuick(){
  const subjects = SUBJECTS.map(s=>s.name);
  document.getElementById('quickSetup').innerHTML = `
    <div class="field"><label>📚 Subject</label><div class="chip-row" id="topicChips">${['All subjects',...subjects].map((s,i)=>`<div class="chip ${i===0?'active':''}" onclick="setQuickTopic('${i===0?null:s}')">${s}</div>`).join('')}</div></div>
    <div class="field"><label>📝 Questions</label><div class="chip-row" id="countChips">${[3,5,10,15,20].map(n=>`<div class="chip ${n===5?'active':''}" onclick="setQuickCount(${n})">${n}</div>`).join('')}</div></div>
    <div class="field"><label>⚡ Difficulty</label><div class="chip-row" id="difficultyChips">${['mixed','easy','medium','hard'].map(d=>`<div class="chip ${d==='mixed'?'active':''}" onclick="setDifficulty('${d}')">${d.charAt(0).toUpperCase()+d.slice(1)}</div>`).join('')}</div></div>
    <div class="qp-stats" id="qpStats"></div>
    <button class="btn btn-primary" onclick="startQuick()" style="width:100%;justify-content:center;padding:12px;"><i class="ic" data-ic="zap"></i> Start Quick Practice</button>
  `;
  updateQuickStats(); injectIcons(document.getElementById('quickSetup'));
}

function updateQuickStats(){
  let pool = ALL_QUESTIONS;
  if(state.quickTopic) pool = pool.filter(q=>q.subject===state.quickTopic);
  if(state.difficulty!=='mixed') pool = pool.filter(q=>q.diff===state.difficulty);
  const avg = pool.length ? pool.reduce((s,q)=>s+({easy:1,medium:2,hard:3}[q.diff]||2),0)/pool.length : 0;
  document.getElementById('qpStats').innerHTML = `
    <div class="qp-stat"><div class="num">${pool.length}</div><div class="lbl">Available</div></div>
    <div class="qp-stat"><div class="num">${Math.min(state.quickCount,pool.length)}</div><div class="lbl">Selected</div></div>
    <div class="qp-stat"><div class="num">${avg?['Easy','Medium','Hard'][Math.round(avg)-1]||'—':'—'}</div><div class="lbl">Avg difficulty</div></div>
    <div class="qp-stat"><div class="num">${pool.filter(q=>bookmarks.includes(q.qid)).length}</div><div class="lbl">Bookmarked</div></div>
  `;
}

function setQuickTopic(t){state.quickTopic=t;updateQuickStats();}
function setQuickCount(n){state.quickCount=n;updateQuickStats();}
function setDifficulty(d){state.difficulty=d;updateQuickStats();}

function startQuick(){
  let pool = ALL_QUESTIONS;
  if(state.quickTopic) pool = pool.filter(q=>q.subject===state.quickTopic);
  if(state.difficulty!=='mixed') pool = pool.filter(q=>q.diff===state.difficulty);
  if(!pool.length){showToast('⚠️ No questions match your filters');return}
  pool = shuffle(pool).slice(0,Math.min(state.quickCount,pool.length));
  state.active = {id:'quick',subject:state.quickTopic||'Mixed',questions:pool,shuffled:pool,isQuick:true,isExam:false};
  state.startTime = Date.now(); state.timer = 0; beginRun();
}

// ─── EXAM ───
function renderExamSetup(){
  const subjects = SUBJECTS.map(s=>s.name);
  document.getElementById('examSetup').innerHTML = `
    <div class="field"><label>📚 Subject</label><div class="chip-row" id="examTopicChips">${['All subjects',...subjects].map((s,i)=>`<div class="chip ${i===0?'active':''}" onclick="setExamTopic('${i===0?null:s}')">${s}</div>`).join('')}</div></div>
    <div class="field"><label>⏱️ Time Limit</label><div class="chip-row" id="examTimeChips">${[300,600,900,1800].map((t,idx)=>`<div class="chip ${idx===0?'active':''}" onclick="setExamTime(${t})">${t/60} min</div>`).join('')}</div></div>
    <div class="field"><label>📝 Questions</label><div class="chip-row" id="examCountChips">${[10,15,20,30].map((n,idx)=>`<div class="chip ${idx===0?'active':''}" onclick="setExamCount(${n})">${n}</div>`).join('')}</div></div>
    <button class="btn btn-primary" onclick="startExam()" style="width:100%;justify-content:center;padding:12px;"><i class="ic" data-ic="clock"></i> Start Exam</button>
  `;
  injectIcons(document.getElementById('examSetup'));
}

let examTopic=null;
function setExamTopic(t){examTopic=t;document.querySelectorAll('#examTopicChips .chip').forEach(c=>c.classList.remove('active'));}
function setExamTime(t){state.examTime=t;document.querySelectorAll('#examTimeChips .chip').forEach(c=>c.classList.remove('active'));}
function setExamCount(n){state.examCount=n;document.querySelectorAll('#examCountChips .chip').forEach(c=>c.classList.remove('active'));}

function startExam(){
  let pool = ALL_QUESTIONS;
  if(examTopic) pool = pool.filter(q=>q.subject===examTopic);
  if(!pool.length){showToast('⚠️ No questions');return}
  pool = shuffle(pool).slice(0,Math.min(state.examCount,pool.length));
  state.active = {id:'exam',subject:examTopic||'Mixed',questions:pool,shuffled:pool,isQuick:false,isExam:true};
  state.startTime = Date.now(); state.timer = state.examTime; beginRun();
}

// ─── HISTORY ───
function renderHistory(){
  const container = document.getElementById('historyList');
  if(!history.length){container.innerHTML='<div class="empty-state"><i class="ic" data-ic="clock"></i>No attempts yet.</div>';return}
  container.innerHTML = `<h3>Your Attempts (${history.length})</h3>` +
    history.slice().reverse().map(h=>`
      <div class="history-item">
        <span class="h-subject">${h.subject}</span>
        <span class="h-score ${h.passed?'pass':'fail'}">${h.score}% ${h.passed?'✅':'❌'}</span>
        <span class="h-detail">${h.correct}/${h.total} · ${h.time}s</span>
        <span class="h-date">${h.date}</span>
      </div>
    `).join('');
  injectIcons(container);
}

// ─── ANALYTICS ───
function renderAnalytics(){
  const container = document.getElementById('analyticsContainer');
  const total = history.length; const passed = history.filter(h=>h.passed).length;
  const avgScore = total?Math.round(history.reduce((a,h)=>a+h.score,0)/total):0;
  const bySubject = {}; SUBJECTS.forEach(s=>{bySubject[s.id]={name:s.name,attempts:[],scores:[]};});
  history.forEach(h=>{const id = Object.keys(bySubject).find(k=>bySubject[k].name===h.subject); if(id){bySubject[id].attempts.push(h); bySubject[id].scores.push(h.score)}});
  let html = `<h3>Performance Analytics</h3>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:16px;">
      <div class="result-stat"><div class="num">${total}</div><div class="lbl">Attempts</div></div>
      <div class="result-stat"><div class="num">${passed}</div><div class="lbl">Passed</div></div>
      <div class="result-stat"><div class="num">${avgScore}%</div><div class="lbl">Avg Score</div></div>
    </div>
    <div class="analytics-grid">`;
  Object.keys(bySubject).forEach(id=>{const d=bySubject[id]; const best=d.scores.length?Math.max(...d.scores):0;
    const avg=d.scores.length?Math.round(d.scores.reduce((a,b)=>a+b,0)/d.scores.length):0;
    html+=`<div class="analytics-card"><div class="subj">${d.name}</div><div class="score">${best}%</div>
      <div class="bar"><div class="bar-fill" style="width:${best}%"></div></div>
      <div class="count">${d.scores.length} attempts · avg ${avg}%</div></div>`;});
  html+=`</div>`; container.innerHTML=html; injectIcons(container);
}

// ─── BOOKMARKS ───
function renderBookmarks(){
  const container = document.getElementById('bookmarksList');
  if(!bookmarks.length){container.innerHTML='<div class="empty-state"><i class="ic" data-ic="book"></i>No bookmarks.</div>';return}
  const qs = ALL_QUESTIONS.filter(q=>bookmarks.includes(q.qid));
  if(!qs.length){container.innerHTML='<div class="empty-state"><i class="ic" data-ic="book"></i>Bookmarks not found.</div>';return}
  container.innerHTML = `<h3>Bookmarked Questions (${qs.length})</h3>` +
    qs.map(q=>`
      <div class="bookmark-item" onclick="startBookmarkedQuiz('${q.qid}')">
        <span class="b-subject">${q.subject}</span>
        <span class="b-text">${q.q.replace(/<[^>]+>/g,'').slice(0,50)}${q.q.length>50?'…':''}</span>
        <button class="b-remove" onclick="event.stopPropagation();toggleBookmark('${q.qid}')">Remove</button>
      </div>
    `).join('');
  injectIcons(container);
}

function startBookmarkedQuiz(qid){
  const qs = ALL_QUESTIONS.filter(q=>bookmarks.includes(q.qid));
  if(!qs.length){showToast('⚠️ No bookmarks');return}
  state.active = {id:'bookmarks',subject:'Bookmarks',questions:qs,shuffled:shuffle(qs),isQuick:true,isExam:false};
  state.startTime = Date.now(); state.timer = 0; beginRun();
}

function toggleBookmark(qid){
  const idx = bookmarks.indexOf(qid);
  if(idx>-1) bookmarks.splice(idx,1); else bookmarks.push(qid);
  saveState(); render(); showToast(idx>-1?'⭐ Removed':'⭐ Bookmarked!');
}
function isBookmarked(qid){return bookmarks.includes(qid)}

// ─── RUNNER ───
function beginRun(){
  state.qi=0; state.answered=false; state.correctCount=0; state.streak=0; state.finished=false;
  if(state.timerInterval){clearInterval(state.timerInterval); state.timerInterval=null}
  render();
  if(state.active&&state.active.isExam){
    state.timerInterval = setInterval(()=>{
      state.timer--;
      if(state.timer<=0){clearInterval(state.timerInterval); state.timerInterval=null; finish()}
      updateTimerDisplay();
    },1000);
  }
}

function updateTimerDisplay(){
  const el = document.getElementById('qTimer');
  if(!el) return;
  const m=Math.floor(state.timer/60), s=state.timer%60;
  el.textContent = `${m}:${s.toString().padStart(2,'0')}`;
  el.className = 'q-timer'+(state.timer<30?' danger':state.timer<60?' warning':'');
}

function renderRunner(){
  const container = document.getElementById('runnerContainer');
  const A = state.active;
  const q = A.shuffled[state.qi];
  const pct = Math.round(state.qi/A.shuffled.length*100);
  const total = A.shuffled.length;
  const isBook = isBookmarked(q.qid);

  // Build question HTML with math delimiters preserved
  let qHtml = q.q;

  container.innerHTML = `<div class="runner">
    <div class="runner-top">
      <span class="q-count">${state.qi+1}/${total}</span>
      <div class="runner-bar"><div class="runner-fill" style="width:${pct}%"></div></div>
      <span class="q-scorechip">${state.correctCount} ✓${state.streak>1?` <span class="streak">🔥${state.streak}</span>`:''}</span>
      ${A.isExam?`<span class="q-timer" id="qTimer">${Math.floor(state.timer/60)}:${(state.timer%60).toString().padStart(2,'0')}</span>`:''}
    </div>
    <div class="q-card lg lg-card">
      <div class="lg-effect"></div><div class="lg-tint"></div><div class="lg-shine"></div>
      <div class="q-topic">
        <span>${q.subject}</span>
        <span style="opacity:.5">·</span>
        <span class="q-diff ${q.diff}">${q.diff}</span>
        <span style="opacity:.5">·</span>
        <span style="opacity:.7">${q.concept||'General'}</span>
        <button class="q-bookmark ${isBook?'bookmarked':''}" onclick="toggleBookmark('${q.qid}')" title="Bookmark">
          <i class="ic" data-ic="${isBook?'bookmark-fill':'bookmark'}"></i>
        </button>
      </div>
      <div class="q-text" id="qTextContainer">${qHtml}</div>
      <div class="options" id="opts">
        ${q.choices.map((c,i)=>`<button class="option" onclick="answer(${i})" data-idx="${i}">
          <span class="opt-letter">${String.fromCharCode(65+i)}</span>
          <span class="opt-text">${c}</span>
          <span class="opt-check"><i class="ic" data-ic="check"></i></span>
        </button>`).join('')}
      </div>
      <div class="feedback" id="fb"></div>
      <div class="runner-actions">
        <div class="left"><span class="kb-hint"><kbd>1-4</kbd> select · <kbd>Enter</kbd> next · <kbd>B</kbd> bookmark</span></div>
        <div class="right" id="ract"></div>
      </div>
    </div>
    <div style="text-align:center;margin-top:12px;display:flex;gap:8px;justify-content:center;flex-wrap:wrap;">
      <button class="btn btn-sm" onclick="quitQuiz()"><i class="ic" data-ic="list"></i> Quit</button>
      ${A.isExam?`<span style="color:var(--txt3);font-size:12px;">⏱️ ${Math.floor(state.timer/60)}:${(state.timer%60).toString().padStart(2,'0')} remaining</span>`:''}
    </div>
  </div>`;
  injectIcons(container);
  updateTimerDisplay();

  // Render KaTeX math in question and options
  setTimeout(() => {
    const containerEl = container.querySelector('.q-card');
    if(containerEl) renderMath(containerEl);
  }, 50);

  const firstOpt = container.querySelector('.option');
  if(firstOpt&&!state.answered) setTimeout(()=>firstOpt.focus(),100);
}

function answer(i){
  if(state.answered) return;
  state.answered = true;
  const A = state.active;
  const q = A.shuffled[state.qi];
  const opts = document.querySelectorAll('#opts .option');
  const right = i===q.correct;
  if(right){state.correctCount++; state.streak++}else{state.streak=0}
  // ── PORT PATCH (scripts/port-legacy.py) ──────────────────────────────
  // The page only counted how many were right. Which ones were WRONG is the
  // cleanest misconception signal the product gets — a specific observed gap,
  // not something inferred from chat — so they are collected here and sent up
  // when the quiz ends.
  if(!right){
    (state.missed || (state.missed = [])).push({
      question: EDUMOE_PLAIN(q.q).slice(0, 220),
      correct: EDUMOE_PLAIN(q.choices && q.choices[q.correct]).slice(0, 180),
      // `concept` is per question ("Increment", "I/O") and makes a far more
      // useful memory key than the subject the quiz belonged to.
      topic: q.concept || A.subject || ''
    });
  }
  if(state.streak>state.bestStreak){state.bestStreak=state.streak; saveState()}
  opts.forEach((o,idx)=>{o.disabled=true; if(idx===q.correct)o.classList.add('correct'); else if(idx===i)o.classList.add('wrong')});
  const fb = document.getElementById('fb');
  fb.className = 'feedback show '+(right?'right':'wrong');
  fb.innerHTML = `<div class="fb-title"><i class="ic" data-ic="${right?'check':'x'}"></i> ${right?'Correct!':'Not quite'}</div>
    <div class="fb-exp">${q.exp}</div>`;
  injectIcons(fb);
  const last = state.qi === A.shuffled.length-1;
  document.getElementById('ract').innerHTML = `<button class="btn btn-primary" onclick="next()" id="nextBtn">${last?'See results':'Next question'} <i class="ic" data-ic="arrow-right"></i></button>`;
  injectIcons(document.getElementById('ract'));
  document.getElementById('nextBtn')?.focus();
}

function next(){
  const A = state.active;
  if(state.qi < A.shuffled.length-1){state.qi++; state.answered=false; render()}
  else{finish()}
}

function finish(){
  if(state.timerInterval){clearInterval(state.timerInterval); state.timerInterval=null}
  const A = state.active;
  const pct = Math.round(state.correctCount/A.shuffled.length*100);
  const passed = pct >= PASS_THRESHOLD;
  const elapsed = Math.round((Date.now()-state.startTime)/1000);
  if(!A.isQuick&&A.id!=='quick'&&A.id!=='exam'&&A.id!=='bookmarks'){
    const prev = results[A.id];
    results[A.id] = {best:Math.max(pct, prev?prev.best:0), passed:passed||(prev&&prev.passed)};
    saveState();
  }
  history.push({subject:A.subject,score:pct,passed:passed,date:new Date().toLocaleDateString('en-GB')+' '+new Date().toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'}),correct:state.correctCount,total:A.shuffled.length,time:elapsed});
  saveState();
  EDUMOE_QUIZ_REPORT(A, pct, elapsed);
// ── PORT PATCH (scripts/port-legacy.py) ────────────────────────────────
// Send the attempt to the account so it shows on the dashboard, and hand the
// wrong answers to MoeAI's memory of this student so they come back later.
// Fire and forget: a failed report must never block the results screen.
function EDUMOE_QUIZ_REPORT(A, pct, elapsed){
  var missed = state.missed || [];
  state.missed = [];
  try{
    fetch('/api/quiz/report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        topic: A.subject || A.title || 'Quiz',
        score: pct,
        correct: state.correctCount,
        total: A.shuffled.length,
        seconds: elapsed,
        missed: missed
      })
    });
  }catch(e){}
}

function EDUMOE_PLAIN(html){
  if(!html) return '';
  var el = document.createElement('div');
  el.innerHTML = String(html);
  return (el.textContent || '').replace(/\s+/g, ' ').trim();
}

  state.finished = true;
  state.lastPct = pct;
  state.lastPassed = passed;
  state.elapsed = elapsed;
  render();
}

function renderResults(){
  const container = document.getElementById('resultsContainer');
  const pct = state.lastPct, passed = state.lastPassed, A = state.active;
  const circ = 2*Math.PI*60, off = circ*(1-pct/100);
  const total = A.shuffled.length, correct = state.correctCount, wrong = total-correct;
  const mins = Math.floor(state.elapsed/60), secs = state.elapsed%60;
  container.innerHTML = `<div class="results">
    <div class="result-ring">
      <svg width="140" height="140" viewBox="0 0 140 140">
        <circle cx="70" cy="70" r="60" stroke="var(--tint2)" stroke-width="10" fill="none" class="ring-bg"/>
        <circle cx="70" cy="70" r="60" stroke="${passed?'var(--ok)':'var(--no)'}" stroke-width="10" fill="none" stroke-linecap="round" stroke-dasharray="${circ}" stroke-dashoffset="${off}" class="ring-fg"/>
      </svg>
      <div class="result-pct"><div class="big">${pct}%</div><div class="lbl">${correct}/${total}</div></div>
    </div>
    <div class="result-verdict ${passed?'pass':'fail'}">${passed?'🎉 Passed!':'💪 Keep practising'}</div>
    <div class="result-sub">${passed?`You beat the ${PASS_THRESHOLD}% threshold.`:`You need ${PASS_THRESHOLD}% to pass. Review and retake.`}</div>
    <div class="result-stats">
      <div class="result-stat"><div class="num">${correct}</div><div class="lbl">Correct</div></div>
      <div class="result-stat"><div class="num">${wrong}</div><div class="lbl">Wrong</div></div>
      <div class="result-stat"><div class="num">${mins}m ${secs}s</div><div class="lbl">Time</div></div>
      <div class="result-stat"><div class="num">${state.streak}</div><div class="lbl">Streak</div></div>
    </div>
    <div class="result-actions">
      <button class="btn btn-primary" onclick="retake()"><i class="ic" data-ic="redo"></i> Retake</button>
      <button class="btn" onclick="quitQuiz()"><i class="ic" data-ic="list"></i> Back</button>
    </div>
  </div>`;
  injectIcons(container);
}

function retake(){
  if(state.active.isQuick) startQuick();
  else if(state.active.isExam) startExam();
  else if(state.active.id==='bookmarks'){const qs=ALL_QUESTIONS.filter(q=>bookmarks.includes(q.qid)); if(!qs.length){showToast('⚠️ No bookmarks');return} state.active.questions=qs; state.active.shuffled=shuffle(qs); beginRun()}
  else{const s=SUBJECTS.find(sb=>sb.id===state.active.id); if(s){const qs=s.questions.map((q,i)=>({...q,subjectId:s.id,subject:s.name,qid:s.id+'-'+i,diff:q.diff||'medium'})); state.active.questions=qs; state.active.shuffled=shuffle(qs); beginRun()}else{showToast('⚠️ Could not retake')}}
}

function quitQuiz(){
  if(state.timerInterval){clearInterval(state.timerInterval); state.timerInterval=null}
  state.active=null; state.finished=false; render();
}

// ─── TOAST ───
function showToast(msg){const t=document.getElementById('toast'),m=document.getElementById('toastMsg'); if(!t||!m)return; m.textContent=msg; t.classList.add('show'); clearTimeout(toastTimer); toastTimer=setTimeout(()=>t.classList.remove('show'),2800)}

// ─── MODE TABS ───
document.querySelectorAll('.mode-tab').forEach(tab=>{
  tab.addEventListener('click',function(){
    if(state.timerInterval){clearInterval(state.timerInterval); state.timerInterval=null}
    state.active=null; state.finished=false; state.mode=this.dataset.mode; setMode(state.mode);
  });
});

// ─── INIT ───
document.addEventListener('DOMContentLoaded',()=>{
  setMode('browse');
  saveState();
  // Initial math render after page load
  setTimeout(()=>{renderMath(document.body);},500);
  console.log(`📝 EDUMOE Ultimate Quizzes loaded — ${ALL_QUESTIONS.length} questions across ${SUBJECTS.length} subjects.`);
});

window.startSubjectQuiz=startSubjectQuiz; window.startQuick=startQuick; window.startExam=startExam;
window.answer=answer; window.next=next; window.retake=retake; window.quitQuiz=quitQuiz;
window.toggleBookmark=toggleBookmark; window.setMode=setMode;
window.setTheme=setTheme; window.setCustomTheme=setCustomTheme; window.toggleCRT=toggleCRT;
window.showToast=showToast;
