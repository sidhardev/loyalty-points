import { useEffect, useRef, useState } from 'react';
import { Check, Copy, Download, Gift, Image as ImageIcon, MessageCircle, Share2, Store, Users } from 'lucide-react';
import { api, num, type Merchant } from './api';
import { Awning, C, DISPLAY, fit, HINDI, saveFile, StampRow, Star, svgToPng } from './poster';
import './poster.css';
import { t } from './i18n';
import { LogoMark, Sheet, toast } from './ui';

// "Share your shop": a WhatsApp status / Instagram post image and ready messages, in Hindi or English. The image
// tells the shop's customers its one rule ("Every 5 visits → Free chai", say your number at the counter) and, in the
// footer, tells other shop owners they can get the same: the shop's share link /r/<join code> counts their sign-up as
// this shop's referral (server/src/growth.ts).

export type ShareLang = 'hi' | 'en';
export type ShareFormat = 'status' | 'post';

type Earned = { earned: number; sent: number };
export type ShareData = {
  customers: number;
  referrals: number;
  invited: { name: string; visits: number; days: number; active: boolean }[];
  active: number;
  referred: boolean;
  own: { visits: number; days: number };
  standee: Earned;
  upi: Earned;
  rules: { visits: number; days: number; upiEvery: number; upiAmount: number };
};

export const shareUrl = (code: string) => `${location.origin}/r/${code}`;
const shortUrl = (url: string) => url.replace(/^https?:\/\/(www\.)?/, '');

const TEXT = {
  hi: {
    eyebrow: 'लॉयल्टी कार्ड',
    rule: (n: number) => `हर ${n} विज़िट पर`,
    ask: 'काउंटर पर बस अपना फ़ोन नंबर बताएँ',
    noApp: 'कोई ऐप नहीं · कोई साइन-अप नहीं',
    owner: 'आपकी भी दुकान है? यह मुफ़्त पाएँ',
  },
  en: {
    eyebrow: 'LOYALTY CARD',
    rule: (n: number) => `Every ${n} visits`,
    ask: 'Just tell your phone number at the counter',
    noApp: 'No app · No sign-up',
    owner: 'Run a shop? Get this for free',
  },
};

/** The message that goes with the image, or on its own to customers. */
export function customerMessage(m: Merchant, lang: ShareLang) {
  if (lang === 'hi')
    return `🎉 ${m.name} में अब लॉयल्टी कार्ड! हर ${m.visitsNeeded} विज़िट पर ${m.rewardName}। काउंटर पर बस अपना फ़ोन नंबर बताएँ — कोई ऐप नहीं, कोई साइन-अप नहीं।`;
  return `🎉 ${m.name} now has a loyalty card! Every ${m.visitsNeeded} visits: ${m.rewardName}. Just tell your phone number at the counter — no app, no sign-up.`;
}

/** For other shop owners: what the shop uses, and its share link. */
export function ownerMessage(m: Merchant, lang: ShareLang) {
  const url = shareUrl(m.joinCode);
  if (lang === 'hi')
    return `मैंने अपनी दुकान ${m.name} के लिए Regularhood पर लॉयल्टी कार्ड शुरू किया है — हर ${m.visitsNeeded} विज़िट पर ${m.rewardName}। बस ग्राहक का नंबर लिखो और एक बटन दबाओ, ग्राहक बार-बार आते हैं। शुरू करना मुफ़्त है, आप भी आज़माएँ: ${url}`;
  return `I've started a loyalty card for my shop ${m.name} on Regularhood — every ${m.visitsNeeded} visits, ${m.rewardName}. You just type the customer's number and tap one button, and they keep coming back. It's free to start, try it for your shop: ${url}`;
}

const waLink = (text: string) => `https://wa.me/?text=${encodeURIComponent(text)}`;

const SIZE = { status: { w: 1080, h: 1920 }, post: { w: 1080, h: 1080 } };

type CardProps = { merchant: Merchant; lang: ShareLang; format: ShareFormat };

/** The share image, drawn as one SVG so the preview and the saved PNG match. */
export function ShareCardSvg({ merchant, lang, format }: CardProps) {
  const { w: W, h: H } = SIZE[format];
  const t = TEXT[lang];
  const hi = lang === 'hi';
  const font = hi ? HINDI : DISPLAY;
  const link = shortUrl(shareUrl(merchant.joinCode));
  const status = format === 'status';
  const uid = `${format}-${lang}`;
  const n = Math.min(merchant.visitsNeeded, 10);

  const awningH = status ? 84 : 60;
  const eyebrowY = status ? 250 : 150;
  const name = fit(merchant.name.trim() || 'Your shop', W - 140, status ? 116 : 84, status ? 60 : 46);
  const nameTop = eyebrowY + (status ? 70 : 52) + name.size * 0.78;
  const nameBottom = nameTop + name.size * 1.04 * (name.lines.length - 1);
  const ruleY = nameBottom + (status ? 120 : 82);
  const reward = fit(merchant.rewardName.trim() || 'A free treat', W - 240, status ? 96 : 66, status ? 50 : 38);
  const r = status ? (n > 6 ? 38 : 50) : n > 6 ? 30 : 38;
  const cardTop = ruleY + (status ? 70 : 44);
  const stampsY = cardTop + r + (status ? 60 : 40);
  const rewardTop = stampsY + r + (status ? 50 : 34) + reward.size * 0.78;
  const cardH = rewardTop + reward.size * 1.04 * (reward.lines.length - 1) - cardTop + (status ? 70 : 46);
  const footH = status ? 220 : 140;
  const footTop = H - footH;
  const askY = status ? cardTop + cardH + 130 : cardTop + cardH + 74;
  // Everything between the awning and the footer, moved down so the free space is shared above and below it.
  const contentBottom = status ? askY + 70 : askY + 10;
  const shift = Math.max(0, (footTop - contentBottom - (eyebrowY - 46 - awningH)) / 2);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} xmlns="http://www.w3.org/2000/svg" role="img" aria-label={`${merchant.name}: ${t.rule(merchant.visitsNeeded)}, ${merchant.rewardName}`}>
      <defs>
        <linearGradient id={`share-bg-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={C.green} />
          <stop offset="1" stopColor={C.deep} />
        </linearGradient>
        <pattern id={`share-dots-${uid}`} width="28" height="28" patternUnits="userSpaceOnUse">
          <rect x="11" y="11" width="6" height="6" rx="2" fill={C.paper} opacity={0.07} />
        </pattern>
      </defs>
      <rect width={W} height={H} fill={`url(#share-bg-${uid})`} />
      <rect width={W} height={H} fill={`url(#share-dots-${uid})`} />
      <Awning y={0} h={awningH} stripes={status ? 10 : 12} second={C.paper} width={W} />

      <g transform={`translate(0 ${shift})`}>
        <g textAnchor="middle">
          <g transform={`translate(${W / 2} ${eyebrowY})`}>
            <rect x={-230} y={-46} width={460} height={64} rx={32} fill="rgba(238,242,236,0.12)" stroke={C.marigold} strokeWidth={2} />
            <Star cx={-195} cy={-14} r={13} fill={C.marigold} />
            <Star cx={195} cy={-14} r={13} fill={C.marigold} />
            <text y={-2} fontFamily={font} fontWeight={800} fontSize={hi ? 32 : 30} letterSpacing={hi ? 0 : 6} fill={C.paper}>
              {t.eyebrow}
            </text>
          </g>
          {name.lines.map((line, i) => (
            <text key={i} x={W / 2} y={nameTop + i * name.size * 1.04} fontFamily={DISPLAY} fontWeight={900} fontSize={name.size} letterSpacing={-1} fill={C.paper}>
              {line}
            </text>
          ))}
          <text x={W / 2} y={ruleY} fontFamily={font} fontWeight={900} fontSize={status ? 76 : 56} fill={C.marigold}>
            {t.rule(merchant.visitsNeeded)}
          </text>
        </g>

        {/* The stamp card */}
        <rect x={70} y={cardTop} width={W - 140} height={cardH} rx={status ? 52 : 40} fill={C.white} />
        <StampRow cx={W / 2} y={stampsY} n={n} filled={n - 1} r={r} gap={status ? 22 : 16} on={C.green} off={C.soft} reward={C.marigold} />
        <g textAnchor="middle">
          {reward.lines.map((line, i) => (
            <text key={i} x={W / 2} y={rewardTop + i * reward.size * 1.04} fontFamily={DISPLAY} fontWeight={900} fontSize={reward.size} fill={C.ink}>
              {line}
            </text>
          ))}
        </g>

        <g textAnchor="middle">
          <text x={W / 2} y={askY} fontFamily={font} fontWeight={800} fontSize={status ? (hi ? 48 : 44) : hi ? 36 : 34} fill={C.paper}>
            {t.ask}
          </text>
          {status && (
            <text x={W / 2} y={askY + 70} fontFamily={font} fontWeight={600} fontSize={34} fill={C.paper} opacity={0.8}>
              {t.noApp}
            </text>
          )}
        </g>
      </g>

      {/* Footer: for other shop owners */}
      <rect x={0} y={footTop} width={W} height={footH} fill="rgba(4,38,26,0.45)" />
      <g transform={`translate(60 ${footTop + (footH - (status ? 96 : 72)) / 2})`}>
        <LogoTile size={status ? 96 : 72} />
        <text x={status ? 124 : 96} y={status ? 38 : 28} fontFamily={font} fontWeight={700} fontSize={status ? 36 : 28} fill={C.paper}>
          {t.owner}
        </text>
        <text x={status ? 124 : 96} y={status ? 88 : 66} fontFamily={DISPLAY} fontWeight={900} fontSize={status ? 42 : 32} fill={C.marigold}>
          {link}
        </text>
      </g>
    </svg>
  );
}

/** The logo mark on a white tile, for the dark footer. */
function LogoTile({ size }: { size: number }) {
  return (
    <g>
      <rect width={size} height={size} rx={size * 0.26} fill={C.white} />
      <g transform={`translate(${size * 0.12} ${size * 0.12})`}>
        <LogoMark size={size * 0.76} />
      </g>
    </g>
  );
}

const remembered = <T extends string>(key: string, fallback: T, allowed: T[]) => {
  try {
    const v = localStorage.getItem(key) as T | null;
    return v && allowed.includes(v) ? v : fallback;
  } catch {
    return fallback;
  }
};

/** Shares the PNG through the phone's share menu (WhatsApp, Instagram…), or saves it where that isn't possible. */
async function shareImage(blob: Blob, file: string, text: string) {
  const f = new File([blob], file, { type: 'image/png' });
  if (navigator.canShare?.({ files: [f] })) {
    try {
      await navigator.share({ files: [f], text });
      return;
    } catch (err) {
      if ((err as Error).name === 'AbortError') return;
    }
  }
  saveFile(blob, file);
  toast('Image saved. Post it from your gallery.');
}

export function ShareSheet({ merchant, onClose }: { merchant: Merchant; onClose: () => void }) {
  const [data, setData] = useState<ShareData | null>(null);
  const [lang, setLang] = useState<ShareLang>(() => remembered('lp_share_lang', 'hi', ['hi', 'en']));
  const [format, setFormat] = useState<ShareFormat>(() => remembered('lp_share_format', 'status', ['status', 'post']));
  const [png, setPng] = useState<Blob | null>(null);
  const [copied, setCopied] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api<ShareData>('share').then(setData).catch(() => setData(NO_DATA));
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem('lp_share_lang', lang);
      localStorage.setItem('lp_share_format', format);
    } catch {
      // Just not remembered.
    }
  }, [lang, format]);

  // The PNG is drawn ahead of time, so tapping Share opens the share menu straight away (browsers allow that only
  // right after a tap).
  useEffect(() => {
    setPng(null);
    const svg = ref.current?.querySelector('svg');
    if (!svg || !data) return;
    let live = true;
    svgToPng(svg, SIZE[format].w, SIZE[format].h)
      .then((b) => live && setPng(b))
      .catch(() => live && setPng(null));
    return () => {
      live = false;
    };
  }, [data, lang, format, merchant]);

  const file = `${merchant.name.replace(/[^\w]+/g, '-').toLowerCase() || 'shop'}-${format}.png`;
  const link = shareUrl(merchant.joinCode);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast("Couldn't copy, press and hold the link instead", 'error');
    }
  };

  return (
    <Sheet title={t('Share your shop')} onClose={onClose} wide>
      <p className="muted small" style={{ margin: 0 }}>
        {t('Put it on your WhatsApp status or Instagram so customers know about your card. Other shop owners can get Regularhood from your link.')}
      </p>

      <div className="poster-options">
        <div className="seg" role="group" aria-label="Language">
          <button type="button" className={lang === 'hi' ? 'active' : ''} onClick={() => setLang('hi')}>
            हिंदी
          </button>
          <button type="button" className={lang === 'en' ? 'active' : ''} onClick={() => setLang('en')}>
            English
          </button>
        </div>
        <div className="seg" role="group" aria-label="Size">
          <button type="button" className={format === 'status' ? 'active' : ''} onClick={() => setFormat('status')}>
            Status
          </button>
          <button type="button" className={format === 'post' ? 'active' : ''} onClick={() => setFormat('post')}>
            Post
          </button>
        </div>
      </div>

      <div className={`poster-sheet share-preview is-${format}`} ref={ref}>
        {data && <ShareCardSvg merchant={merchant} lang={lang} format={format} />}
      </div>

      <div className="actions">
        <button className="btn btn-primary" disabled={!png} onClick={() => png && void shareImage(png, file, customerMessage(merchant, lang))}>
          <Share2 size={17} /> {t('Share image')}
        </button>
        <button className="btn btn-soft" disabled={!png} onClick={() => png && saveFile(png, file)}>
          <Download size={17} /> {t('Download')}
        </button>
      </div>

      <div className="share-section">
        <h3>
          <MessageCircle size={17} /> {t('Send on WhatsApp')}
        </h3>
        <div className="actions">
          <a className="btn btn-whatsapp" href={waLink(customerMessage(merchant, lang))} target="_blank" rel="noreferrer">
            <Users size={17} /> {t('To customers')}
          </a>
          <a className="btn btn-whatsapp" href={waLink(ownerMessage(merchant, lang))} target="_blank" rel="noreferrer">
            <Store size={17} /> {t('To other shop owners')}
          </a>
        </div>
      </div>

      <div className="share-section">
        <h3>
          <ImageIcon size={17} /> {t('Your share link')}
        </h3>
        <div className="share-link">
          <code>{shortUrl(link)}</code>
          <button className="btn btn-soft btn-sm" onClick={() => void copy()}>
            {copied ? <Check size={16} /> : <Copy size={16} />} {copied ? 'Copied' : 'Copy'}
          </button>
        </div>

      </div>

      {data && <ReferralRewards data={data} />}

      {location.hostname === 'localhost' && (
        <p className="alert alert-error small">These links point to localhost. Open the app from its public address to share them.</p>
      )}
    </Sheet>
  );
}

const NO_DATA: ShareData = {
  customers: 0,
  referrals: 0,
  invited: [],
  active: 0,
  referred: false,
  own: { visits: 0, days: 0 },
  standee: { earned: 0, sent: 0 },
  upi: { earned: 0, sent: 0 },
  rules: { visits: 20, days: 3, upiEvery: 3, upiAmount: 100 },
};

/** What the shop gets for bringing shops, and how far each shop it brought is from counting (server/src/referrals.ts). */
function ReferralRewards({ data }: { data: ShareData }) {
  const { rules } = data;
  const rule = t('A shop counts once it adds {visits} visits on {days} different days.')
    .replace('{visits}', String(rules.visits))
    .replace('{days}', String(rules.days));
  const toNextUpi = rules.upiEvery - (data.active % rules.upiEvery);
  const status = (e: Earned) => (e.sent >= e.earned && e.earned > 0 ? t('Sent ✓') : e.earned > e.sent ? t('On its way 🎉') : '');
  return (
    <div className="share-section">
      <h3>
        <Gift size={17} /> {t('Bring shops, get rewards')}
      </h3>
      <ul className="referral-rewards">
        <li>
          <span className="referral-icon" aria-hidden>
            🪧
          </span>
          <span>
            <b>{t('A counter standee')}</b> {t('with your shop name and rule, for the first shop you bring')}
            {status(data.standee) && <em>{status(data.standee)}</em>}
          </span>
        </li>
        <li>
          <span className="referral-icon" aria-hidden>
            💸
          </span>
          <span>
            <b>{t('₹{amount} on UPI').replace('{amount}', String(rules.upiAmount))}</b>{' '}
            {t('for every {n} shops you bring').replace('{n}', String(rules.upiEvery))}
            {data.upi.earned > 0 ? <em>{t('{n} earned').replace('{n}', num(data.upi.earned))}</em> : null}
            {data.active > 0 && <em>{t('{n} more shops for the next ₹{amount}').replace('{n}', String(toNextUpi)).replace('{amount}', String(rules.upiAmount))}</em>}
          </span>
        </li>
      </ul>
      <p className="muted small" style={{ margin: 0 }}>
        {rule} {t('We message you on WhatsApp to send your reward.')}
      </p>

      {data.invited.length > 0 ? (
        <ul className="referral-shops">
          {data.invited.map((s, i) => (
            <li key={i}>
              <span>
                <b>{s.name}</b>
                <small>{s.active ? t('Counts ✓') : t('{x} of {n} visits').replace('{x}', num(Math.min(s.visits, rules.visits))).replace('{n}', String(rules.visits))}</small>
              </span>
              <i className="referral-bar">
                <i style={{ width: `${s.active ? 100 : Math.min(99, (Math.min(s.visits, rules.visits) / rules.visits) * 100)}%` }} />
              </i>
            </li>
          ))}
        </ul>
      ) : (
        <p className="muted small" style={{ margin: 0 }}>
          {t('Shops that sign up from your link or your image show up here.')}
        </p>
      )}

      {data.referred && data.standee.earned === 0 && (
        <p className="alert alert-ok small" style={{ margin: 0 }}>
          {t('You joined from another shop’s link: you get a counter standee too once you add {visits} visits.').replace('{visits}', String(rules.visits))}
        </p>
      )}
    </div>
  );
}

/** Settings' invitation to share, with how many shops joined from this shop's links. */
export function ShareCard({ merchant }: { merchant: Merchant }) {
  const [open, setOpen] = useState(false);
  return (
    <section className="share-card">
      <div>
        <h2>
          <Share2 size={18} /> {t('Tell customers about your card')}
        </h2>
        <p>{t('A ready image for your WhatsApp status and Instagram, in Hindi or English.')}</p>
        <p className="share-card-reward">🎁 {t('Bring other shops: a free counter standee, and ₹100 for every 3 shops.')}</p>
      </div>
      <button className="btn btn-primary" onClick={() => setOpen(true)}>
        <Share2 size={17} /> {t('Share')}
      </button>
      {open && <ShareSheet merchant={merchant} onClose={() => setOpen(false)} />}
    </section>
  );
}
