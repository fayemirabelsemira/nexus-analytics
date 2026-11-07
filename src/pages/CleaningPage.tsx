import { useMemo, useState, type ReactNode } from 'react';
import { RotateCcw, Undo2 } from 'lucide-react';
import { changeCase, deleteColumn, fillMissing, removeDuplicates, removeRowsWithMissing, renameColumn, type CaseMode, type CleanResult, type FillStrategy } from '../engine/clean.ts';
import { profileDataset } from '../engine/profile.ts';
import type { Dataset } from '../engine/types.ts';
import { useFeedback } from '../contexts/FeedbackContext';
import { useSession } from '../contexts/SessionContext';
import PageHeader from '../components/PageHeader';
import { NoDataset } from '../components/EmptyState';
import { alertError, btnDanger, btnPrimary, btnSecondary, card, input, label, td, th } from '../components/ui';

function Op({ title, text, children }: { title: string; text: string; children: ReactNode }) {
  return (
    <div className={card}>
      <h3 className="font-semibold">{title}</h3>
      <p className="mb-3 mt-1 text-sm text-gray-500 dark:text-gray-400">{text}</p>
      <div className="flex flex-wrap items-end gap-3">{children}</div>
    </div>
  );
}

export default function CleaningPage() {
  const { dataset, log, undo, applyClean, undoClean, resetCleaning } = useSession();
  const { toast, confirm } = useFeedback();
  const [error, setError] = useState<string | null>(null);
  const [fillCol, setFillCol] = useState(0);
  const [strategy, setStrategy] = useState<FillStrategy>('mean');
  const [custom, setCustom] = useState('');
  const [dropCol, setDropCol] = useState('any');
  const [renameCol, setRenameCol] = useState(0);
  const [newName, setNewName] = useState('');
  const [delCol, setDelCol] = useState(0);
  const [caseCol, setCaseCol] = useState(0);
  const [caseMode, setCaseMode] = useState<CaseMode>('title');

  const profile = useMemo(() => (dataset ? profileDataset(dataset) : null), [dataset]);
  if (!dataset || !profile) return (<><PageHeader title="Data cleaning" /><NoDataset /></>);

  const run = (op: (ds: Dataset) => CleanResult) => {
    try {
      toast('success', applyClean(op));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'That operation failed.'); // dataset is unchanged
    }
  };

  const cols = dataset.columns;
  const colSelect = (id: string, value: number, set: (n: number) => void, only?: (t: string) => boolean) => (
    <div className="w-48"><label htmlFor={id} className={label}>Column</label>
      <select id={id} className={input} value={value} onChange={(e) => set(Number(e.target.value))}>
        {cols.map((c, i) => (only && !only(c.type) ? null : <option key={i} value={i}>{c.name}</option>))}
      </select></div>
  );
  const textCols = cols.findIndex((c) => c.type === 'text' || c.type === 'category');
  const caseIdx = cols[caseCol] && (cols[caseCol].type === 'text' || cols[caseCol].type === 'category') ? caseCol : textCols;

  return (
    <>
      <PageHeader
        title="Data cleaning"
        subtitle="Every change is logged and can be undone. Your original file is never modified."
        actions={<>
          <button className={btnSecondary} disabled={undo.length === 0} onClick={undoClean}><Undo2 className="h-4 w-4" aria-hidden />Undo last</button>
          <button className={btnSecondary} disabled={log.length === 0} onClick={async () => { if (await confirm({ title: 'Reset all cleaning?', message: 'This restores the dataset as it was when loaded.', confirmLabel: 'Reset', danger: true })) resetCleaning(); }}><RotateCcw className="h-4 w-4" aria-hidden />Reset</button>
        </>}
      />
      {error && <p role="alert" className={alertError}>{error}</p>}

      <section className={`${card} grid gap-4 sm:grid-cols-4`}>
        {[['Rows', profile.rowCount], ['Missing cells', profile.missingCells], ['Duplicate rows', profile.duplicateRows], ['Completeness', `${profile.completeness}%`]].map(([k, v]) => (
          <div key={String(k)}><p className="text-sm text-gray-500">{k}</p><p className="text-xl font-bold">{typeof v === 'number' ? v.toLocaleString() : v}</p></div>
        ))}
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <Op title="Remove duplicate rows" text="Keeps the first copy of every identical row. Check first: repeated sales on one day can be genuine.">
          <button className={btnPrimary} disabled={profile.duplicateRows === 0} onClick={() => run(removeDuplicates)}>Remove {profile.duplicateRows.toLocaleString()} duplicate{profile.duplicateRows === 1 ? '' : 's'}</button>
        </Op>

        <Op title="Fill missing values" text="Replace empty cells in one column.">
          {colSelect('fill-col', fillCol, setFillCol)}
          <div className="w-40"><label htmlFor="fill-how" className={label}>Fill with</label>
            <select id="fill-how" className={input} value={strategy} onChange={(e) => setStrategy(e.target.value as FillStrategy)}>
              <option value="mean">Average</option><option value="median">Median</option><option value="mode">Most common</option><option value="zero">Zero</option><option value="custom">Custom value</option>
            </select></div>
          {strategy === 'custom' && <div className="w-40"><label htmlFor="fill-val" className={label}>Value</label><input id="fill-val" className={input} value={custom} onChange={(e) => setCustom(e.target.value)} /></div>}
          <button className={btnPrimary} onClick={() => run((d) => fillMissing(d, fillCol, strategy, custom))}>Fill</button>
        </Op>

        <Op title="Remove rows with missing values" text="Drop rows that have an empty cell in a column (or in any column).">
          <div className="w-48"><label htmlFor="drop-col" className={label}>Column</label>
            <select id="drop-col" className={input} value={dropCol} onChange={(e) => setDropCol(e.target.value)}>
              <option value="any">Any column</option>{cols.map((c, i) => <option key={i} value={i}>{c.name}</option>)}
            </select></div>
          <button className={btnDanger} onClick={() => run((d) => removeRowsWithMissing(d, dropCol === 'any' ? null : Number(dropCol)))}>Remove rows</button>
        </Op>

        <Op title="Standardize text case" text="Make spelling consistent, e.g. 'north', 'North' and 'NORTH'.">
          {textCols >= 0 ? (<>
            {colSelect('case-col', caseIdx, setCaseCol, (t) => t === 'text' || t === 'category')}
            <div className="w-36"><label htmlFor="case-mode" className={label}>Case</label>
              <select id="case-mode" className={input} value={caseMode} onChange={(e) => setCaseMode(e.target.value as CaseMode)}><option value="title">Title Case</option><option value="upper">UPPER</option><option value="lower">lower</option></select></div>
            <button className={btnPrimary} onClick={() => run((d) => changeCase(d, caseIdx, caseMode))}>Apply</button>
          </>) : <p className="text-sm text-gray-500">No text columns.</p>}
        </Op>

        <Op title="Rename a column" text="Give a column a clearer name.">
          {colSelect('ren-col', renameCol, setRenameCol)}
          <div className="w-48"><label htmlFor="ren-name" className={label}>New name</label><input id="ren-name" className={input} value={newName} onChange={(e) => setNewName(e.target.value)} /></div>
          <button className={btnPrimary} onClick={() => { run((d) => renameColumn(d, renameCol, newName)); setNewName(''); }}>Rename</button>
        </Op>

        <Op title="Delete a column" text="Remove a column you do not need.">
          {colSelect('del-col', delCol, setDelCol)}
          <button className={btnDanger} onClick={() => run((d) => deleteColumn(d, delCol))}>Delete column</button>
        </Op>
      </div>

      <section className={card}>
        <h2 className="mb-3 font-semibold">Columns</h2>
        <div className="overflow-x-auto"><table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
          <thead><tr><th className={th}>Column</th><th className={th}>Type</th><th className={`${th} text-right`}>Missing</th><th className={`${th} text-right`}>Invalid</th><th className={`${th} text-right`}>Unique</th></tr></thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">{profile.columns.map((c) => (
            <tr key={c.name}><td className={td}>{c.name}</td><td className={td}>{c.type}</td><td className={`${td} text-right`}>{c.missing.toLocaleString()}</td><td className={`${td} text-right`}>{c.invalid.toLocaleString()}</td><td className={`${td} text-right`}>{c.unique.toLocaleString()}</td></tr>
          ))}</tbody></table></div>
      </section>

      <section className={card}>
        <h2 className="mb-3 font-semibold">Cleaning log</h2>
        {log.length === 0 ? <p className="text-sm text-gray-500">No changes yet.</p> : <ol className="list-decimal space-y-1 pl-5 text-sm">{log.map((l, i) => <li key={i}>{l.action}</li>)}</ol>}
      </section>
    </>
  );
}
