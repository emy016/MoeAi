import type { Metadata } from "next";
import Client from "../Client";
import "@/components/brand/logo.css";
import "../../org.css";
import "../start.css";

export const metadata: Metadata = {
  title: "Get started",
  description: "Create your MoeAI account, sign in, or connect your university or organization.",
  robots: { index: false },
};

type Search = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

export default async function Page({ params, searchParams }: { params: Promise<{ step?: string[] }>; searchParams: Promise<Search> }) {
  const [{ step }, query] = await Promise.all([params, searchParams]);
  return (
    <Client
      step={(step ?? []).join("/")}
      query={{
        next: one(query.next),
        as: one(query.as),
        token: one(query.token),
        error: one(query.error),
        plan: one(query.plan),
        org: one(query.org),
        email: one(query.email),
      }}
    />
  );
}
