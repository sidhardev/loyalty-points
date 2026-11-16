import { useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { Crown, Image, Star, Trash2, Upload } from 'lucide-react';
import { api, upload, type Merchant } from '../api';
import { ProLock } from '../billing';
import { t, useLang } from '../i18n';
import { ErrorText, toast, useAction } from '../ui';

// Settings → Pro: the shop's logo on every customer card, and its Google review link (a button on the card, and
// "Ask for a Google review" on the counter after a reward). A shop on Free sees what these do and the way to Pro.

/** Logos are drawn at most this big, and must end up under the server's 300 KB. */
const LOGO_PX = 400;
const MAX_BYTES = 300 * 1024;

/** Makes the chosen picture small: WebP where the browser can (keeps transparency), else PNG, else JPEG. */
async function shrink(file: File): Promise<Blob> {
  if (!file.type.startsWith('image/')) throw new Error(t('Choose a picture (PNG or JPG)'));
  const bitmap = await createImageBitmap(file).catch(() => {
    throw new Error(t('This picture could not be opened. Try a PNG or JPG.'));
  });
  const scale = Math.min(1, LOGO_PX / Math.max(bitmap.width, bitmap.height));
  const canvas = Object.assign(document.createElement('canvas'), { width: Math.round(bitmap.width * scale), height: Math.round(bitmap.height * scale) });
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const blob = (type: string, quality?: number) => new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));
  for (const [type, quality] of [['image/webp', 0.9], ['image/png', undefined], ['image/jpeg', 0.85]] as const) {
    const b = await blob(type, quality);
    if (b && b.type === type && b.size <= MAX_BYTES) return b;
  }
  throw new Error(t('This picture is too big. Try a smaller one.'));
}

export function ProSettings({ merchant, onMerchant }: { merchant: Merchant; onMerchant: (m: Merchant) => void }) {
  useLang();
  const [link, setLink] = useState(merchant.reviewUrl);
  const file = useRef<HTMLInputElement>(null);
  const { busy, error, run } = useAction();

  if (!merchant.pro) {
    return (
      <ProLock perk="logo">
        <p className="small" style={{ margin: 0 }}>
          <Star size={14} /> {t('Pro also adds a “Review us on Google” button to every card.')}
        </p>
      </ProLock>
    );
  }

  const pickLogo = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = ''; // the same file can be picked again
    if (!f) return;
    void run(async () => {
      onMerchant(await upload<Merchant>('pro/logo', await shrink(f)));
      toast(t('Logo saved'));
    });
  };
  const removeLogo = () =>
    void run(async () => {
      onMerchant(await api<Merchant>('pro/logo', 'DELETE'));
      toast(t('Logo removed'));
    });
  const saveLink = (e: FormEvent) => {
    e.preventDefault();
    void run(async () => {
      const m = await api<Merchant>('pro/review', 'PATCH', { reviewUrl: link });
      onMerchant(m);
      setLink(m.reviewUrl);
      toast(m.reviewUrl ? t('Review link saved') : t('Review link removed'));
    });
  };

  return (
    <section className="card pro-card">
      <div className="card-head">
        <h2>
          <Crown size={18} /> {t('Pro')}
        </h2>
      </div>

      <div className="pro-logo">
        <span className="pro-logo-preview">{merchant.logo ? <img src={merchant.logo} alt={t('Your logo')} /> : <Image size={26} />}</span>
        <span className="pro-logo-text">
          <strong>{t('Your logo on the card')}</strong>
          <span className="muted small">{t('Shows at the top of every customer’s card. A square picture looks best.')}</span>
        </span>
      </div>
      <div className="actions">
        <button type="button" className="btn btn-soft" disabled={busy} onClick={() => file.current?.click()}>
          <Upload size={17} /> {merchant.logo ? t('Change logo') : t('Upload logo')}
        </button>
        {merchant.logo && (
          <button type="button" className="btn btn-ghost" disabled={busy} onClick={removeLogo}>
            <Trash2 size={17} /> {t('Remove')}
          </button>
        )}
        <input ref={file} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={pickLogo} />
      </div>

      <form className="auto-review" onSubmit={saveLink}>
        <label>
          <span>
            <Star size={15} /> {t('Your Google review link')}
          </span>
          <input value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://g.page/r/…/review" inputMode="url" />
        </label>
        <button className="btn btn-soft" disabled={busy || link.trim() === merchant.reviewUrl}>
          {t('Save')}
        </button>
      </form>
      <p className="muted small" style={{ margin: 0 }}>
        {t('Find it in Google Maps → your shop → “Ask for reviews” (or Google Business Profile → Get more reviews).')}
      </p>
      <ErrorText text={error} />
    </section>
  );
}
