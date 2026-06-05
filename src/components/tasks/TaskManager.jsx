import { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { getTheme, makeStyles } from '../../styles/theme';
import { daysLeft, openGoogleCalendar, ASSIGNMENT_TYPES } from '../../lib/utils';
import { SkeletonList } from '../ui/Skeleton';

const PRIORITIES = ['alta', 'media', 'baja'];
const PRIORITY_COLOR = { alta: 'red', media: 'org', baja: 'grn' };

export function TaskManager({ courses, tasks, loading, onAdd, onRemove, onToggle }) {
  const { dark, notify } = useApp();
  const T  = getTheme(dark);
  const st = makeStyles(T);

  const [form, setForm] = useState({
    name: '', course_id: '', due_date: '', priority: 'media',
    description: '', type: 'tarea', type_custom: '',
  });
  const [saving, setSaving] = useState(false);

  const byId = id => courses.find(c => c.id === id);

  const handleAdd = async () => {
    if (!form.name.trim()) { notify('Ingresa el nombre de la tarea.', 'warn'); return; }
    setSaving(true);
    const payload = {
      name:        form.name.trim(),
      course_id:   form.course_id || null,
      due_date:    form.due_date  || null,
      priority:    form.priority,
      description: form.description || null,
      type:        form.type,
      type_custom: form.type === 'otro' ? (form.type_custom || null) : null,
    };
    const { error } = await onAdd(payload);
    setSaving(false);
    if (error) { notify('Error: ' + error.message, 'error'); return; }
    setForm({ name: '', course_id: '', due_date: '', priority: 'media', description: '', type: 'tarea', type_custom: '' });
    notify('Tarea agregada.', 'success');
  };

  if (loading) return <SkeletonList rows={4} />;

  const today = new Date(new Date().toDateString());

  return (
    <div>
      {courses.length === 0 ? (
        <div style={st.card({ padding: 24, textAlign: 'center', color: T.txt2, fontFamily: T.mono, fontSize: 12 })}>
          Agrega cursos primero.
        </div>
      ) : (
        <div style={st.card()}>
          <div style={st.label()}>Nueva tarea</div>
          <div style={{ display: 'grid', gap: 8 }}>
            <input
              style={st.input}
              placeholder="Nombre de la tarea *"
              value={form.name}
              onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
              onKeyDown={e => e.key === 'Enter' && handleAdd()}
            />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
              <select style={st.input} value={form.course_id} onChange={e => setForm(p => ({ ...p, course_id: e.target.value }))}>
                <option value=''>-- Curso --</option>
                {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <input type='date' style={st.input} value={form.due_date} onChange={e => setForm(p => ({ ...p, due_date: e.target.value }))} />
              <select style={st.input} value={form.priority} onChange={e => setForm(p => ({ ...p, priority: e.target.value }))}>
                {PRIORITIES.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
              </select>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: form.type === 'otro' ? '1fr 1fr' : '1fr', gap: 8 }}>
              <select style={st.input} value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value, type_custom: '' }))}>
                {ASSIGNMENT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
              {form.type === 'otro' && (
                <input
                  style={st.input}
                  placeholder="Especifica el tipo (ej: Bitácora)"
                  value={form.type_custom}
                  onChange={e => setForm(p => ({ ...p, type_custom: e.target.value }))}
                  autoFocus
                />
              )}
            </div>
            <textarea
              style={{ ...st.input, height: 44, resize: 'none' }}
              placeholder="Descripción opcional"
              value={form.description}
              onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
            />
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button
                style={st.primaryBtn(saving ? T.sur2 : T.acc, saving ? T.txt2 : '#fff')}
                onClick={handleAdd} disabled={saving}
              >
                {saving ? 'Agregando…' : 'Agregar tarea'}
              </button>
              {form.name && form.due_date && (
                <button
                  style={st.primaryBtn(T.sur2, T.txt)}
                  onClick={() => { openGoogleCalendar(form.name, form.due_date, form.description); notify('Abriendo Google Calendar…', 'info'); }}
                >
                  📅 Calendario
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {tasks.length === 0 && courses.length > 0 && (
        <div style={st.card({ padding: 24, textAlign: 'center', color: T.txt2, fontFamily: T.mono, fontSize: 12 })}>
          Sin tareas registradas.
        </div>
      )}

      {PRIORITIES.map(p => {
        const grp = tasks.filter(t => t.priority === p);
        if (!grp.length) return null;
        const pColor = T[PRIORITY_COLOR[p]];

        return (
          <div key={p} style={{ marginTop: 14 }}>
            <div style={{ ...st.label(), marginTop: 0 }}>Prioridad {p}</div>
            {grp.map(tk => {
              const dl = tk.due_date ? daysLeft(tk.due_date) : null;
              const dc = dl === null ? T.txt3 : dl < 0 ? T.red : dl <= 3 ? T.org : T.grn;
              const c  = byId(tk.course_id);
              const typeLabel = tk.type === 'otro' ? (tk.type_custom || 'Otro') : tk.type;

              return (
                <div key={tk.id} style={st.card({
                  marginBottom: 6, display: 'flex', alignItems: 'flex-start', gap: 12,
                  padding: '11px 14px', borderLeft: `3px solid ${pColor}`,
                  opacity: tk.done ? 0.45 : 1, transition: 'opacity .2s',
                })}>
                  <input
                    type='checkbox'
                    checked={tk.done}
                    onChange={() => onToggle(tk.id)}
                    style={{ width: 16, height: 16, cursor: 'pointer', accentColor: T.acc, flexShrink: 0, marginTop: 2 }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: T.txt, textDecoration: tk.done ? 'line-through' : 'none' }}>
                      {tk.name}
                    </div>
                    <div style={{ display: 'flex', gap: 8, marginTop: 2, flexWrap: 'wrap', alignItems: 'center' }}>
                      {c && <span style={{ fontSize: 11, color: c.color, fontWeight: 600 }}>{c.name}</span>}
                      <span style={{ fontSize: 10, color: T.txt3, fontFamily: T.mono }}>{typeLabel}</span>
                    </div>
                    {tk.description && <div style={{ fontSize: 11, color: T.txt2, marginTop: 3 }}>{tk.description}</div>}
                  </div>
                  <div style={{ display: 'flex', gap: 5, alignItems: 'center', flexShrink: 0 }}>
                    {tk.due_date && (
                      <span style={{ fontSize: 11, fontWeight: 700, color: dc, fontFamily: T.mono, minWidth: 38, textAlign: 'right' }}>
                        {dl < 0 ? `${Math.abs(dl)}d` : dl === 0 ? 'hoy' : `${dl}d`}
                      </span>
                    )}
                    {tk.due_date && (
                      <button style={st.ghostBtn()} onClick={() => { openGoogleCalendar(tk.name, tk.due_date, tk.description); notify('Abriendo calendario…', 'info'); }}>
                        📅
                      </button>
                    )}
                    <button style={st.dangerBtn()} onClick={() => onRemove(tk.id)}>✕</button>
                  </div>
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
