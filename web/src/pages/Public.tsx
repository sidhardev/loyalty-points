import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from 'react';
import QRCode from 'qrcode';
import { Check, Crown, Download, Gift, History, KeyRound, LogIn, Phone, QrCode } from 'lucide-react';

import { api, forgetWallet, num, rememberWallet, savedWallets, type Bonus, type Reward, type Tier, type Transaction } from '../api';
import { Activity, BirthdayInput, EmptyState, ErrorText, InstallBanner, InstallButton, Logo, PinInput, Sheet, Skeleton, toast, useAction } from '../ui';

// Pages customers open on their phone, without an account.

type WalletData = {
  hasPin: boolean;
  cardCode: string;
  shop: { id: number; name: string; pointsPer100: number; goldThreshold: number; goldMultiplier: number };
  customer: { name: string; points: number; lifetimePoints: number; tier: Tier; since: string };
  rewards: Reward[];
  history: Transaction[];
};

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
        {badge && <span className="member-tier">{gold ? '★ GOLD' : 'MEMBER'}</span>}
      </div>
      <span className="member-name">{name}</span>
      {points !== undefined && (
        <>
          <strong className="member-points">{num(points)}</strong>
          <span>points</span>
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
    if (pin !== confirmPin) return setError("The PINs don't match");
    void run(async () => {
      await api(`public/wallet/${encodeURIComponent(token)}/pin`, 'POST', { pin });
      toast('PIN saved — you can log in with it anytime');
      setOpen(false);
      setPin('');
      setConfirmPin('');
      onSaved();
    });
  };

  if (!open) {
    return (
      <p className="muted small center">
        Log in anytime at <a href="/login">{location.host}/login</a> ·{' '}
        <button className="link small" onClick={() => setOpen(true)}>
          Change PIN
        </button>
      </p>
    );
  }
  return (
    <form className="card" onSubmit={save}>
      <div className="card-head">
        <h2>
          <KeyRound size={18} /> {hasPin ? 'Change your PIN' : 'Set a PIN'}
        </h2>
      </div>
      <p className="muted small">With a 4-digit PIN you can check your points from any phone at {location.host}/login.</p>
      <div className="form-row pin-row">
        <label>
          New PIN
          <PinInput value={pin} onChange={setPin} />
        </label>
        <label>
          Repeat PIN
          <PinInput value={confirmPin} onChange={setConfirmPin} />
        </label>
      </div>
      <ErrorText text={error} />
      <button className="btn btn-primary" disabled={busy || pin.length !== 4 || confirmPin.length !== 4}>
        Save PIN
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
    <Sheet title="My card" onClose={onClose}>
      <div style={{ display: 'grid', gap: 12 }}>
        <div className="bill-qr">{qr && <img src={qr} alt="Your member card QR code" />}</div>
        <p className="center" style={{ margin: 0 }}>
          <strong>{name}</strong>
          <span className="muted"> · {shop}</span>
        </p>
        <p className="muted small center" style={{ margin: 0 }}>
          Show this at the counter — the shop scans it to add your points.
        </p>
      </div>
    </Sheet>
  );
}

/** /w/<token> — a customer's points, rewards and history at one shop. */
export function Wallet({ token }: { token: string }) {
  const [data, setData] = useState<WalletData | null>(null);
  const [error, setError] = useState('');
  const [showCard, setShowCard] = useState(false);

  const load = useCallback(() => {
    api<WalletData>(`public/wallet/${encodeURIComponent(token)}`)
      .then((d) => {
        setData(d);
        document.title = `${d.shop.name} · My points`;
        rememberWallet({ token, shopId: d.shop.id, shop: d.shop.name, name: d.customer.name });
      })
      .catch((err) => {
        const message = (err as Error).message;
        if (message.includes('not valid')) forgetWallet(token);
        setError(message);
      });
  }, [token]);
  useEffect(load, [load]);

  if (error) {
    return (
      <main className="public">
        <section className="card">
          <EmptyState icon={Gift} title="This link doesn't work" text={error} action={<a className="btn" href="/login">Log in with your PIN</a>} />
        </section>
      </main>
    );
  }
  if (!data) {
    return (
      <main className="public">
        <Skeleton h={220} />
        <Skeleton h={160} />
      </main>
    );
  }

  const { shop, customer, rewards, history } = data;
  const gold = customer.tier.name === 'Gold';
  const goldPct = Math.min(100, (customer.lifetimePoints / shop.goldThreshold) * 100);
  const ready = rewards.filter((r) => r.points_cost <= customer.points);

  return (
    <main className="public">
      <MemberCard shop={shop.name} name={`Hi ${customer.name}`} points={customer.points} gold={gold} badge>
        <div className="member-foot">
          {gold ? (
            <span>
              <Crown size={13} /> Gold member — you earn ×{shop.goldMultiplier} points
            </span>
          ) : (
            <>
              <div className="meter">
                <span style={{ width: `${goldPct}%` }} />
              </div>
              <span>
                {num(customer.tier.toGold)} more points to ★ Gold (×{shop.goldMultiplier} points)
              </span>
            </>
          )}
        </div>
      </MemberCard>

      <button className="btn btn-primary btn-lg btn-block" onClick={() => setShowCard(true)}>
        <QrCode size={19} /> My card
      </button>
      {showCard && <MyCardSheet shop={shop.name} name={customer.name} cardCode={data.cardCode} onClose={() => setShowCard(false)} />}

      <InstallBanner id="wallet" title="Add your card to your home screen" text="See your points and show your card in one tap." />

      {ready.length > 0 && (
        <div className="callout">
          <Gift size={20} />
          <div>
            <strong>
              You can get {ready.length === 1 ? ready[0].name : `${ready.length} rewards`} now!
            </strong>
            <div className="small muted">Just ask at the counter.</div>
          </div>
        </div>
      )}

      <section className="card">
        <div className="card-head">
          <h2>
            <Gift size={18} /> Rewards
          </h2>
          <span className="muted small">{shop.pointsPer100} pts per ₹100</span>
        </div>
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
                      <span className="muted small"> · {num(r.points_cost)} pts</span>
                    </span>
                    <span className={can ? 'ready' : 'muted small'}>{can ? 'Ready ✓' : `${num(r.points_cost - customer.points)} to go`}</span>
                  </div>
                  <div className="meter">
                    <span style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="muted small">Rewards coming soon.</p>
        )}
      </section>

      <section className="card">
        <div className="card-head">
          <h2>
            <History size={18} /> History
          </h2>
        </div>
        {history.length ? <Activity items={history} showCustomer={false} /> : <p className="muted small">No activity yet.</p>}
      </section>

      <InstallButton className="btn btn-ghost btn-block">
        <Download size={18} /> Add to home screen
      </InstallButton>
      <PinCard token={token} hasPin={data.hasPin} onSaved={load} />
    </main>
  );
}

/** /join/<code> — sign-up page behind the shop's counter QR code. */
export function Join({ code }: { code: string }) {
  const [shop, setShop] = useState<{ shop: string; welcomeBonus: number; pointsPer100: number } | null>(null);
  const [form, setForm] = useState({ name: '', phone: '', birthday: '', pin: '', confirmPin: '' });
  const [loadError, setLoadError] = useState('');
  const { busy, error, run } = useAction();

  useEffect(() => {
    api<typeof shop>(`public/join/${encodeURIComponent(code)}`)
      .then((s) => {
        setShop(s);
        if (s) document.title = `Join ${s.shop} rewards`;
      })
      .catch((err) => setLoadError((err as Error).message));
  }, [code]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    void run(async () => {
      if (form.pin !== form.confirmPin) throw new Error("The PINs don't match");
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
      <main className="public">
        <section className="card">
          <EmptyState icon={Gift} title="This QR code doesn't work" text={loadError} />
        </section>
      </main>
    );
  }
  if (!shop) {
    return (
      <main className="public">
        <Skeleton h={180} />
      </main>
    );
  }

  return (
    <main className="public">
      <MemberCard shop={shop.shop} name="Join our rewards" points={shop.welcomeBonus > 0 ? shop.welcomeBonus : undefined}>
        <div className="member-foot">
          <span>
            {shop.welcomeBonus > 0 ? 'points free when you join · ' : ''}
            Earn {shop.pointsPer100} points on every ₹100
          </span>
        </div>
      </MemberCard>
      <form className="card" onSubmit={submit}>
        <label>
          Your name
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} autoComplete="name" required autoFocus />
        </label>
        <label>
          Phone number
          <input value={form.phone} inputMode="tel" autoComplete="tel" onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="98765 43210" required />
        </label>
        <div className="form-row pin-row">
          <label>
            Choose a 4-digit PIN
            <PinInput value={form.pin} onChange={(pin) => setForm({ ...form, pin })} />
          </label>
          <label>
            Repeat PIN
            <PinInput value={form.confirmPin} onChange={(confirmPin) => setForm({ ...form, confirmPin })} />
          </label>
        </div>
        <span className="hint">You'll use your phone number and PIN to check your points.</span>
        <label>
          Birthday <span className="hint">optional — for a birthday treat 🎂</span>
          <BirthdayInput value={form.birthday} onChange={(birthday) => setForm({ ...form, birthday })} />
        </label>
        <ErrorText text={error.includes('already exists') ? "You're already a member! Log in with your phone and PIN." : error} />
        <button className="btn btn-primary btn-lg" disabled={busy}>
          {busy ? 'Joining…' : 'Join and see my points'}
        </button>
        <p className="muted small center">
          Already a member? <a href="/login">Log in</a>
        </p>
      </form>
    </main>
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
        document.title = `Points from ${i.shop}`;
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
      <main className="public">
        <section className="card">
          <EmptyState icon={QrCode} title="Can't add these points" text={loadError} />
        </section>
      </main>
    );
  }
  if (!info) {
    return (
      <main className="public">
        <Skeleton h={180} />
      </main>
    );
  }

  if (done) {
    const total = done.points + done.bonuses.reduce((a, b) => a + b.points, 0);
    return (
      <main className="public">
        <section className="card success">
          <span className="success-burst">
            <Check size={34} strokeWidth={3} />
          </span>
          <span className="success-points tabular">+{num(total)}</span>
          <span className="muted">
            points from <strong style={{ color: 'var(--ink)' }}>{done.shop}</strong>
            {done.balance !== null && <> · balance {num(done.balance)}</>}
          </span>
          {done.bonuses.length > 0 && (
            <span className="small muted">includes {done.bonuses.map((b) => `${num(b.points)} ${b.label.toLowerCase()}`).join(' + ')}</span>
          )}
        </section>
        {done.tierUp && (
          <div className="callout">
            <Crown size={20} />
            <div>
              <strong>You're now a ★ Gold member!</strong>
              <div className="small muted">You'll earn extra points on every bill.</div>
            </div>
          </div>
        )}
        {done.walletToken ? (
          <a className="btn btn-primary btn-lg btn-block" href={`/w/${done.walletToken}`}>
            <Gift size={18} /> {done.isNew ? 'See my card and rewards' : 'Open my card'}
          </a>
        ) : (
          <p className="muted small center">
            Added to the account for this number. <a href="/login">Log in</a> with your PIN to see your balance.
          </p>
        )}
      </main>
    );
  }

  return (
    <main className="public">
      <MemberCard shop={info.shop} name={`₹${num(info.amount)} bill`} points={info.points}>
        <div className="member-foot">
          <span>waiting for you — tap below to add them</span>
        </div>
      </MemberCard>

      {saved ? (
        <section className="card" style={{ display: 'grid', gap: 12 }}>
          <button className="btn btn-primary btn-lg" disabled={busy} onClick={() => claim({ walletToken: saved.token })}>
            {busy ? 'Adding…' : `Add to my card · ${saved.name}`}
          </button>
          <ErrorText text={error} />
          <button className="link small" onClick={() => setUsePhone(true)}>
            Not {saved.name}? Use a phone number
          </button>
        </section>
      ) : (
        <form className="card" onSubmit={submit}>
          <label>
            Your phone number
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
                Welcome! You're new here{info.welcomeBonus > 0 ? ` — you also get ${num(info.welcomeBonus)} bonus points` : ''}. What's your name?
              </p>
              <label>
                Your name
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} autoComplete="name" required autoFocus />
              </label>
            </>
          )}
          <ErrorText text={error} />
          <button className="btn btn-primary btn-lg" disabled={busy}>
            {busy ? 'Adding…' : `Get ${num(info.points)} points`}
          </button>
        </form>
      )}
    </main>
  );
}

type LoginResult ={ wallets: { token: string; shop: string; name: string; points: number }[] };

/** /login — customers check their points with phone number + PIN. */
export function CustomerLogin() {
  const [form, setForm] = useState({ phone: '', pin: '' });
  const [wallets, setWallets] = useState<LoginResult['wallets'] | null>(null);
  const { busy, error, run } = useAction();

  useEffect(() => {
    document.title = 'Check your points';
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
      <main className="public">
        <MemberCard shop="Your rewards" name={`Hi ${wallets[0].name}`} points={wallets.reduce((a, w) => a + w.points, 0)}>
          <div className="member-foot">
            <span>across {wallets.length} shops</span>
          </div>
        </MemberCard>
        <section className="card">
          <h2>Choose a shop</h2>
          <ul className="rows">
            {wallets.map((w) => (
              <li key={w.token}>
                <a className="row-item" href={`/w/${w.token}`}>
                  <span className="row-main">
                    <strong>{w.shop}</strong>
                  </span>
                  <span className="points-pill">{num(w.points)} pts</span>
                </a>
              </li>
            ))}
          </ul>
        </section>
      </main>
    );
  }

  return (
    <main className="public">
      <MemberCard shop="Loyalty Points" name="Check your points">
        <div className="member-foot">
          <span>Log in with the phone number you gave the shop and your PIN.</span>
        </div>
      </MemberCard>
      <form className="card" onSubmit={submit}>
        <label>
          Phone number
          <span className="input-icon">
            <Phone size={18} />
            <input
              value={form.phone}
              inputMode="tel"
              autoComplete="tel"
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="98765 43210"
              required
              autoFocus
            />
          </span>
        </label>
        <label>
          PIN
          <PinInput value={form.pin} onChange={(pin) => setForm({ ...form, pin })} />
        </label>
        <ErrorText text={error} />
        <button className="btn btn-primary btn-lg" disabled={busy || form.pin.length !== 4}>
          <LogIn size={18} /> {busy ? 'Checking…' : 'Log in'}
        </button>
        <p className="muted small center">Forgot your PIN? Ask the shop to reset it — they'll send you a link to set a new one.</p>
      </form>
    </main>
  );
}
