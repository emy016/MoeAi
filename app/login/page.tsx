import { redirect } from "next/navigation";
import { safeNext } from "@/lib/auth/next";

/** The old /login address: sign-in now lives in the onboarding flow. */
export default async function Page({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  redirect(`/start/signin?next=${encodeURIComponent(safeNext(next, "/moeai"))}`);
}
