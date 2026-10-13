import { useProject } from './state/projectState';
import { EditorPage } from './pages/EditorPage';
import { ResultPage } from './pages/ResultPage';

export default function App() {
  const resultUrl = useProject((s) => s.renderedBlobUrl);
  return resultUrl ? <ResultPage /> : <EditorPage />;
}
