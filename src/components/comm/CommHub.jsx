import { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { getTheme, makeStyles } from '../../styles/theme';
import { openGoogleCalendar, openMailto } from '../../lib/utils';
import { callOllama } from '../../lib/ollama';
import { Spinner } from '../ui/Spinner';

export function CommHub({ courses, config, pastedContent, onPasteChange, pasteAnalysis, onPasteAnalysis }) {
  const { dark, notify } = useApp();
  const T  = getTheme(dark);
  const st = makeStyles(T);

  const [draft, setDraft]   = useState({ cid: '', purpose: '', to: '', subject: '', body: '' });
  const [calForm, setCalF]  = useState({ title: '', date: '', desc: '', cid: '' });
  const [aiLoading, setAiL] = useState(false);
  const [pasteLoading, setPlL] = useState(false);

  const byId = id => courses.find(c => c.id === id);

  // ── Email Draft ──────────────────────────────────────────────
  const genEmail = async () => {
    if (!draft.cid || !draft.purpose.trim()) { notify('Selecciona curso y escribe el propósito.', 'warn'); return; }
    const course = byId(draft.cid);
    setAiL(true);
    const prompt =
      `Redacta un correo académico formal en español.\n` +
      `Destinatario: Prof. ${course?.professor || 'del curso'}\n` +
      `Curso: ${course?.name ?? ''}\n` +
      (course?.email ? `Correo del profesor: ${course.email}\n` : '') +
      (config?.my_email ? `De parte de: ${config.my_email}\n` : '') +
      `Propósito: ${draft.purpose}\n\n` +
      `Formato de respuesta:\nAsunto: [asunto claro]\n---\n[Cuerpo del correo formal]\n\nAtentamente,\n[Nombre del estudiante]`;

    let reply = '';
    try {
      reply = await callOllama(
        [{ role: 'user', content: prompt }],
        'Eres un asistente de redacción académica. Responde SOLO con el correo formateado.',
        { model: config?.ollama_model, ollamaUrl: config?.ollama_url }
      );
    } catch (e) {
      notify('Error al generar: ' + e.message, 'error');
      setAiL(false);
      return;
    }

    const lines   = reply.split('\n');
    const subjLine = lines.find(l => l.toLowerCase().startsWith('asunto:'));
    const subj    = subjLine ? subjLine.replace(/asunto:/i, '').trim() : `Consulta — ${course?.name ?? ''}`;
    const body    = lines.filter(l => !l.toLowerCase().startsWith('asunto:') && l.trim() !== '---').join('\n').trim();

    setDraft(p => ({ ...p, to: course?.email ?? '', subject: subj, body }));
    setAiL(false);
    notify('Correo generado.', 'success');
  };

  const handleSend = () => {
    if (!draft.to.trim()) { notify('Ingresa el correo destinatario.', 'warn'); return; }
    openMailto(draft.to, draft.subject, draft.body);
    notify('Abriendo cliente de correo…', 'success');
  };

  // ── Paste Analysis ───────────────────────────────────────────
  const analyzeContent = async () => {
    if (!pastedContent.trim()) return;
    setPlL(true);
    try {
      const result = await callOllama(
        [{
          role: 'user',
          content:
            'Analiza este contenido académico del Tec Digital y extrae en español:\n' +
            '- Tareas con fechas de entrega\n- Anuncios importantes\n' +
            '- Calificaciones o evaluaciones\n- Eventos o reuniones\n- Otra información clave\n\n' +
            pastedContent,
        }],
        'Eres un asistente académico. Extrae y organiza la información relevante.',
        { model: config?.ollama_model, ollamaUrl: config?.ollama_url }
      );
      onPasteAnalysis(result);
    } catch (e) {
      notify('Error de análisis: ' + e.message, 'error');
    }
    setPlL(false);
  };

  return (
    <div>
      {/* ── Email Generator ───────────────────────────────── */}
      <div style={st.card()}>
        <div style={st.label()}>Redactar correo con IA</div>
        {courses.length === 0 ? (
          <div style={{ fontSize: 12, color: T.txt2, fontFamily: T.mono }}>Agrega cursos primero.</div>
        ) : (
          <div style={{ display: 'grid', gap: 8 }}>
            <select style={st.input} value={draft.cid} onChange={e => setDraft(p => ({ ...p, cid: e.target.value }))}>
              <option value=''>-- Selecciona curso --</option>
              {courses.map(c => <option key={c.id} value={c.id}>{c.name}{c.professor ? ` — Prof. ${c.professor}` : ''}</option>)}
            </select>
            <textarea
              style={{ ...st.input, height: 60, resize: 'none' }}
              placeholder="Propósito del correo (ej: consultar fecha de entrega, pedir prórroga…)"
              value={draft.purpose}
              onChange={e => setDraft(p => ({ ...p, purpose: e.target.value }))}
            />
            <button
              style={{ ...st.primaryBtn(aiLoading ? T.sur2 : T.acc, aiLoading ? T.txt2 : '#fff'), display: 'flex', alignItems: 'center', gap: 8 }}
              onClick={genEmail} disabled={aiLoading}
            >
              {aiLoading && <Spinner size={14} color={T.txt2} />}
              {aiLoading ? 'Generando…' : 'Generar con IA (Ollama)'}
            </button>
          </div>
        )}
      </div>

      {/* ── Generated Draft ───────────────────────────────── */}
      {draft.body && (
        <div style={st.card({ border: `1px solid ${T.acc}33` })}>
          <div style={st.label()}>Correo generado — editar y enviar</div>
          <div style={{ display: 'grid', gap: 8, marginBottom: 10 }}>
            <input style={st.input} placeholder="Para (correo del destinatario)" value={draft.to}      onChange={e => setDraft(p => ({ ...p, to:      e.target.value }))} type="email" />
            <input style={st.input} placeholder="Asunto"                        value={draft.subject}  onChange={e => setDraft(p => ({ ...p, subject: e.target.value }))} />
            <textarea style={{ ...st.input, height: 160, resize: 'vertical' }} value={draft.body} onChange={e => setDraft(p => ({ ...p, body: e.target.value }))} />
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button style={st.primaryBtn(T.grn)} onClick={handleSend}>Enviar correo →</button>
            <button
              style={st.primaryBtn(T.sur2, T.txt)}
              onClick={() => {
                navigator.clipboard?.writeText(`Asunto: ${draft.subject}\n\n${draft.body}`);
                notify('Copiado al portapapeles.', 'success');
              }}
            >
              Copiar
            </button>
          </div>
        </div>
      )}

      {/* ── Google Calendar ───────────────────────────────── */}
      <div style={st.card()}>
        <div style={st.label()}>Añadir evento a Google Calendar</div>
        <div style={{ display: 'grid', gap: 8 }}>
          <input style={st.input} placeholder="Título del evento *" value={calForm.title} onChange={e => setCalF(p => ({ ...p, title: e.target.value }))} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <input type='date' style={st.input} value={calForm.date} onChange={e => setCalF(p => ({ ...p, date: e.target.value }))} />
            {courses.length > 0 && (
              <select style={st.input} value={calForm.cid} onChange={e => setCalF(p => ({ ...p, cid: e.target.value }))}>
                <option value=''>Sin curso</option>
                {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            )}
          </div>
          <input style={st.input} placeholder="Descripción opcional" value={calForm.desc} onChange={e => setCalF(p => ({ ...p, desc: e.target.value }))} />
          <button
            style={st.primaryBtn(T.acc)}
            onClick={() => {
              if (!calForm.title || !calForm.date) { notify('Completa título y fecha.', 'warn'); return; }
              const c2  = calForm.cid ? byId(calForm.cid) : null;
              const desc = (c2 ? `Curso: ${c2.name}\n` : '') + calForm.desc;
              openGoogleCalendar(calForm.title, calForm.date, desc);
              notify('Abriendo Google Calendar…', 'info');
            }}
          >
            Añadir al calendario →
          </button>
        </div>
      </div>

      {/* ── Paste Analyzer ────────────────────────────────── */}
      <div style={st.card()}>
        <div style={st.label()}>Analizar contenido del Tec Digital</div>
        <textarea
          style={{ ...st.input, height: 96, resize: 'vertical', marginBottom: 8 }}
          placeholder="Pega aquí contenido del Tec Digital (anuncios, tareas, notas del portal)…"
          value={pastedContent}
          onChange={e => onPasteChange(e.target.value)}
        />
        <button
          style={{ ...st.primaryBtn(pasteLoading ? T.sur2 : T.prp, pasteLoading ? T.txt2 : '#fff'), display: 'flex', alignItems: 'center', gap: 8 }}
          onClick={analyzeContent} disabled={pasteLoading}
        >
          {pasteLoading && <Spinner size={14} color={T.txt2} />}
          {pasteLoading ? 'Analizando…' : 'Analizar con IA (Ollama)'}
        </button>
        {pasteAnalysis && (
          <pre style={{ whiteSpace: 'pre-wrap', fontSize: 12, lineHeight: 1.75, color: T.txt2, marginTop: 12, fontFamily: 'inherit', background: T.sur2, padding: 12, borderRadius: 10 }}>
            {pasteAnalysis}
          </pre>
        )}
      </div>
    </div>
  );
}
