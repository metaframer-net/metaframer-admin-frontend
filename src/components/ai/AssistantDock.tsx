import { Sparkles } from 'lucide-react';

import { cn } from '@/lib/utils';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { useCommandPalette } from '@/components/shell/command-palette-context';
import { useAssistant } from '@/lib/ai';
import { AiAskButton } from './AiAskButton';
import { AssistantPanel } from './AssistantPanel';

/**
 * Global AI assistant surface: a floating liquid-glass "Ask AI" launcher plus the
 * panel in a Sheet. Open state lives in the `assistant-store`, so ⌘K / command
 * palette can open it too. Mounted once in AppShell. Mobile-first: the panel is a
 * full-width sheet on small screens and a right-side panel on `sm+`.
 */
export function AssistantDock() {
  const { open, setOpen } = useAssistant();
  // Hide the floating launcher while the command center is open: both live at
  // z-40, so on mobile (dock-island) the orb would otherwise paint ON TOP of the
  // open panel, and on desktop it would float over the command backdrop. It fades
  // back in on close.
  const { open: commandOpen } = useCommandPalette();

  return (
    <>
      {/* Positioning lives on this wrapper — the button keeps `position: relative`
          for its own absolutely-positioned glass layers, so it must not carry the
          `fixed` utility itself (the component's own CSS would win the cascade and
          drop it back into normal flow, shifting it and breaking sibling sticky). */}
      <div
        className={cn(
          'fixed bottom-20 right-4 z-40 transition-opacity duration-200 xl:bottom-6',
          commandOpen ? 'pointer-events-none opacity-0' : 'opacity-100',
        )}
        {...(commandOpen ? { inert: true, 'aria-hidden': true } : {})}
      >
        <AiAskButton onClick={() => setOpen(true)} />
      </div>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="flex w-full flex-col gap-4 md:max-w-md">
          <SheetHeader className="space-y-1">
            <SheetTitle className="flex items-center gap-2">
              <Sparkles className="text-primary size-4" aria-hidden /> AI Asistanı
            </SheetTitle>
            <SheetDescription>
              Kural tabanlı kopilot — komutları filtre, sayfa geçişi veya onay önerisine çevirir.
              AI önerir, siz onaylarsınız.
            </SheetDescription>
          </SheetHeader>
          <div className="min-h-0 flex-1 overflow-y-auto px-1">
            <AssistantPanel onApplied={() => setOpen(false)} />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
