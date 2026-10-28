import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Check, Copy, Handshake, MessageCircle, Plus, Store, UserPlus } from 'lucide-react';
import { rupees, when, whatsapp } from '../api';
import { EmptyState, ErrorText, SkeletonRows, confirmDialog, toast, useAction } from '../ui';
import type { AdminApi } from './AdminSeo';
import { Sub } from './AdminSub';

// Admin → Partners (server/src/partners.ts): payouts that are due (send on UPI, then mark sent), and every partner with
// their shops and money. Partners sign up themselves at /partners, or are added here; a shop that joined without the
// partner's link can be given to them by its shop number.

type Due = {
  kind: 'active' | 'payment';
  refId: number;
  partnerId: number;
  partner: string;
  phone: string;
  upi: string;
  shop: string;
  what: string;
  amount: number;
};
type Partner = {
  id: number;
  code: string;
  token: string;
  kind: 'agent' | 'business';
  name: string;
  business: string;
  phone: string;
  upi: string;
  city: string;
  created_at: string;
  disabled_at: string | null;
  totals: { shops: number; active: number; paying: number; sent: number; due: number; hold: number };
  shops: { id: number; name: string; plan: string; active: boolean; customers: number; days: number }[];
};
type Data = { partners: Partner[]; due: Due[]; sent: { kind: string; amount_paise: number; sent_at: string; partner: string }[] };

const paise = (n: number) => rupees(n / 100);
const copy = (text: string, done: string) => void navigator.clipboard.writeText(text).then(() => toast(done), () => toast("Couldn't copy", 'error'));

export function PartnersPage({ api }: { api: AdminApi }) {
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState('');
  const load = useCallback(() => void api<Data>('partners').then(setData, (e) => setError((e as Error).message)), [api]);
  useEffect(load, [load]);

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Partners</h1>
          <p className="muted small" style={{ margin: 0 }}>
            They bring shops for a commission. Sign-up page to share:{' '}
            <a href="/partners" target="_blank" rel="noreferrer">
              {location.origin}/partners
            </a>
          </p>
        </div>
      </div>
      <ErrorText text={error} />
      <Sub id="payouts">
        <PayoutsCard api={api} data={data} reload={load} />
      </Sub>
      <Sub id="partners">
        <AddPartnerCard api={api} reload={load} />
        <PartnerList api={api} data={data} reload={load} />
      </Sub>
    </div>
  );
}

function PayoutsCard({ api, data, reload }: { api: AdminApi; data: Data | null; reload: () => void }) {
  const { busy, run } = useAction();
  const markSent = (d: Due) =>
    run(async () => {
      if (!(await confirmDialog({ title: `Mark ${paise(d.amount)} sent to ${d.partner}?`, confirm: 'Mark sent' }))) return;
      await api(`partners/${d.partnerId}/payouts`, 'POST', { kind: d.kind, refId: d.refId });
      toast('Marked sent');
      reload();
    });
  const ask = (d: Due) => `Namaste ${d.partner.split(' ')[0]}! ${d.shop} ke liye aapka ${paise(d.amount)} Regularhood partner commission ready hai 🎉 Kripya apna UPI ID bhejiye.`;

  return (
    <section className="card">
      <div className="card-head">
        <h2>
          <Handshake size={18} /> Payouts to send
        </h2>
        <span className="muted small">payments are held 7 days, then show here</span>
      </div>
      {!data ? (
        <SkeletonRows count={2} />
      ) : data.due.length ? (
        <ul className="rows">
          {data.due.map((d) => (
            <li key={`${d.kind}-${d.refId}`}>
              <div className="row-item">
                <span className="row-main">
                  <strong>
                    {d.partner} · {paise(d.amount)}
                  </strong>
                  <span>
                    {d.what} · {d.shop}
                    {d.upi ? ` · UPI ${d.upi}` : ' · no UPI ID yet'}
                  </span>
                </span>
                {d.upi ? (
                  <button className="btn btn-sm btn-soft" onClick={() => copy(d.upi, 'UPI ID copied')}>
                    <Copy size={15} /> UPI
                  </button>
                ) : (
                  <a className="btn btn-sm btn-whatsapp" href={whatsapp(d.phone, ask(d))} target="_blank" rel="noreferrer">
                    <MessageCircle size={15} /> Ask
                  </a>
                )}
                <button className="btn btn-sm btn-soft" disabled={busy} onClick={() => void markSent(d)}>
                  <Check size={15} /> Sent
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="muted small">Nothing to send right now.</p>
      )}
      {data && data.sent.length > 0 && (
        <details>
          <summary className="small muted">Sent before ({data.sent.length})</summary>
          <ul className="rows">
            {data.sent.map((s, i) => (
              <li key={i} className="small">
                {s.partner} · {paise(s.amount_paise)} · {s.kind === 'active' ? 'active shop' : 'payment'} · {when(s.sent_at)}
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}

const EMPTY = { kind: 'agent' as 'agent' | 'business', name: '', business: '', phone: '', upi: '', city: '' };

function AddPartnerCard({ api, reload }: { api: AdminApi; reload: () => void }) {
  const [form, setForm] = useState(EMPTY);
  const [open, setOpen] = useState(false);
  const { busy, error, run } = useAction();
  const set = (key: keyof typeof form) => (e: { target: { value: string } }) => setForm({ ...form, [key]: e.target.value });
  const submit = (e: FormEvent) => {
    e.preventDefault();
    void run(async () => {
      await api('partners', 'POST', form);
      toast(`Added ${form.name}`);
      setForm(EMPTY);
      setOpen(false);
      reload();
    });
  };

  if (!open)
    return (
      <div>
        <button className="btn btn-soft" onClick={() => setOpen(true)}>
          <UserPlus size={16} /> Add a partner
        </button>
      </div>
    );
  return (
    <form className="card" onSubmit={submit} style={{ display: 'grid', gap: 12 }}>
      <h2 style={{ margin: 0 }}>Add a partner</h2>
      <div className="chips">
        {(
          [
            ['agent', 'Individual · ₹50 per active shop + %'],
            ['business', 'Business · % only'],
          ] as const
        ).map(([kind, label]) => (
          <button type="button" key={kind} className={`chip ${form.kind === kind ? 'active' : ''}`} onClick={() => setForm({ ...form, kind })}>
            {label}
          </button>
        ))}
      </div>
      <label>
        Name
        <input value={form.name} onChange={set('name')} required />
      </label>
      {form.kind === 'business' && (
        <label>
          Business
          <input value={form.business} onChange={set('business')} />
        </label>
      )}
      <label>
        WhatsApp number
        <input type="tel" value={form.phone} onChange={set('phone')} required />
      </label>
      <label>
        UPI ID
        <input value={form.upi} onChange={set('upi')} />
      </label>
      <label>
        City
        <input value={form.city} onChange={set('city')} />
      </label>
      <ErrorText text={error} />
      <div style={{ display: 'flex', gap: 8 }}>
        <button className="btn btn-primary" disabled={busy}>
          <Plus size={16} /> Add
        </button>
        <button type="button" className="btn btn-soft" onClick={() => setOpen(false)}>
          Cancel
        </button>
      </div>
    </form>
  );
}

function PartnerList({ api, data, reload }: { api: AdminApi; data: Data | null; reload: () => void }) {
  if (!data) return <SkeletonRows count={3} />;
  if (!data.partners.length) return <EmptyState icon={Handshake} title="No partners yet" text="Share the sign-up page, or add one above." />;
  return (
    <>
      {data.partners.map((p) => (
        <PartnerCard key={p.id} api={api} p={p} reload={reload} />
      ))}
    </>
  );
}

function PartnerCard({ api, p, reload }: { api: AdminApi; p: Partner; reload: () => void }) {
  const { busy, error, run } = useAction();
  const [upi, setUpi] = useState(p.upi);
  const [shopId, setShopId] = useState('');
  const page = `${location.origin}/partner/${p.token}`;
  const welcome = `Namaste ${p.name.split(' ')[0]}! Aap ab Regularhood partner hain 🎉\n\nShops ke liye aapka link: ${location.origin}/?p=${p.code}\n\nAapka partner page (apni shops aur commission yahan dekhein, ise save kar lein): ${page}`;

  const save = (body: object, done: string) =>
    run(async () => {
      await api(`partners/${p.id}`, 'POST', body);
      toast(done);
      reload();
    });
  const stop = () =>
    run(async () => {
      const stopping = !p.disabled_at;
      if (stopping && !(await confirmDialog({ title: `Stop ${p.name}?`, body: 'Their link stops counting and they earn nothing new. What was earned before stays.', confirm: 'Stop', danger: true }))) return;
      await api(`partners/${p.id}`, 'POST', { stopped: stopping });
      toast(stopping ? 'Stopped' : 'Restarted');
      reload();
    });
  const assign = (e: FormEvent) => {
    e.preventDefault();
    void run(async () => {
      await api(`partners/shops/${Number(shopId)}`, 'POST', { partnerId: p.id });
      toast(`Shop #${shopId} given to ${p.name}`);
      setShopId('');
      reload();
    });
  };

  return (
    <section className="card" style={p.disabled_at ? { opacity: 0.6 } : undefined}>
      <div className="card-head">
        <h2>
          {p.name}
          {p.business ? ` · ${p.business}` : ''}
        </h2>
        <span className="muted small">
          {p.code} · {p.kind === 'agent' ? 'individual' : 'business'}
          {p.city ? ` · ${p.city}` : ''} · joined {when(p.created_at)}
          {p.disabled_at ? ' · stopped' : ''}
        </span>
      </div>
      <p className="small" style={{ margin: 0 }}>
        {p.totals.shops} shops · {p.totals.active} active · {p.totals.paying} paying · sent {paise(p.totals.sent)} · due {paise(p.totals.due)} · on hold {paise(p.totals.hold)}
      </p>
      {p.shops.length > 0 && (
        <ul className="rows">
          {p.shops.map((s) => (
            <li key={s.id} className="small">
              <a href={`#/shops/${s.id}`}>{s.name}</a> · {s.customers} customers, {s.days} days{s.active ? ' · active' : ''}
              {s.plan === 'lifetime' || s.plan === 'yearly' ? ` · ${s.plan}` : ''}
            </li>
          ))}
        </ul>
      )}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <a className="btn btn-sm btn-whatsapp" href={whatsapp(p.phone, welcome)} target="_blank" rel="noreferrer">
          <MessageCircle size={15} /> Send their links
        </a>
        <button className="btn btn-sm btn-soft" onClick={() => copy(page, 'Partner page link copied')}>
          <Copy size={15} /> Their page
        </button>
        <button className="btn btn-sm btn-soft" disabled={busy} onClick={() => void stop()}>
          {p.disabled_at ? 'Restart' : 'Stop'}
        </button>
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <form onSubmit={(e) => (e.preventDefault(), void save({ upi }, 'UPI ID saved'))} style={{ display: 'flex', gap: 8 }}>
          <input value={upi} onChange={(e) => setUpi(e.target.value)} placeholder="UPI ID" aria-label="UPI ID" style={{ maxWidth: 200 }} />
          <button className="btn btn-sm btn-soft" disabled={busy || upi === p.upi}>
            Save UPI
          </button>
        </form>
        <form onSubmit={assign} style={{ display: 'flex', gap: 8 }}>
          <input value={shopId} onChange={(e) => setShopId(e.target.value.replace(/\D/g, ''))} placeholder="Shop #" aria-label="Shop number" inputMode="numeric" style={{ maxWidth: 110 }} required />
          <button className="btn btn-sm btn-soft" disabled={busy}>
            <Store size={15} /> Give shop
          </button>
        </form>
      </div>
      <ErrorText text={error} />
    </section>
  );
}
