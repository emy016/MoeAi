"use client";
import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, Calculator, Check, Code2, Download, FunctionSquare, GitBranch, NotebookPen, Pause, Play, RotateCcw, Timer, X } from "lucide-react";
import { Markdown } from "./markdown";
import { downloadText } from "@/lib/moeai/workspace";
import type { Analysis } from "@/lib/moeai/logic";
export type Tool = "calculator" | "graph" | "code" | "logic" | "notebook" | "focus";
export const toolItems = [
  { id: "calculator" as Tool, label: "Calculator", hint: "Evaluate & differentiate", icon: Calculator },
  { id: "graph" as Tool, label: "Graph plotter", hint: "See the function", icon: FunctionSquare },
  { id: "code" as Tool, label: "Code studio", hint: "Write, run, understand", icon: Code2 },
  { id: "logic" as Tool, label: "Logic & K-map", hint: "Table, map, minimal form", icon: GitBranch },
  { id: "notebook" as Tool, label: "Notebook", hint: "Keep the important parts", icon: NotebookPen },
  { id: "focus" as Tool, label: "Focus timer", hint: "One thing at a time", icon: Timer },
];
export default function ToolPanel({ tool, onClose, onAsk, notebook, onNotebook }: { tool: Tool; onClose: () => void; onAsk: (text: string) => void; notebook: string; onNotebook: (text: string) => void }) {
  const info = toolItems.find(t => t.id === tool)!;
  return <aside className="mx-tool-panel" aria-label={info.label}><header><div><span className="mx-eyebrow">WORKBENCH</span><h2>{info.label}</h2></div><button className="mx-icon" aria-label="Close tool" onClick={onClose}><X size={18}/></button></header><div className="mx-tool-body">{tool === "calculator" || tool === "graph" || tool === "logic" ? <MathTool key={tool} type={tool} onAsk={onAsk}/> : tool === "code" ? <CodeStudio onAsk={onAsk}/> : tool === "focus" ? <FocusTimer/> : <Notebook text={notebook} onChange={onNotebook}/>}</div><footer><span className="mx-dot"/> Tools run on your device</footer></aside>;
}
function MathTool({type,onAsk}: {type: "calculator" | "graph" | "logic";onAsk:(text:string)=>void}) {
  const [input,setInput] = useState(type === "graph" ? "sin(x)" : type === "logic" ? "(A and B) or C" : "(2^8 - 1) / 5");
  const [result,setResult] = useState(""); const [error,setError] = useState(""); const [busy,setBusy] = useState(false);
  const [points,setPoints] = useState<{x:number;y:number|null}[]>([]); const [logic,setLogic] = useState<Analysis|null>(null);
  async function run(derivative = false) { setError(""); setBusy(true); try {
    if(type === "logic") { const { analyse } = await import("@/lib/moeai/logic"); const analysis = analyse(input); setLogic(analysis); setResult(analysis.sop); }
    else { const math = await import("@/lib/moeai/math");
      if(type === "graph") { setPoints(math.graphPoints(input)); setResult(`y = ${input}`); }
      else setResult(derivative ? math.differentiate(input) : math.calculate(input)); }
  } catch(e) { setError(e instanceof Error ? e.message : "Check the expression."); setResult(""); setPoints([]); setLogic(null); } finally { setBusy(false); } }
  let path = ""; let connected = false; let previous = 0;
  for (const p of points) { if(p.y === null){connected=false;continue;} const y=150-p.y*14; path += `${connected && Math.abs(y-previous)<100 ? "L":"M"}${150+p.x*14},${y} `; connected=true;previous=y; }
  return <><p className="mx-muted">{type === "graph" ? "Plot a real-valued function. Use x as the variable." : type === "logic" ? "Use up to four variables — A, B, C, D — with and, or, not, xor and parentheses. You get the table, the Karnaugh map, and the minimal sum of products." : "A deterministic calculator. Angles are in radians. Use x for derivatives."}</p><label className="mx-field">{type === "graph" ? "f(x)" : "Expression"}<input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")run();}} maxLength={300}/></label><div className="mx-inline"><button className="mx-primary" onClick={()=>run()} disabled={busy}>{busy ? "Calculating…" : type === "graph" ? "Plot function" : type === "logic" ? "Analyse expression" : "Calculate"}</button>{type === "calculator" && <button className="mx-secondary" disabled={busy} onClick={()=>run(true)}>d/dx</button>}</div>{error && <p className="mx-error" role="alert">{error}</p>}{type === "graph" && <div className="mx-graph"><svg viewBox="0 0 300 300" role="img" aria-label={result || "Graph canvas from minus ten to ten"}><defs><pattern id="graph-grid" width="14" height="14" patternUnits="userSpaceOnUse"><path d="M 14 0 L 0 0 0 14" fill="none" stroke="currentColor" opacity=".1"/></pattern></defs><rect width="300" height="300" fill="url(#graph-grid)"/><path d="M10 150H290 M150 10V290" stroke="currentColor" opacity=".35"/><text x="275" y="168">x</text><text x="158" y="18">y</text><text x="8" y="166">−10</text><text x="276" y="146">10</text><path d={path} stroke="var(--mx-accent)" fill="none" strokeWidth="2.5"/></svg><small>Window: x ∈ [−10, 10], y ∈ [−10, 10]</small></div>}{logic && <LogicResult analysis={logic}/>}{result && <div className="mx-result"><span className="mx-eyebrow">{type === "logic" ? "MINIMAL SUM OF PRODUCTS" : "RESULT"}</span><p>{type === "logic" ? `F = ${result}` : result}</p><button className="mx-text-button" onClick={()=>onAsk(type === "logic" ? `Walk me through simplifying this Boolean expression step by step, using the Karnaugh map groupings.\n\nF = ${input}\nMinimal form: ${result}\nMinterms: ${logic?.minterms.join(", ") || "none"} over ${logic?.variables.join(", ")}` : `Explain this ${type} result: ${input} → ${result}`)}>Explain with Moe <ArrowUpRight size={14}/></button></div>}<div className="mx-tool-examples"><span className="mx-eyebrow">TRY AN EXPRESSION</span>{(type==="graph"?["x^2 / 5", "sin(x)", "cos(x) * x"]:type==="logic"?["A xor B", "not (A and B)", "(A and B) or (C and D)"]:["sqrt(144) + 2^3", "sin(pi / 2)", "x^3 + 2*x"]).map(ex=><button key={ex} onClick={()=>setInput(ex)}>{ex}<ArrowUpRight size={13}/></button>)}</div></>;
}

/** The table and the map say the same thing two ways. Students who cannot see it in
 *  the table often see it immediately in the map, which is the whole point of a map. */
function LogicResult({analysis}:{analysis:Analysis}) {
  const {variables, rows, kmap} = analysis;
  const bits = (code:number,width:number) => code.toString(2).padStart(width,"0");
  return <>
    <table className="mx-table"><thead><tr>{[...variables,"F"].map(h=><th key={h}>{h}</th>)}</tr></thead><tbody>
      {rows.map((row,i)=><tr key={i}>{[...row.values,row.value].map((v,j)=><td key={j} className={j===variables.length&&v?"mx-one":""}>{Number(v)}</td>)}</tr>)}
    </tbody></table>
    {kmap && <div className="mx-kmap"><span className="mx-eyebrow">KARNAUGH MAP</span>
      <table className="mx-table mx-kmap-grid"><thead><tr><th>{kmap.rowVars.join("")}\{kmap.colVars.join("")}</th>{kmap.colCodes.map(c=><th key={c}>{bits(c,kmap.colVars.length)}</th>)}</tr></thead><tbody>
        {kmap.cells.map((row,r)=><tr key={r}><th>{bits(kmap.rowCodes[r],kmap.rowVars.length)}</th>{row.map(cell=><td key={cell.index} className={cell.value?"mx-one":""} title={`m${cell.index}`}>{Number(cell.value)}</td>)}</tr>)}
      </tbody></table>
      <small>Neighbouring cells differ in one variable, so a block of ones is a term you can simplify away.</small>
    </div>}
  </>;
}
const SAMPLES = {
  javascript: 'const numbers = [1, 2, 3, 4, 5];\nconst squares = numbers.map(n => n * n);\nconsole.log(squares);',
  python: 'def fib(n):\n    a, b = 0, 1\n    for _ in range(n):\n        yield a\n        a, b = b, a + b\n\nprint(list(fib(10)))',
  typescript: 'type Student = { name: string; year: number };\nconst moe: Student = { name: "Moe", year: 1 };\nconsole.log(moe);',
  cpp: '#include <iostream>\nint main() {\n    std::cout << "Hello, EduMoe" << std::endl;\n    return 0;\n}',
};
const PYTHON_MIRRORS = ["https://cdn.jsdelivr.net/pyodide/v0.29.5/full/", "https://cdn.jsdelivr.net/npm/pyodide@0.29.5/", "https://unpkg.com/pyodide@0.29.5/"];
function CodeStudio({onAsk}:{onAsk:(text:string)=>void}) {
  const [language,setLanguage] = useState("javascript");
  const [code,setCode] = useState(SAMPLES.javascript);
  const [output,setOutput] = useState(""); const [running,setRunning] = useState(false);
  const frame = useRef<HTMLIFrameElement>(null); const cleanup = useRef<()=>void>(()=>{});
  useEffect(()=>()=>cleanup.current(),[]);
  const runnable = language === "javascript" || language === "python";

  /** Both runtimes live in the same sandboxed frame and speak the same three
   *  messages: a line of output, __MOE_CLEAR__ to drop the loading chatter,
   *  and __MOE_DONE__ to say the program ended. */
  function run() {
    if(!frame.current || running || !runnable) return;
    setRunning(true); setOutput("");
    const token = crypto.randomUUID();
    const python = language === "python";
    const source = JSON.stringify(code).replace(/</g,"\\u003c");
    const workerCode = `const console={log:(...args)=>postMessage(args.map(x=>typeof x==='string'?x:JSON.stringify(x)).join(' ')),error:(...args)=>postMessage(args.join(' ')),warn:(...args)=>postMessage(args.join(' '))};\ntry {\n${code}\n} catch(e) { postMessage('Error: '+e.message); }\npostMessage('__MOE_DONE__');`;
    const send = `const send=(value)=>parent.postMessage({token:${JSON.stringify(token)},output:value},'*');`;
    const script = python
      ? `${send}const CODE=${source};const MIRRORS=${JSON.stringify(PYTHON_MIRRORS)};
async function boot(){for(const base of MIRRORS){try{await new Promise((ok,no)=>{const s=document.createElement('script');s.src=base+'pyodide.js';s.onload=ok;s.onerror=()=>no(new Error('unreachable'));document.head.appendChild(s);});return await loadPyodide({indexURL:base});}catch(e){}}throw new Error('The Python runtime could not be downloaded. Check your connection and try again.');}
(async()=>{try{send('Downloading the Python runtime. The first run takes a moment.');const py=await boot();py.setStdout({batched:send});py.setStderr({batched:send});send('__MOE_CLEAR__');await py.runPythonAsync(CODE);}catch(e){const message=e&&e.message?String(e.message):String(e);send('__MOE_CLEAR__');send(message.split('\\n').slice(-8).join('\\n'));}send('__MOE_DONE__');})();`
      : `${send}const worker=new Worker(URL.createObjectURL(new Blob([${JSON.stringify(workerCode).replace(/</g,"\\u003c")}],{type:'text/javascript'})));worker.onmessage=e=>send(e.data);worker.onerror=e=>send('Error: '+e.message);`;
    const policy = python
      ? "default-src 'none'; script-src 'unsafe-inline' 'unsafe-eval' 'wasm-unsafe-eval' https://cdn.jsdelivr.net https://unpkg.com; connect-src https://cdn.jsdelivr.net https://unpkg.com; worker-src blob:"
      : "default-src 'none'; script-src 'unsafe-inline' 'unsafe-eval' blob:; worker-src blob:; connect-src 'none'";
    const onMessage=(event:MessageEvent)=>{
      if(event.source!==frame.current?.contentWindow||event.data?.token!==token)return;
      if(event.data.output === "__MOE_DONE__"){finish();return;}
      if(event.data.output === "__MOE_CLEAR__"){setOutput("");return;}
      if(typeof event.data.output==="string")setOutput(previous=>(previous+event.data.output+"\n").slice(0,15000));
    };
    const limit = python ? 60000 : 3000;
    const timeout=setTimeout(()=>{setOutput(p=>p+`\nExecution stopped after ${limit/1000} seconds.`);finish();},limit);
    function finish(){clearTimeout(timeout);window.removeEventListener("message",onMessage);setRunning(false);if(frame.current)frame.current.srcdoc="";}
    cleanup.current=()=>{clearTimeout(timeout);window.removeEventListener("message",onMessage);};
    window.addEventListener("message",onMessage);
    frame.current.srcdoc=`<!doctype html><meta http-equiv="Content-Security-Policy" content="${policy}"><script>${script}<\/script>`;
  }

  return <><p className="mx-muted">Run JavaScript and Python right here, in a sandbox with no network and no access to your account. Ask Moe to explain or debug C++ and TypeScript.</p><label className="mx-field">Language<select value={language} onChange={e=>{const next=e.target.value;if(code===SAMPLES[language as keyof typeof SAMPLES])setCode(SAMPLES[next as keyof typeof SAMPLES]??code);setLanguage(next);setOutput("");}}>{["javascript","python","typescript","cpp"].map(l=><option key={l}>{l}</option>)}</select></label><textarea className="mx-code-editor" aria-label="Code editor" spellCheck={false} value={code} onChange={e=>setCode(e.target.value)} maxLength={20000}/><div className="mx-inline">{runnable && <button className="mx-primary" onClick={run} disabled={running}><Play size={14}/>{running?"Running…":`Run ${language === "python" ? "Python" : "code"}`}</button>}<button className="mx-secondary" onClick={()=>onAsk(`Help me understand and debug this code. Do not claim you ran it.\n\n\`\`\`${language}\n${code}\n\`\`\``)}>Ask Moe</button><button className="mx-icon" aria-label="Download code" onClick={()=>downloadText(`code.${language==="javascript"?"js":language==="python"?"py":language==="typescript"?"ts":"cpp"}`,code,"text/plain")}><Download size={16}/></button></div><div className="mx-console"><span className="mx-eyebrow">CONSOLE</span><pre>{output || (runnable ? "Output appears here when you run your code." : "Running is available for JavaScript and Python. Ask Moe about this one.")}</pre></div><iframe ref={frame} sandbox="allow-scripts" title="Isolated code runtime" hidden/></>;
}
function Notebook({text,onChange}:{text:string;onChange:(text:string)=>void}) { const [preview,setPreview]=useState(false); return <><div className="mx-inline"><button className="mx-secondary" onClick={()=>setPreview(!preview)}>{preview?"Edit notes":"Preview Markdown"}</button><button className="mx-icon" aria-label="Export notebook" onClick={()=>downloadText("moeai-notebook.md",text)}><Download size={16}/></button></div>{preview?<Markdown text={text || "*Your notebook is empty.*"}/>:<textarea className="mx-notebook" aria-label="Notebook" value={text} onChange={e=>onChange(e.target.value)} placeholder={"# Things that clicked\n\nSave explanations from chat, or write your own notes.\n\nMath works here too: $E = mc^2$"} maxLength={50000}/>}<p className="mx-muted"><Check size={12}/> Saved on this device</p></>; }
function FocusTimer() {
  const [minutes,setMinutes]=useState(25); const [left,setLeft]=useState(25*60); const [end,setEnd]=useState<number|null>(null);
  useEffect(()=>{if(!end)return;const tick=()=>{const next=Math.max(0,Math.ceil((end-Date.now())/1000));setLeft(next);if(!next)setEnd(null);};const id=setInterval(tick,250);return()=>clearInterval(id);},[end]);
  return <div className="mx-focus"><div className="mx-focus-orbit"><Timer size={26}/><strong>{String(Math.floor(left/60)).padStart(2,"0")}<span>:</span>{String(left%60).padStart(2,"0")}</strong><p>{left===0?"Done. Take a breath.":end?"Just this one thing.":"A little focus goes a long way."}</p></div><div className="mx-inline">{[5,15,25,50].map(m=><button key={m} className={m===minutes?"mx-primary":"mx-secondary"} onClick={()=>{setMinutes(m);setLeft(m*60);setEnd(null);}}>{m}m</button>)}</div><div className="mx-inline"><button className="mx-primary" onClick={()=>setEnd(end?null:Date.now()+Math.max(1,left)*1000)}>{end?<Pause size={16}/>:<Play size={16}/>} {end?"Pause":"Start focus"}</button><button className="mx-icon" aria-label="Reset timer" onClick={()=>{setEnd(null);setLeft(minutes*60);}}><RotateCcw size={16}/></button></div><p className="mx-muted">Keep this panel open during your session.</p></div>;
}
