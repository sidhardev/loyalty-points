// Hand-written guides at /guide/<slug> (English) and /hi/guide/<slug> (Hindi). They answer the broad searches a shop
// owner makes before they know what kind of tool they want ("digital stamp card", "how to get repeat customers"),
// where the /for pages answer "loyalty for my kind of shop". Same slug in both languages = the two are translations.
// Only facts about Regularhood that are true today (the same list the /for prompt uses in seo.ts).

import type { SeoLang } from './seo-render';

export type GuideBlock = {
  h2: string;
  p?: string[];
  list?: string[];
  steps?: { title: string; text: string }[];
  table?: { head: string[]; rows: string[][] };
};

export type Guide = {
  slug: string;
  /** Short name for links and breadcrumbs. */
  name: string;
  title: string;
  description: string;
  eyebrow: string;
  h1: string;
  intro: string;
  updated: string;
  blocks: GuideBlock[];
  faqs: { q: string; a: string }[];
  /** Shop pages (/for/<slug>) this guide links to; without it the guide links to the most common shops. */
  shops?: string[];
  /** The same guide in the other script: a Devanagari guide's Roman-Hindi version, or the other way round. */
  sibling?: string;
};

const UPDATED = '2026-10-19';
const ADDED = '2026-10-22';
const ADDED_OCT26 = '2026-10-26';
const ADDED_NOV10 = '2026-11-10';
const ADDED_NOV12 = '2026-11-12';
const ADDED_NOV16 = '2026-11-16';
const ADDED_NOV19 = '2026-11-19';

const en: Guide[] = [
  {
    slug: 'digital-stamp-card',
    name: 'Digital stamp card',
    title: 'Digital Stamp Card for Shops in India — Free, No App',
    description: 'A digital stamp card on the customer’s phone number: tap Add visit at the counter, give a reward every few visits. No app, no QR codes. Free to start.',
    eyebrow: 'Digital loyalty card',
    h1: 'A digital stamp card that lives on your customer’s phone number',
    intro:
      'The paper card that says “buy 9, get the 10th free” works — until it gets lost, washed with the jeans or forgotten at home. A digital stamp card keeps the same simple idea and puts it on the customer’s phone number instead.',
    updated: UPDATED,
    blocks: [
      {
        h2: 'What a digital stamp card is',
        p: [
          'It’s the same loyalty card your customers already understand: one stamp per visit, and after a fixed number of stamps they get something free. The only difference is where the card lives. Instead of a piece of cardboard in their wallet, the stamps are saved against their mobile number.',
          'So the customer can’t lose the card, you can’t run out of cards, and nobody has to remember to bring anything. If they have their phone number, they have their card.',
        ],
      },
      {
        h2: 'Paper card or digital card?',
        table: {
          head: ['', 'Paper stamp card', 'Regularhood digital card'],
          rows: [
            ['Customer loses it', 'Stamps are gone', 'Nothing to lose — it’s their phone number'],
            ['Customer forgets it at home', 'No stamp today', 'Type the number, stamp added'],
            ['Fake or extra stamps', 'Easy with a pen', 'One stamp per number per day'],
            ['Knowing who stopped coming', 'Impossible', 'A list of customers who haven’t been back'],
            ['Printing cost', 'Every few months', 'None'],
            ['Customer without a smartphone', 'Works', 'Works — only the number is needed'],
          ],
        },
      },
      {
        h2: 'How it works at the counter',
        steps: [
          { title: 'Set your rule once', text: 'Choose how many visits earn a reward (3 to 10) and what the reward is — for example, every 5 visits a free gift.' },
          { title: 'Type the number, tap Add visit', text: 'That’s the whole job at the counter. Regulars’ numbers are suggested after 4 digits, and a new number becomes a customer on the spot.' },
          { title: 'Give the reward when the app says so', text: 'On the last visit the app shows “Give the reward now”. Tap Given and the card starts again from zero.' },
        ],
      },
      {
        h2: 'What your customer sees',
        p: [
          'Nothing to install. With one tap you can send them their card on WhatsApp: it shows their stamps and how many visits are left, in Hindi or English, and opens in the phone’s browser.',
          'Customers without a smartphone are covered too. Their visits count on their number, and the app tells you at the counter when their reward is due.',
        ],
      },
      {
        h2: 'Why no QR codes or points',
        p: [
          'QR code cards ask the customer to open the camera, scan, wait for a page and sometimes sign up — at a busy counter, most people won’t. Points systems ask them to understand rates and balances. A stamp card asks nothing: come back, get a stamp, and the reward is close.',
          'The simpler the rule, the more people actually use it. “Every 5 visits, a free haircut wash” is something a customer remembers and tells a friend.',
        ],
      },
      {
        h2: 'Mistakes the app prevents',
        list: [
          'Two stamps in one day: a phone number counts once a day, so a double tap or a friend’s request can’t add a second stamp.',
          'A wrong tap: any visit or reward can be undone.',
          'Forgetting a regular’s card status: the app shows it the moment you type the number.',
        ],
      },
    ],
    faqs: [
      { q: 'Is the digital stamp card really free?', a: 'Yes, it’s free to start. You can set up your card and add visits without paying anything.' },
      { q: 'Do my customers need to download an app?', a: 'No. They don’t install anything or sign up. You add their visit with their phone number, and their card opens from a WhatsApp link in any browser.' },
      { q: 'What do I need at my shop?', a: 'Any phone, tablet or computer with internet. Open Regularhood in the browser or add it to your home screen.' },
      { q: 'Can I move my paper card customers over?', a: 'Yes. When a customer with a paper card comes in, add their visit with their number. You can undo or adjust visits, so you can match the stamps they already have.' },
      { q: 'Can I change the number of visits or the reward later?', a: 'Yes. Change it anytime in Settings. Customers keep the visits they already have.' },
    ],
  },
  {
    slug: 'loyalty-program-for-small-business',
    name: 'Loyalty program for small business',
    title: 'Loyalty Program for Small Business in India: How to Start',
    description: 'How to start a customer loyalty program for a small shop in India: pick a simple rule, a reward you can afford, and a way to track visits. Free to start.',
    eyebrow: 'Small business loyalty',
    h1: 'How to start a loyalty program for your small shop',
    intro:
      'You don’t need a big budget, a card printer or a points system to reward regulars. A small shop’s loyalty program can be one sentence long — and that’s exactly why it works.',
    updated: UPDATED,
    blocks: [
      {
        h2: 'Why a small shop needs one',
        p: [
          'Most neighbourhood shops live on regulars: the same people buying milk, getting a haircut or ordering tiffin week after week. When one of them starts going to the shop down the road, you usually don’t notice until months later.',
          'A loyalty program gives regulars a small, clear reason to keep choosing you — and gives you a record of who comes and who has stopped.',
        ],
      },
      {
        h2: 'Five steps to set it up',
        steps: [
          { title: 'Pick one simple rule', text: 'Every N visits, one reward. “Every 6 visits, a free coffee” beats any table of points, levels and conditions.' },
          { title: 'Choose a reward you can afford', text: 'A small free item or service, not a free full bill. Something you sell often and that costs you little works best.' },
          { title: 'Decide how you’ll track visits', text: 'Paper cards get lost and are easy to fake. Tracking visits on the customer’s phone number is quick and keeps an honest record.' },
          { title: 'Tell every customer at the counter', text: 'One line while billing: “You’ve got your first stamp — 5 more and the next one’s free.” A counter poster helps people ask about it.' },
          { title: 'Bring back the ones who stop coming', text: 'Look at who hasn’t visited for a while and send them a friendly message. This is where a loyalty program pays for itself.' },
        ],
      },
      {
        h2: 'Picking the number of visits',
        p: [
          'Think about how often a regular comes. If they visit daily (milk, bread, newspaper), a reward every 8 to 10 visits still arrives within two weeks. If they come once a month (salon, optician), keep it to 3 to 5 visits so the reward doesn’t feel a year away.',
          'A good test: a regular should reach their first reward within a month or two.',
        ],
      },
      {
        h2: 'What a program for a small shop shouldn’t have',
        list: [
          'Points and conversion rates — customers stop reading after “1 point per ₹10”.',
          'A separate app for customers to download — most never will.',
          'Sign-up forms, PINs or OTPs at a busy counter.',
          'A reward so big it hurts your margin, or so small nobody cares.',
          'Rules that change every month.',
        ],
      },
      {
        h2: 'Doing it with Regularhood',
        p: [
          'Regularhood is built for exactly this. You set one rule — every N visits (3 to 10), one reward you choose. At the counter you type the customer’s phone number and tap Add visit. On the last visit the app says “Give the reward now”.',
          'You also get a printable counter poster and a WhatsApp status image with your rule, a list of customers who haven’t come back with a ready “we miss you” message, and an export of customers and visits to a spreadsheet. It works on any phone, tablet or computer, and it’s free to start.',
        ],
      },
    ],
    faqs: [
      { q: 'How much does a loyalty program cost a small shop?', a: 'The tool can be free — Regularhood is free to start. The real cost is the reward you give, so choose something you sell often that costs you little.' },
      { q: 'What is the best loyalty program for a small business?', a: 'The one your customers understand in one sentence and your staff can run without slowing the counter. A visit-based stamp card on the phone number is usually the simplest.' },
      { q: 'Should I give a discount or a free item?', a: 'A free item usually feels bigger to the customer than the same value as a discount, and it costs you less because you pay for it at your price, not the selling price.' },
      { q: 'Will my older customers be able to use it?', a: 'Yes. They don’t need a smartphone or an app. Their visits are counted on their phone number, and you see at the counter when a reward is due.' },
    ],
  },
  {
    slug: 'how-to-get-repeat-customers',
    name: 'How to get repeat customers',
    title: 'How to Get Repeat Customers: 10 Simple Ways for Small Shops in India',
    description: 'Get customers to come back again: remember names, give a reward every few visits, follow up on WhatsApp and see who stopped coming. 10 steps any shop can start today.',
    eyebrow: 'Repeat customers',
    h1: 'How to get repeat customers: 10 things that work for small shops',
    intro:
      'Getting a new customer through the door is hard. Getting the same customer to come back is easier, cheaper and what keeps a neighbourhood shop going. Here’s what actually works.',
    updated: ADDED_NOV19,
    blocks: [
      {
        h2: 'Make the first visit count',
        list: [
          '1. Learn names. “Welcome back, Sharma ji” is the cheapest loyalty program there is.',
          '2. Remember “the usual”. Noting what a regular buys — the same sugar level, the same cut — tells them you pay attention.',
          '3. Keep one thing reliably excellent. People come back for the thing they can’t get elsewhere: your samosa, your coffee, your fade.',
        ],
      },
      {
        h2: 'Give them a reason to return',
        list: [
          '4. Reward visits, not spending. A stamp per visit means the student buying one tea counts as much as the big shopper — and both come back.',
          '5. Make the reward close. If the first reward is within a few visits, customers start thinking “two more and it’s free”.',
          '6. Tell them their progress. Customers come back sooner when they know they’re one or two visits away from a reward.',
        ],
      },
      {
        h2: 'Stay in touch without being pushy',
        list: [
          '7. Use WhatsApp, not SMS blasts. A short personal message from the shop they know reads very differently from a bulk promotion.',
          '8. Post on your WhatsApp status. New stock, today’s special, your reward rule — your regulars already have your number.',
        ],
      },
      {
        h2: 'Win back the ones who drift away',
        list: [
          '9. Notice who stopped coming. Most shops find out months later, if at all. A list of customers who haven’t visited for a while tells you who to call.',
          '10. Send a “we miss you” message. Friendly, short, with a reason to drop by — often their reward is just one or two visits away.',
        ],
      },
      {
        h2: 'Doing all of this without extra work',
        p: [
          'Regularhood puts several of these into one tap at the counter. You type the customer’s phone number and tap Add visit: their stamp is counted, regulars’ numbers are suggested after 4 digits, and the app tells you when to give the reward.',
          'With one tap you can send a customer their card on WhatsApp, showing how many visits are left. The app also lists customers who haven’t come back for a while, with a ready “we miss you” message, and makes a WhatsApp status image with your rule. It’s free to start.',
        ],
      },
    ],
    faqs: [
      { q: 'What is the fastest way to get repeat customers?', a: 'Give every customer a clear reason to come back on their very first visit: tell them the rule (for example, every 5 visits a free gift) and add their first stamp right away. A reward they can already see works better than a discount they forget.' },
      { q: 'What is the fastest way to get repeat customers?', a: 'Start a simple visit reward today and tell every customer about it at the counter. “Every 5 visits, one free” is easy to explain and gives people a reason to choose you next time.' },
      { q: 'How do I bring back customers who stopped coming?', a: 'First find out who they are — keep a record of visits by phone number. Then send a short, friendly WhatsApp message. Mention their reward if they’re close to it.' },
      { q: 'Do discounts bring customers back?', a: 'Discounts bring people in once, but they often wait for the next discount. A reward for coming back again and again builds the habit of visiting your shop.' },
      { q: 'Is WhatsApp good for small shop marketing?', a: 'Yes, when it’s personal and occasional. Customers already message shops they know on WhatsApp, so a short note from you feels natural, not like an advert.' },
    ],
  },
  {
    slug: 'loyalty-reward-ideas',
    name: 'Loyalty reward ideas',
    title: 'Loyalty Reward Ideas for Small Shops — by Type of Shop',
    description: 'Reward ideas for your shop’s loyalty card: what salons, kirana stores, bakeries, gyms and more can give every few visits without hurting margins.',
    eyebrow: 'Reward ideas',
    h1: 'Loyalty reward ideas your customers will actually come back for',
    intro:
      'The best loyalty reward is one the customer wants and the shop barely notices. Here’s how to pick yours, with ideas for the most common kinds of shops.',
    updated: UPDATED,
    blocks: [
      {
        h2: 'Three rules for a good reward',
        list: [
          'Something you already sell. It costs you your price, not the price on the menu.',
          'Small but wanted. A free item, an add-on or a small service — not a free full bill.',
          'Easy to say in one line. “Every 5 visits, a free pastry” is remembered; “10% off above ₹500” isn’t.',
        ],
      },
      {
        h2: 'Ideas by type of shop',
        table: {
          head: ['Shop', 'Reward idea', 'Every'],
          rows: [
            ['Café', 'A free coffee or a cookie', '6 to 8 visits'],
            ['Bakery & sweet shop', 'A free pastry or 250 g of a sweet', '6 to 8 visits'],
            ['Kirana store', 'A free packet of biscuits or a small item', '8 to 10 visits'],
            ['Salon & barber shop', 'A free head massage or beard trim', '4 to 5 visits'],
            ['Beauty parlour', 'A free threading or face cleanup', '4 to 5 visits'],
            ['Juice bar', 'A free small juice', '6 to 8 visits'],
            ['Gym', 'A free guest pass or a protein shake', '8 to 10 visits'],
            ['Tiffin service', 'A free meal', '10 visits'],
            ['Laundry & dry cleaning', 'One shirt ironed free', '5 to 6 visits'],
            ['Pharmacy', 'A free small health item', '5 to 6 visits'],
            ['Mobile repair shop', 'A free screen guard', '3 to 4 visits'],
          ],
        },
      },
      {
        h2: 'How many visits before the reward?',
        p: [
          'Match it to how often a regular comes. Daily shops can ask for 8 to 10 visits; monthly shops should keep it to 3 to 5. A regular should reach their first reward within a month or two, or they forget about it.',
          'You can always change it later. With Regularhood, customers keep the visits they already have when you change the rule.',
        ],
      },
      {
        h2: 'Rewards that tend to backfire',
        list: [
          'A free full bill or a big discount — it eats the profit of all the visits before it.',
          'A reward only for big spenders — your most loyal customers are often small, frequent buyers.',
          'Something you don’t stock — the customer arrives for their reward and you don’t have it.',
          'Changing the reward often — customers stop trusting it.',
        ],
      },
      {
        h2: 'Set your reward in Regularhood',
        p: [
          'In Regularhood you set one rule: every N visits (3 to 10), one reward you choose. The app counts the visits on the customer’s phone number and tells you at the counter when to give the reward. You also get a printable counter poster and a WhatsApp status image with your rule, so customers know about it. Free to start.',
        ],
      },
    ],
    faqs: [
      { q: 'What is a good loyalty reward for a small shop?', a: 'A small free item or service that you sell often and that costs you little — a free pastry, a free juice, a free head massage. It should be worth coming back for, but not a free full bill.' },
      { q: 'How many visits should a loyalty card need?', a: 'Usually between 3 and 10. Shops customers visit daily can ask for more visits; shops visited monthly should ask for fewer, so the first reward arrives within a month or two.' },
      { q: 'Is a free item better than a discount?', a: 'Usually yes. A free item feels like a gift, and it costs you less than the same value as a discount because you pay your own price for it.' },
      { q: 'Can I change my reward later?', a: 'Yes. In Regularhood you can change the reward or the number of visits anytime in Settings, and customers keep the visits they already have.' },
    ],
  },
  {
    slug: 'whatsapp-loyalty-card',
    name: 'WhatsApp loyalty card',
    title: 'WhatsApp Loyalty Card: Send Customers Their Stamps',
    description: 'Send customers their loyalty card on WhatsApp: their stamps and visits left, in Hindi or English, opening in the browser. No app, no QR code. Free to start.',
    eyebrow: 'Loyalty on WhatsApp',
    h1: 'A loyalty card your customers get on WhatsApp',
    intro:
      'Your customers already have WhatsApp, and they already message shops they know on it. So that’s where their loyalty card should be — not in another app they’ll never download.',
    updated: UPDATED,
    blocks: [
      {
        h2: 'How it works',
        steps: [
          { title: 'Add the visit at the counter', text: 'Type the customer’s phone number and tap Add visit. Their stamp is counted on their number.' },
          { title: 'Send the card with one tap', text: 'One tap opens WhatsApp with a message to the customer that links to their card.' },
          { title: 'They open it in the browser', text: 'The card shows their stamps and how many visits are left for the reward, in Hindi or English. Nothing to install, nothing to sign up for.' },
        ],
      },
      {
        h2: 'Why WhatsApp works better than an app',
        p: [
          'Ask a customer to install an app at the counter and most will say “later”. A WhatsApp message needs nothing: it arrives where they already chat with family and friends, and the card opens in their phone’s browser.',
          'It also keeps your shop in their chat list. Next time they want to ask whether you have something in stock, your message is right there.',
        ],
      },
      {
        h2: 'Bring back customers on WhatsApp',
        p: [
          'Regularhood keeps a list of customers who haven’t come back for a while. Next to each one is a ready “we miss you” WhatsApp message — you just tap and send it from your own WhatsApp.',
          'The app also makes a WhatsApp status image with your shop’s rule, so everyone who has your number sees that you reward regulars.',
        ],
      },
      {
        h2: 'Good WhatsApp manners for shops',
        list: [
          'Send messages one by one to people who know your shop, not bulk blasts to strangers.',
          'Keep it short and useful: their card, a reward that’s close, a new item they usually buy.',
          'Don’t message every day. Once in a while from a shop they like is welcome; every day is spam.',
        ],
      },
      {
        h2: 'Customers without WhatsApp',
        p: [
          'They still get their stamps. Visits count on the phone number, so the card works whether or not they have a smartphone — the app tells you at the counter when their reward is due.',
        ],
      },
    ],
    faqs: [
      { q: 'Do I need the WhatsApp Business app?', a: 'No. The card is sent from the WhatsApp you already use on your phone — regular WhatsApp or WhatsApp Business both work.' },
      { q: 'Does the customer need to install anything?', a: 'No. The WhatsApp message has a link, and their card opens in the phone’s browser. No app, no sign-up and no PIN.' },
      { q: 'Can the card be in Hindi?', a: 'Yes. The card the customer opens shows their stamps and visits left in Hindi or English.' },
      { q: 'Is it free?', a: 'Regularhood is free to start, and sending a card from your own WhatsApp costs nothing extra.' },
    ],
  },
  {
    slug: 'how-to-increase-shop-sales',
    name: 'How to increase shop sales',
    title: 'How to Increase Sales in Your Shop: 8 Ideas That Cost Little',
    description: 'Practical ways for a small shop in India to increase sales: more visits from regulars, a reward worth coming back for, WhatsApp and your counter. Free to start.',
    eyebrow: 'Shop sales',
    h1: 'How to increase sales in your shop without spending on ads',
    intro:
      'Most small shops try to grow by finding new customers. But the quickest extra sales usually come from people who already know you: a regular who comes once more a month adds up faster than any pamphlet.',
    updated: ADDED,
    blocks: [
      {
        h2: 'Where a shop’s sales come from',
        p: [
          'Sales are three things multiplied together: how many customers you have, how often they come and how much they buy each time. Most advice is about the first one, which is also the most expensive to change.',
          'How often a regular comes is the easiest to move. One extra visit a month from your regulars needs no new customers, no ads and no discount.',
        ],
      },
      {
        h2: 'Eight ideas to try',
        steps: [
          { title: 'Reward visits', text: 'A simple card — every 5 visits, a small free gift — gives regulars a reason to choose you over the shop next door.' },
          { title: 'Tell customers how close they are', text: 'People come back sooner when they know they’re one or two visits away from a reward.' },
          { title: 'Put your offer on the counter', text: 'A small poster where people pay starts the conversation for you, even when the counter is busy.' },
          { title: 'Use your WhatsApp status', text: 'Your regulars already have your number. New stock, today’s special and your reward rule reach them for free.' },
          { title: 'Suggest one more thing', text: 'One honest suggestion at billing — the thing that goes with what they’re buying — raises the bill without feeling like selling.' },
          { title: 'Keep the bestsellers in stock', text: 'A customer who comes for their usual and doesn’t find it may try another shop, and stay there.' },
          { title: 'Notice who stopped coming', text: 'A regular who drifts away takes months of sales with them. Find out who they are while it’s still easy to win them back.' },
          { title: 'Send a friendly message', text: 'A short “we miss you” on WhatsApp, from the shop they know, brings many of them back.' },
        ],
      },
      {
        h2: 'What usually doesn’t work for small shops',
        list: [
          'Deep discounts — they bring people once, and teach them to wait for the next discount.',
          'Pamphlets and newspaper inserts — hard to know if they brought anyone.',
          'Bulk SMS to strangers — it reads like spam and gets ignored.',
          'A separate app for customers — most never download it.',
        ],
      },
      {
        h2: 'Doing it with Regularhood',
        p: [
          'Regularhood covers several of these in one tap at the counter. You set one rule — every N visits (3 to 10), one reward you choose — then type the customer’s phone number and tap Add visit. The app tells you when to give the reward.',
          'With one tap you can send a customer their card on WhatsApp, showing how many visits are left. You get a printable counter poster and a WhatsApp status image with your rule, and a list of customers who haven’t come back with a ready “we miss you” message. Free to start.',
        ],
      },
    ],
    faqs: [
      { q: 'What is the cheapest way to increase sales in a small shop?', a: 'Get your regulars to come a little more often. A simple visit reward and a counter poster cost almost nothing, and they work on people who already like your shop.' },
      { q: 'Should I give discounts to increase sales?', a: 'Use them carefully. A discount brings people once, but a small reward for coming back again and again builds the habit of choosing your shop.' },
      { q: 'How do I know if my regulars are coming less?', a: 'Keep a record of visits by phone number. Regularhood shows a list of customers who haven’t visited for a while, so you see it before it’s too late.' },
      { q: 'Do I need a website or social media to grow my shop?', a: 'Not to start. Your counter, your WhatsApp and your regulars are enough to grow sales. A website helps new people find you later.' },
    ],
  },
  {
    slug: 'win-back-old-customers',
    name: 'Win back old customers',
    title: 'How to Win Back Customers Who Stopped Coming to Your Shop',
    description: 'How a small shop can bring back old customers: find out who stopped coming, send a short WhatsApp message, and give them a reason to visit. Free to start.',
    eyebrow: 'Win back customers',
    h1: 'How to bring back customers who stopped coming',
    intro:
      'Every shop has them: the regular who used to come every week and quietly stopped. Usually nothing went wrong — they just got into a new habit. A small, friendly nudge is often all it takes to bring them back.',
    updated: ADDED,
    blocks: [
      {
        h2: 'Why customers drift away',
        list: [
          'They moved, changed jobs or their routine changed.',
          'A new shop opened on their way and was simply closer that day.',
          'They had one bad experience and didn’t say anything.',
          'Nobody noticed they were gone, so nobody asked.',
        ],
      },
      {
        h2: 'First, know who they are',
        p: [
          'You can’t bring back a customer you don’t know you’ve lost. In a busy shop, a regular who stops coming is noticed weeks or months later, if at all.',
          'Keeping a record of visits against each customer’s phone number fixes that. Then “who hasn’t come in the last month?” is a list, not a guess.',
        ],
      },
      {
        h2: 'Three steps to win them back',
        steps: [
          { title: 'Make the list', text: 'Find the customers who used to come regularly but haven’t visited for a while.' },
          { title: 'Send a short, personal message', text: 'One friendly WhatsApp message from the shop they know: you missed them, and you’d like to see them again.' },
          { title: 'Give them a reason to come', text: 'If they’re close to their reward, say so. “One more visit and your free gift is ready” is a good reason to drop by.' },
        ],
      },
      {
        h2: 'What to write',
        p: [
          'Keep it short, warm and from your shop’s name. Something like: “Hello, it’s been a while since we saw you at our shop. Your card has 4 of 5 stamps — one more visit and your free gift is ready. Hope to see you soon.”',
          'Send it once. If they don’t come back, don’t keep messaging; a second message weeks later is plenty.',
        ],
      },
      {
        h2: 'Doing it with Regularhood',
        p: [
          'Regularhood keeps a list of customers who haven’t come back for a while. Next to each one is a ready “we miss you” WhatsApp message — tap it and send it from your own WhatsApp.',
          'Because visits are counted on the customer’s phone number, the list builds itself while you work the counter. You can also export customers and visits to a spreadsheet. Free to start.',
        ],
      },
    ],
    faqs: [
      { q: 'How long before a customer counts as lost?', a: 'It depends on how often they used to come. A daily customer missing for two weeks is a sign; a monthly salon customer missing for two months is too.' },
      { q: 'Should I offer a discount to bring them back?', a: 'Usually you don’t need to. Reminding them that their reward is close is often enough, and it costs you nothing extra.' },
      { q: 'Is it okay to message customers on WhatsApp?', a: 'Yes, if they’re your customers, the message is personal and you don’t send it often. A short note from a shop they know is welcome; daily promotions are not.' },
      { q: 'What if they had a bad experience?', a: 'A personal message gives them a chance to tell you. Listen, fix it if you can, and thank them for telling you.' },
    ],
  },
  {
    slug: 'whatsapp-marketing-for-shops',
    name: 'WhatsApp marketing for shops',
    title: 'WhatsApp Marketing for Small Shops: What Works, What Annoys',
    description: 'How a small shop can use WhatsApp for marketing: status updates, personal messages and loyalty cards, without spamming customers. Free to start.',
    eyebrow: 'WhatsApp for shops',
    h1: 'WhatsApp marketing for your shop, without being annoying',
    intro:
      'For a neighbourhood shop, WhatsApp is already the best marketing channel there is: your customers have it, they read it, and many already have your number. The trick is to use it like a shopkeeper, not like an advertiser.',
    updated: ADDED,
    blocks: [
      {
        h2: 'Three ways to use WhatsApp',
        table: {
          head: ['', 'Who sees it', 'Good for'],
          rows: [
            ['WhatsApp status', 'Everyone who has your number saved', 'New stock, today’s special, your reward rule'],
            ['Personal message', 'One customer', 'Their card, a reward that’s close, “we miss you”'],
            ['Broadcast list', 'Customers who saved your number', 'Rare news: new timings, a festive offer'],
          ],
        },
      },
      {
        h2: 'Make your status worth watching',
        list: [
          'Post a photo of something real: fresh stock, a finished haircut, today’s special.',
          'Keep the text short and clear, in the language your customers speak.',
          'Post your reward rule now and then, so new customers know about it.',
          'One or two posts a day is plenty.',
        ],
      },
      {
        h2: 'Messages customers actually like',
        p: [
          'The messages that work are personal and useful: their loyalty card with how many visits are left, a heads-up that their reward is one visit away, or a short note after they haven’t come for a while.',
          'The messages that annoy are the same promotion sent to everyone, every day. Send less, and make each one about the person reading it.',
        ],
      },
      {
        h2: 'Rules to keep',
        list: [
          'Message only people who are your customers.',
          'Don’t add customers to groups without asking.',
          'Stop when someone asks you to.',
          'Never send forwards or anything unrelated to your shop.',
        ],
      },
      {
        h2: 'Doing it with Regularhood',
        p: [
          'Regularhood gives you the WhatsApp pieces that bring customers back. One tap sends a customer their loyalty card: their stamps and how many visits are left, in Hindi or English, opening in the browser.',
          'The app also makes a WhatsApp status image with your shop’s rule, and keeps a list of customers who haven’t come back with a ready “we miss you” message. Everything is sent from your own WhatsApp. Free to start.',
        ],
      },
    ],
    faqs: [
      { q: 'Do I need WhatsApp Business for my shop?', a: 'It helps with a shop profile and timings, but it isn’t required. Regular WhatsApp works for status updates, messages and sending loyalty cards.' },
      { q: 'How often should a shop message customers?', a: 'Rarely, and only when it’s useful to them. A status update can be daily; personal messages a few times a month at most.' },
      { q: 'Is bulk WhatsApp messaging a good idea?', a: 'Not for a small shop. Bulk messages to people who don’t know you feel like spam, and they can get your number blocked or reported.' },
      { q: 'What should I post on my WhatsApp status?', a: 'Real photos of your stock or work, today’s special, new arrivals and your loyalty reward rule. Short and clear works best.' },
    ],
  },
  {
    slug: 'discount-vs-loyalty-reward',
    name: 'Discount or loyalty reward?',
    title: 'Discount vs Loyalty Reward: Which Is Better for Your Shop?',
    description: 'Should your shop give discounts or a loyalty reward? How each one affects profit and repeat visits, and when to use which. Free to start.',
    eyebrow: 'Discount or reward',
    h1: 'Discount or loyalty reward: which brings customers back?',
    intro:
      'Both give the customer something. But a discount and a loyalty reward teach customers very different habits — and cost your shop very differently.',
    updated: ADDED,
    blocks: [
      {
        h2: 'Side by side',
        table: {
          head: ['', 'Discount', 'Loyalty reward'],
          rows: [
            ['Who gets it', 'Everyone, including one-time buyers', 'Only people who keep coming back'],
            ['What it teaches', 'Wait for the next offer', 'Come back to finish the card'],
            ['What it costs you', 'Taken off every bill', 'One small item, every few visits'],
            ['How it feels', 'A price cut', 'A gift from the shop'],
            ['Easy to stop?', 'Customers notice when it ends', 'The card simply carries on'],
          ],
        },
      },
      {
        h2: 'Why a free item costs you less',
        p: [
          'A discount comes straight out of your margin on every bill. A free item costs you only what you paid for it, and you give it once every few visits.',
          'Customers also tend to value a free item more than the same amount as a discount. A free pastry feels like a gift; a few rupees off is forgotten by the time they leave.',
        ],
      },
      {
        h2: 'When a discount makes sense',
        list: [
          'Clearing old or seasonal stock.',
          'Opening week, to get people in the door the first time.',
          'A festival offer that everyone in the market is running.',
        ],
      },
      {
        h2: 'When a loyalty reward makes sense',
        list: [
          'You want regulars to choose you over the shop next door.',
          'Your customers come often — daily, weekly or monthly.',
          'You want to know who your regulars are and who stopped coming.',
        ],
      },
      {
        h2: 'Doing it with Regularhood',
        p: [
          'Regularhood is a loyalty reward without the paperwork. You set one rule — every N visits (3 to 10), one reward you choose. At the counter you type the customer’s phone number and tap Add visit, and the app tells you when to give the reward. No points, no QR codes and nothing for the customer to install. Free to start.',
        ],
      },
    ],
    faqs: [
      { q: 'Is a discount or a free gift better for customers?', a: 'For bringing people back, a free gift for repeat visits usually works better. It rewards loyalty instead of a single purchase.' },
      { q: 'Can I run a discount and a loyalty card together?', a: 'Yes. Use the discount for short offers like opening week or clearing stock, and keep the loyalty card running all year.' },
      { q: 'What reward should I give instead of a discount?', a: 'A small item or service you sell often and that costs you little — a free pastry, a free juice, a free head massage.' },
      { q: 'Will customers still come if I stop giving discounts?', a: 'Regulars come for your shop, not only the price. A reward for coming back gives them a reason to stay when the discount ends.' },
    ],
  },
  {
    slug: 'get-customers-for-new-shop',
    name: 'Customers for a new shop',
    title: 'How to Get Customers for a New Shop — and Make Them Regulars',
    description: 'Just opened a shop? How to get your first customers in the area and turn them into regulars with a simple reward, WhatsApp and your counter. Free to start.',
    eyebrow: 'New shop',
    h1: 'How to get customers for a new shop and turn them into regulars',
    intro:
      'The first weeks after opening decide a lot. People in the area will try you once out of curiosity. Whether they come a second and third time is what builds the shop.',
    updated: ADDED,
    blocks: [
      {
        h2: 'Get the first visit',
        list: [
          'Make the shop easy to notice: a clear board, good light and the door open.',
          'Tell the neighbours: nearby shops, societies and offices.',
          'Add your shop to Google Maps with photos, timings and your phone number.',
          'Put a WhatsApp status up every day of opening week.',
          'An opening-week offer is fine, but keep it short.',
        ],
      },
      {
        h2: 'Turn the first visit into a second',
        p: [
          'This is where most new shops lose people. The first visit was curiosity; the second needs a reason. Start your loyalty card on day one, so the very first customer leaves with a stamp and a goal.',
          'Say it at the counter: “That’s your first stamp — 4 more and the next one is a free gift.” A new customer with one stamp already has a reason to come back to you instead of the shop they used before.',
        ],
      },
      {
        h2: 'A plan for the first month',
        steps: [
          { title: 'Week 1: stamp everyone', text: 'Every customer gets a stamp and hears the rule. Put the poster on the counter.' },
          { title: 'Week 2: send the cards', text: 'Send customers their card on WhatsApp so they see how many visits are left.' },
          { title: 'Week 3: learn your regulars', text: 'Notice who has come back two or three times. Learn their names and their usual.' },
          { title: 'Week 4: bring back the one-timers', text: 'A short “hope to see you again” message to people who came once and haven’t returned.' },
        ],
      },
      {
        h2: 'Doing it with Regularhood',
        p: [
          'Regularhood takes a minute to set up, so it can be ready on opening day. You set one rule — every N visits (3 to 10), one reward you choose — and add visits by typing the customer’s phone number and tapping Add visit.',
          'You get a printable counter poster and a WhatsApp status image with your rule, one-tap WhatsApp cards for customers, and a list of customers who haven’t come back with a ready message. Free to start.',
        ],
      },
    ],
    faqs: [
      { q: 'How do I attract customers to a new shop?', a: 'Make the shop visible, tell everyone nearby, get on Google Maps and use your WhatsApp status. Then give first-time customers a reason to come back.' },
      { q: 'Should a new shop start a loyalty card right away?', a: 'Yes. The first weeks are when people decide whether to switch to you. A stamp on their first visit gives them a reason to return.' },
      { q: 'Is an opening offer a good idea?', a: 'A short one is. Keep it to opening week, so customers come for the shop and not only for the offer.' },
      { q: 'How long does it take to build regular customers?', a: 'It depends on your kind of shop, but a simple reward and a friendly counter usually show you your first regulars within the first month.' },
    ],
  },
  {
    slug: 'salon-loyalty-program',
    name: 'Salon loyalty program',
    title: 'Salon Loyalty Program: How to Run One That Brings Clients Back',
    description: 'How to run a loyalty program for your salon or parlour: how many visits, which reward, filling slow days and bringing back clients who stopped coming. Free to start.',
    eyebrow: 'Salon loyalty',
    h1: 'How to run a salon loyalty program that clients actually use',
    intro:
      'A salon lives on clients who come back every few weeks. Most of them don’t leave because of a bad haircut — they just try the new place on the way home once, and then again. A simple loyalty program gives them a reason to keep their chair at your salon.',
    updated: ADDED_OCT26,
    blocks: [
      {
        h2: 'Why salons need a different plan',
        p: [
          'A café customer may come every day; a salon client comes every three to six weeks. That changes everything about a loyalty card. Ask for 10 visits and the first reward is a year away, so nobody cares about it.',
          'Salon clients also choose a person, not just a shop. When a stylist leaves, clients often follow. A program that rewards visits to your salon — not to one stylist — helps keep them with you.',
        ],
      },
      {
        h2: 'How many visits before the reward',
        table: {
          head: ['Service', 'A regular comes every', 'Reward every'],
          rows: [
            ['Men’s haircut & beard', '2 to 4 weeks', '4 to 5 visits'],
            ['Women’s haircut', '6 to 8 weeks', '3 to 4 visits'],
            ['Threading & waxing', '2 to 4 weeks', '5 visits'],
            ['Facial & cleanup', '3 to 5 weeks', '4 visits'],
            ['Hair colour', '6 to 8 weeks', '3 visits'],
          ],
        },
        p: ['A good test: a regular should reach their first reward within two or three months. If you offer many services, count visits, not services, and pick one number for everyone.'],
      },
      {
        h2: 'Rewards that work in a salon',
        list: [
          'A free head massage — clients love it and it costs you ten minutes.',
          'A free beard trim or threading on top of the regular service.',
          'A free hair wash and blow-dry.',
          'A free face cleanup or a hair spa for clients who come for bigger services.',
          'Avoid a free full haircut or facial — it costs as much as the visits before it earned you.',
        ],
      },
      {
        h2: 'Use it to fill slow days',
        p: [
          'Most salons are full on weekends and quiet on weekday afternoons. Your loyalty card can move some of that. Tell regulars at the counter and on your WhatsApp status that the reward is easiest to enjoy on a weekday, when there’s no waiting.',
          'When a client is one visit away from their reward, a short WhatsApp message on a quiet morning — “your free head massage is ready, we have a free chair today” — often brings them in the same day.',
        ],
      },
      {
        h2: 'Bring back clients who stopped coming',
        p: [
          'In a busy salon, a client who stops coming is noticed months later, if at all. If you keep visits on each client’s phone number, you can see who hasn’t been back in two months and send them one friendly message.',
          'Keep it personal and short, from your salon’s name: you missed them, and if their reward is close, say so.',
        ],
      },
      {
        h2: 'Doing it with Regularhood',
        p: [
          'Regularhood is a stamp card on the client’s phone number. You set one rule — every N visits (3 to 10), one reward you choose. At the counter you type the client’s number and tap Add visit; on the last visit the app says “Give the reward now”.',
          'With one tap you can send a client their card on WhatsApp, showing how many visits are left, in Hindi or English. You also get a printable counter poster, a WhatsApp status image with your rule, and a list of clients who haven’t come back with a ready “we miss you” message. Free to start.',
        ],
      },
    ],
    faqs: [
      { q: 'What is a good loyalty reward for a salon?', a: 'A small service you can give quickly that clients enjoy: a free head massage, a beard trim, threading or a hair wash. Avoid giving away a full haircut or facial.' },
      { q: 'How many visits should a salon loyalty card need?', a: 'Usually 3 to 5, because salon clients come every few weeks. The first reward should arrive within two or three months.' },
      { q: 'Should a salon count visits or money spent?', a: 'Visits are simpler and fairer. A client who comes for a quick trim every month is just as loyal as one who comes for colour, and both should feel close to a reward.' },
      { q: 'Do clients need to install an app?', a: 'No. With Regularhood the visits are counted on the client’s phone number, and their card opens from a WhatsApp link in the browser.' },
      { q: 'Does it work for a beauty parlour or barber shop?', a: 'Yes. Any place where the same people come back every few weeks can use the same simple visit card.' },
    ],
  },
  {
    slug: 'messages-to-bring-customers-back',
    name: 'Messages to bring customers back',
    title: 'Messages to Bring Customers Back: WhatsApp Templates for Shops',
    description: 'Short, polite messages to ask customers to come back, with offer ideas like a free add-on or 10% off. Copy-ready WhatsApp templates for salons and shops.',
    eyebrow: 'Message templates',
    h1: 'Short, polite messages that ask customers to come back',
    intro:
      'Asking a customer to come back can feel pushy, so most shops never do it. It doesn’t have to be. A short, polite message from a shop they know, with a small reason to visit, is welcome. Here are messages you can copy, change and send today.',
    updated: ADDED_OCT26,
    blocks: [
      {
        h2: 'What makes a good message',
        list: [
          'Short: two or three lines that fit on the phone screen without scrolling.',
          'Polite and personal: their name, your shop’s name, no capital letters or ten emojis.',
          'One clear reason to come: a reward that’s close, a free add-on, a new item.',
          'Sent once: one message, not a series. A second one weeks later is plenty.',
        ],
      },
      {
        h2: 'Messages for a repeat visit or service',
        list: [
          '“Hello Priya ji, it’s been about a month since your last visit to Style Studio. Would you like to book your next appointment this week? We’d love to see you again.”',
          '“Hi Rahul, your haircut is probably due by now. Drop in any weekday afternoon — no waiting. — Style Studio”',
          '“Hello, this is Sharma Laundry. Your last order was two weeks ago — if you have clothes to give, we can pick them up tomorrow morning.”',
        ],
      },
      {
        h2: 'Messages when their reward is close',
        list: [
          '“Hello Anjali ji, you have 4 of 5 stamps at Sweet Corner. One more visit and your free gift is ready. See you soon!”',
          '“Hi Amit, just one visit left for your free head massage at Style Studio. It’s waiting for you.”',
        ],
      },
      {
        h2: 'Messages with an offer',
        list: [
          'Free add-on: “Hello Neha ji, on your next visit this month, a free hair wash comes with any haircut. Hope to see you soon. — Style Studio”',
          '10% off the next visit: “Hi Karan, thank you for coming in last week! Show this message on your next visit and get 10% off. Valid till the 30th.”',
          'Bring a friend: “Hello Pooja ji, bring a friend on your next visit and you both get a free threading. — Glow Parlour”',
          'New stock: “Hello, the fresh Kaju Katli you asked about is in today. We’ve kept some aside for you. — Sweet Corner”',
        ],
      },
      {
        h2: 'Messages for customers who stopped coming',
        list: [
          '“Hello Suresh ji, we haven’t seen you at Gupta General Store in a while — hope all is well. We’d be happy to see you again.”',
          '“Hi Meera, it’s been a few months since your last visit to Glow Parlour. Your card still has 3 stamps — two more and your free face cleanup is ready.”',
        ],
      },
      {
        h2: 'Which offer to choose',
        table: {
          head: ['Offer', 'Good for', 'Watch out for'],
          rows: [
            ['Free add-on', 'Salons, parlours, laundry, cafés', 'Pick something quick and cheap for you'],
            ['10% off next visit', 'Bigger bills, a one-time push', 'Customers waiting for the next discount'],
            ['Reward that’s close', 'Any shop with a loyalty card', 'Nothing — it costs no extra'],
            ['Bring a friend', 'Getting new customers', 'Keep the rule simple'],
            ['New stock', 'Kirana, sweet shops, boutiques', 'Only for things they actually buy'],
          ],
        },
        p: ['A free add-on usually feels bigger to the customer than a discount, and costs you less. Keep discounts for short pushes.'],
      },
      {
        h2: 'Doing it with Regularhood',
        p: [
          'Regularhood keeps a record of visits on each customer’s phone number, so you know who to message and how close they are to their reward. One tap sends a customer their card on WhatsApp, and the app lists customers who haven’t come back with a ready “we miss you” message. Everything is sent from your own WhatsApp. Free to start.',
        ],
      },
    ],
    faqs: [
      { q: 'How do I politely ask a customer to come back?', a: 'Send one short message from your shop’s name: greet them by name, say you’d like to see them again, and give one small reason to come, like a reward that’s close or a free add-on.' },
      { q: 'What offer brings repeat customers?', a: 'A free add-on or a reward for repeat visits usually works better than a discount. It feels like a gift and doesn’t teach customers to wait for the next sale.' },
      { q: 'How often can I message customers?', a: 'Rarely. One message when it’s useful to them — a due service, a close reward, a long gap — is welcome. Daily messages feel like spam.' },
      { q: 'Should I send these on WhatsApp or SMS?', a: 'WhatsApp, if they have it. Customers already chat with shops they know there, and a personal message reads very differently from a bulk SMS.' },
    ],
  },
  {
    slug: 'follow-up-message-for-repeat-service',
    name: 'Follow-up message for repeat service',
    title: 'Short, Polite Follow-Up Message for Repeat Service or Order (Samples + Offers)',
    description: 'Sample short and polite follow-up messages asking a customer for a repeat service or order, with offers to attract repeat customers: free add-ons, free delivery, 10% discount. Copy and use.',
    eyebrow: 'Follow-up messages',
    h1: 'How to write a follow-up message asking a customer to come back',
    intro:
      'A good follow-up message has three parts: a polite greeting that shows you remember them, one small offer that gives them a reason to come, and a clear, easy next step. Below is a simple way to write one, the offers that work best, and finished examples you can copy.',
    updated: ADDED_NOV10,
    blocks: [
      {
        h2: 'Step 1: Write a short and polite message',
        steps: [
          { title: 'Greet them by name', text: '“Hello Priya ji” reads like a person. “Dear Customer” reads like a bulk message.' },
          { title: 'Say who you are and when they last came', text: '“It’s been about a month since your last visit to Style Studio” shows you remember them.' },
          { title: 'Make one easy ask', text: '“Would you like to book your next visit this week?” — one question, nothing to fill in.' },
          { title: 'End warmly, with the shop’s name', text: '“We’d love to see you again. — Style Studio”' },
        ],
      },
      {
        h2: 'Step 2: Pick an offer that brings repeat customers',
        table: {
          head: ['Offer', 'Example', 'Works best for'],
          rows: [
            ['Free add-on', 'A free hair wash with any haircut', 'Salons, parlours, spas, laundry'],
            ['10% discount', '10% off your next visit, valid till the 30th', 'A one-time push, bigger bills'],
            ['Free gift', 'A small free gift on your next order', 'Shops, bakeries, boutiques'],
            ['Free delivery', 'Free home delivery on your next order', 'Kirana, pharmacy, tiffin'],
            ['Reward that’s close', 'One more visit and your free gift is ready', 'Any shop with a loyalty card'],
          ],
        },
        p: ['Choose one offer per message. Two or three offers together look like an advertisement and the customer remembers none of them.'],
      },
      {
        h2: 'Step 3: The finished message — examples',
        list: [
          'Repeat service (salon): “Hello Priya ji, it’s been about a month since your last visit to Style Studio. Book your next haircut this week and get a free hair wash with it. We’d love to see you again!”',
          'Repeat service (laundry): “Hi Rahul, this is Sharma Laundry. It’s been two weeks since your last order — give us your clothes this week and get 10% off. We can pick them up tomorrow morning.”',
          'Repeat order (shop): “Hello Anjali ji, thank you for shopping at Gupta Store last month. On your next order you get a small free gift and free home delivery. Just reply to this message with your list.”',
          'Reward is close: “Hi Amit, you have 4 of 5 stamps at Sweet Corner. One more visit and your free gift is ready. See you soon!”',
        ],
      },
      {
        h2: 'Mistakes to avoid',
        list: [
          'Long paragraphs — keep it to two or three lines.',
          'All capitals, many emojis or “LIMITED OFFER!!!”.',
          'Sending the same message every week.',
          'An offer without a date — add “valid till the 30th” so it feels real.',
          'Forgetting your shop’s name, so they don’t know who wrote.',
        ],
      },
      {
        h2: 'Knowing who to send it to',
        p: [
          'The hardest part isn’t writing the message — it’s knowing which customers haven’t come back. Regularhood counts visits on each customer’s phone number, shows a list of customers who haven’t returned for a while, and gives you a ready “we miss you” WhatsApp message for each, sent from your own WhatsApp. Free to start.',
        ],
      },
    ],
    faqs: [
      { q: 'How do I write a polite message asking a customer for a repeat service?', a: 'Greet them by name, say when they last visited, give one small offer like a free add-on or 10% off, and ask one easy question such as “Would you like to book this week?”. Sign off with your shop’s name.' },
      { q: 'What offers attract repeat customers?', a: 'A free add-on, a small free gift, free delivery, 10% off the next visit, or a reminder that their loyalty reward is close. Free add-ons usually feel bigger to the customer and cost you less than a discount.' },
      { q: 'How long should a follow-up message be?', a: 'Two or three short lines — short enough to read on the phone lock screen without opening the chat.' },
      { q: 'When should I send a follow-up message?', a: 'Around the time they’d usually come back: a month after a haircut, two weeks after a laundry order, or when they’re one visit away from a reward.' },
    ],
  },
  {
    slug: 'restaurant-loyalty-program',
    name: 'Restaurant loyalty program',
    title: 'Restaurant Loyalty Program in India: Simple Setup, No App',
    description: 'How to run a loyalty program for a restaurant, dhaba or café in India: a visit card on the customer’s phone number, rewards that protect your margin, WhatsApp follow-ups. Free to start.',
    eyebrow: 'Restaurant loyalty',
    h1: 'A loyalty program for your restaurant that guests actually use',
    intro:
      'Big restaurant chains run loyalty apps with points, tiers and wallets. A neighbourhood restaurant doesn’t need any of that. Guests who eat with you twice a month already like you — they just need a small reason to choose you over the new place down the road.',
    updated: ADDED_NOV10,
    blocks: [
      {
        h2: 'Why points apps don’t work for most restaurants',
        list: [
          'Guests won’t download an app to eat a meal.',
          '“1 point per ₹100, 500 points = ₹50” is too much maths at the billing counter.',
          'QR codes at the table need the guest to scan, sign up and remember a login.',
          'Most of these tools charge monthly fees built for chains, not a single outlet.',
        ],
      },
      {
        h2: 'The simple version: visits, not points',
        steps: [
          { title: 'Count visits on the phone number', text: 'At billing, type the guest’s number and add a visit. Nothing for the guest to install or sign up for.' },
          { title: 'Set one rule', text: 'Every 5 visits, a free dessert or starter. One sentence the staff can say and the guest can remember.' },
          { title: 'Tell the guest at the table or counter', text: '“You’ve got your first stamp — four more and your dessert is on us.”' },
          { title: 'Bring back the ones who stop coming', text: 'A family that ate every Sunday and hasn’t come for a month gets a short, warm WhatsApp message.' },
        ],
      },
      {
        h2: 'Reward ideas that protect your margin',
        table: {
          head: ['Reward', 'Why it works'],
          rows: [
            ['Free dessert', 'High perceived value, low food cost'],
            ['Free starter', 'Guests often order more mains around it'],
            ['Free lassi or cold drink', 'Cheap for you, feels generous'],
            ['Free delivery on the next order', 'Moves regulars to your own ordering, not an aggregator'],
            ['A dish of the guest’s choice under ₹150', 'Feels personal, capped cost'],
          ],
        },
        p: ['Avoid “free full meal” or flat bill discounts — they cost far more than they bring back.'],
      },
      {
        h2: 'How many visits per reward',
        p: [
          'For a lunch place or dhaba with daily regulars, 8 to 10 visits works. For a family restaurant people visit a few times a month, keep it to 4 or 5 so the reward arrives within two months.',
        ],
      },
      {
        h2: 'Doing it with Regularhood',
        p: [
          'Regularhood is a visit card on the guest’s phone number. You choose the rule — every N visits (3 to 10), one reward — and at billing you type the number and tap Add visit. The app tells you when the reward is due.',
          'You can send guests their card on WhatsApp in one tap, print a counter poster with your rule, and see a list of guests who haven’t come back with a ready “we miss you” message. Works on any phone, tablet or computer. Free to start.',
        ],
      },
    ],
    faqs: [
      { q: 'What is the best loyalty program for a small restaurant?', a: 'A visit-based card on the guest’s phone number: every few visits, one free dish. No app for the guest, nothing to explain, and staff can run it in seconds at billing.' },
      { q: 'Do restaurant guests need to download an app?', a: 'Not with Regularhood. Their visits are saved on their phone number, and their card opens from a WhatsApp link in the browser.' },
      { q: 'Does it work for dhabas, cafés and cloud kitchens?', a: 'Yes. Any place where the same people come back — dine-in or delivery — can count visits and reward them.' },
      { q: 'How much does a restaurant loyalty program cost?', a: 'Regularhood is free to start. The real cost is the reward itself, so pick something with a low food cost like a dessert or a drink.' },
    ],
  },
  {
    slug: 'visit-our-store-messages',
    name: 'Visit our store messages',
    title: 'Visit Our Store Message: 15 Short Invites for Shops (Copy & Send)',
    description: 'Short, friendly “visit our store” messages for WhatsApp and SMS: new shop, new stock, festival, weekend and “we miss you” invites. Copy, add your shop name and send.',
    eyebrow: 'Message templates',
    h1: '“Visit our store” messages that people actually read',
    intro:
      'A good invite is short, comes from a shop the customer knows and gives one clear reason to drop by. Here are ready messages for the moments that matter, plus a few rules so they never feel like spam. Change the words in [brackets] and send.',
    updated: ADDED_NOV19,
    blocks: [
      {
        h2: 'What makes a “visit our store” message work',
        list: [
          'It comes from your shop’s own number, with the customer’s name. A message from an unknown number reads like an ad.',
          'One reason to visit: new stock, a festival, a reward that’s close. Not five offers at once.',
          'Two or three lines. If it needs scrolling, it won’t be read.',
          'It ends with your shop name, so nobody has to guess who wrote it.',
        ],
      },
      {
        h2: 'New shop or opening',
        list: [
          'Namaste [Name], we’ve just opened [Shop name] at [landmark]. Come say hello this week, your first visit gets a small welcome gift. — [Shop name]',
          'Hi [Name], [Shop name] is now open near [landmark], [timings]. Drop by when you’re passing, we’d love to meet you.',
          'Namaste [Name], thank you for coming on our first day. Do visit again, every 5th visit at [Shop name] gets a free gift.',
        ],
      },
      {
        h2: 'New stock or a new service',
        list: [
          'Hi [Name], the [item] you asked about has arrived at [Shop name]. Shall we keep one aside for you?',
          'Namaste [Name], fresh [winter / summer / festive] stock is in at [Shop name]. Come and have a look this week.',
          'Hi [Name], we’ve started [new service] at [Shop name]. Visit us and try it, your regular card still counts.',
        ],
      },
      {
        h2: 'Festival and weekend invites',
        list: [
          'Namaste [Name], [festival] is coming. Visit [Shop name] this week for your [festival] shopping, we’ve got everything ready.',
          'Hi [Name], weekend plans? [Shop name] is open till [time] on Saturday and Sunday. See you there.',
          'Wishing you and your family a happy [festival], [Name]. Do visit [Shop name] soon. — [Shop name]',
        ],
      },
      {
        h2: 'When a reward is close',
        list: [
          'Hi [Name], you’re just 1 visit away from your free [reward] at [Shop name]. See you soon.',
          'Namaste [Name], your card at [Shop name] has 4 of 5 stamps. One more visit and the [reward] is yours.',
          'Hi [Name], your free [reward] is ready at [Shop name]. Collect it on your next visit.',
        ],
      },
      {
        h2: 'For customers who haven’t come in a while',
        list: [
          'Namaste [Name], it’s been a while since we saw you at [Shop name]. Hope all is well. Do visit when you can.',
          'Hi [Name], we missed you at [Shop name]. Your stamps are still safe, come by and pick up where you left off.',
          'Namaste [Name], is everything okay? If something wasn’t right last time, tell us. We’d love to see you again. — [Shop name]',
        ],
      },
      {
        h2: 'How often to send',
        p: [
          'One personal message per customer is plenty for most months. A festival, a reward that’s close, or a long gap are good reasons. A daily forward is not: people mute or block shops that message too often.',
          'For everyone at once, use your WhatsApp status instead. Customers who saved your number see it without getting a message, so it never feels pushy.',
        ],
      },
      {
        h2: 'Doing it with Regularhood',
        p: [
          'Regularhood keeps a stamp card on each customer’s phone number. One tap sends a customer their card on WhatsApp, with their stamps and how many visits are left, in Hindi or English.',
          'It also lists customers who haven’t come back for a while, with a ready “we miss you” message, and gives you a WhatsApp status image with your reward rule. Free to start.',
        ],
      },
    ],
    faqs: [
      { q: 'How do I write a “visit our store” message?', a: 'Greet the customer by name, give one reason to visit (new stock, a festival or a reward that’s close), keep it to two or three lines and end with your shop name. Send it from your shop’s own number.' },
      { q: 'Should I send these messages to everyone?', a: 'Personal invites work best for people who have already visited and gave you their number. For everyone at once, post a WhatsApp status instead of messaging each person.' },
      { q: 'What can I offer to bring customers in?', a: 'A small, regular reward works better than a big one-time discount: for example, every 5 visits a free gift. Customers remember a simple rule and come back for it.' },
      { q: 'Can I send these messages in Hindi?', a: 'Yes. Write the way you talk to customers at the counter. Regularhood sends the customer’s card in Hindi or English.' },
    ],
  },
  {
    slug: 'identify-returning-customers-without-app',
    name: 'Know returning customers without an app',
    title: 'How to Identify Returning Customers Without an App',
    description: 'How a small shop can recognise repeat customers without asking them to install an app: use their phone number. Compare a register, paper cards and a digital stamp card.',
    eyebrow: 'Repeat customers',
    h1: 'How to know a customer is coming back, without asking them to install an app',
    intro:
      'Big chains know their regulars through apps and membership cards. A neighbourhood shop doesn’t need any of that. Almost every customer already carries one thing that identifies them: their phone number.',
    updated: ADDED_NOV19,
    blocks: [
      {
        h2: 'Why apps don’t work at a small shop',
        p: [
          'Asking a customer to download an app, sign up and open it at the counter takes a minute they don’t want to give. Most say “next time” and never do. QR codes have the same problem: camera, scan, wait for a page, sometimes a sign-up.',
          'Anything that needs the customer to do work will only ever reach a few of them. To know all your regulars, the shop has to do the remembering.',
        ],
      },
      {
        h2: 'The phone number is the customer’s ID',
        p: [
          'Nearly everyone knows their own number by heart, and is used to giving it at shops. It is unique, it doesn’t get lost, and it works for customers without a smartphone too.',
          'Once visits are saved against a number, you can see who came, how often, and who has stopped coming. That’s all most shops need.',
        ],
      },
      {
        h2: 'Three ways to keep track',
        table: {
          head: ['', 'Register or notebook', 'Paper stamp card', 'Digital card on the phone number'],
          rows: [
            ['Customer needs to carry something', 'No', 'Yes, the card', 'No'],
            ['Finding a regular quickly', 'Slow, flipping pages', 'Only if they bring it', 'Type a few digits'],
            ['Knowing who stopped coming', 'Hard', 'Impossible', 'A ready list'],
            ['Fake or extra stamps', 'Possible', 'Easy with a pen', 'One visit per number per day'],
            ['Messaging the customer', 'Copy the number by hand', 'No number saved', 'One tap on WhatsApp'],
          ],
        },
      },
      {
        h2: 'How it works at the counter with Regularhood',
        steps: [
          { title: 'Type the number', text: 'At billing, type the customer’s phone number. Regulars’ numbers are suggested after 4 digits, so it’s quick even at a busy counter.' },
          { title: 'Tap Add visit', text: 'The visit is saved. A new number becomes a customer on the spot, with no sign-up for them.' },
          { title: 'See their card', text: 'You see how many visits they have and when their reward is due. On the Nth visit the app says “Give the reward now”.' },
        ],
      },
      {
        h2: 'What you learn from it',
        list: [
          'Who your real regulars are, by number of visits.',
          'Who used to come and hasn’t been back for a while, so you can send a friendly message in time.',
          'How many new customers came this week, and how many returned.',
          'A spreadsheet of customers and visits whenever you want to export it.',
        ],
      },
      {
        h2: 'Asking for the number politely',
        p: [
          'Say why: “Shall I add your visit? Every 5 visits you get a free gift.” Most people are happy to give their number when there’s something in it for them and they know it won’t be misused.',
          'Never share the numbers or send bulk messages. A shop that respects its customers’ numbers keeps getting them.',
        ],
      },
    ],
    faqs: [
      { q: 'How do shops recognise returning customers without an app?', a: 'By saving each visit against the customer’s phone number. The next time, typing the number shows how many times they have come and whether a reward is due.' },
      { q: 'Does the customer need a smartphone?', a: 'No. Only their phone number is needed. Customers with WhatsApp can also get their card as a link that opens in the browser.' },
      { q: 'Is a register enough?', a: 'A register works for a few customers, but it’s slow to search and can’t tell you who stopped coming. A digital card on the phone number does both in seconds.' },
      { q: 'Is it free?', a: 'Regularhood is free to start. You can set up your card and add visits without paying.' },
    ],
  },
  {
    slug: 'customer-retention',
    name: 'Customer retention for shops',
    title: 'Customer Retention for Small Shops: Meaning and 6 Simple Ways',
    description: 'What customer retention means for a neighbourhood shop, why keeping regulars is cheaper than finding new ones, and 6 simple ways to keep customers coming back.',
    eyebrow: 'Customer retention',
    h1: 'Customer retention for small shops, in plain words',
    intro:
      'Customer retention just means your customers keep coming back. For a neighbourhood shop it is the difference between a quiet month and a steady one, and it costs far less than finding new people.',
    updated: ADDED_NOV19,
    blocks: [
      {
        h2: 'What customer retention means',
        p: [
          'Out of the people who bought from you once, how many come back, and how often? That is retention. A shop where most customers return every week has high retention. A shop where people come once and never again has low retention, however busy the opening week was.',
        ],
      },
      {
        h2: 'Why it matters more than new customers',
        list: [
          'A regular already trusts you. They don’t need an ad, a discount or a reason to try you.',
          'Regulars spend more over a year than a crowd of one-time visitors.',
          'Happy regulars bring their family and neighbours, for free.',
          'If 100 regulars visit just once more each month, that is 100 extra visits without any advertising.',
        ],
      },
      {
        h2: 'Six simple ways to keep customers',
        steps: [
          { title: 'Remember them', text: 'Greet regulars by name and remember their usual. It is the oldest retention trick and still the strongest.' },
          { title: 'Reward visits', text: 'A simple rule like every 5 visits a free gift gives people a reason to choose you over the shop next door.' },
          { title: 'Show how close the reward is', text: '“One more visit and your gift is ready” brings people back sooner.' },
          { title: 'Never run out of the usual', text: 'A regular who doesn’t find their daily item tries another shop, and may stay there.' },
          { title: 'Notice who stopped coming', text: 'Customers rarely complain. They just stop coming. Find out early.' },
          { title: 'Send one friendly message', text: 'A short “we miss you” on WhatsApp, from the shop they know, brings many back.' },
        ],
      },
      {
        h2: 'How to measure it without spreadsheets',
        p: [
          'Two numbers are enough: how many customers came back at least twice this month, and how many regulars haven’t been seen for a few weeks. If the first number grows and the second shrinks, your retention is improving.',
          'Regularhood shows both from the visits you add at the counter: every customer’s visit count, and a list of customers who haven’t come back for a while, with a ready “we miss you” message.',
        ],
      },
    ],
    faqs: [
      { q: 'What is customer retention in simple words?', a: 'It means customers who bought from you once keep coming back. The more of them return, and the more often, the higher your retention.' },
      { q: 'How can a small shop improve customer retention?', a: 'Remember regulars, reward visits with a simple rule, keep the usual items in stock, and send a friendly message to customers who stopped coming.' },
      { q: 'Is a loyalty program the same as customer retention?', a: 'No. Retention is the goal; a loyalty program is one way to reach it. A simple stamp card gives customers a clear reason to come back.' },
    ],
  },
];

const hi: Guide[] = [
  {
    slug: 'digital-stamp-card',
    name: 'डिजिटल स्टैम्प कार्ड',
    title: 'दुकानों के लिए डिजिटल स्टैम्प कार्ड — मुफ़्त, बिना ऐप',
    description: 'ग्राहक के फ़ोन नंबर पर डिजिटल स्टैम्प कार्ड: काउंटर पर Add visit दबाएँ, हर कुछ विज़िट पर इनाम दें। न ऐप, न QR कोड। शुरू करना मुफ़्त।',
    eyebrow: 'डिजिटल लॉयल्टी कार्ड',
    h1: 'ग्राहक के फ़ोन नंबर पर चलने वाला डिजिटल स्टैम्प कार्ड',
    intro:
      '“9 बार आइए, 10वीं बार मुफ़्त” वाला कागज़ का कार्ड काम करता है — जब तक वह खो न जाए, धुल न जाए या घर पर न छूट जाए। डिजिटल स्टैम्प कार्ड वही आसान तरीका है, बस कार्ड ग्राहक के मोबाइल नंबर पर रहता है।',
    updated: UPDATED,
    blocks: [
      {
        h2: 'डिजिटल स्टैम्प कार्ड क्या है',
        p: [
          'यह वही लॉयल्टी कार्ड है जिसे आपके ग्राहक पहले से समझते हैं: हर विज़िट पर एक स्टैम्प, और तय गिनती पूरी होने पर कुछ मुफ़्त। फ़र्क सिर्फ़ इतना है कि स्टैम्प कागज़ पर नहीं, ग्राहक के मोबाइल नंबर पर जमा होते हैं।',
          'इसलिए कार्ड खोता नहीं, आपके कार्ड ख़त्म नहीं होते, और ग्राहक को कुछ साथ लाना याद नहीं रखना पड़ता। नंबर है, तो कार्ड है।',
        ],
      },
      {
        h2: 'कागज़ का कार्ड या डिजिटल कार्ड?',
        table: {
          head: ['', 'कागज़ का स्टैम्प कार्ड', 'Regularhood डिजिटल कार्ड'],
          rows: [
            ['कार्ड खो गया', 'सारे स्टैम्प गए', 'खोने को कुछ नहीं — यह फ़ोन नंबर है'],
            ['कार्ड घर पर भूल गए', 'आज स्टैम्प नहीं', 'नंबर लिखें, स्टैम्प लग गया'],
            ['नकली या ज़्यादा स्टैम्प', 'पेन से आसान', 'एक नंबर पर दिन में एक स्टैम्प'],
            ['कौन आना बंद कर गया', 'पता नहीं चलता', 'जो वापस नहीं आए उनकी लिस्ट'],
            ['छपाई का ख़र्च', 'हर कुछ महीने', 'कोई नहीं'],
            ['बिना स्मार्टफ़ोन वाला ग्राहक', 'चलता है', 'चलता है — सिर्फ़ नंबर चाहिए'],
          ],
        },
      },
      {
        h2: 'काउंटर पर ऐसे काम करता है',
        steps: [
          { title: 'एक बार नियम तय करें', text: 'कितनी विज़िट पर इनाम (3 से 10) और इनाम क्या होगा — जैसे हर 5 विज़िट पर एक मुफ़्त तोहफ़ा।' },
          { title: 'नंबर लिखें, Add visit दबाएँ', text: 'काउंटर पर बस इतना ही काम है। पक्के ग्राहकों का नंबर 4 अंक लिखते ही दिख जाता है, और नया नंबर उसी समय ग्राहक बन जाता है।' },
          { title: 'ऐप बताए तब इनाम दें', text: 'आख़िरी विज़िट पर ऐप कहता है “अभी इनाम दें”। Given दबाएँ और कार्ड फिर से शुरू हो जाता है।' },
        ],
      },
      {
        h2: 'ग्राहक को क्या दिखता है',
        p: [
          'कुछ इंस्टॉल नहीं करना। एक टैप में आप उन्हें WhatsApp पर उनका कार्ड भेज सकते हैं: उसमें उनके स्टैम्प और इनाम तक बची विज़िट दिखती हैं, हिंदी या English में, और यह फ़ोन के ब्राउज़र में खुलता है।',
          'बिना स्मार्टफ़ोन वाले ग्राहकों के लिए भी चलता है। उनकी विज़िट नंबर पर गिनी जाती हैं, और इनाम का समय आने पर ऐप काउंटर पर ही बता देता है।',
        ],
      },
      {
        h2: 'QR कोड और पॉइंट्स क्यों नहीं',
        p: [
          'QR कोड वाले कार्ड में ग्राहक को कैमरा खोलना, स्कैन करना, पेज का इंतज़ार करना और कभी-कभी साइन अप करना पड़ता है — भीड़ वाले काउंटर पर ज़्यादातर लोग नहीं करते। पॉइंट्स में रेट और बैलेंस समझना पड़ता है। स्टैम्प कार्ड में कुछ नहीं: आइए, स्टैम्प लीजिए, इनाम पास है।',
          'नियम जितना आसान, लोग उतना ज़्यादा इस्तेमाल करते हैं। “हर 5 विज़िट पर हेड मसाज मुफ़्त” ग्राहक को याद रहता है और वह दोस्तों को भी बताता है।',
        ],
      },
      {
        h2: 'ग़लतियाँ जो ऐप होने नहीं देता',
        list: [
          'एक दिन में दो स्टैम्प: एक नंबर दिन में एक बार ही गिना जाता है, इसलिए दो बार टैप करने से दूसरा स्टैम्प नहीं लगता।',
          'ग़लत टैप: कोई भी विज़िट या इनाम वापस किया जा सकता है।',
          'पक्के ग्राहक का हिसाब भूलना: नंबर लिखते ही ऐप उनका कार्ड दिखा देता है।',
        ],
      },
    ],
    faqs: [
      { q: 'क्या डिजिटल स्टैम्प कार्ड सच में मुफ़्त है?', a: 'हाँ, शुरू करना मुफ़्त है। आप बिना कुछ दिए अपना कार्ड बना सकते हैं और विज़िट जोड़ सकते हैं।' },
      { q: 'क्या ग्राहकों को ऐप डाउनलोड करना होगा?', a: 'नहीं। उन्हें कुछ इंस्टॉल या साइन अप नहीं करना। आप उनके फ़ोन नंबर से विज़िट जोड़ते हैं, और उनका कार्ड WhatsApp लिंक से किसी भी ब्राउज़र में खुलता है।' },
      { q: 'दुकान पर मुझे क्या चाहिए?', a: 'इंटरनेट वाला कोई भी फ़ोन, टैबलेट या कंप्यूटर। Regularhood ब्राउज़र में खोलें या होम स्क्रीन पर जोड़ लें।' },
      { q: 'क्या कागज़ के कार्ड वाले ग्राहकों को इसमें ला सकते हैं?', a: 'हाँ। जब कागज़ के कार्ड वाला ग्राहक आए, उसके नंबर से विज़िट जोड़ दें। विज़िट वापस या ठीक की जा सकती हैं, तो पुराने स्टैम्प के बराबर कर सकते हैं।' },
      { q: 'क्या बाद में विज़िट की गिनती या इनाम बदल सकते हैं?', a: 'हाँ। Settings में कभी भी बदलें। ग्राहकों की पहले की विज़िट बनी रहती हैं।' },
    ],
  },
  {
    slug: 'loyalty-program-for-small-business',
    name: 'छोटी दुकान के लिए लॉयल्टी प्रोग्राम',
    title: 'छोटी दुकान के लिए लॉयल्टी प्रोग्राम कैसे शुरू करें',
    description: 'छोटी दुकान के लिए ग्राहक लॉयल्टी प्रोग्राम कैसे शुरू करें: आसान नियम, सस्ता इनाम और विज़िट गिनने का तरीका। शुरू करना मुफ़्त।',
    eyebrow: 'छोटी दुकान की लॉयल्टी',
    h1: 'अपनी छोटी दुकान के लिए लॉयल्टी प्रोग्राम कैसे शुरू करें',
    intro:
      'पक्के ग्राहकों को इनाम देने के लिए बड़ा बजट, कार्ड प्रिंटर या पॉइंट्स सिस्टम नहीं चाहिए। छोटी दुकान का लॉयल्टी प्रोग्राम एक लाइन का हो सकता है — और इसीलिए वह चलता है।',
    updated: UPDATED,
    blocks: [
      {
        h2: 'छोटी दुकान को इसकी ज़रूरत क्यों है',
        p: [
          'ज़्यादातर मोहल्ले की दुकानें पक्के ग्राहकों से चलती हैं: वही लोग हर हफ़्ते दूध लेते हैं, बाल कटवाते हैं या टिफ़िन मँगवाते हैं। जब उनमें से कोई पास की दूसरी दुकान पर जाने लगता है, तो अक्सर महीनों बाद पता चलता है।',
          'लॉयल्टी प्रोग्राम पक्के ग्राहकों को आपको चुनते रहने की एक छोटी, साफ़ वजह देता है — और आपको पता रहता है कि कौन आ रहा है और कौन आना बंद कर गया।',
        ],
      },
      {
        h2: 'शुरू करने के पाँच कदम',
        steps: [
          { title: 'एक आसान नियम चुनें', text: 'हर N विज़िट पर एक इनाम। “हर 6 विज़िट पर एक कॉफ़ी मुफ़्त” पॉइंट्स, लेवल और शर्तों वाली किसी भी टेबल से बेहतर है।' },
          { title: 'ऐसा इनाम चुनें जो आपको भारी न पड़े', text: 'कोई छोटी मुफ़्त चीज़ या सर्विस, पूरा बिल मुफ़्त नहीं। जो चीज़ आप अक्सर बेचते हैं और जिसकी लागत कम है, वह सबसे अच्छी रहती है।' },
          { title: 'तय करें कि विज़िट कैसे गिनेंगे', text: 'कागज़ के कार्ड खो जाते हैं और नकली बनाना आसान है। ग्राहक के फ़ोन नंबर पर विज़िट गिनना जल्दी होता है और हिसाब ईमानदार रहता है।' },
          { title: 'काउंटर पर हर ग्राहक को बताएँ', text: 'बिल बनाते समय एक लाइन: “आपका पहला स्टैम्प लग गया — 5 और, फिर अगली बार मुफ़्त।” काउंटर पोस्टर देखकर लोग ख़ुद पूछते हैं।' },
          { title: 'जो आना बंद कर दें, उन्हें वापस बुलाएँ', text: 'देखें कि कौन काफ़ी दिनों से नहीं आया और उसे एक दोस्ताना मैसेज भेजें। लॉयल्टी प्रोग्राम का असली फ़ायदा यहीं है।' },
        ],
      },
      {
        h2: 'कितनी विज़िट पर इनाम',
        p: [
          'सोचिए कि पक्का ग्राहक कितनी बार आता है। अगर रोज़ आता है (दूध, ब्रेड, अख़बार), तो 8 से 10 विज़िट पर इनाम भी दो हफ़्ते में मिल जाता है। अगर महीने में एक बार आता है (सैलून, चश्मे की दुकान), तो 3 से 5 विज़िट रखें ताकि इनाम साल भर दूर न लगे।',
          'अच्छी कसौटी: पक्के ग्राहक को पहला इनाम एक-दो महीने में मिल जाना चाहिए।',
        ],
      },
      {
        h2: 'छोटी दुकान के प्रोग्राम में क्या नहीं होना चाहिए',
        list: [
          'पॉइंट्स और रेट — “₹10 पर 1 पॉइंट” के बाद ग्राहक पढ़ना बंद कर देते हैं।',
          'ग्राहकों के लिए अलग ऐप — ज़्यादातर कभी डाउनलोड नहीं करते।',
          'भीड़ वाले काउंटर पर साइन अप फ़ॉर्म, PIN या OTP।',
          'इतना बड़ा इनाम कि मुनाफ़ा खा जाए, या इतना छोटा कि किसी को फ़र्क न पड़े।',
          'हर महीने बदलते नियम।',
        ],
      },
      {
        h2: 'Regularhood के साथ',
        p: [
          'Regularhood इसी काम के लिए बना है। आप एक नियम तय करते हैं — हर N विज़िट (3 से 10) पर आपका चुना हुआ एक इनाम। काउंटर पर ग्राहक का फ़ोन नंबर लिखें और Add visit दबाएँ। आख़िरी विज़िट पर ऐप कहता है “अभी इनाम दें”।',
          'साथ में मिलता है आपके नियम वाला काउंटर पोस्टर और WhatsApp स्टेटस इमेज, वापस न आने वाले ग्राहकों की लिस्ट और उनके लिए तैयार “हम आपको मिस कर रहे हैं” मैसेज, और ग्राहकों व विज़िट का स्प्रेडशीट एक्सपोर्ट। किसी भी फ़ोन, टैबलेट या कंप्यूटर पर चलता है, और शुरू करना मुफ़्त है।',
        ],
      },
    ],
    faqs: [
      { q: 'छोटी दुकान के लिए लॉयल्टी प्रोग्राम का ख़र्च कितना है?', a: 'टूल मुफ़्त हो सकता है — Regularhood शुरू करना मुफ़्त है। असली ख़र्च वह इनाम है जो आप देते हैं, इसलिए ऐसी चीज़ चुनें जो आप अक्सर बेचते हैं और जिसकी लागत कम है।' },
      { q: 'छोटी दुकान के लिए सबसे अच्छा लॉयल्टी प्रोग्राम कौन सा है?', a: 'जो ग्राहक एक लाइन में समझ जाएँ और जिससे काउंटर धीमा न हो। फ़ोन नंबर पर विज़िट गिनने वाला स्टैम्प कार्ड आमतौर पर सबसे आसान रहता है।' },
      { q: 'डिस्काउंट दें या मुफ़्त चीज़?', a: 'मुफ़्त चीज़ ग्राहक को उतने ही डिस्काउंट से बड़ी लगती है, और आपको सस्ती पड़ती है क्योंकि आप उसकी लागत देते हैं, बिक्री की क़ीमत नहीं।' },
      { q: 'क्या बुज़ुर्ग ग्राहक भी इसे इस्तेमाल कर पाएँगे?', a: 'हाँ। उन्हें स्मार्टफ़ोन या ऐप नहीं चाहिए। उनकी विज़िट फ़ोन नंबर पर गिनी जाती हैं, और इनाम का समय आने पर काउंटर पर दिख जाता है।' },
    ],
  },
  {
    slug: 'how-to-get-repeat-customers',
    name: 'ग्राहक को बार-बार कैसे बुलाएँ',
    title: 'ग्राहक कैसे बनाये और पक्का कैसे करें? 10 आसान तरीके',
    description: 'नया ग्राहक कैसे बनाये और उसे बार-बार कैसे बुलाएँ: नाम से पहचानें, हर कुछ विज़िट पर छोटा इनाम दें, WhatsApp पर संपर्क रखें। छोटी दुकानों के लिए 10 तरीके, आज से।',
    eyebrow: 'पक्के ग्राहक',
    h1: 'ग्राहक बार-बार कैसे आएँ: छोटी दुकानों के लिए 10 तरीके',
    intro:
      'नया ग्राहक लाना मुश्किल है। उसी ग्राहक को दोबारा बुलाना आसान है, सस्ता है, और मोहल्ले की दुकान इसी से चलती है। ये तरीके सच में काम करते हैं।',
    updated: ADDED_NOV19,
    blocks: [
      {
        h2: 'पहली विज़िट को यादगार बनाएँ',
        list: [
          '1. नाम याद रखें। “आइए शर्मा जी” सबसे सस्ता लॉयल्टी प्रोग्राम है।',
          '2. “रोज़ वाला” याद रखें। पक्का ग्राहक क्या लेता है — वही चीनी, वही कट — यह याद रखना बताता है कि आप ध्यान देते हैं।',
          '3. एक चीज़ हमेशा बढ़िया रखें। लोग उस चीज़ के लिए लौटते हैं जो कहीं और नहीं मिलती: आपका समोसा, आपकी कॉफ़ी, आपकी कटिंग।',
        ],
      },
      {
        h2: 'वापस आने की वजह दें',
        list: [
          '4. ख़र्च पर नहीं, विज़िट पर इनाम दें। हर विज़िट पर एक स्टैम्प — एक बिस्किट का पैकेट लेने वाला स्टूडेंट भी उतना ही गिना जाता है जितना बड़ा ग्राहक, और दोनों लौटते हैं।',
          '5. इनाम पास रखें। पहला इनाम कुछ ही विज़िट में हो, तो ग्राहक सोचने लगता है “बस दो और, फिर मुफ़्त”।',
          '6. उन्हें बताएँ कि इनाम कितना पास है। एक-दो विज़िट दूर हो, यह पता हो तो ग्राहक जल्दी लौटते हैं।',
        ],
      },
      {
        h2: 'बिना परेशान किए संपर्क में रहें',
        list: [
          '7. बल्क SMS नहीं, WhatsApp। जानी-पहचानी दुकान का छोटा, निजी मैसेज किसी विज्ञापन से बिल्कुल अलग लगता है।',
          '8. WhatsApp स्टेटस लगाएँ। नया माल, आज का स्पेशल, आपका इनाम का नियम — आपके पक्के ग्राहकों के पास पहले से आपका नंबर है।',
        ],
      },
      {
        h2: 'दूर हुए ग्राहकों को वापस बुलाएँ',
        list: [
          '9. देखें कि कौन आना बंद कर गया। ज़्यादातर दुकानों को महीनों बाद पता चलता है, या चलता ही नहीं। काफ़ी दिनों से न आए ग्राहकों की लिस्ट बताती है कि किसे याद करना है।',
          '10. “हम आपको मिस कर रहे हैं” मैसेज भेजें। दोस्ताना, छोटा, और आने की एक वजह के साथ — अक्सर उनका इनाम बस एक-दो विज़िट दूर होता है।',
        ],
      },
      {
        h2: 'यह सब, बिना ज़्यादा काम के',
        p: [
          'Regularhood इनमें से कई काम काउंटर पर एक टैप में कर देता है। ग्राहक का फ़ोन नंबर लिखें और Add visit दबाएँ: स्टैम्प गिन लिया जाता है, पक्के ग्राहकों का नंबर 4 अंक पर ही दिख जाता है, और इनाम का समय ऐप बताता है।',
          'एक टैप में ग्राहक को WhatsApp पर उसका कार्ड भेज सकते हैं, जिसमें बची विज़िट दिखती हैं। ऐप काफ़ी दिनों से न आए ग्राहकों की लिस्ट और तैयार “हम आपको मिस कर रहे हैं” मैसेज भी देता है, और आपके नियम वाली WhatsApp स्टेटस इमेज बनाता है। शुरू करना मुफ़्त है।',
        ],
      },
    ],
    faqs: [
      { q: 'अपने ग्राहक को कैसे जानें?', a: 'हर ग्राहक का नाम और फ़ोन नंबर लिखें, और याद रखें कि वह अक्सर क्या लेता है और कितने दिन में आता है। जब पता हो कि कौन हर हफ़्ते आता था और अब नहीं आया, तो उसे समय रहते याद किया जा सकता है।' },
      { q: 'पक्के ग्राहक बनाने का सबसे तेज़ तरीका क्या है?', a: 'आज ही विज़िट पर इनाम शुरू करें और काउंटर पर हर ग्राहक को बताएँ। “हर 5 विज़िट पर एक मुफ़्त” समझाना आसान है और अगली बार आपको चुनने की वजह देता है।' },
      { q: 'जो ग्राहक आना बंद कर दें, उन्हें कैसे वापस बुलाएँ?', a: 'पहले पता करें कि वे कौन हैं — फ़ोन नंबर पर विज़िट का हिसाब रखें। फिर एक छोटा, दोस्ताना WhatsApp मैसेज भेजें। अगर इनाम पास है, तो उसका ज़िक्र करें।' },
      { q: 'क्या डिस्काउंट से ग्राहक वापस आते हैं?', a: 'डिस्काउंट एक बार तो लोगों को लाता है, पर अक्सर वे अगले डिस्काउंट का इंतज़ार करते हैं। बार-बार आने पर इनाम आपकी दुकान पर आने की आदत बनाता है।' },
      { q: 'क्या छोटी दुकान के लिए WhatsApp अच्छा है?', a: 'हाँ, जब मैसेज निजी हो और कभी-कभार हो। ग्राहक जानी-पहचानी दुकानों से पहले ही WhatsApp पर बात करते हैं, तो आपका छोटा मैसेज विज्ञापन नहीं, सामान्य बात लगता है।' },
    ],
  },
  {
    slug: 'loyalty-reward-ideas',
    name: 'लॉयल्टी इनाम के आइडिया',
    title: 'छोटी दुकानों के लिए लॉयल्टी इनाम के आइडिया',
    description: 'आपकी दुकान के लॉयल्टी कार्ड के लिए इनाम के आइडिया: सैलून, किराना, बेकरी, जिम और बाक़ी दुकानें हर कुछ विज़िट पर क्या दे सकती हैं।',
    eyebrow: 'इनाम के आइडिया',
    h1: 'लॉयल्टी इनाम के आइडिया, जिनके लिए ग्राहक सच में लौटें',
    intro:
      'सबसे अच्छा इनाम वह है जो ग्राहक को चाहिए और दुकान को पता भी न चले। अपना इनाम ऐसे चुनें — आम दुकानों के लिए आइडिया नीचे हैं।',
    updated: UPDATED,
    blocks: [
      {
        h2: 'अच्छे इनाम के तीन नियम',
        list: [
          'जो आप पहले से बेचते हैं। आपको उसकी लागत पड़ती है, मेन्यू की क़ीमत नहीं।',
          'छोटा, पर ग्राहक को चाहिए। कोई मुफ़्त चीज़, ऐड-ऑन या छोटी सर्विस — पूरा बिल मुफ़्त नहीं।',
          'एक लाइन में कहा जा सके। “हर 5 विज़िट पर एक पेस्ट्री मुफ़्त” याद रहता है; “₹500 से ऊपर 10% छूट” नहीं।',
        ],
      },
      {
        h2: 'दुकान के हिसाब से आइडिया',
        table: {
          head: ['दुकान', 'इनाम का आइडिया', 'हर'],
          rows: [
            ['कैफ़े', 'एक कॉफ़ी या कुकी मुफ़्त', '6 से 8 विज़िट'],
            ['बेकरी और मिठाई की दुकान', 'एक पेस्ट्री या 250 ग्राम मिठाई', '6 से 8 विज़िट'],
            ['किराना स्टोर', 'बिस्किट का पैकेट या छोटी चीज़', '8 से 10 विज़िट'],
            ['सैलून और नाई की दुकान', 'हेड मसाज या दाढ़ी ट्रिम मुफ़्त', '4 से 5 विज़िट'],
            ['ब्यूटी पार्लर', 'थ्रेडिंग या फ़ेस क्लीनअप मुफ़्त', '4 से 5 विज़िट'],
            ['जूस की दुकान', 'एक छोटा जूस मुफ़्त', '6 से 8 विज़िट'],
            ['जिम', 'दोस्त के लिए एक दिन का पास या प्रोटीन शेक', '8 से 10 विज़िट'],
            ['टिफ़िन सर्विस', 'एक खाना मुफ़्त', '10 विज़िट'],
            ['लॉन्ड्री और ड्राई क्लीनिंग', 'एक शर्ट की प्रेस मुफ़्त', '5 से 6 विज़िट'],
            ['मेडिकल स्टोर', 'कोई छोटी हेल्थ चीज़ मुफ़्त', '5 से 6 विज़िट'],
            ['मोबाइल रिपेयर', 'स्क्रीन गार्ड मुफ़्त', '3 से 4 विज़िट'],
          ],
        },
      },
      {
        h2: 'इनाम से पहले कितनी विज़िट?',
        p: [
          'यह इस पर निर्भर है कि पक्का ग्राहक कितनी बार आता है। रोज़ वाली दुकानें 8 से 10 विज़िट रख सकती हैं; महीने में एक बार वाली 3 से 5। पहला इनाम एक-दो महीने में मिलना चाहिए, वरना ग्राहक भूल जाता है।',
          'बाद में बदल भी सकते हैं। Regularhood में नियम बदलने पर ग्राहकों की पहले की विज़िट बनी रहती हैं।',
        ],
      },
      {
        h2: 'ऐसे इनाम जो उल्टे पड़ते हैं',
        list: [
          'पूरा बिल मुफ़्त या बड़ा डिस्काउंट — पिछली सारी विज़िट का मुनाफ़ा खा जाता है।',
          'सिर्फ़ बड़े ख़र्च वालों के लिए इनाम — आपके सबसे पक्के ग्राहक अक्सर छोटे, बार-बार आने वाले होते हैं।',
          'ऐसी चीज़ जो आप रखते नहीं — ग्राहक इनाम लेने आए और चीज़ न हो।',
          'बार-बार इनाम बदलना — ग्राहक भरोसा करना छोड़ देते हैं।',
        ],
      },
      {
        h2: 'Regularhood में अपना इनाम तय करें',
        p: [
          'Regularhood में आप एक नियम तय करते हैं: हर N विज़िट (3 से 10) पर आपका चुना हुआ एक इनाम। ऐप ग्राहक के फ़ोन नंबर पर विज़िट गिनता है और काउंटर पर बताता है कि इनाम कब देना है। आपके नियम वाला काउंटर पोस्टर और WhatsApp स्टेटस इमेज भी मिलती है, ताकि ग्राहकों को पता रहे। शुरू करना मुफ़्त।',
        ],
      },
    ],
    faqs: [
      { q: 'छोटी दुकान के लिए अच्छा लॉयल्टी इनाम क्या है?', a: 'कोई छोटी मुफ़्त चीज़ या सर्विस जो आप अक्सर बेचते हैं और जिसकी लागत कम है — एक पेस्ट्री, एक जूस, एक हेड मसाज। लौटने लायक हो, पर पूरा बिल मुफ़्त नहीं।' },
      { q: 'लॉयल्टी कार्ड में कितनी विज़िट होनी चाहिए?', a: 'आमतौर पर 3 से 10। जहाँ ग्राहक रोज़ आते हैं, वहाँ ज़्यादा; जहाँ महीने में एक बार, वहाँ कम — ताकि पहला इनाम एक-दो महीने में मिल जाए।' },
      { q: 'क्या मुफ़्त चीज़ डिस्काउंट से बेहतर है?', a: 'आमतौर पर हाँ। मुफ़्त चीज़ तोहफ़े जैसी लगती है, और आपको उतने ही डिस्काउंट से सस्ती पड़ती है क्योंकि आप सिर्फ़ उसकी लागत देते हैं।' },
      { q: 'क्या बाद में इनाम बदल सकते हैं?', a: 'हाँ। Regularhood में Settings से इनाम या विज़िट की गिनती कभी भी बदलें, ग्राहकों की पहले की विज़िट बनी रहती हैं।' },
    ],
  },
  {
    slug: 'whatsapp-loyalty-card',
    name: 'WhatsApp लॉयल्टी कार्ड',
    title: 'WhatsApp लॉयल्टी कार्ड: ग्राहकों को उनके स्टैम्प भेजें',
    description: 'ग्राहकों को WhatsApp पर उनका लॉयल्टी कार्ड भेजें: स्टैम्प और बची विज़िट, हिंदी या English में, ब्राउज़र में खुलता है। न ऐप, न QR कोड। शुरू करना मुफ़्त।',
    eyebrow: 'WhatsApp पर लॉयल्टी',
    h1: 'ऐसा लॉयल्टी कार्ड जो ग्राहक को WhatsApp पर मिले',
    intro:
      'आपके ग्राहकों के पास WhatsApp पहले से है, और वे जानी-पहचानी दुकानों से उसी पर बात करते हैं। तो उनका लॉयल्टी कार्ड भी वहीं होना चाहिए — किसी ऐसे ऐप में नहीं जिसे वे कभी डाउनलोड नहीं करेंगे।',
    updated: UPDATED,
    blocks: [
      {
        h2: 'ऐसे काम करता है',
        steps: [
          { title: 'काउंटर पर विज़िट जोड़ें', text: 'ग्राहक का फ़ोन नंबर लिखें और Add visit दबाएँ। स्टैम्प उनके नंबर पर गिन लिया जाता है।' },
          { title: 'एक टैप में कार्ड भेजें', text: 'एक टैप पर WhatsApp में ग्राहक के लिए मैसेज खुलता है, जिसमें उनके कार्ड का लिंक होता है।' },
          { title: 'ग्राहक ब्राउज़र में खोलता है', text: 'कार्ड में उनके स्टैम्प और इनाम तक बची विज़िट दिखती हैं, हिंदी या English में। न कुछ इंस्टॉल करना, न साइन अप।' },
        ],
      },
      {
        h2: 'WhatsApp किसी ऐप से बेहतर क्यों',
        p: [
          'काउंटर पर ग्राहक से ऐप इंस्टॉल करने को कहें, तो ज़्यादातर “बाद में” कहेंगे। WhatsApp मैसेज में कुछ नहीं करना: वह वहीं आता है जहाँ वे परिवार और दोस्तों से बात करते हैं, और कार्ड फ़ोन के ब्राउज़र में खुलता है।',
          'इससे आपकी दुकान उनकी चैट लिस्ट में भी बनी रहती है। अगली बार कोई चीज़ पूछनी हो, तो आपका मैसेज वहीं मिलता है।',
        ],
      },
      {
        h2: 'WhatsApp से ग्राहकों को वापस बुलाएँ',
        p: [
          'Regularhood उन ग्राहकों की लिस्ट रखता है जो काफ़ी दिनों से नहीं आए। हर एक के साथ तैयार “हम आपको मिस कर रहे हैं” WhatsApp मैसेज होता है — बस टैप करें और अपने WhatsApp से भेज दें।',
          'ऐप आपकी दुकान के नियम वाली WhatsApp स्टेटस इमेज भी बनाता है, ताकि जिनके पास आपका नंबर है उन सबको पता चले कि आप पक्के ग्राहकों को इनाम देते हैं।',
        ],
      },
      {
        h2: 'दुकानों के लिए WhatsApp के अच्छे तरीके',
        list: [
          'मैसेज एक-एक करके उन्हें भेजें जो आपकी दुकान जानते हैं, अनजान लोगों को बल्क में नहीं।',
          'छोटा और काम का रखें: उनका कार्ड, पास आता इनाम, उनकी पसंद की नई चीज़।',
          'रोज़ मैसेज न करें। पसंद की दुकान से कभी-कभार अच्छा लगता है; रोज़ स्पैम लगता है।',
        ],
      },
      {
        h2: 'जिन ग्राहकों के पास WhatsApp नहीं',
        p: [
          'उन्हें भी स्टैम्प मिलते हैं। विज़िट फ़ोन नंबर पर गिनी जाती हैं, तो स्मार्टफ़ोन हो या न हो, कार्ड चलता है — इनाम का समय आने पर ऐप काउंटर पर बता देता है।',
        ],
      },
    ],
    faqs: [
      { q: 'क्या WhatsApp Business ऐप चाहिए?', a: 'नहीं। कार्ड उसी WhatsApp से जाता है जो आप फ़ोन पर पहले से चलाते हैं — सामान्य WhatsApp या WhatsApp Business, दोनों चलते हैं।' },
      { q: 'क्या ग्राहक को कुछ इंस्टॉल करना होगा?', a: 'नहीं। WhatsApp मैसेज में लिंक होता है, और कार्ड फ़ोन के ब्राउज़र में खुलता है। न ऐप, न साइन अप, न PIN।' },
      { q: 'क्या कार्ड हिंदी में हो सकता है?', a: 'हाँ। ग्राहक जो कार्ड खोलता है उसमें स्टैम्प और बची विज़िट हिंदी या English में दिखती हैं।' },
      { q: 'क्या यह मुफ़्त है?', a: 'Regularhood शुरू करना मुफ़्त है, और अपने WhatsApp से कार्ड भेजने का कोई अलग ख़र्च नहीं।' },
    ],
  },
  {
    slug: 'how-to-increase-shop-sales',
    name: 'दुकान की बिक्री कैसे बढ़ाएँ',
    title: 'दुकान में बिक्री कैसे बढ़ाए? 8 तरीके, बिना विज्ञापन और बिना छूट',
    description: 'दुकान की बिक्री बढ़ाने का सबसे सस्ता तरीका: जो ग्राहक पहले से आते हैं, वे महीने में एक बार और आएँ। इनाम, WhatsApp स्टेटस और काउंटर के 8 उपाय, आज से शुरू करें।',
    eyebrow: 'दुकान की बिक्री',
    h1: 'दुकान में बिक्री कैसे बढ़ाए: बिना विज्ञापन के 8 आसान तरीके',
    intro:
      'ज़्यादातर छोटी दुकानें नए ग्राहक ढूँढकर बढ़ना चाहती हैं। पर सबसे जल्दी बढ़ी बिक्री अक्सर उन्हीं लोगों से आती है जो आपको पहले से जानते हैं: महीने में एक बार ज़्यादा आने वाला पक्का ग्राहक किसी भी पर्चे से ज़्यादा बिक्री लाता है।',
    updated: ADDED_NOV19,
    sibling: 'dukan-ki-sale-kaise-badhaye',
    blocks: [
      {
        h2: 'दुकान की बिक्री कहाँ से आती है',
        p: [
          'बिक्री तीन चीज़ों से बनती है: कितने ग्राहक हैं, वे कितनी बार आते हैं और हर बार कितना ख़रीदते हैं। ज़्यादातर सलाह पहली चीज़ पर होती है, और उसे बदलना सबसे महँगा भी है।',
          'पक्का ग्राहक कितनी बार आता है, यह बदलना सबसे आसान है। आपके पक्के ग्राहकों की महीने में एक विज़िट ज़्यादा — न नए ग्राहक चाहिए, न विज्ञापन, न डिस्काउंट।',
        ],
      },
      {
        h2: 'आज़माने के आठ तरीके',
        steps: [
          { title: 'विज़िट पर इनाम दें', text: 'एक आसान कार्ड — हर 5 विज़िट पर एक छोटा मुफ़्त गिफ़्ट — पक्के ग्राहकों को बगल वाली दुकान की जगह आपको चुनने की वजह देता है।' },
          { title: 'बताएँ कि इनाम कितना पास है', text: 'जब ग्राहक जानता है कि इनाम बस एक-दो विज़िट दूर है, तो वह जल्दी लौटता है।' },
          { title: 'ऑफ़र काउंटर पर लगाएँ', text: 'जहाँ ग्राहक पैसे देते हैं वहाँ एक छोटा पोस्टर बात शुरू कर देता है, भीड़ में भी।' },
          { title: 'WhatsApp स्टेटस का इस्तेमाल करें', text: 'आपके पक्के ग्राहकों के पास आपका नंबर है। नया माल, आज का स्पेशल और इनाम का नियम उन तक मुफ़्त पहुँचता है।' },
          { title: 'एक और चीज़ सुझाएँ', text: 'बिल बनाते समय एक ईमानदार सुझाव — जो उनकी चीज़ के साथ जाती हो — बिना ज़बरदस्ती के बिल बढ़ाता है।' },
          { title: 'सबसे ज़्यादा बिकने वाला माल रखें', text: 'जो ग्राहक अपनी रोज़ की चीज़ लेने आए और न मिले, वह दूसरी दुकान आज़मा सकता है — और वहीं रह सकता है।' },
          { title: 'देखें कौन आना बंद कर गया', text: 'दूर हुआ पक्का ग्राहक महीनों की बिक्री साथ ले जाता है। समय रहते जानें कि वे कौन हैं, जब वापस बुलाना आसान है।' },
          { title: 'एक प्यारा-सा मैसेज भेजें', text: 'जानी-पहचानी दुकान से WhatsApp पर छोटा-सा “हम आपको मिस कर रहे हैं” कई ग्राहकों को वापस ले आता है।' },
        ],
      },
      {
        h2: 'छोटी दुकानों के लिए जो अक्सर काम नहीं करता',
        list: [
          'भारी डिस्काउंट — लोग एक बार आते हैं, और अगले डिस्काउंट का इंतज़ार करना सीख जाते हैं।',
          'पर्चे और अख़बार में पैम्फलेट — पता ही नहीं चलता कि कोई आया या नहीं।',
          'अनजान लोगों को बल्क SMS — स्पैम जैसा लगता है और नज़रअंदाज़ हो जाता है।',
          'ग्राहकों के लिए अलग ऐप — ज़्यादातर कभी डाउनलोड नहीं करते।',
        ],
      },
      {
        h2: 'Regularhood के साथ',
        p: [
          'Regularhood इनमें से कई काम काउंटर पर एक टैप में करता है। आप एक नियम रखते हैं — हर N विज़िट (3 से 10) पर आपका चुना एक इनाम — फिर ग्राहक का फ़ोन नंबर लिखकर Add visit दबाते हैं। इनाम कब देना है, ऐप बता देता है।',
          'एक टैप में ग्राहक को WhatsApp पर उसका कार्ड भेज सकते हैं, जिसमें बची विज़िट दिखती हैं। आपके नियम वाला छापने लायक काउंटर पोस्टर और WhatsApp स्टेटस इमेज मिलती है, और उन ग्राहकों की लिस्ट जो वापस नहीं आए, तैयार “मिस कर रहे हैं” मैसेज के साथ। शुरू करना मुफ़्त।',
        ],
      },
    ],
    faqs: [
      { q: 'दुकान की बिक्री जल्दी कैसे बढ़ाएँ?', a: 'सबसे जल्दी असर पुराने ग्राहकों पर होता है: उन्हें इनाम का नियम बताएँ, जो इनाम के पास हैं उन्हें याद दिलाएँ, और जो कुछ हफ़्तों से नहीं आए उन्हें एक निजी मैसेज भेजें। नए ग्राहक लाने में ज़्यादा समय और पैसा लगता है।' },
      { q: 'छोटी दुकान की बिक्री बढ़ाने का सबसे सस्ता तरीका क्या है?', a: 'अपने पक्के ग्राहकों को थोड़ा और बार बुलाइए। विज़िट पर आसान इनाम और काउंटर पोस्टर में लगभग कोई ख़र्च नहीं, और यह उन लोगों पर काम करता है जिन्हें आपकी दुकान पहले से पसंद है।' },
      { q: 'क्या बिक्री बढ़ाने के लिए डिस्काउंट देना चाहिए?', a: 'सोच-समझकर। डिस्काउंट से लोग एक बार आते हैं, पर बार-बार आने पर छोटा इनाम आपकी दुकान चुनने की आदत बनाता है।' },
      { q: 'कैसे पता चले कि पक्के ग्राहक कम आ रहे हैं?', a: 'फ़ोन नंबर के हिसाब से विज़िट का रिकॉर्ड रखें। Regularhood उन ग्राहकों की लिस्ट दिखाता है जो काफ़ी दिनों से नहीं आए, ताकि देर होने से पहले पता चल जाए।' },
      { q: 'क्या दुकान बढ़ाने के लिए वेबसाइट या सोशल मीडिया ज़रूरी है?', a: 'शुरुआत में नहीं। आपका काउंटर, आपका WhatsApp और आपके पक्के ग्राहक बिक्री बढ़ाने के लिए काफ़ी हैं। वेबसाइट बाद में नए लोगों को आप तक पहुँचाने में मदद करती है।' },
    ],
  },
  {
    slug: 'win-back-old-customers',
    name: 'पुराने ग्राहक वापस लाएँ',
    title: 'पुराने ग्राहक वापस कैसे लाए? 3 कदम और कॉपी-पेस्ट WhatsApp मैसेज',
    description: 'जो ग्राहक आना बंद कर गए, उन्हें वापस बुलाएँ: कौन 30 दिन से नहीं आया यह पता करें, एक निजी WhatsApp मैसेज भेजें। तैयार मैसेज कॉपी करें, मुफ़्त।',
    eyebrow: 'ग्राहक वापस लाएँ',
    h1: 'आना बंद कर चुके ग्राहकों को वापस कैसे लाएँ',
    intro:
      'हर दुकान में ऐसे ग्राहक होते हैं: जो हर हफ़्ते आते थे और चुपचाप आना बंद कर दिया। अक्सर कुछ ग़लत नहीं हुआ — बस उनकी आदत बदल गई। एक छोटी, प्यार भरी याद दिलाना ही अक्सर काफ़ी होता है।',
    updated: ADDED_NOV19,
    sibling: 'purane-customer-wapas-kaise-laye',
    blocks: [
      {
        h2: 'ग्राहक दूर क्यों हो जाते हैं',
        list: [
          'घर, नौकरी या रोज़ का रास्ता बदल गया।',
          'रास्ते में नई दुकान खुली और उस दिन वह बस पास पड़ी।',
          'एक बार अनुभव अच्छा नहीं रहा और उन्होंने कुछ कहा नहीं।',
          'किसी ने ध्यान ही नहीं दिया कि वे नहीं आ रहे, तो किसी ने पूछा भी नहीं।',
        ],
      },
      {
        h2: 'पहले जानें कि वे कौन हैं',
        p: [
          'जिस ग्राहक के जाने का पता ही नहीं, उसे वापस नहीं बुला सकते। भीड़ वाली दुकान में आना बंद कर चुका ग्राहक हफ़्तों या महीनों बाद याद आता है, अगर आता भी है।',
          'हर ग्राहक के फ़ोन नंबर पर विज़िट का रिकॉर्ड रखने से यह ठीक हो जाता है। फिर “पिछले महीने कौन नहीं आया?” अंदाज़ा नहीं, एक लिस्ट होती है।',
        ],
      },
      {
        h2: 'वापस लाने के तीन कदम',
        steps: [
          { title: 'लिस्ट बनाएँ', text: 'उन ग्राहकों को ढूँढें जो पहले नियमित आते थे पर काफ़ी दिनों से नहीं आए।' },
          { title: 'छोटा, अपनापन भरा मैसेज भेजें', text: 'जानी-पहचानी दुकान से WhatsApp पर एक मैसेज: आपको उनकी कमी खली, और आप उन्हें फिर देखना चाहेंगे।' },
          { title: 'आने की वजह दें', text: 'अगर इनाम पास है तो बताएँ। “बस एक विज़िट और, आपका मुफ़्त गिफ़्ट तैयार है” आने की अच्छी वजह है।' },
        ],
      },
      {
        h2: 'क्या लिखें',
        p: [
          'छोटा, अपनापन भरा और दुकान के नाम से। कुछ ऐसा: “नमस्ते, काफ़ी दिनों से आप हमारी दुकान पर नहीं आए। आपके कार्ड पर 5 में से 4 स्टैम्प हैं — बस एक विज़िट और, आपका मुफ़्त गिफ़्ट तैयार है। जल्द मिलते हैं।”',
          'एक बार भेजें। अगर वे न आएँ तो बार-बार मैसेज न करें; कुछ हफ़्ते बाद दूसरा मैसेज काफ़ी है।',
        ],
      },
      {
        h2: 'Regularhood के साथ',
        p: [
          'Regularhood उन ग्राहकों की लिस्ट रखता है जो काफ़ी दिनों से नहीं आए। हर एक के साथ तैयार “हम आपको मिस कर रहे हैं” WhatsApp मैसेज होता है — टैप करें और अपने WhatsApp से भेज दें।',
          'विज़िट ग्राहक के फ़ोन नंबर पर गिनी जाती हैं, इसलिए काउंटर पर काम करते-करते लिस्ट अपने-आप बनती है। ग्राहक और विज़िट स्प्रेडशीट में एक्सपोर्ट भी कर सकते हैं। शुरू करना मुफ़्त।',
        ],
      },
    ],
    faqs: [
      { q: 'पुराना ग्राहक कितने दिन बाद दूर माना जाए?', a: 'अपनी दुकान के हिसाब से देखें। जो ग्राहक हर हफ़्ते आता था और तीन-चार हफ़्ते से नहीं आया, उसे अभी मैसेज भेजें। जितनी जल्दी याद करेंगे, वह उतनी आसानी से लौटेगा।' },
      { q: 'कितने दिन न आने पर ग्राहक को खोया हुआ मानें?', a: 'यह इस पर निर्भर है कि वे कितनी बार आते थे। रोज़ आने वाला दो हफ़्ते न आए तो संकेत है; महीने में एक बार आने वाला सैलून ग्राहक दो महीने न आए, तो भी।' },
      { q: 'क्या वापस बुलाने के लिए डिस्काउंट देना चाहिए?', a: 'अक्सर ज़रूरत नहीं। यह याद दिलाना कि उनका इनाम पास है, अक्सर काफ़ी होता है, और इसमें कोई अलग ख़र्च नहीं।' },
      { q: 'क्या ग्राहकों को WhatsApp पर मैसेज करना ठीक है?', a: 'हाँ, अगर वे आपके ग्राहक हैं, मैसेज निजी है और आप बार-बार नहीं भेजते। जानी-पहचानी दुकान का छोटा मैसेज अच्छा लगता है; रोज़ के प्रमोशन नहीं।' },
      { q: 'अगर उनका अनुभव ख़राब रहा हो तो?', a: 'निजी मैसेज उन्हें बताने का मौका देता है। ध्यान से सुनें, हो सके तो ठीक करें, और बताने के लिए धन्यवाद कहें।' },
    ],
  },
  {
    slug: 'whatsapp-marketing-for-shops',
    name: 'दुकान के लिए WhatsApp मार्केटिंग',
    title: 'दुकान के लिए WhatsApp मार्केटिंग कैसे करें, बिना स्पैम के',
    description: 'छोटी दुकान WhatsApp से मार्केटिंग कैसे करे: स्टेटस, निजी मैसेज और लॉयल्टी कार्ड, ग्राहकों को स्पैम किए बिना। शुरू करना मुफ़्त।',
    eyebrow: 'दुकान के लिए WhatsApp',
    h1: 'अपनी दुकान के लिए WhatsApp मार्केटिंग, बिना परेशान किए',
    intro:
      'मोहल्ले की दुकान के लिए WhatsApp पहले से सबसे अच्छा मार्केटिंग का ज़रिया है: ग्राहकों के पास है, वे पढ़ते हैं, और कई के पास आपका नंबर भी है। बस इसे विज्ञापन वाले की तरह नहीं, दुकानदार की तरह इस्तेमाल करना है।',
    updated: ADDED,
    blocks: [
      {
        h2: 'WhatsApp इस्तेमाल करने के तीन तरीके',
        table: {
          head: ['', 'कौन देखता है', 'किसके लिए अच्छा'],
          rows: [
            ['WhatsApp स्टेटस', 'जिन्होंने आपका नंबर सेव किया है', 'नया माल, आज का स्पेशल, इनाम का नियम'],
            ['निजी मैसेज', 'एक ग्राहक', 'उनका कार्ड, पास आता इनाम, “मिस कर रहे हैं”'],
            ['ब्रॉडकास्ट लिस्ट', 'जिन ग्राहकों ने आपका नंबर सेव किया है', 'कभी-कभार की ख़बर: नया समय, त्योहार का ऑफ़र'],
          ],
        },
      },
      {
        h2: 'स्टेटस को देखने लायक बनाएँ',
        list: [
          'असली चीज़ की फ़ोटो लगाएँ: ताज़ा माल, बना हुआ हेयरकट, आज का स्पेशल।',
          'लिखावट छोटी और साफ़ रखें, ग्राहकों की भाषा में।',
          'बीच-बीच में अपना इनाम का नियम लगाएँ, ताकि नए ग्राहकों को पता चले।',
          'दिन में एक-दो पोस्ट काफ़ी हैं।',
        ],
      },
      {
        h2: 'ऐसे मैसेज जो ग्राहकों को अच्छे लगते हैं',
        p: [
          'काम के मैसेज निजी और उपयोगी होते हैं: बची विज़िट के साथ उनका लॉयल्टी कार्ड, यह ख़बर कि इनाम बस एक विज़िट दूर है, या काफ़ी दिन न आने पर एक छोटा-सा नोट।',
          'चिढ़ाने वाले मैसेज वे हैं जो रोज़ सबको एक ही प्रमोशन भेजते हैं। कम भेजें, और हर मैसेज पढ़ने वाले के बारे में हो।',
        ],
      },
      {
        h2: 'ये नियम मानें',
        list: [
          'मैसेज सिर्फ़ अपने ग्राहकों को करें।',
          'बिना पूछे ग्राहकों को ग्रुप में न जोड़ें।',
          'कोई मना करे तो रुक जाएँ।',
          'फ़ॉरवर्ड या दुकान से अलग कुछ भी न भेजें।',
        ],
      },
      {
        h2: 'Regularhood के साथ',
        p: [
          'Regularhood आपको WhatsApp की वे चीज़ें देता है जो ग्राहकों को वापस लाती हैं। एक टैप में ग्राहक को उसका लॉयल्टी कार्ड जाता है: उसके स्टैम्प और बची विज़िट, हिंदी या English में, ब्राउज़र में खुलता है।',
          'ऐप आपकी दुकान के नियम वाली WhatsApp स्टेटस इमेज भी बनाता है, और उन ग्राहकों की लिस्ट रखता है जो वापस नहीं आए, तैयार “मिस कर रहे हैं” मैसेज के साथ। सब कुछ आपके अपने WhatsApp से जाता है। शुरू करना मुफ़्त।',
        ],
      },
    ],
    faqs: [
      { q: 'क्या दुकान के लिए WhatsApp Business चाहिए?', a: 'दुकान की प्रोफ़ाइल और समय दिखाने में मदद करता है, पर ज़रूरी नहीं। स्टेटस, मैसेज और लॉयल्टी कार्ड भेजने के लिए सामान्य WhatsApp भी चलता है।' },
      { q: 'दुकान को ग्राहकों को कितनी बार मैसेज करना चाहिए?', a: 'कम, और तभी जब उनके काम का हो। स्टेटस रोज़ लग सकता है; निजी मैसेज महीने में कुछ ही बार।' },
      { q: 'क्या बल्क WhatsApp मैसेज अच्छा तरीका है?', a: 'छोटी दुकान के लिए नहीं। अनजान लोगों को बल्क मैसेज स्पैम लगते हैं, और आपका नंबर ब्लॉक या रिपोर्ट हो सकता है।' },
      { q: 'WhatsApp स्टेटस पर क्या लगाएँ?', a: 'अपने माल या काम की असली फ़ोटो, आज का स्पेशल, नई चीज़ें और लॉयल्टी इनाम का नियम। छोटा और साफ़ सबसे अच्छा।' },
    ],
  },
  {
    slug: 'discount-vs-loyalty-reward',
    name: 'डिस्काउंट या लॉयल्टी इनाम?',
    title: 'डिस्काउंट या लॉयल्टी इनाम: आपकी दुकान के लिए क्या बेहतर?',
    description: 'दुकान डिस्काउंट दे या लॉयल्टी इनाम? दोनों का मुनाफ़े और दोबारा आने पर असर, और कब कौन-सा इस्तेमाल करें। शुरू करना मुफ़्त।',
    eyebrow: 'डिस्काउंट या इनाम',
    h1: 'डिस्काउंट या लॉयल्टी इनाम: ग्राहक किससे लौटते हैं?',
    intro:
      'दोनों में ग्राहक को कुछ मिलता है। पर डिस्काउंट और लॉयल्टी इनाम ग्राहकों को बिल्कुल अलग आदतें सिखाते हैं — और दुकान को बिल्कुल अलग ख़र्च पड़ते हैं।',
    updated: ADDED,
    blocks: [
      {
        h2: 'आमने-सामने',
        table: {
          head: ['', 'डिस्काउंट', 'लॉयल्टी इनाम'],
          rows: [
            ['किसे मिलता है', 'सबको, एक बार आने वालों को भी', 'सिर्फ़ उन्हें जो बार-बार आते हैं'],
            ['क्या सिखाता है', 'अगले ऑफ़र का इंतज़ार करो', 'कार्ड पूरा करने लौटो'],
            ['आपको कितना पड़ता है', 'हर बिल से कटता है', 'हर कुछ विज़िट पर एक छोटी चीज़'],
            ['कैसा लगता है', 'दाम में कटौती', 'दुकान से तोहफ़ा'],
            ['बंद करना आसान?', 'ख़त्म होते ही ग्राहक को खलता है', 'कार्ड बस चलता रहता है'],
          ],
        },
      },
      {
        h2: 'मुफ़्त चीज़ आपको सस्ती क्यों पड़ती है',
        p: [
          'डिस्काउंट हर बिल पर सीधे आपके मुनाफ़े से कटता है। मुफ़्त चीज़ आपको उतने की पड़ती है जितने में आपने ख़रीदी, और वह हर कुछ विज़िट पर एक बार दी जाती है।',
          'ग्राहक भी अक्सर मुफ़्त चीज़ को उतने ही रुपये के डिस्काउंट से ज़्यादा मानते हैं। मुफ़्त पेस्ट्री तोहफ़ा लगती है; कुछ रुपये की छूट दुकान से निकलते ही भूल जाती है।',
        ],
      },
      {
        h2: 'डिस्काउंट कब ठीक है',
        list: [
          'पुराना या मौसमी माल निकालना हो।',
          'दुकान खुलने का हफ़्ता, ताकि लोग पहली बार अंदर आएँ।',
          'त्योहार का ऑफ़र जो बाज़ार में सब चला रहे हों।',
        ],
      },
      {
        h2: 'लॉयल्टी इनाम कब ठीक है',
        list: [
          'आप चाहते हैं कि पक्के ग्राहक बगल वाली दुकान की जगह आपको चुनें।',
          'आपके ग्राहक अक्सर आते हैं — रोज़, हर हफ़्ते या हर महीने।',
          'आप जानना चाहते हैं कि आपके पक्के ग्राहक कौन हैं और किसने आना बंद किया।',
        ],
      },
      {
        h2: 'Regularhood के साथ',
        p: [
          'Regularhood बिना कागज़ी झंझट का लॉयल्टी इनाम है। आप एक नियम रखते हैं — हर N विज़िट (3 से 10) पर आपका चुना एक इनाम। काउंटर पर ग्राहक का फ़ोन नंबर लिखकर Add visit दबाते हैं, और इनाम कब देना है, ऐप बता देता है। न पॉइंट्स, न QR कोड, और ग्राहक को कुछ इंस्टॉल नहीं करना। शुरू करना मुफ़्त।',
        ],
      },
    ],
    faqs: [
      { q: 'ग्राहकों के लिए डिस्काउंट बेहतर है या मुफ़्त गिफ़्ट?', a: 'ग्राहकों को वापस लाने के लिए बार-बार आने पर मुफ़्त गिफ़्ट अक्सर बेहतर काम करता है। यह एक ख़रीद नहीं, वफ़ादारी का इनाम है।' },
      { q: 'क्या डिस्काउंट और लॉयल्टी कार्ड साथ चला सकते हैं?', a: 'हाँ। डिस्काउंट छोटे ऑफ़र के लिए रखें, जैसे खुलने का हफ़्ता या माल निकालना, और लॉयल्टी कार्ड पूरे साल चलाएँ।' },
      { q: 'डिस्काउंट की जगह क्या इनाम दें?', a: 'कोई छोटी चीज़ या सेवा जो आप अक्सर बेचते हैं और जो आपको सस्ती पड़ती है — मुफ़्त पेस्ट्री, मुफ़्त जूस, मुफ़्त हेड मसाज।' },
      { q: 'डिस्काउंट बंद करने पर क्या ग्राहक फिर भी आएँगे?', a: 'पक्के ग्राहक आपकी दुकान के लिए आते हैं, सिर्फ़ दाम के लिए नहीं। लौटने पर इनाम उन्हें डिस्काउंट ख़त्म होने के बाद भी रुकने की वजह देता है।' },
    ],
  },
  {
    slug: 'get-customers-for-new-shop',
    name: 'नई दुकान के लिए ग्राहक',
    title: 'दुकान पर ग्राहक कैसे आए? 4 हफ़्ते का प्लान, बिना विज्ञापन',
    description: 'नई या पुरानी दुकान पर ग्राहक कैसे बनाये: बोर्ड, Google और WhatsApp से पहला ग्राहक, फिर इनाम से पक्का ग्राहक। हफ़्ते-दर-हफ़्ते आसान प्लान, आज से शुरू करें।',
    eyebrow: 'नई दुकान',
    h1: 'दुकान पर ग्राहक कैसे आए और बार-बार कैसे आएँ: पहले 30 दिन का प्लान',
    intro:
      'खुलने के बाद के पहले कुछ हफ़्ते बहुत कुछ तय करते हैं। इलाके के लोग जिज्ञासा में एक बार आ ही जाएँगे। वे दूसरी और तीसरी बार आते हैं या नहीं, इसी से दुकान बनती है।',
    updated: ADDED_NOV19,
    sibling: 'nayi-dukan-me-customer-kaise-laye',
    blocks: [
      {
        h2: 'पहली विज़िट लाएँ',
        list: [
          'दुकान आसानी से दिखे: साफ़ बोर्ड, अच्छी रोशनी और खुला दरवाज़ा।',
          'आस-पास बताएँ: पास की दुकानें, सोसाइटी और दफ़्तर।',
          'Google Maps पर दुकान जोड़ें: फ़ोटो, समय और फ़ोन नंबर के साथ।',
          'खुलने के हफ़्ते में रोज़ WhatsApp स्टेटस लगाएँ।',
          'खुलने का ऑफ़र ठीक है, पर छोटा रखें।',
        ],
      },
      {
        h2: 'पहली विज़िट को दूसरी में बदलें',
        p: [
          'यहीं ज़्यादातर नई दुकानें ग्राहक खो देती हैं। पहली विज़िट जिज्ञासा थी; दूसरी के लिए वजह चाहिए। पहले दिन से लॉयल्टी कार्ड शुरू करें, ताकि पहला ग्राहक भी एक स्टैम्प और एक लक्ष्य लेकर जाए।',
          'काउंटर पर कहें: “यह आपका पहला स्टैम्प है — 4 और, फिर अगली बार मुफ़्त गिफ़्ट।” एक स्टैम्प वाले नए ग्राहक के पास पुरानी दुकान की जगह आपके पास लौटने की वजह है।',
        ],
      },
      {
        h2: 'पहले महीने का प्लान',
        steps: [
          { title: 'हफ़्ता 1: सबको स्टैम्प', text: 'हर ग्राहक को स्टैम्प मिले और नियम सुनाई दे। पोस्टर काउंटर पर लगाएँ।' },
          { title: 'हफ़्ता 2: कार्ड भेजें', text: 'ग्राहकों को WhatsApp पर उनका कार्ड भेजें, ताकि उन्हें बची विज़िट दिखें।' },
          { title: 'हफ़्ता 3: पक्के ग्राहक पहचानें', text: 'देखें कौन दो-तीन बार लौटा। उनके नाम और उनकी रोज़ की चीज़ याद रखें।' },
          { title: 'हफ़्ता 4: एक बार वालों को बुलाएँ', text: 'जो एक बार आए और नहीं लौटे, उन्हें छोटा-सा “फिर मिलने की उम्मीद है” मैसेज भेजें।' },
        ],
      },
      {
        h2: 'Regularhood के साथ',
        p: [
          'Regularhood सेट करने में एक मिनट लगता है, तो खुलने के दिन तक तैयार हो सकता है। आप एक नियम रखते हैं — हर N विज़िट (3 से 10) पर आपका चुना एक इनाम — और ग्राहक का फ़ोन नंबर लिखकर Add visit दबाकर विज़िट जोड़ते हैं।',
          'आपके नियम वाला छापने लायक काउंटर पोस्टर और WhatsApp स्टेटस इमेज, ग्राहकों के लिए एक टैप वाले WhatsApp कार्ड, और न लौटे ग्राहकों की लिस्ट तैयार मैसेज के साथ मिलती है। शुरू करना मुफ़्त।',
        ],
      },
    ],
    faqs: [
      { q: 'शॉप पर ग्राहक कैसे बनाएँ?', a: 'पहली विज़िट पर ही ग्राहक का नंबर लें, उसे इनाम का नियम बताएँ और पहला स्टैम्प लगाएँ। फिर WhatsApp पर उसका कार्ड भेजें, ताकि उसे दिखे कि इनाम कितना पास है। दो-तीन बार लौटने वाला ग्राहक पक्का ग्राहक बन जाता है।' },
      { q: 'नई दुकान पर ग्राहक कैसे लाएँ?', a: 'दुकान को दिखने लायक बनाएँ, आस-पास सबको बताएँ, Google Maps पर आएँ और WhatsApp स्टेटस इस्तेमाल करें। फिर पहली बार आए ग्राहकों को लौटने की वजह दें।' },
      { q: 'क्या नई दुकान को तुरंत लॉयल्टी कार्ड शुरू करना चाहिए?', a: 'हाँ। पहले कुछ हफ़्तों में ही लोग तय करते हैं कि आपके पास आएँ या नहीं। पहली विज़िट पर स्टैम्प उन्हें लौटने की वजह देता है।' },
      { q: 'क्या खुलने का ऑफ़र अच्छा है?', a: 'छोटा हो तो हाँ। इसे खुलने के हफ़्ते तक रखें, ताकि ग्राहक दुकान के लिए आएँ, सिर्फ़ ऑफ़र के लिए नहीं।' },
      { q: 'पक्के ग्राहक बनने में कितना समय लगता है?', a: 'यह आपकी दुकान पर निर्भर है, पर आसान इनाम और अच्छे बर्ताव से अक्सर पहले महीने में ही पहले पक्के ग्राहक दिखने लगते हैं।' },
    ],
  },
  {
    slug: 'salon-loyalty-program',
    name: 'सैलून लॉयल्टी प्रोग्राम',
    title: 'सैलून लॉयल्टी प्रोग्राम: ग्राहकों को बार-बार कैसे बुलाएँ',
    description: 'अपने सैलून या पार्लर के लिए लॉयल्टी प्रोग्राम कैसे चलाएँ: कितनी विज़िट, कौन-सा इनाम, खाली दिन कैसे भरें और न लौटे ग्राहकों को कैसे बुलाएँ। शुरू करना मुफ़्त।',
    eyebrow: 'सैलून लॉयल्टी',
    h1: 'सैलून का ऐसा लॉयल्टी प्रोग्राम जो ग्राहक सच में इस्तेमाल करें',
    intro:
      'सैलून उन ग्राहकों से चलता है जो हर कुछ हफ़्तों में लौटते हैं। ज़्यादातर ग्राहक ख़राब हेयरकट की वजह से नहीं जाते — वे बस एक बार रास्ते के नए सैलून में चले जाते हैं, फिर दोबारा। एक आसान लॉयल्टी प्रोग्राम उन्हें आपकी कुर्सी पर लौटने की वजह देता है।',
    updated: ADDED_OCT26,
    blocks: [
      {
        h2: 'सैलून के लिए अलग प्लान क्यों',
        p: [
          'कैफ़े का ग्राहक रोज़ आ सकता है; सैलून का ग्राहक हर तीन से छह हफ़्ते में आता है। इससे लॉयल्टी कार्ड का पूरा हिसाब बदल जाता है। 10 विज़िट माँगेंगे तो पहला इनाम साल भर दूर होगा, और किसी को उसकी परवाह नहीं होगी।',
          'सैलून के ग्राहक दुकान के साथ-साथ एक इंसान को भी चुनते हैं। कोई स्टाइलिस्ट छोड़ता है तो ग्राहक अक्सर उसके पीछे चले जाते हैं। जो प्रोग्राम आपके सैलून की विज़िट पर इनाम देता है — किसी एक स्टाइलिस्ट पर नहीं — वह उन्हें आपके पास रखता है।',
        ],
      },
      {
        h2: 'कितनी विज़िट पर इनाम',
        table: {
          head: ['सर्विस', 'पक्का ग्राहक आता है हर', 'इनाम हर'],
          rows: [
            ['जेंट्स हेयरकट और दाढ़ी', '2 से 4 हफ़्ते', '4 से 5 विज़िट'],
            ['लेडीज़ हेयरकट', '6 से 8 हफ़्ते', '3 से 4 विज़िट'],
            ['थ्रेडिंग और वैक्सिंग', '2 से 4 हफ़्ते', '5 विज़िट'],
            ['फ़ेशियल और क्लीनअप', '3 से 5 हफ़्ते', '4 विज़िट'],
            ['हेयर कलर', '6 से 8 हफ़्ते', '3 विज़िट'],
          ],
        },
        p: ['अच्छा पैमाना: पक्के ग्राहक को पहला इनाम दो-तीन महीने में मिल जाना चाहिए। अगर आप कई सर्विस देते हैं, तो सर्विस नहीं, विज़िट गिनें, और सबके लिए एक ही नंबर रखें।'],
      },
      {
        h2: 'सैलून में काम करने वाले इनाम',
        list: [
          'मुफ़्त हेड मसाज — ग्राहकों को पसंद आता है और आपके दस मिनट लगते हैं।',
          'रोज़ की सर्विस के साथ मुफ़्त दाढ़ी ट्रिम या थ्रेडिंग।',
          'मुफ़्त हेयर वॉश और ब्लो-ड्राई।',
          'बड़ी सर्विस वाले ग्राहकों के लिए मुफ़्त फ़ेस क्लीनअप या हेयर स्पा।',
          'पूरा हेयरकट या फ़ेशियल मुफ़्त न दें — उसकी लागत उतनी ही है जितना पिछली विज़िट से कमाया।',
        ],
      },
      {
        h2: 'खाली दिन भरने में इस्तेमाल करें',
        p: [
          'ज़्यादातर सैलून वीकेंड पर भरे रहते हैं और हफ़्ते की दोपहर में ख़ाली। लॉयल्टी कार्ड इसमें से कुछ भीड़ खिसका सकता है। काउंटर पर और WhatsApp स्टेटस पर बताएँ कि इनाम का मज़ा हफ़्ते के दिन सबसे आराम से लें, जब इंतज़ार नहीं होता।',
          'जब ग्राहक इनाम से बस एक विज़िट दूर हो, तो ख़ाली सुबह एक छोटा WhatsApp मैसेज — “आपकी मुफ़्त हेड मसाज तैयार है, आज कुर्सी ख़ाली है” — अक्सर उन्हें उसी दिन ले आता है।',
        ],
      },
      {
        h2: 'आना बंद कर चुके ग्राहकों को बुलाएँ',
        p: [
          'भीड़ वाले सैलून में, आना बंद कर चुका ग्राहक महीनों बाद पता चलता है, अगर चलता भी है। अगर हर ग्राहक की विज़िट उसके फ़ोन नंबर पर दर्ज हो, तो आप देख सकते हैं कि दो महीने से कौन नहीं आया और उसे एक प्यारा-सा मैसेज भेज सकते हैं।',
          'मैसेज छोटा और अपनापन भरा रखें, सैलून के नाम से: आपको उनकी कमी खली, और अगर इनाम पास है तो वह भी बताएँ।',
        ],
      },
      {
        h2: 'Regularhood के साथ',
        p: [
          'Regularhood ग्राहक के फ़ोन नंबर पर चलने वाला स्टैम्प कार्ड है। आप एक नियम रखते हैं — हर N विज़िट (3 से 10) पर आपका चुना एक इनाम। काउंटर पर ग्राहक का नंबर लिखें और Add visit दबाएँ; आख़िरी विज़िट पर ऐप कहता है “अभी इनाम दें”।',
          'एक टैप में ग्राहक को WhatsApp पर उनका कार्ड भेज सकते हैं, जिसमें बची विज़िट दिखती हैं, हिंदी या English में। साथ में छापने लायक काउंटर पोस्टर, आपके नियम वाली WhatsApp स्टेटस इमेज, और न लौटे ग्राहकों की लिस्ट तैयार “हम आपको मिस कर रहे हैं” मैसेज के साथ मिलती है। शुरू करना मुफ़्त।',
        ],
      },
    ],
    faqs: [
      { q: 'सैलून के लिए अच्छा लॉयल्टी इनाम क्या है?', a: 'कोई छोटी सर्विस जो जल्दी हो जाए और ग्राहकों को पसंद हो: मुफ़्त हेड मसाज, दाढ़ी ट्रिम, थ्रेडिंग या हेयर वॉश। पूरा हेयरकट या फ़ेशियल मुफ़्त न दें।' },
      { q: 'सैलून के लॉयल्टी कार्ड में कितनी विज़िट रखें?', a: 'आम तौर पर 3 से 5, क्योंकि सैलून के ग्राहक हर कुछ हफ़्तों में आते हैं। पहला इनाम दो-तीन महीने में मिल जाना चाहिए।' },
      { q: 'सैलून विज़िट गिने या ख़र्च?', a: 'विज़िट गिनना आसान और ठीक है। हर महीने छोटी ट्रिम के लिए आने वाला ग्राहक भी उतना ही वफ़ादार है जितना कलर कराने वाला, और दोनों को इनाम पास लगना चाहिए।' },
      { q: 'क्या ग्राहकों को ऐप इंस्टॉल करना होगा?', a: 'नहीं। Regularhood में विज़िट ग्राहक के फ़ोन नंबर पर गिनी जाती हैं, और उनका कार्ड WhatsApp लिंक से ब्राउज़र में खुलता है।' },
      { q: 'क्या यह ब्यूटी पार्लर या नाई की दुकान के लिए भी है?', a: 'हाँ। जहाँ भी वही लोग हर कुछ हफ़्तों में लौटते हैं, वहाँ यही आसान विज़िट कार्ड काम करता है।' },
    ],
  },
  {
    slug: 'messages-to-bring-customers-back',
    name: 'ग्राहकों को वापस बुलाने के मैसेज',
    title: 'ग्राहक को दोबारा बुलाने के मैसेज: दुकानों के लिए WhatsApp टेम्पलेट',
    description: 'ग्राहक को दोबारा आने के लिए छोटे और विनम्र मैसेज, मुफ़्त ऐड-ऑन या 10% छूट जैसे ऑफ़र के साथ। सैलून और दुकानों के लिए कॉपी करने लायक WhatsApp टेम्पलेट।',
    eyebrow: 'मैसेज टेम्पलेट',
    h1: 'ग्राहक को दोबारा बुलाने के छोटे, विनम्र मैसेज',
    intro:
      'ग्राहक से दोबारा आने को कहना ज़बरदस्ती जैसा लगता है, इसलिए ज़्यादातर दुकानें कभी कहती ही नहीं। ऐसा होना ज़रूरी नहीं। जानी-पहचानी दुकान से छोटा, विनम्र मैसेज, आने की एक छोटी वजह के साथ, अच्छा लगता है। ये मैसेज कॉपी करें, बदलें और आज भेजें।',
    updated: ADDED_OCT26,
    blocks: [
      {
        h2: 'अच्छे मैसेज की पहचान',
        list: [
          'छोटा: दो-तीन लाइन, जो बिना स्क्रॉल किए फ़ोन पर दिख जाएँ।',
          'विनम्र और अपनापन भरा: उनका नाम, आपकी दुकान का नाम, न कैपिटल अक्षर न दस इमोजी।',
          'आने की एक साफ़ वजह: पास आया इनाम, मुफ़्त ऐड-ऑन, नया माल।',
          'एक बार: एक मैसेज, सिलसिला नहीं। हफ़्तों बाद दूसरा काफ़ी है।',
        ],
      },
      {
        h2: 'दोबारा विज़िट या सर्विस के लिए मैसेज',
        list: [
          '“नमस्ते प्रिया जी, Style Studio में आपकी पिछली विज़िट को करीब एक महीना हो गया। क्या इस हफ़्ते अगला अपॉइंटमेंट बुक करें? आपसे फिर मिलकर ख़ुशी होगी।”',
          '“नमस्ते राहुल जी, आपका हेयरकट शायद अब तक ड्यू हो गया होगा। हफ़्ते के किसी भी दिन दोपहर आइए — कोई इंतज़ार नहीं। — Style Studio”',
          '“नमस्ते, शर्मा लॉन्ड्री से। आपका पिछला ऑर्डर दो हफ़्ते पहले था — अगर कपड़े देने हों तो हम कल सुबह ले जा सकते हैं।”',
        ],
      },
      {
        h2: 'जब इनाम पास हो',
        list: [
          '“नमस्ते अंजलि जी, Sweet Corner पर आपके 5 में से 4 स्टैम्प हो गए हैं। बस एक विज़िट और, आपका मुफ़्त गिफ़्ट तैयार है। जल्दी मिलते हैं!”',
          '“नमस्ते अमित जी, Style Studio में आपकी मुफ़्त हेड मसाज बस एक विज़िट दूर है। आपका इंतज़ार है।”',
        ],
      },
      {
        h2: 'ऑफ़र वाले मैसेज',
        list: [
          'मुफ़्त ऐड-ऑन: “नमस्ते नेहा जी, इस महीने अगली विज़िट पर किसी भी हेयरकट के साथ हेयर वॉश मुफ़्त। जल्दी मिलते हैं। — Style Studio”',
          'अगली विज़िट पर 10% छूट: “नमस्ते करण जी, पिछले हफ़्ते आने के लिए धन्यवाद! अगली विज़िट पर यह मैसेज दिखाएँ और 10% छूट पाएँ। 30 तारीख़ तक।”',
          'दोस्त को लाएँ: “नमस्ते पूजा जी, अगली बार किसी दोस्त को साथ लाइए, दोनों की थ्रेडिंग मुफ़्त। — Glow Parlour”',
          'नया माल: “नमस्ते, आपने जो ताज़ा काजू कतली पूछी थी, आज आ गई है। आपके लिए थोड़ी अलग रख दी है। — Sweet Corner”',
        ],
      },
      {
        h2: 'आना बंद कर चुके ग्राहकों के लिए',
        list: [
          '“नमस्ते सुरेश जी, काफ़ी दिनों से आप गुप्ता जनरल स्टोर नहीं आए — उम्मीद है सब ठीक है। आपसे फिर मिलकर ख़ुशी होगी।”',
          '“नमस्ते मीरा जी, Glow Parlour में आपकी पिछली विज़िट को कुछ महीने हो गए। आपके कार्ड पर अभी 3 स्टैम्प हैं — दो और, और आपका मुफ़्त फ़ेस क्लीनअप तैयार।”',
        ],
      },
      {
        h2: 'कौन-सा ऑफ़र चुनें',
        table: {
          head: ['ऑफ़र', 'किसके लिए अच्छा', 'ध्यान रखें'],
          rows: [
            ['मुफ़्त ऐड-ऑन', 'सैलून, पार्लर, लॉन्ड्री, कैफ़े', 'ऐसी चीज़ चुनें जो जल्दी हो और सस्ती पड़े'],
            ['अगली विज़िट पर 10% छूट', 'बड़े बिल, एक बार का धक्का', 'ग्राहक अगली छूट का इंतज़ार करने लगते हैं'],
            ['पास आया इनाम', 'लॉयल्टी कार्ड वाली हर दुकान', 'कुछ नहीं — कोई अलग ख़र्च नहीं'],
            ['दोस्त को लाएँ', 'नए ग्राहक लाना', 'नियम आसान रखें'],
            ['नया माल', 'किराना, मिठाई की दुकान, बुटीक', 'सिर्फ़ वही जो वे सच में ख़रीदते हैं'],
          ],
        },
        p: ['मुफ़्त ऐड-ऑन ग्राहक को अक्सर छूट से बड़ा लगता है, और आपको सस्ता पड़ता है। छूट छोटे समय के लिए रखें।'],
      },
      {
        h2: 'Regularhood के साथ',
        p: [
          'Regularhood हर ग्राहक की विज़िट उसके फ़ोन नंबर पर दर्ज रखता है, तो आपको पता रहता है किसे मैसेज भेजना है और उसका इनाम कितना पास है। एक टैप में ग्राहक को WhatsApp पर उनका कार्ड जाता है, और ऐप न लौटे ग्राहकों की लिस्ट तैयार “हम आपको मिस कर रहे हैं” मैसेज के साथ दिखाता है। सब आपके अपने WhatsApp से जाता है। शुरू करना मुफ़्त।',
        ],
      },
    ],
    faqs: [
      { q: 'ग्राहक को विनम्रता से दोबारा आने को कैसे कहें?', a: 'दुकान के नाम से एक छोटा मैसेज भेजें: नाम लेकर नमस्ते करें, कहें कि आप उनसे फिर मिलना चाहेंगे, और आने की एक छोटी वजह दें, जैसे पास आया इनाम या मुफ़्त ऐड-ऑन।' },
      { q: 'कौन-सा ऑफ़र ग्राहकों को दोबारा लाता है?', a: 'मुफ़्त ऐड-ऑन या बार-बार आने पर इनाम अक्सर छूट से बेहतर काम करता है। यह तोहफ़े जैसा लगता है और ग्राहकों को अगली सेल का इंतज़ार करना नहीं सिखाता।' },
      { q: 'ग्राहकों को कितनी बार मैसेज करें?', a: 'कम। जब उनके काम का हो — सर्विस ड्यू हो, इनाम पास हो, लंबे समय से न आए हों — तब एक मैसेज अच्छा लगता है। रोज़ के मैसेज स्पैम लगते हैं।' },
      { q: 'WhatsApp पर भेजें या SMS पर?', a: 'WhatsApp पर, अगर उनके पास है। ग्राहक जानी-पहचानी दुकानों से वहीं बात करते हैं, और निजी मैसेज बल्क SMS से बिल्कुल अलग लगता है।' },
    ],
  },
  {
    // Roman-script Hindi (Hinglish): most shop owners type these searches in Roman letters.
    slug: 'dukan-ki-sale-kaise-badhaye',
    name: 'Dukan ki sale kaise badhaye',
    title: 'Dukan ki Sale Kaise Badhaye? 10 Aasan Tarike (Bina Ad ke)',
    description: 'Dukan ki sale kaise badhaye aur shop pe customer kaise banaye? Purane customer ko baar-baar bulane, reward, WhatsApp status aur counter ke 10 aasan tarike. Free.',
    eyebrow: 'Dukan ki sale',
    h1: 'Dukan ki sale kaise badhaye: 10 aasan tarike jo sach mein kaam karte hain',
    intro:
      'Zyada tar dukaandaar sale badhane ke liye naye customer dhoondhte hain — pamphlet, ad, bhaari discount. Par sabse jaldi sale un logon se badhti hai jo aapko pehle se jaante hain. Agar aapke 100 pakke customer mahine mein bas ek baar zyada aayein, toh woh 100 nayi visit hain — bina kisi kharche ke.',
    updated: ADDED_NOV12,
    sibling: 'how-to-increase-shop-sales',
    blocks: [
      {
        h2: 'Sale teen cheezon se banti hai',
        p: [
          'Kitne customer hain × woh kitni baar aate hain × har baar kitna khareedte hain. Zyada tar log sirf pehli cheez pe kaam karte hain, jo sabse mehngi hai.',
          'Customer kitni baar aata hai — yeh badalna sabse aasan hai. Iske liye na ad chahiye, na discount.',
        ],
      },
      {
        h2: 'Shop pe customer kaise banaye: 10 tarike',
        steps: [
          { title: 'Har visit pe reward do', text: 'Ek aasan niyam: har 5 visit pe ek chhota free gift. Customer ke paas bagal wali dukan chhod kar aapke paas aane ki wajah hoti hai.' },
          { title: 'Batao reward kitna paas hai', text: '“Bas ek visit aur, aapka gift ready hai” — yeh sunke customer jaldi lautta hai.' },
          { title: 'Counter pe poster lagao', text: 'Jahan paise diye jaate hain, wahan ek chhota poster: “Har 5 visit pe gift free”. Log khud poochte hain.' },
          { title: 'Roz WhatsApp status lagao', text: 'Naya maal, aaj ka special, aapka reward ka niyam — aapka number save karne wale sab customer free mein dekhte hain.' },
          { title: 'Customer ko naam se bulao', text: '“Aaiye Sharma ji” — customer ko lagta hai yeh uski apni dukan hai.' },
          { title: 'Ek aur cheez suggest karo', text: 'Bill banate time ek imaandaar suggestion — jo cheez saath mein kaam aaye — bill badhata hai bina zabardasti ke.' },
          { title: 'Best-seller kabhi khatam na ho', text: 'Customer apni roz ki cheez lene aaya aur nahi mili, toh woh doosri dukan try karega — aur wahin reh sakta hai.' },
          { title: 'Google pe dukan daalo', text: 'Google Business Profile free hai. Photo, timing, phone number daalo aur khush customers se review maango.' },
          { title: 'Dekho kaun aana band kar gaya', text: 'Purana customer chupchaap chala jaata hai. Time pe pata chale toh wapas bulana aasan hai.' },
          { title: 'Ek pyaara sa message bhejo', text: '“Namaste Suresh ji, kaafi din se aap nahi aaye — sab theek hai? Aapka intezaar rahega.” Bas itna kaafi hai.' },
        ],
      },
      {
        h2: 'Kya aksar kaam nahi karta',
        list: [
          'Bhaari discount — customer ek baar aata hai aur agli sale ka intezaar karta hai.',
          'Pamphlet aur akhbaar ke ad — pata hi nahi chalta koi aaya ya nahi.',
          'Anjaan numbers pe bulk SMS — spam lagta hai.',
          'Customer se koi app download karwana — zyada tar nahi karte.',
        ],
      },
      {
        h2: 'Regularhood ke saath',
        p: [
          'Regularhood yeh sab ek tap mein karta hai. Aap ek niyam rakhte ho — har N visit (3 se 10) pe ek reward — phir counter pe customer ka phone number likh ke Add visit dabate ho. Reward kab dena hai, app batata hai.',
          'Customer ko ek tap mein WhatsApp pe uska card jaata hai. Counter poster aur WhatsApp status ki photo ready milti hai, aur jo customer nahi laute unki list ready “hum aapko miss kar rahe hain” message ke saath. Shuru karna free hai.',
        ],
      },
    ],
    faqs: [
      { q: 'Dukan ki sale kaise badhaye bina paise kharch kiye?', a: 'Purane customer ko baar-baar bulao: visit pe chhota reward, counter poster, WhatsApp status aur jo aana band kar gaye unhe ek personal message. Yeh sab free hai.' },
      { q: 'Shop pe customer kaise banaye?', a: 'Har customer ka number lo, use reward ka niyam batao aur Google pe dukan daalo. Jo do-teen baar laute, unhe naam se yaad rakho — wahi pakke customer bante hain.' },
      { q: 'Kya discount dene se sale badhti hai?', a: 'Thodi der ke liye. Discount ek baar laata hai, par baar-baar aane pe chhota reward aadat banata hai — aur aapka margin bhi bachta hai.' },
      { q: 'Customer bulane ka mantra kya hai?', a: 'Jo customer ek baar aaya, use baar-baar aane ki wajah do: naam se pehchaano, reward do, aur jo aana band kare use pyaar se yaad dilao.' },
    ],
  },
  {
    slug: 'customer-bulane-ke-upay',
    name: 'दुकान में ग्राहक बुलाने के उपाय',
    title: 'दुकान में ग्राहक बुलाने का मंत्र: 9 उपाय जो सच में काम करते हैं',
    description: 'दुकान में ग्राहक कैसे बढ़ाएँ (dukan me grahak kaise badhaye)? ग्राहक बुलाने का असली मंत्र — पक्के ग्राहक, इनाम, WhatsApp और काउंटर। आज से शुरू करें, मुफ़्त।',
    eyebrow: 'ग्राहक बढ़ाने के उपाय',
    h1: 'दुकान में ग्राहक बुलाने का असली मंत्र: 9 आसान उपाय',
    intro:
      'हर दुकानदार चाहता है कि उसकी दुकान पर भीड़ रहे। कोई पूजा-पाठ करता है, कोई नींबू-मिर्च लटकाता है — आस्था अपनी जगह है। पर जो दुकानें सालों तक चलती हैं, उनका असली मंत्र एक ही है: जो ग्राहक एक बार आया, वह बार-बार आए। यहाँ 9 उपाय हैं जो कोई भी दुकान आज से कर सकती है।',
    updated: ADDED_NOV19,
    sibling: 'grahak-bulane-ka-mantra',
    blocks: [
      {
        h2: 'ग्राहक बुलाने के 9 उपाय',
        steps: [
          { title: 'हर ग्राहक को नाम से पहचानें', text: '“आइए शर्मा जी” सुनकर ग्राहक को लगता है यह उसकी अपनी दुकान है। यही सबसे पुराना और सबसे पक्का मंत्र है।' },
          { title: 'बार-बार आने पर इनाम दें', text: 'हर 5 विज़िट पर एक छोटा मुफ़्त तोहफ़ा। ग्राहक के पास बगल वाली दुकान छोड़कर आपके पास आने की वजह होती है।' },
          { title: 'काउंटर पर अपना ऑफ़र लिखकर लगाएँ', text: 'जहाँ पैसे दिए जाते हैं, वहाँ एक छोटा पोस्टर: “हर 5 विज़िट पर तोहफ़ा मुफ़्त”। लोग ख़ुद पूछते हैं।' },
          { title: 'रोज़ WhatsApp स्टेटस लगाएँ', text: 'नया माल, आज का स्पेशल, आपका इनाम का नियम — आपके नंबर वाले सब ग्राहक मुफ़्त में देखते हैं।' },
          { title: 'जो चीज़ सबसे ज़्यादा बिकती है, वह कभी ख़त्म न हो', text: 'ग्राहक अपनी रोज़ की चीज़ लेने आया और नहीं मिली, तो वह दूसरी दुकान आज़माएगा।' },
          { title: 'दुकान साफ़ और रोशन रखें', text: 'बाहर से अंदर दिखे, सामान साफ़ सजा हो, दाम लिखे हों। अंधेरी, भरी हुई दुकान में नया ग्राहक अंदर नहीं आता।' },
          { title: 'Google पर अपनी दुकान डालें', text: 'Google Business Profile मुफ़्त है। फ़ोटो, समय और फ़ोन नंबर डालें, और ख़ुश ग्राहकों से रिव्यू माँगें।' },
          { title: 'देखें कौन आना बंद कर गया', text: 'पुराना ग्राहक चुपचाप चला जाता है। समय रहते पता चले तो उसे वापस बुलाना आसान है।' },
          { title: 'एक प्यारा-सा मैसेज भेजें', text: '“नमस्ते सुरेश जी, काफ़ी दिनों से आप नहीं आए — सब ठीक है? आपका इंतज़ार रहेगा।” बस इतना काफ़ी है।' },
        ],
      },
      {
        h2: 'रोज़ के 10 मिनट: ग्राहक बुलाने का मंत्र',
        p: ['मंत्र एक दिन का काम नहीं, रोज़ की आदत है। यह छोटी-सी दिनचर्या किसी भी दुकान में चलती है और इसमें कोई ख़र्च नहीं।'],
        table: {
          head: ['कब', 'क्या करें', 'कितना समय'],
          rows: [
            ['सुबह दुकान खोलते ही', 'WhatsApp स्टेटस: आज का नया माल या स्पेशल, और इनाम का नियम', '2 मिनट'],
            ['हर बिल पर', 'ग्राहक का नंबर लिखकर विज़िट जोड़ें और बताएँ कि इनाम कितनी विज़िट दूर है', '10 सेकंड'],
            ['दोपहर, जब भीड़ कम हो', 'देखें कौन-सा माल ख़त्म होने वाला है, ताकि रोज़ का ग्राहक ख़ाली हाथ न लौटे', '3 मिनट'],
            ['शाम को', 'दो-तीन ऐसे ग्राहकों को निजी मैसेज जो काफ़ी दिनों से नहीं आए', '5 मिनट'],
            ['हफ़्ते में एक बार', 'दो ख़ुश ग्राहकों से Google रिव्यू माँगें', '2 मिनट'],
          ],
        },
      },
      {
        h2: 'नया ग्राहक लाना महँगा, पुराने को बुलाना सस्ता',
        p: [
          'पैम्फ़लेट, अख़बार का विज्ञापन, भारी छूट — इनमें पैसा लगता है और पता नहीं चलता कि कोई आया या नहीं। जो ग्राहक पहले से आपको जानता है, उसे महीने में एक बार और बुलाना लगभग मुफ़्त है।',
          'अगर आपके 100 पक्के ग्राहक महीने में बस एक बार और आएँ, तो वह 100 नई विज़िट हैं — बिना किसी विज्ञापन के।',
        ],
      },
      {
        h2: 'जो उपाय अक्सर काम नहीं करते',
        list: [
          'बहुत भारी छूट — ग्राहक एक बार आता है और अगली सेल का इंतज़ार करता है।',
          'अनजान नंबरों पर बल्क SMS — स्पैम लगता है।',
          'ग्राहकों से कोई ऐप डाउनलोड करवाना — ज़्यादातर नहीं करते।',
          'हर हफ़्ते नया ऑफ़र — ग्राहक कोई भी याद नहीं रखता।',
        ],
      },
      {
        h2: 'Regularhood के साथ',
        p: [
          'Regularhood इनमें से कई उपाय एक टैप में करता है। आप एक नियम तय करते हैं — हर N विज़िट (3 से 10) पर एक इनाम — फिर काउंटर पर ग्राहक का फ़ोन नंबर लिखकर Add visit दबाते हैं। इनाम कब देना है, ऐप बताता है।',
          'काउंटर पोस्टर और WhatsApp स्टेटस की फ़ोटो तैयार मिलती है, और न लौटे ग्राहकों की लिस्ट तैयार “हम आपको मिस कर रहे हैं” मैसेज के साथ। शुरू करना मुफ़्त।',
        ],
      },
    ],
    faqs: [
      { q: 'दुकान में ग्राहक बुलाने के लिए रोज़ क्या करें?', a: 'सुबह WhatsApp स्टेटस लगाएँ, दिन भर हर ग्राहक का नंबर लिखकर विज़िट जोड़ें और इनाम का नियम बताएँ, और शाम को दो-तीन ऐसे ग्राहकों को मैसेज करें जो काफ़ी दिनों से नहीं आए। रोज़ के ये 10 मिनट ही असली मंत्र हैं।' },
      { q: 'दुकान में ग्राहक बुलाने का सबसे अच्छा मंत्र क्या है?', a: 'जो ग्राहक एक बार आया, उसे बार-बार आने की वजह दें: नाम से पहचानें, हर कुछ विज़िट पर छोटा इनाम दें, और जो आना बंद कर दे उसे प्यार से याद दिलाएँ।' },
      { q: 'दुकान पर ग्राहक कैसे बढ़ाएँ बिना पैसे खर्च किए?', a: 'WhatsApp स्टेटस, Google Business Profile, काउंटर पोस्टर और पुराने ग्राहकों को एक निजी मैसेज — ये सब मुफ़्त हैं और पक्के ग्राहकों पर सबसे जल्दी असर करते हैं।' },
      { q: 'नई दुकान पर ग्राहक कैसे आएँ?', a: 'पहले हफ़्ते से हर ग्राहक का नंबर लें, उसे इनाम का नियम बताएँ और Google पर दुकान डालें। जो दो-तीन बार लौटे, उन्हें पक्का ग्राहक बनाएँ।' },
      { q: 'क्या टोटके या मंत्र से दुकान चलती है?', a: 'आस्था हर किसी की अपनी है। पर दुकान रोज़ ग्राहकों की वापसी से चलती है — अच्छी सर्विस, सही माल और याद रखा गया ग्राहक, यही असली टोटका है।' },
    ],
  },
  {
    slug: 'follow-up-message-for-repeat-service',
    name: 'ग्राहक को दोबारा बुलाने का फ़ॉलो-अप मैसेज',
    title: 'ग्राहक को दोबारा सर्विस के लिए फ़ॉलो-अप मैसेज कैसे लिखें (उदाहरण)',
    description: 'ग्राहक को दोबारा सर्विस या ऑर्डर के लिए छोटा, विनम्र फ़ॉलो-अप मैसेज कैसे लिखें — मुफ़्त ऐड-ऑन, 10% छूट जैसे ऑफ़र और तैयार उदाहरण।',
    eyebrow: 'फ़ॉलो-अप मैसेज',
    h1: 'ग्राहक को दोबारा बुलाने का फ़ॉलो-अप मैसेज कैसे लिखें',
    intro:
      'अच्छे फ़ॉलो-अप मैसेज के तीन हिस्से होते हैं: नाम लेकर विनम्र नमस्ते, आने की एक छोटी वजह (ऑफ़र), और एक आसान अगला कदम। नीचे लिखने का तरीका, सबसे अच्छे ऑफ़र और तैयार उदाहरण हैं।',
    updated: ADDED_NOV10,
    blocks: [
      {
        h2: 'कदम 1: छोटा और विनम्र मैसेज लिखें',
        steps: [
          { title: 'नाम से नमस्ते करें', text: '“नमस्ते प्रिया जी” अपनापन लगता है, “प्रिय ग्राहक” बल्क मैसेज लगता है।' },
          { title: 'बताएँ कि आप कौन हैं और वे कब आए थे', text: '“स्टाइल स्टूडियो में आपकी पिछली विज़िट को लगभग एक महीना हो गया।”' },
          { title: 'एक आसान सवाल पूछें', text: '“क्या इस हफ़्ते अगली अपॉइंटमेंट बुक करें?”' },
          { title: 'दुकान के नाम से ख़त्म करें', text: '“आपका इंतज़ार रहेगा। — स्टाइल स्टूडियो”' },
        ],
      },
      {
        h2: 'कदम 2: ऐसा ऑफ़र चुनें जो ग्राहक को लौटाए',
        table: {
          head: ['ऑफ़र', 'उदाहरण', 'किसके लिए अच्छा'],
          rows: [
            ['मुफ़्त ऐड-ऑन', 'हेयरकट के साथ हेयर वॉश मुफ़्त', 'सैलून, पार्लर, लॉन्ड्री'],
            ['10% छूट', 'अगली विज़िट पर 10% छूट, 30 तारीख़ तक', 'एक बार का धक्का'],
            ['मुफ़्त तोहफ़ा', 'अगले ऑर्डर पर एक छोटा तोहफ़ा', 'दुकानें, बेकरी, बुटीक'],
            ['मुफ़्त डिलीवरी', 'अगले ऑर्डर पर होम डिलीवरी मुफ़्त', 'किराना, मेडिकल, टिफ़िन'],
            ['पास आया इनाम', 'बस एक विज़िट और, तोहफ़ा तैयार', 'लॉयल्टी कार्ड वाली हर दुकान'],
          ],
        },
        p: ['एक मैसेज में एक ही ऑफ़र रखें। दो-तीन ऑफ़र एक साथ विज्ञापन जैसे लगते हैं।'],
      },
      {
        h2: 'कदम 3: पूरा मैसेज — उदाहरण',
        list: [
          'सैलून: “नमस्ते प्रिया जी, स्टाइल स्टूडियो में आपकी पिछली विज़िट को लगभग एक महीना हो गया। इस हफ़्ते हेयरकट बुक करें, हेयर वॉश मुफ़्त मिलेगा। आपका इंतज़ार रहेगा!”',
          'लॉन्ड्री: “नमस्ते राहुल जी, शर्मा लॉन्ड्री से। आपके पिछले ऑर्डर को दो हफ़्ते हो गए — इस हफ़्ते कपड़े दें और 10% छूट पाएँ। कल सुबह हम ले जा सकते हैं।”',
          'किराना: “नमस्ते अंजलि जी, गुप्ता स्टोर से ख़रीदारी के लिए धन्यवाद। अगले ऑर्डर पर छोटा तोहफ़ा और होम डिलीवरी मुफ़्त। बस अपनी लिस्ट इसी मैसेज पर भेज दें।”',
          'इनाम पास: “नमस्ते अमित जी, स्वीट कॉर्नर पर आपके 5 में से 4 स्टैम्प हो गए। बस एक विज़िट और, आपका तोहफ़ा तैयार है!”',
        ],
      },
      {
        h2: 'Regularhood के साथ',
        p: [
          'असली मुश्किल मैसेज लिखना नहीं, यह जानना है कि कौन ग्राहक नहीं लौटा। Regularhood हर ग्राहक की विज़िट उसके फ़ोन नंबर पर गिनता है, न लौटे ग्राहकों की लिस्ट दिखाता है, और हर एक के लिए तैयार “हम आपको मिस कर रहे हैं” मैसेज देता है — आपके अपने WhatsApp से। शुरू करना मुफ़्त।',
        ],
      },
    ],
    faqs: [
      { q: 'ग्राहक को दोबारा सर्विस के लिए विनम्र मैसेज कैसे लिखें?', a: 'नाम लेकर नमस्ते करें, बताएँ कि वे कब आए थे, एक छोटा ऑफ़र दें जैसे मुफ़्त ऐड-ऑन या 10% छूट, और एक आसान सवाल पूछें। आख़िर में दुकान का नाम लिखें।' },
      { q: 'कौन-से ऑफ़र ग्राहकों को दोबारा लाते हैं?', a: 'मुफ़्त ऐड-ऑन, छोटा तोहफ़ा, मुफ़्त डिलीवरी, अगली विज़िट पर 10% छूट, या यह याद दिलाना कि उनका इनाम पास है।' },
      { q: 'फ़ॉलो-अप मैसेज कब भेजें?', a: 'जब वे आम तौर पर लौटते: हेयरकट के एक महीने बाद, लॉन्ड्री के दो हफ़्ते बाद, या जब इनाम बस एक विज़िट दूर हो।' },
    ],
  },
  {
    slug: 'restaurant-loyalty-program',
    name: 'रेस्टोरेंट लॉयल्टी प्रोग्राम',
    title: 'रेस्टोरेंट लॉयल्टी प्रोग्राम: बिना ऐप, आसान तरीका',
    description: 'रेस्टोरेंट, ढाबा या कैफ़े के लिए लॉयल्टी प्रोग्राम: ग्राहक के फ़ोन नंबर पर विज़िट कार्ड, मुनाफ़ा बचाने वाले इनाम और WhatsApp। शुरू करना मुफ़्त।',
    eyebrow: 'रेस्टोरेंट लॉयल्टी',
    h1: 'आपके रेस्टोरेंट का लॉयल्टी प्रोग्राम, जो मेहमान सच में इस्तेमाल करें',
    intro:
      'बड़ी चेन पॉइंट्स, टियर और वॉलेट वाले ऐप चलाती हैं। मोहल्ले के रेस्टोरेंट को यह सब नहीं चाहिए। जो परिवार महीने में दो बार आपके यहाँ खाता है, उसे बस नई जगह की जगह आपको चुनने की एक छोटी वजह चाहिए।',
    updated: ADDED_NOV10,
    blocks: [
      {
        h2: 'आसान तरीका: पॉइंट्स नहीं, विज़िट',
        steps: [
          { title: 'फ़ोन नंबर पर विज़िट गिनें', text: 'बिलिंग पर मेहमान का नंबर लिखें और विज़िट जोड़ें। मेहमान को कुछ इंस्टॉल नहीं करना।' },
          { title: 'एक नियम रखें', text: 'हर 5 विज़िट पर एक मुफ़्त डेज़र्ट या स्टार्टर।' },
          { title: 'मेहमान को बताएँ', text: '“आपका पहला स्टैम्प लग गया — चार और, फिर डेज़र्ट हमारी तरफ़ से।”' },
          { title: 'न लौटने वालों को बुलाएँ', text: 'जो परिवार हर रविवार आता था और एक महीने से नहीं आया, उसे WhatsApp पर एक छोटा मैसेज।' },
        ],
      },
      {
        h2: 'मुनाफ़ा बचाने वाले इनाम',
        table: {
          head: ['इनाम', 'क्यों काम करता है'],
          rows: [
            ['मुफ़्त डेज़र्ट', 'दिखने में बड़ा, लागत कम'],
            ['मुफ़्त स्टार्टर', 'मेहमान साथ में ज़्यादा ऑर्डर करते हैं'],
            ['मुफ़्त लस्सी या कोल्ड ड्रिंक', 'आपके लिए सस्ता, मेहमान को अच्छा लगे'],
            ['अगले ऑर्डर पर मुफ़्त डिलीवरी', 'मेहमान सीधे आपसे ऑर्डर करें, ऐप से नहीं'],
          ],
        },
        p: ['“पूरा खाना मुफ़्त” या पूरे बिल पर छूट से बचें — इसकी लागत फ़ायदे से कहीं ज़्यादा है।'],
      },
      {
        h2: 'Regularhood के साथ',
        p: [
          'Regularhood मेहमान के फ़ोन नंबर पर विज़िट कार्ड है। नियम आप तय करते हैं — हर N विज़िट (3 से 10) पर एक इनाम — और बिलिंग पर नंबर लिखकर Add visit दबाते हैं। इनाम कब देना है, ऐप बताता है।',
          'एक टैप में मेहमान को WhatsApp पर उनका कार्ड, काउंटर पोस्टर, और न लौटे मेहमानों की लिस्ट तैयार मैसेज के साथ। किसी भी फ़ोन, टैबलेट या कंप्यूटर पर। शुरू करना मुफ़्त।',
        ],
      },
    ],
    faqs: [
      { q: 'छोटे रेस्टोरेंट के लिए सबसे अच्छा लॉयल्टी प्रोग्राम कौन-सा है?', a: 'फ़ोन नंबर पर विज़िट कार्ड: हर कुछ विज़िट पर एक मुफ़्त डिश। मेहमान के लिए कोई ऐप नहीं, स्टाफ़ के लिए बस कुछ सेकंड।' },
      { q: 'क्या ढाबे और कैफ़े में भी चलेगा?', a: 'हाँ। जहाँ भी वही लोग बार-बार आते हैं — बैठकर खाएँ या डिलीवरी — वहाँ विज़िट गिनकर इनाम दिया जा सकता है।' },
      { q: 'इसका ख़र्च कितना है?', a: 'Regularhood शुरू करना मुफ़्त है। असली ख़र्च इनाम का है, इसलिए डेज़र्ट या ड्रिंक जैसी कम लागत वाली चीज़ चुनें।' },
    ],
  },
  {
    // Roman-script searches seen in Search Console: "customer bulane ka mantra", "grahak bulane ka mantra",
    // "vyapar badhane ka mantra", "dukaan mein grahak bulane ki dua".
    slug: 'grahak-bulane-ka-mantra',
    name: 'Grahak bulane ka mantra',
    title: 'Dukan Mein Grahak Bulane ka Mantra: Asli Mantra Jo Roz Kaam Aata Hai',
    description: 'Grahak bulane ka mantra aur vyapar badhane ka tarika: jo customer ek baar aaya, use baar-baar bulane ke 7 aasan upay — naam, reward, WhatsApp aur counter. Free.',
    eyebrow: 'Grahak bulane ka mantra',
    h1: 'Dukan mein grahak bulane ka mantra: woh mantra jo roz kaam aata hai',
    intro:
      'Puja-paath aur shubh muhurat apni jagah — har dukaandaar ki apni aastha hoti hai. Par counter pe roz jo mantra kaam aata hai, woh seedha hai: jo grahak ek baar aaya, use dobara aane ki wajah do. Naya grahak dhoondhne se kahin aasan hai purane grahak ko baar-baar bulana.',
    updated: ADDED_NOV16,
    sibling: 'customer-bulane-ke-upay',
    blocks: [
      {
        h2: 'Asli mantra: ek baar aaya, toh baar-baar aaye',
        p: [
          'Zyada tar dukaan ki kamai pakke grahakon se aati hai — woh log jo hafte mein, mahine mein, ya roz aate hain. Agar unme se har koi mahine mein bas ek baar zyada aaye, toh bina kisi ad ke sale badh jaati hai.',
          'Isliye mantra naye grahak bulane ka nahi, purane grahak ko rokne ka hai.',
        ],
      },
      {
        h2: 'Grahak bulane ke 7 upay',
        steps: [
          { title: 'Naam se bulao', text: '“Aaiye Verma ji” — grahak ko lagta hai yeh uski apni dukaan hai. Yaad na rahe toh number ke saath naam likh lo.' },
          { title: 'Har visit ka hisaab rakho', text: 'Ek aasan niyam: har 5 ya 6 visit pe ek chhota free gift. Grahak ke paas bagal wali dukaan chhod kar aapke paas aane ki wajah hoti hai.' },
          { title: 'Batao reward kitna paas hai', text: '“Bas ek visit aur, aapka gift ready hai” — yeh sunke log jaldi lautte hain.' },
          { title: 'Counter pe niyam likh do', text: 'Jahan paise diye jaate hain wahan ek chhota poster: “Har 5 visit pe gift free”. Log khud poochte hain.' },
          { title: 'WhatsApp status lagao', text: 'Naya maal, aaj ka special, aapka reward — jinke paas aapka number save hai, woh sab free mein dekhte hain.' },
          { title: 'Jo aana band kare, use yaad karo', text: '“Namaste Suresh ji, kaafi din se nahi aaye — sab theek?” Ek pyaara sa message kaafi hai.' },
          { title: 'Wada nibhao', text: 'Jo reward bola, woh time pe do. Bharosa hi woh cheez hai jo grahak ko pakka banata hai.' },
        ],
      },
      {
        h2: 'Kya aksar kaam nahi karta',
        list: [
          'Bhaari discount — grahak ek baar aata hai aur agli sale ka intezaar karta hai.',
          'Anjaan numbers pe bulk SMS — spam lagta hai, dukaan ki izzat ghatti hai.',
          'Har grahak se app download karwana — zyada tar nahi karte.',
        ],
      },
      {
        h2: 'Regularhood se yeh mantra roz chalta hai',
        p: [
          'Regularhood mein aap ek niyam rakhte ho — har N visit (3 se 10) pe ek reward. Counter pe grahak ka phone number likho aur Add visit dabao; reward kab dena hai, app batata hai.',
          'Grahak ko ek tap mein WhatsApp pe uska card jaata hai. Jo grahak nahi laute, unki list “hum aapko miss kar rahe hain” message ke saath ready milti hai. Shuru karna free hai.',
        ],
      },
    ],
    faqs: [
      { q: 'Grahak bulane ka sabse aasan mantra kya hai?', a: 'Jo grahak ek baar aaya, use dobara aane ki wajah do: naam se pehchaano, har visit ka chhota reward rakho, aur jo aana band kare use pyaar se yaad dilao.' },
      { q: 'Vyapar badhane ka mantra kya hai?', a: 'Naye grahak dhoondhne se pehle purane grahak ko baar-baar bulao. Woh aapko pehle se jaante hain, isliye unhe lautana sabse sasta hai.' },
      { q: 'Kya totke ya dua se grahak aate hain?', a: 'Aastha har kisi ki apni hai. Par jo cheez har dukaan mein dikhti hai, woh yeh hai: grahak wahi lautta hai jahan use pehchana jaata hai aur kuch milta hai.' },
    ],
  },
  {
    // Pairs with the free stamp card maker (/hi/tools/stamp-card-maker).
    slug: 'loyalty-card-kaise-banaye',
    name: 'Loyalty card kaise banaye',
    title: 'Loyalty Card Kaise Banaye? Dukan ke Liye Stamp Card (Free Maker)',
    description: 'Dukan ke liye loyalty card kaise banaye: kitni visit, kya reward, paper card ya phone number pe card. Free stamp card maker se 1 minute mein print karein.',
    eyebrow: 'Loyalty card',
    h1: 'Loyalty card kaise banaye: dukan ke liye stamp card, step by step',
    intro:
      'Loyalty card ka matlab hai: har visit pe ek stamp, card bhar gaya toh ek free reward. Iske liye na koi bada system chahiye, na kharcha. Bas teen cheezein tay karni hain — kitni visit, kya reward, aur card kahan rahega.',
    updated: ADDED_NOV16,
    blocks: [
      {
        h2: 'Loyalty card banane ke 4 step',
        steps: [
          { title: 'Visit tay karo', text: 'Zyada tar dukaan ke liye 5 se 8. Jahan log roz aate hain (kirana, doodh, sabzi) wahan 10; salon jaise jahan kuch hafte mein aate hain, wahan 4.' },
          { title: 'Reward chuno', text: 'Aisi cheez jo aap roz bechte ho aur jiski laagat kam hai: ek free item, chhota add-on, ya bill pe tay chhoot jaise ₹50 off. Poora bill free nahi.' },
          { title: 'Card banao', text: 'Paper card ke liye hamara free stamp card maker use karo: dukaan ka naam aur reward likho, A4 pe 10 card print karo aur kaat lo.' },
          { title: 'Har grahak ko batao', text: 'Bill dete waqt ek line: “Aapka pehla stamp lag gaya — 5 visit aur, phir gift free.” Counter pe poster lagao.' },
        ],
      },
      {
        h2: 'Paper card ya phone number pe card?',
        table: {
          head: ['', 'Paper card', 'Phone number pe card'],
          rows: [
            ['Kharcha', 'Printing ka', 'Shuru karna free'],
            ['Grahak bhool jaaye', 'Stamp nahi lagta', 'Number bolo, ho gaya'],
            ['Nakli stamp', 'Pen se koi bhi laga de', 'Sirf counter se lagta hai'],
            ['Kaun aana band kar gaya', 'Pata nahi chalta', 'List milti hai'],
            ['Grahak ko yaad dilana', 'Nahi ho sakta', 'WhatsApp pe ek tap'],
          ],
        },
      },
      {
        h2: 'Regularhood: phone number pe loyalty card',
        p: [
          'Regularhood mein card grahak ke phone number pe rehta hai. Counter pe number likho, Add visit dabao — reward kab dena hai, app batata hai. Grahak ko WhatsApp pe uska card milta hai, koi app download nahi karni padti.',
          'Shuru karna free hai. Agar abhi paper se shuru karna hai, toh free stamp card maker se card print kar lo.',
        ],
      },
    ],
    faqs: [
      { q: 'Loyalty card kaise banaye free mein?', a: 'Hamare free stamp card maker mein dukaan ka naam, reward aur visit likho, aur A4 pe 10 card print karo. Ya Regularhood pe grahak ke phone number pe card banao — woh bhi free shuru hota hai.' },
      { q: 'Loyalty card pe kitni visit rakhein?', a: 'Zyada tar dukaan ke liye 5 se 8. Bahut zyada visit rakhoge toh grahak beech mein hi chhod dega.' },
      { q: 'Loyalty card ka size kya hota hai?', a: 'Visiting card jitna, 85 × 55 mm, taaki batue mein aa jaaye.' },
    ],
  },
  {
    // Roman twin in spirit of /hi/guide/win-back-old-customers (237 impressions in Search Console).
    slug: 'purane-customer-wapas-kaise-laye',
    name: 'Purane customer wapas kaise laye',
    title: 'Purane Customer Wapas Kaise Laye? 5 Step + WhatsApp Message (Copy Karein)',
    description: 'Jo customer aana band kar gaye, unhe wapas kaise laye: list kaise banaye, kab message bhejein, aur 6 ready WhatsApp message jo aap copy kar sakte ho. Free.',
    eyebrow: 'Purane customer',
    h1: 'Purane customer wapas kaise laye: 5 step aur ready message',
    intro:
      'Pakka customer chupchaap chala jaata hai — na shikayat karta hai, na batata hai. Zyada tar baar koi badi wajah nahi hoti: bas aadat toot gayi. Aur toot-ti aadat ko ek pyaare se message se phir joda ja sakta hai, agar time pe pata chal jaaye.',
    updated: ADDED_NOV16,
    sibling: 'win-back-old-customers',
    blocks: [
      {
        h2: '5 step',
        steps: [
          { title: 'List banao', text: 'Jo customer pehle regular aate the aur 30 din se nahi aaye, unke naam aur number likho.' },
          { title: 'Jaldi bhejo', text: '30–45 din mein message bhejo. Chhe mahine baad aadat poori tarah badal chuki hoti hai.' },
          { title: 'Apne number se, naam se', text: 'Message dukaan ke number se jaaye aur customer ka naam ho. Anjaan number ka message spam lagta hai.' },
          { title: 'Aane ki wajah do', text: 'Agar woh reward ke paas hain toh batao: “Bas ek visit aur, aapka gift ready hai.”' },
          { title: 'Ek hi baar', text: 'Ek message kaafi hai. Baar-baar bhejoge toh woh number block kar denge.' },
        ],
      },
      {
        h2: 'Ready WhatsApp message (copy karein)',
        list: [
          'Namaste {naam} ji, kaafi din se aap nahi aaye — sab theek hai? Aapka intezaar rahega. — {dukaan}',
          '{naam} ji, aapka card bas ek visit door hai. Agli baar aaoge toh {reward} aapka. — {dukaan}',
          'Namaste {naam} ji, naya maal aaya hai jo aapko pasand aayega. Kabhi bhi aaiye. — {dukaan}',
          '{naam} ji, aapki yaad aayi! Is hafte zaroor aaiye, aapka swagat hai. — {dukaan}',
          'Hello {naam} ji, aap humare purane customer ho — koi shikayat ho toh zaroor batana, sudhaar karenge. — {dukaan}',
          '{naam} ji, aapka {reward} abhi bhi aapke card pe hai. Kab aa rahe ho? — {dukaan}',
        ],
      },
      {
        h2: 'Regularhood mein yeh list khud banti hai',
        p: [
          'Regularhood har visit ka hisaab rakhta hai, isliye “Not seen” list mein woh customer khud aa jaate hain jo 30 din se nahi aaye. Message ready milta hai — aap use apne WhatsApp se ek tap mein bhejte ho, apni dukaan ke naam se.',
          'Shuru karna free hai; reminder wali list Pro mein hai.',
        ],
      },
    ],
    faqs: [
      { q: 'Purane customer ko wapas kaise bulaye?', a: 'Unki list banao, 30–45 din mein apne number se naam ke saath ek pyaara message bhejo, aur agar woh reward ke paas hain toh batao.' },
      { q: 'Customer ko kya message bhejein?', a: '“Namaste {naam} ji, kaafi din se aap nahi aaye — sab theek hai? Aapka intezaar rahega.” Chhota, apna-sa, bina discount ke.' },
      { q: 'Kitni baar message bhejna chahiye?', a: 'Ek baar. Jawab na aaye toh agle mahine ek aur, bas. Zyada bhejne se number block ho jaata hai.' },
    ],
  },
  {
    // Roman twin in spirit of /hi/guide/get-customers-for-new-shop (442 impressions, the most in Search Console).
    slug: 'nayi-dukan-me-customer-kaise-laye',
    name: 'Nayi dukan me customer kaise laye',
    title: 'Nayi Dukan Me Customer Kaise Laye? Pehle 30 Din ka Plan',
    description: 'Nayi dukan khuli hai? Pehle customer kaise laye aur unhe pakka customer kaise banaye — opening, Google, WhatsApp aur reward ka 4 hafte ka aasan plan. Free.',
    eyebrow: 'Nayi dukan',
    h1: 'Nayi dukan me customer kaise laye: pehle 30 din ka plan',
    intro:
      'Nayi dukan mein sabse bada sawaal hota hai — log aayenge kaise? Par asli kaam pehli visit ke baad shuru hota hai. Jo log pehle mahine aate hain, unme se kitne dobara aate hain, wahi tay karta hai ki dukaan chalegi ya nahi.',
    updated: ADDED_NOV16,
    sibling: 'get-customers-for-new-shop',
    blocks: [
      {
        h2: '4 hafte ka plan',
        steps: [
          { title: 'Hafta 1: sabko batao', text: 'Dukaan ke bahar saaf board, aas-paas ke ghar aur society WhatsApp group mein opening ki khabar. Google Business Profile banao — photo, timing, phone number.' },
          { title: 'Hafta 1: har customer ka number lo', text: 'Pehle din se. “Offer aur naye maal ki khabar ke liye” — zyada tar log khushi se de dete hain.' },
          { title: 'Hafta 2: dobara aane ki wajah do', text: 'Ek aasan reward ka niyam: har 5 visit pe ek chhota gift. Pehli visit pe hi pehla stamp lagao.' },
          { title: 'Hafta 3: WhatsApp status roz', text: 'Jinke paas aapka number hai, woh roz aapki dukaan dekhte hain — naya maal, aaj ka special, reward ka niyam.' },
          { title: 'Hafta 4: review maango', text: 'Jo khush customer do-teen baar aa chuke, unse Google review maango. Naye log reviews dekh kar hi aate hain.' },
          { title: 'Hafta 4: jo nahi laute, unhe yaad karo', text: 'Jo pehle hafte aaye aur phir nahi aaye, unhe ek pyaara sa message: “Kaisa laga humara maal? Phir aaiye.”' },
        ],
      },
      {
        h2: 'Opening mein kya na karein',
        list: [
          'Pehle hafte bhaari discount — log sasta dhoondhne aate hain aur discount khatam hote hi chale jaate hain.',
          'Sirf pamphlet pe paisa — pata hi nahi chalta kaun aaya.',
          'Number na lena — phir unhe dobara bulane ka koi raasta nahi bachta.',
        ],
      },
      {
        h2: 'Regularhood pehle din se',
        p: [
          'Regularhood mein customer ka number likho aur Add visit dabao — number bhi save ho gaya, pehla stamp bhi lag gaya. Customer ko WhatsApp pe uska card milta hai, aur counter poster aur WhatsApp status ki photo ready milti hai.',
          'Pehle 15 customer free hain, toh nayi dukaan ke liye bina kharche shuru ho jaata hai.',
        ],
      },
    ],
    faqs: [
      { q: 'Nayi dukan me customer kaise laye?', a: 'Board, Google Business Profile aur society WhatsApp group se pehle customer laao, har customer ka number lo, aur pehli visit se hi reward ka niyam shuru karo taaki woh dobara aaye.' },
      { q: 'Nayi dukan ka pehla mahina kaise chalaye?', a: 'Pehle hafte sabko batao, doosre hafte dobara aane ki wajah do, teesre hafte roz WhatsApp status lagao, aur chauthe hafte review maango aur jo nahi laute unhe yaad karo.' },
      { q: 'Kya opening pe discount dena chahiye?', a: 'Chhota sa opening gift theek hai, par bhaari discount se sasta dhoondhne wale aate hain. Baar-baar aane pe reward se pakke customer bante hain.' },
    ],
  },
  {
    slug: 'visit-our-store-messages',
    name: 'दुकान पर बुलाने के मैसेज',
    title: 'दुकान पर आने का न्योता: 15 छोटे मैसेज (कॉपी करके भेजें)',
    description: 'ग्राहक को दुकान पर बुलाने के छोटे, अपनेपन वाले WhatsApp मैसेज: नई दुकान, नया माल, त्योहार, वीकेंड और “काफ़ी दिनों से नहीं आए” वाले मैसेज। कॉपी करें और भेजें।',
    eyebrow: 'मैसेज टेम्पलेट',
    h1: 'ग्राहक को दुकान पर बुलाने के मैसेज, जो लोग सच में पढ़ें',
    intro:
      'अच्छा न्योता छोटा होता है, जानी-पहचानी दुकान से आता है और आने की एक साफ़ वजह देता है। यहाँ हर मौके के लिए तैयार मैसेज हैं, और कुछ नियम ताकि वे कभी स्पैम न लगें। [ब्रैकेट] वाले शब्द बदलें और भेजें।',
    updated: ADDED_NOV19,
    blocks: [
      {
        h2: 'अच्छा मैसेज कैसा होता है',
        list: [
          'दुकान के अपने नंबर से, ग्राहक के नाम के साथ। अनजान नंबर का मैसेज विज्ञापन लगता है।',
          'आने की एक वजह: नया माल, त्योहार, या पास आता इनाम। एक साथ पाँच ऑफ़र नहीं।',
          'दो-तीन लाइन। जिसे स्क्रॉल करना पड़े, वह पढ़ा नहीं जाता।',
          'आख़िर में दुकान का नाम, ताकि किसी को अंदाज़ा न लगाना पड़े कि किसने भेजा।',
        ],
      },
      {
        h2: 'नई दुकान या ओपनिंग',
        list: [
          'नमस्ते [नाम] जी, हमने [जगह] के पास [दुकान का नाम] खोली है। इस हफ़्ते ज़रूर आइए, पहली विज़िट पर एक छोटा-सा तोहफ़ा। — [दुकान का नाम]',
          'नमस्ते [नाम] जी, [दुकान का नाम] अब [जगह] के पास खुल गई है, समय [समय]। आते-जाते ज़रूर मिलिए।',
          'नमस्ते [नाम] जी, पहले दिन आने के लिए धन्यवाद। फिर आइए, [दुकान का नाम] पर हर 5वीं विज़िट पर एक मुफ़्त तोहफ़ा मिलता है।',
        ],
      },
      {
        h2: 'नया माल या नई सर्विस',
        list: [
          'नमस्ते [नाम] जी, आपने जो [चीज़] पूछी थी, वह [दुकान का नाम] पर आ गई है। आपके लिए एक अलग रख दें?',
          'नमस्ते [नाम] जी, [दुकान का नाम] पर [सर्दी / गर्मी / त्योहार] का नया माल आया है। इस हफ़्ते देखने ज़रूर आइए।',
          'नमस्ते [नाम] जी, [दुकान का नाम] पर अब [नई सर्विस] भी शुरू हो गई है। आकर आज़माइए, आपका कार्ड चालू है।',
        ],
      },
      {
        h2: 'त्योहार और वीकेंड',
        list: [
          'नमस्ते [नाम] जी, [त्योहार] आ रहा है। अपनी [त्योहार] की ख़रीदारी के लिए इस हफ़्ते [दुकान का नाम] ज़रूर आइए।',
          'नमस्ते [नाम] जी, शनिवार और रविवार को [दुकान का नाम] [समय] तक खुली है। मिलते हैं।',
          '[नाम] जी, आपको और आपके परिवार को [त्योहार] की शुभकामनाएँ। जल्दी मिलिए। — [दुकान का नाम]',
        ],
      },
      {
        h2: 'जब इनाम पास हो',
        list: [
          'नमस्ते [नाम] जी, [दुकान का नाम] पर आपका मुफ़्त [इनाम] बस 1 विज़िट दूर है। जल्दी मिलते हैं।',
          'नमस्ते [नाम] जी, [दुकान का नाम] पर आपके कार्ड में 5 में से 4 स्टैम्प हो गए हैं। एक विज़िट और, [इनाम] आपका।',
          'नमस्ते [नाम] जी, आपका मुफ़्त [इनाम] [दुकान का नाम] पर तैयार है। अगली बार आएँ तो ले जाइए।',
        ],
      },
      {
        h2: 'जो काफ़ी दिनों से नहीं आए',
        list: [
          'नमस्ते [नाम] जी, काफ़ी दिनों से आप [दुकान का नाम] पर नहीं आए। सब ठीक है? जब समय मिले, ज़रूर आइए।',
          'नमस्ते [नाम] जी, आपकी कमी खली। आपके स्टैम्प अब भी सुरक्षित हैं, आइए और वहीं से आगे बढ़िए।',
          'नमस्ते [नाम] जी, पिछली बार कुछ ठीक नहीं लगा हो तो बताइए। आपका फिर से इंतज़ार रहेगा। — [दुकान का नाम]',
        ],
      },
      {
        h2: 'कितनी बार भेजें',
        p: [
          'ज़्यादातर महीनों में एक ग्राहक को एक निजी मैसेज काफ़ी है। त्योहार, पास आता इनाम या लंबा गैप अच्छी वजहें हैं। रोज़ का फ़ॉरवर्ड नहीं: बहुत मैसेज भेजने वाली दुकान को लोग म्यूट या ब्लॉक कर देते हैं।',
          'सबको एक साथ बताना हो तो WhatsApp स्टेटस लगाएँ। जिन्होंने आपका नंबर सेव किया है, वे बिना मैसेज के देख लेते हैं, इसलिए यह कभी ज़बरदस्ती नहीं लगता।',
        ],
      },
      {
        h2: 'Regularhood के साथ',
        p: [
          'Regularhood हर ग्राहक के फ़ोन नंबर पर स्टैम्प कार्ड रखता है। एक टैप में ग्राहक को WhatsApp पर उसका कार्ड जाता है, उसके स्टैम्प और बची विज़िट के साथ, हिंदी या English में।',
          'उन ग्राहकों की लिस्ट भी मिलती है जो काफ़ी दिनों से नहीं आए, तैयार “हम आपको मिस कर रहे हैं” मैसेज के साथ, और आपके इनाम के नियम वाली WhatsApp स्टेटस की फ़ोटो। शुरू करना मुफ़्त।',
        ],
      },
    ],
    faqs: [
      { q: 'ग्राहक को दुकान पर बुलाने का मैसेज कैसे लिखें?', a: 'ग्राहक को नाम से नमस्ते करें, आने की एक वजह दें (नया माल, त्योहार या पास आता इनाम), दो-तीन लाइन में बात ख़त्म करें और आख़िर में दुकान का नाम लिखें। मैसेज दुकान के अपने नंबर से भेजें।' },
      { q: 'क्या यह मैसेज सबको भेजें?', a: 'निजी मैसेज उन्हीं को भेजें जो पहले आ चुके हैं और जिन्होंने अपना नंबर दिया है। सबको एक साथ बताने के लिए WhatsApp स्टेटस बेहतर है।' },
      { q: 'ग्राहक बुलाने के लिए क्या ऑफ़र दें?', a: 'एक बार की बड़ी छूट से बेहतर है एक छोटा, नियमित इनाम: जैसे हर 5 विज़िट पर एक मुफ़्त तोहफ़ा। आसान नियम ग्राहक को याद रहता है और वह उसके लिए लौटता है।' },
    ],
  },
  {
    slug: 'identify-returning-customers-without-app',
    name: 'बिना ऐप पुराने ग्राहक पहचानें',
    title: 'बिना ऐप के पुराने ग्राहक कैसे पहचानें? फ़ोन नंबर से आसान तरीका',
    description: 'छोटी दुकान बिना ऐप डाउनलोड करवाए बार-बार आने वाले ग्राहक कैसे पहचाने: फ़ोन नंबर से। रजिस्टर, काग़ज़ के कार्ड और डिजिटल स्टैम्प कार्ड की तुलना।',
    eyebrow: 'पक्के ग्राहक',
    h1: 'ग्राहक दोबारा आया है, यह बिना ऐप के कैसे पता करें',
    intro:
      'बड़ी कंपनियाँ ऐप और मेंबरशिप कार्ड से अपने ग्राहक पहचानती हैं। मोहल्ले की दुकान को इसकी ज़रूरत नहीं। लगभग हर ग्राहक के पास एक चीज़ पहले से है जो उसकी पहचान है: उसका फ़ोन नंबर।',
    updated: ADDED_NOV19,
    blocks: [
      {
        h2: 'छोटी दुकान पर ऐप क्यों नहीं चलते',
        p: [
          'ग्राहक से ऐप डाउनलोड करवाना, साइन-अप करवाना और काउंटर पर खुलवाना एक मिनट माँगता है, जो वह देना नहीं चाहता। ज़्यादातर कहते हैं “अगली बार”, और वह अगली बार कभी नहीं आती। QR कोड में भी यही दिक़्क़त है: कैमरा, स्कैन, पेज का इंतज़ार, कभी साइन-अप।',
          'जिस तरीके में ग्राहक को मेहनत करनी पड़े, वह कुछ ही लोगों तक पहुँचता है। सब पक्के ग्राहकों को जानना है तो याद रखने का काम दुकान को करना होगा।',
        ],
      },
      {
        h2: 'फ़ोन नंबर ही ग्राहक की पहचान',
        p: [
          'लगभग हर किसी को अपना नंबर याद होता है, और दुकान पर नंबर बताने की आदत भी है। नंबर हर ग्राहक का अलग होता है, खोता नहीं, और बिना स्मार्टफ़ोन वाले ग्राहकों के लिए भी चलता है।',
          'जब विज़िट नंबर पर सेव होती हैं, तो पता चलता है कौन आया, कितनी बार आया, और कौन आना बंद कर गया। ज़्यादातर दुकानों को बस इतना ही चाहिए।',
        ],
      },
      {
        h2: 'हिसाब रखने के तीन तरीके',
        table: {
          head: ['', 'रजिस्टर या कॉपी', 'काग़ज़ का स्टैम्प कार्ड', 'फ़ोन नंबर पर डिजिटल कार्ड'],
          rows: [
            ['ग्राहक को कुछ साथ रखना पड़े', 'नहीं', 'हाँ, कार्ड', 'नहीं'],
            ['पक्का ग्राहक जल्दी ढूँढना', 'धीमा, पन्ने पलटें', 'तभी जब कार्ड लाए', 'कुछ अंक लिखें'],
            ['कौन आना बंद कर गया', 'मुश्किल', 'नामुमकिन', 'तैयार लिस्ट'],
            ['नकली या ज़्यादा स्टैम्प', 'मुमकिन', 'पेन से आसान', 'एक नंबर पर दिन में एक विज़िट'],
            ['ग्राहक को मैसेज', 'नंबर हाथ से लिखें', 'नंबर सेव ही नहीं', 'WhatsApp पर एक टैप'],
          ],
        },
      },
      {
        h2: 'Regularhood के साथ काउंटर पर',
        steps: [
          { title: 'नंबर लिखें', text: 'बिल बनाते समय ग्राहक का फ़ोन नंबर लिखें। पक्के ग्राहकों का नंबर 4 अंक लिखते ही दिख जाता है, भीड़ में भी जल्दी।' },
          { title: 'Add visit दबाएँ', text: 'विज़िट सेव हो जाती है। नया नंबर उसी समय ग्राहक बन जाता है, ग्राहक को कोई साइन-अप नहीं करना।' },
          { title: 'उनका कार्ड देखें', text: 'दिखता है कि कितनी विज़िट हुईं और इनाम कब है। आख़िरी विज़िट पर ऐप कहता है “अभी इनाम दें”।' },
        ],
      },
      {
        h2: 'इससे आपको क्या पता चलता है',
        list: [
          'आपके असली पक्के ग्राहक कौन हैं, विज़िट के हिसाब से।',
          'कौन पहले आता था और काफ़ी दिनों से नहीं आया, ताकि समय रहते प्यार से याद किया जा सके।',
          'इस हफ़्ते कितने नए ग्राहक आए और कितने लौटे।',
          'जब चाहें, ग्राहकों और विज़िट की स्प्रेडशीट।',
        ],
      },
      {
        h2: 'नंबर इज़्ज़त से माँगें',
        p: [
          'वजह बताएँ: “आपकी विज़िट जोड़ दूँ? हर 5 विज़िट पर एक मुफ़्त तोहफ़ा मिलता है।” जब ग्राहक को फ़ायदा दिखे और भरोसा हो कि नंबर का ग़लत इस्तेमाल नहीं होगा, तो ज़्यादातर लोग ख़ुशी से नंबर देते हैं।',
          'नंबर किसी को न दें और बल्क मैसेज न भेजें। जो दुकान ग्राहक के नंबर की इज़्ज़त करती है, उसे नंबर मिलते रहते हैं।',
        ],
      },
    ],
    faqs: [
      { q: 'बिना ऐप के दोबारा आने वाले ग्राहक कैसे पहचानें?', a: 'हर विज़िट ग्राहक के फ़ोन नंबर पर सेव करें। अगली बार नंबर लिखते ही दिख जाता है कि वह कितनी बार आया और इनाम बाक़ी है या नहीं।' },
      { q: 'क्या ग्राहक के पास स्मार्टफ़ोन होना ज़रूरी है?', a: 'नहीं। सिर्फ़ फ़ोन नंबर चाहिए। जिनके पास WhatsApp है, उन्हें उनका कार्ड लिंक के रूप में भी मिल सकता है जो ब्राउज़र में खुलता है।' },
      { q: 'क्या रजिस्टर काफ़ी नहीं है?', a: 'कुछ ग्राहकों के लिए रजिस्टर चलता है, पर उसमें ढूँढना धीमा है और यह नहीं बताता कि कौन आना बंद कर गया। फ़ोन नंबर वाला डिजिटल कार्ड दोनों काम सेकंडों में करता है।' },
    ],
  },
  {
    slug: 'customer-retention',
    name: 'ग्राहक प्रतिधारण',
    title: 'ग्राहक प्रतिधारण क्या है? दुकान के लिए मतलब और 6 आसान तरीके',
    description: 'ग्राहक प्रतिधारण (customer retention) का आसान मतलब: ग्राहक बार-बार लौटे। छोटी दुकान के लिए यह क्यों ज़रूरी है, कैसे नापें, और 6 आसान तरीके।',
    eyebrow: 'ग्राहक प्रतिधारण',
    h1: 'ग्राहक प्रतिधारण क्या है: छोटी दुकान के लिए आसान भाषा में',
    intro:
      'ग्राहक प्रतिधारण (customer retention) का मतलब बस इतना है कि आपके ग्राहक बार-बार लौटें। मोहल्ले की दुकान के लिए यही सुस्त महीने और भरे महीने का फ़र्क़ है, और यह नए ग्राहक ढूँढने से कहीं सस्ता है।',
    updated: ADDED_NOV19,
    blocks: [
      {
        h2: 'ग्राहक प्रतिधारण का मतलब',
        p: [
          'जिन लोगों ने आपसे एक बार ख़रीदा, उनमें से कितने लौटे, और कितनी बार? यही प्रतिधारण है। जिस दुकान पर ज़्यादातर ग्राहक हर हफ़्ते लौटते हैं, वहाँ प्रतिधारण अच्छा है। जहाँ लोग एक बार आकर फिर नहीं आते, वहाँ कमज़ोर, चाहे ओपनिंग वाले हफ़्ते कितनी भी भीड़ रही हो।',
        ],
      },
      {
        h2: 'नए ग्राहकों से ज़्यादा ज़रूरी क्यों',
        list: [
          'पक्का ग्राहक आप पर पहले से भरोसा करता है। उसे विज्ञापन या छूट की ज़रूरत नहीं।',
          'साल भर में पक्का ग्राहक एक बार आने वाले कई लोगों से ज़्यादा ख़र्च करता है।',
          'ख़ुश पक्का ग्राहक अपने परिवार और पड़ोसियों को मुफ़्त में लाता है।',
          'अगर 100 पक्के ग्राहक महीने में बस एक बार और आएँ, तो वह 100 नई विज़िट हैं, बिना किसी विज्ञापन के।',
        ],
      },
      {
        h2: 'अपने ग्राहक को जानें',
        p: [
          'प्रतिधारण की शुरुआत ग्राहक को जानने से होती है: उसका नाम, वह अक्सर क्या लेता है, और कितने दिन में आता है। जब पता हो कि कौन हर हफ़्ते आता था, तभी पता चलेगा कि वह तीन हफ़्ते से क्यों नहीं आया।',
        ],
      },
      {
        h2: 'ग्राहक रोकने के 6 आसान तरीके',
        steps: [
          { title: 'उन्हें याद रखें', text: 'पक्के ग्राहक को नाम से बुलाएँ और उसकी रोज़ की चीज़ याद रखें। यह सबसे पुराना और सबसे पक्का तरीका है।' },
          { title: 'विज़िट पर इनाम दें', text: 'हर 5 विज़िट पर एक मुफ़्त तोहफ़ा जैसा आसान नियम ग्राहक को बगल वाली दुकान छोड़कर आपके पास आने की वजह देता है।' },
          { title: 'बताएँ इनाम कितना पास है', text: '“बस एक विज़िट और, आपका तोहफ़ा तैयार है” सुनकर लोग जल्दी लौटते हैं।' },
          { title: 'रोज़ की चीज़ कभी ख़त्म न हो', text: 'पक्का ग्राहक अपनी रोज़ की चीज़ न पाए तो दूसरी दुकान आज़माता है, और वहीं रह सकता है।' },
          { title: 'देखें कौन आना बंद कर गया', text: 'ग्राहक शिकायत कम करते हैं, बस आना बंद कर देते हैं। जल्दी पता करें।' },
          { title: 'एक प्यारा-सा मैसेज भेजें', text: 'जानी-पहचानी दुकान से WhatsApp पर छोटा-सा “हम आपको मिस कर रहे हैं” कई ग्राहकों को वापस ले आता है।' },
        ],
      },
      {
        h2: 'बिना हिसाब-किताब के कैसे नापें',
        p: [
          'दो गिनती काफ़ी हैं: इस महीने कितने ग्राहक कम से कम दो बार लौटे, और कितने पक्के ग्राहक कुछ हफ़्तों से नहीं दिखे। पहली गिनती बढ़े और दूसरी घटे, तो आपका प्रतिधारण सुधर रहा है।',
          'Regularhood काउंटर पर जोड़ी गई विज़िट से दोनों दिखाता है: हर ग्राहक की विज़िट गिनती, और काफ़ी दिनों से न लौटे ग्राहकों की लिस्ट, तैयार “हम आपको मिस कर रहे हैं” मैसेज के साथ।',
        ],
      },
    ],
    faqs: [
      { q: 'ग्राहक प्रतिधारण क्या है?', a: 'जो ग्राहक एक बार आपसे ख़रीद चुके हैं, उनका बार-बार लौटना। जितने ज़्यादा लौटें और जितनी जल्दी लौटें, प्रतिधारण उतना अच्छा।' },
      { q: 'छोटी दुकान ग्राहक प्रतिधारण कैसे बढ़ाए?', a: 'पक्के ग्राहकों को याद रखें, आसान नियम से विज़िट पर इनाम दें, रोज़ की चीज़ें स्टॉक में रखें, और जो आना बंद कर दें उन्हें प्यार से मैसेज भेजें।' },
      { q: 'क्या लॉयल्टी प्रोग्राम और ग्राहक प्रतिधारण एक ही हैं?', a: 'नहीं। प्रतिधारण लक्ष्य है, लॉयल्टी प्रोग्राम उस तक पहुँचने का एक तरीका। आसान स्टैम्प कार्ड ग्राहक को लौटने की साफ़ वजह देता है।' },
    ],
  },
];

export const GUIDES: Record<SeoLang, Guide[]> = { en, hi };

export const guide = (lang: SeoLang, slug: string) => GUIDES[lang].find((g) => g.slug === slug);

/** Shop pages a guide links to when it doesn't name its own. */
export const COMMON_SHOPS = ['kirana-store', 'salon', 'restaurant', 'cafe', 'sweet-shop-and-bakery', 'pharmacy', 'gym', 'boutique', 'tailor', 'mobile-repair-shop'];

/** Guides every shop and city page links to, after the one written for that kind of shop (if any). */
const CORE_GUIDES = ['how-to-get-repeat-customers', 'loyalty-reward-ideas', 'messages-to-bring-customers-back', 'win-back-old-customers'];

/** The guide written for a kind of shop, by shop slug. */
const SHOP_GUIDE: Record<string, string> = {
  salon: 'salon-loyalty-program',
  'barber-shop': 'salon-loyalty-program',
  'beauty-parlour': 'salon-loyalty-program',
  spa: 'salon-loyalty-program',
  restaurant: 'restaurant-loyalty-program',
  cafe: 'restaurant-loyalty-program',
  dhaba: 'restaurant-loyalty-program',
  'tiffin-service': 'restaurant-loyalty-program',
  'juice-bar': 'restaurant-loyalty-program',
  'ice-cream-parlour': 'restaurant-loyalty-program',
};

/** Guides for a shop or city page: the one written for that kind of shop first (`main`), then the core guides. */
export function guidesForPage(lang: SeoLang, kind: 'shop' | 'city', slug: string) {
  const mainSlug = kind === 'shop' ? SHOP_GUIDE[slug] : undefined;
  const main = mainSlug ? guide(lang, mainSlug) : undefined;
  const core = CORE_GUIDES.map((s) => guide(lang, s)).filter((g): g is Guide => !!g);
  return { main, list: [...(main ? [main] : []), ...core] };
}
