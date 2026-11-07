import { supabase } from '../lib/supabase';
import { downloadBlob, XLSX_MIME } from '../utils/spreadsheet.ts';
import { friendlyError } from './errors';

export type ReportFormat = 'html' | 'xlsx';

export interface SavedReport {
  id: string;
  dataset_id: string;
  report_name: string;
  report_format: ReportFormat | 'csv' | 'json' | 'pdf';
  storage_path: string;
  created_at: string;
}

const CONTENT_TYPE: Record<string, string> = { html: 'text/html', xlsx: XLSX_MIME, csv: 'text/csv', json: 'application/json', pdf: 'application/pdf' };

export async function listReports(): Promise<SavedReport[]> {
  const { data, error } = await supabase
    .from('reports')
    .select('id, dataset_id, report_name, report_format, storage_path, created_at')
    .order('created_at', { ascending: false });
  if (error) throw new Error(friendlyError(error));
  return (data ?? []) as SavedReport[];
}

/** Upload first, then record; remove the file again if the record cannot be created. */
export async function saveReport(userId: string, datasetId: string, name: string, format: ReportFormat, content: Blob): Promise<void> {
  const id = crypto.randomUUID();
  const path = `${userId}/${id}/report.${format}`;
  const blob = new Blob([content], { type: CONTENT_TYPE[format] });
  const { error: upErr } = await supabase.storage.from('reports').upload(path, blob, { contentType: CONTENT_TYPE[format], upsert: false });
  if (upErr) throw new Error(friendlyError(upErr));

  const { error } = await supabase
    .from('reports')
    .insert({ id, user_id: userId, dataset_id: datasetId, report_name: name.trim().slice(0, 120) || 'Report', report_format: format, storage_path: path });
  if (error) {
    await supabase.storage.from('reports').remove([path]);
    throw new Error(friendlyError(error));
  }
}

export async function downloadReport(r: SavedReport): Promise<void> {
  const { data, error } = await supabase.storage.from('reports').download(r.storage_path);
  if (error || !data) throw new Error('The stored report could not be found.');
  downloadBlob(data, `${r.report_name.replace(/[^\w.-]+/g, '_')}.${r.report_format}`);
}

export async function deleteReport(r: SavedReport): Promise<void> {
  const { error: fErr } = await supabase.storage.from('reports').remove([r.storage_path]);
  if (fErr) throw new Error(friendlyError(fErr));
  const { error } = await supabase.from('reports').delete().eq('id', r.id);
  if (error) throw new Error(friendlyError(error));
}
