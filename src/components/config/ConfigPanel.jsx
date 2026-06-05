import { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { getTheme, makeStyles } from '../../styles/theme';
import { downloadText } from '../../lib/utils';
import { Spinner } from '../ui/Spinner';

const OLLAMA_MODELS = ['llama3', 'llama3.1', 'mistral', 'mixtral', 'gemma2', 'qwen2', 'phi3'];

export function ConfigPanel({ config, onSave, courses, tasks, notes, grades }) {
  const { dark, notify, setDark } = useApp();
  const T  = getTheme(dark);
  const st = makeStyles(T);

  const [form,      setForm]     = useState({ ...config });
  const [saving,    setSaving]   = useState(false);
  const [whState,   setWhState]  = useState('idle'); // 'idle'|'testing'|'ok'|'error'
  const [ollamaOk,  setOllamaOk] = useState(null);   // null|true|false
  const [checking,  setChecking] = useState(false);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSave = async () => {
    setSaving(true);
    const { error } = await onSave(form);
    setSaving(false);
    if (error) notify('Error al guardar: ' + error.message, 'error');
    else {
      notify('Configuración guardada.', 'success');
      // Sync dark mode with Supabase-backed value
      setDark(form.dark_mode);
    }
  };

  const testWebhook = async () => {
    if (!form.webhook_url) { notify('Ingresa una URL de webhook.', 'warn'); return; }
    setWhState('testing');
    try {
      const r = await fetch(form.webhook_url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'test', source: 'AsistenTEC',
          timestamp: new Date().toISOString(),
          courses: courses.length,
          pendingTasks: tasks.filter(t => !t.done).length,
        }),
      });
      setWhState(r.ok ? 'ok' : 'error');
      notify(r.ok ? 'Webhook funcionando.' : `Error ${r.status}`, r.ok ? 'success' : 'error');
    } catch {
      setWhState('error');
      notify('No se pudo conectar al webhook.', 'error');
    }
  };

  const checkOllama = async () => {
    setChecking(true);
    try {
      const r = await fetch(`${form.ollama_url}/api/version`);
      setOllamaOk(r.ok);
      notify(r.ok ? 'Ollama está corriendo.' : 'Ollama respondió con error.', r.ok ? 'success' : 'error');
    } catch {
      setOllamaOk(false);
      notify('No se puede conectar con Ollama. ¿Está corriendo?', 'error');
    }
    setChecking(false);
  };

  const exportData = () => {
    const payload = { courses, tasks, notes, grades, config, exportedAt: new Date().toISOString() };
    downloadText(`asistentec-backup-${Date.now()}.json`, JSON.stringify(payload, null, 2));
    notify('Datos exportados.', 'success');
  };

  return (
    <div>
      {/* ── Asistente ──────────────────────────────────── */}
      <div style={st.card()}>
        <div style={st.label()}>Asistente</div>
        <label style={{ fontSize: 12, color: T.txt2, display: 'block', marginBottom: 4, fontFamily: T.mono }}>
          Nombre del asistente
        </label>
        <input style={st.input} value={form.assistant_name ?? ''} onChange={e => set('assistant_name', e.target.value)} placeholder='AsistenTEC' />

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 14 }}>
          <label style={{ fontSize: 12, color: T.txt2, fontFamily: T.mono, display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={!!form.dark_mode}
              onChange={e => set('dark_mode', e.target.checked)}
              style={{ accentColor: T.acc, width: 16, height: 16 }}
            />
            Modo oscuro por defecto
          </label>
        </div>
      </div>

      {/* ── Correo ─────────────────────────────────────── */}
      <div style={st.card()}>
        <div style={st.label()}>Correo electrónico</div>
        <label style={{ fontSize: 12, color: T.txt2, display: 'block', marginBottom: 4, fontFamily: T.mono }}>
          Tu correo (aparece como remitente en los borradores)
        </label>
        <input style={{ ...st.input, marginBottom: 10 }} type='email' value={form.my_email ?? ''} onChange={e => set('my_email', e.target.value)} placeholder='tu@correo.com' />
        <div style={{ background: T.accBg, borderRadius: 8, padding: '10px 12px', fontSize: 12, color: T.txt2, lineHeight: 1.65 }}>
          <strong style={{ color: T.acc, fontFamily: T.mono, fontSize: 11, letterSpacing: 0.8, display: 'block', marginBottom: 4 }}>
            CÓMO FUNCIONA EL ENVÍO
          </strong>
          Los correos se abren en tu cliente nativo (Gmail, Outlook, Apple Mail) con todos los campos pre-llenados.
          No se requiere contraseña ni configuración adicional.
        </div>
      </div>

      {/* ── Ollama ─────────────────────────────────────── */}
      <div style={st.card()}>
        <div style={st.label()}>IA Local — Ollama</div>
        <div style={{ display: 'grid', gap: 8 }}>
          <div>
            <label style={{ fontSize: 11, color: T.txt3, fontFamily: T.mono, display: 'block', marginBottom: 4 }}>URL de Ollama</label>
            <input style={st.input} value={form.ollama_url ?? ''} onChange={e => set('ollama_url', e.target.value)} placeholder='http://localhost:11434' />
          </div>
          <div>
            <label style={{ fontSize: 11, color: T.txt3, fontFamily: T.mono, display: 'block', marginBottom: 4 }}>Modelo</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 8 }}>
              <select style={st.input} value={form.ollama_model ?? 'llama3'} onChange={e => set('ollama_model', e.target.value)}>
                {OLLAMA_MODELS.map(m => <option key={m} value={m}>{m}</option>)}
                <option value='__custom'>Personalizado…</option>
              </select>
              {form.ollama_model === '__custom' && (
                <input style={st.input} placeholder="nombre-del-modelo" onChange={e => set('ollama_model', e.target.value)} />
              )}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button
              style={{ ...st.primaryBtn(T.prp), display: 'flex', alignItems: 'center', gap: 6 }}
              onClick={checkOllama} disabled={checking}
            >
              {checking && <Spinner size={13} color="#fff" />}
              {checking ? 'Verificando…' : 'Verificar conexión'}
            </button>
            {ollamaOk === true  && <span style={{ fontSize: 12, color: T.grn, fontFamily: T.mono }}>✓ Ollama activo</span>}
            {ollamaOk === false && <span style={{ fontSize: 12, color: T.red, fontFamily: T.mono }}>✕ Sin conexión</span>}
          </div>
        </div>

        <div style={{ background: T.sur2, borderRadius: 8, padding: '10px 12px', marginTop: 12 }}>
          <div style={{ fontSize: 11, color: T.txt3, fontFamily: T.mono, marginBottom: 4, fontWeight: 600 }}>PARA EMPEZAR</div>
          <pre style={{ fontSize: 11, color: T.txt2, margin: 0, fontFamily: T.mono, lineHeight: 1.7 }}>
{`# Instalar Ollama:
# https://ollama.com/download

ollama serve          # inicia el servidor
ollama pull llama3    # descarga el modelo`}
          </pre>
        </div>
      </div>

      {/* ── Webhook ────────────────────────────────────── */}
      <div style={st.card()}>
        <div style={st.label()}>Webhook / n8n / Zapier</div>
        <label style={{ fontSize: 12, color: T.txt2, display: 'block', marginBottom: 4, fontFamily: T.mono }}>URL del webhook</label>
        <input style={{ ...st.input, marginBottom: 8 }} value={form.webhook_url ?? ''} onChange={e => set('webhook_url', e.target.value)} placeholder='https://hooks.n8n.io/...' />
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
          <button style={st.primaryBtn(T.prp)} onClick={testWebhook} disabled={whState === 'testing'}>
            {whState === 'testing' ? 'Probando…' : 'Probar conexión'}
          </button>
          {whState === 'ok'    && <span style={{ fontSize: 12, color: T.grn, fontFamily: T.mono }}>✓ Exitoso</span>}
          {whState === 'error' && <span style={{ fontSize: 12, color: T.red, fontFamily: T.mono }}>✕ Error</span>}
        </div>
      </div>

      {/* ── Calendar ───────────────────────────────────── */}
      <div style={st.card()}>
        <div style={st.label()}>Google Calendar</div>
        <label style={{ fontSize: 12, color: T.txt2, display: 'block', marginBottom: 4, fontFamily: T.mono }}>Nota de referencia (opcional)</label>
        <input style={st.input} value={form.cal_hint ?? ''} onChange={e => set('cal_hint', e.target.value)} placeholder='Ej: Calendario académico TEC' />
      </div>

      {/* ── Save & Export ──────────────────────────────── */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
        <button
          style={{ ...st.primaryBtn(saving ? T.sur2 : T.acc, saving ? T.txt2 : '#fff'), display: 'flex', alignItems: 'center', gap: 6 }}
          onClick={handleSave} disabled={saving}
        >
          {saving && <Spinner size={13} color={T.txt2} />}
          {saving ? 'Guardando…' : 'Guardar configuración'}
        </button>
        <button style={st.primaryBtn(T.sur2, T.txt)} onClick={exportData}>
          Exportar datos JSON
        </button>
      </div>
    </div>
  );
}
