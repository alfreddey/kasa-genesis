import type { Metadata, Viewport } from "next";
import "@fontsource-variable/nunito";
import { OfflineBanner } from "@/components/offline-banner";
import "./globals.css";

export const metadata: Metadata = {
  title: "Kasa Genesis",
  description: "Stories in Ghanaian languages, read aloud.",
};

export const viewport: Viewport = { viewportFit: "cover" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <OfflineBanner />
        <main>{children}</main>
      </body>
    </html>
  );
}
