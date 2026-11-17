// HTML for the SEO pages (/for/<slug> and /city/<slug>, each also under /hi), their index pages, the guides, /privacy and
// /terms, the 404 and /sitemap.xml.
// Plain server-rendered HTML in the landing page's look, so it's readable without JavaScript. Every piece of text
// written by the AI is escaped here: it's treated as text, never as markup.

import type { Guide, GuideBlock } from './guides';
import { LEGAL, type LegalDoc } from './legal';
import type { ReviewQrCopy, StampMakerCopy } from './tools';
import { gaSnippet } from './ga';

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

export const esc = (s: unknown) =>
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
    footShipping: 'Delivery',
    footContact: 'Contact',
    tool: 'Free stamp card maker',
    reviewTool: 'Google review QR code',
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
    footShipping: 'डिलीवरी',
    footContact: 'संपर्क',
    tool: 'फ़्री स्टैम्प कार्ड मेकर',
    reviewTool: 'Google रिव्यू QR कोड',
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

export const CSS = `
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
@media (max-width:420px){header .wrap{gap:10px}header nav{gap:10px}.logo{font-size:18px}.logo img{width:28px;height:28px}.btn.sm{padding:0 12px;font-size:14px}}
@media (max-width:820px){.hero{grid-template-columns:1fr;padding-top:40px}.grid3{grid-template-columns:1fr}header nav .hide{display:none}.final{padding:30px}}
`;

/** Counts the visit in Admin → Visits (same format as the app's own tracker; no cookies, nothing personal). */
export const BEACON = `<script>(function(){try{if(localStorage.getItem('lp_sa_ignore')==='1'||navigator.webdriver)return;var r=function(){return (crypto.randomUUID?crypto.randomUUID():Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,12))};var d=new Date().toISOString().slice(0,10);var v=(localStorage.getItem('lp_sa_vid')||'').split('|');var ret=!!localStorage.getItem('lp_sa_seen');if(v[0]!==d){v=[d,r()];localStorage.setItem('lp_sa_vid',v.join('|'))}localStorage.setItem('lp_sa_seen','1');var s=sessionStorage.getItem('lp_sa_sid');if(!s){s=r();sessionStorage.setItem('lp_sa_sid',s)}var p=new URLSearchParams(location.search);var w=r();window.__rhv=w;var b=JSON.stringify({t:'view',id:w,ts:new Date().toISOString(),path:location.pathname,title:document.title,host:location.hostname,ref:document.referrer,utmSource:p.get('utm_source')||p.get('ref')||'',utmMedium:p.get('utm_medium')||'',utmCampaign:p.get('utm_campaign')||'',tz:Intl.DateTimeFormat().resolvedOptions().timeZone||'',lang:navigator.language,w:screen.width,vid:v[1],sid:s,ret:ret});if(!(navigator.sendBeacon&&navigator.sendBeacon('/api/collect',new Blob([b],{type:'application/json'}))))fetch('/api/collect',{method:'POST',body:b,headers:{'content-type':'application/json'},keepalive:true})}catch(e){}})();</script>`;

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
${gaSnippet()}
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
  [toolPath(o.lang, 'stamp-card-maker'), t.tool],
  [toolPath(o.lang, 'google-review-qr-code'), t.reviewTool],
  ['/privacy', t.footPrivacy],
  ['/terms', t.footTerms],
  ['/refunds', t.footRefunds],
  ['/shipping', t.footShipping],
  ['/contact', t.footContact],
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
  // Free tools, each in both languages.
  for (const [slug, updated] of [['stamp-card-maker', '2026-11-16'], ['google-review-qr-code', '2026-11-16']])
    for (const lang of ['en', 'hi'] as SeoLang[])
      urls.push(gUrl(toolPath(lang, slug), updated, (['en', 'hi'] as SeoLang[]).map((l) => ({ lang: l, path: toolPath(l, slug) }))));
  // The UAE waitlist page (waitlist.ts).
  urls.push(url('/uae', '2026-11-17'));
  urls.push(url('/privacy', LEGAL.privacy.updated), url('/terms', LEGAL.terms.updated), url('/refunds', LEGAL.refunds.updated), url('/shipping', LEGAL.shipping.updated), url('/contact', LEGAL.contact.updated));
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
  <div class="links">${o.others.map((x) => `<a href="${guidePath(lang, x.slug)}">${esc(x.name)}</a>`).join('')}<a href="${toolPath(lang, 'stamp-card-maker')}">${t.tool} →</a><a href="${toolPath(lang, 'google-review-qr-code')}">${t.reviewTool} →</a><a href="${path(lang)}">${t.forShops} →</a><a href="${path(lang, '', 'city')}">${t.inYourCity} →</a></div>
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
  <p style="margin-top:28px"><a href="${path(lang)}">${t.forShops} →</a> · <a href="${path(lang, '', 'city')}">${t.inYourCity} →</a>${hasTwin ? ` · <a href="${guidePath(other)}" hreflang="${other}">${t.twin}</a>` : ''}</p>
</div></main>`;
  const alternates: { lang: SeoLang; path: string }[] = hasTwin ? [{ lang: 'en', path: guidePath('en') }, { lang: 'hi', path: guidePath('hi') }] : [{ lang, path: here }];
  return shell({ lang, site, path: here, title: `${t.guidesTitle} · Regularhood`, description: t.guidesIntro, alternates, body, noindex: !guides.length });
}

/** /privacy, /terms, /refunds, /shipping and /contact (English only; the text is in legal.ts). */
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

const toolPath = (lang: SeoLang, slug: string) => `${lang === 'hi' ? '/hi' : ''}/tools/${slug}`;

const TOOL_CSS = `
.tool{display:grid;grid-template-columns:1fr 1fr;gap:28px;align-items:start;margin-top:8px}
.tform{display:grid;gap:16px;background:var(--sheet);border:1px solid var(--line);border-radius:20px;padding:24px}
.tform label{display:grid;gap:6px;font-weight:600;font-size:15px;color:var(--ink2)}
.tform input,.tform select{font:inherit;font-size:17px;color:var(--ink);padding:11px 12px;border:1px solid var(--line);border-radius:10px;background:#fff;width:100%}
.tform input:focus,.tform select:focus{outline:2px solid var(--green);outline-offset:1px}
.swatches{display:flex;gap:10px}
.swatches button{width:38px;height:38px;border-radius:50%;border:3px solid #fff;box-shadow:0 0 0 1px var(--line);cursor:pointer;background:var(--c)}
.swatches button[aria-pressed=true]{box-shadow:0 0 0 3px var(--ink)}
.tprev{display:grid;gap:14px;justify-items:center;position:sticky;top:84px}
.ttabs{display:inline-flex;padding:4px;border-radius:999px;background:var(--sheet);border:1px solid var(--line)}
.ttabs button{font:inherit;font-size:14px;font-weight:700;border:0;border-radius:999px;padding:8px 16px;background:transparent;color:var(--ink2);cursor:pointer}
.ttabs button[aria-selected=true]{background:var(--ink);color:var(--paper)}
.tpanel[hidden]{display:none}
.tip{color:var(--soft);font-size:14px;margin:0;text-align:center;max-width:34em}
.scard{--c:#0b7a52;--on:#fff;width:340px;max-width:100%;aspect-ratio:85/55;border-radius:14px;background:var(--c);color:var(--on);padding:16px 18px;display:flex;flex-direction:column;gap:6px;box-shadow:0 24px 48px -24px rgba(15,46,36,.55);font-family:Inter,'Noto Sans Devanagari',system-ui,sans-serif;overflow:hidden}
.scard .k{font:700 10px/1 ui-monospace,Consolas,monospace;letter-spacing:.14em;text-transform:uppercase;opacity:.8}
.scard .s{font:800 20px/1.15 Archivo,'Noto Sans Devanagari',Inter,sans-serif;overflow-wrap:anywhere}
.scard .r{font-size:13px;font-weight:600;opacity:.95}
.scard .dots{display:flex;gap:5px;margin-top:auto}
.scard .dots i{flex:1 1 0;max-width:34px;aspect-ratio:1;border-radius:50%;border:2px dashed currentColor;opacity:.75;display:grid;place-items:center}
.scard .dots i.g{border:0;background:#f0a202;color:#0f2e24;opacity:1}
.scard .dots i.on{border-style:solid;background:currentColor;opacity:.9}
.scard .dots svg{width:58%;height:58%}
.scard .f{display:flex;justify-content:space-between;gap:10px;font-size:11px;opacity:.85}
.scard .f span:first-child{flex:1;border-bottom:1px solid currentColor;opacity:.8}
.pphone{width:300px;max-width:100%;border:10px solid var(--ink);border-radius:34px;background:#ece5dd;padding:18px 12px 22px;display:grid;gap:10px;box-shadow:0 24px 48px -24px rgba(15,46,36,.55)}
.pphone .who{font-size:12px;font-weight:700;color:var(--soft);text-align:center}
.bubble{justify-self:start;max-width:92%;background:#fff;border-radius:4px 14px 14px 14px;padding:10px 12px 8px;font-size:14px;line-height:1.45;color:#111;box-shadow:0 1px 1px rgba(0,0,0,.12)}
.bubble .open{display:block;margin-top:8px;padding-top:8px;border-top:1px solid #e5e5e5;text-align:center;color:#0b7a52;font-weight:700}
.pphone .scard{width:100%;padding:12px 14px}
.pphone .scard .s{font-size:16px}
.sheet{display:none}
dialog.tsheet{border:0;padding:0;border-radius:24px;max-width:460px;width:calc(100% - 32px);background:var(--sheet);color:var(--ink);box-shadow:0 40px 80px -30px rgba(15,46,36,.6)}
dialog.tsheet::backdrop{background:rgba(15,46,36,.55)}
.tsheet .in{display:grid;gap:14px;padding:26px 24px 22px}
.tsheet h2{font-size:24px;margin:0;padding-right:28px}
.tsheet .lead{margin:0;color:var(--ink2)}
.tsheet .x{position:absolute;top:14px;right:14px;width:36px;height:36px;border:0;border-radius:50%;background:var(--paper);font-size:20px;line-height:1;cursor:pointer;color:var(--ink2)}
.tcmp{display:grid;grid-template-columns:1fr 1fr;border:1px solid var(--line);border-radius:14px;overflow:hidden;font-size:14px}
.tcmp b{padding:9px 12px;background:var(--paper);font-size:13px}
.tcmp b:last-of-type{background:var(--mint);color:var(--deep)}
.tcmp span{padding:9px 12px;border-top:1px solid var(--line);color:var(--soft)}
.tcmp span:nth-of-type(even){color:var(--ink);font-weight:600;background:#f6fbf8}
.tsheet .btn{width:100%}
.tsheet .both{margin:0;color:var(--soft);font-size:13px;text-align:center}
.tafter{position:fixed;left:16px;right:16px;bottom:16px;z-index:20;max-width:560px;margin:0 auto;display:flex;flex-wrap:wrap;align-items:center;gap:10px 14px;padding:14px 16px;border-radius:16px;background:var(--ink);color:var(--paper);box-shadow:0 20px 50px -20px rgba(15,46,36,.7)}
.tafter[hidden]{display:none}
.tafter p{margin:0;flex:1 1 240px;font-size:15px}
.tafter a{color:var(--marigold);font-weight:700}
.tafter button{border:0;background:transparent;color:var(--paper);font-size:20px;cursor:pointer;opacity:.8}
@media (max-width:820px){.tool{grid-template-columns:1fr}.tprev{position:static;order:-1}}
@media (max-width:560px){dialog.tsheet{margin:auto auto 0;width:100%;max-width:none;border-radius:24px 24px 0 0}}
@media print{
  @page{size:A4;margin:10mm}
  body>*:not(.sheet){display:none!important}
  .sheet{display:grid!important;grid-template-columns:repeat(2,85mm);grid-auto-rows:55mm;gap:0;justify-content:center}
  .sheet .scard{width:85mm;max-width:none;height:55mm;aspect-ratio:auto;border-radius:0;box-shadow:none;outline:1px dashed #999;padding:4.5mm 5mm;-webkit-print-color-adjust:exact;print-color-adjust:exact}
  .sheet .scard .dots i{max-width:9mm}
}
`;

const js = (v: unknown) => JSON.stringify(v).replace(/</g, '\\u003c');

/** The reward box's gift, drawn rather than an emoji so it looks the same on every phone and printer. */
const GIFT =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="8" width="18" height="4" rx="1"/><path d="M12 8v13M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7M7.5 8a2.5 2.5 0 0 1 0-5C10 3 12 8 12 8s2-5 4.5-5a2.5 2.5 0 0 1 0 5"/></svg>';

/**
 * The stamp card maker (/tools/stamp-card-maker, /hi/tools/stamp-card-maker). Without JavaScript it is a page to read;
 * with it, the card follows the form and prints 10 to an A4 sheet.
 *
 * The visitor is about to run a loyalty card, which is what Regularhood is, so the page offers the same card on
 * customers' phones without ever standing in the way of printing: a "On their phone" preview beside the paper one,
 * one sheet the first time they press Print (their own card, what paper loses, and "Print paper cards" right there),
 * and one line after printing. Every link to sign up carries the card, so the app opens on it.
 * Everything typed stays in the browser until they choose to sign up.
 */
export function renderStampMaker(site: string, lang: SeoLang, c: StampMakerCopy, o: { slug: string; guides: Guide[] }) {
  const t = T[lang];
  const here = toolPath(lang, o.slug);
  const other: SeoLang = lang === 'en' ? 'hi' : 'en';
  const alternates = [
    { lang: 'en' as SeoLang, path: toolPath('en', o.slug) },
    { lang: 'hi' as SeoLang, path: toolPath('hi', o.slug) },
  ];
  const n = 6;
  const fill = (tpl: string, v: Record<string, string | number>) => tpl.replace(/\{(\w+)\}/g, (_, k: string) => String(v[k] ?? ''));
  const rule = (v: number, r: string) => fill(c.card.rule, { n: v, r });
  const dots = (v: number, stamped = 0) =>
    Array.from({ length: v }, (_, i) => (i === v - 1 ? `<i class="g">${GIFT}</i>` : `<i${i < stamped ? ' class="on"' : ''}></i>`)).join('');
  const card = (id: string, stamped = 0) => `<div class="scard" id="${id}">
        <span class="k">${esc(c.card.kicker)}</span>
        <span class="s">${esc(c.defaults.shop)}</span>
        <span class="r">${esc(rule(n, c.defaults.reward))}</span>
        <div class="dots">${dots(n, stamped)}</div>
        <div class="f"><span>${esc(c.card.name)}:</span><span>${esc(c.defaults.contact)}</span></div>
      </div>`;
  const colours = [
    ['#0b7a52', '#fff', 'Green'],
    ['#0f2e24', '#fff', 'Dark green'],
    ['#8b1e3f', '#fff', 'Maroon'],
    ['#1d4e89', '#fff', 'Blue'],
    ['#f0a202', '#0f2e24', 'Marigold'],
  ];
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebApplication',
        name: c.name,
        description: c.description,
        url: `${site}${here}`,
        inLanguage: lang === 'hi' ? 'hi-IN' : 'en-IN',
        applicationCategory: 'BusinessApplication',
        operatingSystem: 'Any',
        offers: { '@type': 'Offer', price: '0', priceCurrency: 'INR' },
        publisher: { '@type': 'Organization', name: 'Regularhood', url: `${site}/` },
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Regularhood', item: `${site}/` },
          { '@type': 'ListItem', position: 2, name: c.name, item: `${site}${here}` },
        ],
      },
      { '@type': 'FAQPage', mainEntity: c.faqs.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })) },
    ],
  };
  const sh = c.sheet;
  // Text the visitor typed is only ever set with textContent. Events go to Admin → Visits on this page's view.
  const script = `<script>(function(){
var f=document.getElementById('tf');if(!f)return;
var C=${js({ rule: c.card.rule, shop: c.defaults.shop, reward: c.defaults.reward, bubble: c.preview.bubble, title: sh.title, lead: sh.lead, mobileLead: sh.mobileLead, print: sh.print, pdf: sh.pdf, gift: GIFT })};
var card=document.getElementById('sc'),mini=document.getElementById('sc2'),sheet=document.getElementById('sheet'),dlg=document.getElementById('tsheet'),after=document.getElementById('tafter');
var small=matchMedia('(max-width:720px)').matches,printed=false;
function q(n){return f.elements[n]}
function fill(t,v){return t.replace(/\\{(\\w+)\\}/g,function(_,k){return v[k]==null?'':v[k]})}
function ev(name){try{var id=window.__rhv;if(!id)return;var b=JSON.stringify({t:'event',id:id,kind:'click',name:name});if(!(navigator.sendBeacon&&navigator.sendBeacon('/api/collect',new Blob([b],{type:'application/json'}))))fetch('/api/collect',{method:'POST',body:b,headers:{'content-type':'application/json'},keepalive:true})}catch(e){}}
function val(){return{v:+q('visits').value,s:q('shop').value.trim()||C.shop,r:q('reward').value.trim()||C.reward,ct:q('contact').value.trim()}}
function paint(el,d,stamped){el.querySelector('.s').textContent=d.s;el.querySelector('.r').textContent=fill(C.rule,{n:d.v,r:d.r});
var box=el.querySelector('.dots');box.textContent='';for(var i=0;i<d.v;i++){var e=document.createElement('i');if(i===d.v-1){e.className='g';e.innerHTML=C.gift}else if(i<stamped)e.className='on';box.appendChild(e)}
el.querySelector('.f span:last-child').textContent=d.ct}
function link(camp){var d=val();return '/app?utm_source=seo&utm_medium=organic&utm_campaign='+camp+'&shop='+encodeURIComponent(d.s)+'&reward='+encodeURIComponent(d.r)+'&visits='+d.v+'#signup'}
function draw(){var d=val();paint(card,d,0);paint(mini,d,d.v-2);
document.getElementById('bub').textContent=fill(C.bubble,{shop:d.s,x:d.v-2,n:d.v,left:2,r:d.r});document.getElementById('who').textContent=d.s;
document.querySelectorAll('[data-camp]').forEach(function(a){a.href=link(a.getAttribute('data-camp'))})}
f.addEventListener('input',draw);
document.querySelectorAll('.swatches button').forEach(function(b){b.addEventListener('click',function(){document.querySelectorAll('.swatches button').forEach(function(x){x.setAttribute('aria-pressed',String(x===b))});[card,mini].forEach(function(el){el.style.setProperty('--c',b.dataset.c);el.style.setProperty('--on',b.dataset.on)})})});
document.querySelectorAll('.ttabs button').forEach(function(b){b.addEventListener('click',function(){var on=b.getAttribute('data-tab');document.querySelectorAll('.ttabs button').forEach(function(x){x.setAttribute('aria-selected',String(x===b))});document.querySelectorAll('.tpanel').forEach(function(p){p.hidden=p.id!=='tp-'+on});ev('tool: preview '+on)})});
function doPrint(){sheet.textContent='';for(var i=0;i<10;i++)sheet.appendChild(card.cloneNode(true)).removeAttribute('id');printed=true;window.print()}
var seen=false;try{seen=sessionStorage.getItem('rh_tool_sheet')==='1'}catch(e){}
document.getElementById('tp').addEventListener('click',function(){
if(seen||!dlg.showModal){ev('tool: print');return doPrint()}
seen=true;try{sessionStorage.setItem('rh_tool_sheet','1')}catch(e){}
var d=val();document.getElementById('sh-t').textContent=fill(C.title,{shop:d.s});document.getElementById('sh-l').textContent=small?C.mobileLead:fill(C.lead,{n:d.v});document.getElementById('sh-p').textContent=small?C.pdf:C.print;
dlg.showModal();ev(small?'tool: sheet shown (phone)':'tool: sheet shown')});
document.getElementById('sh-p').addEventListener('click',function(){dlg.close();ev('tool: sheet → print paper');doPrint()});
document.getElementById('sh-x').addEventListener('click',function(){dlg.close();ev('tool: sheet closed')});
document.getElementById('sh-d').addEventListener('click',function(){ev('tool: sheet → digital card')});
document.querySelectorAll('[data-camp]').forEach(function(a){if(a.id!=='sh-d')a.addEventListener('click',function(){ev('tool: digital card ('+a.getAttribute('data-camp')+')')})});
window.addEventListener('afterprint',function(){if(!printed)return;printed=false;var shown=false;try{shown=sessionStorage.getItem('rh_tool_after')==='1';sessionStorage.setItem('rh_tool_after','1')}catch(e){}if(!shown){after.hidden=false;ev('tool: after-print shown')}});
document.getElementById('ta-x').addEventListener('click',function(){after.hidden=true});
draw()})();</script>`;
  const body = `<style>${TOOL_CSS}</style>
<main>
<div class="wrap" style="padding-top:40px">
  <nav class="crumbs" aria-label="Breadcrumb"><a href="/">Regularhood</a> › ${esc(c.name)}</nav>
  <p class="eyebrow">${esc(c.eyebrow)}</p>
  <h1>${esc(c.h1)}</h1>
  <p class="intro">${esc(c.intro)} <a href="${toolPath(other, o.slug)}" hreflang="${other}">${t.twin}</a></p>
  <div class="tool">
    <form class="tform" id="tf" onsubmit="return false">
      <label>${esc(c.form.shop)}<input name="shop" maxlength="40" value="${esc(c.defaults.shop)}" autocomplete="organization"></label>
      <label>${esc(c.form.reward)}<input name="reward" maxlength="40" value="${esc(c.defaults.reward)}"></label>
      <label>${esc(c.form.visits)}<select name="visits">${[3, 4, 5, 6, 7, 8, 9, 10].map((v) => `<option${v === n ? ' selected' : ''}>${v}</option>`).join('')}</select></label>
      <label>${esc(c.form.contact)}<input name="contact" maxlength="40" value="${esc(c.defaults.contact)}"></label>
      <div><p style="margin:0 0 8px;font-weight:600;font-size:15px;color:var(--ink2)">${esc(c.form.colour)}</p><div class="swatches">${colours
        .map(([bg, on, name], i) => `<button type="button" style="--c:${bg}" data-c="${bg}" data-on="${on}" aria-pressed="${i === 0}" aria-label="${name}"></button>`)
        .join('')}</div></div>
      <button type="button" class="btn" id="tp">${esc(c.form.print)} →</button>
    </form>
    <div class="tprev">
      <div class="ttabs" role="tablist"><button type="button" role="tab" data-tab="paper" aria-selected="true">${esc(c.preview.paper)}</button><button type="button" role="tab" data-tab="phone" aria-selected="false">${esc(c.preview.phone)}</button></div>
      <div class="tpanel" id="tp-paper">${card('sc')}</div>
      <div class="tpanel" id="tp-phone" hidden>
        <div class="pphone">
          <div class="who" id="who">${esc(c.defaults.shop)}</div>
          <div class="bubble"><span id="bub">${esc(fill(c.preview.bubble, { shop: c.defaults.shop, x: n - 2, n, left: 2, r: c.defaults.reward }))}</span><span class="open">${esc(c.preview.open)}</span></div>
          ${card('sc2', n - 2)}
        </div>
        <p class="tip" style="margin-top:12px">${esc(c.preview.note)} <a data-camp="tool-preview" href="${signup(here)}">${esc(c.preview.cta)} →</a></p>
      </div>
      <p class="tip">${esc(c.form.tip)}</p>
    </div>
  </div>
</div>
${block({ h2: c.how.h2, steps: c.how.steps })}
${block({ h2: c.wrong.h2, list: c.wrong.list })}
<section><div class="wrap">
  <div class="final"><div><h2>${esc(c.digital.h2)}</h2>${c.digital.p.map((p) => `<p style="margin-bottom:10px">${esc(p)}</p>`).join('')}</div><a class="btn" data-camp="tool-section" href="${signup(here)}">${esc(c.digital.cta)} →</a></div>
</div></section>
<section><div class="wrap"><div class="article">
  <h2>${t.faq}</h2>
  ${c.faqs.map((f, i) => `<details${i === 0 ? ' open' : ''}><summary>${esc(f.q)}</summary><p>${esc(f.a)}</p></details>`).join('')}
</div></div></section>
<section style="padding-top:0"><div class="wrap">
  <h2 style="font-size:24px">${t.moreGuides}</h2>
  <div class="links">${o.guides.map((x) => `<a href="${guidePath(lang, x.slug)}">${esc(x.name)}</a>`).join('')}<a href="${path(lang)}">${t.forShops} →</a></div>
</div></section>
</main>
<dialog class="tsheet" id="tsheet" aria-labelledby="sh-t"><div class="in">
  <button type="button" class="x" id="sh-x" aria-label="${esc(sh.close)}">×</button>
  <h2 id="sh-t">${esc(fill(sh.title, { shop: c.defaults.shop }))}</h2>
  <p class="lead" id="sh-l">${esc(fill(sh.lead, { n }))}</p>
  <div class="tcmp"><b>${esc(sh.paperH)}</b><b>${esc(sh.phoneH)}</b>${sh.rows.map(([a, b]) => `<span>${esc(a)}</span><span>${esc(b)}</span>`).join('')}</div>
  <a class="btn" id="sh-d" data-camp="tool-print" href="${signup(here)}">${esc(sh.digital)}</a>
  <button type="button" class="btn line" id="sh-p">${esc(sh.print)}</button>
  <p class="both">${esc(sh.both)}</p>
</div></dialog>
<div class="tafter" id="tafter" hidden role="status"><p>${esc(c.after.text)} <a data-camp="tool-after-print" href="${signup(here)}">${esc(c.after.cta)} →</a></p><button type="button" id="ta-x" aria-label="${esc(sh.close)}">×</button></div>
<div class="sheet" id="sheet" aria-hidden="true"></div>
${script}`;
  return shell({ lang, site, path: here, title: c.title, description: c.description, alternates, jsonLd, body });
}

const REVIEW_CSS = `
.rqcard{--c:#0b7a52;--on:#fff;width:300px;max-width:100%;aspect-ratio:105/148;border-radius:16px;background:var(--c);color:var(--on);padding:22px 20px;display:flex;flex-direction:column;align-items:center;text-align:center;gap:10px;box-shadow:0 24px 48px -24px rgba(15,46,36,.55);font-family:Inter,'Noto Sans Devanagari',system-ui,sans-serif;overflow:hidden}
.rqcard .s{font:700 13px/1.2 ui-monospace,Consolas,monospace;letter-spacing:.1em;text-transform:uppercase;opacity:.85;overflow-wrap:anywhere}
.rqcard .h{font:800 22px/1.2 Archivo,'Noto Sans Devanagari',Inter,sans-serif;overflow-wrap:anywhere}
.rqcard .stars{color:#f0a202;font-size:22px;letter-spacing:4px;line-height:1}
.rqcard .qr{margin-top:auto;width:72%;aspect-ratio:1;background:#fff;border-radius:12px;padding:8px;display:grid;place-items:center}
.rqcard .qr img{width:100%;height:100%;display:block}
.rqcard .qr span{color:#5b7066;font-size:12px;line-height:1.35;padding:6px}
.rqcard .sc{font-size:12px;opacity:.85}
.howto{background:var(--paper);border:1px solid var(--line);border-radius:12px;padding:10px 14px;font-size:14px}
.howto summary{font-weight:600}
.howto ol{margin:8px 0 0;padding-left:20px;display:grid;gap:6px;color:var(--ink2)}
.terr{color:#b42318;font-size:14px;font-weight:600;margin:0}
.terr[hidden]{display:none}
.rnudge{width:300px;max-width:100%;display:grid;gap:8px;background:var(--sheet);border:1px solid var(--line);border-left:4px solid var(--marigold);border-radius:14px;padding:14px 16px}
.rnudge b{font-size:16px;line-height:1.3}
.rnudge p{margin:0;color:var(--ink2);font-size:14px}
.rnudge small{color:var(--soft);font-size:12px}
.rnudge a{font-weight:700}
@media print{
  @page{size:A4;margin:8mm}
  body>*:not(.sheet){display:none!important}
  .sheet{display:grid!important;grid-template-columns:repeat(2,96mm);grid-auto-rows:136mm;gap:4mm;justify-content:center;align-content:center}
  .sheet .rqcard{width:96mm;max-width:none;height:136mm;aspect-ratio:auto;border-radius:0;box-shadow:none;outline:1px dashed #999;padding:8mm 7mm;-webkit-print-color-adjust:exact;print-color-adjust:exact}
}
`;

/**
 * The Google review QR maker (/tools/google-review-qr-code, /hi/tools/google-review-qr-code). The QR comes from
 * /api/public/review-qr, which only draws Google review links. Beside the card and after printing, the page says what
 * Pro does better (asking right after the reward), and sign-up carries the shop's name and link.
 */
export function renderReviewQr(site: string, lang: SeoLang, c: ReviewQrCopy, o: { slug: string; guides: Guide[] }) {
  const t = T[lang];
  const here = toolPath(lang, o.slug);
  const other: SeoLang = lang === 'en' ? 'hi' : 'en';
  const alternates = [
    { lang: 'en' as SeoLang, path: toolPath('en', o.slug) },
    { lang: 'hi' as SeoLang, path: toolPath('hi', o.slug) },
  ];
  const colours = [
    ['#0b7a52', '#fff', 'Green'],
    ['#0f2e24', '#fff', 'Dark green'],
    ['#8b1e3f', '#fff', 'Maroon'],
    ['#1d4e89', '#fff', 'Blue'],
    ['#f0a202', '#0f2e24', 'Marigold'],
  ];
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebApplication',
        name: c.name,
        description: c.description,
        url: `${site}${here}`,
        inLanguage: lang === 'hi' ? 'hi-IN' : 'en-IN',
        applicationCategory: 'BusinessApplication',
        operatingSystem: 'Any',
        offers: { '@type': 'Offer', price: '0', priceCurrency: 'INR' },
        publisher: { '@type': 'Organization', name: 'Regularhood', url: `${site}/` },
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Regularhood', item: `${site}/` },
          { '@type': 'ListItem', position: 2, name: c.name, item: `${site}${here}` },
        ],
      },
      { '@type': 'FAQPage', mainEntity: c.faqs.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })) },
    ],
  };
  // Text the visitor typed is only ever set with textContent; the link only ever reaches the QR as a query parameter.
  const script = `<script>(function(){
var f=document.getElementById('rf');if(!f)return;
var C=${js({ shop: c.defaults.shop, headline: c.defaults.headline, empty: c.form.empty })};
var card=document.getElementById('rq'),sheet=document.getElementById('sheet'),after=document.getElementById('tafter'),err=document.getElementById('rerr'),box=card.querySelector('.qr'),timer=0,printed=false,good='';
function q(n){return f.elements[n]}
function ev(name){try{var id=window.__rhv;if(!id)return;var b=JSON.stringify({t:'event',id:id,kind:'click',name:name});if(!(navigator.sendBeacon&&navigator.sendBeacon('/api/collect',new Blob([b],{type:'application/json'}))))fetch('/api/collect',{method:'POST',body:b,headers:{'content-type':'application/json'},keepalive:true})}catch(e){}}
function google(v){v=v.trim();if(!v)return '';try{var u=new URL(/^https?:\\/\\//i.test(v)?v:'https://'+v);var h=u.hostname.toLowerCase();if(u.protocol!=='https:')return null;if(h==='g.page'||h==='maps.app.goo.gl'||h==='goo.gl'||h==='g.co'||/(^|\\.)google\\.[a-z.]+$/.test(h))return u.toString();return null}catch(e){return null}}
function link(camp){var s=q('shop').value.trim();return '/app?utm_source=seo&utm_medium=organic&utm_campaign='+camp+(s?'&shop='+encodeURIComponent(s):'')+(good?'&review='+encodeURIComponent(good):'')+'#signup'}
function qr(){var u=google(q('link').value);err.hidden=u!==null;box.textContent='';
if(!u){good='';var e=document.createElement('span');e.textContent=C.empty;box.appendChild(e);return}
if(u!==good)ev('tool: review QR made');good=u;var i=document.createElement('img');i.alt='QR';i.src='/api/public/review-qr?u='+encodeURIComponent(u);box.appendChild(i)}
function draw(){card.querySelector('.s').textContent=q('shop').value.trim()||C.shop;card.querySelector('.h').textContent=q('headline').value.trim()||C.headline;
clearTimeout(timer);timer=setTimeout(function(){qr();document.querySelectorAll('[data-camp]').forEach(function(a){a.href=link(a.getAttribute('data-camp'))})},250)}
f.addEventListener('input',draw);
document.querySelectorAll('.swatches button').forEach(function(b){b.addEventListener('click',function(){document.querySelectorAll('.swatches button').forEach(function(x){x.setAttribute('aria-pressed',String(x===b))});card.style.setProperty('--c',b.dataset.c);card.style.setProperty('--on',b.dataset.on)})});
document.getElementById('rp').addEventListener('click',function(){if(!good){err.hidden=false;q('link').focus();return}sheet.textContent='';for(var i=0;i<4;i++)sheet.appendChild(card.cloneNode(true)).removeAttribute('id');printed=true;ev('tool: review print');window.print()});
document.querySelectorAll('[data-camp]').forEach(function(a){a.addEventListener('click',function(){ev('tool: review → Pro ('+a.getAttribute('data-camp')+')')})});
window.addEventListener('afterprint',function(){if(!printed)return;printed=false;var shown=false;try{shown=sessionStorage.getItem('rh_review_after')==='1';sessionStorage.setItem('rh_review_after','1')}catch(e){}if(!shown){after.hidden=false;ev('tool: review after-print shown')}});
document.getElementById('ta-x').addEventListener('click',function(){after.hidden=true});
draw()})();</script>`;
  const body = `<style>${TOOL_CSS}${REVIEW_CSS}</style>
<main>
<div class="wrap" style="padding-top:40px">
  <nav class="crumbs" aria-label="Breadcrumb"><a href="/">Regularhood</a> › ${esc(c.name)}</nav>
  <p class="eyebrow">${esc(c.eyebrow)}</p>
  <h1>${esc(c.h1)}</h1>
  <p class="intro">${esc(c.intro)} <a href="${toolPath(other, o.slug)}" hreflang="${other}">${t.twin}</a></p>
  <div class="tool">
    <form class="tform" id="rf" onsubmit="return false">
      <label>${esc(c.form.shop)}<input name="shop" maxlength="40" value="${esc(c.defaults.shop)}" autocomplete="organization"></label>
      <label>${esc(c.form.link)}<input name="link" type="url" inputmode="url" maxlength="500" placeholder="https://g.page/r/…/review" autocomplete="off"><span style="font-weight:400;font-size:13px;color:var(--soft)">${esc(c.form.linkHint)}</span></label>
      <p class="terr" id="rerr" hidden>${esc(c.form.bad)}</p>
      <details class="howto"><summary>${esc(c.form.how)}</summary><ol>${c.form.howSteps.map((s) => `<li>${esc(s)}</li>`).join('')}</ol></details>
      <label>${esc(c.form.headline)}<input name="headline" maxlength="50" value="${esc(c.defaults.headline)}"></label>
      <div><p style="margin:0 0 8px;font-weight:600;font-size:15px;color:var(--ink2)">${esc(c.form.colour)}</p><div class="swatches">${colours
        .map(([bg, on, name], i) => `<button type="button" style="--c:${bg}" data-c="${bg}" data-on="${on}" aria-pressed="${i === 0}" aria-label="${name}"></button>`)
        .join('')}</div></div>
      <button type="button" class="btn" id="rp">${esc(c.form.print)} →</button>
    </form>
    <div class="tprev">
      <div class="rqcard" id="rq">
        <span class="s">${esc(c.defaults.shop)}</span>
        <span class="h">${esc(c.defaults.headline)}</span>
        <span class="stars" aria-hidden="true">★★★★★</span>
        <div class="qr"><span>${esc(c.form.empty)}</span></div>
        <span class="sc">${esc(c.card.scan)}</span>
      </div>
      <p class="tip">${esc(c.form.tip)}</p>
      <div class="rnudge"><b>${esc(c.nudge.h)}</b><p>${esc(c.nudge.p)}</p><a data-camp="review-tool" href="${signup(here)}">${esc(c.nudge.cta)} →</a><small>${esc(c.nudge.note)}</small></div>
    </div>
  </div>
</div>
${block({ h2: c.where.h2, steps: c.where.steps })}
${block({ h2: c.dont.h2, list: c.dont.list })}
<section><div class="wrap"><div class="article">
  <h2>${t.faq}</h2>
  ${c.faqs.map((f, i) => `<details${i === 0 ? ' open' : ''}><summary>${esc(f.q)}</summary><p>${esc(f.a)}</p></details>`).join('')}
</div></div></section>
<section style="padding-top:0"><div class="wrap">
  <h2 style="font-size:24px">${t.moreGuides}</h2>
  <div class="links"><a href="${toolPath(lang, 'stamp-card-maker')}">${t.tool} →</a>${o.guides.map((x) => `<a href="${guidePath(lang, x.slug)}">${esc(x.name)}</a>`).join('')}<a href="${path(lang)}">${t.forShops} →</a></div>
</div></section>
</main>
<div class="tafter" id="tafter" hidden role="status"><p>${esc(c.after.text)} <a data-camp="review-after-print" href="${signup(here)}">${esc(c.after.cta)} →</a></p><button type="button" id="ta-x" aria-label="×">×</button></div>
<div class="sheet" id="sheet" aria-hidden="true"></div>
${script}`;
  return shell({ lang, site, path: here, title: c.title, description: c.description, alternates, jsonLd, body });
}
