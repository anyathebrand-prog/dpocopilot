// Per-install country: currency, tax, time zone and statutory clock. Set COUNTRY in the install's .env (default NG).
// shortcut: only Nigeria is defined; adding a country = add an entry here (and its templates, step 2), checked with a local practitioner.

export type Country = {
  code: string; name: string; locale: string;
  currency: { code: string; symbol: string };
  vatRate: number;                 // % applied when "Add VAT" is ticked
  timeZone: string; utcOffset: string; tzLabel: string; // fixed offset (no daylight saving in supported countries)
  breachHours: number;             // regulator breach notification window
  regulator: { name: string; short: string };
  law: { name: string; short: string };
};

export const COUNTRIES: Record<string, Country> = {
  NG: {
    code: "NG", name: "Nigeria", locale: "en-NG",
    currency: { code: "NGN", symbol: "₦" },
    vatRate: 7.5,
    timeZone: "Africa/Lagos", utcOffset: "+01:00", tzLabel: "WAT",
    breachHours: 72,
    regulator: { name: "Nigeria Data Protection Commission", short: "NDPC" },
    law: { name: "Nigeria Data Protection Act, 2023", short: "NDPA" },
  },
};

const code = (process.env.COUNTRY ?? "NG").toUpperCase();
if (!COUNTRIES[code]) throw new Error(`COUNTRY=${code} is not supported. Supported: ${Object.keys(COUNTRIES).join(", ")}`);
export const COUNTRY: Country = COUNTRIES[code];

/** Amount in the install's currency, e.g. ₦1,500,000.00. */
export const money = (n: number) => COUNTRY.currency.symbol + n.toLocaleString(COUNTRY.locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
/** Parse a typed amount ("1,500,000", "₦250000.50"): digits and one decimal point only; NaN if anything else is left. */
export const parseAmount = (v: string) => { const t = v.replace(/[\s,]/g, "").replace(COUNTRY.currency.symbol, ""); return /^\d+(\.\d+)?$/.test(t) ? Number(t) : NaN; };
