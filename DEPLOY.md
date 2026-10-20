# Deploy

**Host: Cloudflare Pages — project `nextgenfiber-site`, DIRECT UPLOAD (not Git-connected).**
`nextgenfiberllc.com` and `www` are `CNAME → nextgenfiber-site.pages.dev` (proxied).

⚠️ **A `git push` to `main` does NOT publish.** There is no Git integration and no CI deploy.
Publishing is a manual upload with Wrangler. (A `netlify.toml` used to live here and was
misleading — the site has never been served from Netlify. It's gone.)

## Publish

```bash
npm run deploy
# = astro build && npx wrangler@4 pages deploy dist --project-name nextgenfiber-site --branch main
```

Wrangler needs these in the environment:

```bash
export CLOUDFLARE_API_TOKEN=<Cloudflare Pages:Edit token>
export CLOUDFLARE_ACCOUNT_ID=c144c08dc4afdda9f8113aa56489bc56
```

`wrangler pages deploy dist` also bundles the top-level `functions/` directory as
Pages Functions, so the `/api/*` routes deploy together with the static site.

## `/cadastro` + `/api/intake`

`src/pages/cadastro.astro` is the subcontractor intake form; it POSTs to the Pages Function
`functions/api/intake.js`, which e-mails the submission to `ngf@` via the Resend API
(`intake.json` + the uploaded documents). It feeds Fase B of the `/novo-sub` onboarding.

Environment variables on the Pages project (Settings → Environment variables, **production**):

| Var | Value |
|---|---|
| `RESEND_API_KEY` | NextGen Resend key (secret) |
| `INTAKE_FROM` | `NextGen Fiber <ngf@nextgenfiberllc.com>` |
| `INTAKE_TO` | `ngf@nextgenfiberllc.com` |

The Resend domain `nextgenfiberllc.com` is verified. Without `RESEND_API_KEY` the function
returns `500 {"error":"mail transport not configured"}`.
