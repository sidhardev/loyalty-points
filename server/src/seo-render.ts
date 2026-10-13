// HTML for the SEO pages (/for/<slug>, /hi/for/<slug>), their index pages, the 404 and /sitemap.xml.
// Plain server-rendered HTML in the landing page's look, so it's readable without JavaScript. Every piece of text
// written by the AI is escaped here: it's treated as text, never as markup.

export type SeoLang = 'en' | 'hi';

export type SeoContent = {
  title: string;
  description: string;
  eyebrow: string;
  h1: string;
  intro: string;
  problems: { title: string; text: string }[];
  steps: { title: string; text: string }[];
  billShopName: string;
  billItems: { name: string; price: number }[];
  rewards: { name: string; points: number }[];
  tips: string[];
  faqs: { q: string; a: string }[];
};

type PageRef = { slug: string; lang: SeoLang; topic: string; title: string; content?: string | null; generated_at?: string | null; published_at?: string | null };

const esc = (s: unknown) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
const inr = (n: number) => n.toLocaleString('en-IN');
const path = (lang: SeoLang, slug = '') => `${lang === 'hi' ? '/hi' : ''}/for${slug ? `/${slug}` : ''}`;
/** Sign-up link that Admin → Growth counts under "seo". */
const signup = (campaign: string) => `/app?utm_source=seo&utm_medium=organic&utm_campaign=${encodeURIComponent(campaign)}#signup`;

const T = {
  en: {
    home: 'Home',
    all: 'All kinds of shops',
    login: 'Log in',
    start: 'Start free',
    how: 'See how it works',
    perks: ['Free to start', 'No app for customers', 'English & Hindi'],
    bill: 'Example bill',
    total: 'Total',
    points: 'points',
    perHundred: (n: number) => `${n} points on every ₹100`,
    problems: 'Why customers drift away',
    steps: 'How it works at your counter',
    rewards: 'Reward ideas',
    pts: 'pts',
    spend: (r: number) => `after about ₹${inr(r)} of shopping`,
    tips: 'Ways to bring them back more often',
    faq: 'Questions',
    ctaTitle: 'Your next regular walks in today.',
    ctaText: 'Set up takes two minutes on the phone you already have. Free to start.',
    others: 'Habiturn for other shops',
    twin: 'हिंदी में पढ़ें',
    hubTitle: 'Loyalty programs for every kind of shop',
    hubIntro: 'Habiturn gives points on every bill and brings customers back. Pick a shop like yours to see how it works there.',
    hubEmpty: 'Pages for each kind of shop are on their way.',
    notFound: 'This page doesn’t exist (yet).',
    footer: 'From first visit to “the usual”.',
  },
  hi: {
    home: 'होम',
    all: 'सभी तरह की दुकानें',
    login: 'लॉग इन',
    start: 'मुफ़्त शुरू करें',
    how: 'कैसे काम करता है',
    perks: ['शुरू करना मुफ़्त', 'ग्राहकों को ऐप नहीं चाहिए', 'हिंदी और English'],
    bill: 'उदाहरण बिल',
    total: 'कुल',
    points: 'पॉइंट्स',
    perHundred: (n: number) => `हर ₹100 पर ${n} पॉइंट्स`,
    problems: 'ग्राहक वापस क्यों नहीं आते',
    steps: 'आपके काउंटर पर ऐसे काम करता है',
    rewards: 'इनाम के आइडिया',
    pts: 'पॉइंट्स',
    spend: (r: number) => `लगभग ₹${inr(r)} की खरीदारी के बाद`,
    tips: 'ग्राहकों को बार-बार बुलाने के तरीके',
    faq: 'सवाल-जवाब',
    ctaTitle: 'आपका अगला पक्का ग्राहक आज ही आएगा।',
    ctaText: 'आपके अपने फ़ोन पर दो मिनट में सेटअप। शुरू करना मुफ़्त है।',
    others: 'दूसरी दुकानों के लिए Habiturn',
    twin: 'Read in English',
    hubTitle: 'हर तरह की दुकान के लिए लॉयल्टी प्रोग्राम',
    hubIntro: 'Habiturn हर बिल पर पॉइंट्स देता है और ग्राहकों को वापस लाता है। अपनी जैसी दुकान चुनें और देखें कि वहाँ यह कैसे काम करता है।',
    hubEmpty: 'हर तरह की दुकान के पेज जल्द आ रहे हैं।',
    notFound: 'यह पेज मौजूद नहीं है।',
    footer: 'पहली बार से “रोज़ का ग्राहक” तक।',
  },
};

const CSS = `
:root{--paper:#eef2ec;--sheet:#fff;--ink:#0f2e24;--ink2:#3f564c;--soft:#5b7066;--line:#cbd6cd;--green:#0b7a52;--deep:#0a5e40;--mint:#d7ece1;--marigold:#f0a202;--mink:#8a5a00}
*{box-sizing:border-box}html{-webkit-text-size-adjust:100%}
body{margin:0;background:var(--paper);color:var(--ink);font:400 17px/1.6 Inter,system-ui,-apple-system,'Segoe UI',sans-serif}
body.hi{font-family:'Noto Sans Devanagari',Inter,system-ui,sans-serif}
a{color:var(--green)}
.wrap{max-width:1080px;margin:0 auto;padding:0 20px}
header{position:sticky;top:0;z-index:5;background:rgba(238,242,236,.92);backdrop-filter:blur(8px);border-bottom:1px solid var(--line)}
header .wrap{display:flex;align-items:center;gap:18px;height:64px}
.logo{display:flex;align-items:center;gap:10px;font:800 21px/1 Archivo,Inter,sans-serif;color:var(--ink);text-decoration:none;margin-right:auto}
.logo img{width:32px;height:32px}
header nav{display:flex;gap:16px;align-items:center;font-size:15px;font-weight:600}
header nav a{color:var(--ink2);text-decoration:none}
.btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:46px;padding:0 22px;border-radius:12px;background:var(--ink);color:var(--paper)!important;font-weight:700;text-decoration:none;border:2px solid var(--ink)}
.btn.line{background:transparent;color:var(--ink)!important}
.btn.sm{min-height:40px;padding:0 16px;font-size:15px}
.hero{display:grid;grid-template-columns:1.15fr .85fr;gap:48px;align-items:center;padding:64px 20px 56px}
.eyebrow{font:600 13px/1.2 ui-monospace,Consolas,monospace;letter-spacing:.1em;text-transform:uppercase;color:var(--green);margin:0 0 14px}
h1{font:900 clamp(34px,5.2vw,58px)/1.04 Archivo,Inter,sans-serif;letter-spacing:-.02em;margin:0 0 18px}
body.hi h1{font-family:'Noto Sans Devanagari',Archivo,sans-serif;line-height:1.25}
.intro{font-size:19px;color:var(--ink2);margin:0 0 26px;max-width:36em}
.cta{display:flex;flex-wrap:wrap;gap:12px}
.perks{display:flex;flex-wrap:wrap;gap:8px 18px;list-style:none;padding:0;margin:22px 0 0;color:var(--soft);font-size:14px}
.perks li:before{content:"✓ ";color:var(--green);font-weight:700}
.receipt{background:var(--sheet);border-radius:6px;padding:26px 26px 30px;box-shadow:0 30px 60px -30px rgba(15,46,36,.45);font:500 15px/1.5 ui-monospace,Consolas,monospace;transform:rotate(-2deg);max-width:360px;justify-self:center;width:100%}
.receipt h3{font:700 16px/1.3 ui-monospace,Consolas,monospace;text-align:center;letter-spacing:.06em;text-transform:uppercase;margin:0 0 4px}
.receipt .c{text-align:center;color:var(--soft);font-size:13px;margin-bottom:12px}
.receipt .r{display:flex;justify-content:space-between;gap:12px;padding:3px 0}
.receipt hr{border:0;border-top:1px dashed var(--line);margin:10px 0}
.receipt .t{font-weight:700;font-size:17px}
.stamp{display:inline-block;margin-top:16px;padding:6px 14px;border:2px solid var(--marigold);color:var(--mink);border-radius:8px;font-weight:700;transform:rotate(-6deg)}
section{padding:56px 0}
h2{font:800 clamp(26px,3.6vw,38px)/1.15 Archivo,Inter,sans-serif;letter-spacing:-.01em;margin:0 0 26px}
body.hi h2{font-family:'Noto Sans Devanagari',Archivo,sans-serif;line-height:1.35}
.grid3{display:grid;grid-template-columns:repeat(3,1fr);gap:18px}
.card{background:var(--sheet);border:1px solid var(--line);border-radius:18px;padding:22px}
.card h3{margin:0 0 6px;font-size:19px;line-height:1.3}
.card p{margin:0;color:var(--ink2)}
.num{display:inline-grid;place-items:center;width:34px;height:34px;border-radius:50%;background:var(--marigold);color:var(--ink);font-weight:800;margin-bottom:12px}
.rewards{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:14px}
.reward{display:flex;flex-direction:column;gap:4px;background:var(--ink);color:var(--paper);border-radius:18px;padding:20px}
.reward b{font-size:18px}.reward span{color:#cfe3d8;font-size:14px}
.reward strong{font:900 30px/1 Archivo,Inter,sans-serif;color:var(--marigold)}
.tips{list-style:none;padding:0;margin:0;display:grid;gap:12px}
.tips li{background:var(--sheet);border-left:4px solid var(--green);border-radius:10px;padding:14px 18px}
details{background:var(--sheet);border:1px solid var(--line);border-radius:14px;padding:16px 20px;margin-bottom:10px}
summary{cursor:pointer;font-weight:700}
details p{margin:10px 0 0;color:var(--ink2)}
.final{background:var(--green);color:#fff;border-radius:28px;padding:44px;display:flex;flex-wrap:wrap;gap:24px;align-items:center;justify-content:space-between}
.final h2{margin:0 0 8px;color:#fff}.final p{margin:0;color:#e3f2ea}
.final .btn{background:var(--paper);color:var(--ink)!important;border-color:var(--paper)}
.links{display:flex;flex-wrap:wrap;gap:10px}
.links a{display:inline-block;padding:8px 14px;border:1px solid var(--line);border-radius:999px;background:var(--sheet);color:var(--ink2);text-decoration:none;font-weight:600;font-size:15px}
.hub{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:14px}
.hub a{display:block;background:var(--sheet);border:1px solid var(--line);border-radius:16px;padding:18px 20px;color:var(--ink);text-decoration:none}
.hub a b{display:block;font-size:18px}.hub a span{color:var(--soft);font-size:14px}
footer{border-top:1px solid var(--line);padding:30px 0 40px;color:var(--soft);font-size:14px}
footer .wrap{display:flex;flex-wrap:wrap;gap:12px 24px;align-items:center;justify-content:space-between}
@media (max-width:820px){.hero{grid-template-columns:1fr;padding-top:40px}.grid3{grid-template-columns:1fr}header nav .hide{display:none}.final{padding:30px}}
`;

/** Counts the visit in Admin → Visits (same format as the app's own tracker; no cookies, nothing personal). */
const BEACON = `<script>(function(){try{if(localStorage.getItem('lp_sa_ignore')==='1'||navigator.webdriver)return;var r=function(){return (crypto.randomUUID?crypto.randomUUID():Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,12))};var d=new Date().toISOString().slice(0,10);var v=(localStorage.getItem('lp_sa_vid')||'').split('|');var ret=!!localStorage.getItem('lp_sa_seen');if(v[0]!==d){v=[d,r()];localStorage.setItem('lp_sa_vid',v.join('|'))}localStorage.setItem('lp_sa_seen','1');var s=sessionStorage.getItem('lp_sa_sid');if(!s){s=r();sessionStorage.setItem('lp_sa_sid',s)}var p=new URLSearchParams(location.search);var b=JSON.stringify({t:'view',id:r(),ts:new Date().toISOString(),path:location.pathname,title:document.title,host:location.hostname,ref:document.referrer,utmSource:p.get('utm_source')||p.get('ref')||'',utmMedium:p.get('utm_medium')||'',utmCampaign:p.get('utm_campaign')||'',tz:Intl.DateTimeFormat().resolvedOptions().timeZone||'',lang:navigator.language,w:screen.width,vid:v[1],sid:s,ret:ret});if(!(navigator.sendBeacon&&navigator.sendBeacon('/api/collect',new Blob([b],{type:'application/json'}))))fetch('/api/collect',{method:'POST',body:b,headers:{'content-type':'application/json'},keepalive:true})}catch(e){}})();</script>`;

function shell(o: { lang: SeoLang; site: string; path: string; title: string; description: string; alternates?: { lang: SeoLang; path: string }[]; jsonLd?: object; body: string; noindex?: boolean }) {
  const t = T[o.lang];
  const alt = (o.alternates ?? [])
    .map((a) => `<link rel="alternate" hreflang="${a.lang === 'hi' ? 'hi-IN' : 'en-IN'}" href="${o.site}${a.path}">`)
    .concat((o.alternates ?? []).filter((a) => a.lang === 'en').map((a) => `<link rel="alternate" hreflang="x-default" href="${o.site}${a.path}">`))
    .join('\n');
  return `<!doctype html>
<html lang="${o.lang === 'hi' ? 'hi-IN' : 'en-IN'}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(o.title)}</title>
<meta name="description" content="${esc(o.description)}">
${o.noindex ? '<meta name="robots" content="noindex">' : `<link rel="canonical" href="${o.site}${o.path}">`}
${alt}
<meta property="og:type" content="website">
<meta property="og:site_name" content="Habiturn">
<meta property="og:title" content="${esc(o.title)}">
<meta property="og:description" content="${esc(o.description)}">
<meta property="og:url" content="${o.site}${o.path}">
<meta property="og:image" content="${o.site}/og.png">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#eef2ec">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Archivo:wght@700;800;900&family=Inter:wght@400;600;700${o.lang === 'hi' ? '&family=Noto+Sans+Devanagari:wght@400;600;700;800' : ''}&display=swap" rel="stylesheet">
<style>${CSS}</style>
${o.jsonLd ? `<script type="application/ld+json">${JSON.stringify(o.jsonLd).replace(/</g, '\\u003c')}</script>` : ''}
</head>
<body class="${o.lang}">
<header><div class="wrap">
<a class="logo" href="/"><img src="/favicon.svg" alt="" width="32" height="32">Habiturn</a>
<nav><a class="hide" href="/">${t.home}</a><a class="hide" href="${path(o.lang)}">${t.all}</a><a href="/app">${t.login}</a><a class="btn sm" href="${signup(o.path)}">${t.start}</a></nav>
</div></header>
${o.body}
<footer><div class="wrap"><span>Habiturn · ${t.footer}</span><span><a href="/">${t.home}</a> · <a href="${path('en')}">For shops</a> · <a href="${path('hi')}">दुकानों के लिए</a></span></div></footer>
${BEACON}
</body>
</html>`;
}

export function renderPage(row: PageRef, c: SeoContent, o: { site: string; twin?: PageRef; others: PageRef[]; pointsPer100: number }) {
  const lang = row.lang;
  const t = T[lang];
  const here = path(lang, row.slug);
  const total = c.billItems.reduce((n, i) => n + i.price, 0);
  const points = Math.floor((total * o.pointsPer100) / 100);
  const alternates = [{ lang, path: here }, ...(o.twin ? [{ lang: o.twin.lang, path: path(o.twin.lang, o.twin.slug) }] : [])];
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebPage',
        name: c.title,
        description: c.description,
        url: `${o.site}${here}`,
        inLanguage: lang === 'hi' ? 'hi-IN' : 'en-IN',
        isPartOf: { '@type': 'WebSite', name: 'Habiturn', url: `${o.site}/` },
        ...(row.generated_at ? { dateModified: `${row.generated_at.replace(' ', 'T')}Z` } : {}),
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Habiturn', item: `${o.site}/` },
          { '@type': 'ListItem', position: 2, name: t.all, item: `${o.site}${path(lang)}` },
          { '@type': 'ListItem', position: 3, name: row.topic, item: `${o.site}${here}` },
        ],
      },
      { '@type': 'FAQPage', mainEntity: c.faqs.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })) },
    ],
  };
  const others = o.others.slice(0, 24);

  const body = `<main>
<div class="wrap hero">
  <div>
    <p class="eyebrow">${esc(c.eyebrow)}</p>
    <h1>${esc(c.h1)}</h1>
    <p class="intro">${esc(c.intro)}</p>
    <div class="cta"><a class="btn" href="${signup(here)}">${t.start} →</a><a class="btn line" href="/#how">${t.how}</a></div>
    <ul class="perks">${t.perks.map((p) => `<li>${p}</li>`).join('')}</ul>
    ${o.twin ? `<p style="margin:18px 0 0"><a href="${path(o.twin.lang, o.twin.slug)}" hreflang="${o.twin.lang}">${t.twin}</a></p>` : ''}
  </div>
  ${
    c.billItems.length
      ? `<div class="receipt" aria-label="${esc(t.bill)}">
    <h3>${esc(c.billShopName || row.topic)}</h3>
    <div class="c">${esc(t.bill)} · ${esc(t.perHundred(o.pointsPer100))}</div>
    <hr>
    ${c.billItems.map((i) => `<div class="r"><span>${esc(i.name)}</span><span>₹${inr(i.price)}</span></div>`).join('')}
    <hr>
    <div class="r t"><span>${t.total}</span><span>₹${inr(total)}</span></div>
    <span class="stamp">+${inr(points)} ${t.points}</span>
  </div>`
      : ''
  }
</div>

<section><div class="wrap">
  <h2>${t.problems}</h2>
  <div class="grid3">${c.problems.map((p) => `<div class="card"><h3>${esc(p.title)}</h3><p>${esc(p.text)}</p></div>`).join('')}</div>
</div></section>

<section><div class="wrap">
  <h2>${t.steps}</h2>
  <div class="grid3">${c.steps.map((s, i) => `<div class="card"><span class="num">${i + 1}</span><h3>${esc(s.title)}</h3><p>${esc(s.text)}</p></div>`).join('')}</div>
</div></section>

${
  c.rewards.length
    ? `<section><div class="wrap">
  <h2>${t.rewards}</h2>
  <div class="rewards">${c.rewards
    .map((r) => `<div class="reward"><strong>${inr(r.points)} ${t.pts}</strong><b>${esc(r.name)}</b><span>${esc(t.spend(Math.round((r.points * 100) / o.pointsPer100)))}</span></div>`)
    .join('')}</div>
</div></section>`
    : ''
}

${
  c.tips.length
    ? `<section><div class="wrap">
  <h2>${t.tips}</h2>
  <ul class="tips">${c.tips.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
</div></section>`
    : ''
}

<section><div class="wrap">
  <h2>${t.faq}</h2>
  ${c.faqs.map((f, i) => `<details${i === 0 ? ' open' : ''}><summary>${esc(f.q)}</summary><p>${esc(f.a)}</p></details>`).join('')}
</div></section>

<section><div class="wrap">
  <div class="final"><div><h2>${t.ctaTitle}</h2><p>${t.ctaText}</p></div><a class="btn" href="${signup(here)}">${t.start} →</a></div>
</div></section>

${
  others.length
    ? `<section style="padding-top:0"><div class="wrap">
  <h2 style="font-size:24px">${t.others}</h2>
  <div class="links">${others.map((p) => `<a href="${path(p.lang, p.slug)}">${esc(p.topic)}</a>`).join('')}</div>
</div></section>`
    : ''
}
</main>`;

  return shell({ lang, site: o.site, path: here, title: c.title, description: c.description, alternates, jsonLd, body });
}

export function renderHub(site: string, lang: SeoLang, pages: PageRef[], hasTwin: boolean) {
  const t = T[lang];
  const here = path(lang);
  const items = pages.map((p) => {
    const c = p.content ? (JSON.parse(p.content) as SeoContent) : null;
    return `<a href="${path(lang, p.slug)}"><b>${esc(p.topic)}</b><span>${esc(c?.eyebrow ?? '')}</span></a>`;
  });
  const body = `<main><div class="wrap" style="padding:56px 20px">
  <p class="eyebrow">Habiturn</p>
  <h1>${t.hubTitle}</h1>
  <p class="intro">${t.hubIntro}</p>
  ${items.length ? `<div class="hub">${items.join('')}</div>` : `<p>${t.hubEmpty}</p>`}
  ${hasTwin ? `<p style="margin-top:28px"><a href="${path(lang === 'en' ? 'hi' : 'en')}">${t.twin}</a></p>` : ''}
</div></main>`;
  const alternates: { lang: SeoLang; path: string }[] = hasTwin ? [{ lang: 'en', path: path('en') }, { lang: 'hi', path: path('hi') }] : [{ lang, path: here }];
  return shell({ lang, site, path: here, title: `${t.hubTitle} · Habiturn`, description: t.hubIntro, alternates, body, noindex: !items.length });
}

export function render404(site: string, lang: SeoLang) {
  const t = T[lang];
  return shell({
    lang,
    site,
    path: path(lang),
    title: `${t.notFound} · Habiturn`,
    description: t.hubIntro,
    noindex: true,
    body: `<main><div class="wrap" style="padding:80px 20px"><h1>${t.notFound}</h1><p class="intro"><a href="${path(lang)}">${t.all} →</a></p></div></main>`,
  });
}

export function renderSitemap(site: string, pages: PageRef[]) {
  const day = (t?: string | null) => (t ? t.slice(0, 10) : new Date().toISOString().slice(0, 10));
  const bySlug = new Map<string, PageRef[]>();
  for (const p of pages) bySlug.set(p.slug, [...(bySlug.get(p.slug) ?? []), p]);
  const latest = pages.reduce((m, p) => (day(p.generated_at) > m ? day(p.generated_at) : m), '2026-10-13');
  const url = (loc: string, lastmod: string, alts: PageRef[] = []) =>
    `  <url>\n    <loc>${site}${loc}</loc>\n    <lastmod>${lastmod}</lastmod>\n${
      alts.length > 1
        ? alts.map((a) => `    <xhtml:link rel="alternate" hreflang="${a.lang === 'hi' ? 'hi-IN' : 'en-IN'}" href="${site}${path(a.lang, a.slug)}"/>\n`).join('')
        : ''
    }  </url>`;
  const urls = [url('/', latest)];
  if (pages.some((p) => p.lang === 'en')) urls.push(url(path('en'), latest));
  if (pages.some((p) => p.lang === 'hi')) urls.push(url(path('hi'), latest));
  for (const p of pages) urls.push(url(path(p.lang, p.slug), day(p.generated_at ?? p.published_at), bySlug.get(p.slug)));
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${urls.join('\n')}\n</urlset>\n`;
}
