# Deploying Prafund to GitHub Pages

Prafund can run as a **pure static SPA** on GitHub Pages (or any static host).
All pages render client-side from one prerendered shell; there is no server.

## What the static build is

- `npm run build:pages` builds with `STATIC_BUILD=1`, which switches
  [vite.config.ts](vite.config.ts) into TanStack Start **SPA mode** and disables the
  nitro server.
- [scripts/build-pages.mjs](scripts/build-pages.mjs) then turns `dist/client` into a
  Pages-ready bundle: `_shell.html` → `index.html` (landing page) + `404.html`
  (so deep links like `/markets` boot the SPA), plus `.nojekyll`.
- Default `npm run build` is unchanged (nitro server, used for the local Node server).

Local preview of the static bundle (single-page fallback):

```bash
npm run build:pages
npx serve -s dist/client
```

## Deploy with GitHub Actions (recommended)

1. Create a GitHub repo and push this project (`prafund-src` becomes the repo root).
2. Repo **Settings → Pages → Build and deployment → Source: GitHub Actions**.
3. Add secrets (**Settings → Secrets and variables → Actions**), from Lovable Cloud →
   Settings in your lovable.dev project:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_PUBLISHABLE_KEY`
4. Push to `main` (or run the workflow manually). `.github/workflows/deploy-pages.yml`
   builds and publishes `dist/client`.
5. Your site is at `https://<user>.github.io/<repo>/`.

## Custom domain: prafund.co

1. Uncomment `PAGES_CNAME: prafund.co` in the workflow (writes a `CNAME` file into the
   deploy root), or set the domain in **Settings → Pages → Custom domain**.
2. At your domain registrar, point DNS at GitHub Pages:
   - Apex `A` records → `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`
   - `www` → `CNAME <user>.github.io.`
3. Wait for the DNS check in **Settings → Pages** to pass, then enable **Enforce HTTPS**.

## Static-hosting caveats

- `VITE_*` values are baked in at **build time** — changing Supabase creds means a
  rebuild/redeploy.
- **Delete account** (`profile` page) still calls a server function, which has no
  server on GitHub Pages. It will fail with the app's error toast. To restore it, move
  it into a [Supabase Edge Function](https://supabase.com/docs/guides/functions) and call
  that from the client.
- In Supabase Auth settings, add `https://prafund.co` (and the github.io preview URL) to
  the allowed redirect/site URLs so sign-in links work from the deployed site.
