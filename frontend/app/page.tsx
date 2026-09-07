import IntelliApplyApp from "./IntelliApplyApp";
import { hrefFromRequest } from "@/lib/routes";

type SearchParams = Record<string, string | string[] | undefined>;

/**
 * Landing route (`/`). The app itself lives in `IntelliApplyApp`; this file only
 * resolves the incoming URL and hands it over, so the server's first render
 * agrees with the browser's and hydration stays clean.
 */
export default async function Page({ searchParams }: { searchParams?: Promise<SearchParams> }) {
  const resolvedSearchParams = (await searchParams) ?? {};
  return <IntelliApplyApp initialHref={hrefFromRequest([], resolvedSearchParams)} />;
}
