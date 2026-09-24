/**
 * Markdown specification loader, parser and runtime mapper — port of the
 * Emy bot's emy/specs.py.
 *
 * Eslam's six Markdown files are the behavioural source of truth. Each file
 * is parsed into whole, heading-delimited units; every unit is tagged with
 * runtime categories and a priority by heading pattern; a unit that matches
 * no pattern is kept at NORMAL priority rather than dropped. Selection later
 * works on whole units — text is never cut mid-section.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

export const MODULE_FILES = {
  AI_POLICY: "AI_POLICY.md",
  SECURITY: "SECURITY.md",
  PERSONALITY: "PERSONALITY.md",
  TUTORING: "TUTORING.md",
  MEMORY: "MEMORY.md",
  TOOLS: "TOOLS.md",
} as const;
export type Module = keyof typeof MODULE_FILES;
export const MODULE_ORDER: Module[] = ["AI_POLICY", "SECURITY", "PERSONALITY", "TUTORING", "MEMORY", "TOOLS"];

/** Lower is more important. EXCLUDED is never sent. */
export const Priority = { PINNED: 0, HIGH: 1, NORMAL: 2, LOW: 3, EXCLUDED: 9 } as const;
export type Priority = (typeof Priority)[keyof typeof Priority];

export type Unit = {
  module: Module;
  heading: string;
  pathSlug: string;
  text: string;
  tags: Set<string>;
  priority: Priority;
  ruleId: string;
};

type Rule = { id: string; pattern: RegExp; tags: string[]; priority: Priority };
const r = (id: string, pattern: string, tags: string[], priority: Priority): Rule => ({ id, pattern: new RegExp(pattern), tags, priority });
const { PINNED, HIGH, NORMAL, LOW, EXCLUDED } = Priority;

const SPLIT_PATTERNS: Partial<Record<Module, RegExp[]>> = {
  PERSONALITY: [/\blanguage\b/],
  SECURITY: [/prompt injection|jailbreak/],
};

// First match wins, so order matters.
const RULES: Record<Module, Rule[]> = {
  PERSONALITY: [
    r("pers.franco", "franco|arabizi", ["language", "franco"], HIGH),
    r("pers.bidi", "mixed.{0,3}language|bidirection|bidi", ["language", "bidi"], HIGH),
    r("pers.language", "\\blanguage\\b|selection order", ["language", "language_core"], PINNED),
    r("pers.identity", "\\bidentit", ["persona", "identity"], PINNED),
    r("pers.traits", "\\btraits?\\b|core personality", ["persona"], PINNED),
    r("pers.voice", "\\bvoice\\b|sentence|\\bstyle\\b", ["persona", "style"], PINNED),
    r("pers.tone", "interaction|\\btone\\b|\\bmodes?\\b|register", ["persona", "adaptation"], PINNED),
    r("pers.humor", "humou?r|sarcas|\\bjokes?\\b", ["persona", "humor"], PINNED),
    r("pers.reactions", "reaction|celebrat", ["persona", "humor"], PINNED),
    r("pers.checklist", "checklist|naturalness", ["persona", "checklist"], HIGH),
    r("pers.meta", "^scope$|^purpose|^about", ["meta"], LOW),
  ],
  AI_POLICY: [
    r("pol.reference", "design reference|further reading|bibliograph", ["reference"], EXCLUDED),
    r("pol.authority", "authority model|instruction hierarch", ["authority"], HIGH),
    r("pol.conflict", "conflict resolution|priority order", ["authority"], HIGH),
    r("pol.truth", "truthful|uncertain|hallucinat|fabricat", ["truth"], PINNED),
    r("pol.persona_vs_policy", "personality (versus|vs)", ["authority", "persona"], PINNED),
    r("pol.memory_invariant", "memory (versus|vs)", ["authority", "memory_invariant"], PINNED),
    r("pol.tools_invariant", "tools? (versus|vs)", ["authority", "tools_invariant"], PINNED),
    r("pol.refusal", "refusal|redirection", ["refusal"], HIGH),
    r("pol.values", "governing values|\\bvalues\\b|principles", ["values"], HIGH),
    r("pol.language", "\\blanguage\\b|personalization", ["language", "policy"], NORMAL),
    r("pol.mission", "\\bmission\\b", ["meta"], NORMAL),
    r("pol.boundary", "application boundary|what .* cannot", ["boundary"], LOW),
    r("pol.meta", "^purpose|^scope", ["meta"], LOW),
  ],
  SECURITY: [
    r("sec.reference", "design reference|bibliograph", ["reference"], EXCLUDED),
    r("sec.layered", "layered defense|defence in depth|defense in depth", ["process"], LOW),
    r("sec.process", "red team|evaluation|abuse control|logging|audit", ["process"], LOW),
    r("sec.boundary", "what .* cannot enforce|application boundary", ["boundary"], LOW),
    r("sec.hierarchy", "instruction hierarch|instruction authority", ["authority"], HIGH),
    r("sec.internal", "internal information|hidden prompt|system prompt", ["disclosure"], PINNED),
    r("sec.secrets", "\\bsecrets?\\b|credential", ["disclosure"], PINNED),
    r("sec.injection", "prompt injection|jailbreak|direct user attack|indirect injection", ["injection"], PINNED),
    r("sec.privacy", "privacy|authorization|authorisation", ["privacy"], HIGH),
    r("sec.failure", "safe failure|fail closed", ["failure"], HIGH),
    r("sec.trust", "trust boundar", ["injection", "trust"], HIGH),
    r("sec.tool_output", "tool.{0,3}output|retrieval", ["tools_invariant", "injection"], HIGH),
    r("sec.tools", "tool security|tool input", ["tools_invariant"], HIGH),
    r("sec.memory", "memory security", ["memory_invariant"], HIGH),
    r("sec.classification", "data classification", ["privacy"], HIGH),
    r("sec.guardrails", "output guardrail|input guardrail", ["failure"], NORMAL),
    r("sec.sandbox", "code execution|sandbox", ["tools_invariant"], NORMAL),
    r("sec.threat", "threat model", ["threat"], NORMAL),
    r("sec.meta", "security objective|^purpose|^scope", ["meta"], LOW),
  ],
  TUTORING: [
    r("tut.core_rule", "core rule|golden rule", ["understanding"], PINNED),
    r("tut.checks", "understanding check|verify understanding", ["understanding"], PINNED),
    r("tut.struggle", "diagnos|struggle", ["diagnosis"], PINNED),
    r("tut.error", "error diagnosis|first incorrect|mistake", ["diagnosis"], PINNED),
    r("tut.prereq", "prerequisite", ["diagnosis"], HIGH),
    r("tut.disclosure", "progressive disclosure", ["explanation"], HIGH),
    r("tut.models", "mental model|explanations", ["explanation"], PINNED),
    r("tut.examples", "\\bexamples?\\b", ["example"], PINNED),
    r("tut.solutions", "hints|full solution", ["solution"], PINNED),
    r("tut.when", "when.{0,20}how.{0,20}why|teach the when", ["explanation"], HIGH),
    r("tut.intent", "student intent|first decide|student need", ["diagnosis"], HIGH),
    r("tut.grounding", "factual grounding|grounding", ["truth"], HIGH),
    r("tut.practice", "practice|retrieval", ["practice"], HIGH),
    r("tut.adaptive", "adaptive|difficulty", ["practice"], HIGH),
    r("tut.exam", "\\bexam\\b|time pressure", ["exam"], HIGH),
    r("tut.stress", "stress|procrastinat|anxiet", ["stress"], HIGH),
    r("tut.objective", "teaching objective|objective", ["objective"], HIGH),
    r("tut.checklist", "checklist", ["checklist"], NORMAL),
    r("tut.meta", "^scope$|^purpose", ["meta"], LOW),
  ],
  MEMORY: [
    r("mem.language", "\\blanguage\\b", ["memory", "language"], PINNED),
    r("mem.poisoning", "poisoning|validation", ["memory", "injection"], PINNED),
    r("mem.using", "using memory", ["memory"], PINNED),
    r("mem.forbidden", "do not remember|must not|never store", ["memory"], HIGH),
    r("mem.useful", "useful memory", ["memory"], HIGH),
    r("mem.conflict", "conflict|correction", ["memory"], HIGH),
    r("mem.failure", "failure behaviour|failure behavior", ["memory", "failure"], NORMAL),
    r("mem.checklist", "checklist", ["memory"], NORMAL),
    r("mem.boundary", "isolation|access|lifecycle", ["boundary"], LOW),
    r("mem.meta", "^purpose|^scope", ["meta"], LOW),
  ],
  TOOLS: [
    r("tls.reference", "contract example|illustrative", ["reference"], EXCLUDED),
    r("tls.input", "input validation", ["tools"], PINNED),
    r("tls.output", "output validation", ["tools"], PINNED),
    r("tls.retrieval", "retrieval|external content", ["tools", "injection"], PINNED),
    r("tls.sensitive", "sensitive action|confirmation", ["tools"], PINNED),
    r("tls.authz", "authorization|authorisation", ["tools"], PINNED),
    r("tls.privilege", "least privilege", ["tools"], HIGH),
    r("tls.failure", "error|timeout|retr(y|ies)", ["tools", "failure"], HIGH),
    r("tls.exec", "code execution", ["tools"], HIGH),
    r("tls.side_effects", "side effect", ["tools"], HIGH),
    r("tls.classes", "tool class", ["tools"], NORMAL),
    r("tls.checklist", "checklist", ["tools"], NORMAL),
    r("tls.boundary", "registry|rate limit|logging|audit", ["boundary"], LOW),
    r("tls.meta", "^purpose|^scope", ["meta"], LOW),
  ],
};

export const CRITICAL_RULES = [
  "pers.identity", "pers.traits", "pers.voice", "pers.tone", "pers.humor", "pers.reactions", "pers.language",
  "pol.authority", "pol.truth", "sec.hierarchy", "sec.internal", "sec.injection", "sec.privacy",
  "tut.core_rule", "tut.checks", "tut.struggle", "tut.examples", "tut.solutions",
];

const DEFAULT_TAGS: Record<Module, string> = {
  AI_POLICY: "policy", SECURITY: "security", PERSONALITY: "persona", TUTORING: "tutoring", MEMORY: "memory", TOOLS: "tools",
};

export function slugify(text: string): string {
  return text
    .replace(/[*_`]+/g, "")
    .replace(/’/g, "'")
    .replace(/[^\p{L}\p{N}_\s/&:-]+/gu, " ")
    .replace(/[\s_]+/g, " ")
    .trim()
    .toLowerCase();
}

type Block = { heading: string; level: number; lines: string[]; children: Block[] };
const blockText = (b: Block) => b.lines.join("\n").trim();
const fullText = (b: Block): string => [blockText(b), ...b.children.map(fullText)].filter(Boolean).join("\n\n").trim();

/** Split a document into H2 blocks, each holding its H3+ children. Headings inside fences are ignored. */
export function parseBlocks(markdown: string): { title: string; blocks: Block[] } {
  let title = "";
  const blocks: Block[] = [];
  let current: Block | null = null;
  let child: Block | null = null;
  let inFence = false;
  let fenceMarker = "";

  for (const line of markdown.split(/\r?\n/)) {
    const fence = /^\s*(```|~~~)/.exec(line);
    if (fence) {
      if (!inFence) { inFence = true; fenceMarker = fence[1]; }
      else if (fence[1] === fenceMarker) { inFence = false; fenceMarker = ""; }
    }
    const heading = inFence ? null : /^(#{1,6})[ \t]+(.+?)[ \t]*#*$/.exec(line);
    if (heading) {
      const level = heading[1].length;
      const text = heading[2].trim();
      if (level === 1) { title = title || text; continue; }
      if (level === 2) {
        current = { heading: text, level: 2, lines: [line], children: [] };
        child = null;
        blocks.push(current);
        continue;
      }
      if (!current) { current = { heading: title || "preamble", level: 2, lines: [], children: [] }; blocks.push(current); }
      child = { heading: text, level, lines: [line], children: [] };
      current.children.push(child);
      continue;
    }
    if (!current && line.trim()) { current = { heading: title || "preamble", level: 2, lines: [], children: [] }; blocks.push(current); }
    if (child) child.lines.push(line);
    else if (current) current.lines.push(line);
  }
  return { title, blocks: blocks.filter((b) => fullText(b)) };
}

function mapUnit(module: Module, pathSlug: string, heading: string, text: string): Unit {
  for (const rule of RULES[module]) {
    if (rule.pattern.test(pathSlug)) {
      return { module, heading, pathSlug, text, tags: new Set(rule.tags), priority: rule.priority, ruleId: rule.id };
    }
  }
  return { module, heading, pathSlug, text, tags: new Set([DEFAULT_TAGS[module], "unmapped"]), priority: NORMAL, ruleId: "<default>" };
}

export function buildUnits(module: Module, markdown: string): Unit[] {
  const { blocks } = parseBlocks(markdown);
  const split = SPLIT_PATTERNS[module] ?? [];
  const units: Unit[] = [];
  for (const block of blocks) {
    const slug = slugify(block.heading);
    const shouldSplit = block.children.length > 0 && split.some((p) => p.test(slug));
    if (!shouldSplit) { units.push(mapUnit(module, slug, block.heading, fullText(block))); continue; }
    const intro = blockText(block);
    if (intro && intro.split("\n").length > 1) units.push(mapUnit(module, slug, block.heading, intro));
    for (const c of block.children) units.push(mapUnit(module, `${slug} > ${slugify(c.heading)}`, c.heading, fullText(c)));
  }
  return units;
}

export type ModuleSpec = { name: Module; title: string; raw: string; units: Unit[] };
export type SpecRegistry = Record<Module, ModuleSpec>;

export function registryFromTexts(texts: Record<Module, string>): SpecRegistry {
  const registry = {} as SpecRegistry;
  for (const name of MODULE_ORDER) {
    const raw = texts[name].trim();
    registry[name] = { name, title: parseBlocks(raw).title, raw, units: buildUnits(name, raw) };
  }
  return registry;
}

let cached: SpecRegistry | null = null;
/** Eslam's files from prompts/, read once per server instance. */
export function loadRegistry(dir = join(process.cwd(), "prompts")): SpecRegistry {
  if (cached) return cached;
  const texts = {} as Record<Module, string>;
  for (const name of MODULE_ORDER) texts[name] = readFileSync(join(dir, MODULE_FILES[name]), "utf8");
  cached = registryFromTexts(texts);
  return cached;
}

/** Problems with the mapping; empty means every critical behaviour maps to a heading. */
export function validateRegistry(registry: SpecRegistry): string[] {
  const problems: string[] = [];
  const matched = new Set(MODULE_ORDER.flatMap((m) => registry[m].units.map((u) => u.ruleId)));
  for (const m of MODULE_ORDER) {
    const usable = registry[m].units.filter((u) => u.priority !== EXCLUDED);
    if (!usable.length) problems.push(`${MODULE_FILES[m]}: mapped 0 usable sections`);
    if (m === "PERSONALITY" && !usable.some((u) => u.tags.has("persona"))) problems.push("PERSONALITY.md: mapped 0 personality sections");
  }
  for (const id of CRITICAL_RULES) if (!matched.has(id)) problems.push(`critical rule ${id} matched no heading`);
  return problems;
}

/** Token estimate, script-aware and deliberately high, as in the bot's tokens.py. */
export function estimateTokens(text: string): number {
  if (!text) return 0;
  const arabic = (text.match(/[؀-ۿݐ-ݿﭐ-﷿ﹰ-﻿]/g) ?? []).length;
  const latin = (text.match(/[A-Za-z]/g) ?? []).length;
  const other = Math.max(0, text.length - arabic - latin);
  return Math.floor(arabic / 1.9 + latin / 3.7 + other / 3.0) + 1;
}
