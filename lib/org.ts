import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * A student's or staff member's university identity: which organization
 * signed them in, under which ID, and what they teach or study.
 *
 * Accounts created through a university sign-in live at
 * `<external id>@<org slug>.moeai.app`, so the university ID is the login and
 * nobody has to invent an email for it. Real SSO (SAML/OIDC) replaces the
 * password step later without changing anything downstream of this.
 */
export const orgEmail = (org: string, externalId: string) =>
  `${externalId.trim().toLowerCase().replace(/[^a-z0-9._-]/g, "")}@${org.toLowerCase()}.moeai.app`;

export type OrgIdentity = {
  orgId: string;
  orgName: string;
  orgSlug: string;
  externalId: string;
  role: "student" | "teacher" | "admin";
  program: string | null;
  year: number | null;
  displayName: string | null;
};

export async function orgIdentity(sb: SupabaseClient, userId: string): Promise<OrgIdentity | null> {
  const { data } = await sb
    .from("org_identities")
    .select("org_id, external_id, role, program, year, display_name, organizations(name, slug)")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();
  if (!data) return null;
  const org = (Array.isArray(data.organizations) ? data.organizations[0] : data.organizations) as { name: string; slug: string } | null;
  return {
    orgId: data.org_id,
    orgName: org?.name ?? "University",
    orgSlug: org?.slug ?? "",
    externalId: data.external_id,
    role: data.role,
    program: data.program,
    year: data.year,
    displayName: data.display_name,
  };
}

export type OrgCourse = {
  id: string;
  code: string;
  title: string;
  description: string | null;
  year: number | null;
  semester: number | null;
  accent: string | null;
  role: string;
  materials: { id: string; title: string; kind: string; week: number | null; pages: number | null; status: string; summary: string | null }[];
  overview: string | null;
};

/** The courses this account is enrolled in (or teaches), with their ready material and MoeAI's course map. */
export async function orgCourses(sb: SupabaseClient, userId: string): Promise<OrgCourse[]> {
  const { data: enrolled } = await sb
    .from("course_enrollments")
    .select("role, courses(id, code, title, description, year, semester, accent)")
    .eq("user_id", userId);
  const courses = (enrolled ?? [])
    .map((e) => ({ role: e.role as string, course: (Array.isArray(e.courses) ? e.courses[0] : e.courses) as Omit<OrgCourse, "role" | "materials" | "overview"> | null }))
    .filter((e) => e.course);
  if (!courses.length) return [];
  const ids = courses.map((c) => c.course!.id);
  const [{ data: materials }, { data: brains }] = await Promise.all([
    sb.from("course_materials").select("id, course_id, title, kind, week, pages, status, summary, created_at").in("course_id", ids).order("week", { ascending: true, nullsFirst: false }).order("created_at"),
    sb.from("course_brain").select("course_id, overview").in("course_id", ids),
  ]);
  return courses
    .map(({ role, course }) => ({
      ...course!,
      role,
      materials: (materials ?? []).filter((m) => m.course_id === course!.id).map(({ course_id: _c, created_at: _d, ...m }) => m),
      overview: brains?.find((b) => b.course_id === course!.id)?.overview ?? null,
    }))
    .sort((a, b) => a.code.localeCompare(b.code));
}
