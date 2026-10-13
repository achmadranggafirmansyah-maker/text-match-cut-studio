/**
 * Menggambar background surat kabar secara prosedural ke canvas.
 * Menghasilkan kesan kertas ivory + kolom artikel + teks kecil yang blur.
 */

export interface NewsBgOptions {
  width: number;
  height: number;
  blurDirection: 'vertical' | 'radial';
  blurIntensity: 'low' | 'medium' | 'high';
  style: 'simple' | 'newspaper';
  seed?: number;
}

// Filler teks artikel — tidak butuh API eksternal.
const FILLER_WORDS = [
  'ekonomi','investasi','keuangan','pasar','analisis','strategi','modal','pertumbuhan',
  'peluang','risiko','kolaborasi','industri','teknologi','data','laporan','proyeksi',
  'kebijakan','regulasi','publik','dampak','konsumen','efisiensi','inovasi','transformasi',
];

function mulberry32(seed: number) {
  return function () {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pseudoSentence(rand: () => number, wordCount: number): string {
  const out: string[] = [];
  for (let i = 0; i < wordCount; i++) {
    out.push(FILLER_WORDS[Math.floor(rand() * FILLER_WORDS.length)]);
  }
  out[0] = out[0][0].toUpperCase() + out[0].slice(1);
  return out.join(' ') + '.';
}

/**
 * Render ke canvas target. Skala ctx disesuaikan dengan width/height.
 */
export function drawNewspaperBackground(
  ctx: CanvasRenderingContext2D,
  opts: NewsBgOptions,
) {
  const { width, height, style } = opts;
  const rand = mulberry32(opts.seed ?? 1337);

  // 1. Kertas ivory
  ctx.save();
  ctx.fillStyle = style === 'simple' ? '#fafafa' : '#f4efe4';
  ctx.fillRect(0, 0, width, height);

  if (style === 'simple') { ctx.restore(); return; }

  // 2. Grain
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

  // 3. Kolom artikel
  const columns = 3;
  const marginX = width * 0.06;
  const colGap = width * 0.015;
  const colW = (width - marginX * 2 - colGap * (columns - 1)) / columns;
  const topY = height * 0.05;
  const bottomY = height * 0.95;

  ctx.fillStyle = '#1c1c1c';
  ctx.textBaseline = 'top';

  for (let c = 0; c < columns; c++) {
    const x = marginX + c * (colW + colGap);
    let y = topY;

    // Header kecil
    ctx.font = `italic 500 ${Math.max(10, width * 0.008)}px Georgia, serif`;
    ctx.fillStyle = '#666';
    ctx.fillText(`Sesuatu / Here / Home`, x, y);
    y += width * 0.018;

    // Judul
    ctx.fillStyle = '#111';
    ctx.font = `800 ${Math.max(14, width * 0.014)}px Georgia, "Times New Roman", serif`;
    ctx.fillText(pseudoSentence(rand, 3).slice(0, 28), x, y);
    y += width * 0.024;

    // Body paragraph
    ctx.font = `400 ${Math.max(9, width * 0.009)}px Georgia, serif`;
    ctx.fillStyle = '#333';
    const lineH = width * 0.013;

    while (y < bottomY) {
      const sentence = pseudoSentence(rand, 6 + Math.floor(rand() * 5));
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
      y += lineH * 0.4;
    }
  }

  // 4. Divider kolom (tipis)
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

  // 5. Blur (pakai ctx.filter — didukung Chrome/Firefox/Safari modern)
  applyBlur(ctx, opts);
}

function applyBlur(ctx: CanvasRenderingContext2D, opts: NewsBgOptions) {
  const { width, height, blurDirection, blurIntensity } = opts;
  const intensityMap = { low: 2, medium: 5, high: 9 };
  const px = intensityMap[blurIntensity];

  // Simulasi blur dengan overlay semi-transparan berlapis.
  // (ctx.filter tidak bisa selective-direction, jadi kita pakai trik
  //  menggambar ulang area dengan alpha — efek cukup dekat.)
  if (blurDirection === 'vertical') {
    // coret horizontal dengan alpha ivory → kesan vertical blur
    ctx.save();
    ctx.globalAlpha = 0.28 + px * 0.02;
    ctx.fillStyle = '#f4efe4';
    for (let y = 0; y < height; y += 6) {
      ctx.fillRect(0, y, width, 1.2);
    }
    ctx.restore();
  } else {
    // radial — gradasi transparan terang di tengah
    ctx.save();
    const cx = width / 2;
    const cy = height / 2;
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(width, height) * 0.6);
    g.addColorStop(0, `rgba(244,239,228,${0.05 + px * 0.01})`);
    g.addColorStop(0.6, `rgba(244,239,228,${0.22 + px * 0.02})`);
    g.addColorStop(1, `rgba(244,239,228,${0.5 + px * 0.03})`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
  }
}
