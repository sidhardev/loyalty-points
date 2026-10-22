// Privacy policy (/privacy) and terms of service (/terms). Plain English, and only what the code really does: if a
// feature starts collecting or sharing something new, update these pages (and UPDATED) in the same change.

import type { GuideBlock } from './guides';

export type LegalDoc = {
  slug: 'privacy' | 'terms';
  name: string;
  title: string;
  description: string;
  h1: string;
  intro: string;
  updated: string;
  blocks: GuideBlock[];
};

/** Where privacy requests, grievances and questions go. */
export const CONTACT_EMAIL = process.env.CONTACT_EMAIL || 'devsidharr@gmail.com';

const UPDATED = '2026-10-22';

const privacy: LegalDoc = {
  slug: 'privacy',
  name: 'Privacy policy',
  title: 'Privacy Policy · Regularhood',
  description: 'What Regularhood collects from shop owners, their customers and website visitors, why, who else handles it, and how to have it deleted.',
  h1: 'Privacy policy',
  intro:
    'Regularhood is a stamp card for small shops: the shop types a customer’s phone number at the counter and adds a visit, and every few visits the customer gets a reward. This page explains what information that involves, what we do with it and what we never do. “We” and “us” means Regularhood; “shop” means a business that uses Regularhood; “customer” means a person a shop adds to its stamp card.',
  updated: UPDATED,
  blocks: [
    {
      h2: 'The short version',
      list: [
        'We collect only what a stamp card needs: a shop’s account details, and the names, phone numbers and visits that shops enter for their customers.',
        'We do not sell personal information, show ads or share it with advertisers.',
        'A shop’s customers belong to that shop. Other shops can’t see them, and our own admin screens show counts and totals per shop, not customers’ names or phone numbers.',
        'Our website counts visits without cookies and without storing IP addresses.',
        `You can ask us to delete your information at any time by writing to ${CONTACT_EMAIL}.`,
      ],
    },
    {
      h2: 'Information from shop owners',
      p: ['When a shop signs up and uses Regularhood, we keep:'],
      list: [
        'Shop name, email address and password. Passwords are stored only as a salted hash; nobody, including us, can read them.',
        'A WhatsApp number, if you choose to give one, so we can help you set up. We don’t share it.',
        'Your shop’s settings: the number of visits for a reward, the reward, bonuses and limits.',
        'Where you first came from (for example a search result, an Instagram post or another shop’s referral link), so we know which of our marketing works and can give referral rewards.',
        'A log of actions in your shop account (visits added, rewards given, customers deleted), shown to you in the activity log.',
      ],
    },
    {
      h2: 'Information about a shop’s customers',
      p: [
        'Customers don’t sign up with us. A shop adds them at its counter, and the shop decides what to record. For each customer we keep:',
      ],
      list: [
        'Name and mobile number.',
        'Visits and stamps, bill amounts the shop enters, rewards given, and the time of each.',
        'A private link to the customer’s card, so they can see their stamps without an app.',
      ],
    },
    {
      h2: 'Who is responsible for customer information',
      p: [
        'The shop collects its customers’ information and decides how to use it; we store and process it on the shop’s behalf, only to run the stamp card for that shop. Shops must tell their customers that they use Regularhood and use the information only for their loyalty program.',
        'If you are a customer and want your information corrected or deleted, ask the shop: it can edit or delete you from its customer list, which removes your visits too. If the shop can’t help, write to us and we will.',
      ],
    },
    {
      h2: 'Website visitors',
      p: [
        'Our website counts page views so we can see what people read. It does not use cookies and does not store IP addresses. For each page view we keep the page, the site that sent you, the campaign in the link (if any), the country, language, device type, browser, how long the page was open and how far it was scrolled.',
        'To tell new visits from returning ones, your browser keeps a random ID for one day and another for the open tab, in local storage. They are not linked to your name or to other websites, and page views are deleted after about 13 months.',
        'Your browser also keeps, in local storage: your login (if you are a shop), your language choice and, for 60 days, where you first came from. You can clear these at any time in your browser settings.',
      ],
    },
    {
      h2: 'What we use information for',
      list: [
        'Running the stamp card: counting visits, telling the shop when a reward is due, showing customers their card.',
        'Keeping accounts secure: logins, limits on visits per day and on very large bills, and the activity log.',
        'Supporting shops: answering questions and helping with setup.',
        'Improving Regularhood and knowing which marketing brings shops in, using counts and totals.',
        'Meeting legal obligations, and preventing fraud and misuse.',
        'We never use customers’ information for advertising, and we don’t contact them ourselves.',
      ],
    },
    {
      h2: 'Who else handles information',
      p: ['We use a few service providers to run Regularhood. They handle information only to provide their service to us:'],
      list: [
        'Amazon Web Services: the server and database where accounts, customers and visits are stored, and backups.',
        'Vercel: delivers the website.',
        'Google Fonts: the website’s fonts are loaded from Google, which sees your IP address when it sends them.',
        'Google Gemini: writes some of our website’s articles. No shop or customer information is sent to it.',
        'Google Maps and WhatsApp (Meta): we look up publicly listed businesses on Google Maps and may send them one WhatsApp message about Regularhood. A business that replies “Not now” or STOP is never messaged again.',
      ],
    },
    {
      h2: 'WhatsApp messages from shops',
      p: [
        'When a shop sends a customer their card or a reminder on WhatsApp, Regularhood opens WhatsApp on the shop’s own phone with the message filled in, and the shop sends it. We don’t send these messages and don’t see the chat.',
      ],
    },
    {
      h2: 'We will share information only when',
      list: [
        'The law requires it, for example a valid request from a court or government authority.',
        'It is needed to protect people, shops or Regularhood from fraud or harm.',
        'Regularhood is merged or sold, in which case this policy continues to apply to the information.',
      ],
    },
    {
      h2: 'How long we keep it',
      list: [
        'Shop accounts and their customer lists: for as long as the account is open.',
        'A customer deleted by a shop is removed from the customer list along with their visits.',
        'When a shop asks us to close its account, we delete the account and its customers within 30 days. Copies in backups are overwritten within a further 30 days.',
        'Website page views: about 13 months.',
      ],
    },
    {
      h2: 'Security',
      p: [
        'Information travels over HTTPS. Passwords are stored only as salted hashes, keys for outside services are kept encrypted, reset links work once and expire, and only a small number of people can reach the servers. No system is perfectly secure; if something goes wrong that affects your information, we will tell you and the authorities as the law requires.',
      ],
    },
    {
      h2: 'Your rights',
      p: [
        `Under India’s Digital Personal Data Protection Act, 2023 you can ask what information we have about you, ask us to correct or delete it, withdraw consent, and nominate someone to act for you. Write to ${CONTACT_EMAIL} from the email or phone number the information is about; we reply within 30 days. If you are not satisfied, you can complain to the Data Protection Board of India.`,
      ],
    },
    {
      h2: 'Children',
      p: [
        'Shop accounts are for adults running a business. Shops should not add customers under 18 without a parent’s or guardian’s permission. If we learn that a child’s information was added without it, we will delete it.',
      ],
    },
    {
      h2: 'Changes to this policy',
      p: [
        'If we change this policy, we update the date at the top of this page. If a change matters for how we use your information, we will tell shops by email or in the app before it applies.',
      ],
    },
    {
      h2: 'Contact and grievances',
      p: [
        `For privacy questions, requests or complaints, write to ${CONTACT_EMAIL}. We acknowledge grievances within 24 hours and resolve them within 15 days.`,
      ],
    },
  ],
};

const terms: LegalDoc = {
  slug: 'terms',
  name: 'Terms of service',
  title: 'Terms of Service · Regularhood',
  description: 'The rules for using Regularhood: shop accounts, customer information, rewards, fair use, and what we are and aren’t responsible for.',
  h1: 'Terms of service',
  intro:
    'These terms are the agreement between Regularhood (“we”, “us”) and the business that creates a shop account (“you”, the “shop”). By creating an account or using Regularhood, you agree to them. Please also read our privacy policy, which explains how information is handled.',
  updated: UPDATED,
  blocks: [
    {
      h2: 'What Regularhood is',
      p: [
        'Regularhood is a digital stamp card for shops. You add a customer’s visit at your counter using their phone number; Regularhood counts visits, tells you when a reward is due and gives each customer a link to see their card. Customers do not need an app or an account.',
      ],
    },
    {
      h2: 'Your account',
      list: [
        'You must be at least 18 and use Regularhood for a real business you run or are allowed to act for.',
        'Give correct details and keep your email address current, since that is how we reach you.',
        'Keep your password private. You are responsible for what happens in your account, including actions by staff you let use it.',
        `Tell us at ${CONTACT_EMAIL} straight away if you think someone else has used your account.`,
      ],
    },
    {
      h2: 'Your customers and their information',
      list: [
        'Add only customers who agree to join your stamp card, and tell them that you use Regularhood to keep it.',
        'Use their information only for your loyalty program, not for spam or anything unrelated, and follow the law that applies to you, including India’s Digital Personal Data Protection Act, 2023.',
        'Delete a customer when they ask you to. You can do this from your customer list.',
        'Messages you send customers on WhatsApp are sent by you, from your phone, and must follow WhatsApp’s rules.',
      ],
    },
    {
      h2: 'Rewards are your promise',
      p: [
        'You decide the rewards, how many visits earn one and any bonuses. The promise to give a reward is between you and your customer. Regularhood is not responsible for giving, paying for or replacing rewards, and stamps have no cash value. If you change or end your program, be fair to customers who have already collected stamps.',
      ],
    },
    {
      h2: 'Fair use',
      p: ['Don’t use Regularhood to:'],
      list: [
        'Add fake visits or customers, or game referral rewards.',
        'Send spam, or collect information about people who haven’t agreed to it.',
        'Break the law, mislead customers, or infringe anyone’s rights.',
        'Try to get into other shops’ accounts or our systems, overload the service, or copy it by scraping or reverse engineering.',
      ],
    },
    {
      h2: 'Price',
      p: [
        'Regularhood is free to start. If we introduce paid plans or features, we will tell you the price before you are charged, and nothing that was free when you signed up will start costing you without notice and your choice to continue.',
      ],
    },
    {
      h2: 'Your content and ours',
      p: [
        'Your shop’s information and your customer list stay yours. You let us store and process them only to run Regularhood for you, and you can download your customers as a spreadsheet at any time. The Regularhood name, logo, website and software belong to us; posters and images we make for your shop are yours to use for promoting your shop.',
      ],
    },
    {
      h2: 'Availability and changes',
      p: [
        'We work to keep Regularhood running and backed up, but it may sometimes be unavailable, for example during maintenance or problems with our providers. We may add, change or remove features; if a change takes away something important to you, we will tell you in advance where we can.',
      ],
    },
    {
      h2: 'Suspending or closing accounts',
      p: [
        `You can stop using Regularhood at any time and ask us to delete your account by writing to ${CONTACT_EMAIL}. We may suspend or close an account that breaks these terms, puts customers or the service at risk, or is required to be closed by law. Where we can, we will tell you why and give you a chance to fix it or download your data first.`,
      ],
    },
    {
      h2: 'No warranty',
      p: [
        'Regularhood is provided “as is”. To the extent the law allows, we make no promises beyond those in these terms, including that it will be error-free or suit every business.',
      ],
    },
    {
      h2: 'Limit of liability',
      p: [
        'To the extent the law allows, we are not liable for indirect losses such as lost profits, lost customers or lost data, and our total liability for any claim about Regularhood is limited to the amount you paid us in the 12 months before the claim, or ₹1,000 if you paid nothing. Nothing in these terms limits liability that cannot be limited by law.',
      ],
    },
    {
      h2: 'Indemnity',
      p: [
        'If someone makes a claim against us because of how you used Regularhood, such as information you added without permission or rewards you didn’t give, you will cover the reasonable costs of that claim.',
      ],
    },
    {
      h2: 'Changes to these terms',
      p: [
        'We may update these terms. We will change the date at the top of this page and, for important changes, tell you by email or in the app before they apply. If you keep using Regularhood after that, the new terms apply.',
      ],
    },
    {
      h2: 'Law and disputes',
      p: [
        `These terms are governed by the laws of India, and the courts of India have jurisdiction over any dispute. Before going to court, please write to ${CONTACT_EMAIL}; most problems can be sorted out quickly.`,
      ],
    },
    {
      h2: 'Contact',
      p: [`Questions about these terms: ${CONTACT_EMAIL}.`],
    },
  ],
};

export const LEGAL = { privacy, terms };
