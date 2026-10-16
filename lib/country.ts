// Countries: law, regulator, currency, tax, time zone and breach rule.
// COUNTRY (install .env, default NG) is the firm's home country: dates, deadlines and the default for new clients.
// Each client also has its own country (clients.country), used for its invoices, regulator wording and which modules apply.
// Adding a country = an entry here, checked with a local practitioner. Templates and checklists are still Nigerian (step 2).

export type Country = {
  code: string; name: string; locale: string;
  currency: { code: string; symbol: string };
  vatRate: number;                 // % applied when "Add VAT" is ticked
  timeZone: string; utcOffset: string; tzLabel: string; // fixed offset (no daylight saving in supported countries)
  breachHours: number;             // breach notification window (statutory, or the internal target where the law sets none)
  breachRule: string;              // how the law states the breach deadline, shown to users
  car: boolean;                    // annual Compliance Audit Return (NDPC CAR) applies
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
    breachRule: "Notify the NDPC within 72 hours of becoming aware (NDPA s.40).",
    car: true,
    regulator: { name: "Nigeria Data Protection Commission", short: "NDPC" },
    law: { name: "Nigeria Data Protection Act, 2023", short: "NDPA" },
  },
  // To confirm with a Ghanaian practitioner: VAT (15% + NHIL 2.5% + GETFund 2.5% after the 2026 reform) and the breach wording.
  GH: {
    code: "GH", name: "Ghana", locale: "en-GH",
    currency: { code: "GHS", symbol: "GH₵" },
    vatRate: 20,
    timeZone: "Africa/Accra", utcOffset: "+00:00", tzLabel: "GMT",
    breachHours: 72, // Act 843 sets no fixed hours; 72 h is kept as the internal target
    breachRule: "Notify the Data Protection Commission and the affected people as soon as reasonably practicable (Data Protection Act, 2012, s.31). DPO Copilot tracks a 72-hour internal target.",
    car: false,
    regulator: { name: "Data Protection Commission, Ghana", short: "DPC" },
    law: { name: "Data Protection Act, 2012 (Act 843)", short: "Act 843" },
  },
};

const code = (process.env.COUNTRY ?? "NG").toUpperCase();
if (!COUNTRIES[code]) throw new Error(`COUNTRY=${code} is not supported. Supported: ${Object.keys(COUNTRIES).join(", ")}`);
export const COUNTRY: Country = COUNTRIES[code];

/** A client's country (falls back to the install's). */
export const countryOf = (code?: string | null): Country => COUNTRIES[(code ?? "").toUpperCase()] ?? COUNTRY;
/** Codes of countries whose clients file an NDPC CAR. */
export const CAR_COUNTRIES = Object.values(COUNTRIES).filter((c) => c.car).map((c) => c.code);

/** Amount in a currency (ISO code; default the install's), e.g. ₦1,500,000.00 or GH₵12,000.00. */
export const moneyIn = (currency: string | null | undefined, n: number) => {
  const c = Object.values(COUNTRIES).find((x) => x.currency.code === currency) ?? COUNTRY;
  return c.currency.symbol + n.toLocaleString(c.locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};
/** Amount in the install's currency, e.g. ₦1,500,000.00. */
export const money = (n: number) => moneyIn(null, n);
/** Parse a typed amount ("1,500,000", "₦250000.50"): digits and one decimal point only; NaN if anything else is left. */
export const parseAmount = (v: string) => { const t = Object.values(COUNTRIES).reduce((x, c) => x.replace(c.currency.symbol, ""), v.replace(/[\s,]/g, "")); return /^\d+(\.\d+)?$/.test(t) ? Number(t) : NaN; };
