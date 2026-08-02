/**
 * Lightweight landing analytics. Forwards to dataLayer when present, and
 * logs failures for quote attempts. Safe no-op if nothing is listening.
 */

export type HeroAnalyticsEvent =
  | "hero_input_focus"
  | "hero_generate_click"
  | "hero_form_success"
  | "hero_form_failure"
  | "hero_book_call_click"
  | "nav_try_demo_click"
  | "nav_book_call_click";

type Props = Record<string, string | number | boolean | undefined>;

declare global {
  interface Window {
    dataLayer?: Array<Record<string, unknown>>;
    __quoterTrack?: (event: string, props?: Props) => void;
  }
}

export function track(event: HeroAnalyticsEvent | string, props: Props = {}) {
  const payload = {
    event,
    ...props,
    ts: Date.now(),
    path: typeof location !== "undefined" ? location.pathname : undefined,
  };

  try {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push(payload);
  } catch {
    /* ignore */
  }

  try {
    window.dispatchEvent(
      new CustomEvent("quoter:analytics", { detail: payload }),
    );
  } catch {
    /* ignore */
  }

  if (import.meta.env.DEV) {
    console.info("quoter analytics", event, props);
  }
}

/** Structured error log for failed sample-quote attempts. */
export function logQuoteError(reason: string, detail?: Props) {
  const entry = {
    source: "quoter-landing",
    type: "sample_quote_error",
    reason,
    ...detail,
    ts: Date.now(),
  };
  try {
    console.error("quoter quote error", entry);
  } catch {
    /* ignore */
  }
  track("hero_form_failure", { reason, ...detail });
}

export function bindAnalytics() {
  window.__quoterTrack = track;
}
