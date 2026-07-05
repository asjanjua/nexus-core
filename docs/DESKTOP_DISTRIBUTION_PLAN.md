# NexusAI Desktop Distribution Plan
### Downloadable Mac and PC builds, served from pinavia.io, low/no-cost hosting

Prepared for: Ali Janjua, Leap Associates FZCO
Date: 25 June 2026
Product baseline: NexusAI Mission Control v0.23.1 (Next.js 15, Neon Postgres, Clerk auth, R2 storage, server-side LLM)

> Brand context (added 25 June 2026): Pinavia is the parent brand and `pinavia.io` is the company home. NexusAI is a Pinavia product, as are the four pivots, in an endorsed house-of-brands model. Domain ownership is confirmed, which closes the domain risk previously listed in Section 9. The marketing site sits at `pinavia.io`, the Nexus product site at `nexus.pinavia.io`, the running app at `app.pinavia.io`, downloads redirect via `get.pinavia.io` to GitHub Releases, and each pivot has its own subdomain. Full detail in `paperwork/Pinavia_Brand_and_Domain_Architecture.md`.

---

## 1. The direct answer

You cannot "package" Nexus as-is, because today it is a full-stack web app that depends on a cloud database, cloud auth, cloud storage, and server-side LLM calls. A download has to wrap that into something a user can run.

The smart move is not to pick one model. It is to ship in three phases that each stand on their own and build toward the on-prem, local-first version that fits your regulated buyers best.

1. **Phase 0 (this week): Installable web app.** Turn the hosted app into a PWA and a desktop shortcut/window. Looks and feels like an app, ships in days, costs almost nothing. Buys you a real download link to put on the site immediately.
2. **Phase 1 (2 to 4 weeks): Desktop client plus cloud backend.** A real signed Mac and Windows app (Tauri) that talks to your hosted backend. This is your commercial flagship and your subscription engine.
3. **Phase 2 (6 to 10 weeks): Local-first desktop app.** Same app, but with a local database and local file storage so most of it runs on the user's machine. No backend required for core use. This is the version a bank or regulator will actually allow.
4. **Phase 3 (parallel/optional): On-prem local LLM.** Point the local-first build at LM Studio or Ollama on the user's machine or their server. Now "no data leaves your premises" is literally true. This is your enterprise wedge.

Hosting the downloads and the landing page is the easy part and genuinely free: Cloudflare Pages for the site, GitHub Releases for the binaries, your domain on top.

Monetize in layers, not one model: free installable app for adoption, license keys for the desktop app, Stripe subscriptions for cloud sync and team features, and a priced on-prem/enterprise tier. You already have Stripe tiers wired, so you are not starting from zero.

---

## 2. What this means in plain terms

"Downloadable Nexus" is really three products wearing the same coat. The thing that changes between them is **where the data and the brain live**:

| Model | Where data lives | Where the LLM runs | Needs your server? | Best for |
|---|---|---|---|---|
| Installable web app (Phase 0) | Your cloud | Your cloud | Yes | Fast launch, demos, top of funnel |
| Desktop client + cloud (Phase 1) | Your cloud | Your cloud | Yes | Prosumers, SaaS subscribers |
| Local-first desktop (Phase 2) | User's machine | Your cloud or local | No, for core use | SMBs wary of cloud |
| On-prem + local LLM (Phase 3) | User's machine/server | User's machine/server | No | Banks, regulators, GCC data residency |

The commercial logic: Phase 0 and 1 make you money fast and cheaply. Phase 2 and 3 are what let you charge enterprise prices and win regulated deals, which is exactly your market.

---

## 3. Technology choice: Tauri over Electron

Recommendation: build the desktop app with **Tauri v2**, not Electron.

| Factor | Tauri v2 | Electron |
|---|---|---|
| Bundle size | ~3 to 10 MB | ~80 to 200 MB |
| Memory use | Low (OS WebView) | High (bundles Chromium) |
| Security posture | Stronger, Rust core, smaller attack surface | Larger surface |
| Local LLM / on-prem fit | Excellent, lightweight, easy to sit next to LM Studio/Ollama | Workable but heavy |
| Learning curve | Some Rust config | Pure Node.js |
| Auto-update | Full-binary update (fine for small bundles) | Mature differential updates |

Why this matters for you specifically: a 5 MB signed app that runs cool and ships fast is a far easier sell into a bank's endpoint-security review than a 200 MB Chromium bundle. The smaller attack surface is a talking point in your regulatory positioning, not just an engineering nicety. The one trade-off is that your team touches a little Rust for the wrapper. The Next.js app itself does not change.

The honest counter-view: if speed of the very first desktop build matters more than size and you want zero Rust, Electron with electron-builder is the faster path for a Node team. But for a product whose moat is governance and data control, Tauri is the better strategic fit.

---

## 4. Phase-by-phase build plan

### Phase 0 — Installable web app (days, near-zero cost)

Goal: a real "Download / Install" button on pinavia.io this week, with no new architecture.

Steps:
1. Add a web app manifest (`manifest.json`) and a service worker to the Next.js app so Chrome, Edge, and Safari offer "Install app". This makes Nexus installable as a standalone window on both Mac and PC.
2. Add app icons (512px, 192px, maskable) and theme colours.
3. Deploy the app itself. Important nuance: Next.js with server features cannot run on Cloudflare Pages static hosting. Keep the **app** on a Next-friendly host (Vercel free/hobby, or Cloudflare Workers via the Next adapter), and use Cloudflare Pages only for the marketing/download site.
4. Put the install instructions and an "Open Nexus" deep link on the landing page.

Likely failure points: Safari PWA support is weaker than Chrome; service worker caching can serve stale builds (set a versioned cache). 

How to verify: open the site in Chrome, confirm the install icon appears, install it, confirm it launches in its own window and survives a reboot.

What you get: a download story immediately, while Phase 1 is being built.

### Phase 1 — Desktop client + cloud backend (2 to 4 weeks)

Goal: signed, real `.dmg` (Mac) and `.exe`/`.msi` (Windows) installers that wrap the hosted app.

Steps:
1. Scaffold a Tauri v2 project alongside `apps/mission-control`. The Tauri window loads your hosted Next.js app URL (or a bundled static shell that calls your APIs).
2. Wire native niceties: app menu, deep links (`nexus://`), system tray, auto-update pointing at GitHub Releases.
3. Set up cross-platform builds with GitHub Actions (`tauri-action`) so a tagged commit produces Mac (Intel + Apple Silicon) and Windows artifacts automatically.
4. Code-sign and notarize (see Section 6).
5. Publish artifacts to GitHub Releases; the site links to them.

Likely failure points: macOS notarization is fiddly the first time; auto-update keys must be generated and stored as CI secrets; Apple Silicon vs Intel needs a universal binary or two downloads.

How to verify: install on a clean Mac and a clean Windows VM, confirm no Gatekeeper/SmartScreen warning, confirm auto-update pulls the next tagged release.

What you get: your commercial flagship and the home for Stripe subscriptions.

### Phase 2 — Local-first desktop app (6 to 10 weeks)

Goal: the app runs without your backend for core use. This is the heavy lift and the real differentiator.

The work is swapping the four cloud dependencies for local equivalents behind the interfaces you already have (`lib/data/repository.ts` already has a Postgres-first, in-memory fallback, which is a strong starting seam):

| Cloud dependency today | Local-first replacement |
|---|---|
| Neon Postgres | Embedded Postgres or SQLite shipped inside the app (Drizzle supports SQLite) |
| Clerk auth | Local account / license-key unlock; optional cloud login for sync |
| R2 file storage | Local app-data folder on the user's disk |
| Server-side LLM API | Local model endpoint (Phase 3) or user's own API key |

Steps:
1. Add a SQLite/embedded-Postgres adapter behind the repository interface. Run your existing migrations against it.
2. Move file storage to a local data directory via Tauri's filesystem APIs.
3. Replace mandatory Clerk with an offline unlock (license key) plus optional cloud login.
4. Introduce a clear "local mode vs cloud mode" toggle. Your product already has a local-only AI policy concept, so extend that.
5. Optional cloud sync as a paid feature.

Likely failure points: pgvector embeddings need a local vector story (sqlite-vec or a bundled pgvector build); migration parity between Postgres and SQLite; keeping one codebase for both modes.

How to verify: pull the network cable, launch the app, onboard a company, upload a document, ask a question, get an evidence-grounded answer. All offline.

What you get: the version a regulated buyer can run, and the foundation for on-prem.

### Phase 3 — On-prem local LLM (parallel, 1 to 2 weeks once Phase 2 exists)

Goal: "no data leaves your premises" is literally true.

Steps:
1. Add a provider option that points at a local OpenAI-compatible endpoint (LM Studio default `http://localhost:1234/v1`, or Ollama `http://localhost:11434`).
2. Detect a running local model; fall back gracefully with a setup prompt if none is found.
3. Document the on-prem reference setup: a workstation or small server running LM Studio/Ollama, the Nexus desktop app on each user machine pointing at it.
4. Add an enterprise config file so IT can pin the endpoint and lock cloud off.

Likely failure points: local model quality vs your prompts (test your eval harness against the local model); throughput on shared on-prem hardware; embeddings model must also be local.

How to verify: run your existing 30-case eval harness against the local model and compare scores to the cloud baseline. Ship only if it clears your threshold.

What you get: the enterprise wedge for SBP/SAMA-sensitive banks where cloud AI is a non-starter.

---

## 5. Serving the downloads on pinavia.io (free / low cost)

You do not need a server to host downloads or the landing page. Use a split:

| Need | Tool | Cost |
|---|---|---|
| Marketing + download landing page | Cloudflare Pages (static) on `www.pinavia.io` | Free, unlimited bandwidth |
| The installer binaries (.dmg, .msi, .exe) | GitHub Releases | Free |
| The actual Nexus web app (Phase 0/1 backend) | Vercel Hobby or Cloudflare Workers | Free tier, then low |
| DNS, HTTPS, CDN, DDoS | Cloudflare (free plan) | Free |
| Large assets over 25 MB if ever needed | Cloudflare R2 public bucket | Pennies |

How it fits together: point `pinavia.io` DNS at Cloudflare. Cloudflare Pages serves the landing page. The "Download for Mac / Download for Windows" buttons link to the latest GitHub Release assets (or to a short `pinavia.io/download/mac` redirect you control). The web app lives on Vercel/Workers at `app.pinavia.io`.

Key correction to a common assumption: Cloudflare Pages free tier hosts static files only and caps single files at 25 MB. Tauri installers are small enough to sometimes fit, but the clean, conventional answer is to host binaries on GitHub Releases and keep Pages for the static site. Do not try to run the Next.js server app on Pages static hosting; it will not work.

Realistic running cost at low volume: domain ~$38/year, everything else $0 until you have real traffic or paying users. The only unavoidable spend is code signing (Section 6).

---

## 6. Code signing (the one unavoidable cost)

Unsigned apps trigger scary Gatekeeper (Mac) and SmartScreen (Windows) warnings that kill trust instantly. For a fintech-credible product this is not optional.

| Platform | What you need | Cost (verify at purchase) |
|---|---|---|
| macOS | Apple Developer Program membership, then sign + notarize | $99 / year |
| Windows | OV code-signing certificate (EV optional for instant SmartScreen trust) | ~$200 to $300 / year OV; EV higher |

Notes: OV Windows certificates now usually require hardware tokens or cloud HSM signing, which adds setup friction; budget time, not just money. EV removes the SmartScreen "unknown publisher" warning faster but costs more and needs business validation. For your stage, OV is fine to start.

Total signing budget: roughly $300 to $400 in year one across both platforms.

---

## 7. How you make money (layer all three, do not choose one)

You answered "all of the above," and that is correct. The trick is to map each money model to the phase it naturally fits:

| Layer | Model | Mechanism | Fits phase |
|---|---|---|---|
| Adoption | Free installable app | PWA, no payment | Phase 0 |
| Prosumer / SMB | License key per seat | Gumroad or Lemon Squeezy, validated offline in the app | Phase 1/2 |
| Recurring SaaS | Subscription | Your existing Stripe tiers (Free/Pro/Business/Enterprise) for cloud sync, team features, hosted LLM | Phase 1 |
| Enterprise / regulated | On-prem licence + support | High-touch annual contract, priced per deployment, includes on-prem LLM setup and support | Phase 3 |

Recommended packaging:
- **Free**: installable app, single user, bring-your-own LLM API key, local only.
- **Pro (subscription)**: cloud sync, hosted LLM, multiple workspaces.
- **Business (subscription)**: team seats, connectors, governance features.
- **Enterprise (annual licence + SOW)**: on-prem deployment, local LLM, data residency, support and SLA. This is where Leap-style consulting revenue attaches: deployment, configuration, and policy setup as a paid engagement, not free work.

The commercial point for you: the free desktop app is a lead magnet for the enterprise on-prem deals, which is where the real money and your consulting margin live. Keep the give-away genuinely useful but keep cloud sync, team features, and on-prem behind paid tiers.

Lemon Squeezy vs Stripe: Lemon Squeezy acts as merchant of record and handles global VAT/tax, which is useful for selling license keys across GCC/Pakistan/EU without you registering for tax everywhere. Stripe gives you more control and you already have it wired. Use Stripe for subscriptions, consider Lemon Squeezy for one-time license keys.

---

## 8. Cost and effort summary

| Item | One-time | Recurring |
|---|---|---|
| Domain (pinavia.io) | — | ~$38 / year |
| Apple Developer Program | — | $99 / year |
| Windows OV code-signing cert | — | ~$200 to $300 / year |
| Cloudflare Pages + DNS | — | Free |
| GitHub Releases (binaries) | — | Free |
| Web app hosting (Vercel/Workers) | — | Free at low volume |
| Stripe / Lemon Squeezy | — | % of revenue only |
| Engineering: Phase 0 | ~2 to 4 days | — |
| Engineering: Phase 1 | ~2 to 4 weeks | — |
| Engineering: Phase 2 | ~6 to 10 weeks | — |
| Engineering: Phase 3 | ~1 to 2 weeks after Phase 2 | — |

Bottom line: under ~$450/year in hard costs to be fully signed and live on both platforms. The real cost is engineering time, front-loaded into Phase 2.

---

## 9. Risks and mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| ~~Domain not actually owned~~ RESOLVED | Whole chain blocked | Domain owned (confirmed 25 Jun 2026). Pinavia is the parent brand; see brand context above. |
| Next.js server features cannot go static | Phase 0/1 hosting confusion | Keep app on Vercel/Workers, only static site on Pages |
| Local-first parity (pgvector, migrations) | Phase 2 slips | Prototype SQLite + sqlite-vec early; keep repository interface clean |
| Local LLM quality below cloud | On-prem answers worse | Gate Phase 3 on your existing 30-case eval harness clearing threshold |
| Code-signing token friction (Windows OV) | Launch delay | Start the cert purchase and validation now; it takes days |
| Trying to do all phases at once | Nothing ships | Ship Phase 0 first, treat it as a real release |

---

## 10. Immediate next steps (first 10 days)

1. **Confirm the domain.** Verify you actually control pinavia.io (the registrar check shows it as still available). Secure it today if not. This unblocks everything.
2. **Stand up the static site.** Point pinavia.io DNS at Cloudflare, create a Cloudflare Pages project for the landing/download page.
3. **Ship Phase 0.** Add PWA manifest + service worker + icons to Mission Control, deploy on Vercel hobby at app.pinavia.io, put a working "Install" button on the site.
4. **Start the paperwork that has lead time.** Enrol in the Apple Developer Program ($99) and begin a Windows OV certificate purchase. These take days to validate, so start now even though you sign in Phase 1.
5. **Scaffold the Tauri shell.** Create the Tauri v2 project wrapping the hosted app and a GitHub Actions build that produces unsigned Mac + Windows artifacts. Prove the pipeline before adding signing.

Do these five and you have a live download page, a real installable app, and the signing paperwork moving, inside two weeks, for under $500.

---

### Sources
- [Electron vs Tauri 2026: Bundle Size, RAM, Security](https://www.pkgpulse.com/guides/electron-vs-tauri-2026)
- [Tauri v2 vs Electron 2026: The Honest Comparison](https://www.buildmvpfast.com/blog/tauri-v2-vs-electron-desktop-apps-2026)
- [Apple Developer Program — Membership Details](https://developer.apple.com/programs/whats-included/)
- [Apple Developer Program Cost 2026](https://richestsoft.com/blog/apple-developer-program-cost/)
- [OV Code Signing Certificates — SSL.com](https://www.ssl.com/products/software-integrity/code-signing/ov/)
- [Cloudflare Pages — Free Plan](https://www.cloudflare.com/plans/free/)
- [Cloudflare Pages — Limits](https://developers.cloudflare.com/pages/platform/limits/)
