import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from 'react';
import {
  AlertTriangle,
  BellRing,
  Check,
  CheckCheck,
  Crown,
  ExternalLink,
  Gift,
  MessageCircle,
  Phone,
  RefreshCw,
  Send,
  Settings2,
  Star,
  UserX,
  Webhook,
  XCircle,
} from 'lucide-react';
import { num, when } from '../api';
import { ErrorText, Sheet, Skeleton, confirmDialog, toast, useAction } from '../ui';
import type { AdminApi } from './AdminSeo';
import { WhatsAppSettings, useWhatsApp } from './AdminWhatsApp';

// Admin → Customer WhatsApp: the messages Regularhood's number sends Founding Shops' customers by itself
// (server/src/automessages.ts). The page is the setup, in order — number, webhook, templates, a test message, go live —
// each step saying whether it's done and what to do, then this month's numbers, each shop's use and the latest messages.

type Kind = 'card' | 'reward' | 'missyou' | 'review';
type Lang = 'hi' | 'en';
type TemplateInfo = { name: string; category: string; body: Record<Lang, string>; button: Record<Lang, string>; example: string[] };
type Overview = {
  steps: { number: boolean; webhook: boolean; tested: string | null; live: boolean };
  phoneNumberId: string;
  wabaId: string;
  appSecret: boolean;
  lastWebhook: string | null;
  quota: number;
  utilityPriceUsd: number;
  marketingPriceUsd: number;
  usdToInr: number;
  month: { sent: number; delivered: number; read: number; failed: number; usd: number };
  shops: { id: number; name: string; plan: string; kinds_on: number; has_review: number; sent: number; failed: number; last_at: string | null }[];
  recent: { id: number; kind: Kind; phone: string; status: string; error: string | null; created_at: string; merchant_id: number | null; shop: string | null }[];
  templates: Record<Kind, TemplateInfo>;
};
type TemplateStatus = { kind: Kind; lang: Lang; name: string; status: string; category: string };
type PhoneInfo = { display_phone_number?: string; verified_name?: string; quality_rating?: string; messaging_limit_tier?: string; name_status?: string };

const KINDS: { kind: Kind; title: string; when: string; icon: typeof Gift }[] = [
  { kind: 'card', title: 'Card after a visit', when: 'After each visit, at most once a day', icon: MessageCircle },
  { kind: 'reward', title: 'Reward ready', when: 'On the visit that fills the card', icon: Gift },
  { kind: 'missyou', title: 'We miss you', when: 'Once, when a customer stops coming (11:00–19:00)', icon: UserX },
  { kind: 'review', title: 'Google review request', when: 'After the shop gives a reward', icon: Star },
];
const KIND_NAME: Record<Kind, string> = { card: 'Card', reward: 'Reward ready', missyou: 'We miss you', review: 'Review request' };

const fill = (text: string, values: string[]) => values.reduce((t, v, i) => t.replaceAll(`{{${i + 1}}}`, v), text);
const prettyPhone = (p: string) => (p.startsWith('91') && p.length === 12 ? `+91 ${p.slice(2, 7)} ${p.slice(7)}` : `+${p}`);
/** Meta's test numbers are US numbers starting +1 555, named "Test Number". */
const isTestNumber = (p: PhoneInfo | null) => Boolean(p && (/test/i.test(p.verified_name ?? '') || /^\+?1\s?555/.test(p.display_phone_number ?? '')));

function StatusChip({ status }: { status: string }) {
  const tone = status === 'APPROVED' ? 'ok' : status === 'REJECTED' || status === 'PAUSED' || status === 'DISABLED' ? 'bad' : status === 'missing' ? 'none' : 'wait';
  const words = status === 'missing' ? 'not sent' : status.toLowerCase().replace('_', ' ');
  const label = words.charAt(0).toUpperCase() + words.slice(1);
  return <span className={`cw-chip cw-chip-${tone}`}>{label}</span>;
}

/** One setup step: a number (or a tick once done), a title, and what to do. */
function Step({ n, done, warn, title, children }: { n: number; done: boolean; warn?: boolean; title: string; children: ReactNode }) {
  return (
    <li className={`cw-step ${done ? 'done' : ''} ${warn ? 'warn' : ''}`}>
      <span className="cw-step-mark">{done ? <Check size={16} strokeWidth={3} /> : warn ? <AlertTriangle size={15} /> : n}</span>
      <div className="cw-step-body">
        <h3>{title}</h3>
        {children}
      </div>
    </li>
  );
}

export function CustomerWhatsAppPage({ api }: { api: AdminApi }) {
  const [data, setData] = useState<Overview | null>(null);
  const [templates, setTemplates] = useState<TemplateStatus[] | null>(null);
  const [phone, setPhone] = useState<PhoneInfo | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [preview, setPreview] = useState<Lang>('hi');
  const [test, setTest] = useState<{ phone: string; kind: Kind; lang: Lang }>({ phone: '', kind: 'card', lang: 'hi' });
  const [quota, setQuota] = useState('');
  const wa = useWhatsApp(api);
  const { busy, error, setError, run } = useAction();
  const tplAction = useAction();
  const setTplError = tplAction.setError;

  const load = useCallback(
    () =>
      void api<Overview>('whatsapp/customers').then((d) => {
        setData(d);
        setQuota(String(d.quota));
      }, (e: Error) => setError(e.message)),
    [api, setError],
  );
  const loadTemplates = () => void tplAction.run(async () => setTemplates(await api<TemplateStatus[]>('whatsapp/customer-templates')));
  useEffect(load, [load]);
  // Ask Meta about the number and the templates once the number is connected.
  const connected = !!data?.steps.number;
  useEffect(() => {
    if (!connected) return;
    void api<PhoneInfo>('whatsapp/phone').then(setPhone, () => setPhone(null));
    void api<TemplateStatus[]>('whatsapp/customer-templates').then(setTemplates, (e: Error) => setTplError(e.message));
  }, [connected, api, setTplError]);

  if (!data) {
    return (
      <>
        <ErrorText text={error} />
        <Skeleton h={40} w="40%" />
        <Skeleton h={420} />
      </>
    );
  }

  const inr = (usd: number) => `₹${(usd * data.usdToInr).toFixed(usd * data.usdToInr < 10 ? 2 : 0)}`;
  const approved = templates?.filter((t) => t.status === 'APPROVED').length ?? 0;
  const allApproved = templates !== null && approved === templates.length;
  const missing = templates?.filter((t) => t.status === 'missing').length ?? 0;
  const rejected = templates?.filter((t) => t.status === 'REJECTED') ?? [];
  const testNumber = isTestNumber(phone);
  const status = (kind: Kind, lang: Lang) => templates?.find((t) => t.kind === kind && t.lang === lang)?.status ?? '…';
  // Worst case for one shop that uses its whole allowance, all billed as marketing.
  const maxPerShop = inr(data.quota * data.marketingPriceUsd);

  const sendForReview = () =>
    void tplAction.run(async () => {
      const r = await api<{ created: string[]; templates: TemplateStatus[] }>('whatsapp/customer-templates', 'POST');
      setTemplates(r.templates);
      toast(r.created.length ? `Sent ${r.created.length} templates to Meta. Review takes minutes to a day.` : 'Meta already has all of them');
    });
  const sendTest = (e: FormEvent) => {
    e.preventDefault();
    void run(async () => {
      setData({ ...(await api<Overview>('whatsapp/customer-test', 'POST', test)), usdToInr: data.usdToInr });
      toast('Test sent. Check WhatsApp on that phone.');
    });
  };
  const saveQuota = () =>
    void run(async () => {
      await api('whatsapp/settings', 'PUT', { customerQuota: Number(quota) });
      toast('Saved');
      load();
    });
  const setLive = async (on: boolean) => {
    if (on && !allApproved) {
      const ok = await confirmDialog({
        title: 'Go live before every template is approved?',
        body: 'Messages whose template isn’t approved yet will fail and show as “not sent”. The counter still says it sent them.',
        confirm: 'Go live anyway',
        danger: true,
      });
      if (!ok) return;
    }
    if (on && testNumber) {
      const ok = await confirmDialog({
        title: 'This is Meta’s test number',
        body: 'A test number can only message the few phone numbers added in Meta, so real customers won’t get anything. Connect your own number first.',
        confirm: 'Go live anyway',
        danger: true,
      });
      if (!ok) return;
    }
    void run(async () => {
      await api('whatsapp/settings', 'PUT', { customerMessages: on });
      toast(on ? 'Live: Founding Shops’ customers now get messages' : 'Stopped: no more automatic messages');
      load();
    });
  };
  const openSettings = () => setSettingsOpen(true);
  const settingsButton = (label = 'Open WhatsApp settings') => (
    <button className="btn btn-soft btn-sm" onClick={openSettings} disabled={!wa.wa}>
      <Settings2 size={15} /> {label}
    </button>
  );

  return (
    <>
      <header className="page-head">
        <div>
          <h1>
            Customer WhatsApp <span className={`cw-live ${data.steps.live ? 'on' : ''}`}>{data.steps.live ? 'Live' : 'Off'}</span>
          </h1>
          <p>Messages Regularhood’s number sends Founding Shops’ customers by itself. Set it up once, top to bottom.</p>
        </div>
      </header>
      <ErrorText text={error} />

      <div className="cw-layout">
        <section className="card cw-setup">
          <div className="card-head">
            <h2>
              <Settings2 size={18} /> Setup
            </h2>
            <span className="muted small">
              {[data.steps.number, data.steps.webhook, allApproved, !!data.steps.tested, data.steps.live].filter(Boolean).length} of 5 done
            </span>
          </div>
          <ol className="cw-steps">
            <Step n={1} done={data.steps.number && !testNumber} warn={data.steps.number && testNumber} title="Connect your WhatsApp Business number">
              {data.steps.number ? (
                <>
                  <p className="cw-fact">
                    <Phone size={15} />
                    {phone ? (
                      <>
                        <strong>{phone.verified_name}</strong> {phone.display_phone_number} · quality <strong>{phone.quality_rating ?? '–'}</strong> · daily limit{' '}
                        {phone.messaging_limit_tier ?? '–'}
                      </>
                    ) : (
                      <>Number ID {data.phoneNumberId} · checking with Meta…</>
                    )}
                  </p>
                  {testNumber && (
                    <p className="alert alert-error small">
                      This is Meta’s test number: it can only message the few numbers you added in Meta. Add your own number in Meta (WhatsApp → API setup → Add
                      phone number), then put its Phone number ID in the settings.
                    </p>
                  )}
                </>
              ) : (
                <p className="muted small">
                  In Meta for Developers: your app → WhatsApp → API setup. Copy the Phone number ID and the WhatsApp Business Account ID, and make a permanent
                  token (Business settings → System users).
                </p>
              )}
              <div className="actions">{settingsButton(data.steps.number ? 'Change number or token' : 'Add number and token')}</div>
            </Step>

            <Step n={2} done={data.steps.webhook} title="Receive deliveries and STOP replies">
              <p className="muted small">
                The webhook tells us when a message was delivered or read and when a customer replies STOP, so they’re never messaged again. It needs the app
                secret and the callback URL in Meta.
              </p>
              <p className="cw-fact">
                <Webhook size={15} />
                App secret {data.appSecret ? 'saved' : 'missing'} · {data.lastWebhook ? `last message from Meta ${when(data.lastWebhook)}` : 'nothing received from Meta yet'}
              </p>
              <div className="actions">{settingsButton('Webhook settings')}</div>
            </Step>

            <Step n={3} done={allApproved} warn={rejected.length > 0} title="Get the 8 message templates approved">
              <p className="muted small">
                WhatsApp only lets a business start a chat with an approved template. There are 4 messages, each in Hindi and English. Meta reviews them in
                minutes to a day.
              </p>
              <div className="actions">
                <button className="btn btn-primary btn-sm" disabled={tplAction.busy || !data.steps.number || missing === 0} onClick={sendForReview}>
                  <Send size={15} /> {templates === null ? 'Send to Meta for review' : missing ? `Send ${missing} to Meta for review` : 'All sent to Meta'}
                </button>
                <button className="btn btn-soft btn-sm" disabled={tplAction.busy || !data.steps.number} onClick={loadTemplates}>
                  <RefreshCw size={15} /> Check status
                </button>
                {templates && <span className="muted small">{approved} of {templates.length} approved</span>}
              </div>
              <ErrorText text={tplAction.error} />
              {rejected.length > 0 && (
                <p className="alert alert-error small">
                  Rejected: {rejected.map((t) => `${t.name} (${t.lang})`).join(', ')}. See why in Meta (WhatsApp Manager → Message templates), delete it there, then
                  send it again here.
                </p>
              )}
            </Step>

            <Step n={4} done={!!data.steps.tested} title="Send yourself a test">
              <p className="muted small">Sends one template with sample values (Sharma Sweets) to any WhatsApp number, so you see what customers get.</p>
              <form className="cw-test" onSubmit={sendTest}>
                <input value={test.phone} onChange={(e) => setTest({ ...test, phone: e.target.value })} placeholder="Your WhatsApp number" inputMode="tel" aria-label="Phone number" required />
                <select value={test.kind} onChange={(e) => setTest({ ...test, kind: e.target.value as Kind })} aria-label="Message">
                  {KINDS.map((k) => (
                    <option key={k.kind} value={k.kind}>
                      {k.title}
                    </option>
                  ))}
                </select>
                <div className="seg seg-sm" role="group" aria-label="Language">
                  {(['hi', 'en'] as const).map((l) => (
                    <button key={l} type="button" className={test.lang === l ? 'active' : ''} onClick={() => setTest({ ...test, lang: l })}>
                      {l === 'hi' ? 'हिंदी' : 'English'}
                    </button>
                  ))}
                </div>
                <button className="btn btn-primary btn-sm" disabled={busy || !data.steps.number}>
                  <Send size={15} /> Send test
                </button>
              </form>
              {templates && status(test.kind, test.lang) !== 'APPROVED' && (
                <p className="muted small">That template isn’t approved yet ({status(test.kind, test.lang).toLowerCase()}), so Meta will refuse it.</p>
              )}
              {data.steps.tested && <p className="cw-fact ok">Last test sent {when(data.steps.tested)}</p>}
            </Step>

            <Step n={5} done={data.steps.live} title="Go live">
              <div className="cw-quota">
                <label>
                  Messages per Founding Shop a month
                  <input type="number" min="0" value={quota} onChange={(e) => setQuota(e.target.value)} />
                </label>
                <button className="btn btn-soft btn-sm" disabled={busy || quota === String(data.quota)} onClick={saveQuota}>
                  Save
                </button>
              </div>
              <p className="muted small">At most {maxPerShop} a month per shop if every message is billed as marketing; most are utility messages, which cost far less.</p>
              <div className="cw-live-row">
                <div>
                  <strong>{data.steps.live ? 'Customers are getting messages' : 'Automatic messages are off'}</strong>
                  <span className="muted small">
                    {data.steps.live ? 'Turning off stops new messages at once. Shops’ settings are kept.' : 'Until then the counter shows the manual WhatsApp button.'}
                  </span>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={data.steps.live}
                  aria-label="Send automatic messages"
                  className={`switch ${data.steps.live ? 'on' : ''}`}
                  disabled={busy || !data.steps.number}
                  onClick={() => void setLive(!data.steps.live)}
                />
              </div>
            </Step>
          </ol>
        </section>

        <section className="card cw-templates">
          <div className="card-head">
            <h2>
              <MessageCircle size={18} /> What customers get
            </h2>
            <div className="seg seg-sm" role="group" aria-label="Preview language">
              {(['hi', 'en'] as const).map((l) => (
                <button key={l} className={preview === l ? 'active' : ''} onClick={() => setPreview(l)}>
                  {l === 'hi' ? 'हिंदी' : 'English'}
                </button>
              ))}
            </div>
          </div>
          {KINDS.map(({ kind, title, when: sentWhen, icon: Icon }) => {
            const t = data.templates[kind];
            return (
              <div key={kind} className="cw-template">
                <div className="cw-template-head">
                  <span className="auto-icon">
                    <Icon size={16} />
                  </span>
                  <div>
                    <strong>{title}</strong>
                    <span className="muted small">
                      {sentWhen} · {t.category.toLowerCase()}
                    </span>
                  </div>
                  <span className="cw-chips">
                    <span className="muted small">hi</span> <StatusChip status={status(kind, 'hi')} /> <span className="muted small">en</span>{' '}
                    <StatusChip status={status(kind, 'en')} />
                  </span>
                </div>
                <div className="cw-bubble" lang={preview}>
                  <p>{fill(t.body[preview], t.example)}</p>
                  <span className="cw-bubble-btn">
                    <ExternalLink size={14} /> {t.button[preview]}
                  </span>
                </div>
              </div>
            );
          })}
        </section>
      </div>

      <section className="stats cw-stats">
        <div className="stat">
          <span className="stat-label">
            <Send size={16} /> Sent this month
          </span>
          <strong>{num(data.month.sent)}</strong>
          <em>{num(data.month.failed)} not sent</em>
        </div>
        <div className="stat">
          <span className="stat-label">
            <CheckCheck size={16} /> Delivered
          </span>
          <strong>{num(data.month.delivered)}</strong>
          <em>{num(data.month.read)} read</em>
        </div>
        <div className="stat">
          <span className="stat-label">
            <Crown size={16} /> Founding Shops
          </span>
          <strong>{num(data.shops.length)}</strong>
          <em>{num(data.shops.filter((s) => s.sent > 0).length)} sent messages this month</em>
        </div>
        <div className="stat">
          <span className="stat-label">
            <BellRing size={16} /> Cost this month
          </span>
          <strong>{inr(data.month.usd)}</strong>
          <em>as Meta billed it</em>
        </div>
      </section>

      <div className="grid-2">
        <section className="card">
          <div className="card-head">
            <h2>
              <Crown size={18} /> Founding Shops
            </h2>
            <span className="muted small">allowance {num(data.quota)} a month each</span>
          </div>
          {data.shops.length ? (
            <div className="table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Shop</th>
                    <th className="num">Sent</th>
                    <th className="num">Failed</th>
                    <th>Set up</th>
                    <th>Last</th>
                  </tr>
                </thead>
                <tbody>
                  {data.shops.map((s) => (
                    <tr key={s.id} onClick={() => (location.hash = `/shops/${s.id}`)}>
                      <td>
                        <a href={`#/shops/${s.id}`}>
                          <strong>{s.name}</strong>
                        </a>
                      </td>
                      <td className="num">
                        {num(s.sent)}
                        {s.sent >= data.quota && <span className="cw-chip cw-chip-bad"> used up</span>}
                      </td>
                      <td className="num">{num(s.failed)}</td>
                      <td className="small">
                        {s.kinds_on}/4 on{s.has_review ? '' : ' · no review link'}
                      </td>
                      <td className="small">{s.last_at ? when(s.last_at) : '–'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="muted small">No Founding Shops yet.</p>
          )}
        </section>

        <section className="card">
          <div className="card-head">
            <h2>
              <MessageCircle size={18} /> Latest messages
            </h2>
            <button className="btn btn-ghost btn-sm" onClick={load}>
              <RefreshCw size={14} /> Refresh
            </button>
          </div>
          {data.recent.length ? (
            <ul className="rows">
              {data.recent.map((m) => (
                <li key={m.id}>
                  <div className="row-item">
                    <span className={`activity-icon ${m.status === 'failed' ? 'warn' : 'earn'}`}>{m.status === 'failed' ? <XCircle size={16} /> : <CheckCheck size={16} />}</span>
                    <div className="row-main">
                      <strong>
                        {KIND_NAME[m.kind]} · {m.shop ?? 'Test'}
                      </strong>
                      <span>
                        {prettyPhone(m.phone)} · {when(m.created_at)} · {m.status}
                        {m.error ? ` · ${m.error}` : ''}
                      </span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted small">Nothing sent yet.</p>
          )}
        </section>
      </div>

      {settingsOpen && wa.wa && (
        <Sheet title="WhatsApp settings" wide onClose={() => (setSettingsOpen(false), load())}>
          <WhatsAppSettings
            api={api}
            wa={wa.wa}
            inr={(usd) => `₹${(usd * wa.wa!.usdToInr).toFixed(2)}`}
            onChanged={() => {
              wa.reload();
              load();
            }}
          />
        </Sheet>
      )}
    </>
  );
}
