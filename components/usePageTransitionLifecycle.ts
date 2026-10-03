'use client';

import type { useRouter } from 'next/navigation';
import { useCallback, useEffect, useLayoutEffect, useRef, useState, useTransition } from 'react';
import { getInternalPageTransitionHref, getPageRouteKey } from '@/lib/pageTransitions';

export type PageTransitionPhase = 'idle' | 'leaving' | 'waiting' | 'entering';
export interface PageNavigationOptions {
  replace?: boolean;
  scroll?: boolean;
  interrupt?: boolean;
}
type NavigationMode = 'initial' | 'push' | 'replace' | 'history' | 'fallback';
interface Navigation {
  id: number;
  phase: PageTransitionPhase;
  startedAt: number;
  sourceKey: string;
  href: string | null;
  mode: NavigationMode;
  scroll?: boolean;
  committed: boolean;
  issued: boolean;
  reducedMotion: boolean;
}

const FADE_MS = 220;
const ANIMATION_FALLBACK_MS = 520;
const STATUS_DELAY_MS = 150;
const STALLED_DELAY_MS = 30_000;

export function usePageTransitionLifecycle({
  router,
  shellReady,
  loadingFallbackCount,
  setNavigationTransitionActive,
}: {
  router: ReturnType<typeof useRouter>;
  shellReady: boolean;
  loadingFallbackCount: number;
  setNavigationTransitionActive: (active: boolean) => void;
}) {
  const navigation = useRef<Navigation>({
    id: 0,
    phase: 'waiting',
    startedAt: 0,
    sourceKey: '',
    href: null,
    mode: 'initial',
    committed: false,
    issued: true,
    reducedMotion: false,
  });
  const committedKey = useRef('');
  const [routerPending, startRouterTransition] = useTransition();
  const [snapshot, setSnapshot] = useState({ id: 0, phase: 'waiting' as PageTransitionPhase });
  const [showStatus, setShowStatus] = useState(false);
  const [stalled, setStalled] = useState(false);
  const focusAfterReveal = useRef<Navigation | null>(null);
  const readiness = useRef({ shellReady, loadingFallbackCount, routerPending });
  readiness.current = { shellReady, loadingFallbackCount, routerPending };

  const publish = useCallback((phase: PageTransitionPhase) => {
    const current = navigation.current;
    current.phase = phase;
    current.startedAt = performance.now();
    setSnapshot({ id: current.id, phase });
  }, []);

  const finishReveal = useCallback(
    (id: number) => {
      const current = navigation.current;
      if (current.id !== id || current.phase !== 'entering') return;
      setNavigationTransitionActive(false);
      focusAfterReveal.current = current;
      publish('idle');
    },
    [publish, setNavigationTransitionActive],
  );

  useLayoutEffect(() => {
    if (snapshot.phase !== 'idle' || !focusAfterReveal.current) return;
    const current = focusAfterReveal.current;
    focusAfterReveal.current = null;
    if (current.mode === 'initial' || current.mode === 'fallback' || current.mode === 'history')
      return;
    const hash = current.href ? new URL(current.href, window.location.href).hash : '';
    let fragment = hash.slice(1);
    try {
      fragment = decodeURIComponent(fragment);
    } catch {
      // A literal percent sign is a valid DOM id even when it is not a URI escape.
    }
    const target =
      (hash ? document.getElementById(fragment) : null) ??
      document.querySelector<HTMLElement>('main h1, h1') ??
      document.querySelector<HTMLElement>('main');
    if (!target) return;
    const previousTabIndex = target.getAttribute('tabindex');
    target.setAttribute('tabindex', '-1');
    target.focus({ preventScroll: true });
    target.addEventListener(
      'blur',
      () => {
        if (previousTabIndex === null) target.removeAttribute('tabindex');
        else target.setAttribute('tabindex', previousTabIndex);
      },
      { once: true },
    );
  }, [snapshot]);

  const issueNavigation = useCallback(
    (id: number) => {
      const current = navigation.current;
      if (current.id !== id || current.issued) return;
      current.issued = true;
      publish('waiting');
      if (!current.href || (current.mode !== 'push' && current.mode !== 'replace')) return;
      const mode = current.mode;
      const href = current.href;
      startRouterTransition(() => {
        try {
          router[mode](href, { scroll: current.scroll });
        } catch {
          // Catch inside React's transition so the original page stays available.
          setNavigationTransitionActive(false);
          publish('idle');
        }
      });
    },
    [publish, router, setNavigationTransitionActive],
  );

  const begin = useCallback(
    (
      href: string | null,
      mode: NavigationMode,
      committed: boolean,
      options: PageNavigationOptions = {},
    ) => {
      const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const covered = navigation.current.phase === 'waiting';
      navigation.current = {
        id: navigation.current.id + 1,
        phase: 'waiting',
        startedAt: performance.now(),
        sourceKey: committedKey.current,
        href,
        mode,
        scroll: options.scroll,
        committed,
        issued: false,
        reducedMotion,
      };
      setNavigationTransitionActive(true);
      setStalled(false);
      setShowStatus(false);
      if (reducedMotion || covered || mode === 'fallback') issueNavigation(navigation.current.id);
      else publish('leaving');
    },
    [issueNavigation, publish, setNavigationTransitionActive],
  );

  const navigate = useCallback(
    (href: string, options: PageNavigationOptions = {}) => {
      if (navigation.current.phase !== 'idle') {
        if (!options.replace && !options.interrupt) return;
        if (
          navigation.current.href &&
          getPageRouteKey(new URL(href, window.location.origin)) ===
            getPageRouteKey(new URL(navigation.current.href, window.location.origin))
        )
          return;
      }
      const currentHref = new URL(
        committedKey.current || window.location.href,
        window.location.origin,
      ).href;
      const destination = getInternalPageTransitionHref(href, currentHref);
      if (!destination) {
        const target = new URL(href, currentHref);
        if (
          options.interrupt &&
          navigation.current.phase !== 'idle' &&
          target.origin === window.location.origin &&
          getPageRouteKey(target) === committedKey.current
        ) {
          begin(href, options.replace ? 'replace' : 'push', true, options);
          return;
        }
        if (
          target.origin === window.location.origin &&
          getPageRouteKey(target) === committedKey.current &&
          target.hash === window.location.hash
        )
          return;
        if (target.href === currentHref) return;
        if (
          target.origin !== window.location.origin ||
          !['http:', 'https:'].includes(target.protocol)
        ) {
          window.location.assign(target.href);
        } else {
          router[options.replace ? 'replace' : 'push'](href, { scroll: options.scroll });
        }
        return;
      }
      begin(destination, options.replace ? 'replace' : 'push', false, options);
    },
    [begin, router],
  );

  const routeCommitted = useCallback(
    (key: string) => {
      const previous = committedKey.current;
      committedKey.current = key;
      const current = navigation.current;
      if (current.mode === 'initial' && current.phase === 'waiting') {
        current.sourceKey = key;
        current.committed = true;
        current.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        setSnapshot({ id: current.id, phase: current.phase });
      } else if (key !== previous) {
        if (current.phase === 'idle') begin(key, 'history', true);
        else {
          current.committed =
            current.href !== null &&
            key === getPageRouteKey(new URL(current.href, window.location.origin));
          setSnapshot({ id: current.id, phase: current.phase });
        }
      }
    },
    [begin],
  );

  useLayoutEffect(() => {
    setNavigationTransitionActive(snapshot.phase !== 'idle');
  }, [setNavigationTransitionActive, snapshot.phase]);

  useEffect(() => {
    const current = navigation.current;
    if (loadingFallbackCount > 0 && current.phase === 'idle') {
      begin(null, 'fallback', true);
    } else if (loadingFallbackCount > 0 && current.phase === 'entering') {
      publish('waiting');
    }
  }, [begin, loadingFallbackCount, publish]);

  useEffect(() => {
    const current = navigation.current;
    if (snapshot.phase !== 'waiting' || !shellReady || loadingFallbackCount || routerPending)
      return;
    // Next server redirects may commit another URL. Accept it only after the
    // router transition settles and the committed content matches the browser.
    if (
      !current.committed &&
      current.issued &&
      committedKey.current !== current.sourceKey &&
      committedKey.current === getPageRouteKey(new URL(window.location.href))
    )
      current.committed = true;
    if (!current.committed) return;
    const id = current.id;
    // Let all loading-fallback layout effects settle before revealing the route.
    const frame = window.requestAnimationFrame(() => {
      if (navigation.current.id !== id || navigation.current.phase !== 'waiting') return;
      if (
        !readiness.current.shellReady ||
        readiness.current.loadingFallbackCount ||
        readiness.current.routerPending
      )
        return;
      publish('entering');
      if (navigation.current.reducedMotion) finishReveal(id);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [finishReveal, loadingFallbackCount, publish, shellReady, snapshot, routerPending]);

  useEffect(() => {
    const { id, phase } = snapshot;
    if (phase !== 'leaving' && phase !== 'entering') return;
    const timer = window.setTimeout(() => {
      if (phase === 'leaving') issueNavigation(id);
      else finishReveal(id);
    }, ANIMATION_FALLBACK_MS);
    return () => window.clearTimeout(timer);
  }, [finishReveal, issueNavigation, snapshot]);

  useEffect(() => {
    setShowStatus(false);
    setStalled(false);
    if (snapshot.phase !== 'waiting') return;
    const id = snapshot.id;
    const statusTimer = window.setTimeout(() => {
      if (navigation.current.id === id && navigation.current.phase === 'waiting')
        setShowStatus(true);
    }, STATUS_DELAY_MS);
    const stalledTimer = window.setTimeout(() => {
      if (navigation.current.id === id && navigation.current.phase === 'waiting') setStalled(true);
    }, STALLED_DELAY_MS);
    return () => {
      window.clearTimeout(statusTimer);
      window.clearTimeout(stalledTimer);
    };
  }, [snapshot.id, snapshot.phase]);

  useEffect(() => {
    const handleHistory = () => {
      const key = getPageRouteKey(new URL(window.location.href));
      if (key !== committedKey.current) begin(key + window.location.hash, 'history', false);
      else if (navigation.current.phase !== 'idle' && !navigation.current.committed)
        begin(key + window.location.hash, 'history', true);
    };
    window.addEventListener('popstate', handleHistory, true);
    return () => window.removeEventListener('popstate', handleHistory, true);
  }, [begin]);

  const onOpacityTransitionEnd = useCallback(() => {
    const current = navigation.current;
    // An end event queued for a superseded phase must not end the new phase.
    if (performance.now() - current.startedAt < FADE_MS - 32) return;
    if (current.phase === 'leaving') issueNavigation(current.id);
    else if (current.phase === 'entering') finishReveal(current.id);
  }, [finishReveal, issueNavigation]);

  return {
    phase: snapshot.phase,
    showStatus,
    stalled,
    navigate,
    routeCommitted,
    onOpacityTransitionEnd,
    retry: () => window.location.assign(navigation.current.href || window.location.href),
    returnToPage: () => window.location.assign(navigation.current.sourceKey || '/'),
  };
}
