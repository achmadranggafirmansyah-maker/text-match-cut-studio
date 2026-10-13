import type { ProjectState } from '../state/projectState';
import { segmentText } from './textSegmentation';

export interface Segment {
  text: string;
  startMs: number;
  endMs: number;
  zoomFrom: number;
  zoomTo: number;
  offsetXFrom: number;
  offsetYFrom: number;
  offsetXTo: number;
  offsetYTo: number;
  transitionStyle: string;
  /** true = ini frame pertama, jadi ada aksen suara "impact" */
  isFirst: boolean;
}

export interface Timeline {
  segments: Segment[];
  durationMs: number;
  fps: number;
}

export function buildTimeline(state: ProjectState, fps = 60): Timeline {
  const texts = segmentText(state.text, state.segmentation);
  if (texts.length === 0) {
    return { segments: [], durationMs: 0, fps };
  }

  const durationMs = state.durationSec * 1000;
  const transitionMs = Math.max(30, state.transitionDurationMs);
  const holdMs = Math.max(0, state.holdDurationMs);
  const speed = Math.max(0.25, state.animationSpeed);

  // Bagi durasi: tiap segmen dapat (hold + transisi) / speed.
  // Segmen terakhir hold lebih lama supaya penonton bisa baca.
  const baseLen = (holdMs + transitionMs) / speed;
  const lastHoldBonus = (durationMs - baseLen * texts.length) / Math.max(1, texts.length);
  const segLen = Math.max(400, baseLen + lastHoldBonus);

  const segments: Segment[] = [];
  const styles = ['sharp-cut', 'fast-zoom', 'directional-slide', 'punch-in-out'] as const;
  const rand = mulberry32(4242);

  let t = 0;
  for (let i = 0; i < texts.length; i++) {
    const style =
      state.transitionStyle === 'alternating'
        ? styles[i % styles.length]
        : state.transitionStyle;

    const zoomBase = 1 + state.zoomIntensity * 0.4;
    const zoomFrom = i % 2 === 0 ? zoomBase : 1 / zoomBase;
    const zoomTo = i % 2 === 0 ? 1 : zoomBase;

    const m = state.movementIntensity * 0.15;
    const oxFrom = (rand() * 2 - 1) * m;
    const oyFrom = (rand() * 2 - 1) * m;
    const oxTo = -oxFrom;
    const oyTo = -oyFrom;

    const start = t;
    const end = Math.min(durationMs, t + segLen);
    segments.push({
      text: texts[i],
      startMs: start,
      endMs: end,
      zoomFrom,
      zoomTo,
      offsetXFrom: oxFrom,
      offsetYFrom: oyFrom,
      offsetXTo: oxTo,
      offsetYTo: oyTo,
      transitionStyle: style,
      isFirst: i === 0,
    });
    t = end;
    if (t >= durationMs) break;
  }

  // Perpanjang segmen terakhir jika masih ada sisa waktu
  if (segments.length > 0 && segments[segments.length - 1].endMs < durationMs) {
    segments[segments.length - 1].endMs = durationMs;
  }

  return { segments, durationMs, fps };
}

function mulberry32(seed: number) {
  return function () {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function findSegmentAt(timeline: Timeline, timeMs: number): Segment | null {
  for (const s of timeline.segments) {
    if (timeMs >= s.startMs && timeMs < s.endMs) return s;
  }
  return timeline.segments[timeline.segments.length - 1] ?? null;
}

/** Cari timestamp mulai setiap segmen (untuk scheduler audio). */
export function getTransitionTimes(timeline: Timeline): number[] {
  return timeline.segments.map((s) => s.startMs);
}
