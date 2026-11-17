import { Controller, Get, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { Db } from './db';
import { gaSnippet } from './ga';
import { planSettings, prices } from './plans';
import { SITE } from './seo';
import { BEACON, CSS, esc } from './seo-render';

// /uae: the page for shops in the UAE, for searches ("loyalty card app Dubai") and links shared in UAE groups. It's
// the same product as everywhere: "Start free" opens the usual sign-up with the country set to the UAE, so customers'
// numbers are typed the UAE way (050 123 4567) and Pro is paid in US dollars. /ae and /dubai lead here.

const NO_CACHE = { 'Cache-Control': 'no-store' };

const PAGE_CSS = `
.hero h1 .hl{color:var(--green)}
.price{display:grid;grid-template-columns:repeat(2,1fr);gap:18px;max-width:760px}
.price .card b{display:block;font:900 34px/1.1 Archivo,Inter,sans-serif;margin:6px 0 4px}
.price .card small{color:var(--soft);font-size:14px}
.price .card ul{margin:12px 0 0;padding-left:20px;color:var(--ink2);display:grid;gap:4px}
.price .pro{border:2px solid var(--green)}
@media (max-width:820px){.price{grid-template-columns:1fr}}
`;

const dollars = (cents: number) => `$${(cents / 100).toFixed(Number.isInteger(cents / 100) ? 0 : 2)}`;

function renderUae(p: { free: number; monthly: string; yearly: string }, search: string) {
  const here = '/uae';
  // Sign-up in the UAE: the country is set, and the visit's own tags (?utm_source=…) are kept for Admin → Growth.
  const q = new URLSearchParams(search);
  q.set('country', 'AE');
  if (!q.get('utm_source')) {
    q.set('utm_source', 'seo');
    q.set('utm_medium', 'organic');
  }
  if (!q.get('utm_campaign')) q.set('utm_campaign', here);
  const start = `/app?${q.toString()}#signup`;

  const title = 'Loyalty Card App for Shops in the UAE · Regularhood';
  const description = `A digital stamp card for shops in Dubai, Sharjah and across the UAE, on the customer’s mobile number. No app for customers. Free for ${p.free} customers.`;
  const faqs: [string, string][] = [
    ['Do my customers need to download an app?', 'No. You type their mobile number at the counter. They get their stamp card as a link on WhatsApp and never install anything.'],
    ['Does it work with UAE numbers?', 'Yes. Type the number the way you always do, 050 123 4567 or 50 123 4567, and the card goes to that WhatsApp.'],
    ['Is it in Arabic?', 'Not yet. The shop app and the customer’s card are in English and Hindi today.'],
    ['What does it cost?', `Free for your first ${p.free} customers, with no time limit. Pro is ${p.monthly} a month or ${p.yearly} a year, paid by card or PayPal, and nothing is charged automatically.`],
    ['What reward should I give?', 'Something small your regulars like: a free juice at a cafeteria, a free beard trim at a barber, one shirt washed free at a laundry. You choose after how many visits.'],
    ['What do I need to start?', 'The phone you already have. Sign up, set your reward, and add the first visit at the counter. It takes about two minutes.'],
  ];
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
        offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
      },
      { '@type': 'FAQPage', mainEntity: faqs.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) },
    ],
  };
  const bill: [string, string][] = [
    ['Milk 2 L', '9.50'],
    ['Arabic bread', '4.00'],
    ['Eggs, 30', '18.00'],
    ['Basmati rice 5 kg', '32.00'],
  ];
  const ev = `<script>document.querySelectorAll('a[data-start]').forEach(function(a){a.addEventListener('click',function(){try{var id=window.__rhv;if(!id)return;var b=JSON.stringify({t:'event',id:id,kind:'click',name:'uae: start free ('+a.getAttribute('data-start')+')'});if(!(navigator.sendBeacon&&navigator.sendBeacon('/api/collect',new Blob([b],{type:'application/json'}))))fetch('/api/collect',{method:'POST',body:b,headers:{'content-type':'application/json'},keepalive:true})}catch(e){}})});</script>`;
  const cta = (where: string, label = 'Start free') => `<a class="btn" data-start="${where}" href="${esc(start)}">${label}</a>`;

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
<a class="logo" href="/"><img src="/favicon.svg" alt="" width="32" height="32">Regularhood</a>
<nav><a class="hide" href="#how">How it works</a><a class="hide" href="#price">Price</a><a href="/app">Log in</a><a class="btn sm" data-start="header" href="${esc(start)}">Start free</a></nav>
</div></header>
<main>
<div class="wrap hero">
  <div>
    <p class="eyebrow">Loyalty for shops in the UAE</p>
    <h1>Turn walk-in customers into <span class="hl">regulars</span>.</h1>
    <p class="intro">Regularhood is a digital stamp card on your customer’s mobile number. Type the number at the counter, and every few visits they get a free gift from your shop. No app for customers, no cards to print. Shops in Dubai, Sharjah, Ajman and across the emirates set it up in two minutes.</p>
    <div class="cta">${cta('hero')}<a class="btn line" href="#how">See how it works</a></div>
    <ul class="perks"><li>Free for ${p.free} customers</li><li>No app for customers</li><li>Works on the phone you have</li></ul>
  </div>
  <div class="receipt" aria-label="Example bill">
    <h3>Al Nahda Grocery</h3>
    <div class="c">Example bill · Sharjah</div>
    ${bill.map(([n, v]) => `<div class="r"><span>${esc(n)}</span><span>${v}</span></div>`).join('')}
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
    <li class="card"><span class="num">1</span><h3>Type the number</h3><p>Type the customer’s mobile number, 050 123 4567, and tap Add visit. Regulars show up after a few digits; a new number becomes a customer on the spot.</p></li>
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
    <div class="card"><h3>Free</h3><b>$0</b><small>No time limit</small><ul><li>Up to ${p.free} customers</li><li>Stamp cards on WhatsApp</li><li>Rewards and visit history</li></ul></div>
    <div class="card pro"><h3>Pro</h3><b>${p.monthly}<span style="font-size:18px">/month</span></b><small>or ${p.yearly} a year · card or PayPal · nothing is charged automatically</small><ul><li>Unlimited customers</li><li>“We miss you” messages for customers who stopped coming</li><li>Ask happy customers for a Google review</li><li>Your logo on the card, and export your list</li></ul></div>
  </div>
</div></section>

<section style="padding-top:0"><div class="wrap"><div class="article">
  <h2>Questions</h2>
  ${faqs.map(([q, a], i) => `<details${i === 0 ? ' open' : ''}><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join('')}
</div></div></section>

<section style="padding-top:0"><div class="wrap"><div class="final">
  <div><h2>Your next regular walks in today.</h2><p>Set up takes two minutes on the phone you already have. Free to start.</p></div>
  ${cta('footer')}
</div></div></section>
</main>
<footer><div class="wrap"><span>Regularhood · From first visit to “the usual”.</span><span><a href="/">Home</a> · <a href="/privacy">Privacy</a> · <a href="/terms">Terms</a> · <a href="/contact">Contact</a></span></div></footer>
${BEACON}
${ev}
</body>
</html>`;
}

@Controller()
export class UaePageController {
  constructor(private readonly db: Db) {}

  @Get('uae')
  uae(@Req() req: Request, @Res() res: Response) {
    const usd = prices(this.db.sql, 'USD');
    const q = req.originalUrl.indexOf('?');
    const html = renderUae(
      { free: planSettings(this.db.sql).freeCustomers, monthly: dollars(usd.monthly), yearly: dollars(usd.yearly) },
      q >= 0 ? req.originalUrl.slice(q + 1) : '',
    );
    res.type('html').set(NO_CACHE).send(html);
  }

  /** Short links people may type or share. */
  @Get(['ae', 'dubai'])
  short(@Req() req: Request, @Res() res: Response) {
    const q = req.originalUrl.indexOf('?');
    res.redirect(301, `/uae${q >= 0 ? req.originalUrl.slice(q) : ''}`);
  }
}
