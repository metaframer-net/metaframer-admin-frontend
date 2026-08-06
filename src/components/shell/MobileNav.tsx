import { useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Menu, Search } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { LiquidDock, LiquidDockFilters, type DockTab } from '@/components/liquid-dock';
import { Brand } from './Brand';
import { NavTree } from './NavTree';
import { usePermittedNav, usePrimaryNav, isNavItemActive } from './nav-utils';
import { useCommandPalette } from './command-palette-context';

/** Hamburger + full-nav drawer. */
export function MobileDrawer() {
  const [open, setOpen] = useState(false);
  const nav = usePermittedNav();
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="xl:hidden" aria-label="Menüyü aç" data-action="open-mobile-drawer" data-entity="navigation">
          <Menu className="size-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-72 p-0">
        <SheetHeader className="border-b border-border">
          <SheetTitle asChild><Brand /></SheetTitle>
          <SheetDescription className="sr-only">Ana gezinme menüsü</SheetDescription>
        </SheetHeader>
        <ScrollArea className="h-[calc(100svh-4rem)] px-3 py-3">
          <NavTree items={nav} onNavigate={() => setOpen(false)} />
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

/**
 * iOS 26 liquid glass bottom nav — wraps LiquidDock with route navigation.
 * Reads primary items from nav-schema, adds a search action, and navigates
 * on tab selection. The SVG filter defs are rendered once here.
 */
export function MobileBottomNav() {
  const primary = usePrimaryNav(4);
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { setOpen: setPaletteOpen } = useCommandPalette();

  const tabs: DockTab[] = useMemo(() => [
    ...primary.map((item) => ({
      id: item.id,
      label: item.label.split(' ')[0]!,
      icon: item.icon,
    })),
    { id: '__search', label: 'Ara', icon: Search },
  ], [primary]);

  const activeIdx = primary.findIndex((item) => isNavItemActive(item.to, pathname));

  const handleSelect = (idx: number) => {
    const navItem = primary[idx];
    if (navItem) {
      // Nav item — navigate
      navigate(navItem.to);
    } else {
      // Last slot = search action
      setPaletteOpen(true);
    }
  };

  return (
    <>
      <LiquidDockFilters />
      <div
        className="fixed inset-x-0 z-30 xl:hidden"
        style={{
          bottom: 'calc(env(safe-area-inset-bottom, 0px) + 10px)',
          pointerEvents: 'none',
        }}
      >
        <div
          className="mx-auto"
          style={{ width: 'calc(100% - 26px)', pointerEvents: 'auto' }}
        >
          <LiquidDock
            tabs={tabs}
            activeIndex={activeIdx >= 0 ? activeIdx : 0}
            onSelect={handleSelect}
          />
        </div>
      </div>
    </>
  );
}
