/**
 * Renderer utama per-frame.
 * Menggabungkan:
 *   - Background koran procedural (bergantung pada tema headline)
 *   - Headline besar (auto-wrap, auto-fit)
 *   - Highlight kuning (opsional)
 *   - Chromatic aberration (opsional)
 *   - Animasi zoom & offset per segmen
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
// Background cache
// Cache di-key dengan SEMUA parameter yang memengaruhi hasil background,
// termasuk hash dari headline (karena tema background mengikuti headline).
// ---------------------------------------------------------------------------
let _bgCache: HTMLCanvasElement | null = null;
let _bgCacheKey = '';

function hashString(s: string): string {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) | 0;
  }
  return h.toString(36);
}

function getBackgroundCanvas(
  state: ProjectState,
  w: number,
  h: number,
): HTMLCanvasElement {
  const key = [
    w,
    h,
    state.backgroundStyle,
    state.blurDirection,
    state.blurIntensity,
    state.backgroundType,
    hashString(state.text), // ⬅️ INI YANG BARU: background ikut tema headline
  ].join('|');

  if (_bgCache && _bgCacheKey === key) return _bgCache;

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
    headlineText: state.text, // ⬅️ INI YANG BARU
  });

  _bgCache = c;
  _bgCacheKey = key;
  return c;
}

/** Paksa invalidate cache (dipanggil sebelum ekspor, misal). */
export function invalidateBackgroundCache() {
  _bgCache = null;
  _bgCacheKey = '';
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

// ---------------------------------------------------------------------------
// Font stack utama
// ---------------------------------------------------------------------------
const FONT_STACK =
  'Impact, "Arial Black", "Helvetica Neue", "Segoe UI", sans-serif';

// ---------------------------------------------------------------------------
// RENDER SATU FRAME
// ---------------------------------------------------------------------------
export function renderFrame(rc: RenderContext, timeMs: number) {
  const { ctx, width, height, state, timeline } = rc;

  ctx.save();
  ctx.clearRect(0, 0, width, height);

  // ---- 1. Background ----
  const bg = getBackgroundCanvas(state, width, height);
  if (state.backgroundType === 'dynamic') {
    // Dynamic: background ikut zoom & geser pelan mengikuti progress segmen
    const seg = findSegmentAt(timeline, timeMs);
    const p = seg ? progress(seg, timeMs) : 0;
    const scale = 1.05 + 0.05 * p;
    const dx = (1 - scale) * width * 0.5;
    const dy = (1 - scale) * height * 0.5;
    ctx.drawImage(bg, dx, dy, width * scale, height * scale);
  } else {
    // Static: gambar apa adanya
    ctx.drawImage(bg, 0, 0);
  }

  // ---- 2. Ambil segmen aktif ----
  const seg = findSegmentAt(timeline, timeMs);
  if (!seg) {
    ctx.restore();
    return;
  }
  const p = progress(seg, timeMs);

  // ---- 3. Interpolasi zoom & offset ----
  const zoom = seg.zoomFrom + (seg.zoomTo - seg.zoomFrom) * p;
  const ox = seg.offsetXFrom + (seg.offsetXTo - seg.offsetXFrom) * p;
  const oy = seg.offsetYFrom + (seg.offsetYTo - seg.offsetYFrom) * p;

  const finalZoom = zoom * state.textScale;

  // Transformasi ke titik tengah kanvas + offset
  ctx.translate(
    width / 2 + state.textX * width * 0.4 + ox * width,
    height / 2 + state.textY * height * 0.4 + oy * height,
  );
  ctx.scale(finalZoom, finalZoom);

  // ---- 4. Gambar headline ----
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
  // Area teks = 82% lebar kanvas (biar terasa close-up)
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

    // ---- Highlight kuning (opsional) ----
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

    // ---- Chromatic aberration (opsional) ----
    if (state.chromaticAberration) {
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      ctx.fillStyle = 'rgba(255,0,60,0.55)';
      ctx.fillText(line.text, lineX - 2, lineY);
      ctx.fillStyle = 'rgba(0,180,255,0.55)';
      ctx.fillText(line.text, lineX + 2, lineY);
      ctx.restore();
    }

    // ---- Teks utama ----
    ctx.fillStyle = '#0a0a0a';
    ctx.fillText(line.text, lineX, lineY);
  }
}
