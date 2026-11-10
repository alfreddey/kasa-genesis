import type { ReactNode } from "react";
import { Scene } from "./scene";

/** The simple frame for the error and 404 pages: the scene, the app name and one paper card. */
export function PlainPage({ children }: { children: ReactNode }) {
  return (
    <div className="plain-page">
      <Scene />
      <div className="plain-column">
        <header className="site-header">
          <h1>Kasa Genesis</h1>
          <p>Stories in Ghanaian languages, read aloud.</p>
        </header>
        <div className="plain-card paper">{children}</div>
      </div>
    </div>
  );
}
