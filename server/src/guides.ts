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
};

const UPDATED = '2026-10-19';

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
    title: 'How to Get Repeat Customers for Your Shop: 10 Practical Ways',
    description: 'Ten practical ways for a small shop to get repeat customers: remember names, reward visits, follow up on WhatsApp and win back the ones who stopped coming.',
    eyebrow: 'Repeat customers',
    h1: 'How to get repeat customers: 10 things that work for small shops',
    intro:
      'Getting a new customer through the door is hard. Getting the same customer to come back is easier, cheaper and what keeps a neighbourhood shop going. Here’s what actually works.',
    updated: UPDATED,
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
    title: 'दुकान पर ग्राहक बार-बार कैसे आएँ: 10 आसान तरीके',
    description: 'छोटी दुकान पर पक्के ग्राहक बनाने के 10 आसान तरीके: नाम याद रखें, विज़िट पर इनाम दें, WhatsApp पर संपर्क रखें और दूर हुए ग्राहकों को वापस बुलाएँ।',
    eyebrow: 'पक्के ग्राहक',
    h1: 'ग्राहक बार-बार कैसे आएँ: छोटी दुकानों के लिए 10 तरीके',
    intro:
      'नया ग्राहक लाना मुश्किल है। उसी ग्राहक को दोबारा बुलाना आसान है, सस्ता है, और मोहल्ले की दुकान इसी से चलती है। ये तरीके सच में काम करते हैं।',
    updated: UPDATED,
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
];

export const GUIDES: Record<SeoLang, Guide[]> = { en, hi };

export const guide = (lang: SeoLang, slug: string) => GUIDES[lang].find((g) => g.slug === slug);
