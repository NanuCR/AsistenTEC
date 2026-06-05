import { useApp } from '../../context/AppContext';
import { getTheme } from '../../styles/theme';

export function ToastStack() {
  const { toasts, dark } = useApp();
  const T = getTheme(dark);

  const colorMap = {
    info:    T.acc,
    success: T.grn,
    warn:    T.org,
    error:   T.red,
  };

  if (!toasts.length) return null;

  return (
    <div style={{ position: 'fixed', top: 116, right: 16, zIndex: 9999, width: 290 }}>
      {toasts.map(t => {
        const c = colorMap[t.kind] ?? T.acc;
        return (
          <div
            key={t.id}
            style={{
              background: T.sur,
              border: `1px solid ${c}33`,
              borderLeft: `3px solid ${c}`,
              borderRadius: 12,
              padding: '10px 14px',
              marginBottom: 6,
              fontSize: 13,
              color: T.txt,
              boxShadow: T.sh,
              animation: 'atec-slide-in .2s ease',
            }}
          >
            {t.msg}
          </div>
        );
      })}
      <style>{`
        @keyframes atec-slide-in {
          from { opacity: 0; transform: translateX(20px); }
          to   { opacity: 1; transform: translateX(0);    }
        }
      `}</style>
    </div>
  );
}
