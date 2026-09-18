import "server-only";

/**
 * Join codes are read off a screen, typed on a phone, and sometimes dictated
 * across a lecture hall. So: no O/0, no I/1/L, no U/V confusion — and grouped
 * for the eye rather than run together.
 */
const ALPHABET = "ABCDEFGHJKMNPQRSTWXYZ23456789";

export function makeJoinCode(): string {
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  const body = Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join("");
  return `${body.slice(0, 3)}-${body.slice(3)}`;
}

/** Accept a code however it was typed: spaces, dashes, lower case. */
export function normaliseJoinCode(raw: string): string {
  const clean = (raw || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  return clean.length === 6 ? `${clean.slice(0, 3)}-${clean.slice(3)}` : clean;
}

export const ROOM_LIMITS = {
  perTeacher: 25,
  membersPerRoom: 400,
  documentsPerRoom: 200,
  titleChars: 120,
} as const;
