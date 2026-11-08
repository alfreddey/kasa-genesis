import type { ReactNode } from "react";
import { coverPalette } from "@/lib/home";

/** Placeholder cover: sun and hills in a color picked from the story id, with room for overlays. */
export function CoverArt({ id, children }: { id: string; children?: ReactNode }) {
  return (
    <div className={`cover cover-${coverPalette(id)}`} aria-hidden="true">
      <span className="cover-sun" />
      <span className="cover-hill-1" />
      <span className="cover-hill-2" />
      {children}
    </div>
  );
}
