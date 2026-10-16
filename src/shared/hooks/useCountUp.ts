import { useEffect, useRef, useState } from "react";

/**
 * Animates a number towards `target` whenever it changes, starting from the
 * value currently on screen. Users who prefer reduced motion get the final
 * value on the next frame instead of a count.
 */
export function useCountUp(target: number, duration = 600): number {
  const [value, setValue] = useState(0);
  const shownRef = useRef(0);

  useEffect(() => {
    const from = shownRef.current;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const total = reduceMotion ? 0 : duration;
    const startTime = performance.now();
    let frame = 0;

    function tick(now: number) {
      const progress = total === 0 ? 1 : Math.min((now - startTime) / total, 1);
      // easeOutCubic — quick start, gentle settle at the end.
      const eased = 1 - Math.pow(1 - progress, 3);
      const next = Math.round(from + (target - from) * eased);
      shownRef.current = next;
      setValue(next);
      if (progress < 1) frame = requestAnimationFrame(tick);
    }

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, duration]);

  return value;
}
