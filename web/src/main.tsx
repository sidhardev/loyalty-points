/// <reference types="vite/client" />
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './styles.css';

createRoot(document.getElementById('root')!).render(<App />);

// Installable app + offline shell (built app only, so live reload in development isn't cached).
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  addEventListener('load', () => void navigator.serviceWorker.register('/sw.js').catch(() => {}));
}
