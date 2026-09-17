/**
 * Layout for pages that have no original to port — Library Mode, sign-in and
 * the legal pages were never part of the old static site. They keep the shell
 * they were built with until they get a design of their own.
 */
import Nav from "@/components/Nav";
import BottomBar from "@/components/BottomBar";
import Footer from "@/components/Footer";
import SetupNotice from "@/components/SetupNotice";
import "../globals.css";

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SetupNotice />
      <Nav />
      <main className="container">{children}</main>
      <Footer />
      <BottomBar />
    </>
  );
}
