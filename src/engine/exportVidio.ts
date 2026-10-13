import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';
import type { ProjectState } from '../state/projectState';
import { renderFrame, invalidateBackgroundCache } from './animationRenderer';
import type { Timeline } from './matchCutTimeline';
import { renderAudioToBuffer } from './audioMixer';

let _ffmpeg: FFmpeg | null = null;
let _ffmpegLoaded = false;

async function getFFmpeg(onLog?: (msg: string) => void): Promise<FFmpeg> {
  if (_ffmpeg && _ffmpegLoaded) return _ffmpeg;
  const ff = new FFmpeg();
  if (onLog) ff.on('log', ({ message }) => onLog(message));
  const base = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';
  await ff.load({
    coreURL: await toBlobURL(`${base}/ffmpeg-core.js`, 'text/javascript'),
    wasmURL: await toBlobURL(`${base}/ffmpeg-core.wasm`, 'application/wasm'),
  });
  _ffmpeg = ff;
  _ffmpegLoaded = true;
  return ff;
}

export interface ExportOptions {
  state: ProjectState;
  timeline: Timeline;
  width: number;
  height: number;
  onProgress?: (p: number, stage: string) => void;
  onCancelSignal?: { cancelled: boolean };
}

export async function exportVideo(opts: ExportOptions): Promise<Blob> {
  const { state, timeline, width, height, onProgress, onCancelSignal } = opts;
  const fps = 30; // 30 fps cukup untuk gaya editorial, hemat CPU
  const durationMs = timeline.durationMs;

  onProgress?.(0, 'Menyiapkan kanvas…');
  invalidateBackgroundCache();

  // 1. OffscreenCanvas untuk render frame
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  // 2. Streaming canvas → MediaRecorder
  const stream = canvas.captureStream(fps);

  // 3. Siapkan audio & gabungkan ke stream
  const audioCtx = new AudioContext({ sampleRate: 48000 });
  const audioBuffer = await renderAudioToBuffer(
    new OfflineAudioContext(2, Math.ceil((durationMs / 1000) * 48000), 48000),
    timeline,
    state,
  );

  if (audioBuffer) {
    const dest = audioCtx.createMediaStreamDestination();
    const src = audioCtx.createBufferSource();
    src.buffer = audioBuffer;
    src.connect(dest);
    // gabungkan audio track ke canvas stream
    dest.stream.getAudioTracks().forEach((t) => stream.addTrack(t));
    // jadwalkan playback saat merekam
    src.start(audioCtx.currentTime + 0.05);
  }

  const mimeCandidates = [
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm',
  ];
  const mime = mimeCandidates.find((m) => MediaRecorder.isTypeSupported(m)) || 'video/webm';
  const recorder = new MediaRecorder(stream, {
    mimeType: mime,
    videoBitsPerSecond: state.quality === 'high' ? 8_000_000 : 4_000_000,
  });

  const chunks: BlobPart[] = [];
  recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };

  const recPromise = new Promise<Blob>((resolve, reject) => {
    recorder.onstop = () => resolve(new Blob(chunks, { type: mime }));
    recorder.onerror = (e) => reject(e);
  });

  recorder.start();

  // 4. Render frame-by-frame
  const totalFrames = Math.ceil((durationMs / 1000) * fps);
  const startWall = performance.now();

  for (let frame = 0; frame < totalFrames; frame++) {
    if (onCancelSignal?.cancelled) {
      recorder.stop();
      audioCtx.close();
      throw new Error('Dibatalkan oleh pengguna');
    }
    const timeMs = (frame / fps) * 1000;
    renderFrame({ ctx, width, height, state, timeline }, timeMs);

    onProgress?.(
      Math.round((frame / totalFrames) * 70),
      `Merender frame ${frame + 1}/${totalFrames}`,
    );

    // Jaga timing agar ~fps target
    const targetWall = startWall + (frame / fps) * 1000;
    const now = performance.now();
    const wait = Math.max(0, targetWall - now);
    await new Promise((r) => setTimeout(r, wait));
  }

  // 5. Stop recording
  onProgress?.(72, 'Menyelesaikan rekaman…');
  recorder.stop();
  const webm = await recPromise;
  await audioCtx.close();

  // 6. Konversi ke MP4 dengan FFmpeg.wasm
  onProgress?.(78, 'Memuat encoder MP4 (pertama kali ~25MB)…');
  const ff = await getFFmpeg();

  const inputName = 'input.webm';
  const outputName = 'output.mp4';
  await ff.writeFile(inputName, await fetchFile(webm));

  onProgress?.(85, 'Mengonversi ke MP4…');
  await ff.exec([
    '-i', inputName,
    '-c:v', 'libx264',
    '-preset', 'veryfast',
    '-crf', state.quality === 'high' ? '20' : '26',
    '-pix_fmt', 'yuv420p',
    '-c:a', 'aac',
    '-b:a', '160k',
    '-movflags', '+faststart',
    outputName,
  ]);

  const data = await ff.readFile(outputName);
  const bytes = data instanceof Uint8Array ? data : new TextEncoder().encode(data as string);
  // Salin ke ArrayBuffer baru agar tidak share dengan wasm memory
  const ab = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
  const mp4 = new Blob([ab], { type: 'video/mp4' });

  // cleanup
  try { await ff.deleteFile(inputName); } catch {}
  try { await ff.deleteFile(outputName); } catch {}

  onProgress?.(100, 'Selesai');
  return mp4;
}
