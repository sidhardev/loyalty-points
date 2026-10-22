import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { Check, Gift, History, Phone } from 'lucide-react';

import { api, when } from '../api';
import { trackedLink } from '../attribution';
import '../counter.css';
import { LangToggle, t, useLang } from '../i18n';
import '../marketing.css';
import { EmptyState, InstallBanner, Logo, LogoMark, Skeleton, confetti } from '../ui';
import { Stamps } from './Counter';

// Pages customers open on their phone, without an account. Every text goes through t() for English / Hindi.
// There's nothing for the customer to do: the shop types their number, and the WhatsApp link opens their card.

type WalletData = {
  shop: { name: string; joinCode: string; visitsNeeded: number; rewardName: string };
  stamps: number;
  since: string;
  history: { kind: 'visit' | 'reward'; note: string | null; createdAt: string }[];
};

/** The card's shop's invite page (/r/<code>, sign-up form on the page), tagged as a card visit rather than a share. */
const cardInvite = (code: string) => `${location.origin}/r/${encodeURIComponent(code)}?utm_source=card&utm_medium=referral&utm_campaign=${encodeURIComponent(code)}`;

/** Page frame for customer pages, with the language switch on top and a small "made with Regularhood" line below.
 * `via` is the shop's join code, so Admin → Growth can see which shop's customers brought new shops. */
function PublicPage({ children, via }: { children: ReactNode; via?: string }) {
  return (
    <main className="public">
      <div className="public-top">
        <LangToggle />
      </div>
      {children}
      <a className="made-with" href={via ? cardInvite(via) : trackedLink('card', '', 'referral')} target="_blank" rel="noopener">
        <LogoMark size={22} />
        <span>
          {t('Rewards by Regularhood')} · <b>{t('Run a shop? Get it free')}</b>
        </span>
      </a>
    </main>
  );
}

/** Confetti once per full card on this phone, not on every open. */
function celebrateOnce(token: string, key: string) {
  const storageKey = `lp_celebrated_${token}`;
  try {
    if (localStorage.getItem(storageKey) === key) return;
    localStorage.setItem(storageKey, key);
  } catch {
    // Without storage it may celebrate again, which is harmless.
  }
  confetti();
}

/** /w/<token> — the customer's stamp card at one shop. */
export function Wallet({ token }: { token: string }) {
  useLang(); // re-render in the chosen language
  const [data, setData] = useState<WalletData | null>(null);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    api<WalletData>(`public/wallet/${encodeURIComponent(token)}`)
      .then((d) => {
        setData(d);
        document.title = t('{shop} · My card', { shop: d.shop.name });
        if (d.stamps >= d.shop.visitsNeeded) celebrateOnce(token, `full:${d.history.filter((h) => h.kind === 'reward').length}`);
      })
      .catch((err) => setError((err as Error).message));
  }, [token]);
  useEffect(load, [load]);

  // "Add to Home Screen" should open this card, not the shop app. The API server swaps the manifest link in the
  // page it serves; when the website is served elsewhere (Vercel), swap it here.
  useEffect(() => {
    const link = document.querySelector<HTMLLinkElement>('link[rel="manifest"]');
    const own = `/api/public/wallet/${encodeURIComponent(token)}/manifest`;
    if (link && !link.href.endsWith(own)) link.href = own;
  }, [token]);

  if (error) {
    return (
      <PublicPage>
        <section className="card">
          <EmptyState icon={Gift} title={t("This link doesn't work")} text={t('Ask the shop to send your card again on WhatsApp.')} />
        </section>
      </PublicPage>
    );
  }
  if (!data) {
    return (
      <PublicPage>
        <Skeleton h={260} />
        <Skeleton h={160} />
      </PublicPage>
    );
  }

  const { shop, stamps, history } = data;
  const n = shop.visitsNeeded;
  const full = stamps >= n;
  const left = n - stamps;

  return (
    <PublicPage via={shop.joinCode}>
      <section className="member-card stamp-card">
        <div className="member-top">
          <span className="member-shop">
            <Logo /> <span>{shop.name}</span>
          </span>
        </div>
        <span className="member-name">{t('Every {n} visits → {reward}', { n, reward: shop.rewardName })}</span>
        <Stamps stamps={stamps} needed={n} size="lg" />
        <strong className="stamp-card-status">
          {full
            ? t('Your {reward} is ready! 🎁', { reward: shop.rewardName })
            : left === 1
              ? t('1 more visit for {reward}', { reward: shop.rewardName })
              : t('{n} more visits for {reward}', { n: left, reward: shop.rewardName })}
        </strong>
        <span className="small">{full ? t('Get it on your next visit — just tell your phone number.') : t('Visit {x} of {n}', { x: stamps, n })}</span>
      </section>

      <div className="callout">
        <Phone size={20} />
        <div>
          <strong>{t('Just tell your phone number at the counter')}</strong>
          <div className="small muted">{t('One visit a day counts. No app, no sign-up.')}</div>
        </div>
      </div>

      <InstallBanner id="wallet" title={t('Add your card to your home screen')} text={t('See your visits in one tap.')} />

      <section className="card">
        <div className="card-head">
          <h2>
            <History size={18} /> {t('History')}
          </h2>
        </div>
        {history.length ? (
          <ul className="rows">
            {history.map((h, i) => (
              <li key={i}>
                <div className="row-item">
                  <span className={`activity-icon ${h.kind === 'visit' ? 'earn' : 'redeem'}`}>{h.kind === 'visit' ? <Check size={17} /> : <Gift size={17} />}</span>
                  <div className="row-main">
                    <strong>{h.kind === 'visit' ? t('Visit') : t('Got {reward}', { reward: h.note ?? shop.rewardName })}</strong>
                    <span>{when(h.createdAt)}</span>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted small">{t('No visits yet.')}</p>
        )}
      </section>
    </PublicPage>
  );
}

/** /join/<code> — behind QR codes printed before the stamp card: says what the shop gives and that there's nothing to do. */
export function Join({ code }: { code: string }) {
  useLang();
  const [info, setInfo] = useState<{ shop: string; visitsNeeded: number; rewardName: string } | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    api<{ shop: string; visitsNeeded: number; rewardName: string }>(`public/join/${encodeURIComponent(code)}`)
      .then(setInfo)
      .catch((err) => setError((err as Error).message));
  }, [code]);

  return (
    <PublicPage via={code}>
      {error ? (
        <section className="card">
          <EmptyState icon={Gift} title={t('This QR code is not valid')} />
        </section>
      ) : !info ? (
        <Skeleton h={260} />
      ) : (
        <section className="member-card stamp-card">
          <div className="member-top">
            <span className="member-shop">
              <Logo /> <span>{info.shop}</span>
            </span>
          </div>
          {info.rewardName && (
            <>
              <span className="member-name">{t('Every {n} visits → {reward}', { n: info.visitsNeeded, reward: info.rewardName })}</span>
              <Stamps stamps={0} needed={info.visitsNeeded} size="lg" />
            </>
          )}
          <strong className="stamp-card-status">{t('Just tell your phone number at the counter')}</strong>
          <span className="small">{t('The shop sends your card on WhatsApp. No app, no sign-up.')}</span>
        </section>
      )}
    </PublicPage>
  );
}

/** Old bill QR and PIN login links. */
export function OldLink() {
  useLang();
  return (
    <PublicPage>
      <section className="card">
        <EmptyState
          icon={Phone}
          title={t('Just tell your phone number at the counter')}
          text={t('There is nothing to scan or log in to any more. The shop adds your visit and sends your card on WhatsApp.')}
        />
      </section>
    </PublicPage>
  );
}
