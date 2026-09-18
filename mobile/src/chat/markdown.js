/**
 * The parsing half of the chat's Markdown.
 *
 * Kept apart from the component so it can be tested in plain Node, without a
 * React Native runtime — see scripts/check-markdown.mjs. It is deliberately not
 * a Markdown engine: it covers the handful of constructs a tutor actually uses,
 * and anything it does not recognise falls through as text, which is the right
 * failure — the student sees the words either way.
 */
/**
 * Turns a reply into a list of blocks: {kind, ...}. Separated from rendering so
 * the decisions can be tested without a React Native runtime — see
 * scripts/check-markdown.mjs.
 */
export function parseBlocks(text) {
  const lines = String(text || '').split('\n');
  const blocks = [];
  let fence = null;
  let list = [];

  const flushList = () => {
    if (!list.length) return;
    blocks.push({ kind: 'list', items: list });
    list = [];
  };

  for (const line of lines) {
    const fenceMatch = line.match(/^```(\w*)/);
    if (fenceMatch) {
      if (fence) { blocks.push({ kind: 'code', language: fence.language, body: fence.body.join('\n') }); fence = null; }
      else { flushList(); fence = { language: fenceMatch[1] || '', body: [] }; }
      continue;
    }
    if (fence) { fence.body.push(line); continue; }

    const heading = line.match(/^(#{1,4})\s+(.*)$/);
    if (heading) { flushList(); blocks.push({ kind: 'heading', level: heading[1].length, text: heading[2] }); continue; }

    const bullet = line.match(/^\s*([-*+])\s+(.*)$/);
    if (bullet) { list.push({ marker: '\u2022', text: bullet[2] }); continue; }
    const numbered = line.match(/^\s*(\d+)[.)]\s+(.*)$/);
    if (numbered) { list.push({ marker: `${numbered[1]}.`, text: numbered[2] }); continue; }

    flushList();
    if (!line.trim()) { blocks.push({ kind: 'gap' }); continue; }
    blocks.push({ kind: 'paragraph', text: line });
  }

  flushList();
  // An unterminated fence means the reply is still streaming; show what there is.
  if (fence) blocks.push({ kind: 'code', language: fence.language, body: fence.body.join('\n'), open: true });
  return blocks;
}

/** Splits one line into runs: {type: 'text'|'bold'|'italic'|'code', text}. */
export function parseInline(line) {
  const runs = [];
  const pattern = /(\*\*[^*]+\*\*|`[^`]+`|\*[^*\n]+\*)/g;
  let last = 0;
  let match;
  while ((match = pattern.exec(line)) !== null) {
    if (match.index > last) runs.push({ type: 'text', text: line.slice(last, match.index) });
    const token = match[0];
    if (token.startsWith('**')) runs.push({ type: 'bold', text: token.slice(2, -2) });
    else if (token.startsWith('`')) runs.push({ type: 'code', text: token.slice(1, -1) });
    else runs.push({ type: 'italic', text: token.slice(1, -1) });
    last = match.index + token.length;
  }
  if (last < line.length) runs.push({ type: 'text', text: line.slice(last) });
  return runs;
}
