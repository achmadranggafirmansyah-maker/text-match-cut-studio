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

let _bgCache: HTMLCanvasElement | null = null;
let _bgCacheKey = '';

function getBackgroundCanvas(state: ProjectState, w: number, h: number): HTMLCanvasElement {
  const key = `${w}x${h}-${state.backgroundStyle}-${state.blurDirection}-${state.blurIntensity}-${state.backgroundType}`;
  if (_bgCache && _bgCacheKey === key) return _bgCache;

  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const cx = c.getContext('2d')!;
  drawNewspaperBackground(cx, {
    width: w, height: h,
    style: state.backgroundStyle,
    blurDirection: state.blurDirection,
    blurIntensity: state.blurIntensity,
  });
  _bgCache = c;
  _bgCacheKey = key;
  return c;
}

export function invalidateBackgroundCache() {
  _bgCache = null;
  _bgCacheKey = '';
}

/**
 * Render satu frame pada waktu timeMs ke ctx.
 */
export function renderFrame(rc: RenderContext, timeMs: number) {
  const { ctx, width, height, state, timeline } = rc;

  ctx.save();
  ctx.clearRect(0, 0, width, height);

  // 1. Background
  const bg = getBackgroundCanvas(state, width, height);
  if (state.backgroundType === 'dynamic') {
    const seg = findSegmentAt(timeline, timeMs);
    const p = seg ? progress(seg, timeMs) : 0;
    const scale = 1.05 + 0.05 * p;
    const dx = (1 - scale) * width * 0.5;
    const dy = (1 - scale) * height * 0.5;
    ctx.drawImage(bg, dx, dy, width * scale, height * scale);
  } else {
    ctx.drawImage(bg, 0, 0);
  }

  // 2. Headline
  const seg = findSegmentAt(timeline, timeMs);
  if (!seg) { ctx.restore(); return; }
  const p = progress(seg, timeMs);

  // interpolasi zoom & offset
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

function progress(seg: Segment, timeMs: number) {
  const t = (timeMs - seg.startMs) / Math.max(1, seg.endMs - seg.startMs);
  // ease-out agar lebih punchy di awal
  return 1 - Math.pow(1 - Math.min(1, Math.max(0, t)), 2);
}

const FONT_STACK = 'Impact, "Arial Black", "Helvetica Neue", "Segoe UI", sans-serif';

function drawHeadline(
  ctx: CanvasRenderingContext2D,
  seg: Segment,
  W: number,
  H: number,
  state: ProjectState,
) {
  // Area teks = 80% lebar canvas, disesuaikan supaya tampak "close-up"
  const maxW = W * 0.82;
  const layout = wrapHeadline(ctx, seg.text.toUpperCase(), maxW, W * 0.14, 900, FONT_STACK);

  const totalH = layout.totalHeight;
  const startY = -totalH / 2;

  ctx.textBaseline = 'top';
  ctx.textAlign = 'left';
  ctx.font = `900 ${layout.fontSize}px ${FONT_STACK}`;

  for (let i = 0; i < layout.lines.length; i++) {
    const line = layout.lines[i];
    const lineX = -line.width / 2;
    const lineY = startY + i * layout.lineHeight;

    // highlight kuning (opsional)
    if (state.highlightOn) {
      const padX = layout.fontSize * 0.05;
      const padY = layout.fontSize * 0.04;
      ctx.fillStyle = state.highlightColor;
      ctx.fillRect(lineX - padX, lineY + padY, line.width + padX * 2, layout.fontSize + padY);
    }

    // chromatic aberration (opsional)
    if (state.chromaticAberration) {
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      ctx.fillStyle = 'rgba(255,0,60,0.55)';
      ctx.fillText(line.text, lineX - 2, lineY);
      ctx.fillStyle = 'rgba(0,180,255,0.55)';
      ctx.fillText(line.text, lineX + 2, lineY);
      ctx.restore();
    }

    // teks utama
    ctx.fillStyle = '#0a0a0a';
    ctx.fillText(line.text, lineX, lineY);
  }
}
