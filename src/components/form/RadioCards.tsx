import { useId } from 'react';

import { cn } from '@/lib/utils';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

export interface RadioCardOption {
  value: string;
  label: string;
  hint?: string;
}

export interface RadioCardsProps {
  options: RadioCardOption[];
  value: string;
  onChange: (value: string) => void;
  id?: string | undefined;
  'aria-label'?: string | undefined;
  'aria-labelledby'?: string | undefined;
  'aria-describedby'?: string | undefined;
  'aria-invalid'?: boolean | undefined;
}

/**
 * A radio group rendered as selectable cards (label + optional hint). Wraps the
 * shadcn RadioGroup so every item stays keyboard-navigable and screen-reader
 * announced; the whole card is clickable via `<label htmlFor>` (a Radix item is
 * a labelable `<button>`). Selection styling is token-only.
 */
export function RadioCards({
  options,
  value,
  onChange,
  id,
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledBy,
  'aria-describedby': ariaDescribedBy,
  'aria-invalid': ariaInvalid,
}: RadioCardsProps) {
  const baseId = useId();
  const groupId = id ?? baseId;
  return (
    <RadioGroup
      value={value}
      onValueChange={onChange}
      className="flex flex-wrap gap-2.5"
      aria-label={ariaLabel}
      aria-labelledby={ariaLabelledBy}
      aria-describedby={ariaDescribedBy}
      aria-invalid={ariaInvalid}
    >
      {options.map((option) => {
        const itemId = `${groupId}-${option.value}`;
        const selected = value === option.value;
        return (
          <label
            key={option.value}
            htmlFor={itemId}
            className={cn(
              'flex flex-1 basis-40 cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors',
              selected ? 'border-primary bg-primary/5 ring-primary ring-1' : 'border-border hover:border-primary/40',
            )}
          >
            <RadioGroupItem value={option.value} id={itemId} className="mt-0.5" />
            <span className="min-w-0">
              <span className="block text-sm font-medium">{option.label}</span>
              {option.hint && <span className="text-muted-foreground mt-0.5 block text-xs">{option.hint}</span>}
            </span>
          </label>
        );
      })}
    </RadioGroup>
  );
}
