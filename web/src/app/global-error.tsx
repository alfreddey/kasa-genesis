"use client";

/** Last-resort boundary for errors in the root layout. Must render its own <html> and <body>. */
export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body>
        <main>
          <div role="alert" className="status status-error">
            <h2>Something went wrong</h2>
            <p>Kasa Genesis could not load. Please try again.</p>
            <button type="button" onClick={reset}>
              Try again
            </button>
          </div>
        </main>
      </body>
    </html>
  );
}
