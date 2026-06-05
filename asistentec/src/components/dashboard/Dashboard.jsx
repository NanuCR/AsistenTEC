import { useApp } from '../../context/AppContext';
import { getTheme, makeStyles } from '../../styles/theme';
import { daysLeft } from '../../lib/utils';
import { SkeletonList } from '../ui/Skeleton';
import { Badge } from '../ui/Badge';

export function Dashboard({ courses, tasks, materials, grades, loading }) {
  const { dark, setTab, courseFilter, config } = useApp();
  const T  = getTheme(dark);
  const st = makeStyles(T);

  const aName  = config?.assistant_name || 'AsistenTEC';
  const today  = new Date(new Date().toDateString());
  const in3    = new Date(); in3.setDate(today.getDate() + 3);

  const pending = tasks.filter(t => !t.done);
  const overdue = pending.filter(t => t.due_date && new Date(t.due_date) < today);
  const urgent  = pending.filter(t => t.due_date && !overdue.find(o => o.id === t.id) && new Date(t.due_date) <= in3);

  const byId = (id) => courses.find(c => c.id === id);

  const courseAvg = (c) => {
    const gs = grades.filter(g => g.course_id === c.id);
    if (!gs.length) return null;
    const w = gs.reduce((a, g) => a + parseFloat(g.max_score), 0);
    const s = gs.reduce((a, g) => a + (parseFloat(g.score) / parseFloat(g.max_score)) * parseFloat(g.max_score), 0);
    return w > 0 ? (s / w) * 100 : null;
  };

  if (loading) return <SkeletonList rows={4} />;

  if (courses.length === 0) {
    return (
      <div style={st.card({ textAlign: 'center', padding: 48 })}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>🎓</div>
        <div style={{ fontFamily: T.mono, fontSize: 20, fontWeight: 800, color: T.txt, marginBottom: 8 }}>{aName}</div>
        <div style={{ fontSize: 13, color: T.txt2, marginBottom: 24 }}>
          Tu asistente académico del TEC. Comienza agregando tus cursos.
        </div>
        <button style={st.primaryBtn(T.acc)} onClick={() => setTab('cursos')}>
          Agregar cursos →
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* Greeting */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontFamily: T.mono, fontSize: 22, fontWeight: 800, color: T.txt, letterSpacing: -0.5 }}>
          {courseFilter
            ? byId(courseFilter)?.name ?? aName
            : aName}
        </div>
        <div style={{ fontSize: 13, color: T.txt2, marginTop: 3 }}>
          {courses.length} curso{courses.length !== 1 ? 's' : ''} · {new Date().toLocaleDateString('es-CR', { weekday: 'long', month: 'long', day: 'numeric' })}
        </div>
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, marginBottom: 16 }}>
        {[
          [T.acc, T.accBg, courses.length,    'Cursos'     ],
          [T.org, T.orgBg, pending.length,    'Pendientes' ],
          [T.red, T.redBg, overdue.length,    'Vencidas'   ],
          [T.grn, T.grnBg, materials.length,  'Archivos'   ],
        ].map(([color, bg, count, label]) => (
          <div key={label} style={{ background: bg, borderRadius: 14, padding: '14px 10px', textAlign: 'center' }}>
            <div style={{ fontSize: 28, fontWeight: 900, color, fontFamily: T.mono, lineHeight: 1 }}>{count}</div>
            <div style={{ fontSize: 10, color, fontFamily: T.mono, letterSpacing: 0.8, marginTop: 4, opacity: 0.85 }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Overdue alert */}
      {overdue.length > 0 && (
        <div style={st.card({ borderLeft: `3px solid ${T.red}`, background: T.redBg, marginBottom: 12 })}>
          <div style={st.label(T.red)}>⚠ Tareas vencidas</div>
          {overdue.map(tk => {
            const c = byId(tk.course_id);
            const d = Math.abs(daysLeft(tk.due_date));
            return (
              <div key={tk.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: `1px solid ${T.brd}` }}>
                <span style={{ fontSize: 13, color: T.txt }}>
                  {tk.name}
                  {c && <span style={{ color: c.color, fontSize: 11, marginLeft: 6 }}>{c.name}</span>}
                </span>
                <span style={{ fontSize: 11, color: T.red, fontFamily: T.mono }}>{d}d atrás</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Upcoming tasks */}
      {pending.length > 0 && (
        <div style={st.card()}>
          <div style={st.label()}>Próximas entregas</div>
          {pending.slice(0, 7).map(tk => {
            const dl = tk.due_date ? daysLeft(tk.due_date) : null;
            const c  = byId(tk.course_id);
            const dc = dl === null ? T.txt3 : dl < 0 ? T.red : dl <= 3 ? T.org : T.grn;
            return (
              <div key={tk.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderBottom: `1px solid ${T.brd}` }}>
                <div>
                  <div style={{ fontSize: 13, color: T.txt, fontWeight: 500 }}>{tk.name}</div>
                  {c && <div style={{ fontSize: 11, color: c.color, marginTop: 1 }}>{c.name}</div>}
                </div>
                {tk.due_date && (
                  <span style={{ fontSize: 12, fontWeight: 700, color: dc, fontFamily: T.mono }}>
                    {dl < 0 ? `${Math.abs(dl)}d venc.` : dl === 0 ? 'hoy' : `${dl}d`}
                  </span>
                )}
              </div>
            );
          })}
          {pending.length > 7 && (
            <button style={{ ...st.ghostBtn(), marginTop: 8 }} onClick={() => setTab('tareas')}>
              Ver todas ({pending.length}) →
            </button>
          )}
        </div>
      )}

      {/* Active courses */}
      <div style={st.card()}>
        <div style={st.label()}>Cursos activos</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {courses.map(c => {
            const p   = tasks.filter(t => t.course_id === c.id && !t.done).length;
            const avg = courseAvg(c);
            const ac  = avg === null ? T.txt3 : avg >= 90 ? T.grn : avg >= 70 ? T.org : T.red;
            return (
              <div key={c.id} style={{ borderLeft: `3px solid ${c.color}`, paddingLeft: 10, paddingTop: 4, paddingBottom: 4 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: T.txt, fontFamily: T.mono }}>{c.name}</div>
                {c.professor && <div style={{ fontSize: 11, color: T.txt2 }}>Prof. {c.professor}</div>}
                <div style={{ fontSize: 10, color: T.txt3, marginTop: 3, fontFamily: T.mono, display: 'flex', gap: 6 }}>
                  <span>{p} pend.</span>
                  <span>· {(materials.filter(m => m.course_id === c.id)).length} arch.</span>
                  {avg !== null && <span style={{ color: ac }}>· {avg.toFixed(0)}%</span>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
