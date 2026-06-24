import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { type NextRequest, NextResponse } from 'next/server';
import { normalizeChannel } from '@/lib/radio/contract';

export const runtime = 'nodejs';

const FFPROBE_PATH = '/usr/sbin/ffprobe';
const RADIO_STREAM_BASE_URL = 'https://radio.midori-ai.xyz/radio/v1/stream';
const NO_STORE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, private',
} as const;

const execFileAsync = promisify(execFile);

const TAG_KEYS = [
  'artist',
  'comment',
  'midori_ai_vibe_summary',
  'midori_ai_listener_takeaway',
  'midori_ai_why_made',
  'midori_ai_backstory',
  'midori_ai_radio_reason',
  'midori_ai_music_theme',
  'midori_ai_vibe_analysis',
] as const;

type ProbeTagKey = (typeof TAG_KEYS)[number];

type ProbeTags = Record<ProbeTagKey, string | null>;

interface FfprobeStream {
  sample_rate?: string | number;
  channels?: string | number;
  bit_rate?: string | number;
}

interface FfprobeOutput {
  streams?: FfprobeStream[];
  format?: {
    tags?: Record<string, unknown>;
    bit_rate?: string | number;
  };
}

function buildStreamUrl(channel: string): string {
  const url = new URL(RADIO_STREAM_BASE_URL);
  url.searchParams.set('channel', channel);
  url.searchParams.set('q', 'high');
  return url.toString();
}

function readStringTag(tags: Record<string, unknown>, key: string): string | null {
  const directValue = tags[key];
  if (typeof directValue === 'string' && directValue.trim().length > 0) {
    return directValue;
  }

  const matchingKey = Object.keys(tags).find(
    (candidateKey) => candidateKey.toLowerCase() === key.toLowerCase(),
  );
  if (!matchingKey) {
    return null;
  }

  const value = tags[matchingKey];
  return typeof value === 'string' && value.trim().length > 0 ? value : null;
}

function parseNullableNumber(input: string | number | undefined): number | null {
  if (typeof input === 'number') {
    return Number.isFinite(input) ? input : null;
  }

  if (typeof input !== 'string' || input.trim().length === 0) {
    return null;
  }

  const parsed = Number(input);
  return Number.isFinite(parsed) ? parsed : null;
}

function extractTags(tags: Record<string, unknown> | undefined): ProbeTags {
  const source = tags ?? {};
  return TAG_KEYS.reduce<ProbeTags>((accumulator, key) => {
    accumulator[key] = readStringTag(source, key);
    return accumulator;
  }, {} as ProbeTags);
}

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return 'Unknown ffprobe error';
}

export async function GET(request: NextRequest) {
  const channel = normalizeChannel(request.nextUrl.searchParams.get('channel'));
  const streamUrl = buildStreamUrl(channel);

  try {
    const { stdout } = await execFileAsync(
      FFPROBE_PATH,
      ['-v', 'quiet', '-print_format', 'json', '-show_format', '-show_streams', streamUrl],
      {
        timeout: 12_000,
        maxBuffer: 1024 * 1024,
      },
    );

    const parsed = JSON.parse(stdout) as FfprobeOutput;
    const firstStream = parsed.streams?.[0];
    const tags = extractTags(parsed.format?.tags);

    return NextResponse.json(
      {
        ok: true,
        ...tags,
        sample_rate: parseNullableNumber(firstStream?.sample_rate),
        channels: parseNullableNumber(firstStream?.channels),
        bit_rate:
          parseNullableNumber(firstStream?.bit_rate) ??
          parseNullableNumber(parsed.format?.bit_rate),
      },
      { headers: NO_STORE_HEADERS },
    );
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: 'RADIO_PROBE_FAILED',
          message: toErrorMessage(error),
        },
      },
      { status: 200, headers: NO_STORE_HEADERS },
    );
  }
}
