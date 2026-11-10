import { ApiError } from "@/lib/api";
import { Mascot } from "./mascot";

/** Waiting state: Ananse swings on his thread next to the message. */
export function Loading({ label }: { label: string }) {
  return (
    <p role="status" aria-live="polite" className="status status-loading">
      <Mascot hanging className="mascot-swing" />
      <span>{label}</span>
    </p>
  );
}

export function ErrorState({ error, onRetry }: { error: Error; onRetry?: () => void }) {
  const unreachable = error instanceof ApiError && error.status === 0;
  return (
    <div role="alert" className="status status-error">
      <Mascot mood="oops" />
      <div className="status-text">
        <p>{error.message}</p>
        {unreachable && <p>Check that the API is running, then try again.</p>}
        {onRetry && (
          <button type="button" className="btn btn-primary" onClick={onRetry}>
            Try again
          </button>
        )}
      </div>
    </div>
  );
}
