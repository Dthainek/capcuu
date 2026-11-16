import React from 'react';

interface NumericInputFieldProps {
  id: string;
  label: string;
  unit: string;
  refRange: string;
  value: number | undefined;
  onChange: (val: number | undefined) => void;
  step?: string;
  min?: number;
  max?: number;
  placeholder?: string;
  lowThreshold?: number;
  highThreshold?: number;
  criticalLow?: number;
  criticalHigh?: number;
}

export function NumericInputField({
  id,
  label,
  unit,
  refRange,
  value,
  onChange,
  step = 'any',
  min,
  max,
  placeholder = '—',
  lowThreshold,
  highThreshold,
  criticalLow,
  criticalHigh,
}: NumericInputFieldProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    if (raw.trim() === '') {
      onChange(undefined);
      return;
    }
    const parsed = Number(raw);
    if (!Number.isNaN(parsed)) {
      onChange(parsed);
    }
  };

  let statusClass = 'border-slate-800 focus:border-cyan-500';
  let statusText: { text: string; tone: string } | null = null;

  if (typeof value === 'number' && !Number.isNaN(value)) {
    if (
      (criticalLow !== undefined && value <= criticalLow) ||
      (criticalHigh !== undefined && value >= criticalHigh)
    ) {
      statusClass = 'border-rose-500/70 focus:border-rose-400';
      statusText = {
        text: criticalLow !== undefined && value <= criticalLow ? 'Giảm nguy kịch' : 'Tăng nguy kịch',
        tone: 'text-rose-400',
      };
    } else if (
      (lowThreshold !== undefined && value < lowThreshold) ||
      (highThreshold !== undefined && value > highThreshold)
    ) {
      statusClass = 'border-amber-500/60 focus:border-amber-400';
      statusText = {
        text: lowThreshold !== undefined && value < lowThreshold ? 'Thấp' : 'Cao',
        tone: 'text-amber-400',
      };
    } else if (lowThreshold !== undefined || highThreshold !== undefined) {
      statusClass = 'border-emerald-500/40 focus:border-cyan-500';
      statusText = { text: 'Đạt chuẩn', tone: 'text-emerald-400' };
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <label htmlFor={id} className="text-xs font-medium text-slate-200">
          {label}
          {unit && <span className="ml-1 text-[11px] font-normal text-slate-400">({unit})</span>}
        </label>
        <span className="font-mono text-[11px] text-slate-500 tabular-nums">{refRange}</span>
      </div>

      <div className="relative flex items-center">
        <input
          id={id}
          type="number"
          step={step}
          min={min}
          max={max}
          value={value ?? ''}
          onChange={handleChange}
          placeholder={placeholder}
          className={`w-full rounded-md border bg-[#0B0E17] px-3 py-2 font-mono text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-cyan-500/40 tabular-nums transition-colors ${statusClass}`}
        />
        {statusText && (
          <span
            className={`pointer-events-none absolute right-2.5 text-[11px] font-medium ${statusText.tone}`}
          >
            {statusText.text}
          </span>
        )}
      </div>
    </div>
  );
}
