const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

export const PORTLAND_TIME_ZONE = 'America/Los_Angeles';

export interface PublishState {
  publishDate: string | null;
  todayInPortland: string;
  isPublished: boolean;
  isScheduled: boolean;
}

function toDateParts(dateString: string): { year: number; month: number; day: number } | null {
  const match = dateString.match(ISO_DATE_PATTERN);
  if (!match?.[1] || !match[2] || !match[3]) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
    return null;
  }

  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return null;
  }

  const candidate = new Date(Date.UTC(year, month - 1, day, 12));
  if (candidate.getUTCFullYear() !== year) return null;
  if (candidate.getUTCMonth() !== month - 1) return null;
  if (candidate.getUTCDate() !== day) return null;

  return { year, month, day };
}

function resolveNow(now: Date | string | undefined): Date {
  if (now instanceof Date) {
    return Number.isNaN(now.getTime()) ? new Date() : now;
  }

  if (typeof now === 'string') {
    const isoDate = normalizeIsoDateString(now);
    if (isoDate) {
      const parts = toDateParts(isoDate);
      if (parts) {
        return new Date(Date.UTC(parts.year, parts.month - 1, parts.day, 12));
      }
    }

    const parsed = new Date(now);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }

  return new Date();
}

export function normalizeIsoDateString(value: string | undefined | null): string | null {
  if (typeof value !== 'string') return null;

  const trimmed = value.trim();
  return toDateParts(trimmed) ? trimmed : null;
}

export function extractIsoDateFromBlogFilename(filename: string): string | null {
  const match = filename.match(/^(\d{4}-\d{2}-\d{2})\.md$/);
  return normalizeIsoDateString(match?.[1] ?? null);
}

export function getDateStringInTimeZone(
  timeZone: string,
  now?: Date | string
): string {
  const resolvedNow = resolveNow(now);
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  const parts = formatter.formatToParts(resolvedNow);
  const year = parts.find((part) => part.type === 'year')?.value;
  const month = parts.find((part) => part.type === 'month')?.value;
  const day = parts.find((part) => part.type === 'day')?.value;

  if (!year || !month || !day) {
    throw new Error(`Unable to compute date parts for timezone ${timeZone}`);
  }

  return `${year}-${month}-${day}`;
}

export function getPortlandToday(now?: Date | string): string {
  return getDateStringInTimeZone(PORTLAND_TIME_ZONE, now);
}

export function getPublishState(
  publishDate: string | undefined | null,
  now?: Date | string
): PublishState {
  const normalizedPublishDate = normalizeIsoDateString(publishDate);
  const todayInPortland = getPortlandToday(now);
  const isScheduled = normalizedPublishDate !== null && normalizedPublishDate > todayInPortland;

  return {
    publishDate: normalizedPublishDate,
    todayInPortland,
    isPublished: !isScheduled,
    isScheduled,
  };
}

export function formatLongDate(dateString: string | undefined | null): string | null {
  const parts = toDateParts(normalizeIsoDateString(dateString) ?? '');
  if (!parts) return null;

  const date = new Date(Date.UTC(parts.year, parts.month - 1, parts.day, 12));
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'UTC',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date);
}
