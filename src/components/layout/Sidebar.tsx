import { NavLink } from 'react-router-dom';
import { BarChart3, ClipboardList, Download, FileText, FolderOpen, History, LayoutDashboard, LineChart, Sparkles, Table2, Upload, UserCircle, X, type LucideIcon } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface Item { to: string; label: string; icon: LucideIcon; end?: boolean }

const ANALYZE: Item[] = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/upload', label: 'Upload Dataset', icon: Upload },
  { to: '/preview', label: 'Data Preview', icon: Table2 },
  { to: '/cleaning', label: 'Data Cleaning', icon: Sparkles },
  { to: '/analytics', label: 'Analytics', icon: BarChart3 },
  { to: '/visualizations', label: 'Visualizations', icon: LineChart },
  { to: '/reports', label: 'Reports', icon: FileText },
  { to: '/export', label: 'Export', icon: Download },
];

const ACCOUNT: Item[] = [
  { to: '/datasets', label: 'Saved Datasets', icon: FolderOpen },
  { to: '/history', label: 'Analysis History', icon: History },
  { to: '/saved-reports', label: 'Saved Reports', icon: ClipboardList },
  { to: '/account', label: 'Account', icon: UserCircle },
];

function Group({ title, items, onNavigate }: { title: string; items: Item[]; onNavigate: () => void }) {
  return (
    <div>
      <p className="px-3 pb-1 text-xs font-semibold uppercase tracking-wider text-gray-400">{title}</p>
      <div className="space-y-1">
        {items.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={onNavigate}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
                isActive ? 'bg-brand-50 text-brand-700 dark:bg-brand-700/20 dark:text-brand-100' : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
              }`
            }
          >
            <Icon className="h-5 w-5 shrink-0" aria-hidden />
            {label}
          </NavLink>
        ))}
      </div>
    </div>
  );
}

export default function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user } = useAuth();
  return (
    <>
      {open && <div className="fixed inset-0 z-40 bg-black/40 md:hidden" onClick={onClose} aria-hidden />}
      <aside
        aria-label="Main navigation"
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-gray-200 bg-white transition-transform dark:border-gray-800 dark:bg-gray-900 md:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="flex items-center justify-between px-5 py-5">
          <span className="flex items-center gap-2 text-lg font-bold tracking-tight">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-600 text-white"><BarChart3 className="h-5 w-5" aria-hidden /></span>
            Nexus Analytics
          </span>
          <button className="md:hidden" onClick={onClose} aria-label="Close menu"><X className="h-5 w-5" /></button>
        </div>
        <nav className="flex-1 space-y-6 overflow-y-auto px-3 pb-4">
          <Group title="Analyze" items={ANALYZE} onNavigate={onClose} />
          {user && <Group title="My account" items={ACCOUNT} onNavigate={onClose} />}
        </nav>
      </aside>
    </>
  );
}
