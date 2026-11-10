import type { ReactNode } from "react";
import { Scene } from "./scene";
import { TabBar, type TabName } from "./tab-bar";

/** The frame every page of the app shares: the scene behind, a content column and the tab bar. */
export function AppShell({ current, children }: { current: TabName; children: ReactNode }) {
  return (
    <div className="shell">
      <Scene />
      <div className="shell-column">{children}</div>
      <TabBar current={current} />
    </div>
  );
}
