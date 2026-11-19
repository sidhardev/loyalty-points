import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { Check, Delete, Gift, MessageCircle, Star, Undo2 } from 'lucide-react';
import { api, cardMessage, num, phoneLabel, reviewMessage, whatsapp, type Customer, type Merchant, type MsgLang, type VisitResult } from '../api';
import { country, groupDigits } from '../country';
import { LimitAfterVisit, LimitStrip, refreshBilling } from '../billing';
import { ReportLine } from '../report';
import '../counter.css';
import { t, useLang } from '../i18n';
import { ErrorText, confetti, toast, useAction } from '../ui';

// The shop's home screen and its one job: type the customer's phone number, tap "Add visit".
// The screen then says what to do: nothing (back to the keypad by itself), or "Give the reward now".

/** Seconds a plain visit stays on screen before the keypad comes back. */
const BACK_AFTER = 8;

export const messageLang = (): MsgLang => {
  try {
    const saved = localStorage.getItem('lp_msg_lang');
    return saved === 'en' || saved === 'ml' ? saved : 'hi';
  } catch {
    return 'hi';
  }
};

/** A row of stamps: filled for each visit, the last one is the reward. */
export function Stamps({ stamps, needed, size = 'md' }: { stamps: number; needed: number; size?: 'md' | 'lg' }) {
  return (
    <div className={`stamps stamps-${size}`} role="img" aria-label={`${Math.min(stamps, needed)} of ${needed} visits`}>
      {Array.from({ length: needed }, (_, i) => (
        <span key={i} className={`stamp ${i < stamps ? 'on' : ''} ${i === needed - 1 ? 'last' : ''}`}>
          {i === needed - 1 ? <Gift size={size === 'lg' ? 20 : 15} /> : i < stamps ? <Check size={size === 'lg' ? 20 : 15} strokeWidth={3} /> : null}
        </span>
      ))}
    </div>
  );
}

/** First run: the shop's whole program in one sentence. */
export function CardSetup({ merchant, onSaved, compact }: { merchant: Merchant; onSaved: (m: Merchant) => void; compact?: boolean }) {
  useLang();
  const [needed, setNeeded] = useState(merchant.visitsNeeded || 5);
  const [reward, setReward] = useState(merchant.rewardName);
  const { busy, error, setError, run } = useAction();
  const save = (e: FormEvent) => {
    e.preventDefault();
    // Say what's missing instead of a button that silently does nothing.
    if (!reward.trim()) return setError(t('Write the reward first, for example: Free coffee'));
    void run(async () => {
      onSaved(await api<Merchant>('me', 'PATCH', { visitsNeeded: needed, rewardName: reward }));
      toast(t('Saved'));
    });
  };
  return (
    <form className={compact ? 'setup setup-compact' : 'setup card'} onSubmit={save}>
      {!compact && (
        <>
          <h1>{t('Your loyalty card')}</h1>
          <p className="muted">{t('One rule for every customer. You can change it later in Settings.')}</p>
        </>
      )}
      <div className="setup-line">
        <span>{t('Every')}</span>
        <div className="seg seg-big" role="group" aria-label="Visits">
          {[3, 4, 5, 6, 8, 10].map((n) => (
            <button type="button" key={n} className={needed === n ? 'active' : ''} onClick={() => setNeeded(n)}>
              {n}
            </button>
          ))}
        </div>
        <span>{t('visits, the customer gets')}</span>
      </div>
      <input
        className="setup-reward"
        value={reward}
        onChange={(e) => {
          setReward(e.target.value);
          setError('');
        }}
        placeholder={t('e.g. Free coffee')}
        maxLength={60}
        aria-label="Reward"
      />
      <Stamps stamps={needed - 1} needed={needed} />
      <ErrorText text={error} />
      <button className="btn btn-primary btn-lg" disabled={busy}>
        {busy ? t('Saving…') : compact ? t('Save') : t('Start')}
      </button>
    </form>
  );
}

// `given`: the reward was just handed over.
type Shown = { result: VisitResult; given?: boolean };

/** Optional: the customer's name, asked right after a visit while it's still unknown. Skipping it is fine. */
function NameField({ customer, onSaved, onFocus }: { customer: Customer; onSaved: (c: Customer) => void; onFocus: () => void }) {
  const [name, setName] = useState('');
  const { busy, error, run } = useAction();
  const save = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    void run(async () => {
      onSaved(await api<Customer>(`customers/${customer.id}`, 'PATCH', { name }));
      toast(t('Name saved'));
    });
  };
  return (
    <form className="name-field" onSubmit={save}>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        onFocus={onFocus}
        placeholder={t('Customer’s name (optional)')}
        aria-label={t('Customer’s name (optional)')}
        maxLength={60}
        autoComplete="off"
      />
      <button className="btn btn-soft" disabled={busy || !name.trim()}>
        {t('Save')}
      </button>
      <ErrorText text={error} />
    </form>
  );
}

export function Counter({ merchant, onSaved }: { merchant: Merchant; onSaved: (m: Merchant) => void }) {
  useLang(); // re-render in the chosen language
  const [digits, setDigits] = useState('');
  const [suggestions, setSuggestions] = useState<Customer[]>([]);
  const [shown, setShown] = useState<Shown | null>(null);
  const [today, setToday] = useState<{ visits: number; rewards: number } | null>(null);
  const [left, setLeft] = useState(BACK_AFTER);
  const [hold, setHold] = useState(false); // stop the countdown once they start doing something with the result
  const { busy, error, setError, run } = useAction();
  const tz = -new Date().getTimezoneOffset();
  // How long a number is in the shop's country (10 in India, 9 in the UAE). A leading 0, as UAE and UK numbers are
  // often typed, is allowed and isn't part of the number.
  const place = country(merchant.country);
  const local = (d: string) => d.replace(/^0/, '');
  const isFull = (d: string) => local(d).length === place.nsn;

  const loadToday = useCallback(() => void api<{ visits: number; rewards: number }>(`today?tz=${tz}`).then(setToday).catch(() => {}), [tz]);
  useEffect(loadToday, [loadToday]);

  // Known numbers that start with what's typed.
  useEffect(() => {
    if (local(digits).length < 4 || isFull(digits)) return setSuggestions([]);
    const timer = setTimeout(() => void api<Customer[]>(`customers/suggest?digits=${digits}`).then(setSuggestions).catch(() => {}), 150);
    return () => clearTimeout(timer);
  }, [digits]);

  const reset = useCallback(() => {
    setShown(null);
    setDigits('');
    setError('');
    setHold(false);
    loadToday();
  }, [loadToday, setError]);

  const submit = (phone = digits) => {
    if (!isFull(phone) || busy) return;
    void run(async () => {
      const result = await api<VisitResult>('visits', 'POST', { phone, tz }).catch((err: Error & { code?: string }) => {
        if (err.code === 'customer_limit') void refreshBilling().catch(() => {}); // the strip above shows the plan is full
        throw err;
      });
      if (result.isNew) void refreshBilling().catch(() => {}); // one more place used on the Free plan
      setShown({ result });
      setLeft(BACK_AFTER);
      setHold(false);
      navigator.vibrate?.(result.customer.rewardDue ? [60, 60, 120] : 40); // a buzz on phones that can
      if (result.customer.rewardDue) confetti();
    });
  };

  const type = useCallback(
    (key: string) => {
      setError('');
      if (key === 'back') setDigits((d) => d.slice(0, -1));
      else if (key === 'clear') setDigits('');
      else setDigits((d) => (isFull(d) ? d : d + key));
    },
    [setError, place.nsn],
  );

  // A computer keyboard works too.
  const submitRef = useRef(submit);
  submitRef.current = submit;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.metaKey || e.ctrlKey || e.altKey) return;
      if (shown) {
        if (e.key === 'Enter' || e.key === 'Escape') {
          if (!shown.result.customer.rewardDue || shown.given) reset();
        }
        return;
      }
      if (/^\d$/.test(e.key)) type(e.key);
      else if (e.key === 'Backspace') type('back');
      else if (e.key === 'Escape') type('clear');
      else if (e.key === 'Enter') submitRef.current();
      else return;
      e.preventDefault();
    };
    addEventListener('keydown', onKey);
    return () => removeEventListener('keydown', onKey);
  }, [shown, type, reset]);

  // A plain visit goes back to the keypad by itself; a reward waits for "Given".
  const waits = !!shown && shown.result.customer.rewardDue && !shown.given;
  useEffect(() => {
    if (!shown || waits || hold) return;
    if (left <= 0) return reset();
    const timer = setTimeout(() => setLeft((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [shown, waits, hold, left, reset]);

  if (!merchant.rewardName) return <CardSetup merchant={merchant} onSaved={onSaved} />;

  const giveReward = (c: Customer) =>
    void run(async () => {
      const r = await api<{ rewardId: number; customer: Customer }>(`customers/${c.id}/reward`, 'POST');
      setShown((s) => s && { result: { ...s.result, customer: r.customer }, given: true });
      setLeft(BACK_AFTER);
    });

  const named = (customer: Customer) => setShown((s) => s && { ...s, result: { ...s.result, customer } });
  const nameField = (c: Customer) => !c.name && <NameField key={c.id} customer={c} onSaved={named} onFocus={() => setHold(true)} />;

  const undo = (visitId: number) =>
    void run(async () => {
      await api(`transactions/${visitId}/undo`, 'POST');
      toast(t('Visit removed'));
      const phone = shown?.result.customer.phone ?? '';
      setShown(null);
      setDigits(/^\d{10}$/.test(phone) ? phone : '');
      loadToday();
    });

  if (shown) {
    const { result, given } = shown;
    const c = result.customer;
    const n = merchant.visitsNeeded;
    // Every message opens WhatsApp on the shop's phone. After a reward, a Pro shop with a review link asks for a review.
    const send = given && merchant.pro && merchant.review ? (
      <a className="btn btn-whatsapp btn-lg" href={whatsapp(c.phone, reviewMessage(merchant, messageLang()), merchant.country)} target="_blank" rel="noreferrer" onClick={() => setHold(true)}>
        <Star size={20} /> {t('Ask for a Google review')}
      </a>
    ) : (
      <a
        className="btn btn-whatsapp btn-lg"
        href={whatsapp(c.phone, cardMessage(merchant, c, messageLang(), given), merchant.country)}
        target="_blank"
        rel="noreferrer"
        onClick={() => setHold(true)}
      >
        <MessageCircle size={20} /> {t('Send card on WhatsApp')}
      </a>
    );

    if (c.rewardDue && !given) {
      return (
        <div className="counter">
          <section className="result result-reward">
            <span className="result-icon">
              <Gift size={44} />
            </span>
            <p className="result-phone">{phoneLabel(c.phone, merchant.country)}{c.name ? ` · ${c.name}` : ''}</p>
            <h1>{t('Give {reward} now', { reward: merchant.rewardName })}</h1>
            <p>
              {result.already ? t('Visit already counted today.') : t('This is visit {n}.', { n })} {t('Their card is full.')}
            </p>
            <Stamps stamps={c.stamps} needed={n} size="lg" />
            {nameField(c)}
            <ErrorText text={error} />
            <button className="btn btn-reward btn-xl" onClick={() => giveReward(c)} disabled={busy}>
              <Check size={24} strokeWidth={3} /> {t('Given')}
            </button>
            <button className="link" onClick={reset}>
              {t('Not now — give it next time')}
            </button>
            {result.visitId && (
              <button className="link" onClick={() => undo(result.visitId!)} disabled={busy}>
                <Undo2 size={14} /> {t('Wrong number? Undo')}
              </button>
            )}
          </section>
        </div>
      );
    }

    return (
      <div className="counter">
        <section className={`result ${result.already && !given ? 'result-already' : ''}`}>
          <span className="result-icon">{given ? <Gift size={44} /> : <Check size={48} strokeWidth={3} />}</span>
          <p className="result-phone">{phoneLabel(c.phone, merchant.country)}{c.name ? ` · ${c.name}` : ''}</p>
          {given ? (
            <>
              <h1>{t('Reward given 🎉')}</h1>
              <p>{t('Their card starts again.')}</p>
            </>
          ) : result.already ? (
            <>
              <h1>{t('Already counted today')}</h1>
              <p>
                {t('One visit a day.')} {t('{n} more for {reward}.', { n: Math.max(0, n - c.stamps), reward: merchant.rewardName })}
              </p>
            </>
          ) : (
            <>
              <h1>{t('Visit {x} of {n}', { x: num(c.stamps), n: num(n) })}</h1>
              <p>
                {result.isNew ? `${t('New customer!')} ` : ''}
                {result.welcome ? `${t('+{n} welcome stamp.', { n: result.welcome })} ` : ''}
                {t('{n} more for {reward}.', { n: n - c.stamps, reward: merchant.rewardName })}
              </p>
            </>
          )}
          <Stamps stamps={c.stamps} needed={n} size="lg" />
          {result.isNew && !given && <LimitAfterVisit />}
          {nameField(c)}
          <ErrorText text={error} />
          {send}
          <button className="btn btn-primary btn-xl" onClick={reset}>
            {t('Next customer')}
          </button>
          {!hold && <p className="countdown-note">{t('Back to the keypad in {n}s', { n: left })}</p>}
          {result.visitId && !given && (
            <button className="link" onClick={() => undo(result.visitId!)} disabled={busy}>
              <Undo2 size={14} /> {t('Wrong number? Undo')}
            </button>
          )}
        </section>
      </div>
    );
  }

  const ready = isFull(digits);
  return (
    <div className="counter">
      <p className="counter-rule">
        {t('Every {n} visits →', { n: merchant.visitsNeeded })} <b>{merchant.rewardName}</b>
      </p>
      <LimitStrip near />
      <div className={`phone-display ${digits ? '' : 'empty'}`} aria-live="polite">
        {digits ? `${digits.startsWith('0') ? '0' : ''}${groupDigits(local(digits).padEnd(place.nsn, '_'), place)}` : t('Customer’s phone number')}
      </div>
      <div className="suggestions">
        {suggestions.map((c) => (
          <button key={c.id} className="suggestion" onClick={() => submit(c.phone.replace(/\D/g, '').slice(-place.nsn))} disabled={busy}>
            <strong>{phoneLabel(c.phone, merchant.country)}</strong>
            <span>
              {c.name ? `${c.name} · ` : ''}
              {c.rewardDue ? t('🎁 reward due') : `${Math.min(c.stamps, merchant.visitsNeeded)}/${merchant.visitsNeeded}`}
            </span>
          </button>
        ))}
      </div>
      <ErrorText text={error} />
      <div className="keypad">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((k) => (
          <button key={k} onClick={() => type(k)}>
            {k}
          </button>
        ))}
        <button className="key-soft" onClick={() => type('clear')} aria-label="Clear">
          {t('Clear')}
        </button>
        <button onClick={() => type('0')}>0</button>
        <button className="key-soft" onClick={() => type('back')} aria-label="Delete">
          <Delete size={26} />
        </button>
      </div>
      <button className="btn btn-primary btn-xl add-visit" onClick={() => submit()} disabled={!ready || busy}>
        <Check size={24} strokeWidth={3} /> {busy ? t('Adding…') : t('Add visit')}
      </button>
      <p className="counter-today">
        {t('Today')}: <b>{today ? num(today.visits) : '—'}</b> {today?.visits === 1 ? t('visit') : t('visits')}
        {today && today.rewards > 0 ? (
          <>
            {' '}
            · <b>{num(today.rewards)}</b> {today.rewards === 1 ? t('reward given') : t('rewards given')}
          </>
        ) : null}
      </p>
      <ReportLine merchant={merchant} />
    </div>
  );
}
