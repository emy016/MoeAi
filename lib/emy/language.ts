/**
 * Language detection, continuity and output validation — a line-for-line
 * port of the Emy Telegram bot's emy/language.py, which is the version that
 * makes MoeAI sound Egyptian there.
 *
 * The reply language is a hard runtime decision made here, from the
 * student's current message. Nothing about the student's identity,
 * university, country, or the technical nature of the topic is a language
 * signal.
 *
 *   en         English
 *   ar         Egyptian Arabic in Arabic script
 *   franco     Egyptian Arabic in Latin script (Franco / Arabizi)
 *   ar+en      natural Arabic/English mixture
 *   franco+en  natural Franco/English mixture
 */

export const EN = "en";
export const AR = "ar";
export const FRANCO = "franco";
export const AR_EN = "ar+en";
export const FRANCO_EN = "franco+en";
export type Target = typeof EN | typeof AR | typeof FRANCO | typeof AR_EN | typeof FRANCO_EN;

export const TARGETS: readonly Target[] = [EN, AR, FRANCO, AR_EN, FRANCO_EN];
export const ARABIC_SCRIPT_TARGETS = new Set<Target>([AR, AR_EN]);
export const FRANCO_TARGETS = new Set<Target>([FRANCO, FRANCO_EN]);
export const MIXED_TARGETS = new Set<Target>([AR_EN, FRANCO_EN]);

const ARABIC_RANGE = "\\u0600-\\u06FF\\u0750-\\u077F\\uFB50-\\uFDFF\\uFE70-\\uFEFF";
const ARABIC_CHAR = new RegExp(`[${ARABIC_RANGE}]`, "u");
const ARABIC_RUN = new RegExp(`[${ARABIC_RANGE}]+`, "gu");
const LATIN_CHAR = /[A-Za-z]/g;
const LATIN_TOKEN = /[A-Za-z][A-Za-z0-9']*/g;
const WORD = "[\\p{L}\\p{N}_]";

// ── Neutral content: never a language signal ─────────────────────────────
const NEUTRAL_PATTERNS: RegExp[] = [
  /```[\s\S]*?```/g,
  /~~~[\s\S]*?~~~/g,
  /`[^`\n]+`/g,
  /https?:\/\/\S+|www\.\S+/g,
  /\b[\w.+-]+@[\w-]+\.[\w.]+\b/g,
  /(?:[A-Za-z]:)?[\\/][\w.\-\\/]+/g,
  /\$[^$\n]+\$/g,
  /\\\(.+?\\\)/gs,
  new RegExp(`${WORD}+\\s*\\([^)\\n]*\\)`, "gu"),
  new RegExp(`${WORD}*(?:_|::|->|\\.)${WORD}+`, "gu"),
  /[A-Za-z]\w*\s*(?:=|==|!=|<=|>=|\+=|\+\+)\s*\S+/g,
  /\b[0-9]+(?:\.[0-9]+)?\b/g,
];

const words = (s: string) => new Set(s.split(/\s+/).filter(Boolean));

export const TECHNICAL_LEXICON = words(`
  pointer pointers array arrays list stack heap queue tree graph node
  loop loops while for recursion recursive function functions method
  class classes object objects struct union enum variable variables
  compiler interpreter runtime debugger linker syntax semantics
  algorithm algorithms complexity boolean string strings char integer
  int float double long short unsigned signed index pointerarithmetic
  return break continue switch case default null nullptr void static
  const constexpr template namespace header library module package
  code output input memory address reference dereference allocation
  malloc calloc free delete new segfault overflow underflow
  api sql html css json xml yaml http https git commit merge branch
  rebase repo repository python cpp java javascript typescript linux
  bash shell kernel process thread mutex semaphore cache register
  matrix matrices vector vectors scalar determinant eigenvalue
  derivative derivatives integral integrals limit limits continuity
  equation equations formula formulas theorem lemma proof polynomial
  logarithm exponential sine cosine tangent probability variance mean
  median binomial poisson gaussian distribution kmap karnaugh
  multiplexer demultiplexer decoder encoder flipflop latch adder
  truthtable gate gates nand nor xor logic circuit sequential
  mp3 mp4 utf8 utf16 sha1 sha256 md5 base64 ipv4 ipv6 x86 x64 i386
  oauth2 http2 es6 h2o co2 3d 2d 4k 1080p
  ptr idx tmp buf argc argv stdin stdout stderr str obj arg args kwargs
  foo bar baz lhs rhs prev next val retval
`);

export const FRANCO_STRONG = words(`
  ana enta enti e7na ehna homa howa heya msh mesh mosh mish m4
  fahm fahem fahma fahmt fahmin mafhomsh 3arf 3aref 3arfa 3rft
  momken mumken mmken 3ayez 3ayza 3awez 3awza 3aiz
  keda kda kede 7aga 7agat shwaya shwya 2awi awi
  aywa aiwa ah2 tamam sa7 sah2 ghalat 8alat
  leh leeh ezay ezzay ezayk izzay eh2 ehh
  estana estanna khalas 5alas 5ales khalina 5alina
  ba3den ba3deen delwa2ty dlw2ty dilwa2ty bokra nharda embare7
  yalla yala yasta ysta ya3am ya3ny yaani ya3ni
  eshra7 eshra7ly 7el 7al so2al su2al as2ela
  2oly 2olly 2olli olly 3ayzin 3andy 3andi 3andak 3andek
  ma3lesh ma3lish mabsot za3lan ta3ban mota2aked
  bt3mel bta3mel bet3mel bttklm betkallem 3amel 3amla
  nroo7 roo7 ne5rog nshof neshof nzaker azaker mzakr mzaker
  7abeby 7abibi sa7by sa7bi gamed gamd tera2 mostafz
  da7 dah dih dol dool bardo bardu kaman tany tani
`);

export const FRANCO_WEAK = words(`
  el al fel felel 3ala 3al 3an fe fi men mn we w b bel lel
  bas bass tab tb da de di law lw kol koll kul
`);

export const ARABIC_MARKERS = words(`
  بص طب طيب يعني ايه إيه ليه ازاي إزاي ماشي خلاص يلا استنى
  ممكن عايز عاوز مش فاهم اشرح اشرحلي حل سؤال كده كدا
  ياسطا يا عم بردو كمان تاني اه أه ايوه أيوه
`);

export const ENGLISH_LEXICON = words(`
  a an the this that these those there here it its it's i i'm i've im me my
  mine we our us you your yours he him his she her hers they them their
  is are am was were be been being do does did done doing have has had
  can could would should will shall may might must need needs want wants
  and or but because so if then than when while where which who whom whose
  what why how not no nor yes ok okay yeah yep nope sure fine
  of in on at to from by with without for about into over under between
  again still just only also even too very much many more most less least
  get got give gives given take takes took make makes made use used using
  know knows knew think thinks thought understand understood explain
  explains explained show shows showed tell tells told say says said ask
  asks asked help helps helped work works worked working try tries tried
  learn learns learned study studies studied solve solves solved answer
  answers question questions problem problems example examples difference
  different same similar between mean means meant idea ideas point points
  part parts thing things way ways time times first second next last step
  steps start starts started stop stops end ends finish done wrong right
  correct incorrect true false good bad better best worse easy hard
  difficult simple complex confused confusing clear unclear stuck lost
  exam exams test tests quiz quizzes homework assignment lecture course
  class classes professor doctor semester midterm final grade grades
  today tomorrow tonight yesterday now later soon before after during
  please thanks thank sorry hey hi hello bro dude man guys wait hold
  actually honestly basically literally really pretty quite kinda sorta
  fail failing pass passing forgot forget remember remembered
`);

const ENGLISH_MORPHOLOGY = /(?:ing|tion|sion|ment|ness|able|ible|ously|ally|edly|ful|less|ship)$/;
const FRANCO_MORPHOLOGY = /(?:ny|lak|lek|lik|lko|kom|hom|sh)$/;
const hasVowel = (s: string) => /[aeiou]/.test(s);
const ARABIZI_DIGITS = new Set("2345789");

function looksArabizi(token: string): boolean {
  const lower = token.toLowerCase();
  if (TECHNICAL_LEXICON.has(lower) || lower.length < 3) return false;
  const digits = [...lower].filter((c) => /\d/.test(c));
  if (!digits.length || !digits.every((d) => ARABIZI_DIGITS.has(d))) return false;
  if (/^\d+[a-z]{1,3}$/.test(lower) || /^[a-z]{1,2}\d+$/.test(lower)) return false;
  for (let i = 0; i < lower.length; i++) {
    if (!ARABIZI_DIGITS.has(lower[i])) continue;
    const left = i > 0 && /[a-z]/.test(lower[i - 1]);
    const right = i + 1 < lower.length && /[a-z]/.test(lower[i + 1]);
    if (left || right) return true;
  }
  return false;
}

function looksEnglish(token: string): boolean {
  const lower = token.toLowerCase().replace(/^'+|'+$/g, "");
  if (ENGLISH_LEXICON.has(lower)) return true;
  if (/\d/.test(lower) || lower.length < 3 || !hasVowel(lower)) return false;
  return ENGLISH_MORPHOLOGY.test(lower);
}

function looksFranco(token: string): [boolean, boolean] {
  const lower = token.toLowerCase().replace(/^'+|'+$/g, "");
  if (TECHNICAL_LEXICON.has(lower)) return [false, false];
  if (FRANCO_STRONG.has(lower)) return [true, true];
  if (looksArabizi(lower)) return [true, true];
  if (FRANCO_WEAK.has(lower)) return [true, false];
  if (lower.length >= 3 && !hasVowel(lower) && !ENGLISH_LEXICON.has(lower)) return [true, true];
  if (lower.length >= 5 && !ENGLISH_LEXICON.has(lower) && !ENGLISH_MORPHOLOGY.test(lower) && FRANCO_MORPHOLOGY.test(lower)) {
    return [true, false];
  }
  return [false, false];
}

export function neutraliseTechnical(text: string): string {
  let masked = text;
  for (const pattern of NEUTRAL_PATTERNS) masked = masked.replace(pattern, " ");
  return masked.replace(LATIN_TOKEN, (m) => (TECHNICAL_LEXICON.has(m.toLowerCase()) ? " " : m));
}

// ── Explicit language requests ────────────────────────────────────────────
const VERB = "(?:answer|respond|reply|write|speak|talk|explain|say|chat|continue|switch)";
const EXPLICIT_RULES: [Target, RegExp][] = [
  [FRANCO, new RegExp(`${VERB}\\b[^.?!\\n]{0,40}\\b(?:in\\s+)?(?:franco|arabizi|franco[- ]arabic)\\b`, "i")],
  [FRANCO, /\b(?:franco|arabizi)\s+(?:please|pls|plz|bp)\b/i],
  [FRANCO, /(?:بالفرانكو|بالفرنكو|فرانكو)/],
  [AR, new RegExp(`${VERB}\\b[^.?!\\n]{0,40}\\b(?:in\\s+)?(?:arabic|3arabi|arabi|masri|egyptian arabic)\\b`, "i")],
  [AR, /\b(?:arabic|3arabi)\s+(?:please|pls|plz)\b/i],
  [AR, /(?:بالعرب[يى]|بالمصر[يى]|اتكلم عرب[يى]|كلمن[يى] بالعرب[يى])/],
  [EN, new RegExp(`${VERB}\\b[^.?!\\n]{0,40}\\b(?:in\\s+)?english\\b`, "i")],
  [EN, /\benglish\s+(?:please|pls|plz|only)\b/i],
  [EN, /(?:بالانجليز[يى]|بالإنجليز[يى]|بالانجلش)/],
];

export function explicitLanguageRequest(text: string): Target | null {
  for (const [target, pattern] of EXPLICIT_RULES) if (pattern.test(text)) return target;
  return null;
}

// ── Detection ─────────────────────────────────────────────────────────────
export type Evidence = {
  arabicChars: number;
  latinChars: number;
  arabicTokens: number;
  arabicMarkers: number;
  englishVotes: number;
  francoVotes: number;
  francoStrong: number;
  neutralTokens: number;
};

export type LanguageDecision = {
  target: Target;
  source: "explicit" | "message" | "continuity" | "default";
  decisive: boolean;
  evidence: Evidence;
  note: string;
};

const arabicShare = (e: Evidence) => (e.arabicChars + e.latinChars ? e.arabicChars / (e.arabicChars + e.latinChars) : 0);
const totalVotes = (e: Evidence) => e.arabicTokens + e.englishVotes + e.francoVotes;

// A quoted Arabic word is a mention, not a switch.
const QUOTED_ARABIC = new RegExp(`["'“”‘’«]\\s*[\\u0600-\\u06FF][^"'“”‘’»]*["'“”‘’»]`, "gu");

export function gatherEvidence(text: string): Evidence {
  const masked = neutraliseTechnical(text.replace(QUOTED_ARABIC, " "));
  const arabicChars = [...masked].filter((c) => ARABIC_CHAR.test(c) && /\p{L}/u.test(c)).length;
  const latinChars = (masked.match(LATIN_CHAR) ?? []).length;
  const arabicTokens = (masked.match(ARABIC_RUN) ?? [])
    .map((t) => [...t].filter((c) => /\p{L}/u.test(c)).join(""))
    .filter(Boolean);
  const arabicMarkers = arabicTokens.filter((t) => ARABIC_MARKERS.has(t)).length;

  let englishVotes = 0, francoVotes = 0, francoStrong = 0, neutralTokens = 0;
  for (const raw of masked.match(LATIN_TOKEN) ?? []) {
    const [isFranco, strong] = looksFranco(raw);
    if (isFranco) { francoVotes++; if (strong) francoStrong++; continue; }
    if (looksEnglish(raw)) { englishVotes++; continue; }
    neutralTokens++;
  }
  return { arabicChars, latinChars, arabicTokens: arabicTokens.length, arabicMarkers, englishVotes, francoVotes, francoStrong, neutralTokens };
}

const ARABIC_DOMINANT_SHARE = 0.8;
const ARABIC_SWITCH_SHARE = 0.25;
const MIN_MIXED_ENGLISH = 2;
const MIN_DECISIVE_VOTES = 3;

export function classify(ev: Evidence): [Target, boolean, string] {
  const share = arabicShare(ev);
  if (ev.arabicChars) {
    const intentional = ev.arabicMarkers > 0 || (ev.arabicTokens >= 2 && share >= ARABIC_SWITCH_SHARE);
    if (share >= ARABIC_DOMINANT_SHARE || ev.englishVotes < MIN_MIXED_ENGLISH) {
      return [AR, intentional || share >= ARABIC_DOMINANT_SHARE, "arabic script dominant"];
    }
    if (ev.francoStrong >= 2) return [AR_EN, intentional, "arabic script with franco is treated as arabic mixture"];
    return [AR_EN, intentional, "arabic script alongside english"];
  }
  if (ev.francoStrong >= 1) {
    if (ev.englishVotes >= MIN_MIXED_ENGLISH && ev.francoStrong >= 2) return [FRANCO_EN, true, "franco and english both carried"];
    const francoShare = ev.francoVotes + ev.englishVotes ? ev.francoVotes / (ev.francoVotes + ev.englishVotes) : 1;
    if (francoShare >= 0.5) return [FRANCO, ev.francoStrong >= 2 || ev.francoVotes >= 2, "franco dominant"];
    if (ev.englishVotes >= MIN_MIXED_ENGLISH) return [FRANCO_EN, ev.francoStrong >= 2, "english dominant with franco present"];
    return [FRANCO, false, "weak franco evidence"];
  }
  if (ev.englishVotes) {
    const decisive = ev.englishVotes >= MIN_DECISIVE_VOTES || (ev.englishVotes >= 2 && ev.francoVotes === 0);
    return [EN, decisive, "latin script, english evidence"];
  }
  return [EN, false, "no language evidence"];
}

/**
 * `previous` is the language of the ongoing conversation. It is used only
 * when the current message is too short or ambiguous to decide, and to stop
 * one stray token from flipping an established language.
 */
export function detectLanguage(text: string, previous?: Target | null): LanguageDecision {
  const explicit = explicitLanguageRequest(text);
  if (explicit) {
    return { target: explicit, source: "explicit", decisive: true, evidence: gatherEvidence(text), note: "explicit language request detected" };
  }
  const evidence = gatherEvidence(text);
  const [target, decisive, note] = classify(evidence);
  if (previous && TARGETS.includes(previous) && previous !== target && !decisive) {
    return { target: previous, source: "continuity", decisive: false, evidence, note: `weak signal for ${target}; kept ${previous} (${note})` };
  }
  if (totalVotes(evidence) === 0 && previous && TARGETS.includes(previous)) {
    return { target: previous, source: "continuity", decisive: false, evidence, note: "no language evidence in message; kept conversation language" };
  }
  return { target, source: totalVotes(evidence) ? "message" : "default", decisive, evidence, note };
}

/** The conversation's language so far, replayed the way the bot tracks it turn by turn. */
export function conversationLanguage(userMessages: string[]): Target | null {
  let previous: Target | null = null;
  for (const text of userMessages) previous = detectLanguage(text, previous).target;
  return previous;
}

export function describe(target: Target): string {
  return ({
    [EN]: "English",
    [AR]: "Egyptian Arabic (Arabic script)",
    [FRANCO]: "Egyptian Franco-Arabic (Latin script)",
    [AR_EN]: "a natural Egyptian Arabic / English mixture",
    [FRANCO_EN]: "a natural Franco-Arabic / English mixture",
  } as Record<Target, string>)[target] ?? target;
}
