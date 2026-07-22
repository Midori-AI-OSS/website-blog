export const TTS_CACHE_VERSION = '2';
export const TTS_CONTENT_HASH_PATTERN = /^[a-f0-9]{64}$/;

export type TtsState = 'not_generated' | 'generating' | 'ready';

export interface TtsTimedStatement {
  start: number;
  end: number;
  paragraph: number;
  chunk: number;
  start_ms: number;
  end_ms: number;
}

export interface TtsManifestChunk {
  index: number;
  start: number;
  end: number;
  generated: boolean;
  start_ms?: number;
  end_ms?: number;
}

export interface TtsManifest {
  cache_version: string;
  content_hash: string;
  text_length: number;
  paragraph_gap_ms: number;
  duration_ms: number;
  chunks: TtsManifestChunk[];
  statements: TtsTimedStatement[];
}

export interface TtsStatusPayload {
  status: TtsState;
  generated_chunks: number;
  total_chunks: number;
  playable: boolean;
  cache_version: string;
  content_hash: string;
  manifest?: TtsManifest;
}

export interface TtsHighlightRange {
  start: number;
  end: number;
  precision: 'statement' | 'chunk';
}

export function isValidTtsIdentity(contentHash: string | null, cacheVersion: string | null) {
  return cacheVersion === TTS_CACHE_VERSION && TTS_CONTENT_HASH_PATTERN.test(contentHash ?? '');
}

export function ttsIdentityQuery(contentHash: string): string {
  const params = new URLSearchParams({
    content_hash: contentHash,
    cache_version: TTS_CACHE_VERSION,
  });
  return params.toString();
}
