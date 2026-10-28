import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Copy, Download, ExternalLink, History, Image, MessageCircle, Trash2, Wand2 } from 'lucide-react';
import { when } from '../api';
import { EmptyState, ErrorText, SkeletonRows, confirmDialog, toast, useAction } from '../ui';
import type { AdminApi } from './AdminSeo';
import { Sub } from './AdminSub';

// Admin → WhatsApp status: Gemini (server/src/status.ts) writes ideas for Hindi WhatsApp status images. Each comes as a
// prompt to paste into Gemini or ChatGPT, with one of the logos below attached so the image uses the real logo.

type Style = 'festive' | 'clean' | 'illustration' | 'photo' | 'bold';
type Idea = { angle: string; headline: string; subtext: string; cta: string; scene: string; caption: string; prompt: string };
type Batch = { id: number; created_at: string; theme: string; shop_type: string; style: Style; prompt_lang: 'en' | 'hi'; ideas: Idea[]; cost_usd: number };
type Data = { keySet: boolean; model: string; batches: Batch[] };

const STYLES: Record<Style, string> = {
  clean: 'Clean & modern',
  festive: 'Festive',
  illustration: 'Illustration',
  photo: 'Photo-real',
  bold: 'Bold text',
};

const THEMES = ['Diwali', 'Customers don’t come back', 'Free to start', 'WhatsApp reminders', 'Paper stamp cards vs Regularhood', 'New shop opening'];

const LOGOS = [
  { file: 'regularhood-logo.png', label: 'Logo (rounded)', size: '1024 × 1024 PNG' },
  { file: 'regularhood-logo-square.png', label: 'Logo (square)', size: '1080 × 1080 PNG' },
  { file: 'regularhood-banner.png', label: 'Logo with name', size: '1640 × 624 PNG' },
  { file: 'regularhood-logo.svg', label: 'Logo (vector)', size: 'SVG, any size' },
];

// The 9 launch posts in web/public/brand/instagram (made from brand/instagram; captions from brand/instagram/captions.md).
const INSTA_TAGS = '#Regularhood #StampCard #LoyaltyProgram #SmallBusinessIndia #LocalShops #KiranaStore #CafeOwner #SalonBusiness #CustomerLoyalty #DukaanDigital #VocalForLocal';
const INSTA_POSTS = [
  {
    file: 'post-1',
    title: 'Intro',
    caption: `Meet Regularhood 🏪
A stamp card for local shops: chai stalls, cafés, salons, bakeries, kirana stores and more.
Every 5th visit, a free chai (or whatever reward you choose). Turn first-time customers into regulars, all from the phone you already have.
Free to start → link in bio.`,
  },
  {
    file: 'post-2',
    title: 'The problem',
    caption: `A new customer pays, smiles and walks out. Will they come back? Right now, that's left to luck. 🎲
Regularhood counts every visit for you and gives them a reason to return.`,
  },
  {
    file: 'post-3',
    title: 'Old way vs new way',
    caption: `Paper stamp cards get lost, forgotten at home, or thrown away.
With Regularhood the card is just your customer's phone number, so it can't be lost, and you can see who hasn't been back in a while.`,
  },
  {
    file: 'post-4',
    title: 'How it works',
    caption: `Three steps, one button:
1️⃣ Set your one rule, e.g. every 5 visits → free chai
2️⃣ Type the customer's number and tap Add visit
3️⃣ On the 5th visit the screen turns orange: give the reward, and the card starts again
Setup takes about a minute.`,
  },
  {
    file: 'post-5',
    title: 'No app, nothing to scan',
    caption: `No app to download. Nothing to scan. No password to remember.
Your customer just says their phone number at the counter. Their card opens from a WhatsApp link and can sit on their home screen like any app. 📱`,
  },
  {
    file: 'post-6',
    title: 'WhatsApp',
    caption: `After a visit, send the customer their card on WhatsApp with one tap: how many visits they have and how many more until their reward. 💬
A small reminder that brings them back.`,
  },
  {
    file: 'post-7',
    title: 'No smartphone',
    caption: `Not every customer has a smartphone, and that's fine.
A customer is just a phone number: no names, no sign-up, nothing to scan. Type the number, tap Add visit, and they're one stamp closer to their reward.`,
  },
  {
    file: 'post-8',
    title: 'Hindi',
    caption: `आपके ग्राहक, उनकी भाषा में। 🇮🇳
The customer's card, the WhatsApp message and your shop app all work in English or Hindi.`,
  },
  {
    file: 'post-9',
    title: 'Call to action',
    caption: `Free to start. Set up in a minute. ✅
Your customers stay yours: we never sell or share their details, and you can download your customer list and visit history any time.
Start today → link in bio (www.regularhood.in)`,
  },
];

const copy = (text: string, what: string) =>
  navigator.clipboard.writeText(text).then(
    () => toast(`${what} copied`),
    () => toast('Could not copy — select the text and copy it by hand', 'error'),
  );

export function StatusPage({ api }: { api: AdminApi }) {
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState('');
  const load = useCallback(() => void api<Data>('status').then(setData, (e) => setError((e as Error).message)), [api]);
  useEffect(load, [load]);

  const remove = async (b: Batch) => {
    if (!(await confirmDialog({ title: 'Delete these ideas?', confirm: 'Delete', danger: true }))) return;
    try {
      await api(`status/${b.id}`, 'DELETE');
      load();
    } catch (e) {
      toast((e as Error).message, 'error');
    }
  };

  if (error) return <ErrorText text={error} />;
  if (!data) return <SkeletonRows count={6} />;
  const [latest, ...older] = data.batches;

  return (
    <>
      <header className="page-head">
        <div>
          <h1>WhatsApp status</h1>
          <p>
            Ideas for Hindi status images, written by {data.model}. Copy a prompt, paste it into Gemini or ChatGPT, and attach a logo from below so the
            image uses the real one.
          </p>
        </div>
      </header>

      {!data.keySet && (
        <p className="alert alert-error">
          No Gemini API key yet. Add one in <a href="#/seo/ai">SEO pages → AI calls &amp; key</a> first.
        </p>
      )}

      <div className="grid-2">
        <Sub id="ideas">
          <GenerateCard api={api} disabled={!data.keySet} onDone={load} />
        </Sub>
        <Sub id="brand">
          <LogosCard />
        </Sub>
      </div>

      <Sub id="brand">
        <InstagramPostsCard />
      </Sub>

      <Sub id="ideas">
        {latest ? <BatchCard batch={latest} onDelete={() => void remove(latest)} open /> : <EmptyState icon={Image} title="No ideas yet" text="Pick a theme and press Write ideas." />}

        {older.length > 0 && (
          <>
            <h2 className="status-older">
              <History size={18} /> Earlier ideas
            </h2>
            {older.map((b) => (
              <BatchCard key={b.id} batch={b} onDelete={() => void remove(b)} />
            ))}
          </>
        )}
      </Sub>
    </>
  );
}

function GenerateCard({ api, disabled, onDone }: { api: AdminApi; disabled: boolean; onDone: () => void }) {
  const [theme, setTheme] = useState('');
  const [shopType, setShopType] = useState('');
  const [style, setStyle] = useState<Style>('clean');
  const [count, setCount] = useState(3);
  const [lang, setLang] = useState<'en' | 'hi'>('en');
  const { busy, error, run } = useAction();
  const submit = (e: FormEvent) => {
    e.preventDefault();
    void run(async () => {
      await api('status', 'POST', { theme, shopType, style, count, lang });
      toast('Ideas ready');
      onDone();
    });
  };
  return (
    <form className="card" onSubmit={submit}>
      <div className="card-head">
        <h2>
          <Wand2 size={18} /> New status ideas
        </h2>
      </div>
      <label>
        Theme or occasion (optional)
        <input value={theme} onChange={(e) => setTheme(e.target.value)} placeholder="e.g. Diwali, customers don’t come back — or leave empty for a mix" />
      </label>
      <div className="chips status-chips">
        {THEMES.map((t) => (
          <button type="button" key={t} className={`chip${theme === t ? ' active' : ''}`} onClick={() => setTheme(theme === t ? '' : t)}>
            {t}
          </button>
        ))}
      </div>
      <label>
        Kind of shop (optional)
        <input value={shopType} onChange={(e) => setShopType(e.target.value)} placeholder="e.g. Kirana store, Salon, Chai stall" />
      </label>
      <div className="status-row">
        <label>
          Style
          <select value={style} onChange={(e) => setStyle(e.target.value as Style)}>
            {(Object.keys(STYLES) as Style[]).map((s) => (
              <option key={s} value={s}>
                {STYLES[s]}
              </option>
            ))}
          </select>
        </label>
        <label>
          How many
          <select value={count} onChange={(e) => setCount(Number(e.target.value))}>
            {[1, 2, 3, 4, 5].map((n) => (
              <option key={n}>{n}</option>
            ))}
          </select>
        </label>
      </div>
      <div className="field">
        Prompt written in
        <div className="seg">
          <button type="button" className={lang === 'en' ? 'active' : ''} onClick={() => setLang('en')}>
            English (best results)
          </button>
          <button type="button" className={lang === 'hi' ? 'active' : ''} onClick={() => setLang('hi')}>
            हिंदी
          </button>
        </div>
      </div>
      <ErrorText text={error} />
      <div className="actions">
        <button className="btn btn-primary" disabled={busy || disabled}>
          <Wand2 size={16} /> {busy ? 'Writing… (up to a minute)' : 'Write ideas'}
        </button>
      </div>
      <p className="muted small" style={{ margin: 0 }}>
        The words on the image are always Hindi. Image tools follow English instructions more closely, so English prompts usually come out better.
      </p>
    </form>
  );
}

function LogosCard() {
  return (
    <section className="card">
      <div className="card-head">
        <h2>
          <Download size={18} /> Logos for reference
        </h2>
      </div>
      <div className="status-logos">
        {LOGOS.map((l) => (
          <a key={l.file} className="status-logo" href={`/brand/${l.file}`} download={l.file}>
            <img src={`/brand/${l.file}`} alt="" loading="lazy" />
            <span>
              <strong>{l.label}</strong>
              <em>{l.size}</em>
            </span>
            <Download size={16} />
          </a>
        ))}
      </div>
      <p className="muted small" style={{ margin: 0 }}>
        Attach the rounded logo (or the one with the name) to the chat with your prompt: in Gemini or ChatGPT, tap <strong>+</strong> → upload image.
      </p>
      <div className="actions">
        <a className="btn btn-soft btn-sm" href="https://gemini.google.com/app" target="_blank" rel="noreferrer">
          <ExternalLink size={15} /> Open Gemini
        </a>
        <a className="btn btn-soft btn-sm" href="https://chatgpt.com/" target="_blank" rel="noreferrer">
          <ExternalLink size={15} /> Open ChatGPT
        </a>
      </div>
    </section>
  );
}

function InstagramPostsCard() {
  return (
    <details className="card status-batch">
      <summary className="card-head">
        <h2>
          <Image size={18} /> Instagram launch posts
        </h2>
        <span className="muted small">9 posts · 1080 × 1080 PNG</span>
      </summary>
      <p className="muted small" style={{ margin: 0 }}>
        Post in reverse order (post 9 first, post 1 last): Instagram puts the newest post top-left, so the grid ends with post 1 top-left. Copy caption
        includes the hashtags.
      </p>
      <div className="insta-posts">
        {INSTA_POSTS.map((p, i) => (
          <article key={p.file} className="insta-post">
            <a href={`/brand/instagram/${p.file}.png`} target="_blank" rel="noreferrer">
              <img src={`/brand/instagram/${p.file}.png`} alt={p.title} loading="lazy" width={1080} height={1080} />
            </a>
            <strong>
              {i + 1}. {p.title}
            </strong>
            <div className="actions">
              <a className="btn btn-soft btn-sm" href={`/brand/instagram/${p.file}.png`} download={`regularhood-${p.file}.png`}>
                <Download size={15} /> Image
              </a>
              <button className="btn btn-soft btn-sm" onClick={() => void copy(`${p.caption}

${INSTA_TAGS}`, 'Caption')}>
                <Copy size={15} /> Caption
              </button>
            </div>
          </article>
        ))}
      </div>
    </details>
  );
}

function BatchCard({ batch, onDelete, open }: { batch: Batch; onDelete: () => void; open?: boolean }) {
  const title = [batch.theme || 'Mixed ideas', batch.shop_type].filter(Boolean).join(' · ');
  return (
    <details className="card status-batch" open={open}>
      <summary className="card-head">
        <h2>
          <Image size={18} /> {title}
        </h2>
        <span className="muted small">
          {STYLES[batch.style] ?? batch.style} · {batch.prompt_lang === 'hi' ? 'हिंदी prompt' : 'English prompt'} · {when(batch.created_at)}
        </span>
      </summary>
      <div className="status-ideas">
        {batch.ideas.map((idea, i) => (
          <IdeaCard key={i} idea={idea} n={i + 1} />
        ))}
      </div>
      <div className="actions">
        <button className="btn btn-soft btn-sm" onClick={() => void copy(batch.ideas.map((i, n) => `#${n + 1} ${i.angle}\n\n${i.prompt}`).join('\n\n------\n\n'), 'All prompts')}>
          <Copy size={15} /> Copy all prompts
        </button>
        <button className="btn btn-soft btn-sm" onClick={onDelete}>
          <Trash2 size={15} /> Delete
        </button>
      </div>
    </details>
  );
}

function IdeaCard({ idea, n }: { idea: Idea; n: number }) {
  return (
    <article className="status-idea">
      <div className="status-preview" lang="hi">
        <strong>{idea.headline}</strong>
        <span>{idea.subtext}</span>
        <em>{idea.cta}</em>
      </div>
      <div className="status-body">
        <p className="muted small" style={{ margin: 0 }}>
          #{n} · {idea.angle}
        </p>
        <pre className="status-prompt">{idea.prompt}</pre>
        <div className="actions">
          <button className="btn btn-primary btn-sm" onClick={() => void copy(idea.prompt, 'Prompt')}>
            <Copy size={15} /> Copy prompt
          </button>
          <button className="btn btn-soft btn-sm" onClick={() => void copy(idea.caption, 'Caption')}>
            <MessageCircle size={15} /> Copy caption
          </button>
        </div>
        <p className="small status-caption" lang="hi">
          <MessageCircle size={14} /> {idea.caption}
        </p>
      </div>
    </article>
  );
}
