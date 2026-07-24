import { getScroll } from "./scroll-helpers";

export type ScrollFlight = {
  readonly y: number;
  readonly vh: number;
  on: (fn: () => void) => () => void;
  kick: () => void;
  measure: () => void;
  destroy: () => void;
};

export function ensureScrollFlight(): ScrollFlight {
  const g = window as Window & { __scrollFlight?: ScrollFlight | null };
  if (g.__scrollFlight) return g.__scrollFlight;

  const listeners = new Set<() => void>();
  let y = 0;
  let vh = window.innerHeight;
  let frozenW = window.innerWidth;
  let measureRaf = 0;
  let paintRaf = 0;

  function notify() {
    listeners.forEach((fn) => fn());
  }

  function schedulePaint() {
    if (paintRaf) return;
    paintRaf = requestAnimationFrame(() => {
      paintRaf = 0;
      y = getScroll();
      notify();
    });
  }

  function measure() {
    const nextW = window.innerWidth;
    const nextH = window.innerHeight;
    if (nextW !== frozenW || Math.abs(nextH - vh) > 120) {
      frozenW = nextW;
      vh = nextH;
    }
    schedulePaint();
  }

  function scheduleMeasure() {
    if (measureRaf) return;
    measureRaf = requestAnimationFrame(() => {
      measureRaf = 0;
      measure();
    });
  }

  const onScroll = () => schedulePaint();
  const onResize = () => scheduleMeasure();

  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onResize, { passive: true });
  window.addEventListener("pageshow", scheduleMeasure, { passive: true });
  window.addEventListener("quoter:lenis", schedulePaint as EventListener);
  document.fonts?.ready?.then(() => scheduleMeasure());

  const shell = document.querySelector("[data-widget-shell]");
  const ro =
    shell && typeof ResizeObserver !== "undefined"
      ? new ResizeObserver(() => scheduleMeasure())
      : null;
  if (shell && ro) ro.observe(shell);

  const api: ScrollFlight = {
    get y() {
      return y;
    },
    get vh() {
      return vh;
    },
    on(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    kick() {
      schedulePaint();
    },
    measure: scheduleMeasure,
    destroy() {
      cancelAnimationFrame(measureRaf);
      cancelAnimationFrame(paintRaf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("pageshow", scheduleMeasure);
      window.removeEventListener("quoter:lenis", schedulePaint as EventListener);
      ro?.disconnect();
      listeners.clear();
      g.__scrollFlight = null;
    },
  };

  g.__scrollFlight = api;
  scheduleMeasure();
  return api;
}
