import * as React from 'react';

/**
 * What triggered the last open/close. ⌘K and Escape are used dozens of times a
 * day; animating them reads as lag, so keyboard-driven transitions play
 * instantly while pointer-driven ones keep the unfold.
 */
export type CommandPaletteSource = 'keyboard' | 'pointer';

interface CommandPaletteContextValue {
  open: boolean;
  setOpen: (open: boolean, source?: CommandPaletteSource) => void;
  toggle: (source?: CommandPaletteSource) => void;
  /** How the palette was last opened or closed. */
  source: CommandPaletteSource;
}

const CommandPaletteContext = React.createContext<CommandPaletteContextValue | null>(null);

/** Holds command-palette open state and binds the Cmd/Ctrl-K shortcut. */
export function CommandPaletteProvider({
  children,
  defaultOpen = false,
}: {
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpenState] = React.useState(defaultOpen);
  const [source, setSource] = React.useState<CommandPaletteSource>('pointer');

  const setOpen = React.useCallback((next: boolean, from: CommandPaletteSource = 'pointer') => {
    setSource(from);
    setOpenState(next);
  }, []);

  const toggle = React.useCallback((from: CommandPaletteSource = 'pointer') => {
    setSource(from);
    setOpenState((v) => !v);
  }, []);

  React.useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        toggle('keyboard');
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [toggle]);

  const value = React.useMemo<CommandPaletteContextValue>(
    () => ({ open, setOpen, toggle, source }),
    [open, setOpen, toggle, source],
  );

  return <CommandPaletteContext.Provider value={value}>{children}</CommandPaletteContext.Provider>;
}

export function useCommandPalette(): CommandPaletteContextValue {
  const ctx = React.useContext(CommandPaletteContext);
  if (!ctx) throw new Error('useCommandPalette must be used within a CommandPaletteProvider');
  return ctx;
}
