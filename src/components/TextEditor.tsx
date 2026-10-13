import { useProject } from '../state/projectState';

export function TextEditor() {
  const text = useProject((s) => s.text);
  const update = useProject((s) => s.update);
  return (
    <textarea
      className="text-editor"
      value={text}
      onChange={(e) => update('text', e.target.value)}
      placeholder="Tulis teks apa saja… (satu baris = satu segmen animasi)"
      rows={5}
    />
  );
}
