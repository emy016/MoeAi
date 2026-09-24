/**
 * Account field rules, shared by the signup form and the server so they can
 * never disagree. The server re-checks everything; the form only saves a trip.
 */
export const HANDLE_RE = /^[a-z0-9_.]{3,24}$/;
export const PHONE_RE = /^\+[1-9][0-9]{7,14}$/;
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function normalizePhone(raw: string): string {
  const digits = raw.replace(/[\s().-]/g, "");
  if (!digits) return "";
  if (digits.startsWith("00")) return `+${digits.slice(2)}`;
  // Egyptian mobile numbers are usually typed nationally: 01XXXXXXXXX.
  if (/^01[0-9]{9}$/.test(digits)) return `+2${digits}`;
  return digits.startsWith("+") ? digits : `+${digits}`;
}

/** Why a password is not acceptable, or null. */
export function passwordProblem(password: string, email = ""): string | null {
  if (password.length < 8) return "Use at least 8 characters.";
  if (password.length > 128) return "Use at most 128 characters.";
  if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) return "Mix letters and numbers.";
  const local = email.split("@")[0]?.toLowerCase();
  if (local && local.length >= 4 && password.toLowerCase().includes(local)) return "Do not build your password from your email.";
  if (/^(password|12345678|qwerty|11111111|abc12345)/i.test(password)) return "That password is too common.";
  return null;
}

export type SignupFields = { displayName: string; handle: string; email: string; phone: string; password: string; confirm: string; consent: boolean };

export function signupProblems(f: SignupFields): Partial<Record<keyof SignupFields, string>> {
  const out: Partial<Record<keyof SignupFields, string>> = {};
  if (f.displayName.trim().length < 2) out.displayName = "Tell us what to call you.";
  else if (f.displayName.trim().length > 60) out.displayName = "Keep it under 60 characters.";
  if (!HANDLE_RE.test(f.handle.trim().toLowerCase())) out.handle = "3–24 characters: letters, numbers, dots and underscores.";
  if (!EMAIL_RE.test(f.email.trim())) out.email = "Enter a valid email address.";
  if (f.phone.trim() && !PHONE_RE.test(normalizePhone(f.phone))) out.phone = "Enter the number with its country code, e.g. +20 10 1234 5678.";
  const pw = passwordProblem(f.password, f.email);
  if (pw) out.password = pw;
  if (f.confirm !== f.password) out.confirm = "The passwords do not match.";
  if (!f.consent) out.consent = "You need to accept the Terms and Privacy Policy to create an account.";
  return out;
}
