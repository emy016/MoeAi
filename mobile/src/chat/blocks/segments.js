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
  mermaid: 'mermaid', mmd: 'mermaid', diagram: 'mermaid', flowchart: 'mermaid', graph: 'mermaid',
  visualizer: 'visualizer', visualiser: 'visualizer', widget: 'visualizer', interactive: 'visualizer', simulator: 'visualizer',
  chart: 'chart', plot: 'chart', steps: 'steps', checklist: 'steps', todo: 'steps', quiz: 'quiz',
  scene3d: 'scene3d', '3d': 'scene3d', three: 'scene3d', animation: 'animation', manim: 'animation', phet: 'phet', simulation: 'phet',
  question: 'ask', questions: 'ask', ask: 'ask', clarify: 'ask',
};

export const LIVE_KINDS = new Set(['mermaid', 'visualizer', 'chart', 'steps', 'quiz', 'scene3d', 'animation', 'phet', 'ask']);
export const HIDDEN = new Set(['memory', 'skill']);
export const RUNNABLE = new Set(['python', 'javascript']);

/** The block tag the model meant, when it used a generic one (html, svg, json). */
function inferKind(lang, code) {
  const body = String(code || '');
  if (lang === 'html' || lang === 'svg' || lang === 'xml') {
    // A whole interactive page or drawing is a visualizer; a snippet being taught stays code.
    if (/<(script|canvas|svg)\b/i.test(body) && (/<\/(script|svg)>/i.test(body) || body.length > 400)) return 'visualizer';
    return null;
  }
  if (lang === 'json' || lang === 'json5' || lang === '') {
    const trimmed = body.trim();
    if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) return null;
    try {
      const value = JSON.parse(trimmed);
      if (Array.isArray(value) && value.length && value.every((q) => q && typeof q.question === 'string' && q.type)) return 'ask';
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        if (Array.isArray(value.datasets) || (value.type && Array.isArray(value.labels))) return 'chart';
        if (typeof value.question === 'string' && Array.isArray(value.options) && value.answer !== undefined) return 'quiz';
        if (typeof value.sim === 'string') return 'phet';
      }
    } catch (_) { return null; }
  }
  return null;
}

/** kind: one of LIVE_KINDS, or 'code' with `language` set. */
export function blockKind(tag, code = '') {
  const lang = String(tag || '').trim().toLowerCase().split(/[\s{]/)[0];
  const alias = ALIASES[lang];
  if (alias && LIVE_KINDS.has(alias)) return { kind: alias, language: alias };
  const inferred = inferKind(lang, code);
  if (inferred) return { kind: inferred, language: inferred };
  return { kind: 'code', language: alias || lang || 'text' };
}

const FENCE = /^( {0,3})(`{3,}|~{3,})([^`\n]*)$/;
const KNOWN_TAG = new RegExp(`(\`{3,})(${Object.keys(ALIASES).join('|')}|html|svg|json)\\s*$`, 'i');

/**
 * Models do not always put fences on their own lines. Before splitting,
 * move a fence that opens at the end of a sentence ("Here it is: ```chart")
 * or closes at the end of a line ("</html>```") onto a line of its own, and
 * give a bare HTML document the visualizer fence it forgot.
 */
function normalize(text) {
  const out = [];
  let open = false;
  for (const raw of String(text || '').split('\n')) {
    let line = raw;
    if (!open) {
      const inline = KNOWN_TAG.exec(line);
      if (inline && inline.index > 0 && line.slice(0, inline.index).trim()) {
        out.push(line.slice(0, inline.index).trimEnd());
        line = line.slice(inline.index);
      }
      if (FENCE.test(line)) open = true;
      out.push(line);
      continue;
    }
    const tail = /^(.*\S)\s*(`{3,})\s*$/.exec(line);
    if (tail && !/^ {0,3}`{3,}/.test(line)) {
      out.push(tail[1]);
      out.push(tail[2]);
      open = false;
      continue;
    }
    if (/^ {0,3}(`{3,}|~{3,})\s*$/.test(line)) open = false;
    out.push(line);
  }
  let joined = out.join('\n');
  // An unfenced full HTML page: wrap it so it renders instead of spilling as text.
  if (!/(^|\n) {0,3}`{3,}/.test(joined)) {
    joined = joined.replace(/(<!DOCTYPE html[\s\S]*?<\/html>|<html[\s>][\s\S]*?<\/html>)/i, (page) => `\n\`\`\`visualizer\n${page.trim()}\n\`\`\`\n`);
  }
  return joined;
}

export function splitSegments(text) {
  const lines = normalize(text).split('\n');
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
      pushBlock(segments, block, true);
      block = null;
      continue;
    }
    block.body.push(block.indent ? line.replace(new RegExp(`^ {0,${block.indent}}`), '') : line);
  }
  if (block) pushBlock(segments, block, false);
  else flushProse();
  return segments;
}

/** A whole answer wrapped in ```markdown is prose, not a code card. */
function pushBlock(segments, block, closed) {
  const code = block.body.join('\n');
  const lang = block.tag.toLowerCase().split(/\s/)[0];
  // What MoeAI chose to remember is saved by the server, never shown.
  if (HIDDEN.has(lang)) return;
  if ((lang === 'markdown' || lang === 'md') && !/^\s*<!doctype|^\s*<html/i.test(code)) {
    const inner = splitSegments(code);
    const last = segments[segments.length - 1];
    for (const seg of inner) {
      if (seg.type === 'markdown' && last?.type === 'markdown' && seg === inner[0]) last.text += `\n${seg.text}`;
      else segments.push(seg);
    }
    return;
  }
  segments.push({ type: 'block', ...blockKind(block.tag, code), code, closed });
}

/** True when the reply is nothing but prose, so the caller can keep its fast path. */
export const hasBlocks = (text) => /`{3,}|~{3,}|<!DOCTYPE html|<html[\s>]/i.test(String(text || ''));
