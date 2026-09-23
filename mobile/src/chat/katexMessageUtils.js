/** Safe CommonMark + KaTeX rendering shared by native and web chat bubbles. */
import katex from 'katex';
import MarkdownIt from 'markdown-it';

const isEscaped = (value, index) => {
  let slashCount = 0;
  for (let cursor = index - 1; cursor >= 0 && value[cursor] === '\\'; cursor -= 1) slashCount += 1;
  return slashCount % 2 === 1;
};

const findClosingDelimiter = (value, delimiter, fromIndex) => {
  let cursor = fromIndex;
  while (cursor < value.length) {
    const match = value.indexOf(delimiter, cursor);
    if (match < 0) return -1;
    if (!isEscaped(value, match) && (delimiter !== '$' || value[match + 1] !== '$')) return match;
    cursor = match + delimiter.length;
  }
  return -1;
};

export function splitMathSegments(value) {
  const source = String(value || '');
  const segments = [];
  let plainStart = 0;
  let cursor = 0;

  while (cursor < source.length) {
    let opening = null;
    let closing = null;
    let displayMode = false;

    if (source.startsWith('\\[', cursor) && !isEscaped(source, cursor)) {
      opening = '\\[';
      closing = '\\]';
      displayMode = true;
    } else if (source.startsWith('\\(', cursor) && !isEscaped(source, cursor)) {
      opening = '\\(';
      closing = '\\)';
    } else if (source.startsWith('$$', cursor) && !isEscaped(source, cursor)) {
      opening = '$$';
      closing = '$$';
      displayMode = true;
    } else if (source[cursor] === '$' && !isEscaped(source, cursor) && source[cursor + 1] !== '$') {
      opening = '$';
      closing = '$';
    }

    if (!opening) {
      cursor += 1;
      continue;
    }
    const contentStart = cursor + opening.length;
    const contentEnd = findClosingDelimiter(source, closing, contentStart);
    if (contentEnd < 0 || !source.slice(contentStart, contentEnd).trim()) {
      cursor += opening.length;
      continue;
    }
    if (plainStart < cursor) segments.push({ type: 'text', value: source.slice(plainStart, cursor) });
    segments.push({ type: 'math', value: source.slice(contentStart, contentEnd), displayMode });
    cursor = contentEnd + closing.length;
    plainStart = cursor;
  }

  if (plainStart < source.length) segments.push({ type: 'text', value: source.slice(plainStart) });
  if (!segments.length && source) segments.push({ type: 'text', value: source });
  return segments;
}

export const hasMathContent = (value) => splitMathSegments(value).some((segment) => segment.type === 'math');

const renderMathExpression = (value, displayMode) => katex.renderToString(value, {
  displayMode,
  output: 'mathml',
  throwOnError: false,
  strict: 'ignore',
  trust: false,
});

const markdown = new MarkdownIt({
  html: false,
  breaks: true,
  linkify: true,
  typographer: false,
});

markdown.inline.ruler.before('escape', 'moeai_math', (state, silent) => {
  const source = state.src;
  const start = state.pos;
  let opening = null;
  let closing = null;
  let displayMode = false;

  if (source.startsWith('\\[', start) && !isEscaped(source, start)) {
    opening = '\\[';
    closing = '\\]';
    displayMode = true;
  } else if (source.startsWith('\\(', start) && !isEscaped(source, start)) {
    opening = '\\(';
    closing = '\\)';
  } else if (source.startsWith('$$', start) && !isEscaped(source, start)) {
    opening = '$$';
    closing = '$$';
    displayMode = true;
  } else if (source[start] === '$' && !isEscaped(source, start) && source[start + 1] !== '$') {
    opening = '$';
    closing = '$';
  } else {
    return false;
  }

  const contentStart = start + opening.length;
  const contentEnd = findClosingDelimiter(source, closing, contentStart);
  const content = contentEnd < 0 ? '' : source.slice(contentStart, contentEnd);
  if (contentEnd < 0 || !content.trim()) return false;
  if (!silent) {
    const token = state.push(displayMode ? 'math_display' : 'math_inline', 'math', 0);
    token.content = content;
  }
  state.pos = contentEnd + closing.length;
  return true;
});

markdown.renderer.rules.math_inline = (tokens, index) => {
  const math = renderMathExpression(tokens[index].content, false);
  return `<span class="moeai-math-inline">${math}</span>`;
};
markdown.renderer.rules.math_display = (tokens, index) => {
  const math = renderMathExpression(tokens[index].content, true);
  return `<span class="moeai-math-display">${math}</span>`;
};
const defaultLinkOpen = markdown.renderer.rules.link_open
  || ((tokens, index, options, env, renderer) => renderer.renderToken(tokens, index, options));
markdown.renderer.rules.link_open = (tokens, index, options, env, renderer) => {
  tokens[index].attrSet('target', '_blank');
  tokens[index].attrSet('rel', 'noopener noreferrer');
  return defaultLinkOpen(tokens, index, options, env, renderer);
};

const PLAIN_BLOCK_TOKENS = new Set(['paragraph_open', 'paragraph_close', 'inline']);
const PLAIN_INLINE_TOKENS = new Set(['text', 'softbreak', 'hardbreak']);
export const hasMarkdownContent = (value) => {
  const source = String(value || '');
  if (hasMathContent(source)) return true;
  return markdown.parse(source, {}).some((token) => (
    !PLAIN_BLOCK_TOKENS.has(token.type)
    || (token.type === 'inline' && token.children?.some((child) => !PLAIN_INLINE_TOKENS.has(child.type)))
  ));
};
export const renderMarkdownMarkup = (value) => markdown.render(String(value || '')).trim();

// Scoped styles keep every Markdown structure inside the measured bubble width.
export const CHAT_MARKDOWN_CSS = `
  .moeai-markdown, .moeai-markdown * { box-sizing: border-box; min-width: 0; max-width: 100%; }
  .moeai-markdown { display: inline-block; width: max-content; max-width: 100%; overflow-wrap: anywhere; word-break: break-word; text-align: inherit; }
  .moeai-markdown > :first-child { margin-top: 0; }
  .moeai-markdown > :last-child { margin-bottom: 0; }
  .moeai-markdown p { margin: 0 0 0.55em; }
  .moeai-markdown strong { font-weight: 700; }
  .moeai-markdown em { font-style: italic; }
  .moeai-markdown s { opacity: 0.72; }
  .moeai-markdown h1, .moeai-markdown h2, .moeai-markdown h3, .moeai-markdown h4, .moeai-markdown h5, .moeai-markdown h6 { line-height: 1.22; margin: 0.55em 0 0.3em; overflow-wrap: anywhere; }
  .moeai-markdown h1 { font-size: 1.4em; } .moeai-markdown h2 { font-size: 1.28em; } .moeai-markdown h3 { font-size: 1.18em; }
  .moeai-markdown h4, .moeai-markdown h5, .moeai-markdown h6 { font-size: 1.08em; }
  .moeai-markdown ul, .moeai-markdown ol { margin: 0.35em 0 0.55em; padding-inline-start: 1.35em; }
  .moeai-markdown li { margin: 0.18em 0; overflow-wrap: anywhere; }
  .moeai-markdown blockquote { margin: 0.45em 0; padding-inline-start: 0.75em; border-inline-start: 3px solid currentColor; opacity: 0.82; }
  .moeai-markdown code { font-family: ui-monospace, SFMono-Regular, Consolas, monospace; font-size: 0.9em; padding: 0.12em 0.3em; border-radius: 0.35em; background: rgba(127,127,127,0.18); white-space: pre-wrap; overflow-wrap: anywhere; word-break: break-word; }
  .moeai-markdown pre { width: 100%; max-width: 100%; margin: 0.5em 0; padding: 0.65em; border-radius: 0.6em; background: rgba(127,127,127,0.18); white-space: pre-wrap; overflow-wrap: anywhere; word-break: break-word; overflow: hidden; }
  .moeai-markdown pre code { padding: 0; background: transparent; white-space: inherit; }
  .moeai-markdown a { color: inherit; text-decoration: underline; overflow-wrap: anywhere; word-break: break-all; }
  .moeai-markdown img { display: block; width: auto; height: auto; max-width: 100%; border-radius: 0.5em; }
  .moeai-markdown table { display: table; width: 100%; max-width: 100%; table-layout: fixed; border-collapse: collapse; margin: 0.5em 0; }
  .moeai-markdown th, .moeai-markdown td { border: 1px solid currentColor; padding: 0.35em; overflow-wrap: anywhere; word-break: break-word; }
  .moeai-markdown hr { width: 100%; border: 0; border-top: 1px solid currentColor; opacity: 0.35; }
  .moeai-math-inline { display: inline-block; direction: ltr; unicode-bidi: isolate; margin: 0 0.08em; max-width: 100%; }
  .moeai-math-display { display: block; direction: ltr; text-align: center; margin: 0.45em 0; width: 100%; max-width: 100%; overflow-x: auto; overflow-y: hidden; }
  .moeai-markdown math { font-size: 1.08em; color: inherit; max-width: 100%; }
  .moeai-math-display math { display: block; margin: 0 auto; }
`;

const safeColor = (value) => /^#[0-9a-f]{3,8}$/i.test(value || '') || /^rgba?\([\d\s.,%]+\)$/i.test(value || '') ? value : '#111111';
const safeNumber = (value, fallback) => Number.isFinite(value) ? Math.max(1, Math.min(200, value)) : fallback;

export function createMarkdownDocument(value, { color, fontSize, lineHeight, textAlign }) {
  const size = safeNumber(fontSize, 14);
  const leading = safeNumber(lineHeight, 20);
  const alignment = textAlign === 'right' ? 'right' : 'left';
  const direction = alignment === 'right' ? 'rtl' : 'ltr';
  return `<!doctype html>
<html dir="${direction}">
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
    <style>
      html, body { margin: 0; padding: 0; width: 100%; max-width: 100%; background: transparent; overflow: hidden; }
      body { color: ${safeColor(color)}; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; font-size: ${size}px; line-height: ${leading}px; text-align: ${alignment}; }
      ${CHAT_MARKDOWN_CSS}
    </style>
  </head>
  <body>
    <div id="content" class="moeai-markdown">${renderMarkdownMarkup(value)}</div>
    <script>
      (function () {
        var content = document.getElementById('content');
        function reportSize() {
          var rect = content.getBoundingClientRect();
          var viewportWidth = document.documentElement.clientWidth || document.body.clientWidth;
          var width = Math.max(1, Math.min(viewportWidth, Math.ceil(Math.max(rect.width, content.scrollWidth))));
          var height = Math.max(1, Math.ceil(Math.max(rect.height, content.scrollHeight)));
          if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(JSON.stringify({ width: width, height: height }));
        }
        window.addEventListener('load', reportSize);
        if (window.ResizeObserver) new ResizeObserver(reportSize).observe(content);
        setTimeout(reportSize, 0);
      }());
    </script>
  </body>
</html>`;
}
