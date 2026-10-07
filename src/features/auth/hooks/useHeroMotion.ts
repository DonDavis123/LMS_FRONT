"use client";

import { useEffect, type RefObject } from "react";

/** Maximum pointer tilt in degrees, per axis. */
const MAX_TILT_DEG = 6;
/** Fraction of the remaining distance covered each frame (easing). */
const EASE = 0.08;
const SETTLE_EPSILON = 0.01;

const FINE_POINTER = "(hover: hover) and (pointer: fine)";

/**
 * Behaviour for the brand-panel hero.
 *
 * 1. Pause: sets `data-paused="true"` on the hero while the tab is hidden or
 *    the hero is off-screen, so CSS can freeze the idle animation.
 * 2. Tilt (only when `tiltEnabled`, on fine pointers): eases a few degrees of
 *    rotation towards the pointer by writing `--lp-tilt-x/y` on the tilt
 *    element. One requestAnimationFrame loop runs only while the value is
 *    still moving, so an idle page costs nothing.
 */
export function useHeroMotion(
  heroRef: RefObject<HTMLDivElement | null>,
  tiltRef: RefObject<HTMLDivElement | null>,
  tiltEnabled: boolean
) {
  useEffect(() => {
    const hero = heroRef.current;
    if (!hero) return;

    let onScreen = true;
    const syncPause = () => {
      const paused = document.hidden || !onScreen;
      hero.dataset.paused = paused ? "true" : "false";
    };

    const observer = new IntersectionObserver(([entry]) => {
      onScreen = entry.isIntersecting;
      syncPause();
    });
    observer.observe(hero);
    document.addEventListener("visibilitychange", syncPause);
    syncPause();

    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", syncPause);
    };
  }, [heroRef]);

  useEffect(() => {
    const hero = heroRef.current;
    const tilt = tiltRef.current;
    if (!tiltEnabled || !hero || !tilt) return;
    if (!window.matchMedia(FINE_POINTER).matches) return;

    // Track the whole brand panel so the tilt responds across its width.
    const area = hero.closest<HTMLElement>("[data-lp-pointer-area]") ?? hero;

    let targetX = 0;
    let targetY = 0;
    let currentX = 0;
    let currentY = 0;
    let frame = 0;

    const step = () => {
      currentX += (targetX - currentX) * EASE;
      currentY += (targetY - currentY) * EASE;
      tilt.style.setProperty("--lp-tilt-x", `${currentX.toFixed(3)}deg`);
      tilt.style.setProperty("--lp-tilt-y", `${currentY.toFixed(3)}deg`);

      const settled =
        Math.abs(targetX - currentX) < SETTLE_EPSILON &&
        Math.abs(targetY - currentY) < SETTLE_EPSILON;
      frame = settled ? 0 : window.requestAnimationFrame(step);
    };
    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(step);
    };

    const onMove = (event: PointerEvent) => {
      if (hero.dataset.paused === "true") return;
      const rect = area.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      const nx = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      const ny = ((event.clientY - rect.top) / rect.height) * 2 - 1;
      targetY = Math.max(-1, Math.min(1, nx)) * MAX_TILT_DEG;
      targetX = Math.max(-1, Math.min(1, ny)) * -MAX_TILT_DEG;
      schedule();
    };
    const onLeave = () => {
      targetX = 0;
      targetY = 0;
      schedule();
    };

    area.addEventListener("pointermove", onMove);
    area.addEventListener("pointerleave", onLeave);
    return () => {
      area.removeEventListener("pointermove", onMove);
      area.removeEventListener("pointerleave", onLeave);
      if (frame) window.cancelAnimationFrame(frame);
      tilt.style.removeProperty("--lp-tilt-x");
      tilt.style.removeProperty("--lp-tilt-y");
    };
  }, [heroRef, tiltRef, tiltEnabled]);
}
