import { startRadioHealthMonitor } from './lib/radio/radioHealthManager';

/** Start the radio probe once when this Next.js server process boots. */
export function register(): void {
  void startRadioHealthMonitor();
}
