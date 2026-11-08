import Link from "next/link";
import type { ReactNode } from "react";
import { HeartIcon, HomeIcon, LibraryIcon, PersonIcon } from "./icons";

export type TabName = "Home" | "Library" | "Saved" | "Parents";

type Tab = { label: TabName; icon: ReactNode; href?: string };

const TABS: Tab[] = [
  { label: "Home", icon: <HomeIcon />, href: "/" },
  { label: "Library", icon: <LibraryIcon />, href: "/library" },
  { label: "Saved", icon: <HeartIcon />, href: "/saved" },
  { label: "Parents", icon: <PersonIcon />, href: "/parents" },
];

/** Bottom navigation in glass, a side rail from tablet width up. Only the icon of the current tab is highlighted. */
export function TabBar({ current }: { current: TabName }) {
  return (
    <nav className="tab-bar glass" aria-label="Main">
      <span className="tab-logo" aria-hidden="true">
        K
      </span>
      {TABS.map((tab) => {
        const inner = (
          <>
            <span className="tab-icon">{tab.icon}</span>
            {tab.label}
          </>
        );
        if (!tab.href) {
          return (
            <button
              key={tab.label}
              type="button"
              className="tab"
              aria-disabled="true"
              title="Coming soon"
            >
              {inner}
            </button>
          );
        }
        return (
          <Link
            key={tab.label}
            href={tab.href}
            className="tab"
            aria-current={tab.label === current ? "page" : undefined}
          >
            {inner}
          </Link>
        );
      })}
    </nav>
  );
}
