export interface RadioImageInventory {
  images: string[];
  placeholder: string;
  count: number;
  generated_at: string;
}

export function createDeterministicHash(input: string): number {
  let hash = 2166136261;

  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

export function pickDeterministicImage(
  images: readonly string[],
  identityKey: string,
  placeholder: string
): string {
  if (images.length === 0) {
    return placeholder;
  }

  const hash = createDeterministicHash(identityKey);
  const index = hash % images.length;
  return images[index] ?? placeholder;
}

export async function preloadImage(url: string, timeoutMs: number = 7000): Promise<boolean> {
  if (typeof window === 'undefined') {
    return false;
  }

  return new Promise<boolean>((resolve) => {
    const image = new Image();
    let settled = false;

    const finalize = (success: boolean) => {
      if (settled) {
        return;
      }
      settled = true;
      window.clearTimeout(timeoutId);
      resolve(success);
    };

    image.onload = () => finalize(true);
    image.onerror = () => finalize(false);
    image.src = url;

    const timeoutId = window.setTimeout(() => {
      finalize(false);
    }, timeoutMs);
  });
}
