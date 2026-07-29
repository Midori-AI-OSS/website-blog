export const DEFAULT_PAGE_SIZE = 10;
export const MAX_VISIBLE_PAGE_BUTTONS = 5;
export const PAGE_SIZE_ALL_STORAGE_VALUE = 'all';

export function serializePageSize(pageSize: number): string {
  return pageSize === Infinity ? PAGE_SIZE_ALL_STORAGE_VALUE : String(pageSize);
}

export function parseStoredPageSize(stored: string | null): number | null {
  if (stored === null) return null;
  if (stored === PAGE_SIZE_ALL_STORAGE_VALUE) return Infinity;

  const parsed = Number(stored);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

export function getVisiblePageNumbers(
  totalPages: number,
  currentPage: number,
  maxVisiblePages = MAX_VISIBLE_PAGE_BUTTONS,
): number[] {
  if (totalPages <= 0) return [];

  const safeMaxVisiblePages = Math.max(1, Math.floor(maxVisiblePages));
  if (totalPages <= safeMaxVisiblePages) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const clampedCurrentPage = Math.min(Math.max(currentPage, 1), totalPages);
  const halfWindow = Math.floor(safeMaxVisiblePages / 2);
  let start = Math.max(1, clampedCurrentPage - halfWindow);
  let end = start + safeMaxVisiblePages - 1;

  if (end > totalPages) {
    end = totalPages;
    start = end - safeMaxVisiblePages + 1;
  }

  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
}
