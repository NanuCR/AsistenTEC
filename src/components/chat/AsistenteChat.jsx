import { useState, useRef, useEffect } from 'react';
import { Card, CardBody, Input, Button, Chip, ScrollShadow } from '@nextui-org/react';
import { useApp } from '../../context/AppContext';
import { callOllama, buildSystemPrompt } from '../../lib/ollama';
import { Spinner } from '../ui/Spinner';

const SUGGESTIONS = [
  '¿Qué tareas tengo esta semana?',
  'Analiza mi situación académica',
  '¿De qué tratan mis materiales subidos?',
  '¿Qué curso necesita más atención?',
  'Dame consejos para estudiar mejor',
  'Planifica mi semana',
];

export function AsistenteChat({ courses, tasks, grades, materials, config, messages, onMessages }) {
  const { dark, courseFilter, notify } = useApp();

  const [input,   setInput]  = useState('');
  const [loading, setLoad]   = useState(false);
  const endRef = useRef();

  const aName = config?.assistant_name || 'AsistenTEC';

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

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

    const userMsg = { role: 'user', content };
    const history = [...messages, userMsg];
    onMessages(history);

    const sys = buildSystemPrompt({
      courses, tasks, materials, grades,
      pendingCount:  pending.length,
      overdueCount:  overdue.length,
      urgentCount:   urgent.length,
      assistantName: aName,
      activeCourse,
    });

    try {
      const reply = await callOllama(history, sys, {
        model:     config?.ollama_model,
        ollamaUrl: config?.ollama_url,
      });
      onMessages([...history, { role: 'assistant', content: reply }]);
    } catch (e) {
      onMessages([...history, { role: 'assistant', content: `⚠ Error: ${e.message}` }]);
      notify('Error de Ollama: ' + e.message, 'danger');
    }
    setLoad(false);
  };

  // Count materials with analysis (AI can read these)
  const readableMats = materials.filter(m => m.analysis && !m.analyzing);

  return (
    <div className="flex flex-col gap-3 h-[calc(100vh-160px)] min-h-[500px]">
      {/* Context badge */}
      {readableMats.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <Chip size="sm" color="success" variant="flat" startContent={<span>🧠</span>}>
            La IA puede leer {readableMats.length} archivo{readableMats.length !== 1 ? 's' : ''} subido{readableMats.length !== 1 ? 's' : ''}
          </Chip>
          {activeCourse && (
            <Chip size="sm" color="primary" variant="flat">
              Filtro: {activeCourse.name}
            </Chip>
          )}
        </div>
      )}

      {/* Chat window */}
      <Card className={`flex-1 overflow-hidden ${dark ? 'bg-zinc-900 border border-zinc-800' : 'bg-white border border-zinc-200'}`} shadow="sm">
        <CardBody className="p-4 h-full overflow-hidden flex flex-col gap-0">
          <ScrollShadow className="flex-1 overflow-y-auto pr-1">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center py-8">
                <div className="text-5xl mb-3">🤖</div>
                <p className={`font-bold text-base font-mono mb-1 ${dark ? 'text-white' : 'text-zinc-900'}`}>{aName}</p>
                <p className={`text-xs mb-6 ${dark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                  IA local · Ollama · {config?.ollama_model ?? 'llama3'}
                </p>
                <div className="flex flex-wrap gap-2 justify-center">
                  {SUGGESTIONS.map(q => (
                    <Button key={q} size="sm" variant="flat" onPress={() => send(q)} className={`text-xs ${dark ? 'bg-zinc-800' : 'bg-zinc-100'}`}>
                      {q}
                    </Button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-3 pb-2">
                {messages.map((m, i) => (
                  <div key={i} className={`flex gap-2 items-end ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    {m.role === 'assistant' && (
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold font-mono flex-shrink-0 ${dark ? 'bg-blue-900/50 text-blue-400' : 'bg-blue-100 text-blue-600'}`}>
                        AT
                      </div>
                    )}
                    <div className={`max-w-[78%] px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                      m.role === 'user'
                        ? 'bg-blue-500 text-white rounded-[18px_18px_4px_18px]'
                        : dark
                          ? 'bg-zinc-800 text-zinc-100 rounded-[18px_18px_18px_4px]'
                          : 'bg-zinc-100 text-zinc-900 rounded-[18px_18px_18px_4px]'
                    }`}>
                      {m.content}
                    </div>
                  </div>
                ))}

                {loading && (
                  <div className="flex gap-2 items-end">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold font-mono flex-shrink-0 ${dark ? 'bg-blue-900/50 text-blue-400' : 'bg-blue-100 text-blue-600'}`}>
                      AT
                    </div>
                    <div className={`px-3.5 py-2.5 rounded-[18px_18px_18px_4px] flex items-center gap-2 ${dark ? 'bg-zinc-800' : 'bg-zinc-100'}`}>
                      <Spinner size={14} />
                      <span className={`text-xs ${dark ? 'text-zinc-400' : 'text-zinc-500'}`}>Pensando…</span>
                    </div>
                  </div>
                )}
                <div ref={endRef} />
              </div>
            )}
          </ScrollShadow>
        </CardBody>
      </Card>

      {/* Input bar */}
      <div className="flex gap-2">
        <Input
          placeholder={`Escribe a ${aName}…`}
          value={input}
          onValueChange={setInput}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
          disabled={loading}
          classNames={{ inputWrapper: dark ? 'bg-zinc-900 border-zinc-700' : 'bg-white border-zinc-200' }}
          className="flex-1"
        />
        <Button color="primary" isDisabled={loading || !input.trim()} onPress={() => send()} className="font-semibold">
          Enviar
        </Button>
        {messages.length > 0 && (
          <Button variant="flat" onPress={() => onMessages([])} className={dark ? 'bg-zinc-800' : 'bg-zinc-100'}>
            Limpiar
          </Button>
        )}
      </div>

      <p className={`text-xs text-center font-mono ${dark ? 'text-zinc-600' : 'text-zinc-400'}`}>
        {config?.ollama_model ?? 'llama3'} · {config?.ollama_url ?? 'http://localhost:11434'}
      </p>
    </div>
  );
}
