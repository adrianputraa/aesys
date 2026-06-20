/**
 * A curated list of ISO 4217 currencies used to populate the "Add currency"
 * picker, so admins select a code instead of typing it (avoiding typos). Not
 * exhaustive — anything missing can still be added via the "Other" option as a
 * custom currency. `symbol` is the common display symbol (falls back to the
 * code where there's no widely-used glyph).
 */
export type IsoCurrency = {
  code: string
  name: string
  symbol: string
}

export const ISO_CURRENCIES: IsoCurrency[] = [
  { code: "AED", name: "UAE Dirham", symbol: "د.إ" },
  { code: "ARS", name: "Argentine Peso", symbol: "$" },
  { code: "AUD", name: "Australian Dollar", symbol: "A$" },
  { code: "BDT", name: "Bangladeshi Taka", symbol: "৳" },
  { code: "BHD", name: "Bahraini Dinar", symbol: ".د.ب" },
  { code: "BRL", name: "Brazilian Real", symbol: "R$" },
  { code: "CAD", name: "Canadian Dollar", symbol: "CA$" },
  { code: "CHF", name: "Swiss Franc", symbol: "CHF" },
  { code: "CLP", name: "Chilean Peso", symbol: "$" },
  { code: "CNY", name: "Chinese Yuan", symbol: "CN¥" },
  { code: "COP", name: "Colombian Peso", symbol: "$" },
  { code: "CZK", name: "Czech Koruna", symbol: "Kč" },
  { code: "DKK", name: "Danish Krone", symbol: "kr" },
  { code: "EGP", name: "Egyptian Pound", symbol: "E£" },
  { code: "EUR", name: "Euro", symbol: "€" },
  { code: "GBP", name: "Pound Sterling", symbol: "£" },
  { code: "HKD", name: "Hong Kong Dollar", symbol: "HK$" },
  { code: "HUF", name: "Hungarian Forint", symbol: "Ft" },
  { code: "IDR", name: "Indonesian Rupiah", symbol: "Rp" },
  { code: "ILS", name: "Israeli New Shekel", symbol: "₪" },
  { code: "INR", name: "Indian Rupee", symbol: "₹" },
  { code: "ISK", name: "Icelandic Króna", symbol: "kr" },
  { code: "JPY", name: "Japanese Yen", symbol: "¥" },
  { code: "KES", name: "Kenyan Shilling", symbol: "KSh" },
  { code: "KRW", name: "South Korean Won", symbol: "₩" },
  { code: "KWD", name: "Kuwaiti Dinar", symbol: "د.ك" },
  { code: "LKR", name: "Sri Lankan Rupee", symbol: "Rs" },
  { code: "MXN", name: "Mexican Peso", symbol: "$" },
  { code: "MYR", name: "Malaysian Ringgit", symbol: "RM" },
  { code: "NGN", name: "Nigerian Naira", symbol: "₦" },
  { code: "NOK", name: "Norwegian Krone", symbol: "kr" },
  { code: "NZD", name: "New Zealand Dollar", symbol: "NZ$" },
  { code: "PHP", name: "Philippine Peso", symbol: "₱" },
  { code: "PKR", name: "Pakistani Rupee", symbol: "₨" },
  { code: "PLN", name: "Polish Złoty", symbol: "zł" },
  { code: "QAR", name: "Qatari Riyal", symbol: "ر.ق" },
  { code: "RON", name: "Romanian Leu", symbol: "lei" },
  { code: "RUB", name: "Russian Ruble", symbol: "₽" },
  { code: "SAR", name: "Saudi Riyal", symbol: "ر.س" },
  { code: "SEK", name: "Swedish Krona", symbol: "kr" },
  { code: "SGD", name: "Singapore Dollar", symbol: "S$" },
  { code: "THB", name: "Thai Baht", symbol: "฿" },
  { code: "TRY", name: "Turkish Lira", symbol: "₺" },
  { code: "TWD", name: "New Taiwan Dollar", symbol: "NT$" },
  { code: "TZS", name: "Tanzanian Shilling", symbol: "TSh" },
  { code: "UAH", name: "Ukrainian Hryvnia", symbol: "₴" },
  { code: "USD", name: "US Dollar", symbol: "$" },
  { code: "VND", name: "Vietnamese Đồng", symbol: "₫" },
  { code: "ZAR", name: "South African Rand", symbol: "R" },
]

/** Lookup by ISO code (case-insensitive). */
export function findIsoCurrency(code: string): IsoCurrency | undefined {
  const c = code.trim().toUpperCase()
  return ISO_CURRENCIES.find((x) => x.code === c)
}
