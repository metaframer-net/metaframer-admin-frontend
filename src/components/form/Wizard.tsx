import * as React from 'react';
import { FormProvider, type FieldValues, type Path, type UseFormReturn } from 'react-hook-form';
import { Check } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

export interface WizardStep<T extends FieldValues> {
  id: string;
  title: string;
  description?: string;
  /** Short subtitle shown under the step title in the vertical rail. */
  hint?: string;
  /** Field names validated before leaving this step. */
  fields?: Path<T>[];
  content: React.ReactNode;
}

export interface WizardProps<T extends FieldValues> {
  form: UseFormReturn<T>;
  steps: WizardStep<T>[];
  onComplete: (values: T) => void | Promise<void>;
  /** localStorage key for autosaving the draft. */
  draftKey?: string;
  onCancel?: () => void;
  submitLabel?: string;
  /**
   * Step indicator layout. `horizontal` (default) is the compact top stepper;
   * `vertical` is a left progress rail (numbered steps + connector + progress bar).
   */
  stepsVariant?: 'horizontal' | 'vertical';
  /** Optional hint shown centered in the footer (e.g. an autosave note). */
  footerHint?: React.ReactNode;
  /**
   * Optional helper rail rendered beside the step content (e.g. a verification
   * checklist + quality score that react to the current step). Receives the
   * current step index so it can update per step.
   */
  aside?: (ctx: { index: number; total: number }) => React.ReactNode;
}

/** Multi-step form with per-step Zod validation, autosave, and dirty-warning. */
export function Wizard<T extends FieldValues>({
  form,
  steps,
  onComplete,
  draftKey,
  onCancel,
  submitLabel = 'Tamamla',
  stepsVariant = 'horizontal',
  footerHint,
  aside,
}: WizardProps<T>) {
  const [index, setIndex] = React.useState(0);
  const [submitting, setSubmitting] = React.useState(false);
  const step = steps[index]!;
  const isLast = index === steps.length - 1;

  // Autosave draft.
  React.useEffect(() => {
    if (!draftKey) return;
    const sub = form.watch((values) => {
      try {
        window.localStorage.setItem(draftKey, JSON.stringify(values));
      } catch {
        /* ignore */
      }
    });
    return () => sub.unsubscribe();
  }, [draftKey, form]);

  // Warn on unload while dirty.
  React.useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (form.formState.isDirty && !submitting) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [form.formState.isDirty, submitting]);

  const goNext = async () => {
    const fields = step.fields;
    const valid = fields && fields.length > 0 ? await form.trigger(fields) : true;
    if (valid) setIndex((i) => Math.min(i + 1, steps.length - 1));
  };

  const goBack = () => setIndex((i) => Math.max(i - 1, 0));

  const finish = form.handleSubmit(async (values) => {
    try {
      setSubmitting(true);
      await onComplete(values);
      if (draftKey) {
        try {
          window.localStorage.removeItem(draftKey);
        } catch {
          /* ignore */
        }
      }
    } finally {
      setSubmitting(false);
    }
  });

  return (
    <FormProvider {...form}>
      <div className="grid gap-6">
        {stepsVariant === 'vertical' ? (
          <div
            className={cn(
              'grid gap-6',
              aside ? 'lg:grid-cols-[13rem_minmax(0,1fr)_18rem]' : 'lg:grid-cols-[13rem_minmax(0,1fr)]',
            )}
          >
            <VerticalStepper steps={steps} current={index} onStepClick={(i) => i < index && setIndex(i)} />
            <div className="min-w-0 space-y-6">
              <div className="space-y-1">
                <h2 className="text-lg font-semibold">{step.title}</h2>
                {step.description && <p className="text-muted-foreground text-sm">{step.description}</p>}
              </div>
              <div>{step.content}</div>
            </div>
            {aside && (
              <aside className="lg:border-l lg:border-border lg:pl-6">{aside({ index, total: steps.length })}</aside>
            )}
          </div>
        ) : (
          <>
            <Stepper steps={steps} current={index} onStepClick={(i) => i < index && setIndex(i)} />
            <div className={cn('grid gap-6', aside && 'lg:grid-cols-[minmax(0,1fr)_18rem]')}>
              <div className="min-w-0 space-y-6">
                <div className="space-y-1">
                  <h2 className="text-lg font-semibold">{step.title}</h2>
                  {step.description && <p className="text-muted-foreground text-sm">{step.description}</p>}
                </div>
                <div>{step.content}</div>
              </div>
              {aside && (
                <aside className="lg:border-l lg:border-border lg:pl-6">{aside({ index, total: steps.length })}</aside>
              )}
            </div>
          </>
        )}

        <div className="flex items-center gap-3 border-t border-border pt-4">
          <div className="flex-1">
            {onCancel && (
              <Button type="button" variant="ghost" onClick={onCancel} data-action="cancel" data-entity="wizard">
                Vazgeç
              </Button>
            )}
          </div>
          {footerHint && <div className="text-muted-foreground hidden text-xs sm:block">{footerHint}</div>}
          <div className="flex flex-1 items-center justify-end gap-2">
            {index > 0 && (
              <Button type="button" variant="outline" onClick={goBack} data-action="wizard-back" data-entity="wizard">
                Geri
              </Button>
            )}
            {isLast ? (
              <Button
                type="button"
                loading={submitting}
                onClick={() => void finish()}
                data-action="wizard-submit"
                data-entity="wizard"
              >
                {submitLabel}
              </Button>
            ) : (
              <Button type="button" onClick={() => void goNext()} data-action="wizard-next" data-entity="wizard">
                Devam
              </Button>
            )}
          </div>
        </div>
      </div>
    </FormProvider>
  );
}

function Stepper<T extends FieldValues>({
  steps,
  current,
  onStepClick,
}: {
  steps: WizardStep<T>[];
  current: number;
  onStepClick: (index: number) => void;
}) {
  return (
    <ol className="flex flex-wrap items-center gap-2" aria-label="Adımlar">
      {steps.map((step, i) => {
        const state = i < current ? 'complete' : i === current ? 'current' : 'upcoming';
        return (
          <li key={step.id} className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onStepClick(i)}
              disabled={i >= current}
              aria-current={state === 'current' ? 'step' : undefined}
              className={cn(
                'flex items-center gap-2 rounded-md px-2 py-1 text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring',
                state === 'complete' && 'text-foreground',
                state === 'current' && 'text-foreground font-medium',
                state === 'upcoming' && 'text-muted-foreground',
                i < current && 'hover:bg-accent cursor-pointer',
              )}
              data-action="wizard-goto-step"
              data-entity="wizard"
            >
              <span
                className={cn(
                  'flex size-6 shrink-0 items-center justify-center rounded-full border text-xs tabular-nums',
                  state === 'complete' && 'bg-primary border-primary text-primary-foreground',
                  state === 'current' && 'border-primary text-primary',
                  state === 'upcoming' && 'border-border',
                )}
              >
                {state === 'complete' ? <Check className="size-3.5" /> : i + 1}
              </span>
              <span className="hidden md:inline">{step.title}</span>
            </button>
            {i < steps.length - 1 && <span className="text-muted-foreground" aria-hidden="true">›</span>}
          </li>
        );
      })}
    </ol>
  );
}

/** Left vertical progress rail: numbered steps + connector line + progress bar. */
function VerticalStepper<T extends FieldValues>({
  steps,
  current,
  onStepClick,
}: {
  steps: WizardStep<T>[];
  current: number;
  onStepClick: (index: number) => void;
}) {
  const pct = Math.round(((current + 1) / steps.length) * 100);
  return (
    <nav aria-label="Adımlar">
      <div className="bg-muted mb-4 h-1.5 overflow-hidden rounded-full" aria-hidden="true">
        <div
          className="bg-primary h-full rounded-full transition-[width] duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <ol className="space-y-1">
        {steps.map((step, i) => {
          const state = i < current ? 'complete' : i === current ? 'current' : 'upcoming';
          const isLast = i === steps.length - 1;
          return (
            <li key={step.id} className="relative">
              {!isLast && (
                <span
                  aria-hidden="true"
                  className={cn(
                    'absolute bottom-[-0.25rem] left-[1.375rem] top-9 w-px',
                    state === 'complete' ? 'bg-primary' : 'bg-border',
                  )}
                />
              )}
              <button
                type="button"
                onClick={() => onStepClick(i)}
                disabled={i >= current}
                aria-current={state === 'current' ? 'step' : undefined}
                className={cn(
                  'focus-visible:ring-ring flex w-full items-start gap-3 rounded-md p-2 text-left outline-none transition-colors focus-visible:ring-2',
                  state === 'current' && 'bg-accent/50',
                  i < current && 'hover:bg-accent cursor-pointer',
                )}
                data-action="wizard-goto-step"
                data-entity="wizard"
              >
                <span
                  className={cn(
                    'bg-background relative z-10 flex size-7 shrink-0 items-center justify-center rounded-full border text-xs tabular-nums',
                    state === 'complete' && 'bg-primary border-primary text-primary-foreground',
                    state === 'current' && 'border-primary text-primary',
                    state === 'upcoming' && 'text-muted-foreground border-border',
                  )}
                >
                  {state === 'complete' ? <Check className="size-3.5" /> : i + 1}
                </span>
                <span className="min-w-0 pt-0.5">
                  <span className={cn('block text-sm font-medium', state === 'upcoming' && 'text-muted-foreground')}>
                    {step.title}
                  </span>
                  {step.hint && <span className="text-muted-foreground block text-xs">{step.hint}</span>}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
