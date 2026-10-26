import { useEffect, useState, type FormEvent } from 'react';
import { AlertTriangle, BellRing, CheckCheck, Crown, Gift, MessageCircle, Star, UserX } from 'lucide-react';
import { api, num, phoneLabel, when, type AutoKind, type AutoStatus, type Merchant } from '../api';
import { t, useLang } from '../i18n';
import { ErrorText, toast, useAction } from '../ui';

// Settings → Automatic WhatsApp (Founding Shop): which messages Regularhood sends the shop's customers by itself, in
// which language, this month's allowance, the Google review link, and the last messages sent. Other shops see what
// they would get, with a way to the Plan page.

const KINDS: { kind: AutoKind; icon: typeof Gift; title: string; text: string }[] = [
  { kind: 'card', icon: MessageCircle, title: 'Card after every visit', text: 'Their stamps and a link to their card, once a day.' },
  { kind: 'reward', icon: Gift, title: 'Reward ready', text: 'On the visit that fills the card.' },
  { kind: 'missyou', icon: UserX, title: 'We miss you', text: 'Once, when a customer stops coming for your “not seen” days.' },
  { kind: 'review', icon: Star, title: 'Google review request', text: 'After a reward is given. Needs your review link below.' },
];

const KIND_LABEL: Record<AutoKind, string> = { card: 'Card', reward: 'Reward ready', missyou: 'We miss you', review: 'Review request' };

function Switch({ on, onChange, label, disabled }: { on: boolean; onChange: (on: boolean) => void; label: string; disabled?: boolean }) {
  return <button type="button" role="switch" aria-checked={on} aria-label={label} className={`switch ${on ? 'on' : ''}`} disabled={disabled} onClick={() => onChange(!on)} />;
}

export function AutoWhatsApp({ merchant, onMerchant }: { merchant: Merchant; onMerchant: (m: Merchant) => void }) {
  useLang();
  const [s, setS] = useState<AutoStatus | null>(null);
  const [link, setLink] = useState('');
  const { busy, error, run } = useAction();
  useEffect(() => {
    void api<AutoStatus>('auto-messages').then((r) => {
      setS(r);
      setLink(r.settings.reviewUrl);
    });
  }, []);

  if (!s) return null;

  const save = (patch: Partial<AutoStatus['settings']>, done?: string) =>
    void run(async () => {
      const r = await api<AutoStatus>('auto-messages', 'PATCH', patch);
      setS(r);
      setLink(r.settings.reviewUrl);
      if (patch.reviewUrl !== undefined) onMerchant({ ...merchant, review: Boolean(r.settings.reviewUrl) });
      if (done) toast(done);
    });
  const saveLink = (e: FormEvent) => {
    e.preventDefault();
    save({ reviewUrl: link }, link.trim() ? t('Review link saved') : t('Review link removed'));
  };

  if (!s.founding) {
    return (
      <section className="card auto-card auto-locked">
        <div className="card-head">
          <h2>
            <BellRing size={18} /> {t('Automatic WhatsApp')}
          </h2>
          <span className="badge badge-gold">
            <Crown size={13} /> {t('Founding Shop')}
          </span>
        </div>
        <p className="muted small" style={{ margin: 0 }}>
          {t('We message your customers for you, from Regularhood’s WhatsApp number. You don’t tap anything.')}
        </p>
        <ul className="auto-list">
          {KINDS.map(({ kind, icon: Icon, title, text }) => (
            <li key={kind}>
              <span className="auto-icon">
                <Icon size={17} />
              </span>
              <span>
                <strong>{t(title)}</strong>
                <span className="muted small">{t(text)}</span>
              </span>
            </li>
          ))}
        </ul>
        <a className="btn btn-primary" href="#/plan">
          <Crown size={17} /> {t('Become a Founding Shop')}
        </a>
      </section>
    );
  }

  const pct = Math.min(100, (s.used / s.quota) * 100);
  return (
    <section className="card auto-card">
      <div className="card-head">
        <h2>
          <BellRing size={18} /> {t('Automatic WhatsApp')}
        </h2>
        <div className="seg seg-sm" role="group" aria-label={t('Message language')}>
          {(['hi', 'en'] as const).map((l) => (
            <button key={l} type="button" className={s.settings.lang === l ? 'active' : ''} disabled={busy} onClick={() => save({ lang: l })}>
              {l === 'hi' ? 'हिंदी' : 'English'}
            </button>
          ))}
        </div>
      </div>
      {!s.live && <p className="alert alert-ok small">{t('Your settings are saved. Messages start as soon as Regularhood’s WhatsApp number is approved by Meta — we’ll tell you.')}</p>}

      <ul className="auto-list">
        {KINDS.map(({ kind, icon: Icon, title, text }) => (
          <li key={kind}>
            <span className="auto-icon">
              <Icon size={17} />
            </span>
            <span>
              <strong>{t(title)}</strong>
              <span className="muted small">{t(text)}</span>
            </span>
            <Switch on={s.settings[kind]} label={t(title)} disabled={busy} onChange={(on) => save({ [kind]: on })} />
          </li>
        ))}
      </ul>

      <form className="auto-review" onSubmit={saveLink}>
        <label>
          <span>
            <Star size={15} /> {t('Your Google review link')}
          </span>
          <input value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://g.page/r/…/review" inputMode="url" />
        </label>
        <button className="btn btn-soft" disabled={busy || link.trim() === s.settings.reviewUrl}>
          {t('Save')}
        </button>
      </form>
      <p className="muted small" style={{ margin: 0 }}>
        {t('Find it in Google Maps → your shop → “Ask for reviews” (or Google Business Profile → Get more reviews).')}
      </p>
      <ErrorText text={error} />

      <div className="auto-usage">
        <div>
          <strong>{t('{n} of {quota} messages this month', { n: num(s.used), quota: num(s.quota) })}</strong>
          <span className="muted small">{t('Starts again on the 1st. When it runs out, the counter shows the manual WhatsApp button again.')}</span>
        </div>
        <div className="plan-meter" aria-hidden>
          <span style={{ width: `${pct}%` }} className={pct >= 100 ? 'full' : ''} />
        </div>
      </div>

      {s.recent.length > 0 && (
        <ul className="rows auto-recent">
          {s.recent.slice(0, 6).map((r, i) => (
            <li key={i}>
              <div className="row-item">
                <span className={`activity-icon ${r.status === 'failed' ? 'warn' : 'earn'}`}>{r.status === 'failed' ? <AlertTriangle size={16} /> : <CheckCheck size={16} />}</span>
                <div className="row-main">
                  <strong>
                    {t(KIND_LABEL[r.kind])} · {r.name || (r.phone ? phoneLabel(r.phone) : '')}
                  </strong>
                  <span>
                    {when(r.created_at)} · {t(r.status === 'failed' ? 'not sent' : r.status === 'read' ? 'read' : r.status === 'delivered' ? 'delivered' : 'sent')}
                  </span>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
