import type { ReactNode } from "react";

/** The simple page frame (site header and a narrow column) for pages that are not Home. */
export function PlainPage({ children }: { children: ReactNode }) {
  return (
    <div className="plain-page">
      <header className="site-header">
        <h1>Kasa Genesis</h1>
        <p className="muted">Stories in Ghanaian languages, read aloud.</p>
      </header>
      {children}
    </div>
  );
}
