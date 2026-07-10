import { headers } from "next/headers";
import { PRODUCT_META, productFromHost, productSignInRedirect } from "@/lib/product-detection";

function externalClerkUrl(kind: "sign-in" | "sign-up", redirectUrl: string): string | null {
  const configured =
    kind === "sign-in"
      ? process.env.NEXT_PUBLIC_CLERK_HOSTED_SIGN_IN_URL
      : process.env.NEXT_PUBLIC_CLERK_HOSTED_SIGN_UP_URL;
  if (!configured || configured.startsWith("/")) return null;
  try {
    const url = new URL(configured);
    url.searchParams.set("redirect_url", redirectUrl);
    return url.toString();
  } catch {
    return null;
  }
}

export default async function SignInPage() {
  const hdrs = await headers();
  const productKey = productFromHost(hdrs.get("x-nexus-product") ?? hdrs.get("host") ?? "");
  const product = PRODUCT_META[productKey];
  const fallbackRedirectUrl = productSignInRedirect(productKey);
  const hostedSignIn = externalClerkUrl("sign-in", fallbackRedirectUrl);

  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-12">
      <section className="panel max-w-lg space-y-5 text-center">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-nexus-accent/80">{product.subtitle}</p>
          <h1 className="mt-2 text-3xl font-semibold text-white">Sign in to {product.name}</h1>
          <p className="mt-3 text-sm leading-6 text-white/60">
            Nexus uses Clerk for identity. This lightweight handoff page avoids bundling Clerk&apos;s
            client UI into the production build while keeping server-side session checks active.
          </p>
        </div>
        {hostedSignIn ? (
          <a href={hostedSignIn} className="btn-primary inline-flex justify-center text-sm">
            Continue with Clerk
          </a>
        ) : (
          <div className="rounded-lg border border-amber-300/30 bg-amber-300/10 px-4 py-3 text-left text-sm text-amber-100">
            <p className="font-medium">Hosted Clerk sign-in URL is not configured.</p>
            <p className="mt-1 text-amber-100/75">
              Set <code>NEXT_PUBLIC_CLERK_HOSTED_SIGN_IN_URL</code> to re-enable new sign-ins.
              Existing authenticated sessions can continue to open their workspace.
            </p>
          </div>
        )}
        <div className="flex flex-wrap justify-center gap-2 text-sm">
          <a href={fallbackRedirectUrl} className="btn-subtle">
            View workspace
          </a>
          <a href="/sign-up" className="btn-subtle">
            Start a pilot
          </a>
        </div>
      </section>
    </main>
  );
}
