import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  // Required for canonical URLs and the sitemap. Without it Astro.site is
  // undefined, canonicals can't be built, and @astrojs/sitemap emits nothing.
  // Apex, no www — vercel.json redirects www here so only one host is indexed.
  site: 'https://belpa.co.uk',
  integrations: [
    sitemap({
      // Must match the canonical in Layout.astro and vercel.json's
      // trailingSlash rule exactly: root keeps "/", everything else drops it.
      // The default emits "/privacy/" while the canonical says "/privacy",
      // which points Google at a different URL than the one being declared.
      serialize: (item) => ({
        ...item,
        url: item.url.replace(/(?<!\/)\/$/, ''),
      }),
    }),
  ],
  build: {
    // Single-page site with one stylesheet: inlining it removes the
    // render-blocking CSS request entirely, so first paint needs nothing
    // but the HTML document itself.
    inlineStylesheets: "always",
  },
  vite: {
    plugins: [tailwindcss()],
  },
});
