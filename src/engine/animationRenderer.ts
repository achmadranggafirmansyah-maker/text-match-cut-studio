/**
 * Renderer utama per-frame.
 *
 * Mendukung 2 mode tema background:
 *  - 'global'      : satu background dari SELURUH headline (Level A)
 *  - 'perSegment'  : background di-generate per SEGMEN, di-crossfade antar segmen (Level B)
 */

import type { ProjectState } from '../state/projectState';
import { drawNewspaperBackground } from './newspaperBackground';
import { wrapHeadline } from './textLayout';
import { findSegmentAt, type Timeline, type Segment } from './matchCutTimeline';

export interface RenderContext {
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  state: ProjectState;
  timeline: Timeline;
}

// ---------------------------------------------------------------------------
// Cache — pakai Map agar bisa menampung banyak background (per-segmen).
// Batasi jumlah cache untuk mencegah memory leak.
// ---------------------------------------------------------------------------
const bgCache = new Map<string, HTMLCanvasElement>();
const MAX_CACHE = 24;

function hashString(s: string): string {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) | 0;
  }
  return h.toString(36);
}

function cacheKey(
  state: ProjectState,
  w: number,
  h: number,
  themeText: string,
): string {
  return [
    w, h,
    state.backgroundStyle,
    state.blurDirection,
    state.blurIntensity,
    state.backgroundType,
    hashString(themeText),
  ].join('|');
}

function getOrCreateBg(
  state: ProjectState,
  w: number,
  h: number,
  themeText: string,
): HTMLCanvasElement {
  const key = cacheKey(state, w, h, themeText);
  const hit = bgCache.get(key);
  if (hit) return hit;

  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const cx = c.getContext('2d')!;
  drawNewspaperBackground(cx, {
    width: w,
    height: h,
    style: state.backgroundStyle,
    blurDirection: state.blurDirection,
    blurIntensity: state.blurIntensity,
    headlineText: themeText,
  });

  bgCache.set(key, c);

  // LRU sederhana: hapus yang paling lama
  if (bgCache.size > MAX_CACHE) {
    const firstKey = bgCache.keys().next().value;
    if (firstKey !== undefined) bgCache.delete(firstKey);
  }
  return c;
}

/** Paksa invalidate cache (dipanggil sebelum ekspor). */
export function invalidateBackgroundCache() {
  bgCache.clear();
}

// ---------------------------------------------------------------------------
// Easing
// ---------------------------------------------------------------------------
function easeOutQuad(t: number): number {
  const c = Math.min(1, Math.max(0, t));
  return 1 - (1 - c) * (1 - c);
}

function progress(seg: Segment, timeMs: number): number {
  const t = (timeMs - seg.startMs) / Math.max(1, seg.endMs - seg.startMs);
  return easeOutQuad(t);
}

const FONT_STACK =
  'Impact, "Arial Black", "Helvetica Neue", "Segoe UI", sans-serif';

// ---------------------------------------------------------------------------
// Background layer (dengan dukungan crossfade per-segmen)
// ---------------------------------------------------------------------------
function drawBackgroundLayer(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  state: ProjectState,
  timeline: Timeline,
  seg: Segment | null,
  timeMs: number,
) {
  const isDynamic = state.backgroundType === 'dynamic';

  // Zoom/pan untuk mode "dynamic"
  let bgScale = 1;
  let bgDx = 0;
  let bgDy = 0;
  if (isDynamic && seg) {
    const p = progress(seg, timeMs);
    bgScale = 1.05 + 0.05 * p;
    bgDx = (1 - bgScale) * W * 0.5;
    bgDy = (1 - bgScale) * H * 0.5;
  }

  const drawOne = (bg: HTMLCanvasElement, alpha: number) => {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.drawImage(bg, bgDx, bgDy, W * bgScale, H * bgScale);
    ctx.restore();
  };

  // ---------- Mode per-segment ----------
  if (state.backgroundThemeMode === 'perSegment' && seg) {
    const curBg = getOrCreateBg(state, W, H, seg.text);

    const segIdx = timeline.segments.indexOf(seg);
    const nextSeg = timeline.segments[segIdx + 1];

    // Durasi crossfade efektif: tidak boleh lebih dari setengah durasi segmen
    const segDuration = seg.endMs - seg.startMs;
    const effectiveFade = Math.min(
      state.backgroundCrossfadeMs,
      segDuration * 0.5,
    );

    if (nextSeg && effectiveFade > 0) {
      const fadeStart = seg.endMs - effectiveFade;
      if (timeMs >= fadeStart) {
        const alpha = Math.min(
          1,
          Math.max(0, (timeMs - fadeStart) / effectiveFade),
        );
        const nextBg = getOrCreateBg(state, W, H, nextSeg.text);
        drawOne(curBg, 1);
        drawOne(nextBg, alpha);
        return;
      }
    }
    drawOne(curBg, 1);
    return;
  }

  // ---------- Mode global ----------
  const globalBg = getOrCreateBg(state, W, H, state.text);
  drawOne(globalBg, 1);
}

// ---------------------------------------------------------------------------
// RENDER SATU FRAME
// ---------------------------------------------------------------------------
export function renderFrame(rc: RenderContext, timeMs: number) {
  const { ctx, width, height, state, timeline } = rc;

  ctx.save();
  ctx.clearRect(0, 0, width, height);

  // 1. Background (dengan tema mode)
  const seg = findSegmentAt(timeline, timeMs);
  drawBackgroundLayer(ctx, width, height, state, timeline, seg, timeMs);

  // 2. Headline
  if (!seg) { ctx.restore(); return; }
  const p = progress(seg, timeMs);

  const zoom = seg.zoomFrom + (seg.zoomTo - seg.zoomFrom) * p;
  const ox = seg.offsetXFrom + (seg.offsetXTo - seg.offsetXFrom) * p;
  const oy = seg.offsetYFrom + (seg.offsetYTo - seg.offsetYFrom) * p;

  const finalZoom = zoom * state.textScale;

  ctx.translate(
    width / 2 + state.textX * width * 0.4 + ox * width,
    height / 2 + state.textY * height * 0.4 + oy * height,
  );
  ctx.scale(finalZoom, finalZoom);

  drawHeadline(ctx, seg, width, height, state);

  ctx.restore();
}

// ---------------------------------------------------------------------------
// HEADLINE
// ---------------------------------------------------------------------------
function drawHeadline(
  ctx: CanvasRenderingContext2D,
  seg: Segment,
  W: number,
  H: number,
  state: ProjectState,
) {
  const maxW = W * 0.82;
  const layout = wrapHeadline(
    ctx,
    seg.text.toUpperCase(),
    maxW,
    W * 0.14,
    900,
    FONT_STACK,
  );

  const totalH = layout.totalHeight;
  const startY = -totalH / 2;

  ctx.textBaseline = 'top';
  ctx.textAlign = 'left';
  ctx.font = `900 ${layout.fontSize}px ${FONT_STACK}`;

  for (let i = 0; i < layout.lines.length; i++) {
    const line = layout.lines[i];
    const lineX = -line.width / 2;
    const lineY = startY + i * layout.lineHeight;

    if (state.highlightOn) {
      const padX = layout.fontSize * 0.05;
      const padY = layout.fontSize * 0.04;
      ctx.fillStyle = state.highlightColor;
      ctx.fillRect(
        lineX - padX,
        lineY + padY,
        line.width + padX * 2,
        layout.fontSize + padY,
      );
    }

    if (state.chromaticAberration) {
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      ctx.fillStyle = 'rgba(255,0,60,0.55)';
      ctx.fillText(line.text, lineX - 2, lineY);
      ctx.fillStyle = 'rgba(0,180,255,0.55)';
      ctx.fillText(line.text, lineX + 2, lineY);
      ctx.restore();
    }

    ctx.fillStyle = '#0a0a0a';
    ctx.fillText(line.text, lineX, lineY);
  }
}
