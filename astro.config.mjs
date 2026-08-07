import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import sitemap from '@astrojs/sitemap';
import sentry from '@sentry/astro';

// https://astro.build/config
export default defineConfig({
  // Required for canonical URLs and the sitemap. Without it Astro.site is
  // undefined, canonicals can't be built, and @astrojs/sitemap emits nothing.
  // Apex, no www — vercel.json redirects www here so only one host is indexed.
  site: 'https://belpa.co.uk',
  integrations: [
    // Only registers when a DSN is present, so local builds stay clean. This
    // site is static, so what it catches is browser-side: the Lenis/embed
    // wiring in Hero.astro and LiveWidget.astro, which is the most intricate
    // code here and the part that decides whether a visitor can get a quote
    // at all.
    ...(process.env.PUBLIC_SENTRY_DSN
      ? [
          sentry({
            dsn: process.env.PUBLIC_SENTRY_DSN,
            environment: process.env.VERCEL_ENV || 'development',
            tracesSampleRate: 0,
            replaysSessionSampleRate: 0,
            replaysOnErrorSampleRate: 0,
            sourceMapsUploadOptions: {
              enabled: Boolean(process.env.SENTRY_AUTH_TOKEN),
              org: process.env.SENTRY_ORG,
              project: process.env.SENTRY_PROJECT,
              authToken: process.env.SENTRY_AUTH_TOKEN,
            },
          }),
        ]
      : []),
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
