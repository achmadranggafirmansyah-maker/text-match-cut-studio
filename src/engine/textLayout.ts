export interface LayoutLine {
  text: string;
  width: number;
}

export interface LayoutResult {
  lines: LayoutLine[];
  fontSize: number;
  lineHeight: number;
  totalHeight: number;
  maxWidth: number;
}

/**
 * Auto-wrap teks headline ke lebar maksimum.
 * Mengembalikan baris hasil wrap + info ukuran.
 */
export function wrapHeadline(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  baseFontSize: number,
  fontWeight = 900,
  fontFamily = 'Impact, "Arial Black", "Helvetica Neue", sans-serif',
): LayoutResult {
  // Cari font size paling besar yang muat (auto-fit)
  let fontSize = baseFontSize;
  let lines: string[] = [];
  let lineHeight = 0;

  for (let attempt = 0; attempt < 30; attempt++) {
    ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
    lines = wrapToWidth(ctx, text, maxWidth);
    lineHeight = fontSize * 1.08;
    const totalH = lines.length * lineHeight;
    // batasi tinggi total <= maxWidth * 1.6 (aspect relatif terhadap area)
    if (lines.every((l) => ctx.measureText(l).width <= maxWidth) &&
        totalH <= maxWidth * 1.4) {
      break;
    }
    fontSize *= 0.92;
    if (fontSize < 24) break;
  }

  const widths = lines.map((l) => ctx.measureText(l).width);
  return {
    lines: lines.map((l, i) => ({ text: l, width: widths[i] })),
    fontSize,
    lineHeight,
    totalHeight: lines.length * lineHeight,
    maxWidth: Math.max(...widths, 0),
  };
}

function wrapToWidth(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const result: string[] = [];
  let current = '';
  for (const w of words) {
    const candidate = current ? `${current} ${w}` : w;
    if (ctx.measureText(candidate).width <= maxWidth || !current) {
      current = candidate;
    } else {
      result.push(current);
      current = w;
    }
  }
  if (current) result.push(current);
  return result;
}
