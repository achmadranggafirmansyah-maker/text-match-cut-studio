import { useProject } from '../state/projectState';
import { TextEditor } from './TextEditor';
import { getResolution } from '../utils/aspectRatio';

export function CustomizePanel() {
  const s = useProject();
  const u = s.update;
  const { width, height } = getResolution(s.aspectRatio, s.customWidth, s.customHeight);

  return (
    <aside className="customize-panel">
      <h2 className="panel-title">CUSTOMIZE</h2>

      <Section title="Teks">
        <TextEditor />
        <label className="row">
          <span>Segmen</span>
          <select value={s.segmentation} onChange={(e) => u('segmentation', e.target.value as any)}>
            <option value="line">Per Baris</option>
            <option value="sentence">Per Kalimat</option>
            <option value="phrase">Per Frasa (3 kata)</option>
            <option value="word">Per Kata</option>
          </select>
        </label>
      </Section>

      <Section title="Kanvas">
        <label className="row">
          <span>Rasio</span>
          <select value={s.aspectRatio} onChange={(e) => u('aspectRatio', e.target.value as any)}>
            <option value="9:16">9:16 (Reels)</option>
            <option value="16:9">16:9 (YouTube)</option>
            <option value="1:1">1:1 (Feed)</option>
            <option value="4:5">4:5 (IG Portrait)</option>
            <option value="4:3">4:3</option>
            <option value="custom">Custom</option>
          </select>
        </label>
        {s.aspectRatio === 'custom' && (
          <div className="row-split">
            <label>
              W
              <input
                type="number" min={240} max={1920}
                value={s.customWidth}
                onChange={(e) => u('customWidth', Number(e.target.value))}
              />
            </label>
            <label>
              H
              <input
                type="number" min={240} max={1920}
                value={s.customHeight}
                onChange={(e) => u('customHeight', Number(e.target.value))}
              />
            </label>
          </div>
        )}
        <div className="hint">Output: {width}×{height}</div>
      </Section>

      <Section title="Background">
        <RadioGroup
          value={s.backgroundType}
          onChange={(v) => u('backgroundType', v as any)}
          options={[{ v: 'static', l: 'Static' }, { v: 'dynamic', l: 'Dynamic' }]}
        />
        <RadioGroup
          value={s.backgroundStyle}
          onChange={(v) => u('backgroundStyle', v as any)}
          options={[{ v: 'simple', l: 'Simple' }, { v: 'newspaper', l: 'Newspaper' }]}
        />
        <label className="row">
          <span>Blur</span>
          <select value={s.blurDirection} onChange={(e) => u('blurDirection', e.target.value as any)}>
            <option value="vertical">Vertical</option>
            <option value="radial">Radial</option>
          </select>
        </label>
        <RadioGroup
          value={s.blurIntensity}
          onChange={(v) => u('blurIntensity', v as any)}
          options={[
            { v: 'low', l: 'Low' },
            { v: 'medium', l: 'Medium' },
            { v: 'high', l: 'High' },
          ]}
        />
      </Section>

      <Section title="Tipografi">
        <Toggle label="Text Highlight" value={s.highlightOn} onChange={(v) => u('highlightOn', v)} />
        <label className="row">
          <span>Warna Highlight</span>
          <input type="color" value={s.highlightColor} onChange={(e) => u('highlightColor', e.target.value)} />
        </label>
        <Toggle
          label="Chromatic Aberration"
          value={s.chromaticAberration}
          onChange={(v) => u('chromaticAberration', v)}
        />
        <Slider label="Posisi X" min={-1} max={1} step={0.01} value={s.textX} onChange={(v) => u('textX', v)} />
        <Slider label="Posisi Y" min={-1} max={1} step={0.01} value={s.textY} onChange={(v) => u('textY', v)} />
        <Slider label="Zoom" min={0.5} max={2} step={0.01} value={s.textScale} onChange={(v) => u('textScale', v)} />
      </Section>

      <Section title="Animasi">
        <Slider label="Durasi (detik)" min={3} max={60} step={1} value={s.durationSec} onChange={(v) => u('durationSec', v)} />
        <Slider label="Kecepatan" min={0.5} max={2} step={0.05} value={s.animationSpeed} onChange={(v) => u('animationSpeed', v)} />
        <Slider label="Durasi Transisi (ms)" min={30} max={500} step={10} value={s.transitionDurationMs} onChange={(v) => u('transitionDurationMs', v)} />
        <Slider label="Zoom Intensity" min={0} max={1} step={0.05} value={s.zoomIntensity} onChange={(v) => u('zoomIntensity', v)} />
        <Slider label="Movement" min={0} max={1} step={0.05} value={s.movementIntensity} onChange={(v) => u('movementIntensity', v)} />
        <Slider label="Hold (ms)" min={0} max={2000} step={50} value={s.holdDurationMs} onChange={(v) => u('holdDurationMs', v)} />
        <label className="row">
          <span>Gaya Transisi</span>
          <select value={s.transitionStyle} onChange={(e) => u('transitionStyle', e.target.value as any)}>
            <option value="alternating">Alternating</option>
            <option value="sharp-cut">Sharp Cut</option>
            <option value="fast-zoom">Fast Zoom</option>
            <option value="directional-slide">Directional Slide</option>
            <option value="punch-in-out">Punch In/Out</option>
          </select>
        </label>
      </Section>

      <Section title="Audio">
        <Toggle label="Sound Effects" value={s.soundEnabled} onChange={(v) => u('soundEnabled', v)} />
        <label className="row">
          <span>Style</span>
          <select value={s.soundStyle} onChange={(e) => u('soundStyle', e.target.value as any)}>
            <option value="minimal">Minimal</option>
            <option value="punchy">Punchy</option>
            <option value="cinematic">Cinematic</option>
            <option value="editorial">Editorial</option>
          </select>
        </label>
        <Slider label="Volume" min={0} max={1} step={0.05} value={s.soundVolume} onChange={(v) => u('soundVolume', v)} />
        <label className="row">
          <span>Density</span>
          <select value={s.soundDensity} onChange={(e) => u('soundDensity', e.target.value as any)}>
            <option value="sparse">Sparse</option>
            <option value="balanced">Balanced</option>
            <option value="energetic">Energetic</option>
          </select>
        </label>
      </Section>

      <Section title="Ekspor">
        <RadioGroup
          value={s.quality}
          onChange={(v) => u('quality', v as any)}
          options={[
            { v: 'standard', l: 'Standard' },
            { v: 'high', l: 'High' },
          ]}
        />
      </Section>

      <GenerateButton />
    </aside>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="section">
      <div className="section-title">{title}</div>
      <div className="section-body">{children}</div>
    </div>
  );
}

function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="row toggle-row">
      <span>{label}</span>
      <button
        type="button"
        className={`toggle ${value ? 'on' : 'off'}`}
        onClick={() => onChange(!value)}
      >
        <span className="knob" />
      </button>
    </label>
  );
}

function Slider({
  label, min, max, step, value, onChange,
}: { label: string; min: number; max: number; step: number; value: number; onChange: (v: number) => void }) {
  return (
    <label className="row-slider">
      <span>{label}</span>
      <input
        type="range" min={min} max={max} step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      <span className="slider-value">{typeof value === 'number' ? value.toFixed(step < 1 ? 2 : 0) : value}</span>
    </label>
  );
}

function RadioGroup({
  value, onChange, options,
}: { value: string; onChange: (v: string) => void; options: { v: string; l: string }[] }) {
  return (
    <div className="radio-group">
      {options.map((o) => (
        <button
          key={o.v}
          type="button"
          className={`radio-btn ${value === o.v ? 'active' : ''}`}
          onClick={() => onChange(o.v)}
        >
          {o.l}
        </button>
      ))}
    </div>
  );
}

function GenerateButton() {
  const s = useProject();
  const u = s.update;

  const onGenerate = async () => {
    if (!s.text.trim()) {
      alert('Teks masih kosong.');
      return;
    }
    u('isRendering', true);
    u('renderProgress', 0);
    u('renderStage', 'Mempersiapkan…');
    try {
      const { buildTimeline } = await import('../engine/matchCutTimeline');
      const { exportVideo } = await import('../engine/exportVideo');
      const { getResolution } = await import('../utils/aspectRatio');

      const timeline = buildTimeline(s, 30);
      const { width, height } = getResolution(s.aspectRatio, s.customWidth, s.customHeight);

      const blob = await exportVideo({
        state: s,
        timeline,
        width,
        height,
        onProgress: (p, stage) => {
          u('renderProgress', p);
          u('renderStage', stage);
        },
      });

      const url = URL.createObjectURL(blob);
      u('renderedBlobUrl', url);
    } catch (err: any) {
      console.error(err);
      alert('Gagal render: ' + (err?.message ?? 'Error tidak diketahui'));
    } finally {
      u('isRendering', false);
      u('renderProgress', 0);
      u('renderStage', '');
    }
  };

  return (
    <button className="btn-generate" disabled={s.isRendering} onClick={onGenerate}>
      ✨ Generate Video
    </button>
  );
}
