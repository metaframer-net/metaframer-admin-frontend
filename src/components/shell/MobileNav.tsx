import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Menu, Search } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
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
 * WhatsApp-style bottom tab bar with a full-width sliding dark pill behind
 * the active tab. Touch-drag slides the pill in real-time; release navigates.
 */
export function MobileBottomNav() {
  const primary = usePrimaryNav(4);
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { setOpen } = useCommandPalette();

  const navRef = useRef<HTMLElement>(null);
  const tabRefs = useRef<Map<string, HTMLElement>>(new Map());
  const [pill, setPill] = useState<{ left: number; width: number } | null>(null);
  const isDragging = useRef(false);
  const animating = useRef(false);
  const [draggingState, setDraggingState] = useState(false);

  const allItems = useMemo(() => [
    ...primary.map((item) => ({ id: item.id, to: item.to, icon: item.icon, label: item.label.split(' ')[0]!, aiEntity: item.aiEntity, type: 'nav' as const })),
    { id: '__search', to: '', icon: Search, label: 'Ara', aiEntity: 'command', type: 'action' as const },
  ], [primary]);

  const activeIdx = primary.findIndex((item) => isNavItemActive(item.to, pathname));

  // Measure a tab element's position relative to the nav
  const measureTab = useCallback((id: string) => {
    const el = tabRefs.current.get(id);
    if (!el || !navRef.current) return null;
    const navRect = navRef.current.getBoundingClientRect();
    const tabRect = el.getBoundingClientRect();
    return { left: tabRect.left - navRect.left, width: tabRect.width };
  }, []);

  // Sync pill to the active route
  const syncPill = useCallback(() => {
    if (isDragging.current || animating.current) return;
    const activeItem = primary[activeIdx];
    if (!activeItem) { setPill(null); return; }
    const pos = measureTab(activeItem.id);
    if (pos) setPill(pos);
  }, [activeIdx, primary, measureTab]);

  useEffect(() => {
    const id = requestAnimationFrame(syncPill);
    return () => cancelAnimationFrame(id);
  }, [syncPill]);
  useEffect(() => {
    window.addEventListener('resize', syncPill);
    return () => window.removeEventListener('resize', syncPill);
  }, [syncPill]);

  // Tap handler: animate pill first, then navigate
  const handleTap = useCallback((id: string, to: string) => {
    const pos = measureTab(id);
    if (!pos) { navigate(to); return; }
    animating.current = true;
    setPill(pos);
    setTimeout(() => {
      animating.current = false;
      navigate(to);
    }, 250);
  }, [measureTab, navigate]);

  // Touch-drag handlers
  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    if (!touch) return;
    isDragging.current = true;
    setDraggingState(true);
    const el = document.elementFromPoint(touch.clientX, touch.clientY);
    if (!el) return;
    const tab = el.closest<HTMLElement>('[data-nav-id]');
    if (!tab) return;
    const id = tab.getAttribute('data-nav-id')!;
    const pos = measureTab(id);
    if (pos) setPill(pos);
  }, [measureTab]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!isDragging.current) return;
    isDragging.current = false;
    setDraggingState(false);
    const touch = e.changedTouches[0];
    if (!touch) { syncPill(); return; }
    const el = document.elementFromPoint(touch.clientX, touch.clientY);
    const tab = el?.closest<HTMLElement>('[data-nav-id]');
    if (!tab) { syncPill(); return; }
    const id = tab.getAttribute('data-nav-id')!;
    const item = allItems.find((i) => i.id === id);
    if (!item) { syncPill(); return; }
    if (item.type === 'action') {
      setOpen(true);
      syncPill();
    } else {
      navigate(item.to);
    }
  }, [allItems, navigate, setOpen, syncPill]);

  return (
    <nav
      ref={navRef}
      className="bg-background/95 supports-[backdrop-filter]:bg-background/80 fixed inset-x-0 bottom-0 z-30 flex h-16 items-stretch backdrop-blur-md xl:hidden"
      aria-label="Alt gezinme"
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Full-width sliding dark pill */}
      {pill && (
        <div
          className={cn(
            'bg-foreground/10 absolute top-1 bottom-1 rounded-2xl',
            draggingState ? 'transition-none' : 'transition-[left,width] duration-[320ms] ease-[cubic-bezier(0.32,0.72,0,1)]',
          )}
          style={{ left: pill.left, width: pill.width }}
          aria-hidden
        />
      )}

      {allItems.map((item) => {
        const active = item.type === 'nav' && isNavItemActive(item.to, pathname);
        const Icon = item.icon;

        return (
          <button
            key={item.id}
            type="button"
            data-nav-id={item.id}
            ref={(el) => { if (el) tabRefs.current.set(item.id, el); else tabRefs.current.delete(item.id); }}
            onClick={() => {
              if (item.type === 'action') { setOpen(true); return; }
              if (!active) handleTap(item.id, item.to);
            }}
            aria-current={active ? 'page' : undefined}
            aria-label={item.type === 'action' ? 'Komut paletini aç' : undefined}
            data-action={item.type === 'action' ? 'open-command-palette' : 'navigate'}
            data-entity={item.aiEntity ?? 'module'}
            className={cn(
              'relative z-10 flex flex-1 flex-col items-center justify-center gap-0.5 text-[0.6875rem] outline-none transition-colors duration-150',
              active ? 'text-primary' : 'text-muted-foreground',
            )}
          >
            <Icon className="size-5" aria-hidden="true" />
            <span className={cn('max-w-full truncate px-1', active && 'font-semibold')}>
              {item.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
