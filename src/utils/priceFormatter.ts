export type CurrencyType = 'TRY' | 'USD' | 'EUR' | 'GBP';

export const CURRENCY_SYMBOLS: Record<CurrencyType, string> = {
  TRY: '₺',
  USD: '$',
  EUR: '€',
  GBP: '£',
};

/**
 * Extracts raw numeric value from price string
 */
export function extractRawPriceNumber(priceStr: string | undefined | null): string {
  if (!priceStr) return '';
  return priceStr.replace(/[^\d]/g, '');
}

/**
 * Detects currency from existing price string
 */
export function detectCurrency(priceStr: string | undefined | null): CurrencyType {
  if (!priceStr) return 'TRY';
  if (priceStr.includes('$') || priceStr.toLowerCase().includes('usd')) return 'USD';
  if (priceStr.includes('€') || priceStr.toLowerCase().includes('eur')) return 'EUR';
  if (priceStr.includes('£') || priceStr.toLowerCase().includes('gbp')) return 'GBP';
  return 'TRY';
}

/**
 * Formats a raw number string into digit grouped number with currency symbol
 * e.g., '18500000', 'TRY' -> '18.500.000 ₺'
 */
export function formatPriceWithCurrency(rawDigits: string, currency: CurrencyType = 'TRY'): string {
  const cleanDigits = rawDigits.replace(/[^\d]/g, '');
  if (!cleanDigits) return '';

  const num = parseInt(cleanDigits, 10);
  if (isNaN(num)) return '';

  const formattedNum = num.toLocaleString('tr-TR');
  const symbol = CURRENCY_SYMBOLS[currency] || '₺';

  if (currency === 'USD') {
    return `$${formattedNum}`;
  }
  return `${formattedNum} ${symbol}`;
}
