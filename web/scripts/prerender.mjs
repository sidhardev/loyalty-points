// After `vite build`: writes the homepage as finished HTML (dist/index.html) so search engines and link previews read
// the whole page without running JavaScript, and keeps the empty app page as dist/shell.html for every other path
// (shop app, customer cards), marked noindex. Also adds the homepage's canonical URL and structured data.
import { readFileSync, rmSync, writeFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';

const SITE = 'https://www.regularhood.in';
const dist = fileURLToPath(new URL('../dist/', import.meta.url));
const ssr = fileURLToPath(new URL('../dist-ssr/', import.meta.url));

const shell = readFileSync(dist + 'index.html', 'utf8');
const manifest = JSON.parse(readFileSync(dist + '.vite/manifest.json', 'utf8'));
// A few app modules touch browser globals when they load; give them harmless stand-ins.
const storage = { getItem: () => null, setItem() {}, removeItem() {} };
Object.assign(globalThis, {
  window: globalThis,
  addEventListener() {},
  removeEventListener() {},
  localStorage: storage,
  sessionStorage: storage,
  matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }),
  location: { pathname: '/', hash: '', search: '', origin: SITE, href: `${SITE}/` },
});
const { renderHome, FAQ, FONTS } = await import(pathToFileURL(ssr + 'prerender.js').href);

// Personal and private pages stay out of search results (robots.txt lets crawlers in so they can see this).
// They also keep a short tab title.
writeFileSync(
  dist + 'shell.html',
  shell
    .replace('<meta charset="UTF-8" />', '$&\n    <meta name="robots" content="noindex" />')
    .replace(/<title>[^<]*<\/title>/, '<title>Regularhood</title>'),
);

// The homepage's lazy-loaded code and stylesheet, so it's styled on first paint.
const files = new Set();
const css = new Set();
(function collect(key) {
  const chunk = manifest[key];
  if (!chunk || files.has(chunk.file)) return;
  files.add(chunk.file);
  chunk.css?.forEach((f) => css.add(f));
  chunk.imports?.forEach(collect);
})('src/pages/Landing.tsx');
if (!files.size) throw new Error('prerender: the homepage chunk (src/pages/Landing.tsx) is missing from the build manifest');

const description = shell.match(/<meta name="description" content="([^"]*)"/)[1];
const data = {
  '@context': 'https://schema.org',
  '@graph': [
    { '@type': 'Organization', '@id': `${SITE}/#org`, name: 'Regularhood', url: `${SITE}/`, logo: `${SITE}/icon-512.png` },
    { '@type': 'WebSite', '@id': `${SITE}/#site`, name: 'Regularhood', url: `${SITE}/`, inLanguage: 'en-IN', publisher: { '@id': `${SITE}/#org` } },
    {
      '@type': 'SoftwareApplication',
      name: 'Regularhood',
      url: `${SITE}/`,
      image: `${SITE}/og.png`,
      description,
      applicationCategory: 'BusinessApplication',
      operatingSystem: 'Web, Android, iOS',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'INR' },
      publisher: { '@id': `${SITE}/#org` },
    },
    {
      '@type': 'FAQPage',
      mainEntity: FAQ.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })),
    },
  ],
};

// Nothing on the homepage waits for another request before it paints (PageSpeed's render-blocking requests):
// - The app's stylesheet and the homepage's own are written into the page, in the order the app would load them.
// - The homepage's stylesheet link stays, disabled (browsers don't download it), so loading the homepage's code
//   sees it's there and doesn't fetch it again.
// - The homepage is set in Archivo only: its font stylesheet loads without blocking (the text shows in a fallback
//   font until it arrives, as with font-display: swap), and the app's Inter isn't loaded at all.
const appCss = shell.match(/<link rel="stylesheet" crossorigin href="\/(assets\/[^"]+\.css)">/);
const inter = shell.match(/<link href="https:\/\/fonts\.googleapis\.com\/css2\?family=Inter[^"]*" rel="stylesheet" \/>/);
if (!appCss || !inter) throw new Error('prerender: the app stylesheet or the Inter font link is missing from index.html');
const pageCss = [...css].filter((f) => !shell.includes(f));
const inline = [appCss[1], ...pageCss].map((f) => readFileSync(dist + f, 'utf8').trim());
if (inline.some((c) => /<\/style/i.test(c))) throw new Error('prerender: a stylesheet contains "</style"');
const styled = shell
  .replace(inter[0], () =>
    [
      `<link rel="preload" as="style" href="${FONTS}" onload="this.onload=null;this.rel='stylesheet'" />`,
      `<noscript><link rel="stylesheet" href="${FONTS}" /></noscript>`,
    ].join('\n    '),
  )
  .replace(appCss[0], () => inline.map((c) => `<style>${c}</style>`).join('\n    '));

const head = [
  `<link rel="canonical" href="${SITE}/" />`,
  `<meta property="og:url" content="${SITE}/" />`,
  ...pageCss.map((f) => `<link rel="stylesheet" href="/${f}" disabled />`),
  ...[...files].filter((f) => !shell.includes(f)).map((f) => `<link rel="modulepreload" href="/${f}" />`),
  `<script type="application/ld+json">${JSON.stringify(data).replace(/</g, '\u003c')}</script>`,
].join('\n    ');

const body = await renderHome();
const home = styled.replace('</head>', `    ${head}\n  </head>`).replace('<div id="root"></div>', () => `<div id="root">${body}</div>`);
if (home === shell || !body.includes('<h1')) throw new Error('prerender: the homepage did not render');
writeFileSync(dist + 'index.html', home);

rmSync(dist + '.vite', { recursive: true, force: true });
rmSync(ssr, { recursive: true, force: true });
console.log(`prerender: homepage ${(home.length / 1024).toFixed(0)} kB, shell.html for every other page`);
