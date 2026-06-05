/**
 * Thin wrapper around the Ollama local HTTP API.
 * Docs: https://github.com/ollama/ollama/blob/main/docs/api.md
 */

export async function callOllama(messages, systemPrompt, opts = {}) {
  const model    = opts.model     ?? 'llama3';
  const baseUrl  = opts.ollamaUrl ?? 'http://localhost:11434';
  const endpoint = `${baseUrl}/api/chat`;

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
 * Build the system prompt enriched with file analyses and grades context.
 * @param {object} params
 * @param {Array}  params.courses
 * @param {Array}  params.tasks
 * @param {Array}  params.materials   - all loaded materials (with analysis field)
 * @param {Array}  params.grades
 * @param {number} params.pendingCount
 * @param {number} params.overdueCount
 * @param {number} params.urgentCount
 * @param {string} params.assistantName
 * @param {object} params.activeCourse
 */
export function buildSystemPrompt({
  courses = [], tasks = [], materials = [], grades = [],
  pendingCount = 0, overdueCount = 0, urgentCount = 0,
  assistantName = 'AsistenTEC', activeCourse = null,
}) {
  const name       = assistantName || 'AsistenTEC';
  const courseList = courses.length ? courses.map(c => c.name).join(', ') : 'ninguno';

  // ── Course context ──────────────────────────────────────────
  const courseCtx = activeCourse
    ? `\nCurso activo: ${activeCourse.name}${activeCourse.professor ? ` (Prof. ${activeCourse.professor})` : ''}.`
    : '';

  // ── Materials/files context ─────────────────────────────────
  let materialsCtx = '';
  const relevantMats = activeCourse
    ? materials.filter(m => m.course_id === activeCourse.id && m.analysis)
    : materials.filter(m => m.analysis);

  if (relevantMats.length) {
    materialsCtx = '\n\n=== MATERIALES SUBIDOS (para responder preguntas sobre el contenido) ===\n';
    relevantMats.forEach(m => {
      const course = courses.find(c => c.id === m.course_id);
      materialsCtx +=
        `\n--- ${m.name}${course ? ` [${course.name}]` : ''}${m.week ? ` Semana ${m.week}` : ''} ---\n` +
        (m.analysis ?? '') + '\n';
    });
    materialsCtx += '=== FIN MATERIALES ===\n';
  }

  // ── Grades context ──────────────────────────────────────────
  let gradesCtx = '';
  if (grades.length) {
    gradesCtx = '\n\nCalificaciones registradas:\n';
    courses.forEach(c => {
      const cg = grades.filter(g => g.course_id === c.id);
      if (!cg.length) return;
      const totalW = cg.reduce((a, g) => a + parseFloat(g.weight ?? 100), 0);
      const earned = cg.reduce((a, g) => {
        const pct = parseFloat(g.score) / parseFloat(g.max_points ?? 100);
        return a + pct * parseFloat(g.weight ?? 100);
      }, 0);
      const avg = totalW > 0 ? (earned / totalW * 100).toFixed(1) : '?';
      gradesCtx += `• ${c.name}: ${avg}% promedio (${cg.length} evaluaciones, ${totalW.toFixed(0)}% del curso evaluado)\n`;
    });
  }

  return (
    `Eres ${name}, asistente académico IA para estudiantes del TEC (Tecnológico de Costa Rica).` +
    `\nCORRES EN LOCAL vía Ollama — no eres Claude, no eres ChatGPT, eres ${name}.` +
    `\nCursos: ${courseList}. Pendientes: ${pendingCount}. Vencidas: ${overdueCount}. Urgentes (≤3d): ${urgentCount}.` +
    courseCtx +
    gradesCtx +
    materialsCtx +
    `\n\nResponde en español, de forma concisa, precisa y amigable. ` +
    `Si tienes material subido disponible, úsalo para responder con información específica del curso.`
  );
}
