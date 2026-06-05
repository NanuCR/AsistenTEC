import { useApp } from '../../context/AppContext';
import { getTheme, makeStyles } from '../../styles/theme';
import { TABS } from '../../lib/utils';

export function TabBar() {
  const { dark, tab, setTab } = useApp();
  const T  = getTheme(dark);
  const st = makeStyles(T);

  return (
    <div style={{
      display: 'flex', gap: 2,
      padding: '7px 16px',
      background: dark ? 'rgba(0,0,0,0.6)' : 'rgba(242,242,247,0.6)',
      backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
      borderBottom: `1px solid ${T.brd}`,
      overflowX: 'auto',
      position: 'sticky', top: 57, zIndex: 199,
    }}>
      {TABS.map(tb => (
        <button
          key={tb.id}
          style={st.tab(tab === tb.id)}
          onClick={() => setTab(tb.id)}
        >
          {tb.label}
        </button>
      ))}
    </div>
  );
}
