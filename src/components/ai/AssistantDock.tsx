import { Sparkles } from 'lucide-react';

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { useAssistant } from '@/lib/ai';
import { AssistantPanel } from './AssistantPanel';

/**
 * Global AI assistant surface: the copilot panel in a Sheet. Open state lives in
 * the `assistant-store`, so ⌘K / the command palette open it (the standalone
 * floating launcher was retired — the dock's AI orb logo now opens the "Ara… Sor…"
 * command center instead). Mounted once in AppShell. Mobile-first: the panel is a
 * full-width sheet on small screens and a right-side panel on `sm+`.
 */
export function AssistantDock() {
  const { open, setOpen } = useAssistant();

  return (
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
  );
}
