import { useMemo, useState } from 'react';
import { groupAggregate, histogram, scatterPoints, timeSeries, type Agg, type Bucketing } from '../engine/aggregate.ts';
import { useSession } from '../contexts/SessionContext';
import { BarView, LineView, PieView, ScatterView } from '../components/charts/Charts';
import FilterSummary from '../components/data/FilterSummary';
import PageHeader from '../components/PageHeader';
import { NoDataset } from '../components/EmptyState';
import { card, input, label } from '../components/ui';

type ChartType = 'bar' | 'line' | 'pie' | 'histogram' | 'scatter';
const TYPES: [ChartType, string][] = [['bar', 'Bar (group by)'], ['line', 'Line (over time)'], ['pie', 'Pie (share)'], ['histogram', 'Histogram'], ['scatter', 'Scatter']];

export default function VisualizationsPage() {
  const { view } = useSession();
  const [type, setType] = useState<ChartType>('bar');
  const [x, setX] = useState(-1);
  const [y, setY] = useState(-1);
  const [agg, setAgg] = useState<Agg>('sum');
  const [bucket, setBucket] = useState<Bucketing>('month');
  const [limit, setLimit] = useState(10);

  const cols = view?.columns ?? [];
  const groupCols = cols.map((c, i) => ({ c, i })).filter(({ c }) => c.type === 'category' || c.type === 'text');
  const numCols = cols.map((c, i) => ({ c, i })).filter(({ c }) => c.type === 'number');
  const dateCols = cols.map((c, i) => ({ c, i })).filter(({ c }) => c.type === 'date');

  // x/y fall back to sensible defaults for the chosen chart type until the user picks something.
  const xCandidates = type === 'line' ? dateCols : type === 'histogram' || type === 'scatter' ? numCols : groupCols;
  const xi = xCandidates.some((o) => o.i === x) ? x : xCandidates[0]?.i ?? -1;
  const yi = numCols.some((o) => o.i === y) ? y : (type === 'scatter' ? numCols.find((o) => o.i !== xi) : numCols[0])?.i ?? -1;

  const chart = useMemo(() => {
    if (!view || xi < 0) return null;
    const valueCol = yi >= 0 ? yi : null;
    const effAgg: Agg = valueCol === null ? 'count' : agg;
    const name = valueCol === null ? 'Rows' : `${agg} of ${cols[valueCol].name}`;
    switch (type) {
      case 'bar': return <BarView data={groupAggregate(view, xi, valueCol, effAgg, limit)} name={name} horizontal />;
      case 'pie': return <PieView data={groupAggregate(view, xi, valueCol, effAgg === 'avg' || effAgg === 'min' || effAgg === 'max' ? 'sum' : effAgg, Math.min(limit, 10))} />;
      case 'line': return <LineView data={timeSeries(view, xi, valueCol, effAgg, bucket)} name={name} />;
      case 'histogram': return <BarView data={histogram(view, xi, 12)} name="Rows" />;
      case 'scatter': return yi >= 0 && yi !== xi ? <ScatterView points={scatterPoints(view, xi, yi)} xName={cols[xi].name} yName={cols[yi].name} /> : null;
    }
  }, [view, type, xi, yi, agg, bucket, limit, cols]);

  if (!view) return (<><PageHeader title="Visualizations" /><NoDataset /></>);

  const needs: Record<ChartType, string> = { bar: 'a category or text column', pie: 'a category or text column', line: 'a date column', histogram: 'a number column', scatter: 'two number columns' };

  return (
    <>
      <PageHeader title="Visualizations" subtitle="Build interactive charts from your data. Hover for exact values." />
      <FilterSummary />
      <section className={`${card} flex flex-wrap items-end gap-4`}>
        <div className="w-48"><label htmlFor="v-type" className={label}>Chart</label><select id="v-type" className={input} value={type} onChange={(e) => setType(e.target.value as ChartType)}>{TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></div>
        <div className="w-48"><label htmlFor="v-x" className={label}>{type === 'line' ? 'Date column' : type === 'histogram' || type === 'scatter' ? 'X column' : 'Group by'}</label>
          <select id="v-x" className={input} value={xi} onChange={(e) => setX(Number(e.target.value))} disabled={xCandidates.length === 0}>{xCandidates.map((o) => <option key={o.i} value={o.i}>{o.c.name}</option>)}</select></div>
        {type !== 'histogram' && (
          <div className="w-48"><label htmlFor="v-y" className={label}>{type === 'scatter' ? 'Y column' : 'Value'}</label>
            <select id="v-y" className={input} value={yi} onChange={(e) => setY(Number(e.target.value))}>{type !== 'scatter' && <option value={-1}>Count of rows</option>}{numCols.map((o) => <option key={o.i} value={o.i}>{o.c.name}</option>)}</select></div>
        )}
        {(type === 'bar' || type === 'pie' || type === 'line') && yi >= 0 && (
          <div className="w-36"><label htmlFor="v-agg" className={label}>Calculate</label><select id="v-agg" className={input} value={agg} onChange={(e) => setAgg(e.target.value as Agg)}><option value="sum">Sum</option><option value="avg">Average</option><option value="min">Minimum</option><option value="max">Maximum</option><option value="count">Count</option></select></div>
        )}
        {type === 'line' && <div className="w-32"><label htmlFor="v-bucket" className={label}>Group by</label><select id="v-bucket" className={input} value={bucket} onChange={(e) => setBucket(e.target.value as Bucketing)}><option value="day">Day</option><option value="month">Month</option><option value="year">Year</option></select></div>}
        {(type === 'bar' || type === 'pie') && <div className="w-28"><label htmlFor="v-limit" className={label}>Show top</label><select id="v-limit" className={input} value={limit} onChange={(e) => setLimit(Number(e.target.value))}>{[5, 10, 20, 30].map((n) => <option key={n} value={n}>{n}</option>)}</select></div>}
      </section>
      <section className={card}>
        {chart ?? <p className="py-16 text-center text-sm text-gray-500">This chart needs {needs[type]}. Your dataset does not have enough of them.</p>}
      </section>
    </>
  );
}
