/**
 * SVG filter definitions for the liquid glass dock. Rendered ONCE at the
 * application root (or the lab page), not per-component instance.
 *
 * Two filters:
 *   #dock-refraction  — mild bar warp (scale 22)
 *   #lens-refraction  — strong lens warp (scale 74/68/62) + chromatic aberration
 *
 * The displacement map uses a ring-shaped gradient: centre is neutral grey
 * (#808080 = zero displacement), the outer 45% ring transitions to the
 * directional gradient (R = x shift, G = y shift). This keeps the lens
 * centre clear while bending the periphery — the hallmark of real glass.
 */

const MAP_SVG = `<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120'><defs><linearGradient id='x' x1='0' y1='0' x2='1' y2='0'><stop offset='0' stop-color='%23000'/><stop offset='1' stop-color='%23f00'/></linearGradient><linearGradient id='y' x1='0' y1='0' x2='0' y2='1'><stop offset='0' stop-color='%23000'/><stop offset='1' stop-color='%230f0'/></linearGradient><radialGradient id='m' cx='50%25' cy='50%25' r='50%25'><stop offset='0%25' stop-color='%23808080' stop-opacity='1'/><stop offset='55%25' stop-color='%23808080' stop-opacity='1'/><stop offset='100%25' stop-color='%23808080' stop-opacity='0'/></radialGradient></defs><rect width='120' height='120' rx='40' fill='url(%23x)'/><rect width='120' height='120' rx='40' fill='url(%23y)' style='mix-blend-mode:screen'/><rect width='120' height='120' rx='40' fill='url(%23m)'/></svg>`;

const MAP_URI = `data:image/svg+xml,${MAP_SVG}`;

export function LiquidDockFilters() {
  return (
    <svg
      width="0"
      height="0"
      aria-hidden="true"
      style={{ position: 'absolute', pointerEvents: 'none' }}
    >
      <defs>
        {/* ── Bar refraction — mild (scale 22) ── */}
        <filter
          id="dock-refraction"
          x="-40%"
          y="-40%"
          width="180%"
          height="180%"
          colorInterpolationFilters="sRGB"
        >
          <feImage href={MAP_URI} result="map" preserveAspectRatio="none" />
          <feDisplacementMap
            in="SourceGraphic"
            in2="map"
            scale={22}
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </filter>

        {/* ── Lens refraction — strong + chromatic aberration ──
         *
         *  Three displacement passes at different scales split the
         *  image into R/G/B channels with slightly offset warps.
         *  Recombined with screen blend → rainbow fringe at edges.
         *
         *  R: scale 74 (strongest), G: 68, B: 62 (weakest)
         */}
        <filter
          id="lens-refraction"
          x="-40%"
          y="-40%"
          width="180%"
          height="180%"
          colorInterpolationFilters="sRGB"
        >
          <feImage href={MAP_URI} result="map" preserveAspectRatio="none" />

          {/* Red channel — strongest displacement */}
          <feDisplacementMap in="SourceGraphic" in2="map" scale={74} xChannelSelector="R" yChannelSelector="G" result="dR" />
          <feColorMatrix in="dR" type="matrix" values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0" result="cR" />

          {/* Green channel — base displacement */}
          <feDisplacementMap in="SourceGraphic" in2="map" scale={68} xChannelSelector="R" yChannelSelector="G" result="dG" />
          <feColorMatrix in="dG" type="matrix" values="0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0" result="cG" />

          {/* Blue channel — weakest displacement */}
          <feDisplacementMap in="SourceGraphic" in2="map" scale={62} xChannelSelector="R" yChannelSelector="G" result="dB" />
          <feColorMatrix in="dB" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0" result="cB" />

          {/* Recombine with screen blend */}
          <feBlend in="cR" in2="cG" mode="screen" result="rg" />
          <feBlend in="rg" in2="cB" mode="screen" />
        </filter>
      </defs>
    </svg>
  );
}
