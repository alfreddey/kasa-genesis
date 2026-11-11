"use client";

import Link from "next/link";
import { useState } from "react";
import { clearListening, inProgress, starCount, useListening } from "@/lib/listening";
import { AppShell } from "./app-shell";
import { Mascot } from "./mascot";

/**
 * The Parents page (/parents): a placeholder until accounts and child profiles are built, plus
 * a plain account of what the app remembers on this device and a way to forget it.
 */
export function Parents() {
  const listening = useListening();
  const [asking, setAsking] = useState(false);
  const stars = starCount(listening);
  const places = inProgress(listening).length;
  const kept = [
    stars > 0 && `${stars} ${stars === 1 ? "star" : "stars"}`,
    places > 0 && `${places} ${places === 1 ? "story" : "stories"} stopped halfway`,
  ].filter(Boolean);

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

        <section className="device-note paper" aria-labelledby="device-note-title">
          <h2 id="device-note-title">On this device</h2>
          <p>
            Kasa remembers which stories your child heard to the end (each one earns a star) and
            where a story was stopped, so it can go on from there. All of it stays on this device.
          </p>
          <p className="device-note-now" role="status">
            {kept.length > 0
              ? `Remembered now: ${kept.join(" and ")}.`
              : "Nothing is remembered yet."}
          </p>
          {kept.length > 0 && !asking && (
            <button type="button" className="btn btn-paper" onClick={() => setAsking(true)}>
              Forget stars and places
            </button>
          )}
          {asking && (
            <div className="device-note-actions" role="group" aria-label="Forget stars and places?">
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  clearListening();
                  setAsking(false);
                }}
              >
                Yes, forget them
              </button>
              <button type="button" className="btn btn-paper" onClick={() => setAsking(false)}>
                No, keep them
              </button>
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}
