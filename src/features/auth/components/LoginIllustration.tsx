"use client";

import { useRef } from "react";
import { useAlphaVideo } from "@/features/auth/hooks/useAlphaVideo";
import "@/features/auth/styles/login-illustration.css";

/**
 * Sign-in hero: the isometric "data analyst" scene, looping every 6 seconds.
 *
 * It is a frame-for-frame copy of the reference animation, shipped as a
 * transparent video (see hooks/useAlphaVideo.ts) so it has NO background box
 * and follows the page theme:
 *   light → /login/hero-light.mp4   dark → /login/hero-dark.mp4
 *
 * The matching still image shows first, and stays for visitors who prefer
 * reduced motion. Presentation only — nothing here touches auth or the API.
 */

const LIGHT_VIDEO = "/login/hero-light.mp4";
const DARK_VIDEO = "/login/hero-dark.mp4";
/** Size of one half of the side-by-side video (colour | matte). */
const FRAME_W = 603;
const FRAME_H = 548;

export default function LoginIllustration({ className = "" }: { className?: string }) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const { ready } = useAlphaVideo(wrapRef, canvasRef, videoRef, {
    lightSrc: LIGHT_VIDEO,
    darkSrc: DARK_VIDEO,
    width: FRAME_W,
    height: FRAME_H,
  });

  return (
    <div
      ref={wrapRef}
      className={`lp-hero ${className}`}
      data-ready={ready ? "true" : "false"}
      aria-hidden="true"
    >
      {/* Stills: first paint, reduced-motion, and the fallback if video fails. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        className="lp-hero-still lp-hero-still--light"
        src="/login/hero-light.webp"
        alt=""
        width={FRAME_W}
        height={FRAME_H}
        loading="lazy"
        decoding="async"
        draggable={false}
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        className="lp-hero-still lp-hero-still--dark"
        src="/login/hero-dark.webp"
        alt=""
        width={FRAME_W}
        height={FRAME_H}
        loading="lazy"
        decoding="async"
        draggable={false}
      />
      <canvas ref={canvasRef} className="lp-hero-canvas" width={FRAME_W} height={FRAME_H} />
      <video
        ref={videoRef}
        className="lp-hero-source"
        muted
        loop
        playsInline
        preload="none"
        tabIndex={-1}
      />
    </div>
  );
}
