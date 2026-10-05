export interface PageArtworkReadiness {
  shellVisible: boolean;
  routeEntryComplete: boolean;
  loadingFallbackCount: number;
  navigationTransitionActive: boolean;
}

export function isPageReadyForArtwork(readiness: PageArtworkReadiness): boolean {
  return (
    readiness.shellVisible &&
    readiness.routeEntryComplete &&
    readiness.loadingFallbackCount === 0 &&
    !readiness.navigationTransitionActive
  );
}

export function shouldLoadRadioWidgetArtwork(input: {
  pageReady: boolean;
  desktopEligible: boolean;
  isRadioPage: boolean;
}): boolean {
  return input.pageReady && input.desktopEligible && !input.isRadioPage;
}
