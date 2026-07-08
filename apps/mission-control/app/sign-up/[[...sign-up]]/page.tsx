function hostedSignUpUrl(): string | null {
  const configured = process.env.NEXT_PUBLIC_CLERK_HOSTED_SIGN_UP_URL;
  if (!configured || configured.startsWith("/")) return null;
  try {
    const url = new URL(configured);
    url.searchParams.set("redirect_url", "/onboarding");
    return url.toString();
  } catch {
    return null;
  }
}

export default function SignUpPage() {
  const hostedSignUp = hostedSignUpUrl();

  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-12">
      <section className="panel max-w-lg space-y-5 text-center">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-nexus-accent/80">NexusAI pilot</p>
          <h1 className="mt-2 text-3xl font-semibold text-white">Create your workspace</h1>
          <p className="mt-3 text-sm leading-6 text-white/60">
            Sign-up is handled by Clerk. Configure a hosted sign-up URL to hand new users
            into Clerk without embedding the Clerk client bundle in this app build.
          </p>
        </div>
        {hostedSignUp ? (
          <a href={hostedSignUp} className="btn-primary inline-flex justify-center text-sm">
            Continue to signup
          </a>
        ) : (
          <div className="rounded-lg border border-amber-300/30 bg-amber-300/10 px-4 py-3 text-left text-sm text-amber-100">
            <p className="font-medium">Hosted Clerk sign-up URL is not configured.</p>
            <p className="mt-1 text-amber-100/75">
              Set <code>NEXT_PUBLIC_CLERK_HOSTED_SIGN_UP_URL</code> before opening self-serve signup.
            </p>
          </div>
        )}
        <div className="flex flex-wrap justify-center gap-2 text-sm">
          <a href="/readiness" className="btn-subtle">
            Check readiness
          </a>
          <a href="/sign-in" className="btn-subtle">
            I already have access
          </a>
        </div>
      </section>
    </main>
  );
}
