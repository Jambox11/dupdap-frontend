import { cn } from '@/lib/utils';

/** A single pulsing gray placeholder block. Size/shape it with className. */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn('animate-pulse rounded-md bg-gray-200', className)}
    />
  );
}

/**
 * Visually-hidden live-region announcement so screen readers know a section
 * is loading rather than empty. The decorative pulse blocks stay aria-hidden.
 */
function LoadingAnnouncement({ label = 'Loading…' }: { label?: string }) {
  return (
    <span role="status" aria-live="polite" className="sr-only">
      {label}
    </span>
  );
}

/**
 * Placeholder rows for a `<table>` body while data loads.
 * Renders `rows` × `cols` cells, each holding a shimmering bar so the
 * table keeps its eventual height and column layout.
 */
export function SkeletonTableRows({
  rows = 5,
  cols,
  cellClassName = 'px-6 py-4',
}: {
  rows?: number;
  cols: number;
  cellClassName?: string;
}) {
  return (
    <>
      <tr>
        <td colSpan={cols} className="p-0">
          <LoadingAnnouncement />
        </td>
      </tr>
      {Array.from({ length: rows }).map((_, r) => (
        <tr key={r}>
          {Array.from({ length: cols }).map((_, c) => (
            <td key={c} className={cellClassName}>
              <Skeleton className="h-4 w-24" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

/**
 * Placeholder rows for a stacked list / mobile card layout while data loads.
 * Each item mimics a two-line row (label + value).
 */
export function SkeletonList({
  rows = 5,
  className = 'px-6 py-4',
}: {
  rows?: number;
  className?: string;
}) {
  return (
    <>
      <LoadingAnnouncement />
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className={cn('flex items-center justify-between', className)}>
          <div className="space-y-2">
            <Skeleton className="h-3.5 w-32" />
            <Skeleton className="h-3 w-20" />
          </div>
          <Skeleton className="h-3.5 w-16" />
        </div>
      ))}
    </>
  );
}
