"use client";
import { useEffect, useId, useRef, useState } from "react";
import { Copy, Check, Download, Share2 } from "lucide-react";
import { downloadText } from "@/lib/moeai/workspace";

type State = { svg: string; error: string; pending: boolean };

/** A Mermaid diagram. The source arrives token by token while Moe is writing, so a
 *  half-finished graph must not look like a failure: we wait for the text to settle,
 *  keep the last drawing that parsed, and only show the source once it stops changing. */
export function Diagram({ code }: { code: string }) {
  const base = useId().replace(/[^a-zA-Z0-9]/g, "");
  const [state, setState] = useState<State>({ svg: "", error: "", pending: true });
  const host = useRef<HTMLDivElement>(null);
  const counter = useRef(0);

  useEffect(() => {
    let cancelled = false;
    setState(previous => ({ ...previous, pending: true }));
    const timer = setTimeout(async () => {
      try {
        const theme = host.current ? getComputedStyle(host.current) : null;
        const accent = theme?.getPropertyValue("--mx-accent").trim() || "#f43f6d";
        const text = theme?.getPropertyValue("--mx-text").trim() || "#f3edf0";
        const panel = theme?.getPropertyValue("--mx-panel").trim() || "#111116";
        const mermaid = (await import("mermaid")).default;
        mermaid.initialize({
          startOnLoad: false, securityLevel: "strict", theme: "base", fontFamily: "'Plus Jakarta Sans', sans-serif",
          themeVariables: { background: "transparent", primaryColor: panel, primaryBorderColor: accent, primaryTextColor: text, lineColor: accent, secondaryColor: panel, tertiaryColor: panel, mainBkg: panel, nodeBorder: accent, clusterBkg: "transparent", clusterBorder: accent, edgeLabelBackground: panel, textColor: text },
        });
        const { svg } = await mermaid.render(`moe-diagram-${base}-${counter.current++}`, code.trim());
        if (!cancelled) setState({ svg, error: "", pending: false });
      } catch (e) {
        if (!cancelled) setState(previous => ({ svg: previous.svg, error: e instanceof Error ? e.message.split("\n")[0] : "This diagram could not be drawn.", pending: false }));
      }
    }, 400);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [code, base]);

  if (state.error && !state.svg) return <DiagramSource code={code} note={state.error}/>;
  return <figure className={`mx-diagram ${state.pending ? "pending" : ""}`} ref={host}>
    <div className="mx-diagram-bar"><span><Share2 size={13}/> diagram</span><div>
      <CopyButton text={code}/>
      <button aria-label="Download diagram" disabled={!state.svg} onClick={() => downloadText("diagram.svg", state.svg, "image/svg+xml")}><Download size={14}/></button>
    </div></div>
    {state.svg
      ? <div className="mx-diagram-canvas" role="img" aria-label="Diagram" dangerouslySetInnerHTML={{ __html: state.svg }}/>
      : <div className="mx-diagram-canvas placeholder"><span className="mx-dot"/> Drawing the diagram…</div>}
  </figure>;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return <button aria-label="Copy diagram source" onClick={async () => { try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1800); } catch { setCopied(false); } }}>{copied ? <Check size={14}/> : <Copy size={14}/>}</button>;
}

function DiagramSource({ code, note }: { code: string; note: string }) {
  return <div className="mx-diagram-fallback"><div className="mx-diagram-bar"><span><Share2 size={13}/> diagram source</span><CopyButton text={code}/></div><pre><code>{code}</code></pre><small>{note}</small></div>;
}
