// HTML for the SEO pages (/for/<slug> and /city/<slug>, each also under /hi), their index pages, the guides, /privacy and
// /terms, the 404 and /sitemap.xml.
// Plain server-rendered HTML in the landing page's look, so it's readable without JavaScript. Every piece of text
// written by the AI is escaped here: it's treated as text, never as markup.

import type { Guide, GuideBlock } from './guides';
import { LEGAL, type LegalDoc } from './legal';

export type SeoLang = 'en' | 'hi';
export type SeoKind = 'shop' | 'city';

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
  // Pages written before the stamp card have `points` instead of `visits`; they show the usual 5 visits.
  rewards: { name: string; visits?: number; points?: number }[];
  tips: string[];
  faqs: { q: string; a: string }[];
};

type PageRef = { slug: string; lang: SeoLang; kind?: SeoKind; topic: string; title: string; content?: string | null; generated_at?: string | null; published_at?: string | null };

const esc = (s: unknown) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
const inr = (n: number) => n.toLocaleString('en-IN');
const path = (lang: SeoLang, slug = '', kind: SeoKind = 'shop') => `${lang === 'hi' ? '/hi' : ''}/${kind === 'city' ? 'city' : 'for'}${slug ? `/${slug}` : ''}`;
const guidePath = (lang: SeoLang, slug = '') => `${lang === 'hi' ? '/hi' : ''}/guide${slug ? `/${slug}` : ''}`;
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
    stampLine: 'Every visit = 1 stamp',
    stamp: (n: number, of: number) => `Visit ${n} of ${of} ✓`,
    problems: 'Why customers drift away',
    steps: 'How it works at your counter',
    rewards: 'Reward ideas',
    every: (n: number) => `Every ${n} visits`,
    tips: 'Ways to bring them back more often',
    faq: 'Questions',
    ctaTitle: 'Your next regular walks in today.',
    ctaText: 'Set up takes two minutes on the phone you already have. Free to start.',
    others: 'Regularhood for other shops',
    twin: 'हिंदी में पढ़ें',
    hubTitle: 'Loyalty programs for every kind of shop',
    hubIntro: 'Regularhood is a stamp card on the customer’s phone number: every few visits, a free reward. Pick a shop like yours to see how it works there.',
    hubEmpty: 'Pages for each kind of shop are on their way.',
    notFound: 'This page doesn’t exist (yet).',
    footer: 'From first visit to “the usual”.',
    guides: 'Guides',
    guidesTitle: 'Guides for shop owners: loyalty and repeat customers',
    guidesIntro: 'Practical guides on loyalty cards, rewards and bringing customers back, written for small shops in India.',
    updated: 'Updated',
    moreGuides: 'More guides',
    forShops: 'Loyalty for your kind of shop',
    allCities: 'Shops by city',
    cityHubTitle: 'Loyalty programs for shops in your city',
    cityHubIntro: 'Regularhood is a stamp card on the customer’s phone number: every few visits, a free reward. Pick your city to see how shops there can bring customers back.',
    cityHubEmpty: 'Pages for each city are on their way.',
    otherCities: 'Regularhood in other cities',
    inYourCity: 'Loyalty for shops in your city',
    footShops: 'For shops',
    footCities: 'Cities',
    footPrivacy: 'Privacy',
    footTerms: 'Terms',
    footRefunds: 'Refunds',
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
    stampLine: 'हर विज़िट = 1 स्टैम्प',
    stamp: (n: number, of: number) => `विज़िट ${n} / ${of} ✓`,
    problems: 'ग्राहक वापस क्यों नहीं आते',
    steps: 'आपके काउंटर पर ऐसे काम करता है',
    rewards: 'इनाम के आइडिया',
    every: (n: number) => `हर ${n} विज़िट पर`,
    tips: 'ग्राहकों को बार-बार बुलाने के तरीके',
    faq: 'सवाल-जवाब',
    ctaTitle: 'आपका अगला पक्का ग्राहक आज ही आएगा।',
    ctaText: 'आपके अपने फ़ोन पर दो मिनट में सेटअप। शुरू करना मुफ़्त है।',
    others: 'दूसरी दुकानों के लिए Regularhood',
    twin: 'Read in English',
    hubTitle: 'हर तरह की दुकान के लिए लॉयल्टी प्रोग्राम',
    hubIntro: 'Regularhood ग्राहक के फ़ोन नंबर पर स्टैम्प कार्ड है: हर कुछ विज़िट पर एक मुफ़्त इनाम। अपनी जैसी दुकान चुनें और देखें कि वहाँ यह कैसे काम करता है।',
    hubEmpty: 'हर तरह की दुकान के पेज जल्द आ रहे हैं।',
    notFound: 'यह पेज मौजूद नहीं है।',
    footer: 'पहली बार से “रोज़ का ग्राहक” तक।',
    guides: 'गाइड',
    guidesTitle: 'दुकानदारों के लिए गाइड: लॉयल्टी और पक्के ग्राहक',
    guidesIntro: 'लॉयल्टी कार्ड, इनाम और ग्राहकों को वापस बुलाने पर काम की गाइड, भारत की छोटी दुकानों के लिए।',
    updated: 'अपडेट',
    moreGuides: 'और गाइड',
    forShops: 'आपकी तरह की दुकान के लिए लॉयल्टी',
    allCities: 'शहर के हिसाब से',
    cityHubTitle: 'आपके शहर की दुकानों के लिए लॉयल्टी प्रोग्राम',
    cityHubIntro: 'Regularhood ग्राहक के फ़ोन नंबर पर स्टैम्प कार्ड है: हर कुछ विज़िट पर एक मुफ़्त इनाम। अपना शहर चुनें और देखें कि वहाँ की दुकानें ग्राहकों को वापस कैसे बुला सकती हैं।',
    cityHubEmpty: 'हर शहर के पेज जल्द आ रहे हैं।',
    otherCities: 'दूसरे शहरों में Regularhood',
    inYourCity: 'आपके शहर की दुकानों के लिए लॉयल्टी',
    footShops: 'दुकानों के लिए',
    footCities: 'शहर',
    footPrivacy: 'प्राइवेसी',
    footTerms: 'शर्तें',
    footRefunds: 'रिफ़ंड',
  },
};

/** Hindi names for the shop types and cities, by slug, shown on Hindi pages (the queue keeps the English name as the topic). */
const HI_NAMES: Record<SeoKind, Record<string, string>> = {
  shop: {
    'barber-shop': 'नाई की दुकान', 'beauty-parlour': 'ब्यूटी पार्लर', 'book-store': 'किताबों की दुकान', boutique: 'बुटीक', cafe: 'कैफ़े',
    dhaba: 'ढाबा', 'electronics-shop': 'इलेक्ट्रॉनिक्स की दुकान', florist: 'फूलों की दुकान', 'fruit-and-vegetable-shop': 'फल और सब्ज़ी की दुकान',
    gym: 'जिम', 'hardware-store': 'हार्डवेयर की दुकान', 'ice-cream-parlour': 'आइसक्रीम पार्लर', 'juice-bar': 'जूस की दुकान',
    'kirana-store': 'किराना स्टोर', 'laundry-and-dry-cleaning': 'लॉन्ड्री और ड्राई क्लीनिंग', 'meat-and-fish-shop': 'मीट और मछली की दुकान',
    'mobile-repair-shop': 'मोबाइल रिपेयर की दुकान', 'optical-store': 'चश्मे की दुकान', 'pet-shop': 'पेट शॉप', pharmacy: 'मेडिकल स्टोर',
    restaurant: 'रेस्टोरेंट', salon: 'सैलून', spa: 'स्पा', 'stationery-shop': 'स्टेशनरी की दुकान', 'sweet-shop-and-bakery': 'मिठाई की दुकान और बेकरी',
    tailor: 'दर्ज़ी', 'tiffin-service': 'टिफ़िन सर्विस', 'toy-shop': 'खिलौनों की दुकान', 'general-store': 'जनरल स्टोर',
    'dairy-and-milk-shop': 'डेयरी और दूध की दुकान', 'cosmetics-shop': 'कॉस्मेटिक्स की दुकान', 'gift-shop': 'गिफ़्ट शॉप', 'car-wash': 'कार वॉश',
    'bike-service-centre': 'बाइक सर्विस सेंटर', 'pizza-shop': 'पिज़्ज़ा की दुकान', 'street-food-stall': 'स्ट्रीट फ़ूड स्टॉल', 'nail-studio': 'नेल स्टूडियो',
    'clothing-store': 'कपड़ों की दुकान', 'dry-fruits-shop': 'ड्राई फ्रूट्स की दुकान', 'jewellery-shop': 'ज्वेलरी की दुकान', 'footwear-store': 'जूते-चप्पल की दुकान',
  },
  city: {
    jaipur: 'जयपुर', delhi: 'दिल्ली', lucknow: 'लखनऊ', indore: 'इंदौर', ahmedabad: 'अहमदाबाद', mumbai: 'मुंबई', pune: 'पुणे', surat: 'सूरत',
    bhopal: 'भोपाल', patna: 'पटना', kanpur: 'कानपुर', nagpur: 'नागपुर', chandigarh: 'चंडीगढ़', ludhiana: 'लुधियाना', agra: 'आगरा',
    varanasi: 'वाराणसी', hyderabad: 'हैदराबाद', bengaluru: 'बेंगलुरु', chennai: 'चेन्नई', kolkata: 'कोलकाता',
  },
};
/** A page's name in its own language (the English topic when there's no Hindi name yet). */
const label = (p: PageRef) => (p.lang === 'hi' && HI_NAMES[p.kind ?? 'shop'][p.slug]) || p.topic;

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
header nav a{color:var(--ink2);text-decoration:none;white-space:nowrap}
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
.article{max-width:760px}
.article p{margin:0 0 16px;color:var(--ink2)}
.article ul{margin:0;padding-left:22px;display:grid;gap:10px;color:var(--ink2)}
.gsec{padding:28px 0}
.meta{color:var(--soft);font-size:14px;margin:0 0 22px}
.crumbs{font-size:14px;color:var(--soft);margin:0 0 18px}.crumbs a{color:var(--soft)}
.tbl{overflow-x:auto;background:var(--sheet);border:1px solid var(--line);border-radius:14px}
.tbl table{border-collapse:collapse;width:100%;font-size:15px}
.tbl th,.tbl td{text-align:left;padding:12px 14px;border-bottom:1px solid var(--line);vertical-align:top}
.tbl thead th{background:var(--mint)}.tbl tr:last-child th,.tbl tr:last-child td{border-bottom:0}
.steps{list-style:none;padding:0;margin:0;display:grid;gap:14px}
.steps .card{display:grid;grid-template-columns:auto 1fr;gap:4px 14px;align-items:start}.steps .num{margin:0;grid-row:span 2}
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
<meta property="og:site_name" content="Regularhood">
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
<a class="logo" href="/"><img src="/favicon.svg" alt="" width="32" height="32">Regularhood</a>
<nav><a class="hide" href="/">${t.home}</a><a class="hide" href="${path(o.lang)}">${t.all}</a><a class="hide" href="${guidePath(o.lang)}">${t.guides}</a><a href="/app">${t.login}</a><a class="btn sm" href="${signup(o.path)}">${t.start}</a></nav>
</div></header>
${o.body}
<footer><div class="wrap"><span>Regularhood · ${t.footer}</span><span>${[
  ['/', t.home],
  [path(o.lang), t.footShops],
  [path(o.lang, '', 'city'), t.footCities],
  [guidePath(o.lang), t.guides],
  ['/privacy', t.footPrivacy],
  ['/terms', t.footTerms],
  ['/refunds', t.footRefunds],
]
  .map(([href, text]) => `<a href="${href}">${text}</a>`)
  .join(' · ')}</span></div></footer>
${BEACON}
</body>
</html>`;
}

/** One shop-type or city page. `others` are pages of the same kind, `cross` of the other kind (cities on a shop page). */
export function renderPage(row: PageRef, c: SeoContent, o: { site: string; twin?: PageRef; others: PageRef[]; cross?: PageRef[] }) {
  const lang = row.lang;
  const kind = row.kind ?? 'shop';
  const t = T[lang];
  const here = path(lang, row.slug, kind);
  const total = c.billItems.reduce((n, i) => n + i.price, 0);
  const needed = c.rewards[0]?.visits ?? 5;
  const twinPath = o.twin ? path(o.twin.lang, o.twin.slug, kind) : '';
  const alternates = [{ lang, path: here }, ...(o.twin ? [{ lang: o.twin.lang, path: twinPath }] : [])];
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebPage',
        name: c.title,
        description: c.description,
        url: `${o.site}${here}`,
        inLanguage: lang === 'hi' ? 'hi-IN' : 'en-IN',
        isPartOf: { '@type': 'WebSite', name: 'Regularhood', url: `${o.site}/` },
        ...(row.generated_at ? { dateModified: `${row.generated_at.replace(' ', 'T')}Z` } : {}),
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Regularhood', item: `${o.site}/` },
          { '@type': 'ListItem', position: 2, name: kind === 'city' ? t.allCities : t.all, item: `${o.site}${path(lang, '', kind)}` },
          { '@type': 'ListItem', position: 3, name: label(row), item: `${o.site}${here}` },
        ],
      },
      { '@type': 'FAQPage', mainEntity: c.faqs.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })) },
    ],
  };
  const others = o.others.slice(0, 24);
  const cross = (o.cross ?? []).slice(0, 24);
  const linkRow = (title: string, pages: PageRef[], k: SeoKind) =>
    pages.length
      ? `<section style="padding-top:0"><div class="wrap">
  <h2 style="font-size:24px">${title}</h2>
  <div class="links">${pages.map((p) => `<a href="${path(p.lang, p.slug, k)}">${esc(label(p))}</a>`).join('')}</div>
</div></section>`
      : '';

  const body = `<main>
<div class="wrap hero">
  <div>
    <p class="eyebrow">${esc(c.eyebrow)}</p>
    <h1>${esc(c.h1)}</h1>
    <p class="intro">${esc(c.intro)}</p>
    <div class="cta"><a class="btn" href="${signup(here)}">${t.start} →</a><a class="btn line" href="/#how">${t.how}</a></div>
    <ul class="perks">${t.perks.map((p) => `<li>${p}</li>`).join('')}</ul>
    ${o.twin ? `<p style="margin:18px 0 0"><a href="${twinPath}" hreflang="${o.twin.lang}">${t.twin}</a></p>` : ''}
  </div>
  ${
    c.billItems.length
      ? `<div class="receipt" aria-label="${esc(t.bill)}">
    <h3>${esc(c.billShopName || label(row))}</h3>
    <div class="c">${esc(t.bill)} · ${esc(t.stampLine)}</div>
    <hr>
    ${c.billItems.map((i) => `<div class="r"><span>${esc(i.name)}</span><span>₹${inr(i.price)}</span></div>`).join('')}
    <hr>
    <div class="r t"><span>${t.total}</span><span>₹${inr(total)}</span></div>
    <span class="stamp">${esc(t.stamp(Math.max(1, needed - 2), needed))}</span>
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
    .map((r) => `<div class="reward"><strong>${esc(t.every(r.visits ?? 5))}</strong><b>${esc(r.name)}</b></div>`)
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
  kind === 'city'
    ? linkRow(t.forShops, cross, 'shop') + linkRow(t.otherCities, others, 'city')
    : linkRow(t.others, others, 'shop') + linkRow(t.inYourCity, cross, 'city')
}
</main>`;

  return shell({ lang, site: o.site, path: here, title: c.title, description: c.description, alternates, jsonLd, body });
}

/** /for and /hi/for (every kind of shop), or /city and /hi/city (every city). */
export function renderHub(site: string, lang: SeoLang, pages: PageRef[], hasTwin: boolean, kind: SeoKind = 'shop') {
  const t = T[lang];
  const city = kind === 'city';
  const here = path(lang, '', kind);
  const title = city ? t.cityHubTitle : t.hubTitle;
  const intro = city ? t.cityHubIntro : t.hubIntro;
  const items = pages.map((p) => {
    const c = p.content ? (JSON.parse(p.content) as SeoContent) : null;
    return `<a href="${path(lang, p.slug, kind)}"><b>${esc(label(p))}</b><span>${esc(c?.eyebrow ?? '')}</span></a>`;
  });
  const body = `<main><div class="wrap" style="padding:56px 20px">
  <p class="eyebrow">Regularhood</p>
  <h1>${title}</h1>
  <p class="intro">${intro}</p>
  ${items.length ? `<div class="hub">${items.join('')}</div>` : `<p>${city ? t.cityHubEmpty : t.hubEmpty}</p>`}
  <p style="margin-top:28px"><a href="${path(lang, '', city ? 'shop' : 'city')}">${city ? t.forShops : t.inYourCity} →</a> · <a href="${guidePath(lang)}">${t.guides} →</a>${hasTwin ? ` · <a href="${path(lang === 'en' ? 'hi' : 'en', '', kind)}">${t.twin}</a>` : ''}</p>
</div></main>`;
  const alternates: { lang: SeoLang; path: string }[] = hasTwin ? [{ lang: 'en', path: path('en', '', kind) }, { lang: 'hi', path: path('hi', '', kind) }] : [{ lang, path: here }];
  return shell({ lang, site, path: here, title: `${title} · Regularhood`, description: intro, alternates, body, noindex: !items.length });
}

export function render404(site: string, lang: SeoLang, kind: SeoKind = 'shop') {
  const t = T[lang];
  return shell({
    lang,
    site,
    path: path(lang, '', kind),
    title: `${t.notFound} · Regularhood`,
    description: t.hubIntro,
    noindex: true,
    body: `<main><div class="wrap" style="padding:80px 20px"><h1>${t.notFound}</h1><p class="intro"><a href="${path(lang, '', kind)}">${kind === 'city' ? t.allCities : t.all} →</a></p></div></main>`,
  });
}

export function renderSitemap(site: string, pages: PageRef[], guides: Record<SeoLang, Guide[]> = { en: [], hi: [] }) {
  const day = (t?: string | null) => (t ? t.slice(0, 10) : new Date().toISOString().slice(0, 10));
  const key = (p: PageRef) => `${p.kind ?? 'shop'}/${p.slug}`;
  const bySlug = new Map<string, PageRef[]>();
  for (const p of pages) bySlug.set(key(p), [...(bySlug.get(key(p)) ?? []), p]);
  const latest = pages.reduce((m, p) => (day(p.generated_at) > m ? day(p.generated_at) : m), '2026-10-13');
  const url = (loc: string, lastmod: string, alts: PageRef[] = []) =>
    `  <url>\n    <loc>${site}${loc}</loc>\n    <lastmod>${lastmod}</lastmod>\n${
      alts.length > 1
        ? alts.map((a) => `    <xhtml:link rel="alternate" hreflang="${a.lang === 'hi' ? 'hi-IN' : 'en-IN'}" href="${site}${path(a.lang, a.slug, a.kind)}"/>\n`).join('')
        : ''
    }  </url>`;
  const urls = [url('/', latest)];
  for (const kind of ['shop', 'city'] as SeoKind[])
    for (const lang of ['en', 'hi'] as SeoLang[]) if (pages.some((p) => p.lang === lang && (p.kind ?? 'shop') === kind)) urls.push(url(path(lang, '', kind), latest));
  for (const p of pages) urls.push(url(path(p.lang, p.slug, p.kind), day(p.generated_at ?? p.published_at), bySlug.get(key(p))));
  // Hand-written guides, each with its other-language twin.
  const gUrl = (loc: string, lastmod: string, alts: { lang: SeoLang; path: string }[]) =>
    `  <url>\n    <loc>${site}${loc}</loc>\n    <lastmod>${lastmod}</lastmod>\n${alts
      .map((a) => `    <xhtml:link rel="alternate" hreflang="${a.lang === 'hi' ? 'hi-IN' : 'en-IN'}" href="${site}${a.path}"/>\n`)
      .join('')}  </url>`;
  const langs = (['en', 'hi'] as SeoLang[]).filter((l) => guides[l].length);
  for (const lang of langs) {
    const newest = guides[lang].reduce((m, g) => (g.updated > m ? g.updated : m), '');
    urls.push(gUrl(guidePath(lang), newest, langs.length > 1 ? langs.map((l) => ({ lang: l, path: guidePath(l) })) : []));
    for (const g of guides[lang]) {
      const twins = langs.filter((l) => guides[l].some((x) => x.slug === g.slug));
      urls.push(gUrl(guidePath(lang, g.slug), g.updated, twins.length > 1 ? twins.map((l) => ({ lang: l, path: guidePath(l, g.slug) })) : []));
    }
  }
  urls.push(url('/privacy', LEGAL.privacy.updated), url('/terms', LEGAL.terms.updated), url('/refunds', LEGAL.refunds.updated));
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${urls.join('\n')}\n</urlset>\n`;
}

function block(b: GuideBlock) {
  const parts = [`<h2>${esc(b.h2)}</h2>`];
  for (const p of b.p ?? []) parts.push(`<p>${esc(p)}</p>`);
  if (b.list?.length) parts.push(`<ul>${b.list.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>`);
  if (b.steps?.length)
    parts.push(`<ol class="steps">${b.steps.map((x, i) => `<li class="card"><span class="num">${i + 1}</span><h3>${esc(x.title)}</h3><p>${esc(x.text)}</p></li>`).join('')}</ol>`);
  if (b.table)
    parts.push(
      `<div class="tbl"><table><thead><tr>${b.table.head.map((h) => `<th scope="col">${esc(h)}</th>`).join('')}</tr></thead><tbody>${b.table.rows
        .map((r) => `<tr>${r.map((c, i) => (i === 0 ? `<th scope="row">${esc(c)}</th>` : `<td>${esc(c)}</td>`)).join('')}</tr>`)
        .join('')}</tbody></table></div>`,
    );
  return `<section class="gsec"><div class="wrap"><div class="article">${parts.join('\n')}</div></div></section>`;
}

/** One hand-written guide (/guide/<slug>, /hi/guide/<slug>). */
export function renderGuide(site: string, lang: SeoLang, g: Guide, o: { twin?: Guide; others: Guide[] }) {
  const t = T[lang];
  const here = guidePath(lang, g.slug);
  const other: SeoLang = lang === 'en' ? 'hi' : 'en';
  const alternates = [{ lang, path: here }, ...(o.twin ? [{ lang: other, path: guidePath(other, g.slug) }] : [])];
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Article',
        headline: g.h1,
        description: g.description,
        url: `${site}${here}`,
        mainEntityOfPage: `${site}${here}`,
        inLanguage: lang === 'hi' ? 'hi-IN' : 'en-IN',
        image: `${site}/og.png`,
        datePublished: g.updated,
        dateModified: g.updated,
        author: { '@type': 'Organization', name: 'Regularhood', url: `${site}/` },
        publisher: { '@type': 'Organization', name: 'Regularhood', logo: { '@type': 'ImageObject', url: `${site}/icon-512.png` } },
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Regularhood', item: `${site}/` },
          { '@type': 'ListItem', position: 2, name: t.guides, item: `${site}${guidePath(lang)}` },
          { '@type': 'ListItem', position: 3, name: g.name, item: `${site}${here}` },
        ],
      },
      { '@type': 'FAQPage', mainEntity: g.faqs.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })) },
    ],
  };
  const body = `<main>
<div class="wrap" style="padding-top:40px">
  <nav class="crumbs" aria-label="Breadcrumb"><a href="/">Regularhood</a> › <a href="${guidePath(lang)}">${t.guides}</a> › ${esc(g.name)}</nav>
  <div class="article">
    <p class="eyebrow">${esc(g.eyebrow)}</p>
    <h1>${esc(g.h1)}</h1>
    <p class="meta">${t.updated}: <time datetime="${g.updated}">${g.updated}</time>${o.twin ? ` · <a href="${guidePath(other, g.slug)}" hreflang="${other}">${t.twin}</a>` : ''}</p>
    <p class="intro">${esc(g.intro)}</p>
    <div class="cta"><a class="btn" href="${signup(here)}">${t.start} →</a><a class="btn line" href="/#how">${t.how}</a></div>
  </div>
</div>
${g.blocks.map(block).join('\n')}
<section><div class="wrap"><div class="article">
  <h2>${t.faq}</h2>
  ${g.faqs.map((f, i) => `<details${i === 0 ? ' open' : ''}><summary>${esc(f.q)}</summary><p>${esc(f.a)}</p></details>`).join('')}
</div></div></section>
<section><div class="wrap">
  <div class="final"><div><h2>${t.ctaTitle}</h2><p>${t.ctaText}</p></div><a class="btn" href="${signup(here)}">${t.start} →</a></div>
</div></section>
<section style="padding-top:0"><div class="wrap">
  <h2 style="font-size:24px">${t.moreGuides}</h2>
  <div class="links">${o.others.map((x) => `<a href="${guidePath(lang, x.slug)}">${esc(x.name)}</a>`).join('')}<a href="${path(lang)}">${t.forShops} →</a></div>
</div></section>
</main>`;
  return shell({ lang, site, path: here, title: g.title, description: g.description, alternates, jsonLd, body });
}

/** /guide and /hi/guide: every guide in that language. */
export function renderGuideHub(site: string, lang: SeoLang, guides: Guide[], hasTwin: boolean) {
  const t = T[lang];
  const here = guidePath(lang);
  const other: SeoLang = lang === 'en' ? 'hi' : 'en';
  const body = `<main><div class="wrap" style="padding:56px 20px">
  <p class="eyebrow">Regularhood</p>
  <h1>${t.guidesTitle}</h1>
  <p class="intro">${t.guidesIntro}</p>
  <div class="hub">${guides.map((g) => `<a href="${guidePath(lang, g.slug)}"><b>${esc(g.h1)}</b><span>${esc(g.description)}</span></a>`).join('')}</div>
  <p style="margin-top:28px"><a href="${path(lang)}">${t.forShops} →</a>${hasTwin ? ` · <a href="${guidePath(other)}" hreflang="${other}">${t.twin}</a>` : ''}</p>
</div></main>`;
  const alternates: { lang: SeoLang; path: string }[] = hasTwin ? [{ lang: 'en', path: guidePath('en') }, { lang: 'hi', path: guidePath('hi') }] : [{ lang, path: here }];
  return shell({ lang, site, path: here, title: `${t.guidesTitle} · Regularhood`, description: t.guidesIntro, alternates, body, noindex: !guides.length });
}

/** /privacy, /terms and /refunds (English only; the text is in legal.ts). */
export function renderLegal(site: string, doc: LegalDoc, other: LegalDoc) {
  const here = `/${doc.slug}`;
  const body = `<main>
<div class="wrap" style="padding-top:40px">
  <nav class="crumbs" aria-label="Breadcrumb"><a href="/">Regularhood</a> › ${esc(doc.name)}</nav>
  <div class="article">
    <h1>${esc(doc.h1)}</h1>
    <p class="meta">Last updated: <time datetime="${doc.updated}">${doc.updated}</time> · <a href="/${other.slug}">${esc(other.name)}</a></p>
    <p class="intro">${esc(doc.intro)}</p>
  </div>
</div>
${doc.blocks.map(block).join('\n')}
<section></section>
</main>`;
  return shell({ lang: 'en', site, path: here, title: doc.title, description: doc.description, alternates: [{ lang: 'en', path: here }], body });
}
