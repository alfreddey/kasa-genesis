import { vi } from "vitest";

type Route = { status?: number; body: unknown } | { throws: unknown };

/**
 * Replaces global fetch with canned responses keyed by path after /api/v1,
 * for example { "/stories": { body: [...] } }, or { throws: err } to fail the request. Unknown paths return 404.
 * Returns the mock so tests can inspect calls.
 */
export function mockApi(routes: Record<string, Route>) {
  const fn = vi.fn(async (input: RequestInfo | URL) => {
    const url = new URL(String(input));
    const path = url.pathname.replace(/^\/api\/v1/, "") + url.search;
    const route = routes[path];
    if (route && "throws" in route) throw route.throws;
    if (!route) return jsonResponse({ detail: "Not Found" }, 404);
    return jsonResponse(route.body, route.status ?? 200);
  });
  vi.stubGlobal("fetch", fn);
  return fn;
}

function jsonResponse(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
