import * as React from 'react';

import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';

export interface RangeValue {
  min?: number | undefined;
  max?: number | undefined;
}

export interface RangeInputProps {
  value?: RangeValue;
  onChange?: (value: RangeValue) => void;
  /** Unit suffix shown inside each field (e.g., ₺, m²). */
  unit?: string;
  minPlaceholder?: string;
  maxPlaceholder?: string;
  disabled?: boolean;
  id?: string;
  className?: string;
  /** Slider lower bound — enables dual-thumb slider when set with sliderMax. */
  sliderMin?: number | undefined;
  /** Slider upper bound. */
  sliderMax?: number | undefined;
  /** Step size for the slider. Defaults to 1. */
  sliderStep?: number | undefined;
  'aria-invalid'?: boolean;
  'aria-describedby'?: string;
}

const nf = new Intl.NumberFormat('tr-TR');

function formatDisplay(n: number | undefined): string {
  return n === undefined || Number.isNaN(n) ? '' : nf.format(n);
}
function parseDigits(s: string): number | undefined {
  const digits = s.replace(/[^\d]/g, '');
  return digits === '' ? undefined : Number(digits);
}

export function RangeInput({
  value = {},
  onChange,
  unit,
  minPlaceholder = 'En az',
  maxPlaceholder = 'En çok',
  disabled,
  id,
  className,
  sliderMin,
  sliderMax,
  sliderStep = 1,
  ...aria
}: RangeInputProps) {
  const hasSlider = sliderMin !== undefined && sliderMax !== undefined;
  const sMin = sliderMin ?? 0;
  const sMax = sliderMax ?? 100;

  const handleSliderCommit = React.useCallback(
    (values: number[]) => {
      const lo = values[0];
      const hi = values[1];
      if (lo === undefined || hi === undefined) return;
      onChange?.({ min: lo, max: hi });
    },
    [onChange],
  );

  const handleInputChange = React.useCallback(
    (kind: 'min' | 'max', raw: string) => {
      onChange?.({ ...value, [kind]: parseDigits(raw) });
    },
    [onChange, value],
  );

  // Slider always works with actual numbers — never undefined
  const sliderLo = value.min ?? sMin;
  const sliderHi = value.max ?? sMax;

  return (
    <div
      className={cn('space-y-3', className)}
      role="group"
      aria-invalid={aria['aria-invalid']}
      aria-describedby={aria['aria-describedby']}
    >
      <div className="flex items-center gap-2">
        <NumericField
          value={value.min}
          placeholder={minPlaceholder}
          unit={unit}
          disabled={disabled}
          onChange={(raw) => handleInputChange('min', raw)}
          id={id}
          ariaLabel={minPlaceholder}
        />
        <span className="text-muted-foreground" aria-hidden="true">–</span>
        <NumericField
          value={value.max}
          placeholder={maxPlaceholder}
          unit={unit}
          disabled={disabled}
          onChange={(raw) => handleInputChange('max', raw)}
          ariaLabel={maxPlaceholder}
        />
      </div>

      {hasSlider && (
        <div className="px-1">
          <Slider
            min={sMin}
            max={sMax}
            step={sliderStep}
            value={[sliderLo, sliderHi]}
            onValueChange={handleSliderCommit}
            disabled={disabled ?? false}
            aria-label={`${minPlaceholder} – ${maxPlaceholder} aralığı`}
          />
          <div className="text-muted-foreground mt-1 flex justify-between text-[10px] tabular-nums">
            <span>{nf.format(sMin)}</span>
            <span>{nf.format(sMax)}</span>
          </div>
        </div>
      )}
    </div>
  );
}

function NumericField({
  value,
  placeholder,
  unit,
  disabled,
  onChange,
  id,
  ariaLabel,
}: {
  value: number | undefined;
  placeholder: string;
  unit?: string | undefined;
  disabled?: boolean | undefined;
  onChange: (raw: string) => void;
  id?: string | undefined;
  ariaLabel: string;
}) {
  return (
    <div className="relative flex-1">
      <Input
        inputMode="numeric"
        placeholder={placeholder}
        disabled={disabled}
        value={formatDisplay(value)}
        onChange={(e) => onChange(e.target.value)}
        className={cn('tabular-nums', unit && 'pr-9')}
        id={id}
        aria-label={ariaLabel}
      />
      {unit && (
        <span className="text-muted-foreground pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs">
          {unit}
        </span>
      )}
    </div>
  );
}
