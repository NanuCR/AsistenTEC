export function Badge({ label, color, bg, style = {} }) {
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, letterSpacing: 0.6,
      padding: '3px 8px', borderRadius: 20,
      color: color ?? '#fff', background: bg ?? '#007AFF',
      display: 'inline-block', whiteSpace: 'nowrap',
      ...style,
    }}>
      {label}
    </span>
  );
}
