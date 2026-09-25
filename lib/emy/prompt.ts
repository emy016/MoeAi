/**
 * System-prompt assembly under a token budget — port of the Emy bot's
 * emy/prompt.py.
 *
 * Whole units only: a section is sent in full or reported as omitted, never
 * cut. PINNED units are always sent. Order: authority first, behaviour next,
 * the app's own context after that, and the hard language directive last so
 * it is the closest instruction to the student's message.
 */
import * as directives from "./directives.ts";
import { ARABIC_SCRIPT_TARGETS, FRANCO_TARGETS, MIXED_TARGETS, type LanguageDecision } from "./language.ts";
import { boostedTags, type Signals } from "./signals.ts";
import { estimateTokens, MODULE_ORDER, Priority, type SpecRegistry, type Unit } from "./specs.ts";

const CONDITIONAL = new Set(["MEMORY", "TOOLS"]);
const ASSEMBLY_OVERHEAD_TOKENS = 80;

// Personality and tutoring get the largest shares: they are what the student notices.
const MODULE_WEIGHTS: Record<string, number> = {
  AI_POLICY: 0.12, SECURITY: 0.16, PERSONALITY: 0.24, TUTORING: 0.26, LANGUAGE: 0.14, MEMORY: 0.06, TOOLS: 0.06,
};
const SECTION_ORDER = ["AI_POLICY", "SECURITY", "PERSONALITY", "TUTORING", "MEMORY", "TOOLS", "LANGUAGE"] as const;
type Section = (typeof SECTION_ORDER)[number];
const HEADINGS: Record<Section, string> = {
  AI_POLICY: "# AI POLICY", SECURITY: "# SECURITY", PERSONALITY: "# PERSONALITY", TUTORING: "# TUTORING",
  MEMORY: "# MEMORY", TOOLS: "# TOOLS", LANGUAGE: "# LANGUAGE SPECIFICATION",
};

export type BuildTrace = { selected: string[]; omitted: string[]; tokens: number; overBudget: boolean };
export type BuiltPrompt = { system: string; tokens: number; trace: BuildTrace };

const label = (u: Unit) => `${u.module}:${u.pathSlug}`;

function effectivePriority(unit: Unit, boosted: Set<string>): number {
  if (unit.priority === Priority.EXCLUDED) return unit.priority;
  return [...unit.tags].some((t) => boosted.has(t)) ? Math.max(Priority.PINNED, unit.priority - 1) : unit.priority;
}

function partition(registry: SpecRegistry, decision: LanguageDecision): Record<Section, Unit[]> {
  const buckets = Object.fromEntries(SECTION_ORDER.map((s) => [s, [] as Unit[]])) as Record<Section, Unit[]>;
  const franco = FRANCO_TARGETS.has(decision.target);
  const bidi = ARABIC_SCRIPT_TARGETS.has(decision.target) || MIXED_TARGETS.has(decision.target);
  for (const module of MODULE_ORDER) {
    for (const unit of registry[module].units) {
      if (unit.priority === Priority.EXCLUDED) continue;
      if (unit.tags.has("language")) {
        if (unit.tags.has("franco") && !franco) continue;
        if (unit.tags.has("bidi") && !bidi) continue;
        buckets.LANGUAGE.push(unit);
      } else {
        buckets[module].push(unit);
      }
    }
  }
  return buckets;
}

function select(units: Unit[], budget: number, boosted: Set<string>, trace: BuildTrace, hardCap: boolean): Unit[] {
  const ranked = [...units].sort((a, b) =>
    effectivePriority(a, boosted) - effectivePriority(b, boosted) || b.tags.size - a.tags.size || a.pathSlug.localeCompare(b.pathSlug));
  const chosen: Unit[] = [];
  let spent = 0;
  for (const unit of ranked) {
    const cost = estimateTokens(unit.text);
    const pinned = effectivePriority(unit, boosted) === Priority.PINNED;
    if ((pinned && !hardCap) || spent + cost <= budget) {
      chosen.push(unit);
      spent += cost;
      trace.selected.push(label(unit));
    } else {
      trace.omitted.push(`${label(unit)} (module budget)`);
    }
  }
  return chosen;
}

/** Drop the least important selected units until `excess` tokens are recovered. PINNED always-on units stay. */
function shed(chosen: Partial<Record<Section, Unit[]>>, excess: number, boosted: Set<string>, trace: BuildTrace): number {
  const candidates: [number, number, Section, Unit][] = [];
  for (const [section, units] of Object.entries(chosen) as [Section, Unit[]][]) {
    for (const unit of units) {
      if (unit.priority === Priority.PINNED && !CONDITIONAL.has(section)) continue;
      candidates.push([-effectivePriority(unit, boosted), -estimateTokens(unit.text), section, unit]);
    }
  }
  candidates.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  for (const [, , section, unit] of candidates) {
    if (excess <= 0) break;
    chosen[section] = chosen[section]!.filter((u) => u !== unit);
    trace.selected = trace.selected.filter((l) => l !== label(unit));
    trace.omitted.push(`${label(unit)} (global budget)`);
    excess -= estimateTokens(unit.text);
  }
  return excess;
}

export type BuildOptions = {
  decision: LanguageDecision;
  signals: Signals;
  assistantName?: string;
  /** Tokens for the whole system prompt. The bot runs on 5,900; Gemini can afford all of it. */
  budgetTokens: number;
  /** Blocks the app adds for this turn (course material, attachments, chat tools), placed before the language directive. */
  appContext?: string[];
  /**
   * Reference data for this turn (course passages, session, what the chat can
   * render). Placed right after the runtime contract, before the personality,
   * and not charged to the specification budget: the personality and the
   * language directive stay the last thing the model reads, as in the bot.
   */
  referenceContext?: string[];
};

export function buildSystemPrompt(registry: SpecRegistry, opts: BuildOptions): BuiltPrompt {
  const trace: BuildTrace = { selected: [], omitted: [], tokens: 0, overBudget: false };
  const languageTags = new Set<string>();
  if (FRANCO_TARGETS.has(opts.decision.target)) languageTags.add("franco");
  if (ARABIC_SCRIPT_TARGETS.has(opts.decision.target) || MIXED_TARGETS.has(opts.decision.target)) languageTags.add("bidi");
  const boosted = new Set([...boostedTags(opts.signals), ...languageTags]);

  const contract = directives.runtimeContract(opts.assistantName ?? "MoeAI");
  const languageBlock = directives.languageDirective(opts.decision);
  const appContext = (opts.appContext ?? []).filter(Boolean);
  const reference = (opts.referenceContext ?? []).filter(Boolean);
  const fixed = [contract, directives.PERSONALITY_ACTIVATION, directives.TUTORING_ACTIVATION, languageBlock, ...appContext];
  const fixedCost = fixed.reduce((sum, b) => sum + estimateTokens(b), 0);
  const available = Math.max(600, opts.budgetTokens - fixedCost);

  const buckets = partition(registry, opts.decision);
  const active = SECTION_ORDER.filter((name) =>
    buckets[name].length && (!CONDITIONAL.has(name) || (name === "MEMORY" ? opts.signals.memory : opts.signals.tools)));
  for (const name of ["MEMORY", "TOOLS"] as const) {
    if (!active.includes(name)) buckets[name].forEach((u) => trace.omitted.push(`${label(u)} (${name.toLowerCase()} not relevant)`));
  }
  const weightTotal = active.reduce((s, n) => s + (MODULE_WEIGHTS[n] ?? 0.05), 0) || 1;
  const chosen: Partial<Record<Section, Unit[]>> = {};
  for (const name of active) {
    const share = Math.floor((available * (MODULE_WEIGHTS[name] ?? 0.05)) / weightTotal);
    chosen[name] = select(buckets[name], share, boosted, trace, CONDITIONAL.has(name));
  }

  const specCost = Object.values(chosen).flat().reduce((s, u) => s + estimateTokens(u!.text), 0);
  const excess = fixedCost + specCost + ASSEMBLY_OVERHEAD_TOKENS - opts.budgetTokens;
  if (excess > 0) trace.overBudget = shed(chosen, excess, boosted, trace) > 0;

  // The bot defined RESPONSE_STYLE_ACTIVATION and never sent it, which is why
  // long answers read like a textbook. It goes right after the personality.
  const parts = [contract, ...reference, directives.PERSONALITY_ACTIVATION];
  let tutoringActivated = false;
  for (const name of SECTION_ORDER) {
    const units = chosen[name];
    if (!units?.length) continue;
    if (name === "TUTORING") { parts.push(directives.TUTORING_ACTIVATION); tutoringActivated = true; }
    parts.push(`${HEADINGS[name]}\n\n${units.map((u) => u.text).join("\n\n")}`);
  }
  if (!tutoringActivated) parts.push(directives.TUTORING_ACTIVATION);
  parts.push(directives.RESPONSE_STYLE_ACTIVATION);
  parts.push(...appContext);
  parts.push(languageBlock);

  const system = parts.join("\n\n").trim() + "\n";
  trace.tokens = estimateTokens(system);
  return { system, tokens: trace.tokens, trace };
}
