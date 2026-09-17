import type { Metadata } from "next";
import Simulators from "./Simulators";

export const metadata: Metadata = {
  title: "Simulators",
  description: "Interactive C++ and logic-design simulators for first-year Computer Science.",
  alternates: { canonical: "/simulators" },
};

export default function Page() {
  return <Simulators />;
}
