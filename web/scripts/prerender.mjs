// After `vite build`: writes the homepage as finished HTML (dist/index.html) so search engines and link previews read
// the whole page without running JavaScript, and keeps the empty app page as dist/shell.html for every other path
// (shop app, customer cards), marked noindex. Also adds the homepage's canonical URL and structured data.
import { readFileSync, rmSync, writeFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';

const SITE = 'https://habiturn.sidhar.me';
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
const { renderHome, FAQ } = await import(pathToFileURL(ssr + 'prerender.js').href);

// Personal and private pages stay out of search results (robots.txt lets crawlers in so they can see this).
// They also keep a short tab title.
writeFileSync(
  dist + 'shell.html',
  shell
    .replace('<meta charset="UTF-8" />', '$&\n    <meta name="robots" content="noindex" />')
    .replace(/<title>[^<]*<\/title>/, '<title>Habiturn</title>'),
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
    { '@type': 'Organization', '@id': `${SITE}/#org`, name: 'Habiturn', url: `${SITE}/`, logo: `${SITE}/icon-512.png` },
    { '@type': 'WebSite', '@id': `${SITE}/#site`, name: 'Habiturn', url: `${SITE}/`, inLanguage: 'en-IN', publisher: { '@id': `${SITE}/#org` } },
    {
      '@type': 'SoftwareApplication',
      name: 'Habiturn',
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

const head = [
  `<link rel="canonical" href="${SITE}/" />`,
  `<meta property="og:url" content="${SITE}/" />`,
  ...[...css].filter((f) => !shell.includes(f)).map((f) => `<link rel="stylesheet" href="/${f}" />`),
  ...[...files].filter((f) => !shell.includes(f)).map((f) => `<link rel="modulepreload" href="/${f}" />`),
  `<script type="application/ld+json">${JSON.stringify(data).replace(/</g, '\u003c')}</script>`,
].join('\n    ');

const body = await renderHome();
const home = shell.replace('</head>', `    ${head}\n  </head>`).replace('<div id="root"></div>', () => `<div id="root">${body}</div>`);
if (home === shell || !body.includes('<h1')) throw new Error('prerender: the homepage did not render');
writeFileSync(dist + 'index.html', home);

rmSync(dist + '.vite', { recursive: true, force: true });
rmSync(ssr, { recursive: true, force: true });
console.log(`prerender: homepage ${(home.length / 1024).toFixed(0)} kB, shell.html for every other page`);
