import { ApiError } from "@/lib/api";

export function Loading({ label }: { label: string }) {
  return (
    <p role="status" aria-live="polite" className="status">
      {label}
    </p>
  );
}

export function ErrorState({ error, onRetry }: { error: Error; onRetry?: () => void }) {
  const unreachable = error instanceof ApiError && error.status === 0;
  return (
    <div role="alert" className="status status-error">
      <p>{error.message}</p>
      {unreachable && <p>Check that the API is running, then try again.</p>}
      {onRetry && (
        <button type="button" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  );
}
