/**
 * Conversation signals — port of the Emy bot's emy/signals.py.
 *
 * MoeAI is a tutor: teaching is always on. What varies per message is which
 * optional sections are worth including and which deserve a priority boost.
 * Signals are a set, not a category, and none of them switches tutoring off.
 */

const MEMORY = [
  /\b(remember|memoris|memoriz|save|store|keep)\b[^.?!\n]{0,24}\b(this|that|it|i|we|for me|about me|my|our)\b/i,
  /\b(forget|delete|erase|remove)\b[^.?!\n]{0,24}\b(this|that|it|what i|my|everything)\b/i,
  /\bdo you (remember|still know)\b/i,
  /\bwhat do you (remember|know) about me\b/i,
  /\b(my )?(saved )?(preference|preferences|profile)\b/i,
  /(افتكر|اتذكر|افتكرلي|احفظ ?لي|انسى|امسح اللي)/,
  /\b(eftekr|efteker|mat?nsash|ensa|e7fazly)\b/i,
];

const TOOLS = [
  /\b(search|google|look\s?up|browse)\b[^.?!\n]{0,20}\b(online|web|internet|for me)\b/i,
  /\b(open|visit|fetch|download|scrape)\b[^.?!\n]{0,20}(https?:\/\/|www\.|this (link|site|website|url))/i,
  /\b(send|email|submit|post|publish|upload|schedule|book|order|pay)\b[^.?!\n]{0,24}\b(it|this|for me|to (him|her|them|my))\b/i,
  /\b(run|execute|compile)\b[^.?!\n]{0,16}\b(this|it|my code|the code)\b/i,
  /\b(add|put)\b[^.?!\n]{0,16}\b(calendar|reminder|to-?do)\b/i,
  /(ابعت|ابحثلي|افتح الموقع|نزّل|حمّل|شغّل الكود)/,
];

const INJECTION = [
  /\bignore\b[^.?!\n]{0,30}\b(previous|prior|above|earlier|all)\b[^.?!\n]{0,20}\b(instruction|prompt|rule)/i,
  /\b(system|developer|hidden|initial|original)\s+(prompt|message|instructions?)\b/i,
  /\b(developer|god|admin|dan|jailbreak)\s*mode\b/i,
  /\b(reveal|show|print|repeat|dump|leak|translate|summari[sz]e)\b[^.?!\n]{0,30}\b(your|the)\b[^.?!\n]{0,20}\b(prompt|instructions?|rules|configuration|system message)\b/i,
  /\byou are (now|no longer)\b/i,
  /\bthis is an authori[sz]ed (test|audit|request)\b/i,
  /\b(api[_ ]?key|token|\.env|environment variable|credential)s?\b[^.?!\n]{0,24}\b(show|print|what|give|tell)\b/i,
  /\b(show|print|give|tell)\b[^.?!\n]{0,24}\b(api[_ ]?key|token|\.env|credential)s?\b/i,
];

const EXAM = [
  /\b(exam|midterm|final|quiz|test)\b[^.?!\n]{0,30}\b(tomorrow|tonight|today|in \d+|next week|monday|sunday)\b/i,
  /\b(tomorrow|tonight|in \d+ (hours?|days?))\b[^.?!\n]{0,30}\b(exam|midterm|final|quiz|test)\b/i,
  /\b(cram|revision|revise|study plan|what should i study)\b/i,
  /(امتحان|الامتحان|بكرة امتحان|مراجعة)/,
  /\b(emt7an|imti7an|el exam)\b/i,
];

const STRESS = [
  /\bi(?:'m| am)? ?(?:gonna |going to )?(fail|failing|screwed|doomed|cooked)\b/i,
  /\bi (know nothing|don'?t know anything|can'?t do this|give up|hate this)\b/i,
  /\b(stressed|panicking|panic|overwhelmed|burn(ed|t) out|anxious|freaking out)\b/i,
  /\b(makes no sense|i'?m lost|so lost|hopeless)\b/i,
  /(هفشل|مش فاهم حاجة|مش عارف اذاكر|قلقان|مكتئب|زهقت)/,
  /\b(hafshal|msh 3arf|msh fahem 7aga|zh2t|za7amt)\b/i,
];

const AGREEMENT = [
  /^\W*(ok(ay)?|k|yeah|yea|yep|yup|sure|right|got it|i got it|i understand|understood|makes sense|clear|fine)\W*$/i,
  /^\W*(tamam|tmam|aywa|aiwa|keda fahmt|kda fahmt|fahmt|fahemt|sa7|maashi|mashy)\W*$/i,
  /^[\s\p{P}]*(تمام|أيوه|ايوه|فهمت|كده فهمت|ماشي|صح|واضح)[\s\p{P}]*$/u,
];

const SOLUTION = [
  /\b(just )?(give|show|tell) me the (answer|solution|full solution|whole thing)\b/i,
  /\b(solve|work) (it|this|the whole thing) (out )?for me\b/i,
  /\b(full|complete|whole|entire) (solution|answer|derivation|proof)\b/i,
  /(حلها ?لي|اديني الحل|الحل كامل)/,
  /\b(7elha|7elhaly|edeny el 7al|el 7al kamel)\b/i,
];

export type Signals = {
  memory: boolean;
  tools: boolean;
  injection: boolean;
  exam: boolean;
  stress: boolean;
  agreement: boolean;
  solutionRequest: boolean;
};

const any = (patterns: RegExp[], text: string) => patterns.some((p) => p.test(text));

export function detectSignals(text: string): Signals {
  return {
    memory: any(MEMORY, text),
    tools: any(TOOLS, text),
    injection: any(INJECTION, text),
    exam: any(EXAM, text),
    stress: any(STRESS, text),
    agreement: any(AGREEMENT, text),
    solutionRequest: any(SOLUTION, text),
  };
}

/** Spec tags whose priority is raised for this turn. */
export function boostedTags(s: Signals): Set<string> {
  const tags = new Set<string>();
  if (s.exam) tags.add("exam");
  if (s.stress) tags.add("stress");
  if (s.agreement) tags.add("understanding");
  if (s.solutionRequest) tags.add("solution");
  if (s.injection) ["injection", "disclosure", "authority"].forEach((t) => tags.add(t));
  return tags;
}

export const activeSignals = (s: Signals) => Object.entries(s).filter(([, v]) => v).map(([k]) => k);
