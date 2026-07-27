export const FADE_DURATION_MS = 500;
const STAGGER_MS = 80;
const BG_START_OUT_MS = 150;
const BG_START_IN_MS = 250;
const FG_START_IN_MS = 450;

export function easeInOutQuad(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - 2 * (1 - t) * (1 - t);
}

export interface EffectDelayInput {
  isBackground: boolean;
}

export function computeEffectDelays(
  effects: EffectDelayInput[],
  isOutgoing: boolean,
): { delays: number[]; maxEnd: number } {
  const delays: number[] = [];
  let maxEnd = 0;
  let bgIdx = 0;
  let fgIdx = 0;

  for (let i = 0; i < effects.length; i++) {
    const isBg = effects[i]?.isBackground ?? false;
    const groupIdx = isBg ? bgIdx++ : fgIdx++;
    const delay = isOutgoing
      ? isBg
        ? BG_START_OUT_MS + groupIdx * STAGGER_MS
        : groupIdx * STAGGER_MS
      : isBg
        ? BG_START_IN_MS + groupIdx * STAGGER_MS
        : FG_START_IN_MS + groupIdx * STAGGER_MS;
    delays.push(delay);
    maxEnd = Math.max(maxEnd, delay + FADE_DURATION_MS);
  }

  return { delays, maxEnd };
}

export function effectOpacity(elapsedMs: number, delayMs: number, isOutgoing: boolean): number {
  if (elapsedMs <= delayMs) return isOutgoing ? 1 : 0;
  const end = delayMs + FADE_DURATION_MS;
  if (elapsedMs >= end) return isOutgoing ? 0 : 1;
  const t = (elapsedMs - delayMs) / FADE_DURATION_MS;
  const eased = easeInOutQuad(t);
  return isOutgoing ? 1 - eased : eased;
}
