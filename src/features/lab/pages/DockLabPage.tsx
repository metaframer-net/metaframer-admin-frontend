import { useState } from 'react';
import { LiquidDock, LiquidDockFilters } from '@/components/liquid-dock';

/**
 * Lab page for the iOS 26 Liquid Glass Dock.
 * A scrollable text-heavy list sits behind the dock so the glass
 * refraction and chromatic aberration are clearly visible.
 */
export function DockLabPage() {
  const [activeIndex, setActiveIndex] = useState(0);
  const labels = ['Genel', 'İlanlar', 'Kişiler', 'Mesajlar', 'Ara'];

  return (
    <div className="relative min-h-svh w-full overflow-auto bg-black">
      {/* SVG filter definitions — rendered once */}
      <LiquidDockFilters />

      {/* Scrollable content — text + colourful gradients so refraction is obvious */}
      <div className="flex flex-col pb-32">
        {Array.from({ length: 30 }, (_, i) => {
          const hue = (i * 31) % 360;
          return (
            <div
              key={i}
              className="flex items-start gap-3 border-b border-white/5 px-4 py-4"
              style={{
                background: `linear-gradient(135deg, hsl(${hue} 70% 55%), hsl(${(hue + 60) % 360} 70% 45%))`,
              }}
            >
              <div
                className="size-10 shrink-0 rounded-full"
                style={{ background: `hsl(${(hue + 120) % 360} 60% 70%)` }}
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-white/90">
                  Emlak İlanı #{i + 1} — {['Kadıköy', 'Beşiktaş', 'Üsküdar', 'Bakırköy', 'Şişli', 'Maltepe'][i % 6]}
                </p>
                <p className="mt-0.5 text-xs text-white/60">
                  {['3+1 Daire, 120m², 5.kat, Deniz manzaralı',
                    '2+1 Residence, 85m², 12.kat, Havuzlu site',
                    'Müstakil Villa, 350m², 3 katlı, bahçeli',
                    'Stüdyo, 45m², Giriş kat, Metro yakını',
                    'Dublex, 180m², Çatı katı, Teras',
                    'İşyeri, 200m², AVM içi, Devren kiralık'][i % 6]}
                </p>
                <p className="mt-1 text-xs font-bold text-white/80">
                  {(2_500_000 + i * 350_000).toLocaleString('tr-TR')} ₺
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Active tab indicator */}
      <div className="fixed top-4 left-1/2 z-50 -translate-x-1/2 rounded-full bg-black/60 px-4 py-1.5 text-xs font-medium text-white/80 backdrop-blur-md">
        {labels[activeIndex]}
      </div>

      {/* Dock — fixed at the bottom */}
      <div
        className="fixed inset-x-0 z-50"
        style={{
          bottom: 'calc(env(safe-area-inset-bottom, 0px) + 10px)',
          pointerEvents: 'none',
        }}
      >
        <div className="mx-auto" style={{ width: 'calc(100% - 26px)', pointerEvents: 'auto' }}>
          <LiquidDock
            activeIndex={activeIndex}
            onSelect={setActiveIndex}
          />
        </div>
      </div>

      {/* Hide AppShell chrome on this lab page */}
      <style>{`
        nav[aria-label="Alt gezinme"] { display: none !important; }
        [data-slot="edge-dock"] { display: none !important; }
      `}</style>
    </div>
  );
}
