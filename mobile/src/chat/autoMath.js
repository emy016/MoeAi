/**
 * Math the model wrote without $ delimiters, e.g. "Solve \frac{dy}{dx} = 2xy^2"
 * or "A = \begin{pmatrix} 2 & 1 \\ 3 & 0 \end{pmatrix}". Without delimiters
 * nothing renders it and the student reads raw LaTeX. This finds runs of
 * math-looking words in the plain parts of a text (never inside code or
 * existing delimiters) and wraps each run in $...$.
 *
 * A run needs at least one strong sign of math (a LaTeX command, ^ or _) so
 * ordinary sentences with "=" or numbers are left alone.
 *
 * Kept identical to mobile/src/chat/autoMath.js and lib/auto-math.js; check:app compares them.
 */

const STRONG = /\\[a-zA-Z]+|[\^_]/;
const FUNCTIONS = new Set(['sin', 'cos', 'tan', 'sec', 'csc', 'cot', 'log', 'ln', 'exp', 'lim', 'max', 'min', 'det', 'dx', 'dy', 'dt']);
const STOP = new Set(['a', 'an', 'as', 'at', 'be', 'by', 'do', 'if', 'in', 'is', 'it', 'of', 'on', 'or', 'so', 'to', 'up', 'we', 'no', 'and', 'the', 'for', 'with', 'where', 'then', 'find', 'let']);

function mathish(word) {
  if (/:$/.test(word)) return false; // "DE:", "Solution:" end a label, not a formula
  const core = word.replace(/[.,;!?]+$/, '');
  if (!core) return false;
  if (/:\/\/|www\.|@/.test(core)) return false; // links and handles
  if (!/[\\^]/.test(core) && /[a-zA-Z]{3,}_|_[a-zA-Z]{3,}/.test(core)) return false; // snake_case, _emphasis_
  if (STRONG.test(core)) return true;
  if (/^[=+\-*/<>≤≥≠|&()[\]{}]+$/.test(core)) return true;
  if (core === 'a' || (core.length > 1 && STOP.has(core.toLowerCase()))) return false;
  if (FUNCTIONS.has(core.toLowerCase().replace(/[()]/g, ''))) return true;
  // Symbols, numbers and short variable names: x, y', f(x), 2x, 3)dx, (2y, dy/dx, [0,1].
  return /^[\w()[\]{}'.,+\-*/]+$/.test(core) && !/[a-zA-Z]{3,}/.test(core);
}

function wrapPlain(text) {
  if (!STRONG.test(text)) return text;
  // Environments (\begin{pmatrix} ... \end{pmatrix}) are one unit even with spaces and &.
  const envs = [];
  let work = text.replace(/\\begin\{([a-zA-Z*]+)\}[\s\S]*?\\end\{\1\}/g, (m) => {
    envs.push(m);
    return `\u0000${envs.length - 1}\u0000`;
  });
  const words = work.split(/(\s+)/);
  const out = [];
  let run = [];
  const flush = () => {
    const trailing = [];
    while (run.length && /^\s+$/.test(run[run.length - 1])) trailing.unshift(run.pop());
    const body = run.join('');
    const weak = /[=<>]/.test(body) && /(^|[^a-zA-Z])[a-zA-Z]('|[^a-zA-Z]|$)/.test(body) && body.trim().split(/\s+/).length >= 3;
    if (body && /[a-zA-Z0-9\u0000]/.test(body) && (STRONG.test(body) || body.includes('\u0000') || weak)) {
      const [, inner, punct] = body.match(/^([\s\S]*?)([.,;:!?]*)$/);
      out.push(`$${inner}$${punct}`);
    } else out.push(body);
    out.push(...trailing);
    run = [];
  };
  for (const part of words) {
    if (!part) continue;
    if (/^\s+$/.test(part)) { if (run.length) run.push(part); else out.push(part); continue; }
    if (part.includes('\u0000') || mathish(part)) run.push(part);
    else { flush(); out.push(part); }
  }
  flush();
  work = out.join('');
  return work.replace(/\u0000(\d+)\u0000/g, (_, i) => envs[Number(i)]);
}

/** The text with undelimited math wrapped in $...$; delimited math and code are untouched. */
export function autoMath(value) {
  const source = String(value ?? '');
  if (!STRONG.test(source)) return source;
  // Protect code, and math that already has delimiters.
  const pieces = source.split(/(```[\s\S]*?```|`[^`\n]*`|\$\$[\s\S]*?\$\$|\$[^$\n]+\$|\\\[[\s\S]*?\\\]|\\\([\s\S]*?\\\))/);
  return pieces.map((piece, i) => (i % 2 === 1 ? piece : wrapPlain(piece))).join('');
}
