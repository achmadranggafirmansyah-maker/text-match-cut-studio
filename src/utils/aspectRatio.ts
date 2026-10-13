import type { AspectRatio } from '../state/projectState';

export interface Resolution { width: number; height: number }

// Batasi max 1080 di sisi pendek agar aman untuk browser & FFmpeg.wasm.
export function getResolution(
  ratio: AspectRatio,
  customW: number,
  customH: number,
): Resolution {
  switch (ratio) {
    case '9:16': return { width: 1080, height: 1920 };
    case '16:9': return { width: 1920, height: 1080 };
    case '1:1':  return { width: 1080, height: 1080 };
    case '4:5':  return { width: 1080, height: 1350 };
    case '4:3':  return { width: 1440, height: 1080 };
    case 'custom': {
      const w = Math.max(240, Math.min(1920, Math.round(customW)));
      const h = Math.max(240, Math.min(1920, Math.round(customH)));
      // pastikan genap (encoder butuh dimensi genap)
      return { width: w - (w % 2), height: h - (h % 2) };
    }
  }
}
