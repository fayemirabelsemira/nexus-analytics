import { useEffect, useMemo, useState } from 'react';
import { Search, X } from 'lucide-react';
import type { Dataset } from '../../engine/types.ts';
import { describeFilter, type Filter } from '../../engine/filter.ts';
import { useSession } from '../../contexts/SessionContext';
import { btnSecondary, input, label } from '../ui';

const newId = () => crypto.randomUUID();
const num = (s: string) => (s.trim() === '' || !Number.isFinite(Number(s)) ? undefined : Number(s));

function AddFilter({ ds, onAdd }: { ds: Dataset; onAdd: (f: Filter) => void }) {
  const [col, setCol] = useState(0);
  const [a, setA] = useState('');
  const [b, setB] = useState('');
  const [picked, setPicked] = useState<string[]>([]);
  const column = ds.columns[col] ?? ds.columns[0];

  const options = useMemo(() => {
    if (column.type !== 'category') return null;
    const set = new Set<string>();
    for (const r of ds.rows) {
      set.add(r[col] === null ? '(missing)' : String(r[col]));
      if (set.size > 100) return null; // too many to list: fall back to text search
    }
    return [...set].sort((x, y) => x.localeCompare(y, undefined, { numeric: true }));
  }, [ds, col, column.type]);

  const reset = () => { setA(''); setB(''); setPicked([]); };
  const canAdd = column.type === 'number' ? num(a) !== undefined || num(b) !== undefined : column.type === 'date' ? a !== '' || b !== '' : options ? picked.length > 0 : a.trim() !== '';

  const add = () => {
    if (!canAdd) return;
    if (column.type === 'number') onAdd({ id: newId(), kind: 'range', column: col, min: num(a), max: num(b) });
    else if (column.type === 'date') onAdd({ id: newId(), kind: 'dates', column: col, from: a || undefined, to: b || undefined });
    else if (options) onAdd({ id: newId(), kind: 'in', column: col, values: picked });
    else onAdd({ id: newId(), kind: 'text', column: col, contains: a.trim() });
    reset();
  };

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="w-48">
        <label htmlFor="f-col" className={label}>Filter column</label>
        <select id="f-col" className={input} value={col} onChange={(e) => { setCol(Number(e.target.value)); reset(); }}>
          {ds.columns.map((c, i) => <option key={i} value={i}>{c.name}</option>)}
        </select>
      </div>
      {column.type === 'number' && (<>
        <div className="w-32"><label htmlFor="f-min" className={label}>Min</label><input id="f-min" className={input} inputMode="decimal" value={a} onChange={(e) => setA(e.target.value)} /></div>
        <div className="w-32"><label htmlFor="f-max" className={label}>Max</label><input id="f-max" className={input} inputMode="decimal" value={b} onChange={(e) => setB(e.target.value)} /></div>
      </>)}
      {column.type === 'date' && (<>
        <div><label htmlFor="f-from" className={label}>From</label><input id="f-from" type="date" className={input} value={a} onChange={(e) => setA(e.target.value)} /></div>
        <div><label htmlFor="f-to" className={label}>To</label><input id="f-to" type="date" className={input} value={b} onChange={(e) => setB(e.target.value)} /></div>
      </>)}
      {options && (
        <fieldset className="max-h-32 min-w-48 overflow-y-auto rounded-lg border border-gray-200 p-2 text-sm dark:border-gray-700">
          <legend className="px-1 text-xs text-gray-500">Values</legend>
          {options.map((o) => (
            <label key={o} className="flex items-center gap-2 py-0.5">
              <input type="checkbox" checked={picked.includes(o)} onChange={(e) => setPicked((p) => (e.target.checked ? [...p, o] : p.filter((x) => x !== o)))} />
              {o}
            </label>
          ))}
        </fieldset>
      )}
      {!options && column.type !== 'number' && column.type !== 'date' && (
        <div className="w-48"><label htmlFor="f-text" className={label}>Contains</label><input id="f-text" className={input} value={a} onChange={(e) => setA(e.target.value)} /></div>
      )}
      <button className={btnSecondary} disabled={!canAdd} onClick={add}>Add filter</button>
    </div>
  );
}

/** Quick search + column filters + removable filter chips. */
export default function FilterBar({ ds }: { ds: Dataset }) {
  const { filters, addFilter, removeFilter, clearFilters, setSearch } = useSession();
  const [text, setText] = useState(() => (filters.find((f) => f.kind === 'search') as { text: string } | undefined)?.text ?? '');

  useEffect(() => {
    const t = setTimeout(() => setSearch(text), 250);
    return () => clearTimeout(t);
  }, [text, setSearch]);

  // Keep the box in sync if filters were cleared elsewhere.
  useEffect(() => {
    if (filters.length === 0) setText('');
  }, [filters.length]);

  return (
    <div className="space-y-4">
      <div className="relative max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-gray-400" aria-hidden />
        <input type="search" aria-label="Search all columns" placeholder="Search all columns…" className={`${input} pl-9`} value={text} onChange={(e) => setText(e.target.value)} />
      </div>
      <AddFilter ds={ds} onAdd={addFilter} />
      {filters.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {filters.map((f) => (
            <span key={f.id} className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700 dark:bg-brand-700/20 dark:text-brand-100">
              {describeFilter(ds, f)}
              <button onClick={() => (f.kind === 'search' ? (setText(''), setSearch('')) : removeFilter(f.id))} aria-label={`Remove filter ${describeFilter(ds, f)}`}><X className="h-3.5 w-3.5" /></button>
            </span>
          ))}
          <button className="text-xs text-brand-600 hover:underline" onClick={clearFilters}>Clear all</button>
        </div>
      )}
    </div>
  );
}
