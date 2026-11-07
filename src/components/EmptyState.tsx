import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { FileSpreadsheet, type LucideIcon } from 'lucide-react';
import { btnPrimary, card } from './ui';

export default function EmptyState({ icon: Icon = FileSpreadsheet, title, text, action }: { icon?: LucideIcon; title: string; text: string; action?: ReactNode }) {
  return (
    <div className={`${card} flex flex-col items-center py-14 text-center`}>
      <Icon className="mb-4 h-12 w-12 text-gray-400" aria-hidden />
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="mt-1 max-w-md text-sm text-gray-500 dark:text-gray-400">{text}</p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

/** Shown on analytics pages when no dataset has been loaded yet. */
export function NoDataset() {
  return (
    <EmptyState
      title="No dataset loaded"
      text="Upload a CSV or Excel file to preview, clean, analyze and export it. No account needed."
      action={<Link to="/upload" className={btnPrimary}>Upload a dataset</Link>}
    />
  );
}
