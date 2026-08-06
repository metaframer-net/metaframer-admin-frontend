import { memo, useEffect, useId, useRef } from 'react';

const TWO_PI = Math.PI * 2;

export interface DotFieldProps {
  /** Dot radius in px. */
  dotRadius?: number;
  /** Gap between dots in px. */
  dotSpacing?: number;
  /** Cursor influence radius in px. */
  cursorRadius?: number;
  /** How far dots bulge away from the cursor. */
  bulgeStrength?: number;
  /** Radius (px) of the soft glow that tracks the cursor. */
  glowRadius?: number;
  /**
   * CSS custom properties (resolved at runtime) used as the two gradient stops.
   * They MUST reference semantic tokens so the field re-tints with the theme.
   */
  fromVar?: string;
  toVar?: string;
  /** Token-referencing color for the cursor-tracking glow (center stop). */
  glowVar?: string;
  className?: string;
}

/**
 * Resolve a `var(--token)` expression to a concrete, canvas-parsable color.
 * The probe is mounted inside `anchor` so component-scoped custom properties
 * (and the current theme on `<html>`) resolve correctly.
 */
function resolveColor(expr: string, anchor: HTMLElement): string {
  const probe = document.createElement('span');
  probe.style.color = expr;
  probe.style.display = 'none';
  anchor.appendChild(probe);
  const value = getComputedStyle(probe).color;
  probe.remove();
  return value;
}

/**
 * Canvas dot grid that bulges away from the cursor — the animated fill behind the
 * AI "Ask AI" launcher. Ported to TS from the reference `DotField`, re-tinted to
 * OUR tokens (no hardcoded colors: gradient + glow stops resolve `--primary`/
 * `--accent` at runtime and re-resolve on theme change). A soft radial glow
 * tracks the cursor, fading in with movement (engagement) just like the source.
 * Honors `prefers-reduced-motion` (renders a static grid, no glow, no RAF / no
 * listeners) and pauses when the tab hides.
 */
export const DotField = memo(function DotField({
  dotRadius = 1.2,
  dotSpacing = 10,
  cursorRadius = 200,
  bulgeStrength = 40,
  glowRadius = 90,
  fromVar = 'var(--ask-dot-from)',
  toVar = 'var(--ask-dot-to)',
  glowVar = 'var(--ask-dot-glow)',
  className,
}: DotFieldProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const glowRef = useRef<SVGCircleElement>(null);
  const glowId = useId().replace(/[:]/g, '');
  // Keep the latest tuning props available to the animation loop without
  // re-subscribing listeners on every render.
  const propsRef = useRef({ dotRadius, dotSpacing, cursorRadius, bulgeStrength, fromVar, toVar, glowVar });
  propsRef.current = { dotRadius, dotSpacing, cursorRadius, bulgeStrength, fromVar, toVar, glowVar };

  useEffect(() => {
    const canvasEl = canvasRef.current;
    if (!canvasEl) return;
    const context = canvasEl.getContext('2d', { alpha: true });
    if (!context) return;
    // Capture the narrowed (non-null) values so the closures below stay typed.
    const cv = canvasEl;
    const ctx = context;
    const glowEl = glowRef.current;

    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    let reduced = motionQuery.matches;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    type Dot = { ax: number; ay: number; sx: number; sy: number };
    let dots: Dot[] = [];
    const size = { w: 0, h: 0, offsetX: 0, offsetY: 0 };
    const mouse = { x: -9999, y: -9999, prevX: -9999, prevY: -9999, speed: 0 };
    let engagement = 0;
    let glowAlpha = 0;
    let raf = 0;
    let colors = { from: '#000', to: '#000', glow: '#000' };

    function refreshColors() {
      const p = propsRef.current;
      const anchor = cv.parentElement ?? cv;
      colors = {
        from: resolveColor(p.fromVar, anchor),
        to: resolveColor(p.toVar, anchor),
        glow: resolveColor(p.glowVar, anchor),
      };
      // Push the resolved center color into the SVG radial gradient stop.
      const stop = document.getElementById(`${glowId}-stop`);
      if (stop) stop.setAttribute('stop-color', colors.glow);
    }

    function buildDots() {
      const p = propsRef.current;
      const step = p.dotRadius + p.dotSpacing;
      const cols = Math.floor(size.w / step);
      const rows = Math.floor(size.h / step);
      const padX = (size.w % step) / 2;
      const padY = (size.h % step) / 2;
      const next: Dot[] = new Array(Math.max(rows, 0) * Math.max(cols, 0));
      let idx = 0;
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const ax = padX + col * step + step / 2;
          const ay = padY + row * step + step / 2;
          next[idx++] = { ax, ay, sx: ax, sy: ay };
        }
      }
      dots = next;
    }

    function doResize() {
      const parent = cv.parentElement;
      if (!parent) return;
      const rect = parent.getBoundingClientRect();
      size.w = rect.width;
      size.h = rect.height;
      size.offsetX = rect.left + window.scrollX;
      size.offsetY = rect.top + window.scrollY;
      cv.width = rect.width * dpr;
      cv.height = rect.height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      buildDots();
    }

    function paintStatic() {
      const p = propsRef.current;
      const rad = p.dotRadius / 2;
      ctx.clearRect(0, 0, size.w, size.h);
      const grad = ctx.createLinearGradient(0, 0, size.w, size.h);
      grad.addColorStop(0, colors.from);
      grad.addColorStop(1, colors.to);
      ctx.fillStyle = grad;
      ctx.beginPath();
      for (const d of dots) {
        ctx.moveTo(d.ax + rad, d.ay);
        ctx.arc(d.ax, d.ay, rad, 0, TWO_PI);
      }
      ctx.fill();
    }

    function onMouseMove(e: MouseEvent) {
      mouse.x = e.pageX - size.offsetX;
      mouse.y = e.pageY - size.offsetY;
    }

    const speedTimer = window.setInterval(() => {
      const dx = mouse.prevX - mouse.x;
      const dy = mouse.prevY - mouse.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      mouse.speed += (dist - mouse.speed) * 0.5;
      if (mouse.speed < 0.001) mouse.speed = 0;
      mouse.prevX = mouse.x;
      mouse.prevY = mouse.y;
    }, 20);

    function tick() {
      const p = propsRef.current;
      const target = Math.min(mouse.speed / 5, 1);
      engagement += (target - engagement) * 0.06;
      if (engagement < 0.001) engagement = 0;
      const eng = engagement;

      // Soft glow tracks the cursor and fades in with engagement.
      glowAlpha += (eng - glowAlpha) * 0.08;
      if (glowEl) {
        glowEl.setAttribute('cx', String(mouse.x));
        glowEl.setAttribute('cy', String(mouse.y));
        glowEl.style.opacity = String(glowAlpha);
      }

      ctx.clearRect(0, 0, size.w, size.h);
      const grad = ctx.createLinearGradient(0, 0, size.w, size.h);
      grad.addColorStop(0, colors.from);
      grad.addColorStop(1, colors.to);
      ctx.fillStyle = grad;

      const cr = p.cursorRadius;
      const crSq = cr * cr;
      const rad = p.dotRadius / 2;

      ctx.beginPath();
      for (const d of dots) {
        const dx = mouse.x - d.ax;
        const dy = mouse.y - d.ay;
        const distSq = dx * dx + dy * dy;
        if (distSq < crSq && eng > 0.01) {
          const dist = Math.sqrt(distSq);
          const t = 1 - dist / cr;
          const push = t * t * p.bulgeStrength * eng;
          const angle = Math.atan2(dy, dx);
          d.sx += (d.ax - Math.cos(angle) * push - d.sx) * 0.15;
          d.sy += (d.ay - Math.sin(angle) * push - d.sy) * 0.15;
        } else {
          d.sx += (d.ax - d.sx) * 0.1;
          d.sy += (d.ay - d.sy) * 0.1;
        }
        ctx.moveTo(d.sx + rad, d.sy);
        ctx.arc(d.sx, d.sy, rad, 0, TWO_PI);
      }
      ctx.fill();
      raf = window.requestAnimationFrame(tick);
    }

    function start() {
      if (raf || reduced) return;
      raf = window.requestAnimationFrame(tick);
    }
    function stop() {
      if (!raf) return;
      window.cancelAnimationFrame(raf);
      raf = 0;
    }
    function onVisibility() {
      if (document.hidden) stop();
      else start();
    }

    const resizeObserver = new ResizeObserver(() => {
      doResize();
      if (reduced) paintStatic();
    });
    const themeObserver = new MutationObserver(() => {
      refreshColors();
      if (reduced) paintStatic();
    });

    /** (Re)wire the animation vs. static mode for the current motion preference. */
    function applyMotionMode() {
      if (reduced) {
        stop();
        window.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('visibilitychange', onVisibility);
        if (glowEl) glowEl.style.opacity = '0';
        paintStatic();
      } else {
        window.addEventListener('mousemove', onMouseMove, { passive: true });
        document.addEventListener('visibilitychange', onVisibility);
        start();
      }
    }
    function onMotionChange(e: MediaQueryListEvent) {
      reduced = e.matches;
      applyMotionMode();
    }

    refreshColors();
    doResize();
    const parent = cv.parentElement;
    if (parent) resizeObserver.observe(parent);
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    motionQuery.addEventListener('change', onMotionChange);
    applyMotionMode();

    return () => {
      stop();
      window.clearInterval(speedTimer);
      resizeObserver.disconnect();
      themeObserver.disconnect();
      motionQuery.removeEventListener('change', onMotionChange);
      window.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [glowId]);

  return (
    <>
      <canvas
        ref={canvasRef}
        className={className}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block' }}
      />
      <svg
        aria-hidden="true"
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
      >
        <defs>
          <radialGradient id={glowId}>
            <stop id={`${glowId}-stop`} offset="0%" stopColor="transparent" />
            <stop offset="100%" stopColor="transparent" />
          </radialGradient>
        </defs>
        <circle
          ref={glowRef}
          cx={-9999}
          cy={-9999}
          r={glowRadius}
          fill={`url(#${glowId})`}
          style={{ opacity: 0, willChange: 'opacity' }}
        />
      </svg>
    </>
  );
});
