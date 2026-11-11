import { CATEGORIES, type CategoryKey, type PushroSite } from './pushro';

// The public website of Pushro Digital Hub, served at pushro.regularhood.in (see main.ts). Everything on it comes from
// the details the owner fills in under Studio → Meri Website (pushro.ts); a field left empty hides its part of the page,
// so the site never shows a made-up phone number, address or offer.

export const PUSHRO_ORIGIN = 'https://pushro.regularhood.in';

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

// 24×24 line icons, stroke = currentColor.
const ICON: Record<CategoryKey | 'call' | 'wa' | 'pin' | 'clock' | 'star' | 'insta' | 'gift' | 'arrow' | 'bolt' | 'shield' | 'spark', string> = {
  covers: '<rect x="6" y="2.5" width="12" height="19" rx="3"/><rect x="8.5" y="5" width="4" height="4" rx="1.2"/>',
  glass: '<rect x="5" y="3" width="11" height="18" rx="2.5"/><path d="M9 3.5 19 6v14l-3 1"/><path d="M7.5 9l5-4M7.5 14l7-6"/>',
  chargers: '<rect x="6" y="7" width="12" height="11" rx="2.5"/><path d="M9.5 3v4M14.5 3v4M12.8 9.5 10.5 13h3l-2.3 3.5"/><path d="M12 18v3"/>',
  cables: '<path d="M7 3v5a3 3 0 0 0 3 3h4a3 3 0 0 1 3 3v7"/><rect x="5" y="2" width="4" height="4" rx="1"/><rect x="15" y="18" width="4" height="4" rx="1"/>',
  earbuds: '<path d="M7 4a3.5 3.5 0 0 1 3.5 3.5V17a1.5 1.5 0 0 1-3 0v-6A3.5 3.5 0 0 1 7 4z"/><path d="M17 4a3.5 3.5 0 0 0-3.5 3.5V17a1.5 1.5 0 0 0 3 0v-6A3.5 3.5 0 0 0 17 4z"/>',
  headphones: '<path d="M4 15v-3a8 8 0 0 1 16 0v3"/><rect x="3" y="14" width="5" height="7" rx="2"/><rect x="16" y="14" width="5" height="7" rx="2"/>',
  powerbanks: '<rect x="6" y="2.5" width="12" height="19" rx="3"/><path d="M12.8 7 10 12h4l-2.8 5"/>',
  watches: '<rect x="6" y="6" width="12" height="12" rx="3.5"/><path d="M9 6V2.5h6V6M9 18v3.5h6V18M12 9.5V12l1.8 1.2"/>',
  speakers: '<rect x="3" y="7" width="18" height="10" rx="5"/><circle cx="8.5" cy="12" r="2"/><circle cx="15.5" cy="12" r="2"/>',
  holders: '<rect x="7" y="2.5" width="10" height="13" rx="2"/><path d="M5 7v5M19 7v5M12 15.5V20M8 21.5h8"/>',
  memory: '<path d="M7 2.5h7l4 4v15H7z"/><path d="M10 6v3M12.5 6v3M15 7.5V9"/><rect x="9.5" y="12" width="6" height="6" rx="1"/>',
  gadgets: '<path d="M12 3l2.4 5.2L20 9l-4 4 1 5.6-5-2.8-5 2.8 1-5.6-4-4 5.6-.8z"/>',
  call: '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z"/>',
  wa: '<path d="M3.5 20.5l1.3-4.2A8.5 8.5 0 1 1 8 19.4z"/><path d="M9 8.5c0 3.5 3 6.5 6.5 6.5l1-1.6-2-1-1 .9a5 5 0 0 1-2.8-2.8l.9-1-1-2z"/>',
  pin: '<path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  star: '<path d="M12 3l2.6 5.6 6 .7-4.5 4.1 1.2 6L12 16.4 6.7 19.4l1.2-6L3.4 9.3l6-.7z"/>',
  insta: '<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.3" cy="6.7" r=".8"/>',
  gift: '<rect x="3.5" y="8" width="17" height="4" rx="1"/><path d="M5 12v8.5h14V12M12 8v12.5M12 8c-1-3-5-4-5-1.5S10 8 12 8zm0 0c1-3 5-4 5-1.5S14 8 12 8z"/>',
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  bolt: '<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>',
  shield: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M8.5 12l2.5 2.5 4.5-5"/>',
  spark: '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M5.6 18.4l2.8-2.8M15.6 8.4l2.8-2.8"/>',
};
const icon = (k: keyof typeof ICON, size = 24) =>
  `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON[k]}</svg>`;

const CAT_LINE: Record<CategoryKey, string> = {
  covers: 'Har model ka cover, har style',
  glass: 'Screen ki pakki suraksha',
  chargers: 'Fast charging, safe charging',
  cables: 'Type-C, Lightning, sab',
  earbuds: 'Wireless sound, all-day',
  headphones: 'Bass jo mehsoos ho',
  powerbanks: 'Battery kabhi khatam nahi',
  watches: 'Fitness + style, ek saath',
  speakers: 'Party kahin bhi',
  holders: 'Car aur bike ke liye',
  memory: 'Jagah kabhi kam nahi',
  gadgets: 'Aur bhi bahut kuch',
};

const waNumber = (n: string) => {
  const d = n.replace(/\D/g, '');
  return d.length === 10 ? `91${d}` : d;
};

export function renderPushroSite(site: PushroSite, origin = PUSHRO_ORIGIN) {
  const name = esc(site.name);
  const city = site.city ? esc(site.city) : '';
  const title = `${site.name}${site.city ? ` – ${site.city}` : ''} | Mobile Accessories Store`;
  const description = `${site.name}${site.city ? `, ${site.city}` : ''}: ${site.categories.slice(0, 6).map((c) => CATEGORIES[c].toLowerCase()).join(', ')} aur bahut kuch. ${site.tagline}`.slice(0, 300);
  const wa = site.whatsapp || site.phone;
  const waLink = wa ? `https://wa.me/${waNumber(wa)}?text=${encodeURIComponent(`Hi ${site.name}, mujhe ek accessory ke baare mein poochna hai`)}` : '';
  const telLink = site.phone ? `tel:${site.phone.startsWith('+') ? site.phone : `+${waNumber(site.phone)}`}` : '';
  const mapsLink = site.mapsLink || (site.address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${site.name} ${site.address}`)}` : '');
  const mapEmbed = site.address ? `https://www.google.com/maps?q=${encodeURIComponent(`${site.name}, ${site.address}`)}&output=embed` : '';

  const ld: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'ElectronicsStore',
    name: site.name,
    description: site.about || site.tagline,
    url: origin,
  };
  if (site.phone) ld.telephone = site.phone;
  if (site.address) ld.address = { '@type': 'PostalAddress', streetAddress: site.address, addressLocality: site.city || undefined, addressCountry: 'IN' };
  if (site.mapsLink) ld.hasMap = site.mapsLink;
  if (site.instagram) ld.sameAs = [`https://www.instagram.com/${site.instagram}/`];

  const primaryCta = waLink
    ? `<a class="btn btn-primary" href="${esc(waLink)}" target="_blank" rel="noopener">${icon('wa', 20)} WhatsApp pe poochho</a>`
    : `<a class="btn btn-primary" href="#categories">${icon('spark', 20)} Collection dekho</a>`;
  const secondaryCta = mapsLink
    ? `<a class="btn btn-ghost" href="${esc(mapsLink)}" target="_blank" rel="noopener">${icon('pin', 20)} Shop ka rasta</a>`
    : telLink
      ? `<a class="btn btn-ghost" href="${esc(telLink)}">${icon('call', 20)} Call karo</a>`
      : '';

  const marquee = site.categories.map((c) => `<span>${esc(CATEGORIES[c])}</span><i>✦</i>`).join('');

  const cats = site.categories
    .map(
      (c, i) => `<article class="cat reveal" style="--d:${(i % 4) * 70}ms">
        <div class="cat-ic">${icon(c, 30)}</div>
        <h3>${esc(CATEGORIES[c])}</h3>
        <p>${esc(CAT_LINE[c])}</p>
        ${waLink ? `<a href="${esc(`https://wa.me/${waNumber(wa)}?text=${encodeURIComponent(`Hi, ${CATEGORIES[c]} available hai? Price batao`)}`)}" target="_blank" rel="noopener" class="cat-link">Price poochho ${icon('arrow', 16)}</a>` : ''}
      </article>`,
    )
    .join('');

  const offers = site.offers
    .map(
      (o, i) => `<article class="offer reveal" style="--d:${i * 80}ms">
        <div class="offer-tag">${icon('bolt', 16)} Offer</div>
        <h3>${esc(o.title)}</h3>
        ${o.price ? `<div class="offer-price">${esc(o.price)}</div>` : ''}
        ${o.note ? `<p>${esc(o.note)}</p>` : ''}
        ${waLink ? `<a class="btn btn-small" href="${esc(`https://wa.me/${waNumber(wa)}?text=${encodeURIComponent(`Hi, "${o.title}" offer ke baare mein batao`)}`)}" target="_blank" rel="noopener">Book karo ${icon('arrow', 16)}</a>` : ''}
      </article>`,
    )
    .join('');

  const highlights = site.highlights.map((h, i) => `<li class="reveal" style="--d:${i * 60}ms">${icon('shield', 22)}<span>${esc(h)}</span></li>`).join('');

  const contactRows = [
    site.address && `<li>${icon('pin')}<div><b>Address</b><span>${esc(site.address)}</span></div></li>`,
    site.hours && `<li>${icon('clock')}<div><b>Timing</b><span>${esc(site.hours)}</span></div></li>`,
    site.phone && `<li>${icon('call')}<div><b>Phone</b><a href="${esc(telLink)}">${esc(site.phone)}</a></div></li>`,
    site.instagram && `<li>${icon('insta')}<div><b>Instagram</b><a href="https://www.instagram.com/${esc(site.instagram)}/" target="_blank" rel="noopener">@${esc(site.instagram)}</a></div></li>`,
  ]
    .filter(Boolean)
    .join('');

  const orbit = (['earbuds', 'watches', 'chargers', 'headphones', 'powerbanks', 'speakers'] as CategoryKey[])
    .map((c, i) => `<div class="orb" style="--i:${i}"><div class="orb-in">${icon(c, 28)}</div></div>`)
    .join('');

  return `<!doctype html>
<html lang="hi">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}" />
<link rel="canonical" href="${origin}/" />
<meta name="theme-color" content="#05050a" />
<meta property="og:type" content="website" />
<meta property="og:title" content="${esc(title)}" />
<meta property="og:description" content="${esc(description)}" />
<meta property="og:url" content="${origin}/" />
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' rx='16' fill='%2305050a'/%3E%3Cpath d='M22 14h14a12 12 0 0 1 0 24h-6v12h-8z' fill='%2322d3ee'/%3E%3C/svg%3E" />
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />
<script type="application/ld+json">${JSON.stringify(ld).replace(/</g, '\\u003c')}</script>
<style>
:root{--bg:#05050a;--bg2:#0b0b14;--card:rgba(255,255,255,.04);--line:rgba(255,255,255,.09);--text:#f5f6fb;--muted:#9097b0;--c1:#22d3ee;--c2:#818cf8;--c3:#f472b6}
*{box-sizing:border-box}html{scroll-behavior:smooth}
body{margin:0;background:var(--bg);color:var(--text);font-family:Poppins,system-ui,sans-serif;overflow-x:hidden;-webkit-font-smoothing:antialiased}
a{color:inherit;text-decoration:none}
.wrap{max-width:1180px;margin:0 auto;padding:0 20px}
.grad{background:linear-gradient(100deg,var(--c1),var(--c2) 45%,var(--c3));-webkit-background-clip:text;background-clip:text;color:transparent}
.btn{display:inline-flex;align-items:center;gap:10px;padding:15px 24px;border-radius:999px;font-weight:700;font-size:15px;transition:transform .2s,box-shadow .2s,background .2s;white-space:nowrap}
.btn:hover{transform:translateY(-2px)}
.btn-primary{background:linear-gradient(100deg,var(--c1),var(--c2));color:#05050a;box-shadow:0 10px 40px -10px rgba(34,211,238,.6)}
.btn-ghost{border:1px solid var(--line);background:rgba(255,255,255,.04);backdrop-filter:blur(10px)}
.btn-small{padding:10px 16px;font-size:13px;border:1px solid var(--line);background:rgba(255,255,255,.05)}
.announce{background:linear-gradient(90deg,var(--c1),var(--c2),var(--c3));color:#05050a;text-align:center;font-weight:700;font-size:14px;padding:9px 16px}
nav.top{position:sticky;top:0;z-index:30;backdrop-filter:blur(16px);background:rgba(5,5,10,.6);border-bottom:1px solid var(--line)}
nav.top .wrap{display:flex;align-items:center;justify-content:space-between;height:66px;gap:12px}
.brand{display:flex;align-items:center;gap:10px;font-weight:800;letter-spacing:-.02em;font-size:18px}
.brand i{width:34px;height:34px;border-radius:11px;background:linear-gradient(135deg,var(--c1),var(--c2));display:grid;place-items:center;color:#05050a;font-style:normal;font-weight:900;box-shadow:0 0 24px rgba(34,211,238,.5)}
.nav-links{display:flex;gap:26px;font-size:14px;color:var(--muted);font-weight:500}
.nav-links a:hover{color:var(--text)}
@media(max-width:820px){.nav-links{display:none}}

/* hero */
.hero{position:relative;padding:70px 0 90px;overflow:hidden}
.hero::before{content:"";position:absolute;inset:-20% -10% auto;height:900px;background:radial-gradient(500px 400px at 75% 35%,rgba(129,140,248,.28),transparent 70%),radial-gradient(500px 380px at 20% 20%,rgba(34,211,238,.18),transparent 70%),radial-gradient(400px 300px at 60% 90%,rgba(244,114,182,.14),transparent 70%);pointer-events:none}
.grid-bg{position:absolute;inset:0;background-image:linear-gradient(rgba(255,255,255,.04) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.04) 1px,transparent 1px);background-size:56px 56px;mask-image:radial-gradient(ellipse at 50% 30%,#000 30%,transparent 75%);pointer-events:none}
.hero .wrap{position:relative;display:grid;grid-template-columns:1.1fr 1fr;gap:40px;align-items:center}
@media(max-width:900px){.hero .wrap{grid-template-columns:1fr;text-align:center}.hero .ctas{justify-content:center}}
.eyebrow{display:inline-flex;align-items:center;gap:8px;padding:7px 14px;border:1px solid var(--line);border-radius:999px;font-size:13px;color:var(--muted);background:rgba(255,255,255,.03)}
.eyebrow b{width:8px;height:8px;border-radius:50%;background:#34d399;box-shadow:0 0 12px #34d399;animation:pulse 2s infinite}
@keyframes pulse{50%{opacity:.4}}
h1{font-size:clamp(44px,7.4vw,92px);line-height:.98;letter-spacing:-.045em;margin:22px 0 22px;font-weight:900}
.hero p.sub{font-size:clamp(16px,1.6vw,19px);color:var(--muted);max-width:540px;line-height:1.7;margin:0 0 32px}
@media(max-width:900px){.hero p.sub{margin-left:auto;margin-right:auto}}
.ctas{display:flex;gap:12px;flex-wrap:wrap}

/* phone + orbit */
.stage{position:relative;height:560px;display:grid;place-items:center;perspective:1200px}
@media(max-width:900px){.stage{height:470px;transform:scale(.85)}}
.phone{position:relative;width:240px;height:490px;border-radius:44px;background:linear-gradient(145deg,#2a2e3c,#0b0c12);padding:10px;box-shadow:0 60px 120px -30px rgba(129,140,248,.55),0 0 0 1.5px rgba(255,255,255,.12) inset;transform:rotateY(-14deg) rotateX(6deg);animation:float 6s ease-in-out infinite}
@keyframes float{50%{transform:rotateY(-8deg) rotateX(2deg) translateY(-14px)}}
.screen{width:100%;height:100%;border-radius:36px;overflow:hidden;position:relative;background:linear-gradient(160deg,#0e1a3d,#1b0f3d 55%,#3b0d34);display:flex;flex-direction:column;justify-content:flex-end;padding:26px 20px}
.screen::before{content:"";position:absolute;top:12px;left:50%;transform:translateX(-50%);width:84px;height:24px;border-radius:20px;background:#000}
.screen::after{content:"";position:absolute;inset:0;background:linear-gradient(120deg,rgba(255,255,255,.18),transparent 35%)}
.screen .blob{position:absolute;width:220px;height:220px;border-radius:50%;filter:blur(30px);top:60px;left:-20px;background:conic-gradient(from 0deg,var(--c1),var(--c2),var(--c3),var(--c1));animation:spin 10s linear infinite;opacity:.8}
@keyframes spin{to{transform:rotate(360deg)}}
.screen h4{position:relative;z-index:1;margin:0;font-size:26px;line-height:1.05;letter-spacing:-.03em;font-weight:900}
.screen small{position:relative;z-index:1;color:rgba(255,255,255,.7);font-size:12px;margin-top:6px}
.orbit{position:absolute;width:480px;height:480px;border-radius:50%;border:1px dashed rgba(255,255,255,.1);animation:spin 40s linear infinite}
.orbit2{width:360px;height:360px;border-color:rgba(34,211,238,.15);animation-duration:28s;animation-direction:reverse}
.orb{position:absolute;top:50%;left:50%;width:0;height:0;transform:rotate(calc(var(--i)*60deg)) translateX(240px)}
.orb-in{width:62px;height:62px;margin:-31px;border-radius:20px;display:grid;place-items:center;background:rgba(15,16,28,.75);border:1px solid var(--line);backdrop-filter:blur(10px);color:var(--c1);box-shadow:0 10px 30px rgba(0,0,0,.4);animation:spin 40s linear infinite reverse}
.orb:nth-child(even) .orb-in{color:var(--c3)}
.orb:nth-child(3n) .orb-in{color:var(--c2)}
@media(prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}}

/* marquee */
.marquee{border-block:1px solid var(--line);background:var(--bg2);overflow:hidden;padding:20px 0}
.track{display:flex;gap:30px;width:max-content;animation:scroll 30s linear infinite;font-weight:700;font-size:clamp(20px,3vw,30px);letter-spacing:-.02em}
.track i{color:var(--c1);font-style:normal}
.track span:nth-of-type(3n+2){-webkit-text-stroke:1px rgba(255,255,255,.5);color:transparent}
@keyframes scroll{to{transform:translateX(-50%)}}

section.block{padding:100px 0}
.head{text-align:center;max-width:720px;margin:0 auto 54px}
.kicker{color:var(--c1);font-weight:700;font-size:13px;letter-spacing:.18em;text-transform:uppercase}
h2{font-size:clamp(34px,5vw,58px);letter-spacing:-.04em;line-height:1.02;margin:14px 0 14px;font-weight:900}
.head p{color:var(--muted);font-size:17px;line-height:1.7;margin:0}

/* categories bento */
.cats{display:grid;grid-template-columns:repeat(4,1fr);gap:16px}
@media(max-width:1000px){.cats{grid-template-columns:repeat(3,1fr)}}
@media(max-width:700px){.cats{grid-template-columns:repeat(2,1fr);gap:12px}}
.cat{position:relative;border:1px solid var(--line);border-radius:26px;padding:24px;background:linear-gradient(180deg,rgba(255,255,255,.05),rgba(255,255,255,.015));overflow:hidden;transition:transform .3s,border-color .3s}
.cat::before{content:"";position:absolute;inset:-1px;border-radius:inherit;background:radial-gradient(300px 160px at var(--mx,50%) var(--my,0%),rgba(34,211,238,.18),transparent 70%);opacity:0;transition:opacity .3s;pointer-events:none}
.cat:hover{transform:translateY(-4px);border-color:rgba(34,211,238,.35)}.cat:hover::before{opacity:1}
.cat:nth-child(1),.cat:nth-child(6){grid-column:span 2}
@media(max-width:700px){.cat:nth-child(1),.cat:nth-child(6){grid-column:span 2}}
.cat-ic{width:58px;height:58px;border-radius:18px;display:grid;place-items:center;background:linear-gradient(135deg,rgba(34,211,238,.18),rgba(129,140,248,.18));color:var(--c1);margin-bottom:22px;border:1px solid rgba(255,255,255,.08)}
.cat:nth-child(3n+2) .cat-ic{color:var(--c3)}.cat:nth-child(3n) .cat-ic{color:var(--c2)}
.cat h3{margin:0 0 6px;font-size:19px;letter-spacing:-.02em}
.cat p{margin:0;color:var(--muted);font-size:14px;line-height:1.5}
.cat-link{display:inline-flex;align-items:center;gap:6px;margin-top:16px;font-size:13px;font-weight:600;color:var(--c1)}

/* offers */
.offers{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:18px}
.offer{position:relative;border-radius:28px;padding:28px;background:linear-gradient(160deg,#141532,#0b0b16);border:1px solid rgba(129,140,248,.25);overflow:hidden}
.offer::after{content:"";position:absolute;width:240px;height:240px;right:-80px;top:-80px;border-radius:50%;background:radial-gradient(circle,rgba(244,114,182,.35),transparent 70%)}
.offer-tag{display:inline-flex;align-items:center;gap:6px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.12em;color:#05050a;background:linear-gradient(90deg,#fde047,#fb923c);padding:6px 12px;border-radius:999px}
.offer h3{font-size:24px;letter-spacing:-.03em;margin:18px 0 8px;line-height:1.15}
.offer-price{font-size:46px;font-weight:900;letter-spacing:-.04em;background:linear-gradient(100deg,#fde047,#fb923c,#f472b6);-webkit-background-clip:text;background-clip:text;color:transparent;margin-bottom:6px}
.offer p{color:var(--muted);margin:0 0 18px;font-size:14px;line-height:1.6}

/* highlights */
.why{display:grid;grid-template-columns:1fr 1fr;gap:50px;align-items:center}
@media(max-width:900px){.why{grid-template-columns:1fr}}
.why ul{list-style:none;margin:0;padding:0;display:grid;gap:12px}
.why li{display:flex;gap:14px;align-items:center;padding:18px 20px;border:1px solid var(--line);border-radius:18px;background:var(--card);font-weight:600}
.why li svg{color:#34d399;flex:none}
.about{font-size:clamp(22px,2.6vw,32px);line-height:1.4;letter-spacing:-.02em;font-weight:600}
.about em{font-style:normal;color:var(--muted)}

/* loyalty */
.loyal{position:relative;border-radius:36px;padding:56px;overflow:hidden;background:linear-gradient(120deg,#0f2a3d,#1e1650 55%,#3a0f3a);border:1px solid var(--line);display:grid;grid-template-columns:1.3fr 1fr;gap:30px;align-items:center}
@media(max-width:900px){.loyal{grid-template-columns:1fr;padding:34px;text-align:center}}
.stamps{display:grid;grid-template-columns:repeat(5,1fr);gap:10px;width:100%;max-width:340px;margin-left:auto}
@media(max-width:900px){.stamps{margin:0 auto}}
.stamp{aspect-ratio:1;border-radius:50%;border:2px dashed rgba(255,255,255,.3);display:grid;place-items:center}
.stamp.on{border:0;background:linear-gradient(135deg,var(--c1),var(--c2));color:#05050a;box-shadow:0 0 20px rgba(34,211,238,.5)}
.stamp.gift{border-color:#fde047;color:#fde047}

/* visit */
.visit{display:grid;grid-template-columns:1fr 1.2fr;gap:22px}
@media(max-width:900px){.visit{grid-template-columns:1fr}}
.info{border:1px solid var(--line);border-radius:28px;padding:30px;background:var(--card)}
.info ul{list-style:none;padding:0;margin:0 0 24px;display:grid;gap:20px}
.info li{display:flex;gap:16px}.info li svg{color:var(--c1);flex:none;margin-top:2px}
.info b{display:block;font-size:13px;color:var(--muted);font-weight:500;margin-bottom:2px}
.info span,.info li a{font-weight:600;line-height:1.5}
.map{border-radius:28px;overflow:hidden;border:1px solid var(--line);min-height:360px;background:var(--bg2)}
.map iframe{width:100%;height:100%;min-height:360px;border:0;filter:invert(.9) hue-rotate(180deg) saturate(.8)}
.info .ctas{gap:10px}

footer{border-top:1px solid var(--line);padding:40px 0 120px;color:var(--muted);font-size:14px}
footer .wrap{display:flex;justify-content:space-between;gap:20px;flex-wrap:wrap}
footer a{color:var(--text)}

.dock{position:fixed;left:50%;bottom:16px;transform:translateX(-50%);z-index:40;display:flex;gap:6px;padding:6px;border-radius:999px;background:rgba(15,16,28,.85);border:1px solid var(--line);backdrop-filter:blur(16px);box-shadow:0 20px 50px rgba(0,0,0,.5)}
.dock a{display:flex;align-items:center;gap:8px;padding:12px 18px;border-radius:999px;font-weight:700;font-size:14px}
.dock a.wa{background:#25d366;color:#05250f}
@media(min-width:901px){.dock{display:none}}

.reveal{opacity:0;transform:translateY(24px);transition:opacity .7s ease var(--d,0ms),transform .7s ease var(--d,0ms)}
.reveal.in{opacity:1;transform:none}
.no-js .reveal{opacity:1;transform:none}
</style>
</head>
<body class="no-js">
${site.announce ? `<div class="announce">${icon('bolt', 14)} ${esc(site.announce)}</div>` : ''}
<nav class="top"><div class="wrap">
  <a class="brand" href="#"><i>${esc(site.name.charAt(0).toUpperCase())}</i>${name}</a>
  <div class="nav-links"><a href="#categories">Collection</a>${offers ? '<a href="#offers">Offers</a>' : ''}<a href="#visit">Visit</a></div>
  ${waLink ? `<a class="btn btn-small" href="${esc(waLink)}" target="_blank" rel="noopener">${icon('wa', 16)} Chat</a>` : telLink ? `<a class="btn btn-small" href="${esc(telLink)}">${icon('call', 16)} Call</a>` : ''}
</div></nav>

<header class="hero">
  <div class="grid-bg"></div>
  <div class="wrap">
    <div>
      <span class="eyebrow"><b></b> Mobile accessories store${city ? ` · ${city}` : ''}</span>
      <h1>${esc(site.tagline || 'Har phone ke liye, sab kuch ek jagah.').replace(/(\S+[.!?]?)$/, '<span class="grad">$1</span>')}</h1>
      <p class="sub">${esc(site.about)}</p>
      <div class="ctas">${primaryCta}${secondaryCta}</div>
    </div>
    <div class="stage" aria-hidden="true">
      <div class="orbit"></div><div class="orbit orbit2"></div>
      <div class="orbit" style="border:0">${orbit}</div>
      <div class="phone"><div class="screen"><div class="blob"></div><h4>${name}</h4><small>Covers · Chargers · Audio · Gadgets</small></div></div>
    </div>
  </div>
</header>

<div class="marquee" aria-hidden="true"><div class="track">${marquee}${marquee}</div></div>

<section class="block" id="categories"><div class="wrap">
  <div class="head reveal"><div class="kicker">Collection</div><h2>Phone ki har <span class="grad">zaroorat</span>, yahin.</h2><p>Shop pe aao, haath mein le ke dekho, sahi accessory chuno. Kuch chahiye to WhatsApp pe pehle hi pooch lo.</p></div>
  <div class="cats">${cats}</div>
</div></section>

${
  offers
    ? `<section class="block" id="offers" style="padding-top:0"><div class="wrap">
  <div class="head reveal"><div class="kicker">Abhi chal raha hai</div><h2>Aaj ke <span class="grad">offers</span></h2></div>
  <div class="offers">${offers}</div>
</div></section>`
    : ''
}

${
  highlights
    ? `<section class="block" style="padding-top:0"><div class="wrap why">
  <p class="about reveal">${name} <em>sirf ek dukaan nahi.</em> Yahan aapko sahi salah, sahi daam aur ${city ? `${city} ka ` : ''}apnapan milta hai.</p>
  <ul>${highlights}</ul>
</div></section>`
    : ''
}

${
  site.reward || site.loyaltyLink
    ? `<section class="block" id="reward" style="padding-top:0"><div class="wrap"><div class="loyal reveal">
  <div><div class="kicker" style="color:#fde047">Regular customers ke liye</div><h2 style="margin-bottom:12px">Har visit pe stamp.<br />${site.reward ? `${site.rewardVisits} visit pe <span class="grad">${esc(site.reward)}.</span>` : 'Card bharo, <span class="grad">gift pao.</span>'}</h2>
  <p style="color:rgba(255,255,255,.75);line-height:1.7;margin:0 0 24px">Shop pe aate raho, har visit pe ek stamp lagta hai. ${site.rewardVisits} stamp poore hote hi aapka gift pakka. Digital card aapke phone mein: na app, na card khone ka dar.</p>
  ${site.loyaltyLink ? `<a class="btn btn-primary" href="${esc(site.loyaltyLink)}" target="_blank" rel="noopener">${icon('gift', 20)} Mera card kholo</a>` : waLink ? `<a class="btn btn-primary" href="${esc(waLink)}" target="_blank" rel="noopener">${icon('gift', 20)} Card ke baare mein poochho</a>` : ''}</div>
  <div class="stamps" aria-hidden="true">${Array.from({ length: site.rewardVisits }, (_, i) => i + 1).map((n) => (n === site.rewardVisits ? `<div class="stamp gift">${icon('gift', 20)}</div>` : `<div class="stamp${n < site.rewardVisits - 1 ? ' on' : ''}">${n < site.rewardVisits - 1 ? icon('star', 18) : ''}</div>`)).join('')}</div>
</div></div></section>`
    : ''
}

<section class="block" id="visit" style="padding-top:0"><div class="wrap">
  <div class="head reveal"><div class="kicker">Visit</div><h2>Aao, <span class="grad">milte hain.</span></h2></div>
  <div class="visit">
    <div class="info reveal">
      ${contactRows ? `<ul>${contactRows}</ul>` : `<p style="color:var(--muted);margin-top:0">Shop ki details jald hi yahan hongi.</p>`}
      <div class="ctas">
        ${waLink ? `<a class="btn btn-primary" href="${esc(waLink)}" target="_blank" rel="noopener">${icon('wa', 18)} WhatsApp</a>` : ''}
        ${mapsLink ? `<a class="btn btn-ghost" href="${esc(mapsLink)}" target="_blank" rel="noopener">${icon('pin', 18)} Directions</a>` : ''}
        ${site.googleReview ? `<a class="btn btn-ghost" href="${esc(site.googleReview)}" target="_blank" rel="noopener">${icon('star', 18)} Review do</a>` : ''}
      </div>
    </div>
    ${mapEmbed ? `<div class="map reveal"><iframe src="${esc(mapEmbed)}" loading="lazy" referrerpolicy="no-referrer-when-downgrade" title="${name} map"></iframe></div>` : ''}
  </div>
</div></section>

<footer><div class="wrap">
  <span>© ${new Date().getFullYear()} ${name}${city ? `, ${city}` : ''}</span>
  <span>Website by <a href="https://www.regularhood.in/?utm_source=pushro&utm_medium=footer" target="_blank" rel="noopener">Regularhood</a></span>
</div></footer>

${
  waLink || telLink || mapsLink
    ? `<div class="dock">${telLink ? `<a href="${esc(telLink)}">${icon('call', 18)} Call</a>` : ''}${mapsLink ? `<a href="${esc(mapsLink)}" target="_blank" rel="noopener">${icon('pin', 18)} Rasta</a>` : ''}${waLink ? `<a class="wa" href="${esc(waLink)}" target="_blank" rel="noopener">${icon('wa', 18)} WhatsApp</a>` : ''}</div>`
    : ''
}

<script>
document.body.classList.remove('no-js');
const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: .12 });
document.querySelectorAll('.reveal').forEach((el) => io.observe(el));
document.querySelectorAll('.cat').forEach((el) => el.addEventListener('pointermove', (e) => { const r = el.getBoundingClientRect(); el.style.setProperty('--mx', (e.clientX - r.left) + 'px'); el.style.setProperty('--my', (e.clientY - r.top) + 'px'); }));
</script>
</body>
</html>`;
}
