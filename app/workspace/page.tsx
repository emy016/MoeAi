import Workspace from "@/components/moeai/workspace";
import "katex/dist/katex.min.css";
import "highlight.js/styles/github-dark.css";
import "./workspace.css";
import "./theme.css";
import "@/components/brand/logo.css";

export const metadata = { title: "MoeAI workspace — library, rooms and tools | EduMoe" };

export default function Page() {
  return <Workspace />;
}
