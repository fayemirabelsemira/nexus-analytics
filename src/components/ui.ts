/** Shared Tailwind class strings so every screen looks consistent. */
export const card = 'rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900';
export const input =
  'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30 disabled:opacity-60 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100';
const btn =
  'inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:focus-visible:ring-offset-gray-900';
export const btnPrimary = `${btn} bg-brand-600 text-white hover:bg-brand-700`;
export const btnSecondary = `${btn} border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800`;
export const btnDanger = `${btn} bg-red-600 text-white hover:bg-red-700`;
export const btnGhost = `${btn} text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800`;
export const th = 'px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400';
export const td = 'px-4 py-2.5 text-sm text-gray-900 dark:text-gray-100';
export const label = 'mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200';
export const alertError = 'rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200';
export const alertInfo = 'rounded-lg border border-brand-100 bg-brand-50 p-3 text-sm text-brand-700 dark:border-brand-700/40 dark:bg-brand-700/10 dark:text-brand-100';
