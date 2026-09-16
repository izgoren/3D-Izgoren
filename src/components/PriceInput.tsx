import React, { useMemo } from 'react';
import {
  CurrencyType,
  CURRENCY_SYMBOLS,
  extractRawPriceNumber,
  detectCurrency,
  formatPriceWithCurrency,
} from '../utils/priceFormatter';

interface PriceInputProps {
  value: string | undefined;
  onChange: (formattedPrice: string) => void;
  label?: string;
  placeholder?: string;
}

export const PriceInput: React.FC<PriceInputProps> = ({
  value = '',
  onChange,
  label = 'Satış Bedeli / Fiyat:',
  placeholder = 'Örn: 18.500.000',
}) => {
  const currentCurrency = useMemo(() => detectCurrency(value), [value]);
  const rawNumber = useMemo(() => extractRawPriceNumber(value), [value]);

  // Display value in input field with thousands separators
  const displayFormattedNumber = useMemo(() => {
    if (!rawNumber) return '';
    const num = parseInt(rawNumber, 10);
    if (isNaN(num)) return '';
    return num.toLocaleString('tr-TR');
  }, [rawNumber]);

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nextDigits = e.target.value.replace(/[^\d]/g, '');
    if (!nextDigits) {
      onChange('');
      return;
    }
    const formatted = formatPriceWithCurrency(nextDigits, currentCurrency);
    onChange(formatted);
  };

  const handleCurrencyChange = (newCurrency: CurrencyType) => {
    if (!rawNumber) {
      // If no number yet, set empty or just symbol
      onChange('');
      return;
    }
    const formatted = formatPriceWithCurrency(rawNumber, newCurrency);
    onChange(formatted);
  };

  const quickAmounts = [
    { label: '5M', value: '5000000' },
    { label: '10M', value: '10000000' },
    { label: '15M', value: '15000000' },
    { label: '25M', value: '25000000' },
    { label: '50M', value: '50000000' },
  ];

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="text-[10px] text-emerald-400 font-semibold block">
          {label}
        </label>
        {value && (
          <span className="text-[9px] font-mono text-emerald-300 font-bold bg-emerald-500/20 px-1.5 py-0.5 rounded border border-emerald-400/30">
            {value}
          </span>
        )}
      </div>

      <div className="flex items-center gap-1.5">
        {/* Number Input with automatic thousand separator formatting */}
        <div className="relative flex-1">
          <input
            type="text"
            inputMode="numeric"
            value={displayFormattedNumber}
            onChange={handleNumberChange}
            placeholder={placeholder}
            className="w-full pl-2.5 pr-8 py-1.5 rounded-lg bg-black/40 border border-emerald-400/30 text-emerald-300 font-mono font-bold text-xs placeholder:text-slate-500 focus:outline-none focus:border-emerald-400"
          />
          {rawNumber && (
            <button
              type="button"
              onClick={() => onChange('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs cursor-pointer px-1"
              title="Temizle"
            >
              ×
            </button>
          )}
        </div>

        {/* Currency Selector (₺, $, €, £) */}
        <div className="flex rounded-lg bg-black/40 border border-emerald-400/30 p-0.5 gap-0.5 shrink-0">
          {(['TRY', 'USD', 'EUR', 'GBP'] as CurrencyType[]).map((curr) => {
            const isSelected = currentCurrency === curr;
            return (
              <button
                key={curr}
                type="button"
                onClick={() => handleCurrencyChange(curr)}
                className={`px-2 py-1 rounded text-[11px] font-bold font-mono transition cursor-pointer active:scale-95 ${
                  isSelected
                    ? 'bg-emerald-500 text-slate-950 shadow'
                    : 'text-slate-300 hover:bg-white/10 hover:text-white'
                }`}
                title={`${curr} (${CURRENCY_SYMBOLS[curr]})`}
              >
                {CURRENCY_SYMBOLS[curr]}
              </button>
            );
          })}
        </div>
      </div>

      {/* Quick Amount presets */}
      <div className="flex items-center gap-1 pt-0.5">
        <span className="text-[9px] text-slate-400 mr-0.5">Hızlı:</span>
        {quickAmounts.map((q) => (
          <button
            key={q.value}
            type="button"
            onClick={() => onChange(formatPriceWithCurrency(q.value, currentCurrency))}
            className="px-1.5 py-0.5 rounded bg-white/5 hover:bg-emerald-500/20 hover:text-emerald-300 border border-white/10 text-[9px] font-mono text-slate-300 transition cursor-pointer"
          >
            {q.label}
          </button>
        ))}
      </div>
    </div>
  );
};
