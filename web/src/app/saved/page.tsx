import type { Metadata } from "next";
import { Saved } from "@/components/saved";

export const metadata: Metadata = { title: "Saved" };

export default function SavedPage() {
  return <Saved />;
}
