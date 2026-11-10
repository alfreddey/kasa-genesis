"use client";

import Link from "next/link";
import { Mascot } from "./mascot";

/** Friendly fallback for an unexpected crash. Never shows the raw error message to readers. */
export function ErrorView({ reset }: { reset: () => void }) {
  return (
    <div role="alert" className="status status-error status-stacked">
      <Mascot mood="oops" />
      <h2>Something went wrong</h2>
      <p>We could not show this page. Please try again.</p>
      <button type="button" className="btn btn-primary" onClick={reset}>
        Try again
      </button>
      <p>
        <Link href="/">Back to all stories</Link>
      </p>
    </div>
  );
}
