import Link from "next/link";
import type { ReactNode } from "react";
import { HeartIcon, HomeIcon, LibraryIcon, PersonIcon } from "./icons";
import { Mascot } from "./mascot";

export type TabName = "Home" | "Library" | "Saved" | "Parents";

type Tab = { label: TabName; icon: ReactNode; href: string };

const TABS: Tab[] = [
  { label: "Home", icon: <HomeIcon />, href: "/" },
  { label: "Library", icon: <LibraryIcon />, href: "/library" },
  { label: "Saved", icon: <HeartIcon />, href: "/saved" },
  { label: "Parents", icon: <PersonIcon />, href: "/parents" },
];

/**
 * Main navigation: a floating glass bar at the bottom of a phone, a side rail from tablet width
 * up. It is the one place glass is used, because it floats over the page. The current tab gets a
 * solid orange icon tile and a bold label.
 */
export function TabBar({ current }: { current: TabName }) {
  return (
    <nav className="tab-bar glass" aria-label="Main">
      <span className="tab-logo" aria-hidden="true">
        <Mascot />
      </span>
      {TABS.map((tab) => (
        <Link
          key={tab.label}
          href={tab.href}
          className="tab"
          aria-current={tab.label === current ? "page" : undefined}
        >
          <span className="tab-icon">{tab.icon}</span>
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
