import { useState, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { getTheme, makeStyles } from '../../styles/theme';
import { fmtBytes, readFileForUpload, downloadText } from '../../lib/utils';
import { callOllama } from '../../lib/ollama';
import { SkeletonList } from '../ui/Skeleton';
import { Spinner } from '../ui/Spinner';

export function FileManager({ userId, courses, materials, loading, config, onAdd, onUpdate, onRemove, getDownloadUrl, uploadFile }) {
  const { dark, courseFilter, notify } = useApp();
  const T  = getTheme(dark);
  const st = makeStyles(T);

  const fileRef = useRef();
  const [form,     setForm]    = useState({ course_id: courseFilter ?? '', week: '', note: '', files: [] });
  const [uploading, setUpl]    = useState(false);
  const [expanded,  setExp]    = useState({});

  const byId = id => courses.find(c => c.id === id);

  const handleUpload = async () => {
    if (!form.course_id || !form.files.length) {
      notify('Selecciona un curso y al menos un archivo.', 'warn');
      return;
    }
    setUpl(true);

    for (const file of form.files) {
      const fd = await readFileForUpload(file);

      // Insert placeholder row immediately (analyzing = true)
      const { data: mat, error: insertErr } = await onAdd({
        course_id:    form.course_id,
        name:         file.name,
        week:         form.week ? parseInt(form.week, 10) : null,
        note:         form.note || null,
        file_size:    fd.size,
        file_type:    fd.type,
        storage_path: null,
        analyzing:    true,
        analysis:     null,
      });

      if (insertErr) { notify(`Error al guardar ${file.name}: ${insertErr.message}`, 'error'); continue; }

      // Upload to Supabase Storage in parallel
      let storagePath = null;
      if (fd.url) {
        const { path, error: stErr } = await uploadFile(userId, file);
        if (!stErr) storagePath = path;
      }

      // AI Analysis via Ollama
      const prompt =
        `Analiza el material académico "${file.name}"` +
        (form.week ? ` (Semana ${form.week})` : '') +
        (form.note  ? `. Contexto: ${form.note}` : '') +
        '.\n\nContenido:\n' + (fd.preview || '[Sin contenido de texto]') +
        '\n\nOrganiza la respuesta en español con estas secciones:\n' +
        '## 📌 Temas principales\n## 🔑 Conceptos clave\n' +
        '## 📋 Tareas o actividades (con fechas si hay)\n' +
        '## 📚 Puntos a estudiar\n## 💡 Resumen ejecutivo';

      let analysis = null;
      try {
        analysis = await callOllama(
          [{ role: 'user', content: prompt }],
          'Eres un asistente académico. Analiza el material y responde en español.',
          { model: config?.ollama_model, ollamaUrl: config?.ollama_url }
        );
      } catch (e) {
        analysis = `⚠ Análisis no disponible: ${e.message}`;
      }

      await onUpdate(mat.id, { analysis, analyzing: false, storage_path: storagePath });
    }

    setForm(p => ({ ...p, files: [] }));
    if (fileRef.current) fileRef.current.value = '';
    setUpl(false);
    notify(`${form.files.length} archivo(s) procesado(s).`, 'success');
  };

  const handleDownload = async (m) => {
    if (m.storage_path) {
      const { url, error } = await getDownloadUrl(m.storage_path);
      if (url) { window.open(url, '_blank', 'noopener'); return; }
      if (error) notify('Error al obtener URL: ' + error.message, 'error');
    }
    if (m.analysis) { downloadText(`${m.name}.analisis.txt`, m.analysis); return; }
    notify('Archivo no disponible para descarga.', 'warn');
  };

  if (loading) return <SkeletonList rows={3} />;

  // Group materials by course, then by week
  const byCourse = courses.reduce((acc, c) => {
    const mats = materials.filter(m => m.course_id === c.id);
    if (mats.length) acc[c.id] = mats;
    return acc;
  }, {});

  return (
    <div>
      {/* Upload form */}
      <div style={st.card()}>
        <div style={st.label()}>Subir material</div>
        {courses.length === 0 ? (
          <div style={{ fontSize: 12, color: T.txt2, fontFamily: T.mono }}>Agrega cursos primero.</div>
        ) : (
          <div style={{ display: 'grid', gap: 8 }}>
            <select
              style={st.input}
              value={form.course_id}
              onChange={e => setForm(p => ({ ...p, course_id: e.target.value }))}
            >
              <option value=''>-- Selecciona curso --</option>
              {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <input style={st.input} placeholder="Semana (ej: 7)" value={form.week} onChange={e => setForm(p => ({ ...p, week: e.target.value }))} />
              <input style={st.input} placeholder="Contexto (ej: Examen parcial 1)" value={form.note} onChange={e => setForm(p => ({ ...p, note: e.target.value }))} />
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <input ref={fileRef} type='file' multiple style={{ display: 'none' }} onChange={e => setForm(p => ({ ...p, files: Array.from(e.target.files) }))} />
              <button style={st.primaryBtn(T.sur2, T.txt)} onClick={() => fileRef.current.click()}>
                Seleccionar archivos
              </button>
              {form.files.length > 0 && (
                <span style={{ fontSize: 12, color: T.acc, fontFamily: T.mono }}>{form.files.length} seleccionado(s)</span>
              )}
            </div>
            {form.files.length > 0 && (
              <div style={{ background: T.sur2, borderRadius: 8, padding: '8px 12px' }}>
                {form.files.map((f, i) => (
                  <div key={i} style={{ fontSize: 12, color: T.txt2, padding: '2px 0' }}>
                    📄 {f.name} <span style={{ color: T.txt3, fontFamily: T.mono }}>({fmtBytes(f.size)})</span>
                  </div>
                ))}
              </div>
            )}
            <button
              style={st.primaryBtn(uploading ? T.sur2 : T.acc, uploading ? T.txt2 : '#fff', {
                display: 'flex', alignItems: 'center', gap: 8,
              })}
              onClick={handleUpload}
              disabled={uploading}
            >
              {uploading && <Spinner size={14} color={T.txt2} />}
              {uploading ? 'Analizando con IA…' : 'Subir y analizar'}
            </button>
          </div>
        )}
      </div>

      {!Object.keys(byCourse).length && (
        <div style={st.card({ padding: 24, textAlign: 'center', color: T.txt2, fontFamily: T.mono, fontSize: 12 })}>
          No hay archivos subidos aún.
        </div>
      )}

      {courses.map(c => {
        const mats = byCourse[c.id];
        if (!mats) return null;

        // Group by week
        const byWk = mats.reduce((acc, m) => {
          const k = m.week ? String(m.week) : '_';
          if (!acc[k]) acc[k] = [];
          acc[k].push(m);
          return acc;
        }, {});
        const weeks = Object.keys(byWk).sort((a, b) => {
          if (a === '_') return 1;
          if (b === '_') return -1;
          return parseInt(a) - parseInt(b);
        });

        return (
          <div key={c.id} style={st.card()}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: c.color, flexShrink: 0 }} />
              <div style={{ fontFamily: T.mono, fontSize: 12, fontWeight: 700, color: T.txt, flex: 1 }}>{c.name}</div>
              <span style={{ fontSize: 10, color: T.txt3, fontFamily: T.mono }}>{mats.length} archivo{mats.length !== 1 ? 's' : ''}</span>
            </div>

            {weeks.map(wk => (
              <div key={wk} style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 10, fontFamily: T.mono, fontWeight: 600, color: T.txt3, letterSpacing: 0.8, marginBottom: 6, paddingBottom: 4, borderBottom: `1px solid ${T.brd}` }}>
                  {wk === '_' ? 'Sin semana asignada' : `── Semana ${wk}`}
                </div>
                {byWk[wk].map(m => (
                  <MaterialRow
                    key={m.id}
                    m={m}
                    T={T} st={st}
                    expanded={!!expanded[m.id]}
                    onToggle={() => setExp(p => ({ ...p, [m.id]: !p[m.id] }))}
                    onDownload={() => handleDownload(m)}
                    onRemove={() => onRemove(m.id)}
                  />
                ))}
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}

function MaterialRow({ m, T, st, expanded, onToggle, onDownload, onRemove }) {
  return (
    <div style={{ marginBottom: 6 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: expanded ? '10px 10px 0 0' : 10, background: T.sur2 }}>
        <div style={{ fontSize: 18, flexShrink: 0 }}>📄</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: T.txt, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.name}</div>
          <div style={{ fontSize: 10, color: T.txt3, fontFamily: T.mono, marginTop: 1 }}>
            {new Date(m.created_at).toLocaleDateString('es-CR')}
            {m.file_size ? ` · ${fmtBytes(m.file_size)}` : ''}
            {m.note ? ` · ${m.note}` : ''}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 5, flexShrink: 0, alignItems: 'center' }}>
          {m.analyzing && <span style={{ fontSize: 10, color: T.org, fontFamily: T.mono, display: 'flex', alignItems: 'center', gap: 4 }}><Spinner size={10} color={T.org} /> analizando</span>}
          {m.analysis && !m.analyzing && (
            <button style={st.ghostBtn({ color: T.acc })} onClick={onToggle}>
              {expanded ? 'cerrar' : 'análisis'}
            </button>
          )}
          <button style={st.ghostBtn({ color: T.grn })} onClick={onDownload}>↓</button>
          <button style={st.dangerBtn()} onClick={onRemove}>✕</button>
        </div>
      </div>
      {expanded && m.analysis && (
        <div style={{ background: T.sur2, borderRadius: '0 0 10px 10px', padding: '10px 14px', borderTop: `1px solid ${T.brd}` }}>
          <pre style={{ whiteSpace: 'pre-wrap', fontSize: 11, lineHeight: 1.8, color: T.txt2, fontFamily: 'inherit', margin: 0 }}>
            {m.analysis}
          </pre>
        </div>
      )}
    </div>
  );
}
