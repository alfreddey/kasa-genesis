/** Inline icons drawn on a 24px grid. They take their color from the text color (currentColor). */
import type { ReactNode } from "react";

function Icon({ children, filled }: { children: ReactNode; filled?: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </svg>
  );
}

export const PlayIcon = () => (
  <Icon filled>
    <path d="M8.5 5.8v12.4a1 1 0 0 0 1.5.9l10-6.2a1 1 0 0 0 0-1.7L10 4.9a1 1 0 0 0-1.5.9z" />
  </Icon>
);
export const HomeIcon = () => (
  <Icon>
    <path d="M3 11.5 12 4l9 7.5M5.5 10v10h4.5v-6h4v6h4.5V10" />
  </Icon>
);
export const LibraryIcon = () => (
  <Icon>
    <path d="M12 6.5C10.5 5 8.5 4.5 6 4.5H3v14h3c2.5 0 4.5.5 6 2m0-14c1.5-1.5 3.5-2 6-2h3v14h-3c-2.5 0-4.5.5-6 2m0-14v14" />
  </Icon>
);
export const HeartIcon = () => (
  <Icon>
    <path d="M12 20s-7.5-4.5-7.5-10.2A4.3 4.3 0 0 1 12 7.3a4.3 4.3 0 0 1 7.5 2.5C19.5 15.5 12 20 12 20z" />
  </Icon>
);
export const PersonIcon = () => (
  <Icon>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21c0-4.2 3.6-7 8-7s8 2.8 8 7" />
  </Icon>
);
