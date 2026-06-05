import { useApp } from '../../context/AppContext';
import { getTheme } from '../../styles/theme';

/** Animated shimmer skeleton block. */
export function Skeleton({ width = '100%', height = 16, borderRadius = 8, style = {} }) {
  const { dark } = useApp();
  const T = getTheme(dark);

  return (
    <>
      <style>{`
        @keyframes atec-shimmer {
          0%   { background-position: -400px 0; }
          100% { background-position:  400px 0; }
        }
        .atec-sk {
          background: linear-gradient(90deg,
            ${T.sur2} 25%,
            ${T.sur3} 50%,
            ${T.sur2} 75%
          );
          background-size: 800px 100%;
          animation: atec-shimmer 1.4s infinite linear;
        }
      `}</style>
      <div
        className="atec-sk"
        style={{ width, height, borderRadius, ...style }}
      />
    </>
  );
}

/** A set of skeleton rows simulating a list of cards. */
export function SkeletonList({ rows = 3 }) {
  return (
    <div style={{ display: 'grid', gap: 10 }}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} style={{ padding: 16, borderRadius: 14, overflow: 'hidden' }}>
          <Skeleton height={14} width="55%" style={{ marginBottom: 8 }} />
          <Skeleton height={12} width="35%" />
        </div>
      ))}
    </div>
  );
}
