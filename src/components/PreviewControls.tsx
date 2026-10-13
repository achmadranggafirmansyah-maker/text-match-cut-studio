import { useProject } from '../state/projectState';
import { formatTime } from '../utils/format';

interface Props {
  currentMs: number;
  durationMs: number;
  onPlay: () => void;
  onPause: () => void;
  onRestart: () => void;
  onSeek: (ms: number) => void;
}

export function PreviewControls({
  currentMs, durationMs, onPlay, onPause, onRestart, onSeek,
}: Props) {
  const muted = useProject((s) => s.muted);
  const update = useProject((s) => s.update);
  return (
    <div className="preview-controls">
      <button className="icon-btn" onClick={onRestart} title="Ulang dari awal">↺</button>
      <button className="icon-btn primary" onClick={onPlay} title="Putar">▶</button>
      <button className="icon-btn" onClick={onPause} title="Pause">❚❚</button>
      <div className="preview-time">
        {formatTime(currentMs / 1000)} / {formatTime(durationMs / 1000)}
      </div>
      <input
        className="seek"
        type="range"
        min={0}
        max={Math.max(1, durationMs)}
        value={currentMs}
        onChange={(e) => onSeek(Number(e.target.value))}
      />
      <button
        className="icon-btn"
        onClick={() => update('muted', !muted)}
        title={muted ? 'Unmute' : 'Mute'}
      >
        {muted ? '🔇' : '🔊'}
      </button>
    </div>
  );
}
