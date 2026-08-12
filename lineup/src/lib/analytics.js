// Privacy-friendly, cookieless analytics via Plausible.
//
// No-op unless VITE_PLAUSIBLE_DOMAIN is set at build time, so it stays off until
// you opt in. We load the `script.hash.js` variant because the app uses
// HashRouter on static hosts — that variant counts hash-based route changes as
// pageviews. No cookies, no personal data, GDPR-friendly.
export function initAnalytics() {
  const domain = import.meta.env.VITE_PLAUSIBLE_DOMAIN;
  if (!domain || typeof document === 'undefined') return;
  if (document.querySelector(`script[data-domain="${domain}"]`)) return;
  const src = import.meta.env.VITE_PLAUSIBLE_SRC || 'https://plausible.io/js/script.hash.js';
  const s = document.createElement('script');
  s.defer = true;
  s.src = src;
  s.setAttribute('data-domain', domain);
  document.head.appendChild(s);
}
