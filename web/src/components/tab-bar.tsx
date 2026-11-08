import Link from "next/link";
import type { ReactNode } from "react";
import { HeartIcon, HomeIcon, LibraryIcon, PersonIcon } from "./icons";

type Tab = { label: string; icon: ReactNode; href?: string };

const TABS: Tab[] = [
  { label: "Home", icon: <HomeIcon />, href: "/" },
  { label: "Library", icon: <LibraryIcon />, href: "/library" },
  { label: "Saved", icon: <HeartIcon /> },
  { label: "Parents", icon: <PersonIcon /> },
];

/** Bottom navigation in glass. Only the icon of the current tab is highlighted. Tabs without a page yet are inert. */
export function TabBar({ current }: { current: "Home" | "Library" }) {
  return (
    <nav className="tab-bar glass" aria-label="Main">
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
