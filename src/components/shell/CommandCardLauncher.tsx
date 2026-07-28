import { useMatches } from 'react-router-dom';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { hasRouteMeta } from '@/app/route-meta';
import { DOCK_DESKTOP_QUERY, useMediaQuery } from '@/lib/layout/use-media-query';
import { CommandCenter } from './CommandCenter';
import { useCommandPalette } from './command-palette-context';

/**
 * Mobile host for the command center in `dock` mode. Below `xl` there is no
 * floating pill to unfold, so the same `CommandCenter` body is presented in a
 * dialog that slides down from the top command bar.
 *
 * From `xl` up this renders nothing at all: the dock pill hosts the command
 * center INSIDE itself (see `CommandDock`), and two surfaces bound to one open
 * state would fight over focus, scroll lock and Escape.
 */
export function CommandCardLauncher() {
  const { open, setOpen } = useCommandPalette();
  const isDesktop = useMediaQuery(DOCK_DESKTOP_QUERY);
  const matches = useMatches();

  let contextEntity: string | undefined;
  for (const match of matches) {
    // Deepest matched route wins — it is the page the user is actually on.
    if (hasRouteMeta(match.handle)) contextEntity = match.handle.routeMeta.aiEntity;
  }

  if (isDesktop) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {/* Anchored under the mobile command bar (top-16) and scaled up from its top
          edge, so it reads as expanding OUT of the bar rather than popping in the
          screen center. `rounded-3xl` matches the dock pill's open radius. */}
      <DialogContent className="dock-command-center top-16 max-h-[calc(100dvh-5rem)] w-[calc(100%-2rem)] origin-top translate-y-0 gap-0 overflow-hidden rounded-3xl p-0 duration-[var(--duration-slow)] data-[state=closed]:slide-out-to-top-8 data-[state=open]:slide-in-from-top-8 sm:max-w-2xl">
        <DialogHeader className="flex-none px-5 pb-3 pr-16 pt-4 text-left">
          <DialogTitle className="text-lg tracking-tight">Nereye gitmek istersin?</DialogTitle>
          <DialogDescription className="sr-only">
            İzinli modüllere geçin, komut arayın veya doğal dille bir eylem önerin.
          </DialogDescription>
        </DialogHeader>
        <CommandCenter onClose={() => setOpen(false)} contextEntity={contextEntity} />
      </DialogContent>
    </Dialog>
  );
}
