import { SignUp } from "@clerk/nextjs";
import { safeAppRedirectPath } from "@/lib/auth/hosted-clerk-url";

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect_url?: string | string[] }>;
}) {
  const params = await searchParams;
  const redirectPath = safeAppRedirectPath(params.redirect_url, "/onboarding");
  const signInUrl = `/sign-in?redirect_url=${encodeURIComponent(redirectPath)}`;

  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-12">
      <section className="panel max-w-lg space-y-5 text-center">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-nexus-accent/80">NexusAI pilot</p>
          <h1 className="mt-2 text-3xl font-semibold text-white">Create your workspace</h1>
          <p className="mt-3 text-sm leading-6 text-white/60">
            Sign-up is handled by Clerk and returns directly to your new governed workspace.
          </p>
        </div>
        <div className="flex justify-center">
          <SignUp forceRedirectUrl={redirectPath} signInUrl={signInUrl} />
        </div>
        <div className="flex flex-wrap justify-center gap-2 text-sm">
          <a href="/readiness" className="btn-subtle">
            Check readiness
          </a>
          <a href={signInUrl} className="btn-subtle">
            I already have access
          </a>
        </div>
      </section>
    </main>
  );
}
