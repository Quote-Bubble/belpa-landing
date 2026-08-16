/**
 * The one roof the site draws, shared by the intro and the hero's RoofStory.
 *
 * Both trace the same outline over the same photo, and the intro hands its roof
 * off to the hero panel as it pulls back — so if these two ever held different
 * paths, the handoff would visibly jump at the moment they swap. Keeping the
 * geometry in one place makes that class of bug impossible rather than unlikely.
 *
 * Coordinates are in a 1024x768 viewBox, matching the 4:3 photo, and every
 * consumer must render it with preserveAspectRatio="xMidYMid slice" so the
 * outline stays locked to the roof at any container aspect.
 */
export const ROOF_PATH =
  "M277 356 L277 408 L277 480 L277 508 L308 512 L335 517 L339 533 L339 544 L411 545 L474 545 L534 545 L571 547 L625 548 L677 548 L724 551 L725 534 L774 526 L789 513 L807 490 L808 450 L794 428 L784 423 L784 387 L783 341 L777 318 L778 287 L778 255 L725 245 L669 241 L616 239 L611 201 L600 200 L601 141 L546 138 L494 140 L482 140 L479 197 L469 207 L467 239 L362 239 L357 324 L341 334 L342 354 L314 357 Z";

/** Describes the specific house in the photo; not measured at runtime. */
export const ROOF_AREA_M2 = 118;

/** The photo the outline is traced over. */
export const ROOF_PHOTO = "/satellite-roof.webp";
