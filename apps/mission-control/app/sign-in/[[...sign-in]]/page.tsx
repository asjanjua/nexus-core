import { SignIn } from "@clerk/nextjs";
import { safeAppRedirectPath } from "@/lib/auth/hosted-clerk-url";
import { PRODUCT_META, productFromHost, productSignInRedirect } from "@/lib/product-detection";
import { headers } from "next/headers";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect_url?: string | string[] }>;
}) {
  const hdrs = await headers();
  const productKey = productFromHost(hdrs.get("x-nexus-product") ?? hdrs.get("host") ?? "");
  const product = PRODUCT_META[productKey];
  const fallbackRedirectUrl = productSignInRedirect(productKey);
  const params = await searchParams;
  const redirectPath = safeAppRedirectPath(params.redirect_url, fallbackRedirectUrl);
  const signUpUrl = `/sign-up?redirect_url=${encodeURIComponent(redirectPath)}`;

  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-12">
      <section className="panel max-w-lg space-y-5 text-center">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-nexus-accent/80">{product.subtitle}</p>
          <h1 className="mt-2 text-3xl font-semibold text-white">Sign in to {product.name}</h1>
          <p className="mt-3 text-sm leading-6 text-white/60">
            Nexus uses Clerk for identity. Sign in here, then return directly to your governed workspace.
          </p>
        </div>
        <div className="flex justify-center">
          <SignIn forceRedirectUrl={redirectPath} signUpUrl={signUpUrl} />
        </div>
        <div className="flex flex-wrap justify-center gap-2 text-sm">
          <a href={redirectPath} className="btn-subtle">
            View workspace
          </a>
          <a href={signUpUrl} className="btn-subtle">
            Start a pilot
          </a>
        </div>
      </section>
    </main>
  );
}
