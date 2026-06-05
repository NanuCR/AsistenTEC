import { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { getTheme, makeStyles } from '../../styles/theme';
import { COURSE_COLORS } from '../../lib/utils';
import { SkeletonList } from '../ui/Skeleton';

export function CourseManager({ courses, tasks, grades, materials, loading, onAdd, onRemove }) {
  const { dark, notify } = useApp();
  const T  = getTheme(dark);
  const st = makeStyles(T);

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', professor: '', email: '', color: COURSE_COLORS[0] });
  const [saving, setSaving] = useState(false);

  const handleAdd = async () => {
    if (!form.name.trim()) { notify('Ingresa el nombre del curso.', 'warn'); return; }
    setSaving(true);
    const { error } = await onAdd({ name: form.name.trim(), professor: form.professor, email: form.email, color: form.color });
    setSaving(false);
    if (error) { notify('Error al guardar: ' + error.message, 'error'); return; }
    setForm({ name: '', professor: '', email: '', color: COURSE_COLORS[courses.length % COURSE_COLORS.length] });
    setShowForm(false);
    notify('Curso registrado.', 'success');
  };

  const handleRemove = async (id, name) => {
    if (!confirm(`¿Eliminar el curso "${name}"? Se borrarán sus tareas y materiales.`)) return;
    const { error } = await onRemove(id);
    if (error) notify('Error al eliminar: ' + error.message, 'error');
    else notify('Curso eliminado.', 'warn');
  };

  if (loading) return <SkeletonList rows={3} />;

  const courseAvg = (c) => {
    const gs = grades.filter(g => g.course_id === c.id);
    if (!gs.length) return null;
    const w = gs.reduce((a, g) => a + parseFloat(g.max_score), 0);
    const s = gs.reduce((a, g) => a + (parseFloat(g.score) / parseFloat(g.max_score)) * parseFloat(g.max_score), 0);
    return w > 0 ? (s / w) * 100 : null;
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div style={{ fontFamily: T.mono, fontSize: 13, fontWeight: 700, color: T.txt }}>
          Cursos ({courses.length})
        </div>
        <button style={st.primaryBtn(T.acc)} onClick={() => setShowForm(s => !s)}>+ Nuevo</button>
      </div>

      {showForm && (
        <div style={st.card({ border: `1px solid ${T.acc}44`, marginBottom: 16 })}>
          <div style={st.label()}>Nuevo curso</div>
          <div style={{ display: 'grid', gap: 8 }}>
            <input
              style={st.input}
              placeholder="Nombre del curso *"
              value={form.name}
              onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
              onKeyDown={e => e.key === 'Enter' && handleAdd()}
              autoFocus
            />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <input
                style={st.input}
                placeholder="Nombre del/a profesor/a"
                value={form.professor}
                onChange={e => setForm(p => ({ ...p, professor: e.target.value }))}
              />
              <input
                style={st.input}
                placeholder="Correo del/a profesor/a"
                type="email"
                value={form.email}
                onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
              />
            </div>

            {/* Color picker */}
            <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ fontSize: 11, color: T.txt3, fontFamily: T.mono }}>Color —</span>
              {COURSE_COLORS.map(cl => (
                <div
                  key={cl}
                  onClick={() => setForm(p => ({ ...p, color: cl }))}
                  style={{
                    width: 22, height: 22, borderRadius: '50%', background: cl,
                    cursor: 'pointer',
                    border: form.color === cl ? `3px solid ${T.txt}` : '3px solid transparent',
                    boxSizing: 'border-box', transition: 'border .1s',
                  }}
                />
              ))}
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button style={st.primaryBtn(saving ? T.sur2 : T.acc, saving ? T.txt2 : '#fff')} onClick={handleAdd} disabled={saving}>
                {saving ? 'Guardando…' : 'Guardar'}
              </button>
              <button style={st.primaryBtn(T.sur2, T.txt)} onClick={() => setShowForm(false)}>Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {courses.length === 0 && !showForm && (
        <div style={st.card({ textAlign: 'center', padding: 32, color: T.txt2, fontFamily: T.mono, fontSize: 12 })}>
          Sin cursos registrados.
        </div>
      )}

      {courses.map(c => {
        const pending = tasks.filter(t => t.course_id === c.id && !t.done).length;
        const mats    = materials.filter(m => m.course_id === c.id).length;
        const avg     = courseAvg(c);
        const ac      = avg === null ? T.txt3 : avg >= 90 ? T.grn : avg >= 70 ? T.org : T.red;
        return (
          <div key={c.id} style={st.card({ borderLeft: `3px solid ${c.color}` })}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: T.txt, fontFamily: T.mono }}>{c.name}</div>
                {c.professor && <div style={{ fontSize: 12, color: T.txt2, marginTop: 2 }}>Prof. {c.professor}</div>}
                {c.email && (
                  <a href={`mailto:${c.email}`} style={{ fontSize: 11, color: T.acc, display: 'block', marginTop: 2, textDecoration: 'none' }}>
                    {c.email}
                  </a>
                )}
                <div style={{ display: 'flex', gap: 10, marginTop: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 10, color: T.txt3, fontFamily: T.mono }}>{pending} pendientes</span>
                  <span style={{ fontSize: 10, color: T.txt3, fontFamily: T.mono }}>· {mats} archivos</span>
                  {avg !== null && (
                    <span style={{ fontSize: 10, color: ac, fontFamily: T.mono, fontWeight: 700 }}>
                      · {avg.toFixed(1)}% promedio
                    </span>
                  )}
                </div>
              </div>
              <button style={st.dangerBtn()} onClick={() => handleRemove(c.id, c.name)}>Eliminar</button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
