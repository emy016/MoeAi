import { redirect } from "next/navigation";

/**
 * Tutor mode lives in the MoeAI app now: a staff account opens it there, in the
 * same design as the student app. Old links and bookmarks land in the app.
 */
export default function Page() {
  redirect("/moeai");
}
