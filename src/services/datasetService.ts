import { supabase } from '../lib/supabase';
import { parseCSV } from '../utils/csv.ts';
import { downloadBlob } from '../utils/spreadsheet.ts';
import { buildDataset, MAX_COLUMNS, MAX_ROWS } from '../engine/build.ts';
import { datasetToCsv } from '../engine/export.ts';
import type { Dataset } from '../engine/types.ts';
import { friendlyError } from './errors';

export const MAX_SAVE_BYTES = 25 * 1024 * 1024;

export interface SavedDataset {
  id: string;
  user_id: string;
  dataset_name: string;
  original_filename: string;
  file_format: 'csv' | 'xlsx' | 'xls';
  file_size: number;
  row_count: number;
  column_count: number;
  category: string | null;
  storage_path: string;
  created_at: string;
  updated_at: string;
}

export async function listDatasets(): Promise<SavedDataset[]> {
  const { data, error } = await supabase.from('datasets').select('*').order('created_at', { ascending: false });
  if (error) throw new Error(friendlyError(error));
  return (data ?? []) as SavedDataset[];
}

/**
 * Save the dataset (in its current, cleaned state) as a CSV file in the private bucket and record its
 * metadata. The file is uploaded first; if the metadata insert fails the file is removed again, so a
 * failed save never leaves a broken record behind.
 */
export async function saveDataset(userId: string, ds: Dataset, opts: { name: string; category: string }): Promise<SavedDataset> {
  const name = opts.name.trim();
  if (!name) throw new Error('Enter a name for the dataset.');
  if (ds.rows.length > MAX_ROWS) throw new Error(`Too many rows to save (limit ${MAX_ROWS.toLocaleString()}).`);
  if (ds.columns.length > MAX_COLUMNS) throw new Error(`Too many columns to save (limit ${MAX_COLUMNS}).`);

  const blob = new Blob([datasetToCsv(ds)], { type: 'text/csv' });
  if (blob.size > MAX_SAVE_BYTES) throw new Error('This dataset is larger than the 25 MB storage limit.');

  const id = crypto.randomUUID();
  const path = `${userId}/${id}/data.csv`;
  const { error: upErr } = await supabase.storage.from('datasets').upload(path, blob, { contentType: 'text/csv', upsert: false });
  if (upErr) throw new Error(friendlyError(upErr));

  const { data, error } = await supabase
    .from('datasets')
    .insert({
      id,
      user_id: userId,
      dataset_name: name.slice(0, 120),
      original_filename: ds.fileName.slice(0, 255) || 'dataset.csv',
      file_format: 'csv',
      file_size: blob.size,
      row_count: ds.rows.length,
      column_count: ds.columns.length,
      category: opts.category.trim() ? opts.category.trim().slice(0, 60) : null,
      storage_path: path,
    })
    .select()
    .single();

  if (error) {
    await supabase.storage.from('datasets').remove([path]); // roll back the upload
    throw new Error(friendlyError(error));
  }
  return data as SavedDataset;
}

async function downloadText(path: string): Promise<string> {
  const { data, error } = await supabase.storage.from('datasets').download(path);
  if (error || !data) throw new Error('The stored file could not be found. It may have been removed.');
  return data.text();
}

export async function openDataset(row: SavedDataset): Promise<Dataset> {
  const text = await downloadText(row.storage_path);
  return buildDataset(parseCSV(text), { name: row.dataset_name, fileName: row.original_filename, hasHeader: true });
}

export async function exportSavedDataset(row: SavedDataset): Promise<void> {
  const text = await downloadText(row.storage_path);
  downloadBlob(new Blob([text], { type: 'text/csv;charset=utf-8' }), `${row.dataset_name.replace(/[^\w.-]+/g, '_')}.csv`);
}

/**
 * Delete a dataset together with its reports and files. Files go first: if something fails midway the
 * dataset row is still there, so the user can simply try again (removing a missing file is harmless).
 */
export async function deleteDataset(row: SavedDataset): Promise<void> {
  const { data: reports, error: rErr } = await supabase.from('reports').select('storage_path').eq('dataset_id', row.id);
  if (rErr) throw new Error(friendlyError(rErr));

  const reportPaths = (reports ?? []).map((r) => r.storage_path as string);
  if (reportPaths.length) {
    const { error } = await supabase.storage.from('reports').remove(reportPaths);
    if (error) throw new Error(friendlyError(error));
  }
  const { error: fErr } = await supabase.storage.from('datasets').remove([row.storage_path]);
  if (fErr) throw new Error(friendlyError(fErr));

  // The database cascades to analysis_history and reports.
  const { error } = await supabase.from('datasets').delete().eq('id', row.id);
  if (error) throw new Error(friendlyError(error));
}
