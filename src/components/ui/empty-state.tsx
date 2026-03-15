import { ReactNode } from "react";

type EmptyStateProps = {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
};

/**
 * Empty state placeholder for lists, tables, and filtered views.
 * Use when data is loaded but the result set is empty.
 */
export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-white px-6 py-12 text-center">
      {icon && <div className="mb-3 text-slate-400">{icon}</div>}
      <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
      {description && (
        <p className="mt-1 max-w-sm text-sm text-slate-500">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

/**
 * Contextual empty state for filtered/searched results.
 * Shows a different message when the total dataset isn't empty but the current filter returned nothing.
 */
export function FilteredEmptyState({
  totalCount,
  filterLabel = "search",
  onClear,
}: {
  totalCount: number;
  filterLabel?: string;
  onClear?: () => void;
}) {
  if (totalCount === 0) {
    return (
      <EmptyState
        title="No data yet"
        description="There's nothing here yet. Data will appear once it's been added."
      />
    );
  }

  return (
    <EmptyState
      title="No results found"
      description={`No items match your current ${filterLabel}. Try adjusting your filters.`}
      action={
        onClear ? (
          <button
            onClick={onClear}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Clear {filterLabel}
          </button>
        ) : undefined
      }
    />
  );
}
