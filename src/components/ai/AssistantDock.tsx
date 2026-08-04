import { Sparkles } from 'lucide-react';

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
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

  return (
    <>
      {/* Positioning lives on this wrapper — the button keeps `position: relative`
          for its own absolutely-positioned glass layers, so it must not carry the
          `fixed` utility itself (the component's own CSS would win the cascade and
          drop it back into normal flow, shifting it and breaking sibling sticky). */}
      <div className="fixed bottom-20 right-4 z-40 xl:bottom-6">
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
