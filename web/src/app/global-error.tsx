"use client";

import "./globals.css";

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
        <main className="plain-page">
          <div className="plain-column">
            <div role="alert" className="plain-card paper status status-error status-stacked">
              <h2>Something went wrong</h2>
              <p>Kasa Genesis could not load. Please try again.</p>
              <button type="button" className="btn btn-primary" onClick={reset}>
                Try again
              </button>
            </div>
          </div>
        </main>
      </body>
    </html>
  );
}
