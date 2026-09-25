/** Fixed practice prompts and validation for the existing MoeAI chat endpoint. */
import { generateMoeAIReply } from '../ai/client';

export const QUESTION_TYPES = ['mcq', 'essay', 'blank', 'boolean'];
export const DAILY_LIMITS = { questions: 20, exams: 3, flashcards: 100 };

const names = { mcq: 'multiple choice', essay: 'essay', blank: 'fill in the blank', boolean: 'true or false' };

const LANGUAGES = { en: 'English', ar: 'Arabic (Modern Standard, Arabic script)', es: 'Spanish', fr: 'French', de: 'German', zh: 'Chinese', hi: 'Hindi' };

/**
 * Practice follows the language the app is set to, and only that language:
 * no Franco-Arabic and no mixing (Franco belongs to the chat, where the
 * student chooses it). Technical terms may stay in their standard form.
 */
function languageRule(settings) {
  const name = LANGUAGES[settings.language] || 'English';
  return `Reply in ${name} only. Write every question, option, answer and explanation in ${name}. Never use Franco-Arabic (Arabic in Latin letters) and never mix languages; formulas, code and standard technical terms may stay as they are.`;
}

function context(settings) {
  return `${languageRule(settings)} Subject: ${settings.subject?.name || 'General study'}. Lecture: ${settings.lecture?.title || 'all lectures'}. Difficulty: ${settings.difficulty}. Use the student's subject and lecture material when available. Do not invent a source citation.`;
}

function parseReply(text) {
  const source = String(text || '').replace(/^\s*```(?:json)?/i, '').replace(/```\s*$/, '').trim();
  try { return JSON.parse(source); } catch (_) {
    const first = source.indexOf('{');
    const last = source.lastIndexOf('}');
    if (first >= 0 && last > first) return JSON.parse(source.slice(first, last + 1));
    throw new Error('MoeAI returned an invalid question set. Please try again.');
  }
}

function normalizeQuestion(raw, expectedType, index) {
  // The client decides the randomized practice mix and exact exam counts.
  const type = expectedType;
  const prompt = String(raw?.question || '').trim();
  const explanation = String(raw?.explanation || '').trim();
  let answer = String(raw?.answer || '').trim();
  const options = Array.isArray(raw?.options) ? raw.options.map((option) => String(option)) : [];
  const correctIndex = Number(raw?.correctIndex);
  if (!prompt || !explanation || !answer) throw new Error('MoeAI returned an incomplete question. Please try again.');
  if (type === 'mcq' && (options.length !== 4 || !Number.isInteger(correctIndex) || correctIndex < 0 || correctIndex > 3)) throw new Error('MoeAI returned incomplete answer choices. Please try again.');
  if (type === 'mcq') answer = options[correctIndex];
  if (type === 'boolean') answer = /^true\b/i.test(answer) ? 'True' : /^false\b/i.test(answer) ? 'False' : answer;
  return { id: `${Date.now()}-${index}-${Math.random().toString(36).slice(2, 7)}`, type, prompt, options, correctIndex, answer, explanation };
}

function pickTypes(settings, count) {
  if (settings.mode === 'exam') return QUESTION_TYPES.flatMap((type) => Array(Math.max(0, Number(settings.counts[type]) || 0)).fill(type));
  const selected = settings.types?.length ? settings.types : ['mcq'];
  return Array.from({ length: count }, () => selected[Math.floor(Math.random() * selected.length)]);
}

export async function generateQuestions(settings, count) {
  const types = pickTypes(settings, count);
  const prompt = [
    'Create exactly ' + count + ' original study questions. Return ONLY a JSON object {"questions":[...]}; no Markdown.',
    context(settings),
    `Question types in order: ${types.map((type) => names[type]).join(', ')}. ${settings.types?.length > 1 ? 'Types were selected together; vary them randomly as specified in this list.' : ''}`,
    'For each question include: type (mcq, essay, blank, boolean), question, answer, explanation. The explanation is concise: at most 2 short sentences saying why the answer is right (a formula or one key step, no preamble, no repetition of the question).',
    'For mcq, include exactly four plausible options and zero-based correctIndex. For boolean, answer must be "True" or "False". For blank, make the missing portion explicit with ____ and give a short answer of 1-3 words, so it can be checked exactly. For essay, give a short model answer and one line of grading guidance in explanation.',
    'Never put the answer in the question text. Ensure answers and explanations are factually consistent.',
  ].join('\n');
  const reply = await generateMoeAIReply({ text: prompt, subject: settings.subject, lecture: settings.lecture, lectureFiles: settings.lecture?.files || [] });
  const parsed = parseReply(reply.text);
  if (!Array.isArray(parsed.questions) || parsed.questions.length !== count) throw new Error('MoeAI did not return the requested number of questions. Please try again.');
  return parsed.questions.map((item, index) => normalizeQuestion(item, types[index], index));
}

/** Keep each response small enough for the chat endpoint, then start the exam. */
export async function generateExamQuestions(settings) {
  const sequence = pickTypes(settings, 0);
  const questions = [];
  for (let offset = 0; offset < sequence.length; offset += 4) {
    const batch = sequence.slice(offset, offset + 4);
    const counts = Object.fromEntries(QUESTION_TYPES.map((type) => [type, batch.filter((item) => item === type).length]));
    questions.push(...await generateQuestions({ ...settings, counts }, batch.length));
  }
  return questions;
}

export async function generateFlashcards(settings) {
  const reply = await generateMoeAIReply({
    text: `Create exactly 10 flashcards. Return ONLY JSON {"cards":[{"front":"question","back":"answer"}]}. ${context(settings)} Every front must ask one clear question and every back must answer it directly.`,
    subject: settings.subject, lecture: settings.lecture, lectureFiles: settings.lecture?.files || [],
  });
  const parsed = parseReply(reply.text);
  if (!Array.isArray(parsed.cards) || parsed.cards.length !== 10 || parsed.cards.some((card) => !String(card?.front || '').trim() || !String(card?.back || '').trim())) throw new Error('MoeAI did not return 10 complete flashcards. Please try again.');
  return parsed.cards.map((card, index) => ({ id: `${Date.now()}-${index}`, front: String(card.front).trim(), back: String(card.back).trim() }));
}

/** Checked on the device against the saved answer key: no call to MoeAI, no waiting. */
export function gradeObjective(question, response) {
  if (question.type === 'mcq') return Number(response) === question.correctIndex;
  const clean = (value) => String(value ?? '').normalize('NFKC').toLocaleLowerCase()
    .replace(/[\u064B-\u0652]/g, '') // Arabic diacritics
    .replace(/[.,;:!?'"`()[\]{}]/g, ' ').replace(/\b(the|a|an)\b/g, ' ').replace(/\s+/g, ' ').trim();
  const given = clean(response);
  const expected = clean(question.answer);
  if (!given) return false;
  if (question.type === 'boolean') return given.startsWith(expected) || (expected === 'true' && /^(t|صح|صحيح)/.test(given)) || (expected === 'false' && /^(f|خطأ|خطا|غلط)/.test(given));
  // Fill in the blank: the same words, ignoring case, articles and punctuation; a number must match as a number.
  if (given === expected) return true;
  const asNumber = (value) => { const n = Number(value.replace(/\s/g, '')); return Number.isFinite(n) ? n : null; };
  if (asNumber(given) !== null && asNumber(expected) !== null) return Math.abs(asNumber(given) - asNumber(expected)) < 1e-9;
  return expected.length > 3 && (given.includes(expected) || (given.length > 3 && expected.includes(given) && given.length >= expected.length * 0.6));
}

export async function explainObjective(question, response, settings) {
  const selected = question.type === 'mcq' ? question.options[response] : response;
  const reply = await generateMoeAIReply({
    text: `${languageRule(settings)} In at most 3 short sentences, state the correct answer and why the student's answer is right or wrong. No preamble. Do not change the answer key.\nQuestion: ${question.prompt}\nCorrect answer: ${question.answer}\nStudent answer: ${selected}\nOriginal worked explanation: ${question.explanation}`,
    subject: settings.subject, lecture: settings.lecture,
  });
  return reply.text.trim() || question.explanation;
}

export async function gradeEssay(question, response, settings) {
  const reply = await generateMoeAIReply({
    text: `${languageRule(settings)} Grade this student's written answer to the question below. Return ONLY JSON {"correct":true/false,"explanation":"concise feedback in at most 3 short sentences, including the correct answer"}. Give credit for equivalent wording and valid reasoning.\nQuestion: ${question.prompt}\nModel answer: ${question.answer}\nGrading guidance: ${question.explanation}\nStudent answer: ${String(response).slice(0, 4000)}`,
    subject: settings.subject, lecture: settings.lecture,
  });
  const parsed = parseReply(reply.text);
  if (typeof parsed.correct !== 'boolean' || !String(parsed.explanation || '').trim()) throw new Error('MoeAI could not grade this answer. Please try again.');
  return { correct: parsed.correct, explanation: String(parsed.explanation).trim() };
}
