import { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { getTheme, makeStyles } from '../../styles/theme';
import { ASSIGNMENT_TYPES } from '../../lib/utils';
import { SkeletonList } from '../ui/Skeleton';

export function GradesManager({ courses, grades, loading, onAdd, onRemove, courseAvg }) {
  const { dark, notify } = useApp();
  const T  = getTheme(dark);
  const st = makeStyles(T);

  const EMPTY = { course_id: '', name: '', score: '', max_score: '100', type: 'examen', type_custom: '' };
  const [form,   setForm]  = useState(EMPTY);
  const [saving, setSave]  = useState(false);

  const handleAdd = async () => {
    const score    = parseFloat(form.score);
    const maxScore = parseFloat(form.max_score);

    if (!form.course_id)          { notify('Selecciona un curso.', 'warn');                           return; }
    if (!form.name.trim())        { notify('Ingresa el nombre de la evaluación.', 'warn');            return; }
    if (isNaN(score))             { notify('Ingresa una nota válida.', 'warn');                       return; }
    if (score < 0)                { notify('La nota no puede ser negativa.', 'warn');                 return; }
    if (isNaN(maxScore) || maxScore <= 0 || maxScore > 100) {
      notify('El puntaje máximo debe ser entre 0.01 y 100%.', 'warn'); return;
    }
    if (score > maxScore)         { notify(`La nota (${score}) supera el máximo (${maxScore}).`, 'warn'); return; }

    setSave(true);
    const { error } = await onAdd({
      course_id:   form.course_id,
      name:        form.name.trim(),
      score,
      max_score:   maxScore,
      type:        form.type,
      type_custom: form.type === 'otro' ? (form.type_custom || null) : null,
    });
    setSave(false);

    if (error) { notify('Error: ' + error.message, 'error'); return; }
    setForm(EMPTY);
    notify('Calificación registrada.', 'success');
  };

  if (loading) return <SkeletonList rows={3} />;

  return (
    <div>
      {/* ── Add Grade Form ───────────────────────────────── */}
      <div style={st.card({ border: `1px solid ${T.org}44` })}>
        <div style={st.label(T.org)}>Registrar calificación</div>

        {courses.length === 0 ? (
          <div style={{ fontSize: 12, color: T.txt2, fontFamily: T.mono }}>Agrega cursos primero.</div>
        ) : (
          <div style={{ display: 'grid', gap: 8 }}>
            <select style={st.input} value={form.course_id} onChange={e => setForm(p => ({ ...p, course_id: e.target.value }))}>
              <option value=''>-- Selecciona curso --</option>
              {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 8 }}>
              <input style={st.input} placeholder="Nombre (ej: Examen I)" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
              <input style={st.input} placeholder="Nota obtenida" type='number' min={0} value={form.score}     onChange={e => setForm(p => ({ ...p, score:     e.target.value }))} />
              <input style={st.input} placeholder="Máx %"         type='number' min={0.01} max={100} value={form.max_score} onChange={e => setForm(p => ({ ...p, max_score: e.target.value }))} />
            </div>

            {/* Percentage bar preview */}
            {form.score !== '' && form.max_score !== '' && !isNaN(parseFloat(form.score)) && !isNaN(parseFloat(form.max_score)) && parseFloat(form.max_score) > 0 && (
              <div>
                {(() => {
                  const pct = Math.min((parseFloat(form.score) / parseFloat(form.max_score)) * 100, 100);
                  const c   = pct >= 90 ? T.grn : pct >= 70 ? T.org : T.red;
                  return (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ flex: 1, height: 6, background: T.sur3, borderRadius: 3 }}>
                        <div style={{ width: `${pct}%`, height: '100%', background: c, borderRadius: 3, transition: 'width .3s' }} />
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 700, color: c, fontFamily: T.mono, minWidth: 38 }}>{pct.toFixed(1)}%</span>
                    </div>
                  );
                })()}
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: form.type === 'otro' ? '1fr 1fr' : '1fr', gap: 8 }}>
              <select style={st.input} value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value, type_custom: '' }))}>
                {ASSIGNMENT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
              {form.type === 'otro' && (
                <input
                  style={st.input}
                  placeholder="Especifica el tipo (ej: Laboratorio)"
                  value={form.type_custom}
                  onChange={e => setForm(p => ({ ...p, type_custom: e.target.value }))}
                  autoFocus
                />
              )}
            </div>

            <button
              style={st.primaryBtn(saving ? T.sur2 : T.org, saving ? T.txt2 : '#fff')}
              onClick={handleAdd} disabled={saving}
            >
              {saving ? 'Registrando…' : 'Registrar'}
            </button>
          </div>
        )}
      </div>

      {/* ── Per-course grade tables ──────────────────────── */}
      {courses.every(c => !grades.find(g => g.course_id === c.id)) && (
        <div style={st.card({ padding: 24, textAlign: 'center', color: T.txt2, fontFamily: T.mono, fontSize: 12 })}>
          Sin calificaciones registradas.
        </div>
      )}

      {courses.map(c => {
        const cGrades = grades.filter(g => g.course_id === c.id);
        if (!cGrades.length) return null;

        const avg = courseAvg(c.id);
        const ac  = avg === null ? T.txt3 : avg >= 90 ? T.grn : avg >= 70 ? T.org : T.red;
        const totalWeight = cGrades.reduce((a, g) => a + parseFloat(g.max_score), 0);

        return (
          <div key={c.id} style={st.card({ borderLeft: `3px solid ${c.color}` })}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <div style={{ fontFamily: T.mono, fontSize: 13, fontWeight: 700, color: T.txt }}>{c.name}</div>
              <div style={{ textAlign: 'right' }}>
                {avg !== null && (
                  <span style={{ fontSize: 14, fontWeight: 900, color: ac, fontFamily: T.mono }}>{avg.toFixed(1)}%</span>
                )}
                <div style={{ fontSize: 10, color: T.txt3, fontFamily: T.mono }}>{totalWeight.toFixed(0)}% evaluado</div>
              </div>
            </div>

            {/* Progress bar */}
            {avg !== null && (
              <div style={{ height: 5, background: T.sur2, borderRadius: 3, marginBottom: 12 }}>
                <div style={{ width: `${Math.min(avg, 100)}%`, height: '100%', background: ac, borderRadius: 3, transition: 'width .4s' }} />
              </div>
            )}

            {/* Grade rows */}
            {cGrades.map(gr => {
              const pct  = (parseFloat(gr.score) / parseFloat(gr.max_score)) * 100;
              const gc   = pct >= 90 ? T.grn : pct >= 70 ? T.org : T.red;
              const type = gr.type === 'otro' ? (gr.type_custom || 'Otro') : gr.type;
              return (
                <div key={gr.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 0', borderBottom: `1px solid ${T.brd}` }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ fontSize: 12, color: T.txt }}>{gr.name}</span>
                    <span style={{ fontSize: 10, color: T.txt3, marginLeft: 6, fontFamily: T.mono }}>{type}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexShrink: 0 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: gc, fontFamily: T.mono }}>
                      {parseFloat(gr.score).toFixed(1)}/{parseFloat(gr.max_score).toFixed(0)}%
                    </span>
                    <span style={{ fontSize: 10, color: gc, fontFamily: T.mono }}>({pct.toFixed(1)}%)</span>
                    <button style={st.dangerBtn()} onClick={() => onRemove(gr.id)}>✕</button>
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
