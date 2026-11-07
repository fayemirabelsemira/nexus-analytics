import { supabase } from '../lib/supabase';
import { friendlyError } from './errors';

export interface SavedAnalysis {
  id: string;
  dataset_id: string;
  analysis_name: string;
  analysis_type: string;
  analysis_results: Record<string, unknown>;
  created_at: string;
}

const MAX_JSON_BYTES = 900_000; // the table limits results to 1 MiB

export async function listAnalyses(): Promise<SavedAnalysis[]> {
  const { data, error } = await supabase
    .from('analysis_history')
    .select('id, dataset_id, analysis_name, analysis_type, analysis_results, created_at')
    .order('created_at', { ascending: false });
  if (error) throw new Error(friendlyError(error));
  return (data ?? []) as SavedAnalysis[];
}

export async function saveAnalysis(userId: string, datasetId: string, name: string, type: string, results: Record<string, unknown>): Promise<void> {
  if (JSON.stringify(results).length > MAX_JSON_BYTES) throw new Error('This analysis is too large to save.');
  const { error } = await supabase
    .from('analysis_history')
    .insert({ user_id: userId, dataset_id: datasetId, analysis_name: name.trim().slice(0, 120) || 'Analysis', analysis_type: type, analysis_results: results });
  if (error) throw new Error(friendlyError(error));
}

export async function deleteAnalysis(id: string): Promise<void> {
  const { error } = await supabase.from('analysis_history').delete().eq('id', id);
  if (error) throw new Error(friendlyError(error));
}
