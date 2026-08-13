import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { LayoutDashboard, Building2, Users, MessagesSquare, Search } from 'lucide-react';

import { LiquidDock, LiquidDockFilters, type DockTab } from './index';

const meta = {
  title: 'Shell/LiquidDock',
  component: LiquidDock,
  parameters: { layout: 'fullscreen' },
  decorators: [
    (Story, context) => {
      // Vertical stories pin the dock to an edge (mirrors EdgeDock's stage).
      const placement = (context.parameters['dockPlacement'] ?? 'bottom') as 'bottom' | 'left' | 'right';
      return (
        <div className="relative min-h-screen w-full bg-black">
          <LiquidDockFilters />
          {/* Colourful scrollable backdrop for visible refraction */}
          <div className="flex flex-col pb-40">
            {Array.from({ length: 10 }, (_, i) => (
              <div
                key={i}
                className="flex items-center justify-center border-b border-white/5 px-4 py-6"
                style={{
                  height: 120,
                  background: `linear-gradient(135deg, hsl(${i * 36} 70% 55%), hsl(${(i * 36 + 60) % 360} 70% 45%))`,
                }}
              >
                <p className="text-sm font-semibold text-white/80">
                  Emlak İlanı #{i + 1} — Cam efekti bu renkli zemin üzerinde görünür
                </p>
              </div>
            ))}
          </div>
          {placement === 'bottom' ? (
            <div
              className="fixed inset-x-0 bottom-6 z-50 flex justify-center"
              style={{ pointerEvents: 'none' }}
            >
              <div style={{ width: 'calc(100% - 26px)', maxWidth: 500, pointerEvents: 'auto' }}>
                <Story />
              </div>
            </div>
          ) : (
            <div
              className={`fixed inset-y-0 z-50 flex items-center ${placement === 'left' ? 'left-6' : 'right-6'}`}
              style={{ pointerEvents: 'none' }}
            >
              <div style={{ height: 'min(400px, 70vh)', pointerEvents: 'auto' }}>
                <Story />
              </div>
            </div>
          )}
        </div>
      );
    },
  ],
} satisfies Meta<typeof LiquidDock>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Default state with the first tab active. */
export const Default: Story = {
  render: function Render() {
    const [active, setActive] = useState(0);
    return <LiquidDock activeIndex={active} onSelect={setActive} />;
  },
};

/** Third tab (Kişiler) active — lens in the middle. */
export const MiddleTab: Story = {
  render: function Render() {
    const [active, setActive] = useState(2);
    return <LiquidDock activeIndex={active} onSelect={setActive} />;
  },
};

/** Last tab (Ara) active — lens at the right edge. */
export const LastTab: Story = {
  render: function Render() {
    const [active, setActive] = useState(4);
    return <LiquidDock activeIndex={active} onSelect={setActive} />;
  },
};

/**
 * Vertical (left edge) — the SAME icon + stacked-label layout as the horizontal
 * dock; only the axis changes. No side tooltip.
 */
export const VerticalLeft: Story = {
  parameters: { dockPlacement: 'left' },
  render: function Render() {
    const [active, setActive] = useState(0);
    return <LiquidDock orientation="vertical" side="left" activeIndex={active} onSelect={setActive} />;
  },
};

/** The real longest nav label — must clamp inside the 66px bar, not spill out. */
const LONG_LABEL_TABS: DockTab[] = [
  { id: 'dashboard', label: 'Genel',        icon: LayoutDashboard },
  { id: 'listings',  label: 'İlanlar',      icon: Building2 },
  { id: 'users',     label: 'Kullanıcılar', icon: Users },
  { id: 'messages',  label: 'Mesajlar',     icon: MessagesSquare },
  { id: 'search',    label: 'Ara',          icon: Search },
];

/** Vertical (right edge) with the longest Turkish labels (truncation guard). */
export const VerticalRight: Story = {
  parameters: { dockPlacement: 'right' },
  render: function Render() {
    const [active, setActive] = useState(2);
    return (
      <LiquidDock
        tabs={LONG_LABEL_TABS}
        orientation="vertical"
        side="right"
        activeIndex={active}
        onSelect={setActive}
      />
    );
  },
};

/** Mobile viewport (390×844). */
export const Mobile: Story = {
  parameters: {
    viewport: { defaultViewport: 'mobile1' },
  },
  render: function Render() {
    const [active, setActive] = useState(0);
    return <LiquidDock activeIndex={active} onSelect={setActive} />;
  },
};
