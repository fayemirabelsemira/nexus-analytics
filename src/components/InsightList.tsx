import { AlertTriangle, CheckCircle2, Info } from 'lucide-react';
import type { Insight } from '../engine/types.ts';

const ICON = { warning: AlertTriangle, info: Info, good: CheckCircle2 } as const;
const TONE: Record<Insight['severity'], string> = { warning: 'text-amber-600', info: 'text-brand-600', good: 'text-green-600' };

export default function InsightList({ insights, limit }: { insights: Insight[]; limit?: number }) {
  return (
    <ul className="space-y-3">
      {insights.slice(0, limit).map((i) => {
        const Icon = ICON[i.severity];
        return (
          <li key={i.title} className="flex gap-3 text-sm">
            <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${TONE[i.severity]}`} aria-hidden />
            <span><strong>{i.title}</strong><br /><span className="text-gray-500 dark:text-gray-400">{i.detail}</span></span>
          </li>
        );
      })}
    </ul>
  );
}
