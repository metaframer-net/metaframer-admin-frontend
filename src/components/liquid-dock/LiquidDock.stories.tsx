import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { LiquidDock, LiquidDockFilters } from './index';

const meta = {
  title: 'Shell/LiquidDock',
  component: LiquidDock,
  parameters: { layout: 'fullscreen' },
  decorators: [
    (Story) => (
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
        <div
          className="fixed inset-x-0 bottom-6 z-50 flex justify-center"
          style={{ pointerEvents: 'none' }}
        >
          <div style={{ width: 'calc(100% - 26px)', maxWidth: 500, pointerEvents: 'auto' }}>
            <Story />
          </div>
        </div>
      </div>
    ),
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
