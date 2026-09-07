"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  hrefForRoute,
  parseHref,
  parseLocation,
  type Page,
  type RouteState,
} from "./routes";

export type AppRouter = {
  route: RouteState;
  page: Page;
  /** Drop-in replacement for the previous `setPage` state setter. */
  setPage: (page: Page) => void;
  appId: string | null;
  setAppId: (appId: string | null) => void;
  jobId: string | null;
  setJobId: (jobId: string | null) => void;
  setDemo: (demo: boolean) => void;
  /** Navigate to a screen while setting its params in one history entry. */
  go: (patch: Partial<RouteState>) => void;
  back: () => void;
};

/**
 * URL-backed navigation for the IntelliApply client island.
 *
 * Deliberately built on `history.pushState` rather than the framework router.
 * The entire app — parsed resume, extracted job, analysis result and demo mode —
 * lives in React state inside one mounted component. A real router navigation
 * would swap the rendered route module, unmount that component and silently
 * discard all of it. Writing to `history` directly keeps the component mounted,
 * so every existing screen behaves exactly as before while URLs, deep links and
 * browser back/forward all start working.
 *
 * @param initialHref href resolved on the server, so the first client render
 * matches the server render and hydration stays clean.
 */
export function useAppRouter(initialHref: string): AppRouter {
  const [route, setRoute] = useState<RouteState>(() => parseHref(initialHref));

  // Mirrors `route` synchronously. Handlers frequently fire two navigations in
  // one event (`setAppId(id)` then `setPage("application-detail")`); reading
  // state directly would make the second call overwrite the first with a stale
  // value, so both read and write through this ref instead.
  const routeRef = useRef<RouteState>(route);

  const apply = useCallback((next: RouteState, replace: boolean) => {
    routeRef.current = next;
    setRoute(next);

    if (typeof window === "undefined") return;
    const href = hrefForRoute(next);
    // Compare against the live URL so param-only updates that do not change the
    // address (for example setting `appId` while still on the list screen) never
    // push an entry the user would have to press Back through twice.
    if (href === window.location.pathname + window.location.search) return;
    if (replace) window.history.replaceState({ intelliapply: href }, "", href);
    else window.history.pushState({ intelliapply: href }, "", href);
  }, []);

  const go = useCallback(
    (patch: Partial<RouteState>) => apply({ ...routeRef.current, ...patch }, false),
    [apply]
  );

  const setPage = useCallback((page: Page) => go({ page }), [go]);
  const setAppId = useCallback((appId: string | null) => go({ appId }), [go]);
  const setJobId = useCallback((jobId: string | null) => go({ jobId }), [go]);
  const setDemo = useCallback((demo: boolean) => go({ demo }), [go]);
  const back = useCallback(() => {
    if (typeof window !== "undefined") window.history.back();
  }, []);

  // Browser back/forward: re-derive the screen from whatever URL we landed on.
  useEffect(() => {
    const onPopState = () => {
      const next = parseLocation(window.location.pathname, window.location.search);
      routeRef.current = next;
      setRoute(next);
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  // Every setter above is referentially stable, so the returned object only
  // changes when the route does. That keeps it safe to use as a dependency in
  // the consumer's `useCallback`/`useEffect` lists.
  return useMemo(
    () => ({
      route,
      page: route.page,
      setPage,
      appId: route.appId,
      setAppId,
      jobId: route.jobId,
      setJobId,
      setDemo,
      go,
      back,
    }),
    [route, setPage, setAppId, setJobId, setDemo, go, back]
  );
}
