import { useRef } from 'react';
import { useProject } from '../state/projectState';

export function ResultPage() {
  const url = useProject((s) => s.renderedBlobUrl);
  const update = useProject((s) => s.update);
  const videoRef = useRef<HTMLVideoElement>(null);

  if (!url) return null;

  const back = () => {
    // lepas object URL agar tidak memory leak
    URL.revokeObjectURL(url);
    update('renderedBlobUrl', null);
  };

  const download = () => {
    const a = document.createElement('a');
    a.href = url;
    a.download = `text-match-cut-${Date.now()}.mp4`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  return (
    <div className="result-page">
      <div className="result-inner">
        <h1>Video Siap 🎬</h1>
        <video ref={videoRef} src={url} controls playsInline className="result-video" />
        <div className="result-actions">
          <button className="btn-primary" onClick={download}>⬇ Download MP4</button>
          <button className="btn-secondary" onClick={back}>← Kembali ke Editor</button>
        </div>
      </div>
    </div>
  );
}
