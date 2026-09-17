/**
 * Shown only when the deployment has no Supabase credentials yet.
 *
 * Better to boot and say what is missing than to fail the build. Renders
 * nothing once the environment is configured.
 */
import { isConfigured } from "@/lib/env";

export default function SetupNotice() {
  if (isConfigured) return null;

  return (
    <div className="setup" role="status">
      <strong>Setup incomplete.</strong> This deployment has no Supabase
      credentials, so sign-in and MoeAI are offline. Add{" "}
      <code>NEXT_PUBLIC_SUPABASE_URL</code>, <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code>,{" "}
      <code>SUPABASE_SERVICE_ROLE_KEY</code> and at least one provider key in the
      Vercel project settings, then redeploy. See <code>docs/DEPLOY.md</code>.
    </div>
  );
}
