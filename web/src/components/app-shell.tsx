import type { ReactNode } from "react";
import { TabBar, type TabName } from "./tab-bar";

/** The frame every page of the app shares: savanna backdrop, content column and glass tab bar. */
export function AppShell({ current, children }: { current: TabName; children: ReactNode }) {
  return (
    <div className="home">
      <div className="home-backdrop" aria-hidden="true">
        <div className="savanna-stage">
          <span className="savanna-sun" />
          <span className="savanna-hill savanna-hill-1" />
          <span className="savanna-hill savanna-hill-2" />
          <span className="savanna-hill savanna-hill-3" />
          <span className="savanna-hill savanna-hill-4" />
        </div>
      </div>
      <div className="home-column">{children}</div>
      <TabBar current={current} />
    </div>
  );
}
