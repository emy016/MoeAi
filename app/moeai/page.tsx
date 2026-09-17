import Workspace from "@/components/moeai/workspace";
import "katex/dist/katex.min.css";
import "highlight.js/styles/github-dark.css";
import "./workspace.css";

export const metadata = { title: "MoeAI — Your study workspace" };

export default function Page() {
  return <Workspace />;
}
