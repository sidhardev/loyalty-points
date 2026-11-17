import { BadRequestException, Body, Controller, Delete, Get, HttpException, HttpStatus, NotFoundException, Param, ParseIntPipe, Post, Req, Res, UseGuards } from '@nestjs/common';
import type { Request, Response } from 'express';
import { AdminGuard } from './admin';
import { Db } from './db';
import { gaSnippet } from './ga';
import { SITE } from './seo';
import { BEACON, CSS, esc } from './seo-render';

// Waitlists for countries Regularhood isn't open in yet. The first is the UAE: /uae is a server-rendered page (like the
// SEO pages) that explains the product and takes a shop's details; Admin → Waitlist lists them, with how many say
// they'd pay. The app itself still assumes India (+91 numbers, ₹), so the page promises a WhatsApp message when the shop
// can start, not an account today.

/** UAE prices shown on the page. Not charged anywhere yet: this is the price the waitlist is testing. */
const UAE = { proMonthly: 19, proYearly: 149, freeCustomers: 15 };

const SHOP_TYPES = ['Grocery / supermarket', 'Cafeteria / restaurant', 'Salon / barber', 'Laundry', 'Bakery / sweets', 'Pharmacy', 'Mobile / electronics', 'Other'];
const EMIRATES = ['Dubai', 'Sharjah', 'Abu Dhabi', 'Ajman', 'Ras Al Khaimah', 'Fujairah', 'Umm Al Quwain'];
const WOULD_PAY = [
  ['yes', `Yes, AED ${UAE.proMonthly}/month is fine if it brings customers back`],
  ['maybe', 'Maybe, I want to try it first'],
  ['no', 'Only if it stays free'],
] as const;

const SIGNUPS_PER_HOUR = 5;
const NO_CACHE = { 'Cache-Control': 'no-store' };

/**
 * A UAE WhatsApp number as +971…: "050 123 4567", "50 123 4567", "00971 50…" and "+971 50…" all work. A number from
 * another country needs its + and country code (some owners use their home-country WhatsApp).
 */
export function readUaePhone(value: unknown) {
  const raw = typeof value === 'string' ? value.trim() : '';
  if (!raw) throw new BadRequestException('Enter your WhatsApp number');
  let digits = raw.replace(/\D/g, '');
  if (digits.startsWith('00')) digits = digits.slice(2);
  else if (!raw.startsWith('+')) {
    if (/^05\d{8}$/.test(digits)) digits = `971${digits.slice(1)}`;
    else if (/^5\d{8}$/.test(digits)) digits = `971${digits}`;
    else if (!digits.startsWith('971')) throw new BadRequestException('Enter a UAE mobile like 050 123 4567, or another country’s number with its + code');
  }
  if (digits.startsWith('971') && !/^9715\d{8}$/.test(digits)) throw new BadRequestException('A UAE mobile has 9 digits after +971, starting with 5');
  if (digits.length < 8 || digits.length > 15) throw new BadRequestException('Enter a valid WhatsApp number');
  return `+${digits}`;
}

const text = (body: Record<string, unknown>, key: string, max: number) => (typeof body[key] === 'string' ? (body[key] as string).trim().slice(0, max) : '');
const oneOf = (value: string, list: readonly string[]) => (list.includes(value) ? value : '');

type WaitlistRow = {
  id: number;
  market: string;
  name: string;
  shop: string;
  shop_type: string;
  area: string;
  phone: string;
  would_pay: string;
  source: string;
  note: string;
  contacted_at: string | null;
  created_at: string;
};

// ---------------------------------------------------------------- the page

const PAGE_CSS = `
.hero h1 .hl{color:var(--green)}
.price{display:grid;grid-template-columns:repeat(2,1fr);gap:18px;max-width:760px}
.price .card b{display:block;font:900 34px/1.1 Archivo,Inter,sans-serif;margin:6px 0 4px}
.price .card small{color:var(--soft);font-size:14px}
.price .card ul{margin:12px 0 0;padding-left:20px;color:var(--ink2);display:grid;gap:4px}
.price .pro{border:2px solid var(--green)}
.join{background:var(--sheet);border:1px solid var(--line);border-radius:24px;padding:28px;max-width:640px;box-shadow:0 30px 60px -40px rgba(15,46,36,.45)}
.join form{display:grid;gap:14px}
.join label{display:grid;gap:6px;font-weight:600;font-size:15px;color:var(--ink2)}
.join input,.join select{font:inherit;font-size:16px;padding:12px 14px;border:1px solid var(--line);border-radius:12px;background:#fff;color:var(--ink);width:100%}
.join input:focus,.join select:focus{outline:2px solid var(--green);outline-offset:1px}
.join .two{display:grid;grid-template-columns:1fr 1fr;gap:14px}
.join fieldset{border:0;padding:0;margin:0;display:grid;gap:8px}
.join legend{font-weight:600;font-size:15px;color:var(--ink2);margin-bottom:6px}
.join .opt{display:flex;gap:10px;align-items:flex-start;font-weight:400;color:var(--ink);background:var(--paper);border-radius:10px;padding:10px 12px;cursor:pointer}
.join .opt input{width:auto;margin-top:4px}
.join .btn{width:100%;font-size:17px;cursor:pointer}
.join .btn[disabled]{opacity:.6;cursor:wait}
.join .small{color:var(--soft);font-size:13px;margin:0}
.jerr{color:#b42318;font-size:14px;font-weight:600;margin:0}
.jerr[hidden],.done[hidden],form[hidden]{display:none}
.done h3{font:800 26px/1.2 Archivo,Inter,sans-serif;margin:0 0 8px}
.done p{margin:0 0 16px;color:var(--ink2)}
@media (max-width:820px){.price{grid-template-columns:1fr}.join{padding:20px}}
@media (max-width:520px){.join .two{grid-template-columns:1fr}}
`;

const FAQS: [string, string][] = [
  ['Do my customers need to download an app?', 'No. You type their mobile number at the counter. They get their stamp card as a link on WhatsApp and never install anything.'],
  ['When can my shop start?', 'We are opening the UAE to the first shops on the waitlist. We will message you on WhatsApp when your shop can start, and help you set it up.'],
  ['Does it work with UAE numbers?', 'That is exactly what we are getting ready: +971 numbers, prices in dirhams and UAE time. Shops on the waitlist get it first.'],
  ['Is it in Arabic?', 'Not yet. The shop app and the customer’s card are in English and Hindi today. If most of your customers need Arabic, say so when we message you.'],
  ['What does it cost?', `Free for your first ${UAE.freeCustomers} customers, with no time limit. Pro is AED ${UAE.proMonthly} a month or AED ${UAE.proYearly} a year, and nothing is charged automatically.`],
  ['What reward should I give?', 'Something small your regulars like: a free juice at a cafeteria, a free beard trim at a barber, one shirt washed free at a laundry. You choose after how many visits, from 3 to 10.'],
];

function renderUae() {
  const here = '/uae';
  const title = 'Loyalty Card App for Shops in the UAE · Regularhood';
  const description = `A digital stamp card for UAE shops on the customer’s mobile number. No app for customers. Free for ${UAE.freeCustomers} customers, Pro AED ${UAE.proMonthly}/month. Join the waitlist.`;
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'SoftwareApplication',
        name: 'Regularhood',
        url: `${SITE}${here}`,
        description,
        applicationCategory: 'BusinessApplication',
        operatingSystem: 'Web, Android, iOS',
        areaServed: { '@type': 'Country', name: 'United Arab Emirates' },
        offers: [
          { '@type': 'Offer', name: 'Free', price: '0', priceCurrency: 'AED' },
          { '@type': 'Offer', name: 'Pro (monthly)', price: String(UAE.proMonthly), priceCurrency: 'AED' },
        ],
      },
      { '@type': 'FAQPage', mainEntity: FAQS.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) },
    ],
  };
  const bill: [string, string][] = [
    ['Milk 2 L', '9.50'],
    ['Arabic bread', '4.00'],
    ['Eggs, 30', '18.00'],
    ['Basmati rice 5 kg', '32.00'],
  ];
  const option = (v: string) => `<option>${esc(v)}</option>`;
  // Everything the visitor types goes to the server as JSON and is never written back into the page.
  const script = `<script>(function(){
var f=document.getElementById('wf'),err=document.getElementById('werr'),done=document.getElementById('wdone'),btn=f.querySelector('button[type=submit]');
function ev(name){try{var id=window.__rhv;if(!id)return;var b=JSON.stringify({t:'event',id:id,kind:'click',name:name});if(!(navigator.sendBeacon&&navigator.sendBeacon('/api/collect',new Blob([b],{type:'application/json'}))))fetch('/api/collect',{method:'POST',body:b,headers:{'content-type':'application/json'},keepalive:true})}catch(e){}}
var p=new URLSearchParams(location.search),started=false;
f.addEventListener('input',function(){if(!started){started=true;ev('uae waitlist: started')}});
f.addEventListener('submit',function(e){e.preventDefault();err.hidden=true;btn.disabled=true;
var d={market:'uae',source:p.get('utm_source')||p.get('ref')||(document.referrer?new URL(document.referrer).hostname:'')};
['name','shop','shop_type','area','phone'].forEach(function(k){d[k]=f.elements[k].value});
var w=f.querySelector('input[name=would_pay]:checked');d.would_pay=w?w.value:'';
fetch('/api/public/waitlist',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(d)})
.then(function(r){return r.json().then(function(j){if(!r.ok)throw new Error(j.message||'Something went wrong, try again');return j})})
.then(function(){f.hidden=true;done.hidden=false;ev('uae waitlist: joined ('+(d.would_pay||'no answer')+')');done.scrollIntoView({block:'center'})})
.catch(function(x){err.textContent=x.message;err.hidden=false;btn.disabled=false})});
document.querySelectorAll('a[href="#join"]').forEach(function(a){a.addEventListener('click',function(){ev('uae: join button')})});
})();</script>`;

  return `<!doctype html>
<html lang="en-AE">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${SITE}${here}">
<link rel="alternate" hreflang="en-AE" href="${SITE}${here}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Regularhood">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${SITE}${here}">
<meta property="og:image" content="${SITE}/og.png">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#eef2ec">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Archivo:wght@700;800;900&family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
<style>${CSS}${PAGE_CSS}</style>
<script type="application/ld+json">${JSON.stringify(jsonLd).replace(/</g, '\\u003c')}</script>
${gaSnippet()}
</head>
<body class="en">
<header><div class="wrap">
<a class="logo" href="${here}"><img src="/favicon.svg" alt="" width="32" height="32">Regularhood</a>
<nav><a class="hide" href="#how">How it works</a><a class="hide" href="#price">Price</a><a class="btn sm" href="#join">Join the waitlist</a></nav>
</div></header>
<main>
<div class="wrap hero">
  <div>
    <p class="eyebrow">Coming to the UAE · Waitlist open</p>
    <h1>Turn walk-in customers into <span class="hl">regulars</span>.</h1>
    <p class="intro">Regularhood is a digital stamp card on your customer’s mobile number. Type the number at the counter, and every few visits they get a free gift from your shop. No app for customers, no cards to print. We are opening in Dubai, Sharjah and the other emirates soon.</p>
    <div class="cta"><a class="btn" href="#join">Join the UAE waitlist</a><a class="btn line" href="#how">See how it works</a></div>
    <ul class="perks"><li>Free for ${UAE.freeCustomers} customers</li><li>No app for customers</li><li>Works on the phone you have</li></ul>
  </div>
  <div class="receipt" aria-label="Example bill">
    <h3>Al Nahda Grocery</h3>
    <div class="c">Example bill · Sharjah</div>
    ${bill.map(([n, p]) => `<div class="r"><span>${esc(n)}</span><span>${p}</span></div>`).join('')}
    <hr>
    <div class="r t"><span>Total AED</span><span>63.50</span></div>
    <hr>
    <div class="c" style="margin:0">Every visit = 1 stamp</div>
    <div style="text-align:center"><span class="stamp">Visit 4 of 6 ✓</span></div>
  </div>
</div>

<section style="padding-top:8px"><div class="wrap">
  <h2>Why customers drift away</h2>
  <div class="grid3">
    <div class="card"><h3>A shop on every corner</h3><p>In Al Nahda, Karama or Al Barsha, the same goods are sold three doors apart. Without a reason to pick you, people pick whoever is closest that day.</p></div>
    <div class="card"><h3>Delivery apps take the order</h3><p>The customer who used to walk in now taps an app, and the app keeps the relationship and a cut of the bill.</p></div>
    <div class="card"><h3>People move often</h3><p>A new job or a new flat and a regular is gone. The shops that keep them are the ones that give them a reason to come back.</p></div>
  </div>
</div></section>

<section id="how"><div class="wrap">
  <h2>How it works at your counter</h2>
  <ol class="steps">
    <li class="card"><span class="num">1</span><h3>Type the number</h3><p>Type the customer’s mobile number and tap Add visit. Regulars show up after a few digits; a new number becomes a customer on the spot.</p></li>
    <li class="card"><span class="num">2</span><h3>The card goes on WhatsApp</h3><p>One tap sends the customer their card on WhatsApp: their stamps and how many visits are left until the gift.</p></li>
    <li class="card"><span class="num">3</span><h3>Give the reward</h3><p>On the visit you chose, the app says Give the reward now. Tap Given and the card starts again.</p></li>
  </ol>
</div></section>

<section style="padding-top:0"><div class="wrap">
  <h2>Reward ideas</h2>
  <div class="rewards">
    <div class="reward"><span>Cafeteria</span><b>A free fresh juice</b><strong>6</strong><span>visits</span></div>
    <div class="reward"><span>Barber</span><b>A free beard trim</b><strong>5</strong><span>visits</span></div>
    <div class="reward"><span>Laundry</span><b>One shirt washed and ironed free</b><strong>8</strong><span>visits</span></div>
    <div class="reward"><span>Grocery</span><b>A free gift from the shop</b><strong>10</strong><span>visits</span></div>
  </div>
</div></section>

<section id="price"><div class="wrap">
  <h2>Price</h2>
  <div class="price">
    <div class="card"><h3>Free</h3><b>AED 0</b><small>No time limit</small><ul><li>Up to ${UAE.freeCustomers} customers</li><li>Stamp cards on WhatsApp</li><li>Rewards and visit history</li></ul></div>
    <div class="card pro"><h3>Pro</h3><b>AED ${UAE.proMonthly}<span style="font-size:18px">/month</span></b><small>or AED ${UAE.proYearly} a year · nothing is charged automatically</small><ul><li>Unlimited customers</li><li>“We miss you” messages for customers who stopped coming</li><li>Ask happy customers for a Google review</li><li>Your logo on the card, and export your list</li></ul></div>
  </div>
</div></section>

<section id="join"><div class="wrap">
  <h2>Join the UAE waitlist</h2>
  <div class="join">
    <form id="wf" novalidate>
      <div class="two">
        <label>Your name<input name="name" required maxlength="60" autocomplete="name"></label>
        <label>Shop name<input name="shop" required maxlength="80" autocomplete="organization"></label>
      </div>
      <div class="two">
        <label>Type of shop<select name="shop_type" required><option value="">Choose…</option>${SHOP_TYPES.map(option).join('')}</select></label>
        <label>Emirate<select name="area" required><option value="">Choose…</option>${EMIRATES.map(option).join('')}</select></label>
      </div>
      <label>WhatsApp number<input name="phone" required type="tel" inputmode="tel" maxlength="20" placeholder="050 123 4567" autocomplete="tel"></label>
      <fieldset>
        <legend>Pro is AED ${UAE.proMonthly} a month. Would you pay that?</legend>
        ${WOULD_PAY.map(([v, l]) => `<label class="opt"><input type="radio" name="would_pay" value="${v}"><span>${esc(l)}</span></label>`).join('')}
      </fieldset>
      <p class="jerr" id="werr" role="alert" hidden></p>
      <button class="btn" type="submit">Join the waitlist →</button>
      <p class="small">We’ll only use your number to message you on WhatsApp about Regularhood. <a href="/privacy">Privacy</a></p>
    </form>
    <div class="done" id="wdone" hidden role="status">
      <h3>You’re on the list ✓</h3>
      <p>We’ll message you on WhatsApp when your shop can start, and help you set it up. Know another shop owner who should get it too?</p>
      <a class="btn line" href="https://wa.me/?text=${encodeURIComponent(`A free stamp card for shops, on the customer's mobile number. Coming to the UAE, waitlist here: ${SITE}${here}?utm_source=whatsapp-share`)}" target="_blank" rel="noopener">Share on WhatsApp</a>
    </div>
  </div>
</div></section>

<section style="padding-top:0"><div class="wrap"><div class="article">
  <h2>Questions</h2>
  ${FAQS.map(([q, a], i) => `<details${i === 0 ? ' open' : ''}><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join('')}
</div></div></section>

<section style="padding-top:0"><div class="wrap"><div class="final">
  <div><h2>Your next regular walks in today.</h2><p>Be one of the first shops in the UAE to give them a reason to come back.</p></div>
  <a class="btn" href="#join">Join the waitlist</a>
</div></div></section>
</main>
<footer><div class="wrap"><span>Regularhood · From first visit to “the usual”.</span><span><a href="/">India</a> · <a href="/privacy">Privacy</a> · <a href="/terms">Terms</a> · <a href="/contact">Contact</a></span></div></footer>
${BEACON}
${script}
</body>
</html>`;
}

// ---------------------------------------------------------------- controllers

@Controller()
export class WaitlistPageController {
  @Get('uae')
  uae(@Res() res: Response) {
    res.type('html').set(NO_CACHE).send(renderUae());
  }

  /** Short links people may type or share. */
  @Get(['ae', 'dubai'])
  short(@Req() req: Request, @Res() res: Response) {
    const q = req.originalUrl.indexOf('?');
    res.redirect(301, `/uae${q >= 0 ? req.originalUrl.slice(q) : ''}`);
  }
}

@Controller('api/public/waitlist')
export class WaitlistController {
  private readonly signups = new Map<string, number[]>();

  constructor(private readonly db: Db) {}

  @Post()
  join(@Req() req: Request, @Body() body: Record<string, unknown>) {
    const ip = req.ip ?? '';
    const recent = (this.signups.get(ip) ?? []).filter((t) => t > Date.now() - 3_600_000);
    if (recent.length >= SIGNUPS_PER_HOUR) throw new HttpException('Too many sign-ups, try again later', HttpStatus.TOO_MANY_REQUESTS);
    const b = body ?? {};
    if (b.market !== 'uae') throw new BadRequestException('Unknown waitlist');
    const name = text(b, 'name', 60);
    if (!name) throw new BadRequestException('Enter your name');
    const shop = text(b, 'shop', 80);
    if (!shop) throw new BadRequestException('Enter your shop’s name');
    const shopType = oneOf(text(b, 'shop_type', 40), SHOP_TYPES);
    if (!shopType) throw new BadRequestException('Choose the type of shop');
    const area = oneOf(text(b, 'area', 40), EMIRATES);
    if (!area) throw new BadRequestException('Choose your emirate');
    const phone = readUaePhone(b.phone);
    const wouldPay = oneOf(text(b, 'would_pay', 10), WOULD_PAY.map(([v]) => v));
    const source = text(b, 'source', 80);
    this.signups.set(ip, [...recent, Date.now()]);
    // Joining twice with the same number updates the details instead of failing.
    this.db.sql
      .prepare(
        `INSERT INTO waitlist (market, name, shop, shop_type, area, phone, would_pay, source) VALUES ('uae', ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT (market, phone) DO UPDATE SET name = excluded.name, shop = excluded.shop, shop_type = excluded.shop_type,
           area = excluded.area,
           would_pay = CASE WHEN excluded.would_pay = '' THEN would_pay ELSE excluded.would_pay END, source = CASE WHEN source = '' THEN excluded.source ELSE source END`,
      )
      .run(name, shop, shopType, area, phone, wouldPay, source);
    return { ok: true };
  }
}

/** Admin → Waitlist: everyone who joined, the counts that decide whether the market is worth opening, and notes. */
@Controller('api/admin/waitlist')
@UseGuards(AdminGuard)
export class WaitlistAdminController {
  constructor(private readonly db: Db) {}

  @Get()
  list() {
    const rows = this.db.sql.prepare('SELECT * FROM waitlist ORDER BY created_at DESC, id DESC').all() as WaitlistRow[];
    const count = (f: (r: WaitlistRow) => boolean) => rows.filter(f).length;
    const tally = (key: 'source' | 'shop_type' | 'area') =>
      Object.entries(rows.reduce<Record<string, number>>((m, r) => ((m[r[key] || '(none)'] = (m[r[key] || '(none)'] ?? 0) + 1), m), {})).sort((a, b) => b[1] - a[1]);
    return {
      rows,
      totals: {
        all: rows.length,
        yes: count((r) => r.would_pay === 'yes'),
        maybe: count((r) => r.would_pay === 'maybe'),
        no: count((r) => r.would_pay === 'no'),
        contacted: count((r) => Boolean(r.contacted_at)),
        week: count((r) => Date.parse(`${r.created_at.replace(' ', 'T')}Z`) > Date.now() - 7 * 86_400_000),
      },
      bySource: tally('source'),
      byType: tally('shop_type'),
      byArea: tally('area'),
    };
  }

  @Post(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() body: { contacted?: boolean; note?: string }) {
    const row = this.db.sql.prepare('SELECT id FROM waitlist WHERE id = ?').get(id);
    if (!row) throw new NotFoundException('Not on the waitlist');
    if (typeof body?.contacted === 'boolean')
      this.db.sql.prepare(`UPDATE waitlist SET contacted_at = ${body.contacted ? "datetime('now')" : 'NULL'} WHERE id = ?`).run(id);
    if (typeof body?.note === 'string') this.db.sql.prepare('UPDATE waitlist SET note = ? WHERE id = ?').run(body.note.slice(0, 500), id);
    return { ok: true };
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    this.db.sql.prepare('DELETE FROM waitlist WHERE id = ?').run(id);
    return { ok: true };
  }
}
