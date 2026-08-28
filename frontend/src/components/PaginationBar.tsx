import { ChevronLeft, ChevronRight } from "lucide-react";

export const PAGE_SIZES = [25, 50, 100, 200, 500];
export const ALL_SENTINEL = -1;
// Limite reellement envoyee a l'API quand "Tout" est selectionne.
export const ALL_LIMIT = 1000000;

export function effectiveLimit(limit: number) {
  return limit === ALL_SENTINEL ? ALL_LIMIT : limit;
}

export default function PaginationBar({
  total,
  limit,
  onLimitChange,
  page,
  onPageChange,
  label,
}: {
  total: number;
  limit: number;
  onLimitChange: (limit: number) => void;
  page: number;
  onPageChange: (page: number) => void;
  label: string;
}) {
  const isAll = limit === ALL_SENTINEL;
  const totalPages = isAll || limit <= 0 ? 1 : Math.max(1, Math.ceil(total / limit));

  return (
    <div className="flex items-center justify-between px-6 py-3 border-t border-gray-200 bg-gray-50 flex-wrap gap-3">
      <span className="text-sm text-gray-600 whitespace-nowrap">
        {total} {label}
      </span>
      <div className="flex items-center gap-4 flex-wrap">
        <label className="flex items-center gap-2 text-sm text-gray-600 whitespace-nowrap">
          Afficher
          <select
            value={limit}
            onChange={(e) => {
              onLimitChange(parseInt(e.target.value, 10));
              onPageChange(0);
            }}
            className="px-2 py-1 border border-gray-300 rounded-lg text-sm"
          >
            {PAGE_SIZES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
            <option value={ALL_SENTINEL}>Tout</option>
          </select>
        </label>
        {!isAll && totalPages > 1 && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => onPageChange(Math.max(0, page - 1))}
              disabled={page === 0}
              className="p-1 rounded hover:bg-gray-200 disabled:opacity-50"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-sm text-gray-600 whitespace-nowrap">{page + 1} / {totalPages}</span>
            <button
              onClick={() => onPageChange(Math.min(totalPages - 1, page + 1))}
              disabled={page >= totalPages - 1}
              className="p-1 rounded hover:bg-gray-200 disabled:opacity-50"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
