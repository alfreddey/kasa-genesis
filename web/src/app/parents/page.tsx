import type { Metadata } from "next";
import { Parents } from "@/components/parents";

export const metadata: Metadata = { title: "Parents" };

export default function ParentsPage() {
  return <Parents />;
}
