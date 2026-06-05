import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { getTheme } from '../../styles/theme';
import { makeStyles } from '../../styles/theme';
import { Spinner } from '../ui/Spinner';

export function AuthScreen({ dark }) {
  const T  = getTheme(dark);
  const st = makeStyles(T);

  const [mode,     setMode]     = useState('login');   // 'login' | 'register' | 'reset'
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [loading,  setLoading]  = useState(false);
  const [msg,      setMsg]      = useState(null);      // { text, kind }

  const reset = () => { setEmail(''); setPassword(''); setMsg(null); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMsg(null);

    if (mode === 'reset') {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin,
      });
      setLoading(false);
      setMsg(error
        ? { text: error.message, kind: 'error' }
        : { text: 'Revisa tu correo para restablecer la contraseña.', kind: 'success' }
      );
      return;
    }

    const fn = mode === 'login'
      ? supabase.auth.signInWithPassword({ email, password })
      : supabase.auth.signUp({ email, password });

    const { error } = await fn;
    setLoading(false);

    if (error) {
      setMsg({ text: error.message, kind: 'error' });
    } else if (mode === 'register') {
      setMsg({ text: 'Cuenta creada. Revisa tu correo para confirmar.', kind: 'success' });
      setMode('login');
    }
  };

  const msgColor = msg?.kind === 'error' ? T.red : T.grn;

  return (
    <div style={{
      minHeight: '100vh', background: T.bg, display: 'flex',
      alignItems: 'center', justifyContent: 'center', padding: 24,
      fontFamily: "-apple-system,'SF Pro Display',system-ui,sans-serif",
    }}>
      <div style={{
        background: T.sur, borderRadius: 24, padding: '40px 32px',
        width: '100%', maxWidth: 380, boxShadow: T.sh,
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            width: 64, height: 64, borderRadius: 18,
            background: T.accBg, display: 'flex', alignItems: 'center',
            justifyContent: 'center', margin: '0 auto 16px',
          }}>
            <span style={{ fontSize: 32 }}>🎓</span>
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, color: T.txt, fontFamily: T.mono }}>
            AsistenTEC
          </div>
          <div style={{ fontSize: 13, color: T.txt2, marginTop: 4 }}>
            {mode === 'login'    ? 'Inicia sesión para continuar'      : null}
            {mode === 'register' ? 'Crea tu cuenta académica'          : null}
            {mode === 'reset'    ? 'Recupera tu contraseña'            : null}
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 12 }}>
          <input
            style={st.input}
            type="email"
            placeholder="Correo electrónico"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
          {mode !== 'reset' && (
            <input
              style={st.input}
              type="password"
              placeholder="Contraseña"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              minLength={6}
            />
          )}

          {msg && (
            <div style={{
              background: msg.kind === 'error' ? T.redBg : T.grnBg,
              border: `1px solid ${msgColor}44`,
              borderRadius: 8, padding: '9px 12px',
              fontSize: 12, color: msgColor, lineHeight: 1.5,
            }}>
              {msg.text}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              ...st.primaryBtn(loading ? T.sur2 : T.acc, loading ? T.txt2 : '#fff'),
              padding: '12px 0', fontSize: 14, borderRadius: 12,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}
          >
            {loading && <Spinner size={16} color="#fff" />}
            {mode === 'login'    && 'Iniciar sesión'}
            {mode === 'register' && 'Crear cuenta'}
            {mode === 'reset'    && 'Enviar correo'}
          </button>
        </form>

        <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center' }}>
          {mode === 'login' && (
            <>
              <button
                style={{ background: 'none', border: 'none', color: T.acc, fontSize: 13, cursor: 'pointer' }}
                onClick={() => { setMode('register'); reset(); }}
              >
                ¿No tienes cuenta? Regístrate
              </button>
              <button
                style={{ background: 'none', border: 'none', color: T.txt3, fontSize: 12, cursor: 'pointer' }}
                onClick={() => { setMode('reset'); reset(); }}
              >
                Olvidé mi contraseña
              </button>
            </>
          )}
          {mode !== 'login' && (
            <button
              style={{ background: 'none', border: 'none', color: T.acc, fontSize: 13, cursor: 'pointer' }}
              onClick={() => { setMode('login'); reset(); }}
            >
              ← Volver al inicio de sesión
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
