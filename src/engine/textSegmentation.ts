import type { SegmentationMode } from '../state/projectState';

/**
 * Memecah teks menjadi segmen animasi.
 * Tidak ada batas kata. Baris kosong diabaikan.
 */
export function segmentText(text: string, mode: SegmentationMode): string[] {
  const cleaned = text.replace(/\r\n/g, '\n').trim();
  if (!cleaned) return [];

  if (mode === 'line') {
    return cleaned
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);
  }

  if (mode === 'sentence') {
    const parts = cleaned.replace(/\n/g, ' ').match(/[^.!?]+[.!?]*/g) || [];
    return parts.map((s) => s.trim()).filter(Boolean);
  }

  if (mode === 'phrase') {
    // pecah per 3 kata sebagai "phrase"
    const words = cleaned.replace(/\n/g, ' ').split(/\s+/).filter(Boolean);
    const phrases: string[] = [];
    for (let i = 0; i < words.length; i += 3) {
      phrases.push(words.slice(i, i + 3).join(' '));
    }
    return phrases;
  }

  // word
  return cleaned
    .replace(/\n/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}
