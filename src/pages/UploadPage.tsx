import { useMemo, useRef, useState, type DragEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileSpreadsheet, UploadCloud } from 'lucide-react';
import type { Cell } from '../engine/types.ts';
import { buildDataset } from '../engine/build.ts';
import { looksLikeHeader } from '../engine/parse.ts';
import { readSpreadsheet, type ParsedSheet } from '../utils/spreadsheet.ts';
import { useFeedback } from '../contexts/FeedbackContext';
import { useSession } from '../contexts/SessionContext';
import PageHeader from '../components/PageHeader';
import { alertError, btnPrimary, btnSecondary, card, input, label } from '../components/ui';

export default function UploadPage() {
  const navigate = useNavigate();
  const { dataset, unsaved, load } = useSession();
  const { confirm, toast } = useFeedback();
  const fileRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState('');
  const [sheets, setSheets] = useState<ParsedSheet[]>([]);
  const [sheetIdx, setSheetIdx] = useState(0);
  const [hasHeader, setHasHeader] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);

  const rows: Cell[][] = sheets[sheetIdx]?.rows ?? [];
  const width = useMemo(() => rows.slice(0, 200).reduce((m, r) => Math.max(m, r.length), 0), [rows]);

  const pick = (list: ParsedSheet[], idx: number) => {
    setSheetIdx(idx);
    setHasHeader(looksLikeHeader(list[idx]?.rows[0]));
  };

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    setBusy(true);
    try {
      const parsed = await readSpreadsheet(file);
      setSheets(parsed);
      setFileName(file.name);
      pick(parsed, 0);
    } catch (e) {
      // A failed read never touches the dataset that is already open.
      setError(e instanceof Error ? e.message : 'Could not read this file.');
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    void onFile(e.dataTransfer?.files?.[0]);
  };

  const analyze = async () => {
    if (dataset && unsaved && !(await confirm({ title: 'Replace the current dataset?', message: 'Your current dataset has not been saved. Loading a new file will discard it.', confirmLabel: 'Replace', danger: true }))) return;
    try {
      const name = fileName.replace(/\.[^.]+$/, '') || 'Dataset';
      const sheetName = sheets.length > 1 ? ` – ${sheets[sheetIdx].name}` : '';
      const ds = buildDataset(rows, { name: name + sheetName, fileName, hasHeader });
      load(ds);
      toast('success', `Loaded ${ds.rows.length.toLocaleString()} rows and ${ds.columns.length} columns.`);
      navigate('/preview');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not analyze this file.');
    }
  };

  return (
    <>
      <PageHeader title="Upload dataset" subtitle="CSV, XLSX or XLS · up to 25 MB and 100,000 rows. Your file is processed in your browser and is not uploaded anywhere." />

      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={`${card} flex flex-col items-center border-2 border-dashed py-12 text-center transition ${dragging ? 'border-brand-500 bg-brand-50 dark:bg-brand-700/10' : ''}`}
      >
        <UploadCloud className="mb-3 h-10 w-10 text-gray-400" aria-hidden />
        <p className="font-medium">Drag a file here, or</p>
        <input ref={fileRef} type="file" accept=".csv,.tsv,.txt,.xlsx,.xls,.xlsm" className="sr-only" id="file-input" onChange={(e) => void onFile(e.target.files?.[0])} />
        <button className={`${btnPrimary} mt-3`} onClick={() => fileRef.current?.click()} disabled={busy}>{busy ? 'Reading file…' : 'Choose file'}</button>
      </div>

      {error && <p role="alert" className={alertError}>{error}</p>}

      {sheets.length > 0 && (
        <section className={`${card} space-y-4`}>
          <div className="flex items-center gap-2 text-sm font-medium"><FileSpreadsheet className="h-5 w-5 text-brand-600" aria-hidden />{fileName}<span className="font-normal text-gray-500">· {Math.max(0, rows.length - (hasHeader ? 1 : 0)).toLocaleString()} data rows · {width} columns</span></div>

          <div className="flex flex-wrap items-end gap-4">
            {sheets.length > 1 && (
              <div className="w-56">
                <label htmlFor="sheet" className={label}>Sheet</label>
                <select id="sheet" className={input} value={sheetIdx} onChange={(e) => pick(sheets, Number(e.target.value))}>
                  {sheets.map((s, i) => <option key={s.name} value={i}>{s.name}</option>)}
                </select>
              </div>
            )}
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={hasHeader} onChange={(e) => setHasHeader(e.target.checked)} />First row contains column names</label>
          </div>

          <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-800">
            <table className="min-w-full text-sm">
              <tbody>
                {rows.slice(0, 8).map((r, ri) => (
                  <tr key={ri} className={ri === 0 && hasHeader ? 'bg-gray-50 font-semibold dark:bg-gray-900' : 'border-t border-gray-100 dark:border-gray-800'}>
                    {Array.from({ length: Math.min(width, 12) }, (_, ci) => <td key={ci} className="whitespace-nowrap px-3 py-1.5">{r[ci] === null || r[ci] === undefined ? '' : r[ci] instanceof Date ? r[ci].toISOString().slice(0, 10) : String(r[ci])}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-gray-500">Preview of the first rows{width > 12 ? ' and columns' : ''}. Types, missing values and duplicates are detected next.</p>

          <div className="flex gap-3">
            <button className={btnPrimary} onClick={() => void analyze()}>Analyze dataset</button>
            <button className={btnSecondary} onClick={() => { setSheets([]); setFileName(''); setError(null); }}>Cancel</button>
          </div>
        </section>
      )}
    </>
  );
}
