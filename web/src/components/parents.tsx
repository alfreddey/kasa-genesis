import Link from "next/link";
import { AppShell } from "./app-shell";
import { Mascot } from "./mascot";

/** The Parents page (/parents): placeholder until accounts and child profiles are built. */
export function Parents() {
  return (
    <AppShell current="Parents">
      <header className="page-header">
        <h1>Parents</h1>
        <p>Accounts, child profiles and settings are coming soon.</p>
      </header>
      <div className="section">
        <div className="empty paper">
          <span className="empty-art" aria-hidden="true">
            <Mascot />
          </span>
          <p>
            Soon you will be able to add your children, choose their languages and manage the
            subscription here. For now, every story is free to hear.
          </p>
          <Link href="/library" className="btn btn-primary">
            Browse the library
          </Link>
        </div>
      </div>
    </AppShell>
  );
}
