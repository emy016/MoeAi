/**
 * Splits a MoeAI reply into Markdown text and interactive blocks.
 *
 * Blocks are ordinary fenced code blocks with a language tag, so a reply
 * still reads as Markdown anywhere else. Every fence becomes a card here: the
 * MoeAI kinds (visualizer, chart, …) become live cards, and any other
 * language becomes a code card with copy, plus Run for Python and JavaScript.
 * While a reply streams, an unclosed fence at the end is returned with
 * `closed: false` so the card can show that it is still being written.
 */

const ALIASES = {
  py: 'python', python3: 'python', python: 'python',
  js: 'javascript', javascript: 'javascript', mjs: 'javascript', node: 'javascript',
  mermaid: 'mermaid', visualizer: 'visualizer', visualiser: 'visualizer', widget: 'visualizer',
  chart: 'chart', steps: 'steps', checklist: 'steps', quiz: 'quiz',
  scene3d: 'scene3d', '3d': 'scene3d', animation: 'animation', manim: 'animation', phet: 'phet', simulation: 'phet',
};

export const LIVE_KINDS = new Set(['mermaid', 'visualizer', 'chart', 'steps', 'quiz', 'scene3d', 'animation', 'phet']);
export const RUNNABLE = new Set(['python', 'javascript']);

/** kind: one of LIVE_KINDS, or 'code' with `language` set. */
export function blockKind(tag) {
  const lang = String(tag || '').trim().toLowerCase().split(/[\s{]/)[0];
  const alias = ALIASES[lang];
  if (alias && LIVE_KINDS.has(alias)) return { kind: alias, language: alias };
  return { kind: 'code', language: alias || lang || 'text' };
}

const FENCE = /^( {0,3})(`{3,}|~{3,})([^`\n]*)$/;

export function splitSegments(text) {
  const lines = String(text || '').split('\n');
  const segments = [];
  let prose = [];
  let block = null;

  const flushProse = () => {
    const value = prose.join('\n');
    if (value.trim()) segments.push({ type: 'markdown', text: value });
    prose = [];
  };

  for (const line of lines) {
    if (!block) {
      const open = FENCE.exec(line);
      if (open) {
        flushProse();
        block = { marker: open[2], indent: open[1].length, tag: open[3].trim(), body: [] };
      } else {
        prose.push(line);
      }
      continue;
    }
    const close = /^( {0,3})(`{3,}|~{3,})\s*$/.exec(line);
    if (close && close[2][0] === block.marker[0] && close[2].length >= block.marker.length) {
      segments.push({ type: 'block', ...blockKind(block.tag), code: block.body.join('\n'), closed: true });
      block = null;
      continue;
    }
    block.body.push(block.indent ? line.replace(new RegExp(`^ {0,${block.indent}}`), '') : line);
  }
  if (block) segments.push({ type: 'block', ...blockKind(block.tag), code: block.body.join('\n'), closed: false });
  else flushProse();
  return segments;
}

/** True when the reply is nothing but prose, so the caller can keep its fast path. */
export const hasBlocks = (text) => /(^|\n) {0,3}(`{3,}|~{3,})/.test(String(text || ''));
