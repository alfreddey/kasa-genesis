import Link from "next/link";
import { Mascot } from "@/components/mascot";
import { PlainPage } from "@/components/plain-page";

export default function NotFound() {
  return (
    <PlainPage>
      <Mascot mood="oops" />
      <h2>Page not found</h2>
      <p>
        <Link href="/" className="btn btn-primary">
          Back to all stories
        </Link>
      </p>
    </PlainPage>
  );
}
