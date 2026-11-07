import type { ReactElement } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis } from 'recharts';
import type { Point } from '../../engine/aggregate.ts';

const nf = new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 });
const compact = new Intl.NumberFormat(undefined, { notation: 'compact', maximumFractionDigits: 1 });
const COLORS = ['#4f46e5', '#0891b2', '#16a34a', '#d97706', '#dc2626', '#9333ea', '#db2777', '#64748b', '#0d9488', '#ca8a04'];
const tick = { fill: 'currentColor', fontSize: 12 };

function Frame({ children }: { children: ReactElement }) {
  return <div className="h-72 text-gray-500 dark:text-gray-400"><ResponsiveContainer width="100%" height="100%">{children}</ResponsiveContainer></div>;
}

export function BarView({ data, name = 'Value', horizontal = false }: { data: Point[]; name?: string; horizontal?: boolean }) {
  return (
    <Frame>
      <BarChart data={data} layout={horizontal ? 'vertical' : 'horizontal'} margin={{ left: horizontal ? 24 : 0 }}>
        <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.3} />
        {horizontal ? (<><XAxis type="number" tick={tick} tickFormatter={(v) => compact.format(Number(v))} /><YAxis type="category" dataKey="label" width={110} tick={tick} /></>) : (<><XAxis dataKey="label" tick={tick} interval="preserveStartEnd" /><YAxis tick={tick} tickFormatter={(v) => compact.format(Number(v))} /></>)}
        <Tooltip formatter={(v) => nf.format(Number(v))} />
        <Bar dataKey="value" name={name} fill="#4f46e5" radius={horizontal ? [0, 3, 3, 0] : [3, 3, 0, 0]} />
      </BarChart>
    </Frame>
  );
}

export function LineView({ data, name = 'Value' }: { data: Point[]; name?: string }) {
  return (
    <Frame>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.3} />
        <XAxis dataKey="label" tick={tick} interval="preserveStartEnd" />
        <YAxis tick={tick} tickFormatter={(v) => compact.format(Number(v))} />
        <Tooltip formatter={(v) => nf.format(Number(v))} />
        <Line type="monotone" dataKey="value" name={name} stroke="#4f46e5" strokeWidth={2} dot={data.length < 40} />
      </LineChart>
    </Frame>
  );
}

export function PieView({ data }: { data: Point[] }) {
  return (
    <Frame>
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="label" outerRadius={100} label={(e) => String(e.name ?? '')}>
          {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
        </Pie>
        <Tooltip formatter={(v) => nf.format(Number(v))} />
        <Legend />
      </PieChart>
    </Frame>
  );
}

export function ScatterView({ points, xName, yName }: { points: { x: number; y: number }[]; xName: string; yName: string }) {
  return (
    <Frame>
      <ScatterChart margin={{ left: 8, bottom: 16 }}>
        <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.3} />
        <XAxis type="number" dataKey="x" name={xName} tick={tick} tickFormatter={(v) => compact.format(Number(v))} label={{ value: xName, position: 'insideBottom', offset: -8, fill: 'currentColor' }} />
        <YAxis type="number" dataKey="y" name={yName} tick={tick} tickFormatter={(v) => compact.format(Number(v))} />
        <Tooltip cursor={{ strokeDasharray: '3 3' }} formatter={(v) => nf.format(Number(v))} />
        <Scatter data={points} fill="#4f46e5" fillOpacity={0.6} />
      </ScatterChart>
    </Frame>
  );
}
