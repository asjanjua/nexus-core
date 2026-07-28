# Product Domain DNS Cutover -- 2026-07-26

Status: `.io` application cutover complete. Product domains use Cloudflare-hosted
301 entry redirects and do not consume additional Render custom-domain slots.

This note records the original V0.6 route-entry state and the production entry
layer completed on 2026-07-28. The authenticated application remains on
`app.pinavia.io`; each product subdomain is a branded, query-preserving entry
point into its canonical route.

## Live Entry Layer -- 2026-07-28

Cloudflare now proxies the five product hostnames and applies these permanent
redirects before requests reach Render. This needs no additional Render or Clerk
custom-domain configuration.

| Product host | Canonical destination |
|---|---|
| `nexus.pinavia.io/*` | `https://app.pinavia.io/${1}` |
| `quorum.pinavia.io/*` | `https://app.pinavia.io/board/${1}` |
| `meridian.pinavia.io/*` | `https://app.pinavia.io/meridian/${1}` |
| `vantage.pinavia.io/*` | `https://app.pinavia.io/vantage/${1}` |
| `nucleus.pinavia.io/*` | `https://app.pinavia.io/nucleus/${1}` |

All five rules are `301` redirects and preserve query strings. The branded host
is a demo and marketing entry point, not an independent authenticated origin.
Do not add these hosts to Clerk or Render unless the product later needs to keep
its own hostname in the browser address bar.

## Current Evidence

Checked from the local shell on 2026-07-26:

```bash
curl -sS -I https://pinavia.io
curl -sS -I https://pinavia.io/vantage
curl -sS -I https://pinavia.io/nucleus
curl -sS -I https://app.pinavia.io
```

Results:

| Host | Observed result | Interpretation |
|---|---|---|
| `pinavia.io` | 200 from Cloudflare/Render | Public landing host is live. |
| `pinavia.io/vantage` | 307 to `/sign-in?redirect_url=%2Fvantage` | Vantage protected hub is deployed on the apex host. |
| `pinavia.io/nucleus` | 307 to `/sign-in?redirect_url=%2Fnucleus` | Nucleus protected hub is deployed on the apex host. |
| `app.pinavia.io` | 301 to a legacy host from Cloudflare | The legacy forwarding rule must be removed before the `.io` app cutover. |
| `nexus.pinavia.io` | DNS resolution failed | Missing DNS record. |
| `quorum.pinavia.io` | DNS resolution failed | Missing DNS record. |
| `meridian.pinavia.io` | DNS resolution failed | Missing DNS record. |
| `vantage.pinavia.io` | DNS resolution failed | Missing DNS record. |
| `nucleus.pinavia.io` | DNS resolution failed | Missing DNS record. |

Read-only Cloudflare dashboard inspection showed three records on `pinavia.io`:

| Name | Type | Target | Proxy |
|---|---|---|---|
| `app` | CNAME | `nexus-mission-control.onrender.com` | Proxied |
| `pinavia.io` | CNAME | `nexus-mission-control.onrender.com` | DNS only |
| `www` | CNAME | `nexus-mission-control.onrender.com` | DNS only |

Missing Cloudflare records:

- `nexus.pinavia.io`
- `quorum.pinavia.io`
- `meridian.pinavia.io`
- `vantage.pinavia.io`
- `nucleus.pinavia.io`

## Intended DNS Records

Use the single shared Render service until a product needs isolated infrastructure.

| Name | Type | Target | Proxy mode | Product route after sign-in |
|---|---|---|---|---|
| `app` | CNAME | `nexus-mission-control.onrender.com` | Proxied | `/dashboard/ceo` |
| `nexus` | CNAME | `nexus-mission-control.onrender.com` | Proxied | `/dashboard/ceo` |
| `quorum` | CNAME | `nexus-mission-control.onrender.com` | Proxied | `/board` |
| `meridian` | CNAME | `nexus-mission-control.onrender.com` | Proxied | `/meridian` |
| `vantage` | CNAME | `nexus-mission-control.onrender.com` | Proxied | `/vantage` |
| `nucleus` | CNAME | `nexus-mission-control.onrender.com` | Proxied | `/nucleus` |

Keep `pinavia.io` and `www.pinavia.io` pointed at the public landing app unless/until the marketing site splits into a separate Cloudflare Pages project.

## Required Cutover Sequence

1. In Cloudflare, remove or disable the legacy forwarding rule from `app.pinavia.io`.
2. In Render, attach these custom domains to `nexus-mission-control`:
   - `app.pinavia.io`
   - `nexus.pinavia.io`
   - `quorum.pinavia.io`
   - `meridian.pinavia.io`
   - `vantage.pinavia.io`
   - `nucleus.pinavia.io`
3. In Cloudflare DNS, create the missing CNAME records above. If Render displays a different validation target, use Render's target for that host.
4. In Clerk, add every product domain used in demos to allowed origins and redirect URLs.
5. In Render, keep `NEXT_PUBLIC_SITE_URL=https://pinavia.io`. Set `NEXT_PUBLIC_APP_URL=https://app.pinavia.io` only after the `.io` app host stops redirecting to any legacy host and the auth smoke passes.
6. Redeploy the Render service after environment or custom-domain changes.

## Smoke Gate

Run this before showing any product subdomain:

```bash
for host in app nexus quorum meridian vantage nucleus; do
  echo "== $host.pinavia.io =="
  curl -sS -I "https://$host.pinavia.io" | sed -n '1,8p'
done
```

Expected:

- `app.pinavia.io` returns 200 or a same-host sign-in flow, not a redirect to any legacy host.
- Each product host returns a `301` to its canonical `app.pinavia.io` route,
  preserving the supplied path and query string.

The redirect-entry layer is ready for buyer links and demos. It is deliberately
not evidence that a product has isolated infrastructure or a complete workflow.
