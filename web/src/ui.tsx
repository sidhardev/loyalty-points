import { useEffect, useId, useState, type ReactNode } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Coins,
  Crown,
  Download,
  Gift,
  Info,
  Moon,
  MoreVertical,
  Share,
  SlidersHorizontal,
  Smartphone,
  Sparkles,

  Sun,
  Undo2,
  X,
  type LucideIcon,
} from 'lucide-react';
import { birthdayLabel, num, rupees, when, type Tier, type Transaction } from './api';
import { t, t as tr, withIcon } from './i18n';

// Shared building blocks: feedback (toasts, confirm dialogs), sheets, and small display pieces.

// ---------------------------------------------------------------- app-wide events

const DATA_CHANGED = 'lp-data-changed';
const OPEN_GIVE = 'lp-open-give';

/** Tell every page that points/customers changed (e.g. after giving points from the sheet). */
export const dataChanged = () => dispatchEvent(new Event(DATA_CHANGED));

/** A number that goes up whenever data changes; add it to a load effect's dependencies. */
export function useDataVersion() {
  const [version, setVersion] = useState(0);
  useEffect(() => {
    const bump = () => setVersion((v) => v + 1);
    addEventListener(DATA_CHANGED, bump);
    return () => removeEventListener(DATA_CHANGED, bump);
  }, []);
  return version;
}

/** Opens the "Give points" sheet, optionally for a known customer phone. */
export const openGivePoints = (phone?: string) => dispatchEvent(new CustomEvent(OPEN_GIVE, { detail: phone ?? '' }));

export function useGivePointsRequests(onOpen: (phone: string) => void) {
  useEffect(() => {
    const handler = (e: Event) => onOpen((e as CustomEvent<string>).detail);
    addEventListener(OPEN_GIVE, handler);
    return () => removeEventListener(OPEN_GIVE, handler);
  }, [onOpen]);
}

// ---------------------------------------------------------------- install as an app (PWA)

type InstallPrompt = Event & { prompt: () => Promise<void> };
let installPrompt: InstallPrompt | null = null;
const INSTALL_CHANGED = 'lp-install-changed';

// Chrome/Edge/Android offer installing once the page qualifies; keep the offer for our own button.
addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  installPrompt = e as InstallPrompt;
  dispatchEvent(new Event(INSTALL_CHANGED));
});
addEventListener('appinstalled', () => {
  installPrompt = null;
  dispatchEvent(new Event(INSTALL_CHANGED));
});

const standalone = () => matchMedia('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true;
const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const isAndroid = /android/i.test(navigator.userAgent);

/** `installed`: already running as the installed app. `install()`: the browser's own prompt when it offers one. */
export function useInstall() {
  const [canPrompt, setCanPrompt] = useState(Boolean(installPrompt));
  const [installed, setInstalled] = useState(standalone);
  useEffect(() => {
    const update = () => {
      setCanPrompt(Boolean(installPrompt));
      setInstalled(standalone());
    };
    const done = () => setInstalled(true);
    addEventListener(INSTALL_CHANGED, update);
    addEventListener('appinstalled', done);
    return () => {
      removeEventListener(INSTALL_CHANGED, update);
      removeEventListener('appinstalled', done);
    };
  }, []);
  const install = async () => {
    const prompt = installPrompt;
    if (!prompt) return false;
    await prompt.prompt();
    installPrompt = null;
    setCanPrompt(false);
    return true;
  };
  return { canPrompt, installed, install };
}

/** Steps for browsers that don't offer a one-tap install (iPhone, or before Chrome is ready to offer it). */
function InstallHelpSheet({ onClose }: { onClose: () => void }) {
  const icon = (Icon: LucideIcon) => <Icon size={15} className="inline-icon" />;
  const steps = isIos
    ? [withIcon(t('Tap the {icon} Share button in the browser bar.'), icon(Share)), t('Scroll down and tap Add to Home Screen.'), t('Tap Add.')]
    : isAndroid
      ? [withIcon(t('Tap the {icon} menu at the top right of the browser.'), icon(MoreVertical)), t('Tap Install app or Add to Home screen.'), t('Tap Install.')]
      : [withIcon(t('Click the {icon} install icon at the right end of the address bar.'), icon(Download)), t('Or open the browser menu and choose Install.')];
  return (
    <Sheet title={t('Install the app')} onClose={onClose}>
      <div style={{ display: 'grid', gap: 14 }}>
        <ol className="install-steps">
          {steps.map((step, i) => (
            <li key={i}>
              <span className="install-step-num">{i + 1}</span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
        <p className="muted small" style={{ margin: 0 }}>
          {t('It then opens from your home screen like any other app.')}
        </p>
        <button className="btn btn-primary btn-lg" onClick={onClose}>
          {t('Got it')}
        </button>
      </div>
    </Sheet>
  );
}

/** Installs straight away when the browser allows it, otherwise shows the steps. Hidden once installed. */
export function InstallButton({ className = 'btn btn-primary', children }: { className?: string; children?: ReactNode }) {
  const { installed, install } = useInstall();
  const [help, setHelp] = useState(false);
  if (installed) return null;
  const onClick = async () => {
    if (!(await install())) setHelp(true);
  };
  return (
    <>
      <button className={className} onClick={() => void onClick()}>
        {children ?? (
          <>
            <Download size={18} /> Install app
          </>
        )}
      </button>
      {help && <InstallHelpSheet onClose={() => setHelp(false)} />}
    </>
  );
}

/** Card asking people to install, until they install or close it. `id` keeps the "closed" choice per place. */
export function InstallBanner({ id, title, text }: { id: string; title: string; text: string }) {
  const { installed } = useInstall();
  const key = `lp_install_hidden_${id}`;
  const [hidden, setHidden] = useState(() => {
    try {
      return localStorage.getItem(key) === '1';
    } catch {
      return false;
    }
  });
  if (installed || hidden) return null;
  const hide = () => {
    setHidden(true);
    try {
      localStorage.setItem(key, '1');
    } catch {
      // Hidden for this visit only.
    }
  };
  return (
    <section className="install-banner">
      <span className="install-banner-icon" aria-hidden>
        <Smartphone size={22} />
      </span>
      <div>
        <strong>{title}</strong>
        <span>{text}</span>
      </div>
      <InstallButton className="btn btn-primary btn-sm">{t('Install')}</InstallButton>
      <button className="icon-btn" onClick={hide} aria-label={t('Not now')}>
        <X size={18} />
      </button>
    </section>
  );
}

// ---------------------------------------------------------------- confetti

const CONFETTI_COLORS = ['#10b981', '#f59e0b', '#3b82f6', '#ec4899', '#8b5cf6', '#facc15'];

/** A short burst of confetti over the page (skipped when the phone asks for less motion). */
export function confetti() {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const canvas = document.createElement('canvas');
  canvas.className = 'confetti';
  canvas.width = innerWidth * devicePixelRatio;
  canvas.height = innerHeight * devicePixelRatio;
  document.body.appendChild(canvas);
  const ctx = canvas.getContext('2d')!;
  ctx.scale(devicePixelRatio, devicePixelRatio);
  const pieces = Array.from({ length: 140 }, () => ({
    x: innerWidth / 2 + (Math.random() - 0.5) * innerWidth * 0.3,
    y: innerHeight * 0.35,
    vx: (Math.random() - 0.5) * 14,
    vy: -Math.random() * 14 - 4,
    size: 6 + Math.random() * 6,
    spin: Math.random() * Math.PI,
    color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
  }));
  const start = performance.now();
  const frame = (now: number) => {
    const elapsed = now - start;
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    ctx.globalAlpha = Math.max(0, 1 - elapsed / 2600);
    for (const p of pieces) {
      p.vy += 0.35;
      p.vx *= 0.99;
      p.x += p.vx;
      p.y += p.vy;
      p.spin += 0.15;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.spin);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
      ctx.restore();
    }
    if (elapsed < 2600) requestAnimationFrame(frame);
    else canvas.remove();
  };
  requestAnimationFrame(frame);
}

// ---------------------------------------------------------------- toasts

type Toast = { id: number; text: string; kind: 'ok' | 'error' | 'info' };
let toastListener: ((t: Toast) => void) | null = null;
let toastId = 0;

export const toast = (text: string, kind: Toast['kind'] = 'ok') => toastListener?.({ id: ++toastId, text, kind });

export function Toaster() {
  const [items, setItems] = useState<Toast[]>([]);
  useEffect(() => {
    toastListener = (t) => {
      setItems((list) => [...list.slice(-2), t]);
      setTimeout(() => setItems((list) => list.filter((x) => x.id !== t.id)), 3200);
    };
    return () => {
      toastListener = null;
    };
  }, []);
  const icons = { ok: CheckCircle2, error: AlertTriangle, info: Info };
  return (
    <div className="toasts" role="status" aria-live="polite">
      {items.map((t) => {
        const Icon = icons[t.kind];
        return (
          <div key={t.id} className={`toast ${t.kind}`}>
            <Icon size={18} /> {t.text}
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------- confirm dialog

type ConfirmOptions = { title: string; body?: ReactNode; confirm?: string; cancel?: string; danger?: boolean };
type Pending = ConfirmOptions & { resolve: (ok: boolean) => void };
let confirmListener: ((p: Pending) => void) | null = null;

/** A styled replacement for window.confirm. */
export const confirmDialog = (options: ConfirmOptions) =>
  new Promise<boolean>((resolve) => (confirmListener ? confirmListener({ ...options, resolve }) : resolve(window.confirm(options.title))));

export function ConfirmHost() {
  const [pending, setPending] = useState<Pending | null>(null);
  useEffect(() => {
    confirmListener = setPending;
    return () => {
      confirmListener = null;
    };
  }, []);
  if (!pending) return null;
  const close = (ok: boolean) => {
    pending.resolve(ok);
    setPending(null);
  };
  return (
    <div className="overlay" onClick={() => close(false)}>
      <div className="dialog" role="alertdialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <h2>{pending.title}</h2>
        {pending.body && <p>{pending.body}</p>}
        <div className="actions">
          <button className="btn btn-ghost" onClick={() => close(false)}>
            {pending.cancel ?? 'Cancel'}
          </button>
          <button className={`btn ${pending.danger ? 'btn-danger' : 'btn-primary'}`} onClick={() => close(true)} autoFocus>
            {pending.confirm ?? 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- sheet (bottom sheet on phones, dialog on desktop)

export function Sheet({ title, onClose, children, wide }: { title: ReactNode; onClose: () => void; children: ReactNode; wide?: boolean }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    addEventListener('keydown', onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
    };
  }, [onClose]);
  return (
    <div className="overlay" onClick={onClose}>
      <div className={`sheet${wide ? ' sheet-wide' : ''}`} role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <span className="sheet-grip" aria-hidden />
        <div className="sheet-head">
          <h2>{title}</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- theme

export function useTheme() {
  const [theme, setTheme] = useState(() => document.documentElement.dataset.theme || 'light');
  const toggle = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem('lp_theme', next);
    } catch {
      // The toggle still works for this visit without storage.
    }
    setTheme(next);
  };
  return { theme, toggle, Icon: theme === 'dark' ? Sun : Moon };
}

// ---------------------------------------------------------------- forms

/** Runs a form action, showing its error message if it fails. */
export function useAction() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    setError('');
    try {
      await action();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return { busy, error, setError, run };
}

export const ErrorText = ({ text }: { text: string }) =>
  text ? (
    <p className="alert alert-error" role="alert">
      <AlertTriangle size={16} /> {text}
    </p>
  ) : null;

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** Birthday as MM-DD (no year needed). */
export function BirthdayInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [m, d] = value ? value.split('-') : ['', ''];
  const set = (month: string, day: string) => onChange(month && day ? `${month}-${day}` : '');
  return (
    <span className="birthday">
      <select value={m} onChange={(e) => set(e.target.value, d || '01')} aria-label="Birthday month">
        <option value="">Month</option>
        {MONTH_NAMES.map((name, i) => (
          <option key={name} value={String(i + 1).padStart(2, '0')}>
            {name}
          </option>
        ))}
      </select>
      <select value={d} onChange={(e) => set(m || '01', e.target.value)} aria-label="Birthday day">
        <option value="">Day</option>
        {Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, '0')).map((day) => (
          <option key={day} value={day}>
            {Number(day)}
          </option>
        ))}
      </select>
      {value && (
        <button type="button" className="icon-btn" onClick={() => onChange('')} aria-label="Clear birthday">
          <X size={16} />
        </button>
      )}
    </span>
  );
}

/** 4-digit PIN field (numeric keypad on phones, hidden as it's typed). */
export function PinInput({ value, onChange, autoFocus }: { value: string; onChange: (v: string) => void; autoFocus?: boolean }) {
  return (
    <input
      className="pin"
      type="password"
      inputMode="numeric"
      autoComplete="one-time-code"
      pattern="[0-9]{4}"
      maxLength={4}
      placeholder="••••"
      value={value}
      onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, 4))}
      autoFocus={autoFocus}
      required
    />
  );
}

// ---------------------------------------------------------------- display

/** The Regularhood mark: a shopfront drawn from QR modules — striped awning, finder-square windows, and the member ★ on the door. */
export function LogoMark({ size = 34 }: { size?: number }) {
  // Its own gradient id: with a shared one, a logo inside a hidden part of the page (the sidebar on phones)
  // takes the gradient with it and every other logo loses its green.
  const gradient = `hbLogoG${useId().replace(/:/g, '')}`;
  return (
    <svg width={size} height={size} viewBox="0 0 96 96" aria-hidden focusable="false">
      <defs>
        <linearGradient id={gradient} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#0b7a52" />
          <stop offset="1" stopColor="#0a5e40" />
        </linearGradient>
      </defs>
      <rect width="96" height="96" rx="22" fill={`url(#${gradient})`} />
      <rect x="12" y="12" width="12" height="14" fill="#f0a202" />
      <rect x="24" y="12" width="12" height="14" fill="#eef2ec" />
      <rect x="36" y="12" width="12" height="14" fill="#f0a202" />
      <rect x="48" y="12" width="12" height="14" fill="#eef2ec" />
      <rect x="60" y="12" width="12" height="14" fill="#f0a202" />
      <rect x="72" y="12" width="12" height="14" fill="#eef2ec" />
      <circle cx="18" cy="26" r="6" fill="#f0a202" />
      <circle cx="30" cy="26" r="6" fill="#eef2ec" />
      <circle cx="42" cy="26" r="6" fill="#f0a202" />
      <circle cx="54" cy="26" r="6" fill="#eef2ec" />
      <circle cx="66" cy="26" r="6" fill="#f0a202" />
      <circle cx="78" cy="26" r="6" fill="#eef2ec" />
      <g fill="none" stroke="#eef2ec" strokeWidth="3.5">
        <rect x="15.75" y="39.75" width="14.5" height="14.5" rx="2" />
        <rect x="65.75" y="39.75" width="14.5" height="14.5" rx="2" />
      </g>
      <rect x="20" y="44" width="6" height="6" fill="#eef2ec" />
      <rect x="70" y="44" width="6" height="6" fill="#eef2ec" />
      <g fill="#eef2ec">
        <rect x="38" y="40" width="5" height="5" />
        <rect x="47" y="44" width="5" height="5" />
        <rect x="53" y="38" width="5" height="5" />
        <rect x="16" y="62" width="5" height="5" />
        <rect x="25" y="70" width="5" height="5" />
        <rect x="16" y="78" width="5" height="5" />
        <rect x="75" y="62" width="5" height="5" />
        <rect x="66" y="70" width="5" height="5" />
        <rect x="75" y="78" width="5" height="5" />
      </g>
      <path d="M38 84 V67 Q38 57 48 57 Q58 57 58 67 V84 Z" fill="#f0a202" />
      <polygon
        points="48,63.4 49.15,66.42 52.37,66.58 49.85,68.6 50.7,71.72 48,69.95 45.3,71.72 46.15,68.6 43.63,66.58 46.85,66.42"
        fill="#0a5e40"
      />
    </svg>
  );
}

export const Logo = () => (
  <span className="logo" aria-hidden>
    <LogoMark />
  </span>
);

const AVATAR_COLORS = ['#047857', '#2563eb', '#7c3aed', '#db2777', '#0e7490', '#b45309', '#4f46e5', '#be123c'];

export function Avatar({ name, size }: { name: string; size?: 'lg' }) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('');
  const hue = [...name].reduce((a, c) => a + c.charCodeAt(0), 0) % AVATAR_COLORS.length;
  return (
    <span className={`avatar ${size === 'lg' ? 'avatar-lg' : ''}`} style={{ background: AVATAR_COLORS[hue] }} aria-hidden>
      {initials || '?'}
    </span>
  );
}

export const TierBadge = ({ tier }: { tier: Tier }) =>
  tier.name === 'Gold' ? (
    <span className="badge tier-gold">
      <Crown size={12} /> Gold
    </span>
  ) : null;

export const Skeleton = ({ h = 16, w = '100%' }: { h?: number; w?: number | string }) => (
  <span className="skeleton" style={{ display: 'block', height: h, width: w }} />
);

export function SkeletonRows({ count = 4 }: { count?: number }) {
  return (
    <div className="rows">
      {Array.from({ length: count }, (_, i) => (
        <div className="row-item" key={i}>
          <Skeleton h={36} w={36} />
          <div className="row-main" style={{ gap: 6 }}>
            <Skeleton h={14} w="55%" />
            <Skeleton h={12} w="35%" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function EmptyState({ icon: Icon, title, text, action }: { icon: LucideIcon; title: string; text?: ReactNode; action?: ReactNode }) {
  return (
    <div className="empty">
      <span className="empty-icon">
        <Icon size={24} />
      </span>
      <h3>{title}</h3>
      {text && <p>{text}</p>}
      {action}
    </div>
  );
}

export function describe(tx: Transaction) {
  switch (tx.type) {
    case 'earn':
      return `${tr('Bill of {amount}', { amount: rupees(tx.amount ?? 0) })}${tx.note ? ` · ${tx.note}` : ''}`;
    case 'redeem':
      return tr('Redeemed {reward}', { reward: tx.note ?? '' });
    case 'bonus':
      return tr(tx.note ?? 'Bonus');
    default:
      return tx.note ? tr(tx.note) : tr('Adjustment');
  }
}

const TYPE_ICON: Record<Transaction['type'], LucideIcon> = { earn: Coins, redeem: Gift, bonus: Sparkles, adjust: SlidersHorizontal };

export function Activity({
  items,
  showCustomer = true,
  onUndo,
}: {
  items: Transaction[];
  showCustomer?: boolean;
  onUndo?: (t: Transaction) => void;
}) {
  return (
    <ul className="rows">
      {items.map((t) => {
        const Icon = TYPE_ICON[t.type];
        return (
          <li key={t.id} className={t.reversed ? 'is-reversed' : ''}>
            <div className="row-item">
              <span className={`activity-icon ${t.type}`}>
                <Icon size={17} />
              </span>
              <div className="row-main">
                <strong>
                  {showCustomer && t.customer_id ? (
                    <a href={`#/customers/${t.customer_id}`} style={{ color: 'inherit' }}>
                      {t.customer_name}
                    </a>
                  ) : (
                    describe(t)
                  )}
                </strong>
                <span>
                  {showCustomer ? `${describe(t)} · ` : ''}
                  {when(t.created_at)}
                  {t.reversed ? ` · ${tr('undone')}` : ''}
                </span>
              </div>
              <div className="row-end">
                <span className={`badge ${t.points >= 0 ? 'badge-plus' : 'badge-minus'}`}>
                  {t.points >= 0 ? '+' : '−'}
                  {num(Math.abs(t.points))}
                </span>
                {onUndo && !t.reversed && !t.reversal_of && (
                  <button className="link tiny" onClick={() => onUndo(t)}>
                    <Undo2 size={12} /> Undo
                  </button>
                )}
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export const birthdayText = (b: string | null) => (b ? birthdayLabel(b) : '');
