import { useMemo } from 'react';
import { describeFilter } from '../engine/filter.ts';
import { buildKpis, generateInsights } from '../engine/insights.ts';
import { profileDataset } from '../engine/profile.ts';
import { useSession } from '../contexts/SessionContext';

/** Profile, KPIs and insights for the current (filtered) view of the dataset. */
export function useAnalysis() {
  const { dataset, view, filters, log } = useSession();
  return useMemo(() => {
    if (!dataset || !view) return null;
    const profile = profileDataset(view);
    return {
      dataset,
      view,
      profile,
      kpis: buildKpis(profile),
      insights: generateInsights(view, profile),
      log,
      filterNotes: filters.map((f) => describeFilter(dataset, f)),
    };
  }, [dataset, view, filters, log]);
}
