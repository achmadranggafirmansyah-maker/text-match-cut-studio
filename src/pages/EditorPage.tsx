import { Header } from '../components/Header';
import { PreviewCanvas } from '../components/PreviewCanvas';
import { CustomizePanel } from '../components/CustomizePanel';
import { RenderProgress } from '../components/RenderProgress';
import { useProject } from '../state/projectState';

export function EditorPage() {
  const isRendering = useProject((s) => s.isRendering);
  return (
    <div className="editor">
      <Header />
      <div className="editor-body">
        <div className="editor-main">
          <PreviewCanvas />
          {isRendering && <RenderProgress />}
        </div>
        <CustomizePanel />
      </div>
    </div>
  );
}
