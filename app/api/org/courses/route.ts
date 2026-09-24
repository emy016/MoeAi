/**
 * GET /api/org/courses — the signed-in student's university courses.
 *
 * What the MoeAI app shows as their subjects when they signed in through their
 * university: enrolled courses, the lecture material staff have published, and
 * MoeAI's map of each course. Empty for anyone without a university identity.
 */
import { supabaseServer } from "@/lib/supabase-server";
import { orgCourses, orgIdentity } from "@/lib/org";

export const runtime = "nodejs";

export async function GET() {
  const sb = await supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return Response.json({ identity: null, courses: [] });
  const [identity, courses] = await Promise.all([orgIdentity(sb, user.id), orgCourses(sb, user.id)]);
  return Response.json({ identity, courses }, { headers: { "cache-control": "no-store" } });
}
