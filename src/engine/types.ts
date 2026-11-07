/** Raw cell as read from a CSV/Excel file. */
export type Cell = string | number | boolean | Date | null | undefined;
/** Normalised cell stored in a dataset. null = missing. */
export type Value = string | number | null;

export type ColumnType = 'number' | 'date' | 'category' | 'text';

export interface Column {
  name: string;
  type: ColumnType;
}

export interface Dataset {
  name: string;
  fileName: string;
  columns: Column[];
  rows: Value[][];
}

export interface NumericStats {
  count: number;
  sum: number;
  mean: number;
  median: number;
  min: number;
  max: number;
  std: number;
  q1: number;
  q3: number;
}

export interface ColumnProfile {
  name: string;
  type: ColumnType;
  missing: number;
  unique: number;
  /** Cells that do not match the column's detected type. */
  invalid: number;
  stats: NumericStats | null;
  top: { value: string; count: number }[];
}

export interface DatasetProfile {
  rowCount: number;
  columnCount: number;
  missingCells: number;
  completeness: number; // percent 0-100
  duplicateRows: number;
  columns: ColumnProfile[];
}

export interface Insight {
  severity: 'good' | 'info' | 'warning';
  title: string;
  detail: string;
}

export interface Kpi {
  label: string;
  value: number;
  format: 'int' | 'percent' | 'decimal';
  hint?: string;
}

export interface CleanLogEntry {
  action: string;
  at: string; // ISO timestamp
}

export interface Sheet {
  name: string;
  rows: (string | number | null)[][];
}
