import "server-only";
import { supabaseServer } from "../supabase-server";

type Sb = Awaited<ReturnType<typeof supabaseServer>>;
export type StaffContext = { sb: Sb; userId: string; course: { id: string; code: string; title: string } };

/**
 * The signed-in staff member and the course they are acting on, or the error
 * response to send. Whether they may teach it is RLS's call (can_teach_course);
 * asking it here only turns a silent empty result into a clear 403.
 */
export async function staffFor(courseId: unknown): Promise<StaffContext | Response> {
  if (typeof courseId !== "string" || !/^[0-9a-f-]{36}$/i.test(courseId)) {
    return Response.json({ error: "Pick a course." }, { status: 400 });
  }
  const sb = await supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return Response.json({ error: "Sign in as course staff." }, { status: 401 });
  const [{ data: course }, { data: canTeach }] = await Promise.all([
    sb.from("courses").select("id, code, title").eq("id", courseId).maybeSingle(),
    sb.rpc("can_teach_course", { course: courseId }),
  ]);
  if (!course) return Response.json({ error: "Course not found." }, { status: 404 });
  if (!canTeach) return Response.json({ error: "Only this course's staff can do that." }, { status: 403 });
  return { sb, userId: user.id, course };
}

export const sameOrigin = (req: Request) => {
  const origin = req.headers.get("origin");
  if (!origin) return true;
  try {
    return new URL(origin).host === req.headers.get("host");
  } catch {
    return false;
  }
};

export const errorMessage = (err: unknown, fallback: string) => (err instanceof Error && err.message ? err.message : fallback);
