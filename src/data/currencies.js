const countries = require("world-countries");

// Several currencies are shared by multiple countries (e.g. INR is also used
// in Bhutan, EUR in many EU states). Prefer the country most people would
// associate with the currency for the flag shown in the UI.
const PREFERRED_COUNTRY_BY_CURRENCY = {
  USD: "US", EUR: "DE", GBP: "GB", INR: "IN", JPY: "JP", AUD: "AU",
  CAD: "CA", CHF: "CH", CNY: "CN", HKD: "HK", NZD: "NZ", SGD: "SG",
  SEK: "SE", KRW: "KR", NOK: "NO", MXN: "MX", RUB: "RU", ZAR: "ZA",
  BRL: "BR", AED: "AE", SAR: "SA", THB: "TH", MYR: "MY", IDR: "ID",
  PHP: "PH", VND: "VN", PKR: "PK", BDT: "BD", TRY: "TR", PLN: "PL",
  DKK: "DK", ILS: "IL", EGP: "EG", NGN: "NG", KES: "KE", ARS: "AR",
  CLP: "CL", COP: "CO", XOF: "SN", XAF: "CM",
};

const buildCurrencyList = () => {
  const byCode = new Map();

  const assign = (code, info, country) => {
    byCode.set(code, {
      code,
      name: info.name,
      symbol: info.symbol || code,
      countryCode: country.cca2,
    });
  };

  for (const country of countries) {
    for (const [code, info] of Object.entries(country.currencies || {})) {
      if (!byCode.has(code)) assign(code, info, country);
    }
  }

  for (const [code, cca2] of Object.entries(PREFERRED_COUNTRY_BY_CURRENCY)) {
    const country = countries.find((c) => c.cca2 === cca2);
    const info = country?.currencies?.[code];
    if (country && info) assign(code, info, country);
  }

  return Array.from(byCode.values()).sort((a, b) => a.code.localeCompare(b.code));
};

const CURRENCIES = buildCurrencyList();

module.exports = { CURRENCIES };
