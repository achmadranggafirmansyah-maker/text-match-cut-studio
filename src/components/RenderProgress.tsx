import { useProject } from '../state/projectState';

export function RenderProgress() {
  const p = useProject((s) => s.renderProgress);
  const stage = useProject((s) => s.renderStage);
  return (
    <div className="render-progress">
      <div className="rp-inner">
        <div className="rp-stage">{stage || 'Memproses…'}</div>
        <div className="rp-bar">
          <div className="rp-fill" style={{ width: `${p}%` }} />
        </div>
        <div className="rp-pct">{p}%</div>
      </div>
    </div>
  );
}
