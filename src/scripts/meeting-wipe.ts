import {
  bindLenisScroll,
  clamp,
  clamp01,
  getScroll,
  range,
  smoothstep,
} from "./scroll-helpers";
import { ensureScrollFlight } from "./scroll-flight";

type Box = { x: number; y: number; w: number; h: number };

/**
 * "Book a call" hands off from the hero to the navbar by dissolving, not by
 * flying. It softens into the background — blur out, drift up, fade — right as
 * the nav pill forms over the hero, then re-forms sharp in the top right.
 *
 * The phases are keyed to the WORDMARK's dock range rather than to the
 * button's own position, so the two read as one choreographed move: the nav
 * assembles itself, and the button is part of what assembles.
 */
export function initMeetingWipe() {
  const fly = document.querySelector<HTMLElement>("[data-meeting-fly]");
  const hero = document.querySelector<HTMLElement>("[data-meeting-spacer]");
  const label = document.querySelector<HTMLElement>("[data-meeting-label]");
  const glass = document.querySelector<HTMLElement>("[data-glass-nav]");
  const slot = document.querySelector<HTMLElement>("[data-nav-meeting-slot]");
  if (!fly || !hero || !label || !glass || !slot) return;

  const prev = (fly as unknown as { __morphAbort?: AbortController }).__morphAbort;
  prev?.abort();
  const ac = new AbortController();
  (fly as unknown as { __morphAbort?: AbortController }).__morphAbort = ac;
  const { signal } = ac;
  const flight = ensureScrollFlight();
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const MAX_BLUR = 30;   // px — comparable to the button's own height
  const DRIFT = 14;      // px it rises as it dissolves

  let dock: Box = { x: 0, y: 0, w: 132, h: 40 };
  let phases = { a0: 0, a1: 0, b0: 0, b1: 0 };
  let ready = false;
  let running = true;

  function measure() {
    // Dock into the right-hand slot of the unified nav pill rather than the
    // screen corner — the button reforms as part of the bar, not beside it.
    // The slot is laid out even while the pill is transparent, so its rect is
    // valid from boot.
    const r0 = slot.getBoundingClientRect();
    dock = { x: r0.left, y: r0.top, w: r0.width, h: r0.height };

    // Anchored to the button's own position, not the wordmark's, so it stays
    // put for most of the hero and only lets go near the top of the viewport.
    // a1 lands 40px before the button would scroll out, so the dissolve always
    // finishes ON SCREEN — it has to visibly go, not get clipped away.
    const vh = window.innerHeight;
    const r = hero.getBoundingClientRect();
    const btnTop = r.top + getScroll();
    const a1 = btnTop - 40;
    const a0 = Math.max(60, a1 - clamp(220, vh * 0.34, 340));
    const b0 = a1 + clamp(40, vh * 0.06, 80);
    const b1 = b0 + clamp(120, vh * 0.17, 200);
    phases = { a0, a1, b0, b1 };
  }

  function applyDockStyles() {
    fly.classList.add("is-docked");
    fly.style.width = `${dock.w}px`;
    fly.style.height = `${dock.h}px`;
    fly.style.padding = "0.48rem 0.72rem";
    fly.style.fontSize = "0.78rem";
    fly.style.gap = "0.3rem";
    fly.style.borderRadius = "999px";
    fly.style.transform = `translate3d(${dock.x}px, ${dock.y}px, 0)`;
  }

  /**
   * d = 0 fully solid, d = 1 fully gone.
   *
   * Blurring a 620×48 filled bar does NOT disperse it — it just softens the
   * edges, so a linear blur+fade spends most of its time as a solid blue
   * lozenge and then vanishes. The fix is to make opacity fall much faster
   * than blur grows (quadratic vs sub-linear), so by the time it is blurry
   * enough to read as atmosphere it is already nearly transparent, plus a
   * slight scale-up so it expands outward instead of just going.
   */
  function setDissolve(el: HTMLElement, d: number, rise: number, spread = 0.05) {
    if (d <= 0.001) {
      el.classList.remove("is-dissolving");
      el.style.removeProperty("--dz-blur");
      el.style.removeProperty("--dz-opacity");
      el.style.removeProperty("--dz-rise");
      el.style.removeProperty("--dz-scale");
      return;
    }
    el.classList.add("is-dissolving");
    el.style.setProperty("--dz-blur", `${(Math.pow(d, 1.2) * MAX_BLUR).toFixed(2)}px`);
    el.style.setProperty("--dz-opacity", Math.pow(1 - clamp01(d), 2.2).toFixed(3));
    el.style.setProperty("--dz-scale", (1 + d * spread).toFixed(4));
    el.style.setProperty("--dz-rise", `${(-d * rise).toFixed(2)}px`);
  }

  function paint() {
    if (!running || !ready) return;
    if (
      document.documentElement.classList.contains("quoter-flow-open") ||
      document.documentElement.classList.contains("quoter-suggesting")
    ) {
      return;
    }

    const y = flight.y;
    const { a0, a1, b0, b1 } = phases;

    if (reduce) {
      const showDock = y > a1;
      setDissolve(hero, 0, DRIFT);
      setDissolve(fly, 0, DRIFT);
      hero.style.visibility = showDock ? "hidden" : "visible";
      hero.style.pointerEvents = showDock ? "none" : "auto";
      fly.style.visibility = showDock ? "visible" : "hidden";
      fly.style.pointerEvents = showDock ? "auto" : "none";
      fly.classList.toggle("is-ready", showDock);
      if (showDock) applyDockStyles();
      return;
    }

    const out = smoothstep(range(y, a0, a1));
    const inn = smoothstep(range(y, b0, b1));

    // Hero copy: solid → dissolved. Note it stays AT d=1 once gone rather
    // than being reset to solid — the dissolve state has to survive being
    // hidden, or scrolling back up re-reveals a solid button for a frame
    // before the next paint blurs it again.
    setDissolve(hero, out, DRIFT);
    hero.style.visibility = out < 1 ? "visible" : "hidden";
    hero.style.pointerEvents = out > 0.5 ? "none" : "auto";

    // Docked copy: blurs in where it already is. No rise and no spread —
    // .meeting-fly has transform-origin: 0 0, so scaling it made the button
    // grow out to the right and read as sliding in from off-screen.
    if (inn <= 0) {
      setDissolve(fly, 1, 0, 0);
      fly.style.visibility = "hidden";
      fly.style.pointerEvents = "none";
      fly.classList.remove("is-ready");
      return;
    }

    applyDockStyles();
    fly.classList.add("is-ready");
    setDissolve(fly, 1 - inn, 0, 0);
    fly.style.visibility = "visible";
    fly.style.pointerEvents = inn > 0.6 ? "auto" : "none";
    label.textContent = "Book a call";
  }

  function boot() {
    if (signal.aborted || ready) return;
    document.documentElement.classList.remove("is-meeting-morphing");
    measure();
    fly.style.visibility = "hidden";
    fly.style.pointerEvents = "none";
    applyDockStyles();
    ready = true;
    paint();
    requestAnimationFrame(() => {
      measure();
      paint();
      flight.kick();
    });
  }

  const unsub = flight.on(() => {
    if (ready) paint();
  });
  const unbindLenis = bindLenisScroll("meeting", () => flight.kick(), fly);

  window.addEventListener("scroll", () => flight.kick(), { passive: true, signal });
  // Only re-measure on a real WIDTH change. On mobile the URL bar toggling
  // fires resize with a height-only change, and re-running measure() there
  // recomputes the vh-based phases mid-scroll, which jolts the wipe (the
  // "breaks on mobile" bug). The button's dock range is svh-stable regardless.
  let lastW = window.innerWidth;
  window.addEventListener(
    "resize",
    () => {
      const w = window.innerWidth;
      if (w !== lastW) {
        lastW = w;
        measure();
      }
      flight.measure();
      paint();
    },
    { passive: true, signal },
  );
  window.addEventListener(
    "pageshow",
    () => {
      measure();
      paint();
    },
    { signal },
  );

  // The hero button rises into place via `widget-rise` (0.95s, delayed 1.7s),
  // so a boot-time measurement is taken while it is still translated. The
  // wordmark spacer settles earlier, but re-measure on both to be safe.
  hero.addEventListener(
    "animationend",
    (e) => {
      if ((e as AnimationEvent).animationName !== "widget-rise") return;
      measure();
      paint();
    },
    { signal },
  );
  document.fonts?.ready?.then(() => {
    if (ready) {
      measure();
      paint();
    }
  });

  let booted = false;
  const scheduleBoot = () => {
    if (booted || signal.aborted) return;
    booted = true;
    requestAnimationFrame(() => requestAnimationFrame(boot));
  };
  document.fonts?.ready?.then(() => window.setTimeout(scheduleBoot, 200));
  window.setTimeout(scheduleBoot, 400);

  signal.addEventListener("abort", () => {
    running = false;
    unsub();
    unbindLenis();
    document.documentElement.classList.remove("is-meeting-morphing");
    fly.classList.remove("is-ready", "is-docked", "is-dissolving");
    hero.classList.remove("is-dissolving");
    fly.style.cssText = "";
  });
}
