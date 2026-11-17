// Google Analytics 4 on the server-rendered pages (guides, tools, shop-type and city pages, legal pages), next to the
// site's own tracker (analytics.ts). The homepage and the app (served by Vercel) carry the same tag in web/index.html.
// The measurement id isn't a secret (it's in every page's HTML), so it can live here; GA_MEASUREMENT_ID overrides it,
// and "off" turns it off. Without an id nothing is added to any page.
const DEFAULT_MEASUREMENT_ID = 'G-Y2FJ4XT99F'; // GA4 property "Regularhood", stream "Regularhood Web"

export const gaMeasurementId = () => {
  const id = (process.env.GA_MEASUREMENT_ID?.trim() || DEFAULT_MEASUREMENT_ID).toUpperCase();
  return /^G-[A-Z0-9]{4,20}$/.test(id) ? id : '';
};

// Private pages never load it: the admin, and links that carry a secret in the address (a customer's card, an old bill
// link, a password reset, a partner's dashboard), so those never reach Google. Same list as maskPath in analytics.ts.
const PRIVATE = /^\/(admin|w|c|reset|partner)(\/|$)/;

/** The gtag snippet for <head>, or '' when it's off. */
export function gaSnippet() {
  const id = gaMeasurementId();
  if (!id) return '';
  return `<script>
(function () {
  if (${PRIVATE}.test(location.pathname)) return;
  window.dataLayer = window.dataLayer || [];
  window.gtag = function () { dataLayer.push(arguments); };
  gtag('js', new Date());
  gtag('config', '${id}');
  var s = document.createElement('script');
  s.async = true;
  s.src = 'https://www.googletagmanager.com/gtag/js?id=${id}';
  document.head.appendChild(s);
})();
</script>`;
}
