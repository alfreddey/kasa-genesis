import type { Metadata } from "next";
import { OfflineBanner } from "@/components/offline-banner";
import "./globals.css";

export const metadata: Metadata = {
  title: "Kasa Genesis",
  description: "Stories in Ghanaian languages, read aloud.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="site-header">
          <h1>Kasa Genesis</h1>
          <p className="muted">Stories in Ghanaian languages, read aloud.</p>
        </header>
        <OfflineBanner />
        <main>{children}</main>
      </body>
    </html>
  );
}
