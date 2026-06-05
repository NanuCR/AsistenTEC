import { useApp } from '../../context/AppContext';
import { getTheme, makeStyles } from '../../styles/theme';
import { supabase } from '../../lib/supabase';

export function Header({ courses, tasks, config }) {
  const { dark, toggleDark, courseFilter, setCourseFilter, notify } = useApp();
  const T  = getTheme(dark);
  const st = makeStyles(T);

  const pending  = tasks.filter(t => !t.done);
  const overdue  = pending.filter(t => t.due_date && new Date(t.due_date) < new Date(new Date().toDateString()));
  const urgentDl = new Date(); urgentDl.setDate(urgentDl.getDate() + 3);
  const urgent   = pending.filter(t => t.due_date && !overdue.find(o => o.id === t.id) && new Date(t.due_date) <= urgentDl);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    notify('Sesión cerrada.', 'info');
  };

  const aName = config?.assistant_name || 'AsistenTEC';

  return (
    <div style={{
      background: dark ? 'rgba(0,0,0,0.85)' : 'rgba(242,242,247,0.85)',
      backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
      borderBottom: `1px solid ${T.brd}`,
      padding: '10px 20px',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      position: 'sticky', top: 0, zIndex: 200,
    }}>
      {/* Left: Brand + course filter */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
        <div style={{ fontFamily: T.mono, fontSize: 15, fontWeight: 800, color: T.txt, letterSpacing: -0.3, whiteSpace: 'nowrap' }}>
          {aName}
        </div>

        {courses.length > 0 && (
          <select
            value={courseFilter ?? ''}
            onChange={e => setCourseFilter(e.target.value || null)}
            style={{
              ...st.input,
              width: 'auto', maxWidth: 180,
              fontSize: 11, padding: '4px 8px',
              borderRadius: 20, background: courseFilter ? T.accBg : T.sur2,
              color: courseFilter ? T.acc : T.txt2,
              fontFamily: T.mono, fontWeight: courseFilter ? 700 : 400,
              border: `1px solid ${courseFilter ? T.acc + '66' : T.brd}`,
            }}
          >
            <option value="">Todos los cursos</option>
            {courses.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        )}
      </div>

      {/* Right: badges + controls */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
        {overdue.length > 0 && (
          <span style={{ fontSize: 10, color: T.red, fontFamily: T.mono, fontWeight: 700, background: T.redBg, padding: '3px 8px', borderRadius: 10 }}>
            {overdue.length} venc.
          </span>
        )}
        {urgent.length > 0 && (
          <span style={{ fontSize: 10, color: T.org, fontFamily: T.mono, fontWeight: 700, background: T.orgBg, padding: '3px 8px', borderRadius: 10 }}>
            {urgent.length} urgent.
          </span>
        )}
        <button
          style={{ ...st.ghostBtn(), padding: '5px 12px' }}
          onClick={toggleDark}
        >
          {dark ? '☀ Claro' : '◑ Oscuro'}
        </button>
        <button
          style={{ ...st.ghostBtn({ color: T.red }) }}
          onClick={handleSignOut}
          title="Cerrar sesión"
        >
          Salir
        </button>
      </div>
    </div>
  );
}
