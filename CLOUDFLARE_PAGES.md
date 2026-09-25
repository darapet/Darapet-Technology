# Cloudflare Pages deployment

This branch is for a separate Cloudflare Pages deployment. The original main branch and existing GitHub Pages deployment are unchanged.

## Cloudflare Pages settings

Create a new Pages application from this repository and select the **cloudflare-pages** production branch.

- Build command: npm run build
- Build output directory: dist
- Root directory: /
- Node.js version: 22 or the current supported version

The lockfile on this branch uses public npm registry URLs. This avoids the internal package URL that caused Cloudflare's dependency installation to fail.

## Environment variables

Set these under Cloudflare Pages > Settings > Environment variables for both Production and Preview:

- VITE_SUPABASE_URL — your existing Supabase project URL
- VITE_SUPABASE_ANON_KEY — your existing Supabase anon/public key

Do not add a Supabase service-role key. Vite exposes VITE_* values in the browser bundle.

## Supabase auth redirect

After the first deployment, add the new Pages URL (for example, https://your-project.pages.dev) in Supabase under Authentication > URL Configuration as the Site URL and an additional redirect URL.

The public/_redirects file keeps client-side routes working when a route is refreshed directly.
