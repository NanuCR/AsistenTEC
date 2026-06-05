import { useState, useRef, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { getTheme, makeStyles } from '../../styles/theme';
import { callOllama, buildSystemPrompt } from '../../lib/ollama';
import { daysLeft } from '../../lib/utils';
import { Spinner } from '../ui/Spinner';

const SUGGESTIONS = [
  '¿Qué tareas tengo esta semana?',
  'Analiza mi situación académica',
  '¿Qué curso necesita más atención?',
  'Dame consejos para estudiar mejor',
  'Planifica mi semana',
];

export function AsistenteChat({ courses, tasks, grades, config, messages, onMessages }) {
  const { dark, courseFilter, notify } = useApp();
  const T  = getTheme(dark);
  const st = makeStyles(T);

  const [input,  setInput]  = useState('');
  const [loading, setLoad]  = useState(false);
  const endRef = useRef();

  const aName = config?.assistant_name || 'AsistenTEC';

  const scrollToBottom = () => endRef.current?.scrollIntoView({ behavior: 'smooth' });
  useEffect(scrollToBottom, [messages, loading]);

  const today   = new Date(new Date().toDateString());
  const in3     = new Date(); in3.setDate(today.getDate() + 3);
  const pending = tasks.filter(t => !t.done);
  const overdue = pending.filter(t => t.due_date && new Date(t.due_date) < today);
  const urgent  = pending.filter(t => t.due_date && !overdue.find(o => o.id === t.id) && new Date(t.due_date) <= in3);

  const activeCourse = courseFilter ? courses.find(c => c.id === courseFilter) : null;

  const send = async (text) => {
    const content = (text ?? input).trim();
    if (!content || loading) return;
    setInput('');
    setLoad(true);

    const userMsg  = { role: 'user', content };
    const history  = [...messages, userMsg];
    onMessages(history);

    const sys = buildSystemPrompt({
      courses, pendingCount: pending.length,
      overdueCount: overdue.length, urgentCount: urgent.length,
      assistantName: aName, activeCourse,
    });

    try {
      const reply = await callOllama(history, sys, {
        model:     config?.ollama_model,
        ollamaUrl: config?.ollama_url,
      });
      onMessages([...history, { role: 'assistant', content: reply }]);
    } catch (e) {
      onMessages([...history, { role: 'assistant', content: `⚠ Error: ${e.message}` }]);
      notify('Error de Ollama: ' + e.message, 'error');
    }
    setLoad(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {/* Chat window */}
      <div style={{
        ...st.card({ padding: 14, height: 420, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12 }),
      }}>
        {messages.length === 0 && (
          <div style={{ margin: 'auto', textAlign: 'center', padding: 16 }}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>🤖</div>
            <div style={{ fontFamily: T.mono, fontSize: 16, fontWeight: 800, color: T.txt, marginBottom: 4 }}>{aName}</div>
            <div style={{ fontSize: 12, color: T.txt3, marginBottom: 20 }}>Tu asistente académico · Ollama</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center' }}>
              {SUGGESTIONS.map(q => (
                <button key={q} style={{ ...st.primaryBtn(T.sur2, T.txt), fontSize: 11 }} onClick={() => send(q)}>
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} style={{
            display: 'flex',
            justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start',
            gap: 8, alignItems: 'flex-end',
          }}>
            {m.role === 'assistant' && (
              <div style={{
                width: 28, height: 28, borderRadius: '50%',
                background: T.accBg, display: 'flex', alignItems: 'center',
                justifyContent: 'center', fontSize: 11, fontFamily: T.mono,
                color: T.acc, flexShrink: 0, fontWeight: 800,
              }}>
                AT
              </div>
            )}
            <div style={{
              maxWidth: '78%',
              background: m.role === 'user' ? T.acc : T.sur2,
              borderRadius: m.role === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
              padding: '9px 14px', fontSize: 13, lineHeight: 1.65,
              color: m.role === 'user' ? '#fff' : T.txt,
              whiteSpace: 'pre-wrap',
            }}>
              {m.content}
            </div>
          </div>
        ))}

        {loading && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: T.accBg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontFamily: T.mono, color: T.acc, fontWeight: 800 }}>AT</div>
            <div style={{ background: T.sur2, borderRadius: '18px 18px 18px 4px', padding: '9px 14px', display: 'flex', gap: 6, alignItems: 'center' }}>
              <Spinner size={14} />
              <span style={{ fontSize: 12, color: T.txt2 }}>Pensando…</span>
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {/* Input bar */}
      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        <input
          style={{ ...st.input, flex: 1, borderRadius: 20 }}
          placeholder={`Escribe a ${aName}…`}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
          disabled={loading}
        />
        <button
          style={st.primaryBtn(loading ? T.sur2 : T.acc, loading ? T.txt2 : '#fff')}
          onClick={() => send()}
          disabled={loading}
        >
          Enviar
        </button>
        {messages.length > 0 && (
          <button style={st.ghostBtn()} onClick={() => onMessages([])}>Limpiar</button>
        )}
      </div>

      {/* Ollama status hint */}
      <div style={{ marginTop: 8, fontSize: 10, color: T.txt3, fontFamily: T.mono, textAlign: 'center' }}>
        Modelo: {config?.ollama_model ?? 'llama3'} · {config?.ollama_url ?? 'http://localhost:11434'}
      </div>
    </div>
  );
}
