import { useEffect, useMemo, useRef, useState } from 'react';
import { useProject } from '../state/projectState';
import { getResolution } from '../utils/aspectRatio';
import { buildTimeline } from '../engine/matchCutTimeline';
import { renderFrame, invalidateBackgroundCache } from '../engine/animationRenderer';
import { formatTime } from '../utils/format';
import { PreviewControls } from './PreviewControls';
import { renderAudioToBuffer, scheduleAudioEvents } from '../engine/audioMixer';

export function PreviewCanvas() {
  const state = useProject();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);
  const startWallRef = useRef<number>(0);
  const [timeMs, setTimeMs] = useState(0);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const playingRef = useRef(false);

  const { width, height } = getResolution(
    state.aspectRatio,
    state.customWidth,
    state.customHeight,
  );

  const timeline = useMemo(() => buildTimeline(state, 30), [
    state.text, state.segmentation, state.durationSec,
    state.transitionDurationMs, state.holdDurationMs,
    state.animationSpeed, state.zoomIntensity,
    state.movementIntensity, state.transitionStyle,
  ]);

  // invalidate bg cache bila setting background berubah
  useEffect(() => {
    invalidateBackgroundCache();
  }, [
    state.backgroundStyle, state.backgroundType,
    state.blurDirection, state.blurIntensity,
  ]);

  // Render frame statis saat pause
  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext('2d')!;
    renderFrame({ ctx, width, height, state, timeline }, timeMs);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeMs, state, timeline, width, height]);

  const stop = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    playingRef.current = false;
    if (audioCtxRef.current) {
      audioCtxRef.current.close();
      audioCtxRef.current = null;
    }
  };

  const play = async () => {
    if (playingRef.current) return;
    playingRef.current = true;
    startWallRef.current = performance.now() - timeMs;

    // jadwalkan audio sekali di awal
    if (state.soundEnabled && !state.muted) {
      const actx = new AudioContext({ sampleRate: 48000 });
      audioCtxRef.current = actx;
      const events = scheduleAudioEvents(timeline, state);
      const t0 = actx.currentTime + 0.05;
      for (const ev of events) {
        const startAt = t0 + ev.timeMs / 1000;
        if (startAt < actx.currentTime) continue;
        // gunakan buffer kecil yang di-generate on-the-fly
        const { buildSfxBuffer } = await import('../engine/soundEffectsEngine');
        const buf = buildSfxBuffer(actx, ev.kind, state.soundStyle);
        const src = actx.createBufferSource();
        src.buffer = buf;
        const g = actx.createGain();
        g.gain.value = state.soundVolume;
        src.connect(g).connect(actx.destination);
        src.start(startAt);
      }
    }

    const c = canvasRef.current!;
    const ctx = c.getContext('2d')!;

    const loop = () => {
      const now = performance.now();
      const t = now - startWallRef.current;
      const capped = Math.min(t, timeline.durationMs);
      setTimeMs(capped);
      renderFrame({ ctx, width, height, state, timeline }, capped);

      if (t >= timeline.durationMs) {
        stop();
        setTimeMs(0);
        return;
      }
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
  };

  const pause = () => stop();
  const restart = () => {
    stop();
    setTimeMs(0);
    setTimeout(() => { play(); }, 30);
  };
  const seek = (ms: number) => {
    stop();
    setTimeMs(Math.max(0, Math.min(timeline.durationMs, ms)));
  };

  useEffect(() => () => stop(), []);

  // sinkronisasi muted saat playing
  useEffect(() => {
    if (audioCtxRef.current) {
      if (state.muted) audioCtxRef.current.suspend();
      else audioCtxRef.current.resume();
    }
  }, [state.muted]);

  return (
    <div className="preview-wrap">
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="preview-canvas"
        style={{ aspectRatio: `${width}/${height}` }}
      />
      <PreviewControls
        currentMs={timeMs}
        durationMs={timeline.durationMs}
        onPlay={play}
        onPause={pause}
        onRestart={restart}
        onSeek={seek}
      />
    </div>
  );
}
