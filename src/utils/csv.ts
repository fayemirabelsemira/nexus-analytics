/** Guess the delimiter from the first non-empty line (outside quotes). */
export function detectDelimiter(text: string): string {
  const candidates = [',', ';', '\t', '|'];
  const counts: Record<string, number> = { ',': 0, ';': 0, '\t': 0, '|': 0 };
  let inQuotes = false;
  for (const ch of text) {
    if (ch === '"') inQuotes = !inQuotes;
    else if (!inQuotes) {
      if (ch === '\n') {
        if (candidates.some((c) => counts[c] > 0)) break;
      } else if (ch in counts) counts[ch]++;
    }
  }
  let best = ',';
  for (const c of candidates) if (counts[c] > counts[best]) best = c;
  return best;
}

/** RFC-4180 style CSV parser: quotes, escaped quotes, CRLF, BOM, ; or tab delimiters. */
export function parseCSV(input: string): string[][] {
  const text = input.replace(/^\uFEFF/, '');
  const delimiter = detectDelimiter(text);
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;

  const endField = () => {
    row.push(field);
    field = '';
  };
  const endRow = () => {
    endField();
    if (row.some((c) => c.trim() !== '')) rows.push(row);
    row = [];
  };

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else inQuotes = false;
      } else field += ch;
    } else if (ch === '"' && field === '') {
      inQuotes = true;
    } else if (ch === delimiter) {
      endField();
    } else if (ch === '\n') {
      endRow();
    } else if (ch === '\r') {
      if (text[i + 1] === '\n') i++;
      endRow();
    } else field += ch;
  }
  if (field !== '' || row.length > 0) endRow();
  return rows;
}

/**
 * Neutralise spreadsheet formula injection: a text cell starting with = + @ (or - followed by a
 * non-number) would be executed as a formula when opened in Excel.
 */
function guardFormula(value: string): string {
  return /^[=+@\t\r]/.test(value) || /^-(?![\d.])/.test(value) ? `'${value}` : value;
}

/** Convert rows to a CSV string (CRLF, UTF-8 BOM so Excel shows symbols like ₱ correctly). */
export function toCSV(rows: (string | number | null | undefined)[][]): string {
  const body = rows
    .map((row) =>
      row
        .map((cell) => {
          if (cell === null || cell === undefined) return '';
          if (typeof cell === 'number') return String(cell);
          const s = guardFormula(cell);
          return /[",\r\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
        })
        .join(','),
    )
    .join('\r\n');
  return '\uFEFF' + body;
}
