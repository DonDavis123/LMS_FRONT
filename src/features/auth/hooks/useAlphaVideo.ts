"use client";

import { useEffect, useState, type RefObject } from "react";

interface AlphaVideoOptions {
  /** Video used while the page is in light mode. */
  lightSrc: string;
  /** Video used while the page is in dark mode. */
  darkSrc: string;
  /** Width of ONE half of the video frame, in pixels (the canvas width). */
  width: number;
  /** Height of the video frame, in pixels (the canvas height). */
  height: number;
}

type VideoWithFrameCallback = HTMLVideoElement & {
  requestVideoFrameCallback?: (cb: () => void) => number;
  cancelVideoFrameCallback?: (handle: number) => void;
};

const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";

/**
 * Plays a transparent animation on a <canvas>.
 *
 * Browsers cannot decode H.264 with an alpha channel, so each hero video is
 * stored side by side: the left half is the colour picture, the right half is
 * a grey matte (white = opaque). Every video frame is split here and written
 * to the canvas as RGBA, which gives a true transparent background — no
 * rectangle, and it sits correctly on both the light and the dark panel.
 *
 * Behaviour:
 *  - Nothing is downloaded until the hero is actually on screen (so the
 *    brand panel costs nothing on phones, where it is `display: none`).
 *  - Playback pauses while the tab is hidden or the hero is scrolled away.
 *  - `prefers-reduced-motion` keeps the still image; the video never loads.
 *  - Follows the `.dark` class on <html>, swapping to the dark artwork and
 *    carrying on from the same point in the loop.
 *
 * Presentation only: it never touches auth state or the API.
 */
export function useAlphaVideo(
  wrapRef: RefObject<HTMLDivElement | null>,
  canvasRef: RefObject<HTMLCanvasElement | null>,
  videoRef: RefObject<HTMLVideoElement | null>,
  { lightSrc, darkSrc, width, height }: AlphaVideoOptions
): { ready: boolean } {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    const video = videoRef.current as VideoWithFrameCallback | null;
    if (!wrap || !canvas || !video) return;

    const ctx = canvas.getContext("2d");
    const work = document.createElement("canvas");
    work.width = width * 2;
    work.height = height;
    const wctx = work.getContext("2d", { willReadFrequently: true });
    if (!ctx || !wctx) return;

    const out = ctx.createImageData(width, height);
    const reduced = window.matchMedia(REDUCED_MOTION);

    let disposed = false;
    let onScreen = false;
    let tabVisible = !document.hidden;
    let currentSrc = "";
    let frameHandle = 0;

    const wantedSrc = () =>
      document.documentElement.classList.contains("dark") ? darkSrc : lightSrc;

    /** Split the side-by-side frame into colour + matte and draw it. */
    const paint = () => {
      if (video.readyState < 2) return;
      wctx.drawImage(video, 0, 0, width * 2, height);
      const color = wctx.getImageData(0, 0, width, height).data;
      const matte = wctx.getImageData(width, 0, width, height).data;
      const dst = out.data;
      for (let i = 0; i < dst.length; i += 4) {
        dst[i] = color[i];
        dst[i + 1] = color[i + 1];
        dst[i + 2] = color[i + 2];
        dst[i + 3] = matte[i];
      }
      ctx.putImageData(out, 0, 0);
    };

    const cancelLoop = () => {
      if (!frameHandle) return;
      if (video.cancelVideoFrameCallback) video.cancelVideoFrameCallback(frameHandle);
      else window.cancelAnimationFrame(frameHandle);
      frameHandle = 0;
    };

    let firstFrameDrawn = false;
    const tick = () => {
      frameHandle = 0;
      if (disposed) return;
      paint();
      if (!firstFrameDrawn && video.readyState >= 2) {
        firstFrameDrawn = true;
        setReady(true);
      }
      if (video.paused) return;
      frameHandle = video.requestVideoFrameCallback
        ? video.requestVideoFrameCallback(tick)
        : window.requestAnimationFrame(tick);
    };

    const startLoop = () => {
      if (frameHandle || disposed) return;
      frameHandle = video.requestVideoFrameCallback
        ? video.requestVideoFrameCallback(tick)
        : window.requestAnimationFrame(tick);
    };

    const loadSource = (resumeAt = 0) => {
      const next = wantedSrc();
      if (next === currentSrc) return;
      currentSrc = next;
      firstFrameDrawn = false;
      const seek = () => {
        if (resumeAt > 0 && video.duration > 0) {
          video.currentTime = resumeAt % video.duration;
        }
      };
      video.addEventListener("loadedmetadata", seek, { once: true });
      video.src = next;
      video.load();
    };

    const sync = () => {
      if (disposed) return;
      const shouldPlay = onScreen && tabVisible && !reduced.matches;
      if (!shouldPlay) {
        video.pause();
        cancelLoop();
        return;
      }
      if (!currentSrc) loadSource();
      const playing = video.play();
      if (playing) playing.catch(() => undefined);
      startLoop();
    };

    const onPlaying = () => startLoop();
    video.addEventListener("playing", onPlaying);

    const intersection = new IntersectionObserver(([entry]) => {
      onScreen = entry.isIntersecting;
      sync();
    });
    intersection.observe(wrap);

    const onVisibility = () => {
      tabVisible = !document.hidden;
      sync();
    };
    document.addEventListener("visibilitychange", onVisibility);
    reduced.addEventListener("change", sync);

    // Light <-> dark: swap artwork, keep the position in the loop.
    const themeWatcher = new MutationObserver(() => {
      if (!currentSrc || wantedSrc() === currentSrc) return;
      const at = video.currentTime;
      setReady(false);
      loadSource(at);
      sync();
    });
    themeWatcher.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => {
      disposed = true;
      cancelLoop();
      intersection.disconnect();
      themeWatcher.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      reduced.removeEventListener("change", sync);
      video.removeEventListener("playing", onPlaying);
      video.pause();
      video.removeAttribute("src");
      video.load();
    };
  }, [wrapRef, canvasRef, videoRef, lightSrc, darkSrc, width, height]);

  return { ready };
}
