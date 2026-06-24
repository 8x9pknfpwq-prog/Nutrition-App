# Custom domain setup (NYC Lines)

Move the app from the GitHub Pages subpath
(`https://8x9pknfpwq-prog.github.io/Nutrition-App/`) to your own domain
(e.g. `https://nyclines.app`).

The deploy workflow already handles the app side: set one repo Variable and it
builds at the root path, writes the `CNAME`, and makes the social-share URLs
absolute. The rest is DNS + a few dashboard settings.

---

## 1. Buy a domain

Any registrar works — Cloudflare, Namecheap, Porkbun, Google Domains, etc.
Pick the name (e.g. `nyclines.app`). This guide uses the **apex** domain
`nyclines.app`; a subdomain like `app.nyclines.app` is noted where it differs.

## 2. Point DNS at GitHub Pages

In your registrar's DNS settings:

**Apex domain (`nyclines.app`)** — add four `A` records (and, ideally, four
`AAAA` records for IPv6), all with host `@`:

```
A     @     185.199.108.153
A     @     185.199.109.153
A     @     185.199.110.153
A     @     185.199.111.153

AAAA  @     2606:50c0:8000::153
AAAA  @     2606:50c0:8001::153
AAAA  @     2606:50c0:8002::153
AAAA  @     2606:50c0:8003::153
```

**Subdomain (e.g. `app.nyclines.app` or `www`)** — instead use one `CNAME`:

```
CNAME  app   8x9pknfpwq-prog.github.io.
```

> Optional: also add a `www` CNAME → `8x9pknfpwq-prog.github.io.` so
> `www.nyclines.app` redirects to the apex.

DNS changes can take anywhere from minutes to a few hours to propagate.

## 3. Tell GitHub Pages the domain

Repo → **Settings → Pages → Custom domain** → enter `nyclines.app` → **Save**.
GitHub will run a DNS check; once it passes, tick **Enforce HTTPS** (the TLS
certificate can take a few minutes to provision).

## 4. Switch the build to the root path

Repo → **Settings → Secrets and variables → Actions → Variables** → **New
repository variable**:

```
Name:  VITE_CUSTOM_DOMAIN
Value: nyclines.app          (no https://, no trailing slash)
```

Then re-run the deploy: **Actions → "Deploy demo (GitHub Pages)" → Run
workflow** (changing a Variable doesn't auto-trigger a build). The workflow now:

- builds with base `/` instead of `/Nutrition-App/`,
- writes `dist/CNAME` with your domain,
- rewrites the Open Graph / Twitter image + URL to `https://nyclines.app/...`.

## 5. Update Supabase auth URLs

So confirmation / password-reset links point at the new domain:

Supabase → **Authentication → URL Configuration**:

- **Site URL:** `https://nyclines.app`
- **Redirect URLs:** add `https://nyclines.app/**`

## 6. Update the Mapbox token restriction

If you URL-restricted the public Mapbox token (recommended), add the new origin
so the map keeps loading:

Mapbox account → your token → **URL restrictions** → add:

```
https://nyclines.app/*
```

(Keep the github.io entry until you've confirmed the domain works, then you can
remove it.)

## 7. Verify

- `https://nyclines.app` loads the app with a valid HTTPS padlock.
- Deep links work: `https://nyclines.app/#/privacy`.
- Map tiles render (Mapbox restriction is correct).
- Paste the link into a social/link-preview debugger — the L·nes OG card shows.
- Trigger a password reset — the email link returns to `nyclines.app`.

---

### Reverting

Delete the `VITE_CUSTOM_DOMAIN` Variable (and clear the Pages custom domain) and
re-run the workflow to go back to the `/Nutrition-App/` subpath.
