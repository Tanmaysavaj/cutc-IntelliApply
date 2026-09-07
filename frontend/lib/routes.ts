/**
 * Central route table for IntelliApply.
 *
 * The UI is a single client island (see `app/IntelliApplyApp.tsx`) that used to
 * navigate purely through a `useState<Page>` value, which meant no URLs, no
 * deep links and no browser back/forward. This module is the single source of
 * truth that maps that same `Page` union onto real paths, so navigation can be
 * mirrored into `history` without changing any screen's behaviour.
 *
 * Kept deliberately free of React and of any framework import so it can be used
 * from server components, client components and tests alike.
 */

export type Page =
  | "landing"
  | "resume"
  | "jobs"
  | "analysis"
  | "history"
  | "analytics"
  | "applications"
  | "application-detail"
  | "how-it-works"
  | "about"
  | "team";

/** A fully resolved location: which screen, plus the params that screen needs. */
export type RouteState = {
  page: Page;
  /** Selected application, only meaningful on `application-detail`. */
  appId: string | null;
  /** Selected demo job, only meaningful on `analysis`. */
  jobId: string | null;
  /** Whether demo mode is active. Mirrored as `?demo=1` so it survives reloads. */
  demo: boolean;
};

export const DEMO_QUERY_KEY = "demo";
export const JOB_QUERY_KEY = "job";

export const DEFAULT_ROUTE: RouteState = {
  page: "landing",
  appId: null,
  jobId: null,
  demo: false,
};

/**
 * Single-segment screens. `landing` (`/`) and `application-detail`
 * (`/applications/:appId`) are special-cased in the functions below.
 */
const SEGMENT_BY_PAGE = {
  resume: "resume",
  jobs: "jobs",
  analysis: "analysis",
  history: "history",
  analytics: "analytics",
  applications: "applications",
  "how-it-works": "how-it-works",
  about: "about",
  team: "team",
} as const satisfies Partial<Record<Page, string>>;

const PAGE_BY_SEGMENT: Record<string, Page> = Object.fromEntries(
  Object.entries(SEGMENT_BY_PAGE).map(([page, segment]) => [segment, page as Page])
);

/** Split a pathname into meaningful segments, tolerating trailing slashes. */
export function toSegments(pathname: string): string[] {
  return pathname.split("/").filter(Boolean);
}

function readFlags(search: URLSearchParams): Pick<RouteState, "demo" | "jobId"> {
  const demoValue = search.get(DEMO_QUERY_KEY);
  return {
    demo: demoValue === "1" || demoValue === "true",
    jobId: search.get(JOB_QUERY_KEY) || null,
  };
}

/**
 * Resolve URL segments to a route, or `null` when the path matches no screen.
 * Callers that need a guaranteed value should use {@link parseLocation}.
 */
export function matchRoute(segments: string[], search: URLSearchParams): RouteState | null {
  const flags = readFlags(search);

  if (segments.length === 0) {
    return { ...DEFAULT_ROUTE, ...flags, page: "landing" };
  }

  // `/applications/:appId` is the detail view for a single application.
  if (segments[0] === SEGMENT_BY_PAGE.applications && segments.length === 2) {
    return { ...flags, page: "application-detail", appId: decodeURIComponent(segments[1]) };
  }

  if (segments.length === 1) {
    const page = PAGE_BY_SEGMENT[segments[0]];
    if (page) return { ...flags, page, appId: null };
  }

  return null;
}

/** True when the given pathname segments correspond to a real screen. */
export function isKnownPath(segments: string[]): boolean {
  return matchRoute(segments, new URLSearchParams()) !== null;
}

/** Resolve a pathname + query string, falling back to the landing screen. */
export function parseLocation(pathname: string, search: string): RouteState {
  const params = new URLSearchParams(search);
  const matched = matchRoute(toSegments(pathname), params);
  if (matched) return matched;
  return { ...DEFAULT_ROUTE, ...readFlags(params), page: "landing" };
}

/** Resolve a full href such as `/applications/app-1?demo=1`. */
export function parseHref(href: string): RouteState {
  const queryAt = href.indexOf("?");
  const pathname = queryAt === -1 ? href : href.slice(0, queryAt);
  const search = queryAt === -1 ? "" : href.slice(queryAt);
  return parseLocation(pathname, search);
}

/** The pathname a route should live at. */
export function pathForRoute(route: RouteState): string {
  if (route.page === "landing") return "/";
  if (route.page === "application-detail") {
    return route.appId
      ? `/${SEGMENT_BY_PAGE.applications}/${encodeURIComponent(route.appId)}`
      : `/${SEGMENT_BY_PAGE.applications}`;
  }
  return `/${SEGMENT_BY_PAGE[route.page]}`;
}

/**
 * The canonical href for a route. Query params are only emitted where they are
 * actually read, which keeps URLs clean and avoids spurious history entries.
 */
export function hrefForRoute(route: RouteState): string {
  const params = new URLSearchParams();
  if (route.demo) params.set(DEMO_QUERY_KEY, "1");
  if (route.jobId && route.page === "analysis") params.set(JOB_QUERY_KEY, route.jobId);
  const query = params.toString();
  return query ? `${pathForRoute(route)}?${query}` : pathForRoute(route);
}

/**
 * Build the initial href from what a server component receives, so the first
 * render on the server matches the first render in the browser exactly.
 */
export function hrefFromRequest(
  segments: string[],
  searchParams: Record<string, string | string[] | undefined> = {}
): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams)) {
    if (Array.isArray(value)) {
      for (const item of value) params.append(key, item);
    } else if (value !== undefined) {
      params.set(key, value);
    }
  }
  const pathname = segments.length ? `/${segments.join("/")}` : "/";
  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}
