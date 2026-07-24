export function clamp(min: number, value: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function clamp01(value: number): number {
  return clamp(0, value, 1);
}

export function range(y: number, a: number, b: number): number {
  if (b === a) return y >= b ? 1 : 0;
  return clamp01((y - a) / (b - a));
}

export function smootherstep(t: number): number {
  const u = clamp01(t);
  return u * u * u * (u * (u * 6 - 15) + 10);
}

export function smoothstep(t: number): number {
  const u = clamp01(t);
  return u * u * (3 - 2 * u);
}

export function easeInQuad(t: number): number {
  const u = clamp01(t);
  return u * u;
}

export function easeOutQuad(t: number): number {
  const u = clamp01(t);
  return 1 - (1 - u) * (1 - u);
}

/**
 * The scroll window over which the hero wordmark flies into the nav, shared by
 * the wordmark itself and the Book-a-call handoff so the two stay choreographed.
 *
 * The end is geometric, not a taste value: it is the scroll position at which
 * the wordmark's natural (un-morphed) position would coincide with the dock.
 * Running past it makes the lerp overshoot the navbar and bounce back.
 */
export function dockRange(
  spacer: HTMLElement,
  slot: HTMLElement,
  scrollY: number,
): { start: number; end: number } {
  const s = spacer.getBoundingClientRect();
  const d = slot.getBoundingClientRect();
  const start = 10;
  return { start, end: Math.max(160, s.top + scrollY - d.top) };
}

export function getScroll(): number {
  const lenis = window.__lenis;
  if (lenis && typeof lenis.scroll === "number") return lenis.scroll;
  return window.scrollY || document.documentElement.scrollTop || 0;
}

export function bindLenisScroll(
  key: string,
  onScroll: () => void,
  host: HTMLElement,
): () => void {
  const flag = `__lenisBound_${key}`;
  let timer = 0;

  const tryBind = () => {
    const lenis = window.__lenis;
    if (!lenis?.on || (host as unknown as Record<string, boolean>)[flag]) return;
    (host as unknown as Record<string, boolean>)[flag] = true;
    lenis.on("scroll", onScroll);
  };

  tryBind();
  timer = window.setInterval(() => {
    tryBind();
    if ((host as unknown as Record<string, boolean>)[flag]) {
      window.clearInterval(timer);
    }
  }, 100);
  window.setTimeout(() => window.clearInterval(timer), 2000);

  return () => {
    window.clearInterval(timer);
    (host as unknown as Record<string, boolean>)[flag] = false;
  };
}

declare global {
  interface Window {
    __lenis?: {
      scroll?: number;
      on?: (event: string, fn: () => void) => void;
      scrollTo?: (target: number | HTMLElement, opts?: unknown) => void;
    };
  }
}
