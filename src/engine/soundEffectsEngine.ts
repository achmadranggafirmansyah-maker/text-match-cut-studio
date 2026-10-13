import type { SoundStyle } from '../state/projectState';

/**
 * Membangun satu buffer efek suara berdasarkan tipe & style.
 * Semua sintesis — tidak butuh file audio.
 */
export function buildSfxBuffer(
  audioCtx: BaseAudioContext,
  kind: 'whoosh' | 'snap' | 'pop' | 'riser' | 'accent',
  style: SoundStyle,
): AudioBuffer {
  const durMap: Record<string, number> = {
    whoosh: 0.22,
    snap: 0.09,
    pop: 0.06,
    riser: 0.35,
    accent: 0.45,
  };
  const dur = durMap[kind] ?? 0.15;
  const sr = audioCtx.sampleRate;
  const len = Math.floor(dur * sr);
  const buf = audioCtx.createBuffer(1, len, sr);
  const data = buf.getChannelData(0);

  // style → karakter
  const styleBias = {
    minimal: { amp: 0.55, bright: 0.6 },
    punchy: { amp: 1.0, bright: 1.0 },
    cinematic: { amp: 0.85, bright: 0.4 },
    editorial: { amp: 0.75, bright: 0.8 },
  }[style];

  if (kind === 'whoosh') {
    // filtered noise sweep
    for (let i = 0; i < len; i++) {
      const t = i / len;
      const env = Math.pow(1 - t, 2);
      const noise = Math.random() * 2 - 1;
      const tone = Math.sin(2 * Math.PI * (900 - 600 * t) * (i / sr));
      data[i] = (noise * 0.7 + tone * 0.3) * env * 0.55 * styleBias.amp;
    }
  } else if (kind === 'snap') {
    for (let i = 0; i < len; i++) {
      const t = i / len;
      const env = Math.exp(-t * 40);
      const noise = Math.random() * 2 - 1;
      data[i] = noise * env * 0.8 * styleBias.amp;
    }
  } else if (kind === 'pop') {
    for (let i = 0; i < len; i++) {
      const t = i / len;
      const env = Math.exp(-t * 30);
      const tone = Math.sin(2 * Math.PI * 1200 * (i / sr));
      data[i] = tone * env * 0.5 * styleBias.amp;
    }
  } else if (kind === 'riser') {
    for (let i = 0; i < len; i++) {
      const t = i / len;
      const env = Math.pow(t, 1.5) * Math.pow(1 - t, 0.6);
      const f = 300 + 1400 * t;
      const tone = Math.sin(2 * Math.PI * f * (i / sr));
      const noise = (Math.random() * 2 - 1) * 0.3;
      data[i] = (tone + noise) * env * 0.5 * styleBias.amp;
    }
  } else {
    // accent — low impact
    for (let i = 0; i < len; i++) {
      const t = i / len;
      const env = Math.exp(-t * 8) * (1 - Math.pow(1 - t, 3));
      const tone = Math.sin(2 * Math.PI * 90 * (i / sr));
      data[i] = tone * env * 0.6 * styleBias.amp;
    }
  }
  return buf;
}
