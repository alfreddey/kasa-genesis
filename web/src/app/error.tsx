"use client";

import { ErrorView } from "@/components/error-view";

/** Route-level error boundary: catches render errors inside the page, keeps the site header. */
export default function RouteError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <ErrorView reset={reset} />;
}
