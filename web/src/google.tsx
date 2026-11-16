import { useEffect, useRef, useState } from 'react';
import { api } from './api';

// "Continue with Google": Google's own button (Google Identity Services). It hands back an ID token that the server
// checks (server/src/google.ts). Shown only when the server has a Google client id.

type Gsi = {
  accounts: {
    id: {
      initialize(options: { client_id: string; callback: (r: { credential: string }) => void; ux_mode?: 'popup' }): void;
      renderButton(el: HTMLElement, options: Record<string, unknown>): void;
    };
  };
};

let script: Promise<Gsi> | null = null;
function loadGsi() {
  script ??= new Promise<Gsi>((resolve, reject) => {
    const s = Object.assign(document.createElement('script'), { src: 'https://accounts.google.com/gsi/client', async: true });
    s.onload = () => resolve((window as unknown as { google: Gsi }).google);
    s.onerror = () => {
      script = null;
      reject(new Error('Google sign-in could not load'));
    };
    document.head.appendChild(s);
  });
  return script;
}

let clientId: Promise<string> | null = null;
const getClientId = () => (clientId ??= api<{ clientId: string }>('auth/google').then((r) => r.clientId, () => ''));

export function GoogleButton({ text, onCredential }: { text: 'signin_with' | 'signup_with' | 'continue_with'; onCredential: (credential: string) => void }) {
  const box = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const handler = useRef(onCredential);
  handler.current = onCredential;

  useEffect(() => {
    let alive = true;
    void getClientId().then(async (id) => {
      if (!id || !alive) return;
      try {
        const google = await loadGsi();
        if (!alive || !box.current) return;
        google.accounts.id.initialize({ client_id: id, ux_mode: 'popup', callback: (r) => handler.current(r.credential) });
        google.accounts.id.renderButton(box.current, { theme: 'outline', size: 'large', shape: 'pill', text, width: Math.min(box.current.clientWidth || 320, 400) });
        setReady(true);
      } catch {
        // No Google button; the password form still works.
      }
    });
    return () => {
      alive = false;
    };
  }, [text]);

  return (
    <div style={{ display: ready ? 'block' : 'none' }}>
      <div ref={box} style={{ display: 'flex', justifyContent: 'center', minHeight: 44 }} />
      <p className="muted small center" style={{ margin: '12px 0 0' }}>
        or
      </p>
    </div>
  );
}
