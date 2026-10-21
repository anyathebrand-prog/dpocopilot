// Client compliance score: the average of the parts that have something to measure (null = nothing yet, left out).
export type Part = { key: string; label: string; pct: number | null; detail: string };

export const pct = (done: number, total: number) => (total > 0 ? Math.round((100 * done) / total) : null);

export function overall(parts: Part[]) {
  const xs = parts.map((p) => p.pct).filter((x): x is number => x !== null);
  return xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : null;
}
