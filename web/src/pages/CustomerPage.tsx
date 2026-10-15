import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { ArrowLeft, Check, ExternalLink, Gift, History, MessageCircle, Pencil, Trash2, Undo2 } from 'lucide-react';
import { api, cardMessage, daysAgo, num, phoneLabel, walletUrl, when, whatsapp, type Customer, type Merchant } from '../api';
import '../counter.css';
import { t, useLang } from '../i18n';
import { EmptyState, ErrorText, Sheet, Skeleton, SkeletonRows, confirmDialog, dataChanged, toast, useAction, useDataVersion } from '../ui';
import { Stamps, messageLang } from './Counter';

type Entry = { id: number; kind: 'visit' | 'reward'; note: string | null; reversed: boolean; canUndo: boolean; createdAt: string };
type Detail = { customer: Customer; visits: number; rewards: number; history: Entry[] };

function PhoneSheet({ customer, onClose, onSaved }: { customer: Customer; onClose: () => void; onSaved: () => void }) {
  const [phone, setPhone] = useState(customer.phone);
  const { busy, error, run } = useAction();
  const save = (e: FormEvent) => {
    e.preventDefault();
    void run(async () => {
      await api(`customers/${customer.id}`, 'PATCH', { phone });
      toast(t('Number changed'));
      onSaved();
      onClose();
    });
  };
  return (
    <Sheet title={t('Change number')} onClose={onClose}>
      <form onSubmit={save} style={{ display: 'grid', gap: 14 }}>
        <label>
          {t('Phone number')}
          <input value={phone} inputMode="tel" onChange={(e) => setPhone(e.target.value)} required autoFocus />
        </label>
        <ErrorText text={error} />
        <button className="btn btn-primary btn-lg" disabled={busy}>
          {t('Save')}
        </button>
      </form>
    </Sheet>
  );
}

export function CustomerPage({ id, merchant }: { id: number; merchant: Merchant }) {
  useLang();
  const [data, setData] = useState<Detail | null>(null);
  const [editing, setEditing] = useState(false);
  const { busy, error, run } = useAction();
  const version = useDataVersion();

  const load = useCallback(() => {
    api<Detail>(`customers/${id}`).then(setData);
  }, [id]);
  useEffect(load, [load, version]);

  if (!data) {
    return (
      <>
        <Skeleton h={200} />
        <SkeletonRows />
      </>
    );
  }

  const { customer, history } = data;
  const n = merchant.visitsNeeded;
  const label = phoneLabel(customer.phone);

  const act = (action: () => Promise<void>) =>
    void run(async () => {
      await action();
      dataChanged();
    });

  const give = () =>
    act(async () => {
      await api(`customers/${customer.id}/reward`, 'POST');
      toast(t('{reward} given 🎉', { reward: merchant.rewardName }));
    });

  const undo = async (e: Entry) => {
    const title = e.kind === 'visit' ? t('Undo this visit?') : t('Undo this reward?');
    if (!(await confirmDialog({ title, body: t('{when} will be taken off their card.', { when: when(e.createdAt) }), confirm: t('Undo') }))) return;
    act(async () => {
      await api(`transactions/${e.id}/undo`, 'POST');
      toast(t('Undone'));
    });
  };

  const remove = async () => {
    if (!(await confirmDialog({ title: t('Delete {phone}?', { phone: label }), body: t('Their stamps and history will be deleted. This can’t be undone.'), confirm: t('Delete'), danger: true }))) return;
    void run(async () => {
      await api(`customers/${customer.id}`, 'DELETE');
      toast(t('Customer deleted'));
      dataChanged();
      location.hash = '/customers';
    });
  };

  return (
    <>
      <a href="#/customers" className="back">
        <ArrowLeft size={16} /> {t('Customers')}
      </a>

      <ErrorText text={error} />

      <div className="grid-2">
        <div className="stack">
          <section className="card" style={{ display: 'grid', gap: 16, justifyItems: 'start' }}>
            <div>
              <h1 className="tabular" style={{ margin: 0 }}>
                {label}
              </h1>
              {customer.name && <p className="muted" style={{ margin: 0 }}>{customer.name}</p>}
            </div>
            <Stamps stamps={customer.stamps} needed={n} size="lg" />
            {customer.rewardDue ? (
              <button className="btn btn-reward btn-lg" onClick={give} disabled={busy}>
                <Check size={20} strokeWidth={3} /> {t('Give {reward}', { reward: merchant.rewardName })}
              </button>
            ) : (
              <p style={{ margin: 0 }}>
                <b>{t('Visit {x} of {n}', { x: customer.stamps, n })}</b> · {t('{n} more for {reward}.', { n: n - customer.stamps, reward: merchant.rewardName })}
              </p>
            )}
            <div className="mini-stats" style={{ width: '100%' }}>
              <div>
                <span>{t('All visits')}</span>
                <strong>{num(data.visits)}</strong>
              </div>
              <div>
                <span>{t('Rewards')}</span>
                <strong>{num(data.rewards)}</strong>
              </div>
              <div>
                <span>{t('Last visit')}</span>
                <strong>{customer.lastVisit ? (daysAgo(customer.lastVisit) === 0 ? t('Today') : t('{n}d ago', { n: daysAgo(customer.lastVisit) })) : '—'}</strong>
              </div>
            </div>
            <div className="actions">
              <a className="btn btn-sm btn-whatsapp" href={whatsapp(customer.phone, cardMessage(merchant, customer, messageLang()))} target="_blank" rel="noreferrer">
                <MessageCircle size={15} /> {t('Send card')}
              </a>
              <a className="btn btn-sm btn-soft" href={walletUrl(customer.walletToken)} target="_blank" rel="noreferrer">
                <ExternalLink size={15} /> {t('See their card')}
              </a>
              <button className="btn btn-sm btn-soft" onClick={() => setEditing(true)}>
                <Pencil size={15} /> {t('Change number')}
              </button>
              <button className="btn btn-sm btn-ghost danger" onClick={remove}>
                <Trash2 size={15} /> {t('Delete')}
              </button>
            </div>
          </section>
        </div>

        <section className="card">
          <div className="card-head">
            <h2>
              <History size={18} /> {t('History')}
            </h2>
          </div>
          {history.length ? (
            <ul className="rows">
              {history.map((e) => (
                <li key={e.id} className={e.reversed ? 'is-reversed' : ''}>
                  <div className="row-item">
                    <span className={`activity-icon ${e.kind === 'visit' ? 'earn' : 'redeem'}`}>{e.kind === 'visit' ? <Check size={17} /> : <Gift size={17} />}</span>
                    <div className="row-main">
                      <strong>{e.kind === 'visit' ? t('Visit') : t('Got {reward}', { reward: e.note ?? merchant.rewardName })}</strong>
                      <span>
                        {when(e.createdAt)}
                        {e.reversed ? ` · ${t('undone')}` : ''}
                      </span>
                    </div>
                    {e.canUndo && (
                      <div className="row-end">
                        <button className="link tiny" onClick={() => void undo(e)} disabled={busy}>
                          <Undo2 size={12} /> {t('Undo')}
                        </button>
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState icon={History} title={t('No visits yet.')} />
          )}
        </section>
      </div>

      {editing && <PhoneSheet customer={customer} onClose={() => setEditing(false)} onSaved={load} />}
    </>
  );
}
