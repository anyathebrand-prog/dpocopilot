// Client size band from its number of data subjects and departments; the larger of the two bands wins.
export const SIZES: [string, string][] = [
  ["small", "Small (up to 500 data subjects, 1 to 10 departments)"],
  ["medium", "Medium (501 to 1,000 data subjects, 11 to 20 departments)"],
  ["large", "Large (over 1,000 data subjects, or 21 departments and above)"],
];
export const sizeLabel = (k?: string | null) => SIZES.find(([v]) => v === k)?.[1] ?? k ?? "";

const band = (n: number, small: number, medium: number) => (n <= small ? 0 : n <= medium ? 1 : 2);
export const sizeFor = (subjects: number, departments: number) => SIZES[Math.max(band(subjects, 500, 1000), band(departments, 10, 20))][0];
