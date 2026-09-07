import { notFound } from "next/navigation";
import IntelliApplyApp from "../IntelliApplyApp";
import { hrefFromRequest, isKnownPath } from "@/lib/routes";

type SearchParams = Record<string, string | string[] | undefined>;

/**
 * Every non-root screen (`/resume`, `/jobs`, `/applications/:appId`, …).
 *
 * A catch-all is used on purpose: the UI is one mounted client island that owns
 * all app state, so navigation is done with `history.pushState` rather than a
 * router push. This route exists to make those URLs survive a hard load — a
 * refresh, a bookmark or a shared link — by server-rendering the same island
 * with the requested path. Paths that map to no screen still 404 properly.
 */
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ slug?: string[] }>;
  searchParams?: Promise<SearchParams>;
}) {
  const { slug = [] } = await params;
  const resolvedSearchParams = (await searchParams) ?? {};

  if (!isKnownPath(slug)) notFound();

  return <IntelliApplyApp initialHref={hrefFromRequest(slug, resolvedSearchParams)} />;
}
