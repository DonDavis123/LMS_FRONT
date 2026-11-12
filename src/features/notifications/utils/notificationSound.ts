/**
 * Notification sound.
 *
 * Deliberately never touches `volume`: an HTMLAudioElement defaults to 1.0,
 * which means "full volume of the media channel", so the loudness is whatever
 * the user has set on their device / OS / browser tab. No in-app volume.
 *
 * Browsers block audio until the user has interacted with the page once, so
 * the element is "unlocked" on the first click / key press / touch. A sound
 * that is still blocked is dropped silently — it must never break the UI.
 */
const SOUND_URL = "/sounds/notification.wav";

let audio: HTMLAudioElement | null = null;
let unlocked = false;

function getAudio(): HTMLAudioElement | null {
  if (typeof window === "undefined") return null;
  if (!audio) {
    audio = new Audio(SOUND_URL);
    audio.preload = "auto";
  }
  return audio;
}

/** Call once on mount; arms the audio element on the first user gesture. */
export function initNotificationSound(): () => void {
  const el = getAudio();
  if (!el || unlocked) return () => {};

  const events = ["pointerdown", "keydown", "touchstart"] as const;
  const unlock = () => {
    // Play-then-pause inside a gesture grants this element permission to play later.
    el.muted = true;
    el.play()
      .then(() => {
        el.pause();
        el.currentTime = 0;
        el.muted = false;
        unlocked = true;
      })
      .catch(() => {
        el.muted = false;
      });
    cleanup();
  };
  const cleanup = () => events.forEach((e) => window.removeEventListener(e, unlock));
  events.forEach((e) => window.addEventListener(e, unlock, { once: true, passive: true }));
  return cleanup;
}

export function playNotificationSound(): void {
  const el = getAudio();
  if (!el) return;
  el.currentTime = 0;
  el.play().catch(() => {
    // Autoplay still blocked (no interaction yet) — stay silent.
  });
}
