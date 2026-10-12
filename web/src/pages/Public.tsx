import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from 'react';
import QRCode from 'qrcode';
import { Check, Crown, Download, Gift, History, KeyRound, LogIn, Phone, QrCode, Ticket } from 'lucide-react';

import { api, forgetWallet, num, rememberWallet, rupees, savedWallets, spendFor, type Bonus, type Reward, type Tier, type Transaction } from '../api';
import { LangToggle, t, useLang } from '../i18n';
import {
  Activity,
  BirthdayInput,
  EmptyState,
  ErrorText,
  InstallBanner,
  InstallButton,
  Logo,
  PinInput,
  Sheet,
  Skeleton,
  confetti,
  confirmDialog,
  toast,
  useAction,
} from '../ui';

// Pages customers open on their phone, without an account. Every text goes through t() for English / Hindi.

type RedeemCode = { code: string; expiresAt: string; usedAt: string | null; reward: Reward };

type WalletData = {
  hasPin: boolean;
  cardCode: string;
  shop: { id: number; name: string; pointsPer100: number; goldThreshold: number; goldMultiplier: number };
  customer: { name: string; points: number; lifetimePoints: number; tier: Tier; since: string };
  rewards: Reward[];
  history: Transaction[];
  redeemCode: RedeemCode | null;
};

/** Page frame for customer pages, with the language switch on top. */
function PublicPage({ children }: { children: ReactNode }) {
  return (
    <main className="public">
      <div className="public-top">
        <LangToggle />
      </div>
      {children}
    </main>
  );
}

function MemberCard({
  shop,
  name,
  points,
  gold,
  badge,
  children,
}: {
  shop: string;
  name: string;
  points?: number;
  gold?: boolean;
  badge?: boolean;
  children?: ReactNode;
}) {
  return (
    <section className={`member-card ${gold ? 'gold' : ''}`}>
      <div className="member-top">
        <span className="member-shop">
          <Logo /> <span>{shop}</span>
        </span>
        {badge && <span className="member-tier">{gold ? t('★ GOLD') : t('MEMBER')}</span>}
      </div>
      <span className="member-name">{name}</span>
      {points !== undefined && (
        <>
          <strong className="member-points">{num(points)}</strong>
          <span>{t('points')}</span>
        </>
      )}
      {children}
    </section>
  );
}

/** Lets the wallet's owner set (or change) the PIN they log in with. */
function PinCard({ token, hasPin, onSaved }: { token: string; hasPin: boolean; onSaved: () => void }) {
  const [open, setOpen] = useState(!hasPin);
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const { busy, error, setError, run } = useAction();

  const save = (e: FormEvent) => {
    e.preventDefault();
    if (pin !== confirmPin) return setError(t("The PINs don't match"));
    void run(async () => {
      await api(`public/wallet/${encodeURIComponent(token)}/pin`, 'POST', { pin });
      toast(t('PIN saved — you can log in with it anytime'));
      setOpen(false);
      setPin('');
      setConfirmPin('');
      onSaved();
    });
  };

  if (!open) {
    const [before, after = ''] = t('Log in anytime at {link}').split('{link}');
    return (
      <p className="muted small center">
        {before}
        <a href="/login">{location.host}/login</a>
        {after} ·{' '}
        <button className="link small" onClick={() => setOpen(true)}>
          {t('Change PIN')}
        </button>
      </p>
    );
  }
  return (
    <form className="card" onSubmit={save}>
      <div className="card-head">
        <h2>
          <KeyRound size={18} /> {hasPin ? t('Change your PIN') : t('Set a PIN')}
        </h2>
      </div>
      <p className="muted small">{t('With a 4-digit PIN you can check your points from any phone at {host}.', { host: `${location.host}/login` })}</p>
      <div className="form-row pin-row">
        <label>
          {t('New PIN')}
          <PinInput value={pin} onChange={setPin} />
        </label>
        <label>
          {t('Repeat PIN')}
          <PinInput value={confirmPin} onChange={setConfirmPin} />
        </label>
      </div>
      <ErrorText text={error} />
      <button className="btn btn-primary" disabled={busy || pin.length !== 4 || confirmPin.length !== 4}>
        {t('Save PIN')}
      </button>
    </form>
  );
}

/** Big QR the shop scans at the counter to find this customer without typing their number. */
function MyCardSheet({ shop, name, cardCode, onClose }: { shop: string; name: string; cardCode: string; onClose: () => void }) {
  const [qr, setQr] = useState('');
  useEffect(() => {
    QRCode.toDataURL(`lp-card:${cardCode}`, { width: 560, margin: 1, color: { dark: '#141416' } }).then(setQr);
  }, [cardCode]);
  return (
    <Sheet title={t('My card')} onClose={onClose}>
      <div style={{ display: 'grid', gap: 12 }}>
        <div className="bill-qr">{qr && <img src={qr} alt={t('Your member card QR code')} />}</div>
        <p className="center" style={{ margin: 0 }}>
          <strong>{name}</strong>
          <span className="muted"> · {shop}</span>
        </p>
        <p className="muted small center" style={{ margin: 0 }}>
          {t('Show this at the counter — the shop scans it to add your points.')}
        </p>
      </div>
    </Sheet>
  );
}

const secondsLeft = (iso: string) => Math.max(0, Math.round((Date.parse(iso) - Date.now()) / 1000));
const clock = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

/** The 4-digit code the customer shows at the counter; the shop types it to give the reward. */
function RedeemCodeCard({ code, onExpired }: { code: RedeemCode; onExpired: () => void }) {
  const [left, setLeft] = useState(() => secondsLeft(code.expiresAt));
  useEffect(() => {
    const timer = setInterval(() => {
      const s = secondsLeft(code.expiresAt);
      setLeft(s);
      if (!s) onExpired();
    }, 1000);
    return () => clearInterval(timer);
  }, [code.expiresAt, onExpired]);

  return (
    <section className="redeem-code" aria-live="polite">
      <span className="small">{t('Your code for {reward}', { reward: code.reward.name })}</span>
      <strong className="redeem-digits tabular" aria-label={code.code.split('').join(' ')}>
        {code.code}
      </strong>
      <span className="small">{t('Show this code at the counter · {time} left', { time: clock(left) })}</span>
      <span className="waiting">
        <span className="pulse" aria-hidden /> {t('Waiting for the shop…')}
      </span>
    </section>
  );
}

// Celebrations already shown on this phone, so confetti only fires for something new.
const celebratedKey = (token: string) => `lp_celebrated_${token}`;
function takeNewCelebrations(token: string, keys: string[]) {
  let seen: string[] = [];
  try {
    seen = JSON.parse(localStorage.getItem(celebratedKey(token)) || '[]') as string[];
  } catch {
    // Without storage every visit may celebrate again, which is harmless.
  }
  const fresh = keys.filter((k) => !seen.includes(k));
  if (fresh.length) {
    try {
      localStorage.setItem(celebratedKey(token), JSON.stringify([...seen, ...fresh].slice(-100)));
    } catch {
      // See above.
    }
  }
  return fresh;
}

/** /w/<token> — a customer's points, rewards and history at one shop. */
export function Wallet({ token }: { token: string }) {
  useLang(); // re-render in the chosen language
  const [data, setData] = useState<WalletData | null>(null);
  const [error, setError] = useState('');
  const [showCard, setShowCard] = useState(false);
  const { busy, error: actionError, run } = useAction();
  const path = `public/wallet/${encodeURIComponent(token)}`;

  const load = useCallback(() => {
    api<WalletData>(path)
      .then((d) => {
        setData(d);
        document.title = t('{shop} · My points', { shop: d.shop.name });
        rememberWallet({ token, shopId: d.shop.id, shop: d.shop.name, name: d.customer.name });
        const moments = [
          // Ready again after each time it's redeemed, so it celebrates once per round.
          ...d.rewards
            .filter((r) => r.points_cost <= d.customer.points)
            .map((r) => `ready:${r.id}:${d.history.filter((h) => h.type === 'redeem' && h.note === r.name).length}`),
          ...(d.customer.tier.name === 'Gold' ? ['gold'] : []),
          ...(d.redeemCode?.usedAt ? [`used:${d.redeemCode.code}:${d.redeemCode.usedAt}`] : []),
        ];
        if (takeNewCelebrations(token, moments).length) confetti();
      })
      .catch((err) => {
        const message = (err as Error).message;
        if (message.includes('not valid')) forgetWallet(token);
        setError(message);
      });
  }, [path, token]);
  useEffect(load, [load]);

  // "Add to Home Screen" should open this wallet, not the shop app. The API server swaps the manifest link in the
  // page it serves; when the website is served elsewhere (Vercel), swap it here.
  useEffect(() => {
    const link = document.querySelector<HTMLLinkElement>('link[rel="manifest"]');
    const own = `/api/public/wallet/${encodeURIComponent(token)}/manifest`;
    if (link && !link.href.endsWith(own)) link.href = own;
  }, [token]);

  // While a reward code is open, check every few seconds whether the shop has used it.
  const open = data?.redeemCode && !data.redeemCode.usedAt && secondsLeft(data.redeemCode.expiresAt) > 0;
  useEffect(() => {
    if (!open) return;
    const timer = setInterval(load, 4000);
    return () => clearInterval(timer);
  }, [open, load]);

  if (error) {
    return (
      <PublicPage>
        <section className="card">
          <EmptyState icon={Gift} title={t("This link doesn't work")} text={error} action={<a className="btn" href="/login">{t('Log in with your PIN')}</a>} />
        </section>
      </PublicPage>
    );
  }
  if (!data) {
    return (
      <PublicPage>
        <Skeleton h={220} />
        <Skeleton h={160} />
      </PublicPage>
    );
  }

  const { shop, customer, rewards, history, redeemCode } = data;
  const gold = customer.tier.name === 'Gold';
  const goldPct = Math.min(100, (customer.lifetimePoints / shop.goldThreshold) * 100);
  const ready = rewards.filter((r) => r.points_cost <= customer.points);
  const next = rewards.find((r) => r.points_cost > customer.points);
  const spend = (points: number) => rupees(spendFor(points, shop.pointsPer100, customer.tier.multiplier));
  const justUsed = redeemCode?.usedAt ? redeemCode : null;

  const getReward = async (r: Reward) => {
    const ok = await confirmDialog({
      title: t('Get {reward} for {n} points?', { reward: r.name, n: num(r.points_cost) }),
      body: t("You'll get a 4-digit code to show at the counter. Points are only used when the shop confirms."),
      confirm: t('Get code'),
      cancel: t('Cancel'),
    });
    if (!ok) return;
    void run(async () => {
      await api(`${path}/redeem`, 'POST', { rewardId: r.id });
      load();
      scrollTo({ top: 0, behavior: 'smooth' });
    });
  };

  return (
    <PublicPage>
      <MemberCard shop={shop.name} name={t('Hi {name}', { name: customer.name })} points={customer.points} gold={gold} badge>
        <div className="member-foot">
          {next && <span className="member-next">{t('Shop for {amount} more → {reward}', { amount: spend(next.points_cost - customer.points), reward: next.name })}</span>}
          {gold ? (
            <span>
              <Crown size={13} /> {t('Gold member — you earn ×{x} points', { x: shop.goldMultiplier })}
            </span>
          ) : (
            <>
              <div className="meter">
                <span style={{ width: `${goldPct}%` }} />
              </div>
              <span>{t('{n} more points to ★ Gold (×{x} points)', { n: num(customer.tier.toGold), x: shop.goldMultiplier })}</span>
            </>
          )}
        </div>
      </MemberCard>

      {open && redeemCode && <RedeemCodeCard code={redeemCode} onExpired={load} />}
      {justUsed && (
        <div className="callout callout-ok">
          <Check size={20} />
          <div>
            <strong>{t('Enjoy your {reward}! 🎉', { reward: justUsed.reward.name })}</strong>
            <div className="small muted">
              {t('{n} points used · new balance {balance}', { n: num(justUsed.reward.points_cost), balance: num(customer.points) })}
            </div>
          </div>
        </div>
      )}

      <button className="btn btn-primary btn-lg btn-block" onClick={() => setShowCard(true)}>
        <QrCode size={19} /> {t('My card')}
      </button>
      {showCard && <MyCardSheet shop={shop.name} name={customer.name} cardCode={data.cardCode} onClose={() => setShowCard(false)} />}

      <InstallBanner id="wallet" title={t('Add your card to your home screen')} text={t('See your points and show your card in one tap.')} />

      {ready.length > 0 && !open && (
        <div className="callout">
          <Gift size={20} />
          <div>
            <strong>{t('You can get {reward} now!', { reward: ready.length === 1 ? ready[0].name : t('{n} rewards', { n: ready.length }) })}</strong>
            <div className="small muted">{t('Tap “Get it” and show the code at the counter.')}</div>
          </div>
        </div>
      )}

      <section className="card">
        <div className="card-head">
          <h2>
            <Gift size={18} /> {t('Rewards')}
          </h2>
          <span className="muted small">{t('{n} pts per ₹100', { n: shop.pointsPer100 })}</span>
        </div>
        <ErrorText text={actionError} />
        {rewards.length ? (
          <div>
            {rewards.map((r) => {
              const pct = Math.min(100, (customer.points / r.points_cost) * 100);
              const can = customer.points >= r.points_cost;
              return (
                <div className="reward-row" key={r.id}>
                  <div className="reward-row-head">
                    <span>
                      <strong>{r.name}</strong>
                      <span className="muted small">
                        {' '}
                        · {num(r.points_cost)} {t('pts')}
                      </span>
                    </span>
                    {can ? (
                      <button className="btn btn-primary btn-sm" disabled={busy} onClick={() => void getReward(r)}>
                        <Ticket size={15} /> {t('Get it')}
                      </button>
                    ) : (
                      <span className="muted small">{t('{amount} more shopping', { amount: spend(r.points_cost - customer.points) })}</span>
                    )}
                  </div>
                  <div className="meter">
                    <span style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="muted small">{t('Rewards coming soon.')}</p>
        )}
      </section>

      <section className="card">
        <div className="card-head">
          <h2>
            <History size={18} /> {t('History')}
          </h2>
        </div>
        {history.length ? <Activity items={history} showCustomer={false} /> : <p className="muted small">{t('No activity yet.')}</p>}
      </section>

      <InstallButton className="btn btn-ghost btn-block">
        <Download size={18} /> {t('Add to home screen')}
      </InstallButton>
      <PinCard token={token} hasPin={data.hasPin} onSaved={load} />
    </PublicPage>
  );
}

/** /join/<code> — sign-up page behind the shop's counter QR code. */
export function Join({ code }: { code: string }) {
  useLang();
  const [shop, setShop] = useState<{ shop: string; welcomeBonus: number; pointsPer100: number } | null>(null);
  const [form, setForm] = useState({ name: '', phone: '', birthday: '', pin: '', confirmPin: '' });
  const [loadError, setLoadError] = useState('');
  const { busy, error, run } = useAction();

  useEffect(() => {
    api<typeof shop>(`public/join/${encodeURIComponent(code)}`)
      .then((s) => {
        setShop(s);
        if (s) document.title = t('Join {shop} rewards', { shop: s.shop });
      })
      .catch((err) => setLoadError((err as Error).message));
  }, [code]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    void run(async () => {
      if (form.pin !== form.confirmPin) throw new Error(t("The PINs don't match"));
      const r = await api<{ walletToken: string; bonuses: Bonus[] }>(`public/join/${encodeURIComponent(code)}`, 'POST', {
        name: form.name,
        phone: form.phone,
        pin: form.pin,
        birthday: form.birthday || undefined,
      });
      location.href = `/w/${r.walletToken}`;
    });
  };

  if (loadError) {
    return (
      <PublicPage>
        <section className="card">
          <EmptyState icon={Gift} title={t("This QR code doesn't work")} text={loadError} />
        </section>
      </PublicPage>
    );
  }
  if (!shop) {
    return (
      <PublicPage>
        <Skeleton h={180} />
      </PublicPage>
    );
  }

  return (
    <PublicPage>
      <MemberCard shop={shop.shop} name={t('Join our rewards')} points={shop.welcomeBonus > 0 ? shop.welcomeBonus : undefined}>
        <div className="member-foot">
          <span>
            {shop.welcomeBonus > 0 ? t('points free when you join · ') : ''}
            {t('Earn {n} points on every ₹100', { n: shop.pointsPer100 })}
          </span>
        </div>
      </MemberCard>
      <form className="card" onSubmit={submit}>
        <label>
          {t('Your name')}
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} autoComplete="name" required autoFocus />
        </label>
        <label>
          {t('Phone number')}
          <input value={form.phone} inputMode="tel" autoComplete="tel" onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="98765 43210" required />
        </label>
        <div className="form-row pin-row">
          <label>
            {t('Choose a 4-digit PIN')}
            <PinInput value={form.pin} onChange={(pin) => setForm({ ...form, pin })} />
          </label>
          <label>
            {t('Repeat PIN')}
            <PinInput value={form.confirmPin} onChange={(confirmPin) => setForm({ ...form, confirmPin })} />
          </label>
        </div>
        <span className="hint">{t("You'll use your phone number and PIN to check your points.")}</span>
        <label>
          {t('Birthday')} <span className="hint">{t('optional — for a birthday treat 🎂')}</span>
          <BirthdayInput value={form.birthday} onChange={(birthday) => setForm({ ...form, birthday })} />
        </label>
        <ErrorText text={error.includes('already exists') ? t("You're already a member! Log in with your phone and PIN.") : error} />
        <button className="btn btn-primary btn-lg" disabled={busy}>
          {busy ? t('Joining…') : t('Join and see my points')}
        </button>
        <p className="muted small center">
          {t('Already a member?')} <a href="/login">{t('Log in')}</a>
        </p>
      </form>
    </PublicPage>
  );
}

type ClaimInfo = { shopId: number; shop: string; amount: number; points: number; welcomeBonus: number };
type Claimed = {
  shop: string;
  points: number;
  bonuses: Bonus[];
  isNew: boolean;
  tierUp: boolean;
  name: string | null; // name, balance and wallet only when it's provably them (saved wallet, or just joined)
  balance: number | null;
  walletToken: string | null;
};

/** /c/<code> — the bill QR the shop shows. One tap with a saved card, otherwise the phone number (and name, if new). */
export function Claim({ code }: { code: string }) {
  useLang();
  const [info, setInfo] = useState<ClaimInfo | null>(null);
  const [loadError, setLoadError] = useState('');
  const [done, setDone] = useState<Claimed | null>(null);
  const [form, setForm] = useState({ phone: '', name: '' });
  const [needName, setNeedName] = useState(false);
  const [usePhone, setUsePhone] = useState(false);
  const { busy, error, run } = useAction();
  const path = `public/claim/${encodeURIComponent(code)}`;

  useEffect(() => {
    api<ClaimInfo>(path)
      .then((i) => {
        setInfo(i);
        document.title = t('Points from {shop}', { shop: i.shop });
      })
      .catch((err) => setLoadError((err as Error).message));
  }, [path]);

  const saved = info && !usePhone ? savedWallets().find((w) => w.shopId === info.shopId) : undefined;

  const claim = (body: { walletToken?: string; phone?: string; name?: string }) =>
    void run(async () => {
      try {
        const r = await api<Claimed | { needName: true }>(path, 'POST', body);
        if ('needName' in r) return setNeedName(true);
        if (r.walletToken && r.name) rememberWallet({ token: r.walletToken, shopId: info!.shopId, shop: r.shop, name: r.name });
        setDone(r);
        confetti();
      } catch (err) {
        if (body.walletToken) setUsePhone(true); // that saved card no longer works here
        throw err;
      }
    });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    claim({ phone: form.phone, name: needName ? form.name : undefined });
  };

  if (loadError) {
    return (
      <PublicPage>
        <section className="card">
          <EmptyState icon={QrCode} title={t("Can't add these points")} text={loadError} />
        </section>
      </PublicPage>
    );
  }
  if (!info) {
    return (
      <PublicPage>
        <Skeleton h={180} />
      </PublicPage>
    );
  }

  if (done) {
    const total = done.points + done.bonuses.reduce((a, b) => a + b.points, 0);
    return (
      <PublicPage>
        <section className="card success">
          <span className="success-burst">
            <Check size={34} strokeWidth={3} />
          </span>
          <span className="success-points tabular">+{num(total)}</span>
          <span className="muted">
            {t('points from {shop}', { shop: done.shop })}
            {done.balance !== null && <> · {t('balance {n}', { n: num(done.balance) })}</>}
          </span>
          {done.bonuses.length > 0 && (
            <span className="small muted">
              {t('includes {list}', { list: done.bonuses.map((b) => `${num(b.points)} ${t(b.label).toLowerCase()}`).join(' + ') })}
            </span>
          )}
        </section>
        {done.tierUp && (
          <div className="callout">
            <Crown size={20} />
            <div>
              <strong>{t("You're now a ★ Gold member!")}</strong>
              <div className="small muted">{t("You'll earn extra points on every bill.")}</div>
            </div>
          </div>
        )}
        {done.walletToken ? (
          <a className="btn btn-primary btn-lg btn-block" href={`/w/${done.walletToken}`}>
            <Gift size={18} /> {done.isNew ? t('See my card and rewards') : t('Open my card')}
          </a>
        ) : (
          <p className="muted small center">
            {t('Added to the account for this number.')} <a href="/login">{t('Log in')}</a> {t('with your PIN to see your balance.')}
          </p>
        )}
      </PublicPage>
    );
  }

  return (
    <PublicPage>
      <MemberCard shop={info.shop} name={t('{amount} bill', { amount: rupees(info.amount) })} points={info.points}>
        <div className="member-foot">
          <span>{t('waiting for you — tap below to add them')}</span>
        </div>
      </MemberCard>

      {saved ? (
        <section className="card" style={{ display: 'grid', gap: 12 }}>
          <button className="btn btn-primary btn-lg" disabled={busy} onClick={() => claim({ walletToken: saved.token })}>
            {busy ? t('Adding…') : t('Add to my card · {name}', { name: saved.name })}
          </button>
          <ErrorText text={error} />
          <button className="link small" onClick={() => setUsePhone(true)}>
            {t('Not {name}? Use a phone number', { name: saved.name })}
          </button>
        </section>
      ) : (
        <form className="card" onSubmit={submit}>
          <label>
            {t('Your phone number')}
            <span className="input-icon">
              <Phone size={18} />
              <input
                value={form.phone}
                inputMode="tel"
                autoComplete="tel"
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="98765 43210"
                required
                autoFocus={!needName}
              />
            </span>
          </label>
          {needName && (
            <>
              <p className="alert alert-ok small" style={{ margin: 0 }}>
                {info.welcomeBonus > 0
                  ? t("Welcome! You're new here — you also get {n} bonus points. What's your name?", { n: num(info.welcomeBonus) })
                  : t("Welcome! You're new here. What's your name?")}
              </p>
              <label>
                {t('Your name')}
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} autoComplete="name" required autoFocus />
              </label>
            </>
          )}
          <ErrorText text={error} />
          <button className="btn btn-primary btn-lg" disabled={busy}>
            {busy ? t('Adding…') : t('Get {n} points', { n: num(info.points) })}
          </button>
        </form>
      )}
    </PublicPage>
  );
}

type LoginResult = { wallets: { token: string; shop: string; name: string; points: number }[] };

/** /login — customers check their points with phone number + PIN, or open a card saved on this phone. */
export function CustomerLogin() {
  useLang();
  const [form, setForm] = useState({ phone: '', pin: '' });
  const [wallets, setWallets] = useState<LoginResult['wallets'] | null>(null);
  const { busy, error, run } = useAction();
  const saved = savedWallets();

  useEffect(() => {
    document.title = t('Check your points');
  }, []);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    void run(async () => {
      const r = await api<LoginResult>('public/login', 'POST', form);
      if (r.wallets.length === 1) location.href = `/w/${r.wallets[0].token}`;
      else setWallets(r.wallets);
    });
  };

  if (wallets) {
    return (
      <PublicPage>
        <MemberCard shop={t('Your rewards')} name={t('Hi {name}', { name: wallets[0].name })} points={wallets.reduce((a, w) => a + w.points, 0)}>
          <div className="member-foot">
            <span>{t('across {n} shops', { n: wallets.length })}</span>
          </div>
        </MemberCard>
        <section className="card">
          <h2>{t('Choose a shop')}</h2>
          <ul className="rows">
            {wallets.map((w) => (
              <li key={w.token}>
                <a className="row-item" href={`/w/${w.token}`}>
                  <span className="row-main">
                    <strong>{w.shop}</strong>
                  </span>
                  <span className="points-pill">
                    {num(w.points)} {t('pts')}
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </section>
      </PublicPage>
    );
  }

  return (
    <PublicPage>
      <MemberCard shop="Loyalty Points" name={t('Check your points')}>
        <div className="member-foot">
          <span>{t('Log in with the phone number you gave the shop and your PIN.')}</span>
        </div>
      </MemberCard>

      {saved.length > 0 && (
        <section className="card">
          <div className="card-head">
            <h2>{t('Your cards on this phone')}</h2>
          </div>
          <p className="muted small" style={{ margin: 0 }}>
            {t('Open straight away — no PIN needed on this phone.')}
          </p>
          <ul className="rows">
            {saved.map((w) => (
              <li key={w.token}>
                <a className="row-item" href={`/w/${w.token}`}>
                  <span className="row-main">
                    <strong>{w.shop}</strong>
                    <span>{w.name}</span>
                  </span>
                  <span className="points-pill">
                    <QrCode size={14} />
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}

      <form className="card" onSubmit={submit}>
        <label>
          {t('Phone number')}
          <span className="input-icon">
            <Phone size={18} />
            <input
              value={form.phone}
              inputMode="tel"
              autoComplete="tel"
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="98765 43210"
              required
              autoFocus={!saved.length}
            />
          </span>
        </label>
        <label>
          {t('PIN')}
          <PinInput value={form.pin} onChange={(pin) => setForm({ ...form, pin })} />
        </label>
        <ErrorText text={error} />
        <button className="btn btn-primary btn-lg" disabled={busy || form.pin.length !== 4}>
          <LogIn size={18} /> {busy ? t('Checking…') : t('Log in')}
        </button>
        <p className="muted small center">
          <strong>{t('Forgot your PIN?')}</strong>{' '}
          {saved.length
            ? t('Open your card above and set a new one.')
            : t('Ask the shop to send your points link on WhatsApp — open it and set a new PIN.')}
        </p>
      </form>
    </PublicPage>
  );
}
