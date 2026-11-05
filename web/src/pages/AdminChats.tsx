import { Fragment, useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { ArrowLeft, Bot, ContactRound, FileText, MessageSquarePlus, MessagesSquare, Paperclip, RefreshCw, Search, Send, Sparkles, Trash2, UserPlus, X } from 'lucide-react';
import { when } from '../api';
import { Avatar, EmptyState, ErrorText, Sheet, SkeletonRows, toast, useAction } from '../ui';
import type { AdminApi } from './AdminSeo';
import { WaBubble, WhatsAppBar, fileSize, useWhatsApp, type WaMessage } from './AdminWhatsApp';

// Admin → WhatsApp chats: every conversation on the WhatsApp API number (server/src/whatsapp.ts), leads or not, with the
// replies not opened yet. Opening a chat marks its replies as seen. Free replies are allowed for 24 hours after their
// last message; outside that, a lead can only be sent the intro template again. Refreshes by itself while open.
// People who aren't leads show under their WhatsApp profile name and can be saved as a lead from the chat.
// Photos, videos, voice notes and documents show in the chat (kept in Supabase), and can be sent with the paperclip
// or pasted into the reply box; the reply then goes as the file's caption.
// A lead's chat shows how far the reply bot (server/src/wabot.ts) got, and the bot can be paused to answer by hand.

type Chat = {
  phone: string;
  last_at: string;
  messages: number;
  unread: number;
  last_in: string | null;
  last_body: string;
  last_direction: 'in' | 'out';
  last_status: string;
  lead_id: number | null;
  name: string | null;
  profile_name: string | null;
  saved_name: string | null; // a contact saved here (New chat, or a shop's WhatsApp button)
  saved_note: string | null;
  category: string | null;
  shop_type: string | null;
  area: string | null;
  lead_status: string | null;
  notes: string | null;
  opted_out: number;
  window_open: number | null;
  bot_step: string | null;
  bot_paused: number | null;
  link: string;
};
type Data = { chats: Chat[]; unread: number; ready: boolean; missing: string[]; storage: { ready: boolean; lastError: { at: string; message: string } | null } };

/** Fired with the unread count whenever the chats are loaded, so the menu badge updates straight away. */
export const WA_UNREAD = 'wa-unread';

const LEAD_STATUS: Record<string, string> = { new: 'New', contacted: 'Contacted', interested: 'Interested', joined: 'Joined', not_interested: 'Not interested' };
const TITLE = 'Superadmin · Regularhood';
/** How far the reply bot got: the last thing it sent. */
const BOT_STEP: Record<string, string> = {
  howto: 'Saw how it works',
  video: 'Saw the video',
  price: 'Saw the price',
  faq: 'Asking questions',
  signup: 'Got the sign-up link',
  human: 'Wants to talk to you',
  later: 'Said later',
};
const pretty = (phone: string) => (phone.startsWith('91') && phone.length === 12 ? `+91 ${phone.slice(2, 7)} ${phone.slice(7)}` : `+${phone}`);
const display = (c: Chat) => c.saved_name ?? c.name ?? c.profile_name ?? pretty(c.phone);

/** An approved template as Meta lists it (server/src/whatsapp.ts templates()). */
type Template = {
  name: string;
  language: string;
  status: string;
  category: string;
  body: string;
  params: number;
  header: { format: string; text: string; params: number } | null;
  buttons: string[];
  urlButton: { index: number; url: string } | null;
};
const fillIn = (text: string, values: string[]) => values.reduce((t, v, i) => t.replaceAll(`{{${i + 1}}}`, v || `{{${i + 1}}}`), text);
/** The chat to open from the address: #/chats/919876543210 (a shop's WhatsApp button links here). */
const fromHash = () => location.hash.match(/^#\/chats\/(\d{8,15})/)?.[1] ?? '';
const preview = (body: string) => (/^\[\w+\]$/.test(body) ? body.replace(/^\[(\w+)\]$/, (_, k: string) => ({ image: '📷 Photo', audio: '🎤 Voice message', video: '🎬 Video', document: '📄 Document' })[k] ?? `[${k}]`) : body);
const utc = (t: string) => new Date(`${t.replace(' ', 'T')}Z`);
const MAX_FILE = 50 * 1024 * 1024; // Supabase's free plan keeps files up to 50 MB

/** Ready-made replies, in the Hinglish shop owners text in. "{link}" becomes their sign-up link. */
const QUICK = [
  { label: 'Sign-up link', text: 'Yahan se 2 minute mein free shuru kar sakte hain: {link}' },
  { label: 'Free hai', text: 'Regularhood shuru karna bilkul free hai. Customers ko koi app nahi chahiye: bas unka phone number likhiye aur "Add visit" dabaiye. Har 5 visit par unhe ek cheez free milti hai.' },
  { label: 'Demo', text: 'Hum aapko 2 minute ka demo dikha sakte hain. Kab call karein?' },
  { label: 'Call time', text: 'Aapse baat karne ka sahi time kya rahega?' },
  { label: 'Thanks', text: 'Dhanyavaad! Koi bhi sawaal ho to yahin message karein 🙏' },
];

/** "Today", "Yesterday" or the date, for the separators between days in a chat. */
function dayLabel(d: Date) {
  const day = (x: Date) => x.toLocaleDateString('en-CA'); // yyyy-mm-dd in local time
  const today = new Date();
  const yesterday = new Date(Date.now() - 86_400_000);
  if (day(d) === day(today)) return 'Today';
  if (day(d) === day(yesterday)) return 'Yesterday';
  return d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: d.getFullYear() === today.getFullYear() ? undefined : 'numeric' });
}

export function ChatsPage({ api }: { api: AdminApi }) {
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(fromHash);
  const [filter, setFilter] = useState<'' | 'unread' | 'leads' | 'contacts'>('');
  const [q, setQ] = useState('');
  const [adding, setAdding] = useState(false);
  useEffect(() => {
    const onHash = () => fromHash() && setOpen(fromHash());
    addEventListener('hashchange', onHash);
    return () => removeEventListener('hashchange', onHash);
  }, []);
  // Picking another chat drops the deep link, so a reload doesn't jump back to it.
  useEffect(() => {
    if (fromHash() && fromHash() !== open) history.replaceState(null, '', '#/chats');
  }, [open]);
  const { wa, reload: reloadWa } = useWhatsApp(api);
  const load = useCallback(
    () =>
      void api<Data>('whatsapp/chats').then(
        (d) => {
          setData(d);
          dispatchEvent(new CustomEvent(WA_UNREAD, { detail: d.unread })); // the menu badge
        },
        (e) => setError((e as Error).message),
      ),
    [api],
  );
  useEffect(() => {
    load();
    const timer = setInterval(load, 15_000);
    return () => clearInterval(timer);
  }, [load]);
  // New replies show in the browser tab too, so they're noticed from another tab.
  const unread = data?.unread ?? 0;
  useEffect(() => {
    document.title = unread ? `(${unread}) Chats · Regularhood` : TITLE;
    return () => void (document.title = TITLE);
  }, [unread]);

  if (error) return <ErrorText text={error} />;
  if (!data) return <SkeletonRows count={6} />;

  const needle = q.trim().toLowerCase();
  const list = data.chats.filter(
    (c) =>
      (filter !== 'unread' || c.unread > 0) &&
      (filter !== 'leads' || c.lead_id) &&
      (filter !== 'contacts' || c.saved_name) &&
      (!needle || `${display(c)} ${c.phone} ${c.area ?? ''} ${c.saved_note ?? ''} ${c.last_body}`.toLowerCase().includes(needle)),
  );
  const current = data.chats.find((c) => c.phone === open);

  return (
    <>
      <header className="page-head">
        <div>
          <h1>WhatsApp chats</h1>
          <p>
            Every conversation on the WhatsApp API number, newest first{unread ? `: ${unread} new ${unread === 1 ? 'reply' : 'replies'}` : ''}. You can write back
            freely for 24 hours after someone’s last message. New numbers start with an approved template.
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setAdding(true)}>
          <MessageSquarePlus size={17} /> New chat
        </button>
      </header>
      {adding && (
        <ContactSheet
          api={api}
          onClose={() => setAdding(false)}
          onSaved={(phone) => {
            load();
            setOpen(phone);
          }}
        />
      )}

      {wa && <WhatsAppBar api={api} wa={wa} onChanged={() => (reloadWa(), load())} />}
      {data && !data.storage.ready && (
        <p className="alert alert-error small">
          <span>
            Photos and files aren’t being kept: this server has no <code>SUPABASE_URL</code> / <code>SUPABASE_SECRET_KEY</code>. Add them to deploy/.env and run{' '}
            <code>docker compose up -d</code> in deploy/.
          </span>
        </p>
      )}
      {data?.storage.ready && data.storage.lastError && (
        <p className="alert alert-error small">
          <span>
            Keeping a photo or file in Supabase failed ({when(data.storage.lastError.at.replace('T', ' ').slice(0, 19))}): {data.storage.lastError.message}
          </span>
        </p>
      )}

      <section className={`card chats${open ? ' chat-open' : ''}`}>
        <aside className="chats-list">
          <div className="chats-tools">
            <div className="chats-search">
              <Search size={15} />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, number or message" aria-label="Search chats" />
            </div>
            <div className="seg">
              {(
                [
                  ['', 'All'],
                  ['unread', `Unread${unread ? ` (${unread})` : ''}`],
                  ['leads', 'Leads'],
                  ['contacts', 'Contacts'],
                ] as const
              ).map(([f, label]) => (
                <button key={f} className={filter === f ? 'active' : ''} onClick={() => setFilter(f)}>
                  {label}
                </button>
              ))}
            </div>
          </div>
          {list.length ? (
            <ul>
              {list.map((c) => (
                <li key={c.phone}>
                  <button className={`chat-row${c.phone === open ? ' active' : ''}${c.unread ? ' unread' : ''}`} onClick={() => setOpen(c.phone)}>
                    <Avatar name={display(c).replace(/^\+/, '')} />
                    <span className="chat-row-text">
                      <span className="chat-row-top">
                        <strong>{display(c)}</strong>
                        <time>{when(c.last_at)}</time>
                      </span>
                      <span className="chat-row-bottom">
                        <span className="chat-preview">
                          {c.messages === 0 ? (
                            <em>New contact · send a template</em>
                          ) : (
                            <>
                              {c.last_direction === 'out' ? (c.last_status === 'read' ? '✓✓ ' : c.last_status === 'failed' ? '⚠ ' : '✓ ') : ''}
                              {preview(c.last_body)}
                            </>
                          )}
                        </span>
                        {c.unread > 0 ? <span className="chat-unread">{c.unread}</span> : c.lead_id ? <span className="chat-tag">lead</span> : null}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              icon={MessagesSquare}
              title={data.chats.length ? 'No chats match' : 'No chats yet'}
              text={data.chats.length ? 'Try another filter.' : 'Start one with New chat, or send intros from Leads; replies show up here.'}
            />
          )}
        </aside>
        <div className="chat-pane">
          {current ? (
            <Conversation
              key={current.phone}
              api={api}
              chat={current}
              onBack={() => {
                setOpen('');
                if (fromHash()) history.replaceState(null, '', '#/chats');
              }}
              onChanged={load}
            />
          ) : (
            <div className="chat-empty muted">
              <MessagesSquare size={32} />
              <p>Pick a chat</p>
            </div>
          )}
        </div>
      </section>
    </>
  );
}

function Conversation({ api, chat, onBack, onChanged }: { api: AdminApi; chat: Chat; onBack: () => void; onChanged: () => void }) {
  const [messages, setMessages] = useState<WaMessage[] | null>(null);
  const [text, setText] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [picking, setPicking] = useState(false);
  const { busy, error, run } = useAction();
  const end = useRef<HTMLDivElement>(null);
  const box = useRef<HTMLTextAreaElement>(null);
  const picker = useRef<HTMLInputElement>(null);
  const count = useRef(0);
  const preview = useMemo(() => (file?.type.startsWith('image/') ? URL.createObjectURL(file) : null), [file]);
  useEffect(() => () => void (preview && URL.revokeObjectURL(preview)), [preview]);
  const attach = (f: File | null | undefined) => {
    if (!f) return;
    if (f.size > MAX_FILE) return void toast(`${f.name} is ${fileSize(f.size)}: files up to 50 MB can be sent`, 'error');
    setFile(f);
    box.current?.focus();
  };

  const load = useCallback(
    () =>
      void api<WaMessage[]>(`whatsapp/chats/${chat.phone}`).then((m) => {
        setMessages(m);
        if (m.length !== count.current) {
          count.current = m.length;
          onChanged(); // their replies are now seen: update the unread counts
        }
      }),
    [api, chat.phone, onChanged],
  );
  useEffect(() => {
    load();
    const timer = setInterval(load, 8_000);
    return () => clearInterval(timer);
  }, [load]);
  useEffect(() => {
    end.current?.scrollIntoView({ block: 'end' }); // newer browsers return a promise here: not an effect cleanup
  }, [messages?.length]);
  // The reply box grows with what's typed, up to its max height.
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight + 2}px`;
  }, [text]);

  const lastIn = [...(messages ?? [])].reverse().find((m) => m.direction === 'in')?.created_at ?? chat.last_in;
  const windowEnds = lastIn ? utc(lastIn).getTime() + 24 * 3_600_000 : 0;
  const left = windowEnds - Date.now();
  const windowOpen = left > 0;
  const send = (path: string, body: unknown, done: string) =>
    void run(async () => {
      const r = await api<WaMessage[]>(path, 'POST', body);
      setMessages(r);
      count.current = r.length;
      toast(done);
      onChanged();
    });
  const setBot = (paused: boolean) =>
    void run(async () => {
      await api(`whatsapp/chats/${chat.phone}/bot`, 'PUT', { paused });
      toast(paused ? 'Bot paused: you answer this chat' : 'Bot answers button taps again');
      onChanged();
    });
  const setStatus = (status: string) =>
    void run(async () => {
      await api(`leads/${chat.lead_id}`, 'PUT', { status });
      toast(`Marked ${LEAD_STATUS[status] ?? status}`);
      onChanged();
    });
  const quick = (t: string) => {
    const line = t.replace('{link}', chat.link);
    setText((cur) => (cur.trim() ? `${cur.trimEnd()}\n${line}` : line));
    box.current?.focus();
  };

  return (
    <>
      <header className="chat-head">
        <button className="icon-btn chat-back" onClick={onBack} aria-label="Back to chats">
          <ArrowLeft size={19} />
        </button>
        <Avatar name={display(chat).replace(/^\+/, '')} />
        <div>
          <strong>{display(chat)}</strong>
          <span className="muted small">
            {[
              display(chat) !== pretty(chat.phone) ? pretty(chat.phone) : '',
              chat.lead_id && chat.profile_name && chat.profile_name !== chat.name ? `on WhatsApp: ${chat.profile_name}` : '',
              chat.category || chat.shop_type,
              chat.area,
            ]
              .filter(Boolean)
              .join(' · ') || 'Not a lead yet'}
          </span>
        </div>
        <button className="icon-btn" onClick={() => setEditing(true)} aria-label={chat.saved_name ? 'Edit contact' : 'Save contact'} title={chat.saved_name ? 'Edit contact' : 'Save contact'}>
          <ContactRound size={17} />
        </button>
        {chat.lead_id ? (
          <select className={`lead-status s-${chat.lead_status}`} value={chat.lead_status ?? 'new'} disabled={busy} onChange={(e) => setStatus(e.target.value)} aria-label="Lead status">
            {Object.entries(LEAD_STATUS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        ) : (
          <button className="btn btn-soft btn-sm" onClick={() => setSaving(true)} aria-label="Save as lead">
            <UserPlus size={15} /> <span className="chat-head-label">Save as lead</span>
          </button>
        )}
        <button className="icon-btn" onClick={load} aria-label="Refresh">
          <RefreshCw size={17} />
        </button>
      </header>
      {chat.lead_id && (
        <p className="chat-bot small">
          <Bot size={15} />
          <span>
            {chat.bot_paused ? 'Bot paused' : 'Bot on'}
            {chat.bot_step ? ` · ${BOT_STEP[chat.bot_step] ?? chat.bot_step}` : ' · starts when they tap yes'}
          </span>
          <button type="button" className="btn btn-ghost btn-sm" disabled={busy} onClick={() => setBot(!chat.bot_paused)}>
            {chat.bot_paused ? 'Resume bot' : 'Pause bot'}
          </button>
        </p>
      )}
      {chat.notes && <p className="chat-notes small">📝 {chat.notes}</p>}
      {chat.saved_note && <p className="chat-notes small">📇 {chat.saved_note}</p>}

      <div className="chat-body">
        {messages ? (
          messages.map((m, i) => {
            const label = dayLabel(utc(m.created_at));
            const showDay = i === 0 || dayLabel(utc(messages[i - 1].created_at)) !== label;
            return (
              <Fragment key={m.id}>
                {showDay && <span className="chat-day">{label}</span>}
                <WaBubble m={m} timeOnly />
              </Fragment>
            );
          })
        ) : (
          <SkeletonRows count={3} />
        )}
        <div ref={end} />
      </div>

      <footer className="chat-foot">
        {chat.opted_out ? (
          <p className="alert alert-error small">They asked not to be messaged. If they write START, they can be messaged again.</p>
        ) : windowOpen ? (
          <>
            <div className="chat-window" title="WhatsApp allows free replies for 24 hours after their last message">
              <span style={{ width: `${Math.min(100, (left / (24 * 3_600_000)) * 100)}%` }} />
            </div>
            <div className="chat-quick">
              {QUICK.map((qr) => (
                <button key={qr.label} type="button" className="chip" onClick={() => quick(qr.text)}>
                  {qr.label}
                </button>
              ))}
              {chat.lead_id && (
                <button type="button" className="chip" disabled={busy} onClick={() => send(`whatsapp/leads/${chat.lead_id}/pitch`, undefined, 'Pitch sent')}>
                  <Sparkles size={13} /> Send AI pitch
                </button>
              )}
              <button type="button" className="chip" disabled={busy} onClick={() => setPicking(true)}>
                <FileText size={13} /> Template
              </button>
            </div>
            <form
              className="chat-compose"
              onSubmit={(e) => {
                e.preventDefault();
                if (file) send(`whatsapp/chats/${chat.phone}/media?${new URLSearchParams({ name: file.name, caption: text })}`, file, 'Sent');
                else send(`whatsapp/chats/${chat.phone}/text`, { text }, 'Sent');
                setText('');
                setFile(null);
              }}
            >
              {file && (
                <div className="chat-attachment">
                  {preview ? <img src={preview} alt="" /> : <FileText size={22} />}
                  <span>
                    <strong>{file.name}</strong>
                    <small className="muted">{fileSize(file.size)} · what you type goes as its caption</small>
                  </span>
                  <button type="button" className="icon-btn" onClick={() => setFile(null)} aria-label="Remove file">
                    <X size={16} />
                  </button>
                </div>
              )}
              <input
                ref={picker}
                type="file"
                hidden
                accept="image/jpeg,image/png,video/mp4,video/3gpp,audio/*,application/pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt"
                onChange={(e) => {
                  attach(e.target.files?.[0]);
                  e.target.value = '';
                }}
              />
              <button type="button" className="icon-btn chat-attach" disabled={busy} onClick={() => picker.current?.click()} aria-label="Attach a photo, video or document">
                <Paperclip size={18} />
              </button>
              <textarea
                ref={box}
                rows={1}
                value={text}
                onChange={(e) => setText(e.target.value)}
                onPaste={(e) => {
                  const pasted = e.clipboardData.files[0];
                  if (pasted) {
                    e.preventDefault();
                    attach(pasted);
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey && (text.trim() || file)) {
                    e.preventDefault();
                    e.currentTarget.form?.requestSubmit();
                  }
                }}
                placeholder={file ? 'Add a caption (optional)' : 'Type a reply'}
                aria-label="Reply"
              />
              <button className="btn btn-primary" disabled={busy || !(text.trim() || file)} aria-label="Send">
                <Send size={17} />
              </button>
            </form>
            <p className="muted small">
              Enter sends, Shift+Enter for a new line · free replies for another{' '}
              {left > 3_600_000 ? `${Math.floor(left / 3_600_000)} h ${Math.floor((left % 3_600_000) / 60_000)} min` : `${Math.max(1, Math.round(left / 60_000))} min`}
            </p>
          </>
        ) : (
          <>
            <p className="muted small">
              {lastIn ? 'More than 24 hours since their last message, so' : 'They haven’t written yet, so'} WhatsApp only allows the approved template.
            </p>
            <div className="actions">
              <button className="btn btn-primary btn-sm" disabled={busy} onClick={() => setPicking(true)}>
                <FileText size={15} /> Send a template
              </button>
              {chat.lead_id && (
                <button className="btn btn-soft btn-sm" disabled={busy} onClick={() => send(`whatsapp/leads/${chat.lead_id}/template`, undefined, 'Intro sent')}>
                  <Send size={15} /> Send the intro template
                </button>
              )}
            </div>
          </>
        )}
        <ErrorText text={error} />
      </footer>

      {saving && <SaveLead api={api} chat={chat} onClose={() => setSaving(false)} onSaved={onChanged} />}
      {editing && <ContactSheet api={api} chat={chat} onClose={() => setEditing(false)} onSaved={onChanged} onDeleted={chat.messages === 0 ? onBack : undefined} />}
      {picking && (
        <TemplateSheet
          api={api}
          chat={chat}
          onClose={() => setPicking(false)}
          onSent={(m) => {
            setMessages(m);
            count.current = m.length;
            onChanged();
          }}
        />
      )}
    </>
  );
}

/** Adds a number to chat with (New chat), or renames / removes a saved contact. */
function ContactSheet({
  api,
  chat,
  onClose,
  onSaved,
  onDeleted,
}: {
  api: AdminApi;
  chat?: Chat;
  onClose: () => void;
  onSaved: (phone: string) => void;
  onDeleted?: () => void;
}) {
  const [phone, setPhone] = useState(chat ? `+${chat.phone}` : '');
  const [name, setName] = useState(chat ? (chat.saved_name ?? chat.name ?? chat.profile_name ?? '') : '');
  const [note, setNote] = useState(chat?.saved_note ?? '');
  const { busy, error, run } = useAction();
  const save = (e: FormEvent) => {
    e.preventDefault();
    void run(async () => {
      const r = await api<{ phone: string }>('whatsapp/contacts', 'POST', { phone, name, note });
      toast(chat?.saved_name ? 'Contact updated' : 'Contact saved');
      onSaved(r.phone);
      onClose();
    });
  };
  const remove = () =>
    void run(async () => {
      await api(`whatsapp/contacts/${chat!.phone}`, 'DELETE');
      toast('Contact removed');
      onSaved(chat!.phone);
      onDeleted?.();
      onClose();
    });
  return (
    <Sheet title={chat ? (chat.saved_name ? 'Edit contact' : 'Save contact') : 'New chat'} onClose={onClose}>
      <form className="wa-settings" onSubmit={save}>
        <label>
          WhatsApp number
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="98765 43210 or +91 98765 43210"
            inputMode="tel"
            readOnly={Boolean(chat)}
            autoFocus={!chat}
          />
        </label>
        <label>
          Name
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Ramesh, Sharma Kirana Store" autoFocus={Boolean(chat)} />
        </label>
        <label>
          Note (optional, only you see it)
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. met at the market, wants a demo" />
        </label>
        <ErrorText text={error} />
        <div className="actions">
          <button className="btn btn-primary" disabled={busy || !phone.trim() || !name.trim()}>
            {chat ? <ContactRound size={16} /> : <MessageSquarePlus size={16} />} {chat ? 'Save contact' : 'Save and open chat'}
          </button>
          {chat?.saved_name && (
            <button type="button" className="btn btn-ghost" disabled={busy} onClick={remove}>
              <Trash2 size={16} /> Remove contact
            </button>
          )}
        </div>
        {!chat && (
          <p className="muted small" style={{ margin: 0 }}>
            10-digit numbers are taken as Indian (+91). WhatsApp lets a business start a chat only with an approved template; once they reply, you can write
            freely for 24 hours.
          </p>
        )}
      </form>
    </Sheet>
  );
}

/** Picks one of the account's approved templates, fills its {{…}} and sends it to this chat's number. */
function TemplateSheet({ api, chat, onClose, onSent }: { api: AdminApi; chat: Chat; onClose: () => void; onSent: (m: WaMessage[]) => void }) {
  const [templates, setTemplates] = useState<Template[] | null>(null);
  const [loadError, setLoadError] = useState('');
  const [pick, setPick] = useState('');
  const [params, setParams] = useState<string[]>([]);
  const [headerParam, setHeaderParam] = useState('');
  const [buttonParam, setButtonParam] = useState('');
  const { busy, error, run } = useAction();
  const name = chat.saved_name ?? chat.name ?? chat.profile_name ?? '';
  useEffect(() => {
    void api<Template[]>('whatsapp/templates').then(
      (all) => setTemplates(all.filter((t) => t.status === 'APPROVED' && (!t.header || t.header.format === 'TEXT'))),
      (e) => setLoadError((e as Error).message),
    );
  }, [api]);
  const t = templates?.find((x) => `${x.name}|${x.language}` === pick);
  const choose = (key: string) => {
    setPick(key);
    const next = templates?.find((x) => `${x.name}|${x.language}` === key);
    // {{1}} is nearly always the person's or shop's name.
    setParams(Array.from({ length: next?.params ?? 0 }, (_, i) => (i === 0 ? name : '')));
    setHeaderParam(next?.header?.params ? name : '');
    setButtonParam('');
  };
  const send = (e: FormEvent) => {
    e.preventDefault();
    if (!t) return;
    void run(async () => {
      const m = await api<WaMessage[]>(`whatsapp/chats/${chat.phone}/template`, 'POST', { name: t.name, language: t.language, params, headerParam, buttonParam });
      toast('Template sent');
      onSent(m);
      onClose();
    });
  };
  const ready = t && params.every((p) => p.trim()) && (!t.header?.params || headerParam.trim()) && (!t.urlButton || buttonParam.trim());
  return (
    <Sheet title={`Send a template to ${display(chat)}`} onClose={onClose}>
      <form className="wa-settings" onSubmit={send}>
        {loadError ? (
          <ErrorText text={loadError} />
        ) : !templates ? (
          <SkeletonRows count={2} />
        ) : !templates.length ? (
          <p className="muted small">No approved templates yet. Create one in Leads → WhatsApp API settings and wait for Meta to approve it.</p>
        ) : (
          <>
            <label>
              Template
              <select value={pick} onChange={(e) => choose(e.target.value)} autoFocus>
                <option value="">Choose an approved template</option>
                {templates.map((x) => (
                  <option key={`${x.name}|${x.language}`} value={`${x.name}|${x.language}`}>
                    {x.name} · {x.language} · {x.category.toLowerCase()}
                  </option>
                ))}
              </select>
            </label>
            {t?.header?.params ? (
              <label>
                Heading {'{{1}}'}
                <input value={headerParam} onChange={(e) => setHeaderParam(e.target.value)} />
              </label>
            ) : null}
            {params.map((p, i) => (
              <label key={i}>
                {`{{${i + 1}}}`}
                <input value={p} onChange={(e) => setParams((cur) => cur.map((x, j) => (j === i ? e.target.value : x)))} placeholder={i === 0 ? 'e.g. their name or shop name' : ''} />
              </label>
            ))}
            {t?.urlButton && (
              <label>
                Button link: {t.urlButton.url.replace(/\{\{\d+\}\}/, '…')}
                <input value={buttonParam} onChange={(e) => setButtonParam(e.target.value)} placeholder="what goes in place of …" />
              </label>
            )}
            {t && (
              <div className="tpl-preview">
                {t.header?.text && <strong>{fillIn(t.header.text, [headerParam])}</strong>}
                <p>{fillIn(t.body, params)}</p>
                {t.buttons.length > 0 && (
                  <span className="muted small">
                    {t.buttons.map((b) => `[${b}]`).join(' ')}
                  </span>
                )}
              </div>
            )}
            <ErrorText text={error} />
            <div className="actions">
              <button className="btn btn-primary" disabled={busy || !ready}>
                <Send size={16} /> {busy ? 'Sending…' : 'Send template'}
              </button>
            </div>
            <p className="muted small" style={{ margin: 0 }}>
              Counts toward the daily limit and monthly budget like the intro. Templates with a photo or video on top aren’t listed.
            </p>
          </>
        )}
      </form>
    </Sheet>
  );
}

/** Makes a lead from someone who wrote to us: it then shows in Leads, with a status, notes and a pitch. */
function SaveLead({ api, chat, onClose, onSaved }: { api: AdminApi; chat: Chat; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(chat.profile_name ?? '');
  const [shopType, setShopType] = useState('');
  const [area, setArea] = useState('');
  const { busy, error, run } = useAction();
  const save = (e: FormEvent) => {
    e.preventDefault();
    void run(async () => {
      await api(`whatsapp/chats/${chat.phone}/lead`, 'POST', { name, shopType, area });
      toast('Saved as a lead');
      onSaved();
      onClose();
    });
  };
  return (
    <Sheet title="Save as lead" onClose={onClose}>
      <form className="wa-settings" onSubmit={save}>
        <label>
          Shop name
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Sharma Kirana Store" autoFocus />
        </label>
        <label>
          Kind of shop
          <input value={shopType} onChange={(e) => setShopType(e.target.value)} placeholder="e.g. Kirana store" />
        </label>
        <label>
          Area or city
          <input value={area} onChange={(e) => setArea(e.target.value)} placeholder="e.g. Vijay Nagar, Indore" />
        </label>
        <ErrorText text={error} />
        <div className="actions">
          <button className="btn btn-primary" disabled={busy}>
            <UserPlus size={16} /> Save lead
          </button>
        </div>
        <p className="muted small" style={{ margin: 0 }}>
          {pretty(chat.phone)} becomes an Interested lead, with this chat attached. Its sign-up link then marks it Joined when they sign up.
        </p>
      </form>
    </Sheet>
  );
}
