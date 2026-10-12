// Shared fields of the installable-app manifest. The shop app's copy is web/public/manifest.webmanifest;
// each customer wallet gets its own (see PublicController.manifest) so it opens straight to that wallet.
export const APP_MANIFEST = {
  display: 'standalone',
  background_color: '#f4f8f6',
  theme_color: '#047857',
  icons: [
    { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
    { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
  ],
};
