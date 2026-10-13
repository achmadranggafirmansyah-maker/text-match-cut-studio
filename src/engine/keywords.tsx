/**
 * Ekstraksi kata kunci dari teks user untuk membangun tema background.
 * Tidak ada API — murni heuristik lokal.
 */

const STOPWORDS = new Set([
  // Indonesia
  'yang','dan','di','ke','dari','untuk','dengan','pada','adalah','ini','itu',
  'atau','juga','akan','telah','tidak','bisa','dapat','oleh','sebagai','dalam',
  'saat','agar','karena','serta','para','bagi','tapi','namun','saja','lebih',
  'sudah','masih','oleh','sebuah','suatu','hal','jadi','sama','punya','mau',
  'kamu','saya','aku','dia','kita','kami','mereka','anda',
  // English
  'the','a','an','of','to','and','in','on','for','with','is','are','was',
  'were','be','been','being','this','that','these','those','it','its','as',
  'at','by','from','or','but','if','then','so','than','too','very','can',
  'will','would','should','could','may','might','must','have','has','had',
]);

/**
 * Ambil kata kunci dari satu atau banyak segmen teks.
 * Mengembalikan 15 kata teratas berdasarkan frekuensi + panjang.
 */
export function extractKeywords(texts: string[], maxKeywords = 15): string[] {
  const freq = new Map<string, number>();

  for (const raw of texts) {
    const words = raw
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 3 && !STOPWORDS.has(w));

    for (const w of words) {
      freq.set(w, (freq.get(w) ?? 0) + 1);
    }
  }

  // Skor = frekuensi * bonus panjang (kata panjang biasanya lebih "berisi")
  const scored = [...freq.entries()].map(([w, f]) => ({
    w,
    score: f * (1 + w.length / 10),
  }));
  scored.sort((a, b) => b.score - a.score);

  const keywords = scored.slice(0, maxKeywords).map((s) => s.w);

  // Fallback bila teks hanya berisi stopword / sangat pendek
  if (keywords.length === 0) {
    return ['analisis', 'strategi', 'pendekatan', 'wawasan', 'kajian'];
  }
  return keywords;
}

/**
 * Pecah topik jadi "phrase" 1-2 kata untuk variasi kalimat.
 */
export function buildThemePhrases(keywords: string[]): string[] {
  const phrases: string[] = [];
  for (let i = 0; i < keywords.length; i++) {
    phrases.push(keywords[i]);
    if (i + 1 < keywords.length && i % 2 === 0) {
      phrases.push(`${keywords[i]} ${keywords[i + 1]}`);
    }
  }
  return phrases;
}
