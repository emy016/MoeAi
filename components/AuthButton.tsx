"use client";
// Sign-in / sign-out control. Renders nothing until the session is known, so
// the header never flickers between states.
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase-browser";

export default function AuthButton() {
  const [email, setEmail] = useState<string | null | undefined>(undefined);
  const router = useRouter();

  useEffect(() => {
    const sb = supabaseBrowser();
    sb.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null));
    const { data: sub } = sb.auth.onAuthStateChange((_e, session) =>
      setEmail(session?.user?.email ?? null),
    );
    return () => sub.subscription.unsubscribe();
  }, []);

  if (email === undefined) return <span className="slot" aria-hidden="true" />;

  if (!email) {
    return <Link className="btn btn-primary sm" href="/login">Sign in</Link>;
  }

  return (
    <div className="who">
      <span className="muted" title={email}>{email.split("@")[0]}</span>
      <button
        className="btn sm"
        onClick={async () => {
          await supabaseBrowser().auth.signOut();
          router.push("/");
          router.refresh();
        }}
      >
        Sign out
      </button>

      <style jsx>{`
        .who { display: flex; align-items: center; gap: 8px; }
        .who span {
          font-size: 0.82rem;
          max-width: 120px;
          overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
        }
      `}</style>
    </div>
  );
}
