export default function Spinner({ fullScreen = false, label = 'Loading' }: { fullScreen?: boolean; label?: string }) {
  return (
    <div className={`flex items-center justify-center ${fullScreen ? 'min-h-screen' : 'py-16'}`}>
      <div role="status" aria-label={label} className="h-9 w-9 animate-spin rounded-full border-4 border-gray-300 border-t-brand-600 dark:border-gray-700 dark:border-t-brand-500" />
    </div>
  );
}
