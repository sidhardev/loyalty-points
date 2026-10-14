import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, MessagesSquare, RefreshCw, Search, Send, Sparkles } from 'lucide-react';
import { when } from '../api';
import { EmptyState, ErrorText, SkeletonRows, toast, useAction } from '../ui';
import type { AdminApi } from './AdminSeo';
import { WaBubble, type WaMessage } from './AdminWhatsApp';

// Admin → WhatsApp chats: every conversation on the WhatsApp API number (server/src/whatsapp.ts), leads or not, with the
// replies not opened yet. Opening a chat marks its replies as seen. Free replies are allowed for 24 hours after their
// last message; outside that, a lead can only be sent the intro template again. Refreshes by itself while open.

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
  category: string | null;
  shop_type: string | null;
  area: string | null;
  lead_status: string | null;
  opted_out: number;
  window_open: number | null;
};
type Data = { chats: Chat[]; unread: number; ready: boolean };

/** Fired with the unread count whenever the chats are loaded, so the menu badge updates straight away. */
export const WA_UNREAD = 'wa-unread';

const LEAD_STATUS: Record<string, string> = { new: 'New', contacted: 'Contacted', interested: 'Interested', joined: 'Joined', not_interested: 'Not interested' };
const pretty = (phone: string) => (phone.startsWith('91') && phone.length === 12 ? `+91 ${phone.slice(2, 7)} ${phone.slice(7)}` : `+${phone}`);

export function ChatsPage({ api }: { api: AdminApi }) {
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState('');
  const [open, setOpen] = useState('');
  const [filter, setFilter] = useState<'' | 'unread' | 'leads'>('');
  const [q, setQ] = useState('');
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

  if (error) return <ErrorText text={error} />;
  if (!data) return <SkeletonRows count={6} />;

  const needle = q.trim().toLowerCase();
  const list = data.chats.filter(
    (c) =>
      (filter !== 'unread' || c.unread > 0) &&
      (filter !== 'leads' || c.lead_id) &&
      (!needle || `${c.name ?? ''} ${c.phone} ${c.area ?? ''} ${c.last_body}`.toLowerCase().includes(needle)),
  );
  const current = data.chats.find((c) => c.phone === open);

  return (
    <>
      <header className="page-head">
        <div>
          <h1>WhatsApp chats</h1>
          <p>
            Every conversation on the WhatsApp API number, newest first{data.unread ? `: ${data.unread} new ${data.unread === 1 ? 'reply' : 'replies'}` : ''}. You can
            write back freely for 24 hours after someone’s last message.
          </p>
        </div>
      </header>

      {!data.ready && (
        <p className="alert alert-error">
          WhatsApp isn’t fully set up yet (number, token and template). Finish it in <a href="#/leads">Leads</a> → WhatsApp API.
        </p>
      )}

      <section className={`card chats${open ? ' chat-open' : ''}`}>
        <aside className="chats-list">
          <div className="chats-tools">
            <div className="chats-search">
              <Search size={15} />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search chats" aria-label="Search chats" />
            </div>
            <div className="seg">
              {(
                [
                  ['', 'All'],
                  ['unread', `Unread${data.unread ? ` (${data.unread})` : ''}`],
                  ['leads', 'Leads'],
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
                    <span className="chat-row-top">
                      <strong>{c.name ?? pretty(c.phone)}</strong>
                      <time>{when(c.last_at)}</time>
                    </span>
                    <span className="chat-row-bottom">
                      <span className="chat-preview">
                        {c.last_direction === 'out' ? 'You: ' : ''}
                        {c.last_body}
                      </span>
                      {c.unread > 0 && <span className="chat-unread">{c.unread}</span>}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              icon={MessagesSquare}
              title={data.chats.length ? 'No chats match' : 'No chats yet'}
              text={data.chats.length ? 'Try another filter.' : 'Send intros from Leads; replies show up here.'}
            />
          )}
        </aside>
        <div className="chat-pane">
          {current ? (
            <Conversation key={current.phone} api={api} chat={current} onBack={() => setOpen('')} onChanged={load} />
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
  const { busy, error, run } = useAction();
  const end = useRef<HTMLDivElement>(null);
  const count = useRef(0);

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

  const lastIn = [...(messages ?? [])].reverse().find((m) => m.direction === 'in')?.created_at ?? chat.last_in;
  const windowEnds = lastIn ? Date.parse(`${lastIn.replace(' ', 'T')}Z`) + 24 * 3_600_000 : 0;
  const windowOpen = windowEnds > Date.now();
  const left = windowEnds - Date.now();
  const send = (path: string, body: object | undefined, done: string) =>
    void run(async () => {
      const r = await api<WaMessage[]>(path, 'POST', body);
      setMessages(r);
      count.current = r.length;
      toast(done);
      onChanged();
    });

  return (
    <>
      <header className="chat-head">
        <button className="icon-btn chat-back" onClick={onBack} aria-label="Back to chats">
          <ArrowLeft size={19} />
        </button>
        <div>
          <strong>{chat.name ?? pretty(chat.phone)}</strong>
          <span className="muted small">
            {[chat.name ? pretty(chat.phone) : '', chat.category || chat.shop_type, chat.area].filter(Boolean).join(' · ') || 'Not a lead'}
            {chat.lead_status ? ` · ${LEAD_STATUS[chat.lead_status] ?? chat.lead_status}` : ''}
          </span>
        </div>
        <button className="icon-btn" onClick={load} aria-label="Refresh">
          <RefreshCw size={17} />
        </button>
      </header>

      <div className="chat-body">
        {messages ? messages.map((m) => <WaBubble key={m.id} m={m} />) : <SkeletonRows count={3} />}
        <div ref={end} />
      </div>

      <footer className="chat-foot">
        {chat.opted_out ? (
          <p className="alert alert-error small">They asked not to be messaged. If they write START, they can be messaged again.</p>
        ) : windowOpen ? (
          <>
            <p className="muted small">
              Free replies for another {left > 3_600_000 ? `${Math.floor(left / 3_600_000)} h` : `${Math.max(1, Math.round(left / 60_000))} min`}.
            </p>
            {chat.lead_id && (
              <div className="actions">
                <button className="btn btn-soft btn-sm" disabled={busy} onClick={() => send(`whatsapp/leads/${chat.lead_id}/pitch`, undefined, 'Pitch sent')}>
                  <Sparkles size={15} /> Send the AI pitch
                </button>
              </div>
            )}
            <form
              className="chat-compose"
              onSubmit={(e) => {
                e.preventDefault();
                send(`whatsapp/chats/${chat.phone}/text`, { text }, 'Sent');
                setText('');
              }}
            >
              <textarea
                rows={2}
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey && text.trim()) {
                    e.preventDefault();
                    e.currentTarget.form?.requestSubmit();
                  }
                }}
                placeholder="Type a reply (Enter to send, Shift+Enter for a new line)"
                aria-label="Reply"
              />
              <button className="btn btn-primary" disabled={busy || !text.trim()} aria-label="Send">
                <Send size={17} />
              </button>
            </form>
          </>
        ) : (
          <>
            <p className="muted small">
              {lastIn ? 'More than 24 hours since their last message, so' : 'They haven’t written yet, so'} WhatsApp only allows the approved template.
            </p>
            {chat.lead_id && (
              <div className="actions">
                <button className="btn btn-soft btn-sm" disabled={busy} onClick={() => send(`whatsapp/leads/${chat.lead_id}/template`, undefined, 'Intro sent')}>
                  <Send size={15} /> Send the intro template
                </button>
              </div>
            )}
          </>
        )}
        <ErrorText text={error} />
      </footer>
    </>
  );
}
