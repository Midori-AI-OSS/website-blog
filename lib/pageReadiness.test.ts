import { describe, expect, test } from 'bun:test';
import { isPageReadyForArtwork, shouldLoadRadioWidgetArtwork } from './pageReadiness';

describe('Radio artwork page readiness', () => {
  const settledPage = {
    shellVisible: true,
    routeEntryComplete: true,
    loadingFallbackCount: 0,
    navigationTransitionActive: false,
  };

  test('waits for the visible shell and completed route entry', () => {
    expect(isPageReadyForArtwork({ ...settledPage, shellVisible: false })).toBe(false);
    expect(isPageReadyForArtwork({ ...settledPage, routeEntryComplete: false })).toBe(false);
  });

  test('waits while a loading fallback or page transition is active', () => {
    expect(isPageReadyForArtwork({ ...settledPage, loadingFallbackCount: 1 })).toBe(false);
    expect(isPageReadyForArtwork({ ...settledPage, navigationTransitionActive: true })).toBe(false);
  });

  test('allows work once all readiness gates have cleared', () => {
    expect(isPageReadyForArtwork(settledPage)).toBe(true);
  });

  test('only starts mini-player artwork on eligible routes and viewports', () => {
    expect(
      shouldLoadRadioWidgetArtwork({
        pageReady: true,
        desktopEligible: true,
        isRadioPage: false,
      }),
    ).toBe(true);
    expect(
      shouldLoadRadioWidgetArtwork({
        pageReady: false,
        desktopEligible: true,
        isRadioPage: false,
      }),
    ).toBe(false);
    expect(
      shouldLoadRadioWidgetArtwork({
        pageReady: true,
        desktopEligible: false,
        isRadioPage: false,
      }),
    ).toBe(false);
    expect(
      shouldLoadRadioWidgetArtwork({
        pageReady: true,
        desktopEligible: true,
        isRadioPage: true,
      }),
    ).toBe(false);
  });
});
