import type { Metadata } from "next";
import { PlainPage } from "@/components/plain-page";
import { StoryList } from "@/components/story-list";

export const metadata: Metadata = { title: "Library" };

export default function LibraryPage() {
  return (
    <PlainPage>
      <StoryList />
    </PlainPage>
  );
}
