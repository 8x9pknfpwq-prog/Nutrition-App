# NYC Lines — Supabase email templates

Branded replacements for Supabase's default auth emails. These are **pasted into
the Supabase dashboard** (Authentication → Emails), not deployed from code.

## How to apply

For each template below:

1. Supabase Dashboard → **Authentication → Emails**.
2. Pick the matching template, set the **Subject**, and paste the file's HTML
   into the message body (replace the default).
3. **Save**.

| File | Dashboard template | Subject |
|------|--------------------|---------|
| `confirm-signup.html` | Confirm signup | `Confirm your email for NYC Lines` |
| `reset-password.html` | Reset Password | `Reset your NYC Lines password` |

The `{{ .ConfirmationURL }}` placeholder is filled in by Supabase — leave it
exactly as-is.

> Tip: also set **Authentication → URL Configuration → Site URL** to your live
> URL (e.g. your custom domain or the GitHub Pages URL) so the links in these
> emails point back to the right place.

## Important: deliverability before launch

The default Supabase email service sends from a shared `supabase.io` address and
is **heavily rate-limited** (only a few emails per hour) — fine for testing, not
for a public launch. The "This message is from an external sender" warning also
comes from that shared sender.

Before launch, configure **custom SMTP** so emails come from your own domain:

1. Sign up for an email sender (e.g. **Resend**, Postmark, or Amazon SES).
2. Verify your sending domain (add the DNS records they give you — SPF/DKIM).
3. Supabase Dashboard → **Project Settings → Authentication → SMTP Settings** →
   enter the host/port/user/pass and a `from` address like
   `hello@yourdomain.com`.

This removes the rate limit, fixes the "external sender" warning, and makes the
emails come from NYC Lines instead of Supabase.
