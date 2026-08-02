import { bindLenisScroll, clamp01, getScroll, smoothstep } from "./scroll-helpers";
import { ensureScrollFlight } from "./scroll-flight";

/**
 * Scroll-links the floating glass hero nav into the compact full-bleed bar.
 * Progress is pure scroll — no CSS transitions on --nav-t (those would lag).
 */
export function initNavMorph() {
  const header = document.querySelector<HTMLElement>("[data-site-header]");
  if (!header) return;

  const prev = (header as unknown as { __morphAbort?: AbortController }).__morphAbort;
  prev?.abort();
  const ac = new AbortController();
  (header as unknown as { __morphAbort?: AbortController }).__morphAbort = ac;
  const { signal } = ac;

  const flight = ensureScrollFlight();
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Short window so the morph finishes while the hero is still mostly on screen.
  const START = 6;
  const END = 160;

  let lastT = -1;
  let ready = false;

  function progress(y: number): number {
    if (reduce) return y > 28 ? 1 : 0;
    return smoothstep(clamp01((y - START) / (END - START)));
  }

  function paint() {
    if (signal.aborted) return;
    const t = progress(flight.y);
    if (Math.abs(t - lastT) < 0.001) return;
    lastT = t;
    header.style.setProperty("--nav-t", t.toFixed(4));
    header.classList.toggle("is-docked", t > 0.92);
    header.classList.toggle("is-scrolled", t > 0.35);
  }

  function reveal() {
    if (signal.aborted || ready) return;
    ready = true;
    header.classList.add("is-ready");
    paint();
    flight.kick();
  }

  header.style.setProperty("--nav-t", "0");
  header.classList.remove("is-ready", "is-docked", "is-scrolled");
  header.removeAttribute("inert");
  header.style.pointerEvents = "auto";

  const unsub = flight.on(() => {
    if (ready) paint();
  });
  const unbindLenis = bindLenisScroll("navMorph", () => flight.kick(), header);

  window.addEventListener("scroll", () => flight.kick(), { passive: true, signal });
  window.addEventListener(
    "resize",
    () => {
      flight.measure();
      paint();
    },
    { passive: true, signal },
  );

  // Boot after first paint so entrance and morph don't fight.
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      if (getScroll() > 8) {
        reveal();
        return;
      }
      window.setTimeout(reveal, 80);
    });
  });

  signal.addEventListener("abort", () => {
    unsub();
    unbindLenis();
  });
}
