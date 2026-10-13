import { useProject } from '../state/projectState';

export function Header() {
  const reset = useProject((s) => s.reset);
  return (
    <header className="app-header">
      <div className="brand">
        <span className="logo">🎬</span>
        <span className="brand-name">Text Match Cut Studio</span>
      </div>
      <div className="header-actions">
        <span className="status-dot" title="Siap render" />
        <button className="btn-ghost" onClick={reset}>Reset</button>
      </div>
    </header>
  );
}
