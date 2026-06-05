/**
 * Thin wrapper around the Ollama local HTTP API.
 * Docs: https://github.com/ollama/ollama/blob/main/docs/api.md
 */

/**
 * @param {Array<{role:'user'|'assistant', content:string}>} messages
 * @param {string} systemPrompt
 * @param {{ model?: string, ollamaUrl?: string }} opts
 * @returns {Promise<string>}
 */
export async function callOllama(messages, systemPrompt, opts = {}) {
  const model     = opts.model     ?? 'llama3';
  const baseUrl   = opts.ollamaUrl ?? 'http://localhost:11434';
  const endpoint  = `${baseUrl}/api/chat`;

  const body = {
    model,
    stream: false,
    messages: [
      ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
      ...messages,
    ],
  };

  let res;
  try {
    res = await fetch(endpoint, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(body),
    });
  } catch (err) {
    throw new Error(
      `No se pudo conectar con Ollama en ${baseUrl}.\n` +
      'Asegúrate de que Ollama esté corriendo (ollama serve).'
    );
  }

  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`Ollama respondió con error ${res.status}: ${text}`);
  }

  const data = await res.json();
  return data?.message?.content ?? 'Sin respuesta.';
}

/**
 * Build the system prompt for AsistenTEC given current app state.
 */
export function buildSystemPrompt({ courses, pendingCount, overdueCount, urgentCount, assistantName, activeCourse }) {
  const name = assistantName || 'AsistenTEC';
  const courseList = courses.length
    ? courses.map(c => c.name).join(', ')
    : 'ninguno';

  const courseCtx = activeCourse
    ? `\nCurso activo en pantalla: ${activeCourse.name}${activeCourse.professor ? ` (Prof. ${activeCourse.professor})` : ''}.`
    : '';

  return (
    `Eres ${name}, un asistente académico inteligente para estudiantes del TEC (Tecnológico de Costa Rica).` +
    `\nCursos registrados: ${courseList}.` +
    `\nTareas pendientes: ${pendingCount}. Vencidas: ${overdueCount}. Urgentes (≤3 días): ${urgentCount}.` +
    courseCtx +
    `\nResponde siempre en español, de forma concisa, amigable y precisa. ` +
    `Si el estudiante necesita orientación académica, da consejos prácticos y concretos.`
  );
}
