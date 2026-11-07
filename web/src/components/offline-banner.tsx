"use client";

import { useEffect, useState } from "react";

/** Tells the reader when the connection drops. Hidden while online. */
export function OfflineBanner() {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    setOnline(navigator.onLine);
    const up = () => setOnline(true);
    const down = () => setOnline(false);
    window.addEventListener("online", up);
    window.addEventListener("offline", down);
    return () => {
      window.removeEventListener("online", up);
      window.removeEventListener("offline", down);
    };
  }, []);

  if (online) return null;
  return (
    <p role="status" aria-live="polite" className="status offline-banner">
      You are offline. Stories that are already open may still work.
    </p>
  );
}
