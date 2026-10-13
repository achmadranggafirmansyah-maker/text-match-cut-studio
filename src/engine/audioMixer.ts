import type { ProjectState } from '../state/projectState';
import type { Timeline } from './matchCutTimeline';
import { buildSfxBuffer } from './soundEffectsEngine';

export interface AudioEvent {
  timeMs: number;
  kind: 'whoosh' | 'snap' | 'pop' | 'riser' | 'accent';
}

/**
 * Susun daftar event audio yang tersinkronisasi dengan timeline animasi.
 * Tidak bermain audio — hanya menjadwalkan.
 */
export function scheduleAudioEvents(
  timeline: Timeline,
  state: ProjectState,
): AudioEvent[] {
  if (!state.soundEnabled) return [];

  const events: AudioEvent[] = [];
  const densityStep = { sparse: 3, balanced: 2, energetic: 1 }[state.soundDensity];

  timeline.segments.forEach((seg, idx) => {
    // impact perpindahan headline (setiap transisi)
    events.push({ timeMs: seg.startMs, kind: 'snap' });
    // whoosh hanya jika tidak sparse
    if (densityStep <= 2) {
      events.push({ timeMs: seg.startMs + 10, kind: 'whoosh' });
    }
    // pop untuk highlight (jika aktif)
    if (state.highlightOn && idx % densityStep === 0) {
      events.push({ timeMs: seg.startMs + 50, kind: 'pop' });
    }
    // riser sesekali
    if (state.soundDensity === 'energetic' && idx % 2 === 1) {
      events.push({ timeMs: Math.max(0, seg.startMs - 120), kind: 'riser' });
    }
  });

  // accent di segmen terakhir
  if (timeline.segments.length > 0) {
    const last = timeline.segments[timeline.segments.length - 1];
    events.push({ timeMs: last.startMs, kind: 'accent' });
  }

  return events.sort((a, b) => a.timeMs - b.timeMs);
}

/**
 * Render seluruh audio ke OfflineAudioContext lalu return AudioBuffer.
 * Cocok untuk preview (pakai AudioContext live) maupun untuk ekspor (offline).
 */
export async function renderAudioToBuffer(
  ctx: BaseAudioContext,
  timeline: Timeline,
  state: ProjectState,
): Promise<AudioBuffer | null> {
  const events = scheduleAudioEvents(timeline, state);
  if (events.length === 0) return null;

  const durationSec = timeline.durationMs / 1000;
  const sampleRate = ctx.sampleRate;
  const outLen = Math.ceil(durationSec * sampleRate);

  // Untuk offline rendering, kita gunakan OfflineAudioContext.
  // Jika ctx adalah OfflineAudioContext, kita langsung pakai ctx tsb.
  let offline: OfflineAudioContext;
  if (ctx instanceof OfflineAudioContext) {
    offline = ctx;
  } else {
    offline = new OfflineAudioContext(2, outLen, sampleRate);
  }

  const master = offline.createGain();
  master.gain.value = state.soundVolume;
  master.connect(offline.destination);

  for (const ev of events) {
    const buf = buildSfxBuffer(offline, ev.kind, state.soundStyle);
    const src = offline.createBufferSource();
    src.buffer = buf;
    const g = offline.createGain();
    g.gain.value = 1;
    src.connect(g).connect(master);
    src.start(ev.timeMs / 1000);
  }

  if (ctx instanceof OfflineAudioContext) {
    return offline.startRendering();
  }

  // Live context: capture via MediaStreamDestination untuk preview.
  // Kalau hanya butuh buffer untuk ekspor, gunakan OfflineAudioContext
  // yang baru seperti di atas.
  const live = new OfflineAudioContext(2, outLen, sampleRate);
  const liveMaster = live.createGain();
  liveMaster.gain.value = state.soundVolume;
  liveMaster.connect(live.destination);
  for (const ev of events) {
    const buf = buildSfxBuffer(live, ev.kind, state.soundStyle);
    const src = live.createBufferSource();
    src.buffer = buf;
    src.connect(liveMaster);
    src.start(ev.timeMs / 1000);
  }
  return live.startRendering();
}
