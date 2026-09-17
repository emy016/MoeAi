/**
 * Language detection and output validation.
 *
 * Ported from the Egyptian-Arabic / Franco-Arabic engine that was tuned against
 * real students on the Telegram prototype. This is rule-based on purpose: the
 * model is not allowed to guess the reply language, because it drifts to
 * English the moment a message contains the word "pointer".
 *
 * Targets:
 *   en        English
 *   ar        Egyptian Arabic in Arabic script
 *   franco    Egyptian Arabic in Latin letters (Arabizi)
 *   ar_en     Arabic script with natural English technical terms
 *   franco_en Franco with natural English technical terms
 */

export type Target = "en" | "ar" | "franco" | "ar_en" | "franco_en";

export interface LanguageDecision {
  target: Target;
  explicit: boolean;        // the student asked for this language outright
  confident: boolean;       // enough evidence, or did we fall back to history
  reason: string;           // for ai_logs, so drift is debuggable later
}

const ARABIC_CHAR = /[؀-ۿݐ-ݿﭐ-﷿ﹰ-﻿]/;
const ARABIC_RUN = /[؀-ۿݐ-ݿﭐ-﷿ﹰ-﻿]+/g;
const LATIN_TOKEN = /[A-Za-z][A-Za-z0-9']*/g;

const ARABIZI_DIGITS = new Set(["2", "3", "4", "5", "6", "7", "8", "9"]);
const VOWELS = new Set(["a", "e", "i", "o", "u"]);

/** Endings that are strong evidence a Latin token is English, not Franco. */
const ENGLISH_MORPHOLOGY =
  /(?:tion|ing|ness|ment|able|ible|ous|ance|ence|ship|ties|ally|ized|ised)$/;
/** Endings that are strong evidence a Latin token is Arabic written in Latin. */
const FRANCO_MORPHOLOGY = /(?:ny|lak|lek|lik|lko|kom|hom|sh|ha|na)$/;

/** Franco words common enough to be decisive on their own. */
const FRANCO_LEXICON = new Set([
  "ana", "enta", "enti", "e7na", "ezay", "ezayak", "eh", "leh", "fen", "emta",
  "msh", "mesh", "mish", "fahem", "fahm", "fahmni", "momken", "mumkin", "mmkn",
  "3ayez", "3ayza", "3awez", "aywa", "aiwa", "la2", "tab", "tab3an", "bas",
  "kda", "keda", "kde", "da", "di", "dh", "wala", "3shan", "3ashan", "3la",
  "ma3lesh", "ya3ni", "y3ny", "sa3b", "sahl", "shokran", "gamed", "estana",
  "bgd", "gdn", "gedan", "awi", "2wy", "2awy", "7aga", "7agat", "mo7adra",
  "em7tan", "imti7an", "mozakra", "mzakr", "sho8l", "kolo", "kol",
  // Function words. These carry most of the signal in a short Franco message.
  "el", "fe", "fy", "men", "mn", "3nd", "3and", "lel", "wel", "bta3", "bta3t",
  "bet", "bt", "haga", "shwya", "shwaya", "delwa2ty", "dlw2ty", "ba2a", "ba2",
]);

/** Common English words that would otherwise trip the Franco heuristics. */
const ENGLISH_LEXICON = new Set([
  "the", "a", "an", "is", "are", "was", "were", "be", "been", "am", "do",
  "does", "did", "can", "could", "would", "should", "will", "i", "you", "he",
  "she", "it", "we", "they", "this", "that", "these", "those", "what", "why",
  "how", "when", "where", "which", "who", "and", "or", "but", "if", "not",
  "explain", "understand", "help", "please", "exam", "question", "answer",
]);

/**
 * Blank out material that has no language: code spans, fenced blocks, URLs,
 * file paths, emails, identifiers with underscores, and bare numbers. Counting
 * them would drag every Arabic message toward "English".
 */
export function neutraliseTechnical(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`[^`]*`/g, " ")
    .replace(/https?:\/\/\S+/g, " ")
    .replace(/\b[\w.+-]+@[\w-]+\.[\w.]+\b/g, " ")
    .replace(/\b[A-Za-z]:\\[^\s]*/g, " ")
    .replace(/\/[\w./-]{2,}/g, " ")
    .replace(/\b\w+(?:_\w+)+\b/g, " ")
    .replace(/\b\d+(?:\.\d+)?\b/g, " ");
}

/** "answer in English", "رد بالعربي", "reply in franco" — a binding request. */
export function explicitLanguageRequest(text: string): Target | null {
  const t = text.toLowerCase();
  const verb =
    /(answer|respond|reply|write|speak|talk|explain|say|chat|continue|switch|keep talking)/;

  if (verb.test(t)) {
    if (/\b(in|with|using|to)\s+(english|englsh|ingliz|انجليزي)\b/.test(t)) return "en";
    if (/\b(in|with|using|to)\s+(franco|franko|arabizi|3arabizi)\b/.test(t)) return "franco";
    if (/\b(in|with|using|to)\s+(arabic|3arabi|arabi|masri|egyptian)\b/.test(t)) return "ar";
  }
  if (/(رد|اكتب|اتكلم|جاوب|كمل)\s*(لي|لى)?\s*(بال|ب)?(عربي|مصري)/.test(text)) return "ar";
  if (/(رد|اكتب|اتكلم|جاوب|كمل)\s*(لي|لى)?\s*(بال|ب)?(انجليزي|إنجليزي|انجليزى)/.test(text))
    return "en";
  if (/(رد|اكتب|جاوب)\s*(لي|لى)?\s*(بال|ب)?(فرانكو|فرانكو عربي)/.test(text)) return "franco";
  return null;
}

/** Does a Latin token look like Arabic written in Latin letters? */
function looksArabizi(token: string): boolean {
  const lower = token.toLowerCase();
  if (FRANCO_LEXICON.has(lower)) return true;

  // A digit used mid-word as a letter substitute (3ayez, msh7, 7aga).
  for (let i = 0; i < lower.length; i++) {
    if (ARABIZI_DIGITS.has(lower[i]) && i > 0 && /[a-z]/.test(lower[i - 1])) return true;
  }
  if (ARABIZI_DIGITS.has(lower[0]) && lower.length > 1 && /[a-z]/.test(lower[1])) return true;

  // A consonant cluster with no vowels at all (msh, bgd, kda-style shorthand).
  // "y" counts as a vowel here, otherwise gym/myth/rhythm read as Arabizi.
  if (lower.length >= 3 && ![...lower].some((c) => VOWELS.has(c) || c === "y")) return true;

  if (!ENGLISH_MORPHOLOGY.test(lower) && FRANCO_MORPHOLOGY.test(lower) && lower.length >= 4)
    return true;

  return false;
}

function looksEnglish(token: string): boolean {
  const lower = token.toLowerCase();
  if (ENGLISH_LEXICON.has(lower)) return true;
  if (ENGLISH_MORPHOLOGY.test(lower)) return true;
  // Ordinary English words have vowels and no Arabizi digits.
  return (
    lower.length >= 2 &&
    [...lower].some((c) => VOWELS.has(c)) &&
    ![...lower].some((c) => ARABIZI_DIGITS.has(c))
  );
}

export interface Evidence {
  arabicChars: number;
  latinTokens: number;
  arabiziTokens: number;
  englishTokens: number;
  arabicShare: number;
}

export function gatherEvidence(raw: string): Evidence {
  const text = neutraliseTechnical(raw);

  const arabicChars = (text.match(ARABIC_RUN) ?? []).join("").length;
  const latin = text.match(LATIN_TOKEN) ?? [];

  let arabizi = 0;
  let english = 0;
  for (const token of latin) {
    if (looksArabizi(token)) arabizi++;
    else if (looksEnglish(token)) english++;
  }

  const latinChars = latin.join("").length;
  const total = arabicChars + latinChars;

  return {
    arabicChars,
    latinTokens: latin.length,
    arabiziTokens: arabizi,
    englishTokens: english,
    arabicShare: total === 0 ? 0 : arabicChars / total,
  };
}

const ARABIC_DOMINANT_SHARE = 0.8;  // above this, reply in Arabic script
const ARABIC_SWITCH_SHARE = 0.25;   // above this, Arabic is present at all
const MIN_MIXED_ENGLISH = 2;        // English terms needed to call it "mixed"
const MIN_DECISIVE_VOTES = 3;       // tokens needed before we trust Franco

/**
 * Decide the reply language.
 *
 * `previous` is the language of the last assistant turn. It is only a
 * tie-breaker: a short "ok" continues the conversation's language, but a clear
 * signal in the current message always wins.
 */
export function detectLanguage(raw: string, previous?: Target | null): LanguageDecision {
  const explicit = explicitLanguageRequest(raw);
  if (explicit) {
    return { target: explicit, explicit: true, confident: true, reason: "explicit request" };
  }

  const e = gatherEvidence(raw);

  // Arabic script present and dominant.
  if (e.arabicShare >= ARABIC_DOMINANT_SHARE) {
    const target = e.englishTokens >= MIN_MIXED_ENGLISH ? "ar_en" : "ar";
    return { target, explicit: false, confident: true, reason: `arabic share ${e.arabicShare.toFixed(2)}` };
  }

  // Arabic script present but mixed with a lot of Latin.
  if (e.arabicShare >= ARABIC_SWITCH_SHARE) {
    return { target: "ar_en", explicit: false, confident: true, reason: "mixed arabic/latin" };
  }

  // No meaningful Arabic script. Franco vs English.
  //
  // The evidence is asymmetric. A Franco message is *expected* to carry English
  // technical terms, so Franco wins ties and wins outnumbered, as long as the
  // Franco tokens are not a rounding error in a long English message.
  const decisive = e.arabiziTokens + e.englishTokens;
  const francoWins =
    (e.arabiziTokens >= 1 && e.arabiziTokens >= e.englishTokens) ||
    (e.arabiziTokens >= 2 && e.arabiziTokens * 3 >= e.englishTokens);

  if (decisive >= MIN_DECISIVE_VOTES || e.arabiziTokens >= 2) {
    if (francoWins) {
      const target = e.englishTokens >= MIN_MIXED_ENGLISH ? "franco_en" : "franco";
      return {
        target,
        explicit: false,
        confident: true,
        reason: `franco ${e.arabiziTokens} vs english ${e.englishTokens}`,
      };
    }
    return {
      target: "en",
      explicit: false,
      confident: true,
      reason: `english ${e.englishTokens} vs franco ${e.arabiziTokens}`,
    };
  }

  // Too short to tell. Continue whatever the conversation was already doing.
  if (previous) {
    return { target: previous, explicit: false, confident: false, reason: "continued from history" };
  }
  if (ARABIC_CHAR.test(raw)) {
    return { target: "ar", explicit: false, confident: false, reason: "weak arabic signal" };
  }
  return { target: "en", explicit: false, confident: false, reason: "default" };
}

/** The binding instruction appended to the very end of the system prompt. */
export function languageDirective(d: LanguageDecision): string {
  const rules: Record<Target, string> = {
    en: "Reply in English.",
    ar: "Reply in conversational Egyptian Arabic, written in Arabic script. Keep technical terms in English where that is the clearest standard form, but keep every sentence around them in Arabic.",
    franco: "Reply in Egyptian Arabic written in Latin letters (Franco-Arabic), mirroring the student's own spelling conventions. Do not correct their Franco and do not switch to Arabic script.",
    ar_en:
      "Reply in Egyptian Arabic in Arabic script, mixing in English technical terms the way the student did. Do not translate established technical vocabulary.",
    franco_en:
      "Reply in Franco-Arabic mixed with English technical terms, matching the student's own mix. Do not switch to Arabic script.",
  };

  return [
    "# LANGUAGE DIRECTIVE (binding)",
    "",
    rules[d.target],
    "",
    d.explicit
      ? "The student explicitly requested this language. It overrides everything else until they ask again."
      : "This was detected from the student's current message. If their next message changes language, follow it.",
    "",
    "Never switch language because the topic is technical, because you are designed for Egypt, or because a previous turn used another language.",
  ].join("\n");
}

/**
 * Cheap post-generation check. If the model drifted (e.g. answered a clearly
 * Arabic question in English), the caller can retry once with a sharper
 * directive rather than shipping the wrong language to the student.
 */
export function validateOutput(answer: string, target: Target): { ok: boolean; reason: string } {
  const e = gatherEvidence(answer);

  if (target === "ar" || target === "ar_en") {
    if (e.arabicShare < 0.3) return { ok: false, reason: "expected Arabic script, got mostly Latin" };
    return { ok: true, reason: "" };
  }
  if (target === "franco" || target === "franco_en") {
    if (e.arabicShare > 0.25) return { ok: false, reason: "expected Franco, got Arabic script" };
    if (e.arabiziTokens === 0 && e.englishTokens > 12)
      return { ok: false, reason: "expected Franco, got plain English" };
    return { ok: true, reason: "" };
  }
  if (e.arabicShare > 0.25) return { ok: false, reason: "expected English, got Arabic script" };
  return { ok: true, reason: "" };
}
