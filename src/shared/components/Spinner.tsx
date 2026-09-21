interface SpinnerProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

const SIZE_CLASSES: Record<NonNullable<SpinnerProps["size"]>, string> = {
  sm: "h-4 w-4 border-2",
  md: "h-8 w-8 border-[3px]",
  lg: "h-12 w-12 border-4",
};

/**
 * Branded ring spinner — a quiet track in the theme's line color with an
 * amber arc rotating around it. Used for full-page loading states and
 * inline in buttons while a request is in flight.
 */
export default function Spinner({ size = "md", className = "" }: SpinnerProps) {
  return (
    <span
      role="status"
      aria-label="Loading"
      className={`inline-block shrink-0 animate-spin rounded-full border-line border-t-amber ${SIZE_CLASSES[size]} ${className}`}
    />
  );
}
