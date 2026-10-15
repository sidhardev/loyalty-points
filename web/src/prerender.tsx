// Build-time only (scripts/prerender.mjs): renders the homepage to HTML so search engines and link previews get the
// whole page without running JavaScript. The browser then hydrates it (main.tsx).
import { prerenderToNodeStream } from 'react-dom/static';
import { App } from './App';

export { FAQ, FONTS } from './pages/Landing';

/** The homepage as HTML. The caller sets `location` to the homepage, since App picks the page from the URL. */
export async function renderHome() {
  const { prelude } = await prerenderToNodeStream(<App />);
  let html = '';
  for await (const chunk of prelude) html += chunk;
  return html;
}
