/**
 * The universities and schools MoeAI signs students in through.
 *
 * Public on purpose: the sign-in picker is shown before anyone is signed in,
 * when RLS hides the organizations table. `live` ones have courses loaded;
 * the rest are the rollout, shown so a student sees theirs is coming.
 */
export type OrgEntry = {
  slug: string;
  name: string;
  short: string;
  kind: "university" | "school";
  live: boolean;
  programs: { name: string; live: boolean }[];
  idLabel: string;
};

export const ORGS: OrgEntry[] = [
  {
    slug: "fue", name: "Future University in Egypt", short: "FUE", kind: "university", live: true, idLabel: "University ID",
    programs: [
      { name: "Computer Science", live: true },
      { name: "Dentistry", live: false },
      { name: "Engineering", live: false },
      { name: "Pharmacy", live: false },
    ],
  },
  { slug: "guc", name: "German University in Cairo", short: "GUC", kind: "university", live: false, idLabel: "Student ID", programs: [{ name: "Engineering", live: false }, { name: "Media Engineering", live: false }] },
  { slug: "bue", name: "The British University in Egypt", short: "BUE", kind: "university", live: false, idLabel: "Student ID", programs: [{ name: "Informatics", live: false }] },
  { slug: "schools", name: "Partner schools (IGCSE · Thanaweya)", short: "Schools", kind: "school", live: false, idLabel: "Student code", programs: [{ name: "Grades 10–12", live: false }] },
];

export const orgBySlug = (slug: string) => ORGS.find((o) => o.slug === slug.toLowerCase());
