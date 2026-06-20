/**
 * Initial currencies seeded on startup (idempotently, keyed by `code`). `rate`
 * is "units per 1 unit of the base currency"; the base currency has `rate: 1`.
 *
 * The company is based in Indonesia, so **IDR is the default base currency**.
 * Foreign rates are therefore expressed per 1 IDR (small numbers — admins can
 * one-click refresh to live rates, and the base currency is changeable from the
 * currency module). Seeding is idempotent, so an existing database keeps its
 * current base; only fresh installs start on IDR.
 */
export type CurrencyDef = {
  code: string
  name: string
  symbol: string
  rate: number
  isBase: boolean
  type: "standard" | "custom"
}

// Reference market rates expressed per 1 USD, converted below to per-1-IDR so
// IDR can be the base. Keeping the reference here documents where the seed
// numbers come from.
const USD = { USD: 1, JPY: 157, CNY: 7.2, IDR: 16500 }

export const CURRENCY_CATALOG: CurrencyDef[] = [
  {
    code: "IDR",
    name: "Indonesian Rupiah",
    symbol: "Rp",
    rate: 1,
    isBase: true,
    type: "standard",
  },
  {
    code: "USD",
    name: "US Dollar",
    symbol: "$",
    rate: USD.USD / USD.IDR,
    isBase: false,
    type: "standard",
  },
  {
    code: "JPY",
    name: "Japanese Yen",
    symbol: "¥",
    rate: USD.JPY / USD.IDR,
    isBase: false,
    type: "standard",
  },
  {
    code: "CNY",
    name: "Chinese Yuan",
    symbol: "CN¥",
    rate: USD.CNY / USD.IDR,
    isBase: false,
    type: "standard",
  },
]
