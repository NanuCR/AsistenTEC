import { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { getTheme, makeStyles } from '../../styles/theme';
import { SkeletonList } from '../ui/Skeleton';

export function NotesManager({ courses, notes, loading, onAdd, onRemove }) {
  const { dark, notify } = useApp();
  const T  = getTheme(dark);
  const st = makeStyles(T);

  const [form, setForm] = useState({ text: '', course_id: '' });
  const [saving, setSaving] = useState(false);

  const byId = id => courses.find(c => c.id === id);

  const handleAdd = async () => {
    if (!form.text.trim()) { notify('El apunte no puede estar vacío.', 'warn'); return; }
    setSaving(true);
    const { error } = await onAdd({ text: form.text.trim(), course_id: form.course_id || null });
    setSaving(false);
    if (error) { notify('Error: ' + error.message, 'error'); return; }
    setForm({ text: '', course_id: '' });
  };

  if (loading) return <SkeletonList rows={3} />;

  return (
    <div>
      <div style={st.card()}>
        <div style={st.label()}>Nuevo apunte</div>
        <textarea
          style={{ ...st.input, height: 96, resize: 'vertical', marginBottom: 8 }}
          placeholder="Escribe tu apunte aquí…"
          value={form.text}
          onChange={e => setForm(p => ({ ...p, text: e.target.value }))}
        />
        {courses.length > 0 && (
          <select
            style={{ ...st.input, marginBottom: 8 }}
            value={form.course_id}
            onChange={e => setForm(p => ({ ...p, course_id: e.target.value }))}
          >
            <option value=''>Sin curso asignado</option>
            {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        )}
        <button
          style={st.primaryBtn(saving ? T.sur2 : T.acc, saving ? T.txt2 : '#fff')}
          onClick={handleAdd}
          disabled={saving}
        >
          {saving ? 'Guardando…' : 'Guardar apunte'}
        </button>
      </div>

      {notes.length === 0 && (
        <div style={st.card({ padding: 24, textAlign: 'center', color: T.txt2, fontFamily: T.mono, fontSize: 12 })}>
          Sin apuntes registrados.
        </div>
      )}

      {notes.map(n => {
        const c = n.course_id ? byId(n.course_id) : null;
        return (
          <div key={n.id} style={st.card({ borderLeft: `3px solid ${c ? c.color : T.brd}`, marginBottom: 6 })}>
            <div style={{ display: 'flex', gap: 8 }}>
              <pre style={{ flex: 1, whiteSpace: 'pre-wrap', fontSize: 13, color: T.txt, fontFamily: 'inherit', margin: 0, lineHeight: 1.65 }}>
                {n.text}
              </pre>
              <button style={st.dangerBtn({ flexShrink: 0, alignSelf: 'flex-start' })} onClick={() => onRemove(n.id)}>✕</button>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 8, alignItems: 'center' }}>
              {c && <span style={{ fontSize: 10, color: c.color, fontFamily: T.mono, fontWeight: 600 }}>{c.name}</span>}
              <span style={{ fontSize: 10, color: T.txt3, fontFamily: T.mono }}>
                {new Date(n.created_at).toLocaleDateString('es-CR', { day: 'numeric', month: 'short', year: 'numeric' })}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
