import { Link } from 'react-router-dom';
import { Hexagon } from 'lucide-react';

import { cn } from '@/lib/utils';

export interface BrandProps {
  /** Icon-only (collapsed sidebar). */
  compact?: boolean;
  className?: string;
}

/** Product wordmark linking to the dashboard. */
export function Brand({ compact = false, className }: BrandProps) {
  return (
    <Link
      to="/"
      className={cn('flex items-center gap-2 rounded-md font-semibold outline-none focus-visible:ring-2 focus-visible:ring-ring', className)}
      data-action="navigate"
      data-entity="dashboard"
      aria-label="example.net — Genel Bakış"
    >
      <span className="bg-primary text-primary-foreground flex size-8 shrink-0 items-center justify-center rounded-md">
        <Hexagon className="size-5" />
      </span>
      {!compact && (
        <span className="text-base">
          example<span className="text-muted-foreground">.net</span>
        </span>
      )}
    </Link>
  );
}
