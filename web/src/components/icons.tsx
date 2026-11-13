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
      strokeWidth="2.2"
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
export const PauseIcon = () => (
  <Icon filled>
    <rect x="5.5" y="4.5" width="4.5" height="15" rx="1.6" />
    <rect x="14" y="4.5" width="4.5" height="15" rx="1.6" />
  </Icon>
);
/** Back to the start: a bar and a triangle pointing left. */
export const RestartIcon = () => (
  <Icon filled>
    <path d="M19 6.2v11.6a.9.9 0 0 1-1.4.8L9 12.8a.9.9 0 0 1 0-1.6l8.6-5.8a.9.9 0 0 1 1.4.8z" />
    <path d="M5.5 5.5v13" fill="none" />
  </Icon>
);
/** A circular arrow turning back (counter-clockwise). Pair it with a "10" label. */
export const BackIcon = () => (
  <Icon>
    <path d="M6.34 6.34A8 8 0 1 1 4.12 13.39" />
    <path d="M6.34 2.3v4.04h4.06" />
  </Icon>
);
/** A circular arrow turning forward (clockwise). Pair it with a "10" label. */
export const ForwardIcon = () => (
  <Icon>
    <path d="M17.66 6.34A8 8 0 1 0 19.88 13.39" />
    <path d="M17.66 2.3v4.04H13.6" />
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
export const SearchIcon = () => (
  <Icon>
    <circle cx="11" cy="11" r="6.5" />
    <path d="m16 16 4.5 4.5" />
  </Icon>
);
export const ArrowLeftIcon = () => (
  <Icon>
    <path d="M19 12H5.5M11 6l-6 6 6 6" />
  </Icon>
);
export const ArrowRightIcon = () => (
  <Icon>
    <path d="M5 12h13.5M13 6l6 6-6 6" />
  </Icon>
);
/** A four-point sparkle for "story of the day". */
export const SparkleIcon = () => (
  <Icon filled>
    <path d="M12 2.5c.6 4.6 2.4 6.4 7 7-4.6.6-6.4 2.4-7 7-.6-4.6-2.4-6.4-7-7 4.6-.6 6.4-2.4 7-7z" />
    <path d="M19 15.5c.3 2 1 2.7 3 3-2 .3-2.7 1-3 3-.3-2-1-2.7-3-3 2-.3 2.7-1 3-3z" />
  </Icon>
);
/** A chunky five-point star: one for every story heard to the end. */
export const StarIcon = () => (
  <Icon filled>
    <path d="M12 3l2.47 6.1 6.57.46-5.05 4.24 1.59 6.39L12 16.7l-5.58 3.49 1.59-6.39-5.05-4.24 6.57-.46z" />
  </Icon>
);
