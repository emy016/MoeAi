const TEX = { times: '×', cdot: '·', pm: '±', le: '≤', ge: '≥', neq: '≠', to: '→', infty: '∞', sum: 'Σ', int: '∫', partial: '∂', lambda: 'λ', alpha: 'α', beta: 'β', theta: 'θ', pi: 'π', Delta: 'Δ' };

/**
 * Models write labels like "Identity ($A \cdot I = A$)". In a mindmap, a
 * bracket after text starts a node shape and LaTeX is not rendered, so the
 * whole diagram fails. Labels become plain text: math symbols as characters,
 * brackets after the text as " - ...". The root's own shape is kept.
 */
export function cleanMermaid(code) {
  const source = String(code || '');
  if (!/^\s*mindmap\b/.test(source)) return source;
  return source.split('\n').map((line, i) => {
    if (i === 0 || /^\s*root\b/.test(line)) return line.replace(/\$/g, '');
    const indent = line.match(/^\s*/)[0];
    let text = line.slice(indent.length)
      .replace(/\\([a-zA-Z]+)/g, (_, name) => TEX[name] ?? name)
      .replace(/[$\\{}_^]/g, '')
      .replace(/\s*[([]([^)\]]*)[)\]]/g, (_, inner) => (inner.trim() ? ` - ${inner.trim()}` : ''))
      .replace(/[()[\]]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    return text ? indent + text : '';
  }).filter((line) => line !== '').join('\n');
}
