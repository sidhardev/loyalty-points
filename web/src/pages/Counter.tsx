import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { Check, Delete, Gift, MessageCircle, Undo2 } from 'lucide-react';
import { api, cardMessage, num, phoneLabel, whatsapp, type Customer, type Merchant, type VisitResult } from '../api';
import '../counter.css';
import { t, useLang } from '../i18n';
import { ErrorText, confetti, toast, useAction } from '../ui';

// The shop's home screen and its one job: type the customer's phone number, tap "Add visit".
// The screen then says what to do: nothing (back to the keypad by itself), or "Give the reward now".

/** Seconds a plain visit stays on screen before the keypad comes back. */
const BACK_AFTER = 8;

export const messageLang = (): 'hi' | 'en' => {
  try {
    return localStorage.getItem('lp_msg_lang') === 'en' ? 'en' : 'hi';
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
  const { busy, error, run } = useAction();
  const save = (e: FormEvent) => {
    e.preventDefault();
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
        onChange={(e) => setReward(e.target.value)}
        placeholder={t('Free chai')}
        maxLength={60}
        required
        aria-label="Reward"
      />
      <Stamps stamps={needed - 1} needed={needed} />
      <ErrorText text={error} />
      <button className="btn btn-primary btn-lg" disabled={busy || !reward.trim()}>
        {busy ? t('Saving…') : compact ? t('Save') : t('Start')}
      </button>
    </form>
  );
}

type Shown = { result: VisitResult; given?: boolean };

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

  const loadToday = useCallback(() => void api<{ visits: number; rewards: number }>(`today?tz=${tz}`).then(setToday).catch(() => {}), [tz]);
  useEffect(loadToday, [loadToday]);

  // Known numbers that start with what's typed.
  useEffect(() => {
    if (digits.length < 4 || digits.length >= 10) return setSuggestions([]);
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
    if (phone.length !== 10 || busy) return;
    void run(async () => {
      const result = await api<VisitResult>('visits', 'POST', { phone, tz });
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
      else setDigits((d) => (d.length < 10 ? d + key : d));
    },
    [setError],
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
    const send = (
      <a
        className="btn btn-whatsapp btn-lg"
        href={whatsapp(c.phone, cardMessage(merchant, c, messageLang(), given))}
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
            <p className="result-phone">{phoneLabel(c.phone)}</p>
            <h1>{t('Give {reward} now', { reward: merchant.rewardName })}</h1>
            <p>
              {result.already ? t('Visit already counted today.') : t('This is visit {n}.', { n })} {t('Their card is full.')}
            </p>
            <Stamps stamps={c.stamps} needed={n} size="lg" />
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
          <p className="result-phone">{phoneLabel(c.phone)}</p>
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
                {t('{n} more for {reward}.', { n: n - c.stamps, reward: merchant.rewardName })}
              </p>
            </>
          )}
          <Stamps stamps={c.stamps} needed={n} size="lg" />
          <ErrorText text={error} />
          {send}
          <button className="btn btn-primary btn-xl" onClick={reset}>
            {t('Next customer')} {!hold && <span className="countdown">{left}</span>}
          </button>
          {result.visitId && !given && (
            <button className="link" onClick={() => undo(result.visitId!)} disabled={busy}>
              <Undo2 size={14} /> {t('Wrong number? Undo')}
            </button>
          )}
        </section>
      </div>
    );
  }

  const ready = digits.length === 10;
  return (
    <div className="counter">
      <p className="counter-rule">
        {t('Every {n} visits →', { n: merchant.visitsNeeded })} <b>{merchant.rewardName}</b>
      </p>
      <div className={`phone-display ${digits ? '' : 'empty'}`} aria-live="polite">
        {digits ? phoneLabel(digits.padEnd(10, '·')).replace(/·/g, '_') : t('Customer’s phone number')}
      </div>
      <div className="suggestions">
        {suggestions.map((c) => (
          <button key={c.id} className="suggestion" onClick={() => submit(c.phone.replace(/\D/g, '').slice(-10))} disabled={busy}>
            <strong>{phoneLabel(c.phone)}</strong>
            <span>
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
    </div>
  );
}
