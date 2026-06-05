import { getTheme } from '../../styles/theme';
import { useApp } from '../../context/AppContext';

export function Spinner({ size = 20, color }) {
  const { dark } = useApp();
  const T = getTheme(dark);
  const c = color ?? T.acc;
  const id = `sp-${size}`;

  return (
    <>
      <style>{`
        @keyframes atec-spin { to { transform: rotate(360deg); } }
        .${id} { animation: atec-spin .75s linear infinite; }
      `}</style>
      <svg
        className={id}
        width={size} height={size} viewBox="0 0 24 24" fill="none"
        style={{ display: 'inline-block', flexShrink: 0 }}
      >
        <circle cx="12" cy="12" r="10" stroke={c} strokeWidth="3" opacity=".2" />
        <path
          d="M12 2 a10 10 0 0 1 10 10"
          stroke={c} strokeWidth="3" strokeLinecap="round"
        />
      </svg>
    </>
  );
}
