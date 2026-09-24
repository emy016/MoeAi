/**
 * What a reply sounds like read aloud: the words, not the markup.
 *
 * Code, diagrams and interactive cards are on screen, so they are named
 * rather than spelled out; math becomes something a voice can say; citations
 * and Markdown punctuation disappear.
 */
const BLOCK_NAMES = { mermaid: 'a diagram', chart: 'a chart', visualizer: 'an interactive visualizer', steps: 'a step-by-step walkthrough', quiz: 'a quick quiz', scene3d: 'a 3D model', animation: 'an animation', phet: 'a simulation' };

function speakMath(tex) {
  return tex
    .replace(/\\frac\{([^{}]*)\}\{([^{}]*)\}/g, '$1 over $2')
    .replace(/\\sqrt\{([^{}]*)\}/g, 'the square root of $1')
    .replace(/\^\{?2\}?/g, ' squared').replace(/\^\{?3\}?/g, ' cubed').replace(/\^\{([^{}]*)\}/g, ' to the power $1').replace(/\^(\w)/g, ' to the power $1')
    .replace(/_\{([^{}]*)\}/g, ' sub $1').replace(/_(\w)/g, ' sub $1')
    .replace(/\\(int|sum|lim|infty|pi|theta|alpha|beta|lambda|Delta|delta|cdot|times|leq|geq|neq|approx|to|implies)\b/g, (_, w) => ({ int: ' integral ', sum: ' sum ', lim: ' limit ', infty: ' infinity ', pi: ' pi ', theta: ' theta ', alpha: ' alpha ', beta: ' beta ', lambda: ' lambda ', Delta: ' delta ', delta: ' delta ', cdot: ' times ', times: ' times ', leq: ' less than or equal to ', geq: ' greater than or equal to ', neq: ' not equal to ', approx: ' approximately ', to: ' to ', implies: ' which means ' }[w]))
    .replace(/\\(begin|end)\{[^}]*\}/g, ' ').replace(/\\[a-zA-Z]+/g, ' ').replace(/[{}&\\]/g, ' ')
    .replace(/=/g, ' equals ').replace(/\+/g, ' plus ').replace(/(\s)-(\s)/g, '$1minus$2')
    .replace(/\s+/g, ' ').trim();
}

export function speechText(markdown) {
  return String(markdown || '')
    .replace(/```(\w+)?[\s\S]*?```/g, (_, lang) => ` (${BLOCK_NAMES[lang] || (lang ? `some ${lang} code` : 'a code block')} is on screen) `)
    .replace(/\$\$([\s\S]*?)\$\$/g, (_, tex) => ` ${speakMath(tex)}. `)
    .replace(/\$([^$\n]+)\$/g, (_, tex) => ` ${speakMath(tex)} `)
    .replace(/\[Source:[^\]]*\]/gi, '')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/^\s{0,3}#{1,6}\s*/gm, '')
    .replace(/^\s*[-*+]\s+/gm, '')
    .replace(/^\s*\|.*\|\s*$/gm, '')
    .replace(/[*_`~>#|]/g, '')
    .replace(/\n{2,}/g, '. ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Arabic script anywhere means an Arabic voice (Egyptian if the device has one). */
export const speechLanguage = (text, fallback = 'en') => (/[؀-ۿ]/.test(text) ? 'ar' : fallback === 'ar' ? 'en' : fallback);
