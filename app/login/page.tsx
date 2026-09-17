import type { Metadata } from "next";
import Client from "./Client";

export const metadata: Metadata = {
  title: 'Sign in',
  description: 'Sign in to EduMoe with a one-time link. No password to forget.',
  alternates: { canonical: "/login" },
};

export default function Page() {
  return <Client />;
}
