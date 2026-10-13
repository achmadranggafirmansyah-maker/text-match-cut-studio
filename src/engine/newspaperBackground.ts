/**
 * Menggambar background surat kabar secara prosedural ke canvas.
 * Menghasilkan kesan kertas ivory + kolom artikel + teks kecil yang blur.
 *
 * FITUR BARU: teks artikel latar belakang mengikuti TEMA headline user.
 * Contoh: headline "Rumus 3 Langkah Kaya" → background otomatis berisi
 * kata "keuangan", "langkah", "finansial", dst.
 */

import { extractKeywords, buildThemePhrases } from './keywords';

export interface NewsBgOptions {
  width: number;
  height: number;
  blurDirection: 'vertical' | 'radial';
  blurIntensity: 'low' | 'medium' | 'high';
  style: 'simple' | 'newspaper';
  /** Teks headline — dipakai untuk mengekstrak tema background */
  headlineText?: string;
  seed?: number;
}

// ---------------------------------------------------------------------------
// TEMPLATE ARTIKEL — slot {K} diisi oleh phrase hasil ekstraksi keyword.
// ---------------------------------------------------------------------------
const SENTENCE_TEMPLATES = [
  'Artikel ini mengulas secara mendalam mengenai {K} sebagai pendekatan efektif dalam mencapai hasil yang diharapkan.',
  'Pemahaman dasar terhadap {K} memberi wawasan penting bagi pembaca dalam menyusun langkah berikutnya.',
  'Melalui kajian {K}, berbagai peluang dan tantangan dapat dipetakan dengan lebih jernih.',
  'Pendekatan {K} menjadi sorotan utama dalam diskusi terbaru mengenai arah perubahan.',
  'Konsep {K} dijelaskan dengan gamblang untuk membantu pembaca memahami konteks yang lebih luas.',
  'Implementasi {K} membutuhkan konsistensi, evaluasi berkala, dan penyesuaian terhadap kondisi di lapangan.',
  'Sejumlah praktisi menyoroti pentingnya {K} sebagai fondasi pengambilan keputusan.',
  'Dalam kerangka {K}, setiap langkah perlu dipertimbangkan dengan cermat agar hasilnya optimal.',
  'Perkembangan terkini menunjukkan bahwa {K} memainkan peran kunci dalam dinamika yang sedang berlangsung.',
  'Rangkuman singkat mengenai {K} diharapkan dapat menjadi titik awal penelusuran lebih lanjut.',
];

const TITLE_TEMPLATES = [
  'Strategi {K} dalam Praktik',
  'Meninjau Ulang {K}',
  'Evolusi dan Arah {K}',
  '{K}: Peluang dan Tantangan',
  'Catatan Penting tentang {K}',
  'Memahami {K} Secara Utuh',
];

// ---------------------------------------------------------------------------
// UTIL
// ---------------------------------------------------------------------------
function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(rand: () => number, arr: T[]): T {
  return arr[Math.floor(rand() * arr.length)];
}

function fillTemplate(tpl: string, phrase: string): string {
  return tpl.replace('{K}', phrase);
}

function themedTitle(rand: () => number, phrases: string[]): string {
  return fillTemplate(pick(rand, TITLE_TEMPLATES), pick(rand, phrases));
}

function themedSentence(
  rand: () => number,
  phrases: string[],
  extraWords: number,
): string {
  const tpl = pick(rand, SENTENCE_TEMPLATES);
  const phrase = pick(rand, phrases);
  const core = fillTemplate(tpl, phrase);

  // Tambahkan beberapa "isi" dari phrase pool agar kalimat terasa lebih padat
  const extras: string[] = [];
  for (let i = 0; i < extraWords; i++) {
    extras.push(pick(rand, phrases));
  }
  const tail = extras.length ? ' ' + extras.join(', ') + '.' : '';
  return (core + tail).replace(/\.\./g, '.');
}

// ---------------------------------------------------------------------------
// MAIN DRAW
// ---------------------------------------------------------------------------
export function drawNewspaperBackground(
  ctx: CanvasRenderingContext2D,
  opts: NewsBgOptions,
) {
  const { width, height, style, headlineText } = opts;
  const rand = mulberry32(opts.seed ?? 1337);

  // ---- 0. Bangun theme phrases dari headline user ----
  const keywords = extractKeywords(headlineText ? [headlineText] : [], 12);
  const phrases = buildThemePhrases(keywords);

  // ---- 1. Kertas ivory ----
  ctx.save();
  ctx.fillStyle = style === 'simple' ? '#fafafa' : '#f4efe4';
  ctx.fillRect(0, 0, width, height);

  if (style === 'simple') {
    ctx.restore();
    return;
  }

  // ---- 2. Grain (tekstur kertas halus) ----
  const grainSize = 240;
  const grain = ctx.createImageData(grainSize, grainSize);
  for (let i = 0; i < grain.data.length; i += 4) {
    const v = 200 + Math.floor(rand() * 40);
    grain.data[i] = v;
    grain.data[i + 1] = v - 5;
    grain.data[i + 2] = v - 15;
    grain.data[i + 3] = 18; // sangat halus
  }
  ctx.globalAlpha = 0.35;
  for (let x = 0; x < width; x += grainSize) {
    for (let y = 0; y < height; y += grainSize) {
      ctx.putImageData(grain, x, y);
    }
  }
  ctx.globalAlpha = 1;

  // ---- 3. Kolom artikel ----
  const columns = 3;
  const marginX = width * 0.06;
  const colGap = width * 0.015;
  const colW = (width - marginX * 2 - colGap * (columns - 1)) / columns;
  const topY = height * 0.05;
  const bottomY = height * 0.95;

  ctx.fillStyle = '#1c1c1c';
  ctx.textBaseline = 'top';
  ctx.textAlign = 'left';

  for (let c = 0; c < columns; c++) {
    const x = marginX + c * (colW + colGap);
    let y = topY;

    // Breadcrumb kecil
    ctx.font = `italic 500 ${Math.max(10, width * 0.008)}px Georgia, serif`;
    ctx.fillStyle = '#666';
    ctx.fillText('Sesuatu / Here / Home', x, y);
    y += width * 0.018;

    // Judul artikel — pakai tema
    ctx.fillStyle = '#111';
    ctx.font = `800 ${Math.max(14, width * 0.014)}px Georgia, "Times New Roman", serif`;
    const title = themedTitle(rand, phrases);
    // Judul bisa overflow → potong manual
    const maxTitleW = colW;
    let titleLine = '';
    for (const w of title.split(' ')) {
      const test = titleLine ? `${titleLine} ${w}` : w;
      if (ctx.measureText(test).width > maxTitleW && titleLine) {
        ctx.fillText(titleLine, x, y);
        y += width * 0.018;
        titleLine = w;
      } else {
        titleLine = test;
      }
    }
    if (titleLine) ctx.fillText(titleLine, x, y);
    y += width * 0.024;

    // Body paragraph — pakai tema
    ctx.font = `400 ${Math.max(9, width * 0.009)}px Georgia, serif`;
    ctx.fillStyle = '#333';
    const lineH = width * 0.013;

    while (y < bottomY) {
      const sentence = themedSentence(
        rand,
        phrases,
        3 + Math.floor(rand() * 4),
      );
      const words = sentence.split(' ');
      let line = '';
      for (const w of words) {
        const test = line ? `${line} ${w}` : w;
        if (ctx.measureText(test).width > colW) {
          ctx.fillText(line, x, y);
          y += lineH;
          if (y >= bottomY) break;
          line = w;
        } else {
          line = test;
        }
      }
      if (line && y < bottomY) {
        ctx.fillText(line, x, y);
        y += lineH;
      }
      y += lineH * 0.4; // jarak antar paragraf
    }
  }

  // ---- 4. Divider kolom (tipis) ----
  ctx.strokeStyle = 'rgba(0,0,0,0.08)';
  ctx.lineWidth = 1;
  for (let c = 1; c < columns; c++) {
    const x = marginX + c * (colW + colGap) - colGap / 2;
    ctx.beginPath();
    ctx.moveTo(x, topY);
    ctx.lineTo(x, bottomY);
    ctx.stroke();
  }

  ctx.restore();

  // ---- 5. Blur (simulasi) ----
  applyBlur(ctx, opts);
}

// ---------------------------------------------------------------------------
// BLUR — Canvas 2D tidak punya directional blur sejati, jadi kita simulasikan
// dengan overlay berlapis. Hasilnya cukup dekat dengan referensi storyboard.
// ---------------------------------------------------------------------------
function applyBlur(ctx: CanvasRenderingContext2D, opts: NewsBgOptions) {
  const { width, height, blurDirection, blurIntensity } = opts;
  const intensityMap = { low: 2, medium: 5, high: 9 };
  const px = intensityMap[blurIntensity];

  if (blurDirection === 'vertical') {
    // Coret horizontal semi-transparan → kesan vertical blur
    ctx.save();
    ctx.globalAlpha = 0.28 + px * 0.02;
    ctx.fillStyle = '#f4efe4';
    for (let y = 0; y < height; y += 6) {
      ctx.fillRect(0, y, width, 1.2);
    }
    ctx.restore();
  } else {
    // Radial — gradasi transparan terang di tengah
    ctx.save();
    const cx = width / 2;
    const cy = height / 2;
    const g = ctx.createRadialGradient(
      cx,
      cy,
      0,
      cx,
      cy,
      Math.max(width, height) * 0.6,
    );
    g.addColorStop(0, `rgba(244,239,228,${0.05 + px * 0.01})`);
    g.addColorStop(0.6, `rgba(244,239,228,${0.22 + px * 0.02})`);
    g.addColorStop(1, `rgba(244,239,228,${0.5 + px * 0.03})`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
  }
}
