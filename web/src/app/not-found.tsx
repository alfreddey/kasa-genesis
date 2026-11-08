import Link from "next/link";
import { PlainPage } from "@/components/plain-page";

export default function NotFound() {
  return (
    <PlainPage>
      <h2>Page not found</h2>
      <p>
        <Link href="/">Back to all stories</Link>
      </p>
    </PlainPage>
  );
}
