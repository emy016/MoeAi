export type Attempt = {
  id: string;
  subject: string;
  score: number;
  total: number;
  created_at: string;
  answers: { id: string; topic: string; subject?: string; correct: boolean }[];
};
export function summarize(attempts: Attempt[]) {
  const total = attempts.reduce((n, a) => n + a.total, 0),
    correct = attempts.reduce((n, a) => n + a.score, 0);
  const topics = new Map<
    string,
    { correct: number; total: number; subject: string }
  >();
  for (const attempt of attempts)
    for (const answer of attempt.answers || []) {
      const key = `${answer.subject || attempt.subject} / ${answer.topic}`;
      const previous = topics.get(key) || {
        correct: 0,
        total: 0,
        subject: attempt.subject,
      };
      previous.total++;
      previous.correct += Number(answer.correct);
      topics.set(key, previous);
    }
  const weaknesses = [...topics]
    .map(([topic, value]) => ({
      topic,
      ...value,
      accuracy: Math.round((100 * value.correct) / value.total),
    }))
    .filter((item) => item.accuracy < 75)
    .sort((a, b) => a.accuracy - b.accuracy)
    .slice(0, 4);
  const dates = new Set(
    attempts.map((a) => new Date(a.created_at).toLocaleDateString("en-CA")),
  );
  const cursor = new Date();
  let streak = 0;
  if (!dates.has(cursor.toLocaleDateString("en-CA")))
    cursor.setDate(cursor.getDate() - 1);
  while (dates.has(cursor.toLocaleDateString("en-CA"))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return {
    total,
    correct,
    accuracy: total ? Math.round((correct / total) * 100) : 0,
    streak,
    weaknesses,
  };
}
export function readLocalAttempts(userId: string | null = null): Attempt[] {
  try {
    const data = JSON.parse(
      localStorage.getItem(
        userId ? `edumoe-attempts:${userId}` : "edumoe-attempts",
      ) || "[]",
    );
    return Array.isArray(data)
      ? data
          .filter(
            (a) =>
              typeof a.id === "string" &&
              Number.isFinite(a.score) &&
              Number.isFinite(a.total) &&
              a.total > 0 &&
              a.score >= 0 &&
              a.score <= a.total &&
              typeof a.created_at === "string" &&
              Array.isArray(a.answers),
          )
          .slice(0, 100)
      : [];
  } catch {
    return [];
  }
}
export function saveLocalAttempt(
  attempt: Attempt,
  userId: string | null = null,
) {
  try {
    localStorage.setItem(
      userId ? `edumoe-attempts:${userId}` : "edumoe-attempts",
      JSON.stringify([attempt, ...readLocalAttempts(userId)].slice(0, 100)),
    );
  } catch {}
}
export function shuffle<T>(items: readonly T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const value = new Uint32Array(1);
    crypto.getRandomValues(value);
    const j = value[0] % (i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
