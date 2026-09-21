import Spinner from "@/shared/components/Spinner";

interface LoadingScreenProps {
  label?: string;
}

/**
 * Full-screen loading state — used for the two "blocking" moments where
 * there's nothing else on screen yet: the root redirect check and the
 * dashboard's session check.
 */
export default function LoadingScreen({ label = "Loading…" }: LoadingScreenProps) {
  return (
    <div className="flex h-screen flex-col items-center justify-center gap-3 bg-paper animate-fade-in">
      <Spinner size="lg" />
      <p className="text-sm text-ink-soft">{label}</p>
    </div>
  );
}
