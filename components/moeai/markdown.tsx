"use client";
import { Children, isValidElement, memo, useState, type ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import rehypeHighlight from "rehype-highlight";
import { Check, Copy, Download, Terminal } from "lucide-react";
import { downloadText } from "@/lib/moeai/workspace";

function plain(children: ReactNode): string { return Children.toArray(children).map(child => isValidElement<{children?: ReactNode}>(child) ? plain(child.props.children) : String(child)).join(""); }
function CodeBlock({ children }: { children?: ReactNode }) {
  const [copied, setCopied] = useState(false);
  const text = plain(children);
  const element = Children.toArray(children).find(isValidElement);
  const language = isValidElement<{className?: string}>(element) ? element.props.className?.match(/language-(\w+)/)?.[1] || "code" : "code";
  return <div className="mx-code"><div className="mx-code-bar"><span><Terminal size={13}/>{language}</span><div><button aria-label="Copy code" onClick={async () => { try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1800); } catch { setCopied(false); } }}>{copied ? <Check size={14}/> : <Copy size={14}/>} {copied ? "Copied" : "Copy"}</button><button aria-label="Download code" onClick={() => downloadText(`snippet.${({javascript:"js",typescript:"ts",python:"py",cpp:"cpp"} as Record<string,string>)[language] || "txt"}`, text, "text/plain")}><Download size={14}/></button></div></div><pre>{children}</pre></div>;
}
export const Markdown = memo(function Markdown({ text }: { text: string }) {
  const normalized = text.replace(/\\\[([\s\S]*?)\\\]/g, (_, math) => `\n$$\n${math}\n$$\n`).replace(/\\\(([\s\S]*?)\\\)/g, (_, math) => `$${math}$`);
  return <div className="mx-markdown" dir="auto"><ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[[rehypeKatex, { throwOnError: false, trust: false, strict: "ignore", maxExpand: 200 }], [rehypeHighlight, { detect: false }]]} components={{ pre: CodeBlock, a: ({children,href}) => <a href={href} target="_blank" rel="noopener noreferrer">{children}</a>, img: ({alt}) => <span className="mx-muted">[Image: {alt || "image"}]</span> }}>{normalized}</ReactMarkdown></div>;
});
