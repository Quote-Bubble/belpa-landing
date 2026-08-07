/**
 * Hero roof-story loops. Scene 1 ships with the live satellite asset.
 * Scenes 2–3 activate automatically once their images exist in /public
 * (probe via Image() in RoofStory.astro — drop the .webp files to cycle).
 *
 * Prices for scene 1 are from calculateReplacementEstimate() against the
 * belpa-landing-demo config. Scenes 2–3 use scaled indicative bands — re-run
 * the calculator when you lock final roof geometry.
 *
 * SVG viewBox is 1024×768; polygons are authored so roof footprints sit
 * roughly centred. Match silhouettes when generating terrace/bungalow photos.
 */

export type Pt = { x: number; y: number };
export type Edge = {
  len: number;
  angle: number;
  x: number;
  y: number;
  metres: string;
};

export type RoofScene = {
  id: string;
  postcode: string;
  price: string;
  meta: string;
  shape: string;
  areaM2: number;
  roofPath: string;
  photo: string;
  photo760: string;
  corners: Pt[];
  edges: Edge[];
  centroid: Pt;
};

function signedArea(p: Pt[]): number {
  let a = 0;
  for (let i = 0; i < p.length; i++) {
    const q = p[(i + 1) % p.length];
    a += p[i].x * q.y - q.x * p[i].y;
  }
  return a / 2;
}

function centroidOf(p: Pt[]): Pt {
  let cx = 0;
  let cy = 0;
  const a = signedArea(p);
  for (let i = 0; i < p.length; i++) {
    const q = p[(i + 1) % p.length];
    const f = p[i].x * q.y - q.x * p[i].y;
    cx += (p[i].x + q.x) * f;
    cy += (p[i].y + q.y) * f;
  }
  return { x: cx / (6 * a), y: cy / (6 * a) };
}

function parsePath(roofPath: string): Pt[] {
  return [...roofPath.matchAll(/([ML])\s*(-?[\d.]+)\s+(-?[\d.]+)/g)].map((m) => ({
    x: Number(m[2]),
    y: Number(m[3]),
  }));
}

function buildScene(
  base: Omit<RoofScene, "corners" | "edges" | "centroid">,
): RoofScene {
  const pts = parsePath(base.roofPath);
  const scale = Math.sqrt(base.areaM2 / Math.abs(signedArea(pts)));
  const c = centroidOf(pts);

  const corners = pts.filter((p, i) => {
    const prev = pts[(i - 1 + pts.length) % pts.length];
    const next = pts[(i + 1) % pts.length];
    const a1 = Math.atan2(p.y - prev.y, p.x - prev.x);
    const a2 = Math.atan2(next.y - p.y, next.x - p.x);
    let d = ((a2 - a1) * 180) / Math.PI;
    while (d > 180) d -= 360;
    while (d < -180) d += 360;
    return Math.abs(d) >= 25;
  });

  const edges = corners
    .map((p, i) => {
      const q = corners[(i + 1) % corners.length];
      const dx = q.x - p.x;
      const dy = q.y - p.y;
      const mid = { x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 };
      const ox = mid.x - c.x;
      const oy = mid.y - c.y;
      const on = Math.hypot(ox, oy) || 1;
      let angle = (Math.atan2(dy, dx) * 180) / Math.PI;
      if (angle > 90) angle -= 180;
      if (angle < -90) angle += 180;
      return {
        len: Math.hypot(dx, dy),
        angle,
        x: mid.x + (ox / on) * 22,
        y: mid.y + (oy / on) * 22,
        metres: (Math.hypot(dx, dy) * scale).toFixed(1),
      };
    })
    .sort((a, b) => b.len - a.len)
    .slice(0, 4);

  return { ...base, corners, edges, centroid: c };
}

/** Famous / institutional postcodes — not a private customer's house. */
export const ROOF_SCENES: RoofScene[] = [
  buildScene({
    id: "westminster",
    postcode: "SW1A 1AA",
    price: "£11,500 – £18,750",
    meta: "Hipped · 35° pitch · 2 storeys",
    shape: "hipped roof",
    areaM2: 118,
    // Existing traced outline for /satellite-roof.webp
    roofPath:
      "M277 356 L277 408 L277 480 L277 508 L308 512 L335 517 L339 533 L339 544 L411 545 L474 545 L534 545 L571 547 L625 548 L677 548 L724 551 L725 534 L774 526 L789 513 L807 490 L808 450 L794 428 L784 423 L784 387 L783 341 L777 318 L778 287 L778 255 L725 245 L669 241 L616 239 L611 201 L600 200 L601 141 L546 138 L494 140 L482 140 L479 197 L469 207 L467 239 L362 239 L357 324 L341 334 L342 354 L314 357 Z",
    photo: "/satellite-roof.webp",
    photo760: "/satellite-roof-760.webp",
  }),
  buildScene({
    id: "terrace",
    postcode: "EH99 1SP",
    price: "£8,400 – £13,600",
    meta: "Gable · 40° pitch · 2 storeys",
    shape: "gable roof",
    areaM2: 86,
    // Long rectangular terrace footprint, centred in 1024×768 — match this
    // silhouette when generating satellite-roof-terrace.webp
    roofPath: "M268 318 L756 318 L756 498 L268 498 Z",
    photo: "/satellite-roof-terrace.webp",
    photo760: "/satellite-roof-terrace-760.webp",
  }),
  buildScene({
    id: "bungalow",
    postcode: "CF99 1SN",
    price: "£9,800 – £15,900",
    meta: "Hip · 30° pitch · bungalow",
    shape: "hipped roof",
    areaM2: 102,
    // L-plan bungalow + garage wing — match when generating
    // satellite-roof-bungalow.webp
    roofPath:
      "M220 260 L620 260 L620 400 L800 400 L800 580 L220 580 Z",
    photo: "/satellite-roof-bungalow.webp",
    photo760: "/satellite-roof-bungalow-760.webp",
  }),
];
