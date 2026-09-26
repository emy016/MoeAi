/**
 * The university sign-in MoeAI runs for its pilot.
 *
 * Public on purpose: the sign-in page is shown before anyone is signed in,
 * when RLS hides the organizations table. No university is named anywhere a
 * student sees: `path` is the public address (/sso/university) and `slug` is
 * the internal key the demo accounts were issued under.
 */
export type OrgEntry = {
  slug: string;
  path: string;
  name: string;
  short: string;
  kind: "university" | "school";
  live: boolean;
  programs: { name: string; live: boolean }[];
  idLabel: string;
};

export const ORGS: OrgEntry[] = [
  {
    slug: "fue", path: "university", name: "University", short: "University", kind: "university", live: true, idLabel: "University ID",
    programs: [{ name: "Computer Science", live: true }],
  },
];

/** By public path; the old internal slug still resolves so existing links keep working. */
export const orgBySlug = (value: string) => {
  const key = value.toLowerCase();
  return ORGS.find((o) => o.path === key) ?? ORGS.find((o) => o.slug === key);
};
