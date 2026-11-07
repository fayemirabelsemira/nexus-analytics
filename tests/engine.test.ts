import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseCSV, toCSV } from '../src/utils/csv.ts';
import { parseAmount, parseDate, parseNumber, guessDateOrder, looksLikeHeader } from '../src/engine/parse.ts';
import { buildDataset } from '../src/engine/build.ts';
import { profileDataset, numericStats } from '../src/engine/profile.ts';
import { removeDuplicates, removeRowsWithMissing, fillMissing, renameColumn, deleteColumn, changeCase } from '../src/engine/clean.ts';
import { applyFilters, sortIndexes, subset } from '../src/engine/filter.ts';
import { groupAggregate, timeSeries, histogram, scatterPoints } from '../src/engine/aggregate.ts';
import { buildKpis, generateInsights, correlations, pearson } from '../src/engine/insights.ts';
import { buildHtmlReport, buildReportSheets, datasetToCsv, escapeHtml } from '../src/engine/export.ts';

// ---------------------------------------------------------------- csv
test('parseCSV: quotes, commas, newlines in cells, CRLF, BOM, delimiters', () => {
  assert.deepEqual(parseCSV('\uFEFFa,b\r\n1,"x, y"\r\n2,"he said ""hi""\nthere"\r\n\r\n'), [['a', 'b'], ['1', 'x, y'], ['2', 'he said "hi"\nthere']]);
  assert.deepEqual(parseCSV('a;b\n1;2'), [['a', 'b'], ['1', '2']]);
  assert.deepEqual(parseCSV('a\tb\n1\t2'), [['a', 'b'], ['1', '2']]);
  assert.deepEqual(parseCSV('a,b\n1,'), [['a', 'b'], ['1', '']]);
});
test('toCSV: round trip, formula guard, BOM', () => {
  const csv = toCSV([['Name', 'Amount'], ['=HYPERLINK("x")', -5], ['a,"b"', 1.5], ['-12', 3]]);
  assert.ok(csv.startsWith('\uFEFF'));
  const back = parseCSV(csv);
  assert.equal(back[1][0], `'=HYPERLINK("x")`);
  assert.equal(back[2][0], 'a,"b"');
  assert.equal(back[3][0], '-12');
});

// -------------------------------------------------------------- parsers
test('parseAmount / parseNumber', () => {
  const cases: [any, number | null][] = [['₱1,234.50', 1234.5], ['(500)', -500], ['12-', -12], ['PHP 99', 99], ['1.234,50', 1234.5], ['12,5', 12.5], ['1,234', 1234], [0.1 + 0.2, 0.3], ['abc', null], ['', null], ['1,2,3', null], [1e16, null]];
  for (const [i, want] of cases) assert.equal(parseAmount(i), want, String(i));
  assert.equal(parseNumber(0.123456), 0.123456); // not rounded
});
test('parseDate / guessDateOrder / looksLikeHeader', () => {
  assert.equal(parseDate('2024-01-05'), '2024-01-05');
  assert.equal(parseDate('1/5/2024', 'dmy'), '2024-05-01');
  assert.equal(parseDate('Jan 5, 2024'), '2024-01-05');
  assert.equal(parseDate('2024-02-30'), null);
  assert.equal(parseDate(45296), '2024-01-05');
  assert.equal(parseDate(5), null);
  assert.equal(guessDateOrder(['13/01/2024']), 'dmy');
  assert.equal(looksLikeHeader(['Date', 'Amount']), true);
  assert.equal(looksLikeHeader(['2024-01-05', 100]), false);
});

// ---------------------------------------------------------------- build
const raw = parseCSV(
  [
    'Order Date,Product,Region,Amount,Customer ID,Notes',
    '2024-01-05,Cake,North,1000,1001,fine',
    '2024-01-20,Cake,North,n/a,1002,',
    '2024-02-02,Cookie,South,250.5,1003,late',
    '2024-02-09,Cookie,South,250.5,1003,late',
    '2024-02-09,Cookie,South,250.5,1003,late',
    '2024-03-10,Pie,North,9000,1005,',
    '2024-03-11,Pie,East,300,1006,x',
    '2024-03-12,Cake,East,310,1007,y',
    '2024-03-13,Cake,East,305,1008,z',
    ',,,,,',
  ].join('\n'),
);
const ds = buildDataset(raw, { name: 'Sales', fileName: 'sales.csv' });

test('buildDataset: header, types, missing tokens, empty rows dropped', () => {
  assert.deepEqual(ds.columns.map((c) => `${c.name}:${c.type}`), ['Order Date:date', 'Product:category', 'Region:category', 'Amount:number', 'Customer ID:category', 'Notes:category']);
  assert.equal(ds.rows.length, 9);
  assert.equal(ds.rows[1][3], null); // "n/a" -> missing
  assert.equal(ds.rows[0][3], 1000);
});
test('buildDataset: no header, duplicate/blank names, excel serial date column, errors', () => {
  const d = buildDataset([['Date', 'Date', ''], [45296, 1, 'a'], [45297, 2, 'b']], { name: 'x', fileName: 'x.xlsx' });
  assert.deepEqual(d.columns.map((c) => c.name), ['Date', 'Date (2)', 'Column C']);
  assert.equal(d.columns[0].type, 'date');
  assert.equal(d.rows[0][0], '2024-01-05');
  const nh = buildDataset([['a', 1], ['b', 2]], { name: 'x', fileName: 'x.csv', hasHeader: false });
  assert.equal(nh.columns[0].name, 'Column A');
  assert.equal(nh.rows.length, 2);
  assert.throws(() => buildDataset([], { name: 'x', fileName: 'x' }));
  assert.throws(() => buildDataset([['only header']], { name: 'x', fileName: 'x' }));
});

// -------------------------------------------------------------- profile
test('profileDataset', () => {
  const p = profileDataset(ds);
  assert.equal(p.rowCount, 9);
  assert.equal(p.duplicateRows, 1);
  const amount = p.columns[3];
  assert.equal(amount.missing, 1);
  assert.equal(amount.stats!.count, 8);
  assert.equal(amount.stats!.max, 9000);
  assert.ok(p.completeness < 100);
  assert.equal(p.columns[1].top[0].value, 'Cake');
  assert.equal(numericStats([]), null);
  assert.equal(numericStats([1, 2, 3, 4])!.median, 2.5);
});

// ---------------------------------------------------------------- clean
test('cleaning operations', () => {
  const nodup = removeDuplicates(ds);
  assert.equal(nodup.dataset.rows.length, 8);
  assert.match(nodup.message, /1 duplicate row$/);
  assert.equal(removeRowsWithMissing(ds, 3).dataset.rows.length, 8);
  assert.throws(() => removeRowsWithMissing({ ...ds, rows: ds.rows.map((r) => r.map(() => null)) }, 3)); // would remove every row
  const filled = fillMissing(ds, 3, 'median').dataset;
  assert.equal(filled.rows[1][3], 302.5); // median of the 8 present amounts
  assert.equal(fillMissing(ds, 3, 'zero').dataset.rows[1][3], 0);
  assert.equal(fillMissing(ds, 5, 'mode').dataset.rows[1][5], 'late');
  assert.equal(fillMissing(ds, 5, 'custom', 'N/A').dataset.rows[1][5], 'N/A');
  assert.throws(() => fillMissing(ds, 1, 'mean'));
  assert.throws(() => fillMissing(ds, 3, 'custom', 'abc'));
  assert.equal(renameColumn(ds, 3, 'Sales').dataset.columns[3].name, 'Sales');
  assert.throws(() => renameColumn(ds, 3, 'product'));
  const del = deleteColumn(ds, 5).dataset;
  assert.equal(del.columns.length, 5);
  assert.equal(del.rows[0].length, 5);
  assert.equal(changeCase(ds, 1, 'upper').dataset.rows[0][1], 'CAKE');
  assert.equal(changeCase(ds, 1, 'title').dataset.rows[0][1], 'Cake');
  assert.throws(() => changeCase(ds, 3, 'upper'));
  assert.equal(ds.rows.length, 9); // original untouched
});

// --------------------------------------------------------- filter / sort
test('filters and sorting', () => {
  assert.equal(applyFilters(ds, [{ id: '1', kind: 'range', column: 3, min: 300 }]).length, 5);
  assert.equal(applyFilters(ds, [{ id: '1', kind: 'dates', column: 0, from: '2024-02-01', to: '2024-02-28' }]).length, 3);
  assert.equal(applyFilters(ds, [{ id: '1', kind: 'in', column: 2, values: ['East'] }]).length, 3);
  assert.equal(applyFilters(ds, [{ id: '1', kind: 'text', column: 1, contains: 'coo' }]).length, 3);
  assert.equal(applyFilters(ds, [{ id: '1', kind: 'search', text: 'pie' }, { id: '2', kind: 'in', column: 2, values: ['East'] }]).length, 1);
  assert.equal(applyFilters(ds, []).length, 9);
  const idx = sortIndexes(ds, applyFilters(ds, []), { column: 3, dir: 'desc' });
  assert.equal(ds.rows[idx[0]][3], 9000);
  assert.equal(ds.rows[idx[idx.length - 1]][3], null); // missing last
  assert.equal(subset(ds, [0, 1]).rows.length, 2);
});

// ------------------------------------------------------------ aggregate
test('aggregations', () => {
  const g = groupAggregate(ds, 1, 3, 'sum', 10);
  assert.deepEqual(g[0], { label: 'Pie', value: 9300, count: 2 });
  assert.equal(groupAggregate(ds, 1, null, 'count', 1).length, 1);
  assert.equal(groupAggregate(ds, 1, 3, 'avg')[0].label, 'Pie');
  const ts = timeSeries(ds, 0, 3, 'sum', 'month');
  assert.deepEqual(ts.map((p) => p.label), ['2024-01', '2024-02', '2024-03']);
  assert.equal(ts[0].value, 1000);
  assert.equal(timeSeries(ds, 0, null, 'count', 'year')[0].value, 9);
  const h = histogram(ds, 3, 4);
  assert.equal(h.reduce((a, b) => a + b.value, 0), 8);
  assert.equal(histogram(buildDataset([['n'], [5], [5]], { name: 'x', fileName: 'x' }), 0).length, 1);
  assert.equal(scatterPoints(ds, 3, 3).length, 8);
  assert.equal(scatterPoints(ds, 3, 3, 3).length, 3);
});

// ------------------------------------------------------------- insights
test('kpis, correlations, insights', () => {
  const p = profileDataset(ds);
  const k = buildKpis(p);
  assert.equal(k[0].value, 9);
  assert.ok(k.some((x) => x.label === 'Total Amount'));
  assert.equal(pearson([1, 2, 3, 4], [2, 4, 6, 8]), 1);
  assert.equal(pearson([1, 1, 1], [1, 2, 3]), null);
  const two = buildDataset([['a', 'b'], [1, 10], [2, 21], [3, 29], [4, 41]], { name: 'c', fileName: 'c' });
  assert.ok(correlations(two)[0].r > 0.99);
  const ins = generateInsights(ds, p);
  assert.ok(ins.some((i) => /duplicate/.test(i.title)));
  assert.ok(ins.some((i) => /missing/.test(i.title)));
  assert.equal(ins[0].severity, 'warning'); // warnings first
});

// --------------------------------------------------------------- export
test('export: CSV, sheets, HTML report escapes content', () => {
  assert.equal(parseCSV(datasetToCsv(ds)).length, 10);
  const evil = buildDataset([['name', 'v'], ['<script>alert(1)</script>', 1], ['b', 2]], { name: '<b>x</b>', fileName: 'x"y.csv' });
  const p = profileDataset(evil);
  const input = { dataset: evil, profile: p, kpis: buildKpis(p), insights: generateInsights(evil, p), log: [{ action: 'Did <i>it</i>', at: '2024-01-01T00:00:00Z' }], filterNotes: ['a & b'] };
  const html = buildHtmlReport(input, new Date('2024-05-01T00:00:00Z'));
  assert.ok(!html.includes('<script>alert'));
  assert.ok(html.includes('&lt;script&gt;'));
  assert.ok(html.includes('&lt;b&gt;x&lt;/b&gt;'));
  assert.ok(html.includes('a &amp; b'));
  assert.ok(html.includes('2024-05-01'));
  const sheets = buildReportSheets(input);
  assert.deepEqual(sheets.map((s) => s.name), ['Summary', 'Columns', 'Insights', 'Cleaning log', 'Data']);
  assert.equal(sheets[4].rows.length, 3);
  assert.equal(escapeHtml(`"'&<>`), '&quot;&#39;&amp;&lt;&gt;');
});
