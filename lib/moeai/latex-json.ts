/**
 * Models write LaTeX inside JSON strings with single backslashes: "\frac{1}{2}".
 * JSON reads "\f" as a form feed and "\t" as a tab, so the math arrives broken
 * ("rac{1}{2}", "imes") and renders as raw text. This doubles the backslash in
 * front of known LaTeX commands before parsing, leaving real JSON escapes
 * (\n, \t on their own, é, \\) alone.
 */
const COMMANDS = new Set(`
frac dfrac tfrac sqrt cdot cdots ldots dots times div pm mp le leq ge geq ne neq approx equiv sim propto
infty int iint oint sum prod lim to rightarrow leftarrow Rightarrow Leftarrow implies iff mapsto
partial nabla vec hat bar dot ddot overline underline mathbf mathrm mathit mathbb mathcal text textbf operatorname
alpha beta gamma Gamma delta Delta epsilon varepsilon zeta eta theta Theta vartheta iota kappa lambda Lambda mu nu xi Xi
pi Pi rho sigma Sigma tau upsilon phi Phi varphi chi psi Psi omega Omega
sin cos tan sec csc cot arcsin arccos arctan sinh cosh tanh ln log exp det dim ker max min
left right big Big bigg Bigg begin end quad qquad prime circ angle triangle perp parallel
in notin subset subseteq supset cup cap emptyset forall exists neg land lor oplus otimes wedge vee
binom choose over underbrace overbrace boxed displaystyle
`.trim().split(/\s+/));

export function repairLatexEscapes(raw: string): string {
  return raw.replace(/\\(\\|[a-zA-Z]+)/g, (match, run: string) => {
    if (run === "\\") return match;
    return COMMANDS.has(run) ? `\\\\${run}` : match;
  });
}

/** The first JSON object in a model reply, with LaTeX escapes repaired; null if there is none. */
export function parseModelJson<T>(raw: string): T | null {
  const text = String(raw || "").replace(/^\s*```(?:json)?/i, "").replace(/```\s*$/, "").trim();
  const candidates = [text];
  const first = text.indexOf("{");
  const last = text.lastIndexOf("}");
  if (first >= 0 && last > first) candidates.push(text.slice(first, last + 1));
  for (const candidate of candidates) {
    for (const body of [repairLatexEscapes(candidate), candidate]) {
      try {
        return JSON.parse(body) as T;
      } catch {
        // try the next form
      }
    }
  }
  return null;
}
