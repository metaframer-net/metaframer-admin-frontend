import { Search } from 'lucide-react';

import { Separator } from '@/components/ui/separator';
import { OrgSwitcher } from '@/features/auth/components/OrgSwitcher';
import { ThemeToggle } from './ThemeToggle';
import { DensityToggle } from './DensityToggle';
import { LayoutSwitcher } from './LayoutSwitcher';
import { UserMenu } from './UserMenu';
import { useCommandPalette } from './command-palette-context';

/** Reusable right-side cluster: search trigger + toggles + user menu. */
export function TopbarActions() {
  const { setOpen } = useCommandPalette();
  return (
    <div className="flex items-center gap-1.5">
      <OrgSwitcher />
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-muted-foreground hover:bg-accent hover:text-accent-foreground focus-visible:ring-ring inline-flex h-9 items-center gap-2 rounded-md border border-input bg-background px-3 text-sm outline-none transition-colors focus-visible:ring-2"
        aria-label="Komut paletini aç"
        data-action="open-command-palette"
        data-entity="command"
      >
        <Search className="size-4" />
        <span className="hidden xl:inline">Ara…</span>
        <kbd className="bg-muted text-muted-foreground pointer-events-none hidden select-none rounded border border-border px-1.5 font-mono text-[0.625rem] xl:inline">
          ⌘K
        </kbd>
      </button>
      <Separator orientation="vertical" className="mx-1 hidden h-6 md:block" />
      <DensityToggle />
      <LayoutSwitcher />
      <ThemeToggle />
      <UserMenu />
    </div>
  );
}
