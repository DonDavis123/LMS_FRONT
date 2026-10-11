/**
 * Sign-in hero: an isometric "data analyst" scene — a figure on a platform
 * pointing at floating dashboard panels, with three floating cubes.
 *
 * It is a pre-rendered animation with a transparent background
 * (public/auth/login-hero.webp, a 6 s looping WebP), so it sits directly on the
 * brand panel with no frame or backdrop and works in both themes:
 *   - light: the panel is white, and the scene looks exactly like the reference.
 *   - dark:  the pale panels and platform become soft translucent glass on navy.
 *
 * `prefers-reduced-motion` visitors get a still frame of the same scene via the
 * <picture> source. Nothing here touches auth state or the API — it is
 * presentation only.
 */
import "@/features/auth/styles/login-illustration.css";

export default function LoginIllustration({ className = "" }: { className?: string }) {
  return (
    <div className={`lp-ill ${className}`} aria-hidden="true">
      <picture>
        <source
          media="(prefers-reduced-motion: reduce)"
          srcSet="/auth/login-hero-still.webp"
          type="image/webp"
        />
        {/* A plain <img> on purpose: next/image would re-encode the file and
            drop the animation. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          className="lp-ill-img"
          src="/auth/login-hero.webp"
          width={770}
          height={708}
          alt=""
          decoding="async"
          draggable={false}
        />
      </picture>
    </div>
  );
}
