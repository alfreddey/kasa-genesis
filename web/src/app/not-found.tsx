import Link from "next/link";

export default function NotFound() {
  return (
    <>
      <h2>Page not found</h2>
      <p>
        <Link href="/">Back to all stories</Link>
      </p>
    </>
  );
}
