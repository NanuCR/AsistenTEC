export const LT = {
  bg:     '#F2F2F7',
  sur:    '#FFFFFF',
  sur2:   '#F2F2F7',
  sur3:   '#E5E5EA',
  brd:    'rgba(60,60,67,0.12)',
  txt:    '#1D1D1F',
  txt2:   'rgba(60,60,67,0.6)',
  txt3:   'rgba(60,60,67,0.3)',
  acc:    '#007AFF',
  accBg:  'rgba(0,122,255,0.1)',
  red:    '#FF3B30',
  redBg:  'rgba(255,59,48,0.1)',
  grn:    '#34C759',
  grnBg:  'rgba(52,199,89,0.1)',
  org:    '#FF9500',
  orgBg:  'rgba(255,149,0,0.1)',
  prp:    '#AF52DE',
  prpBg:  'rgba(175,82,222,0.1)',
  sh:     '0 1px 4px rgba(0,0,0,0.06),0 2px 12px rgba(0,0,0,0.04)',
  mono:   "'SF Mono','Menlo','Monaco','Courier New',monospace",
};

export const DK = {
  bg:     '#000000',
  sur:    '#1C1C1E',
  sur2:   '#2C2C2E',
  sur3:   '#3A3A3C',
  brd:    'rgba(255,255,255,0.09)',
  txt:    '#FFFFFF',
  txt2:   'rgba(235,235,245,0.6)',
  txt3:   'rgba(235,235,245,0.25)',
  acc:    '#0A84FF',
  accBg:  'rgba(10,132,255,0.18)',
  red:    '#FF453A',
  redBg:  'rgba(255,69,58,0.18)',
  grn:    '#32D74B',
  grnBg:  'rgba(50,215,75,0.18)',
  org:    '#FF9F0A',
  orgBg:  'rgba(255,159,10,0.18)',
  prp:    '#BF5AF2',
  prpBg:  'rgba(191,90,242,0.18)',
  sh:     '0 2px 8px rgba(0,0,0,0.5)',
  mono:   "'SF Mono','Menlo','Monaco','Courier New',monospace",
};

/** Returns a theme object given a boolean dark flag. */
export const getTheme = (dark) => (dark ? DK : LT);

// ── Reusable style-factory functions ─────────────────────────────────────────

export const makeStyles = (T) => ({
  input: {
    background: T.sur2, border: `1px solid ${T.brd}`, borderRadius: 8,
    padding: '9px 12px', fontSize: 13, color: T.txt,
    width: '100%', boxSizing: 'border-box', outline: 'none', fontFamily: 'inherit',
  },
  card: (extra = {}) => ({
    background: T.sur, borderRadius: 14, padding: 16,
    boxShadow: T.sh, marginBottom: 10, ...extra,
  }),
  primaryBtn: (bg, tx = '#fff', extra = {}) => ({
    background: bg, color: tx, border: 'none', borderRadius: 20,
    padding: '7px 18px', fontSize: 12, fontWeight: 600,
    cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap', ...extra,
  }),
  ghostBtn: (extra = {}) => ({
    background: T.sur2, color: T.txt2, border: 'none', borderRadius: 8,
    padding: '5px 10px', fontSize: 11, cursor: 'pointer', fontFamily: T.mono, ...extra,
  }),
  dangerBtn: (extra = {}) => ({
    background: T.redBg, color: T.red, border: 'none', borderRadius: 8,
    padding: '5px 10px', fontSize: 11, cursor: 'pointer', fontFamily: T.mono, ...extra,
  }),
  label: (color, extra = {}) => ({
    fontFamily: T.mono, fontSize: 11, fontWeight: 700,
    letterSpacing: 1.2, textTransform: 'uppercase',
    color: color || T.txt3, marginBottom: 8, ...extra,
  }),
  tab: (active) => ({
    background: active ? T.accBg : 'transparent',
    color: active ? T.acc : T.txt2,
    border: 'none', borderRadius: 20, padding: '5px 14px',
    fontSize: 12, fontWeight: active ? 600 : 400,
    cursor: 'pointer', fontFamily: T.mono, letterSpacing: 0.2,
    whiteSpace: 'nowrap', transition: 'all .15s',
  }),
});
