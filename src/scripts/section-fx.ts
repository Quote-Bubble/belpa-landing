import { ensureScrollFlight } from "./scroll-flight";
import { clamp01, smoothstep } from "./scroll-helpers";

/**
 * Scroll-LINKED section drama. Each `[data-fx]` element is driven continuously
 * by how far it has climbed through the viewport, not a one-shot reveal — so
 * the motion tracks the scroll exactly and reads as cinematic.
 *
 * Effects write the individual `scale` / `translate` / `rotate` CSS properties
 * (NOT `transform`), so they compose cleanly on top of the one-shot `transform`
 * entrances from the `[data-reveal]` system without either clobbering the other.
 *
 * Desktop + motion-OK only: on touch the existing cheap IntersectionObserver
 * reveals carry the drama, keeping momentum scrolling perfectly smooth.
 */
export function initSectionFx(): () => void {
  const noop = () => {};
  if (typeof window === "undefined") return noop;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return noop;
  if (!window.matchMedia("(min-width: 640px)").matches) return noop;

  const items = Array.from(
    document.querySelectorAll<HTMLElement>("[data-fx]"),
  ).map((el) => ({ el, fx: el.dataset.fx || "" }));
  if (!items.length) return noop;

  const flight = ensureScrollFlight();

  // 0 when the element's top sits at the bottom edge of the viewport, 1 once it
  // has risen ~72% of a screen height — the band over which the effect plays.
  function enterP(el: HTMLElement, vh: number): number {
    const top = el.getBoundingClientRect().top;
    return smoothstep(clamp01((vh - top) / (vh * 0.72)));
  }

  function apply(el: HTMLElement, fx: string, vh: number) {
    const p = enterP(el, vh);
    const inv = 1 - p;
    switch (fx) {
      // Satellite: plunges in from orbit — small and low, zooming up to full.
      case "orbit":
        el.style.scale = (0.6 + 0.4 * p).toFixed(4);
        el.style.translate = `0 ${(inv * 130).toFixed(1)}px`;
        break;
      // Dashboard: tips up out of a 3D lean into a flat, face-on panel.
      case "tilt":
        el.style.scale = (0.86 + 0.14 * p).toFixed(4);
        el.style.translate = `0 ${(inv * 100).toFixed(1)}px`;
        el.style.rotate = `x ${(inv * 20).toFixed(2)}deg`;
        break;
      // Copy riding alongside a bigger neighbour — a gentle counter-rise.
      case "lift":
        el.style.translate = `0 ${(inv * -30).toFixed(1)}px`;
        break;
      // Footer wordmark: swells up out of the floor as you hit the bottom.
      case "giant":
        el.style.scale = (0.82 + 0.26 * p).toFixed(4);
        el.style.translate = `0 ${(inv * 80).toFixed(1)}px`;
        break;
    }
  }

  function paint() {
    const vh = flight.vh;
    for (const { el, fx } of items) apply(el, fx, vh);
  }

  for (const { el } of items) el.style.willChange = "transform";

  const off = flight.on(paint);
  paint();
  flight.kick();

  return () => {
    off();
    for (const { el } of items) {
      el.style.willChange = "";
      el.style.scale = "";
      el.style.translate = "";
      el.style.rotate = "";
    }
  };
}
