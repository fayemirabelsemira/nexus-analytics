import { Link } from 'react-router-dom';
import { Filter } from 'lucide-react';
import { useSession } from '../../contexts/SessionContext';

/** Shows when filters narrow the data used by an analytics page. */
export default function FilterSummary() {
  const { dataset, view, filters, clearFilters } = useSession();
  if (!dataset || !view || filters.length === 0) return null;
  return (
    <p className="flex flex-wrap items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:bg-amber-900/20 dark:text-amber-100">
      <Filter className="h-4 w-4" aria-hidden />
      Using {view.rows.length.toLocaleString()} of {dataset.rows.length.toLocaleString()} rows ({filters.length} filter{filters.length === 1 ? '' : 's'} active).
      <Link to="/preview" className="font-medium underline">Edit</Link>
      <button className="font-medium underline" onClick={clearFilters}>Clear</button>
    </p>
  );
}
