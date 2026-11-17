import { createContext, useContext } from 'react';
import { loadFont } from '@remotion/google-fonts/Poppins';

const poppins = loadFont('normal', { weights: ['400', '500', '600', '700', '800', '900'], subsets: ['latin', 'devanagari'] });

export const font = `${poppins.fontFamily}, "Nirmala UI", "Segoe UI Emoji", sans-serif`;

// Reel colours come from the old reels; the app screens use the web app's own (web/src/styles.css, counter.css).
export const C = {
  bgTop: '#063b2a',
  bgBottom: '#04261b',
  amber: '#f0a202',
  mint: '#34d399',
  red: '#ff6b5b',
  soft: '#cfe9dd',
  cream: '#f6efdc',
  brand: '#047857',
  brandFill: '#10b981',
  brandSoft: '#e3f4ec',
  reward: '#d97706',
  rewardSoft: '#fff4e0',
  ink: '#0d1f19',
  muted: '#5b6b65',
  appBg: '#f4f8f6',
  line: '#e0e9e5',
  lineStrong: '#c9d6d1',
  whatsapp: '#128c4a',
};

// One reel for every shop, plus one per kind of shop with its own name on the app screens (src/Root.tsx renders each).
export const SHOPS = {
  all: { name: 'Aapki Dukaan', kind: '' },
  cafe: { name: 'Brew House Café', kind: 'Café' },
  salon: { name: 'Style Point Salon', kind: 'Salon' },
  kirana: { name: 'Sharma Store', kind: 'Kirana' },
  bakery: { name: 'Gupta Bakery', kind: 'Bakery' },
  gym: { name: 'FitZone Gym', kind: 'Gym' },
  mithai: { name: 'Agarwal Sweets', kind: 'Mithai' },
};
export type ShopKey = keyof typeof SHOPS;

export const ShopContext = createContext<ShopKey>('all');
/** The reel's shop: its name, and its kind ('' for the reel for every shop). */
export const useShop = () => SHOPS[useContext(ShopContext)];
export const REWARD = 'Free gift';
export const PHONE = '9876543210';
