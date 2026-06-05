import { useState, useRef, useMemo } from 'react';
import {
  Card, CardBody, CardHeader, Input, Button, Chip,
  Divider, Tooltip, Progress, Select, SelectItem, Tabs, Tab,
} from '@nextui-org/react';
import { useApp } from '../../context/AppContext';
import { fmtBytes, readFileForUpload } from '../../lib/utils';
import { callOllama } from '../../lib/ollama';
import { Spinner } from '../ui/Spinner';
import { SkeletonList } from '../ui/Skeleton';

// ── Icons (inline SVG to avoid extra deps) ────────────────────
const Icon = ({ d, size = 16, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);

const ICONS = {
  folder:   'M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z',
  file:     'M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z M13 2v7h7',
  download: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4 M7 10l5 5 5-5 M12 15V3',
  trash:    'M3 6h18 M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2',
  search:   'M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16z M21 21l-4.35-4.35',
  grid:     'M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z',
  list:     'M8 6h13 M8 12h13 M8 18h13 M3 6h.01 M3 12h.01 M3 18h.01',
  brain:    'M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96-.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 4.44-1.66z M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96-.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-4.44-1.66z',
};

const FILE_EMOJI = (type = '') => {
  if (type.includes('pdf'))   return '📄';
  if (type.includes('image')) return '🖼';
  if (type.includes('video')) return '🎬';
  if (type.includes('audio')) return '🎵';
  if (type.includes('zip') || type.includes('rar')) return '📦';
  if (type.includes('text') || type.includes('plain')) return '📝';
  if (type.includes('word') || type.includes('document')) return '📃';
  if (type.includes('sheet') || type.includes('excel')) return '📊';
  if (type.includes('presentation') || type.includes('powerpoint')) return '📑';
  return '📎';
};

export function FileExplorer({
  userId, courses, materials, loading, config,
  onAdd, onUpdate, onRemove, uploadFile, getDownloadUrl,
}) {
  const { dark, courseFilter, notify } = useApp();

  const fileRef   = useRef();
  const [search,    setSearch]    = useState('');
  const [viewMode,  setViewMode]  = useState('list'); // 'list' | 'grid'
  const [selected,  setSelected]  = useState(null);   // selected material id
  const [uploading, setUpl]       = useState(false);
  const [upForm,    setUpForm]    = useState({ course_id: courseFilter ?? '', week: '', note: '', files: [] });
  const [showUpload, setShowUpload] = useState(false);
  const [expandedFolders, setExpFolders] = useState({});

  const byId = id => courses.find(c => c.id === id);

  // ── Filtered & searched materials ────────────────────────────
  const filtered = useMemo(() => {
    let ms = materials;
    if (search.trim()) {
      const q = search.toLowerCase();
      ms = ms.filter(m =>
        m.name.toLowerCase().includes(q) ||
        (m.note ?? '').toLowerCase().includes(q) ||
        (m.analysis ?? '').toLowerCase().includes(q)
      );
    }
    return ms;
  }, [materials, search]);

  // Build tree: course → week → files
  const tree = useMemo(() => {
    const t = {};
    courses.forEach(c => {
      const mats = filtered.filter(m => m.course_id === c.id);
      if (!mats.length) return;
      t[c.id] = {};
      mats.forEach(m => {
        const wk = m.week ? `Semana ${m.week}` : 'Sin semana';
        if (!t[c.id][wk]) t[c.id][wk] = [];
        t[c.id][wk].push(m);
      });
    });
    return t;
  }, [courses, filtered]);

  const selectedMat = selected ? materials.find(m => m.id === selected) : null;

  // ── Upload handler ────────────────────────────────────────────
  const handleUpload = async () => {
    if (!upForm.course_id || !upForm.files.length) {
      notify('Selecciona curso y archivo.', 'warning'); return;
    }
    setUpl(true);
    for (const file of upForm.files) {
      const fd = await readFileForUpload(file);
      const { data: mat, error: insErr } = await onAdd({
        course_id:    upForm.course_id,
        name:         file.name,
        week:         upForm.week ? parseInt(upForm.week, 10) : null,
        note:         upForm.note || null,
        file_size:    fd.size,
        file_type:    fd.type,
        storage_path: null,
        analyzing:    true,
        analysis:     null,
        file_content: fd.preview || null,
      });
      if (insErr) { notify(`Error: ${insErr.message}`, 'danger'); continue; }

      // Upload to storage
      let storagePath = null;
      if (fd.url) {
        const { path } = await uploadFile(userId, file);
        storagePath = path;
      }

      // AI analysis
      const prompt =
        `Analiza el material académico "${file.name}"` +
        (upForm.week ? ` (Semana ${upForm.week})` : '') +
        (upForm.note ? `. Contexto: ${upForm.note}` : '') +
        '.\n\nContenido:\n' + (fd.preview || '[Sin texto extraíble]') +
        '\n\nOrganiza en español:\n## 📌 Temas principales\n## 🔑 Conceptos clave\n' +
        '## 📋 Tareas o actividades\n## 📚 Puntos a estudiar\n## 💡 Resumen ejecutivo';

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
    setUpForm(p => ({ ...p, files: [] }));
    if (fileRef.current) fileRef.current.value = '';
    setUpl(false);
    setShowUpload(false);
    notify(`${upForm.files.length} archivo(s) procesado(s).`, 'success');
  };

  const handleDownload = async (m) => {
    if (m.storage_path) {
      const { url } = await getDownloadUrl(m.storage_path);
      if (url) { window.open(url, '_blank', 'noopener'); return; }
    }
    if (m.analysis) {
      const blob = new Blob([m.analysis], { type: 'text/plain' });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href = url; a.download = `${m.name}.analisis.txt`;
      document.body.appendChild(a); a.click();
      document.body.removeChild(a); URL.revokeObjectURL(url);
      return;
    }
    notify('Archivo no disponible.', 'warning');
  };

  const toggleFolder = (key) => setExpFolders(p => ({ ...p, [key]: !p[key] }));

  if (loading) return <SkeletonList rows={4} />;

  const inputCls = { inputWrapper: dark ? 'bg-zinc-800 border-zinc-700' : 'bg-zinc-50 border-zinc-200' };

  return (
    <div className="flex gap-3 h-[calc(100vh-140px)] min-h-[500px]">
      {/* ── LEFT PANEL: Tree + Toolbar ──────────────────────── */}
      <div className="flex flex-col gap-2 w-64 flex-shrink-0">
        {/* Search + view toggle */}
        <div className="flex gap-2">
          <Input
            size="sm"
            placeholder="Buscar archivos…"
            value={search}
            onValueChange={setSearch}
            startContent={<Icon d={ICONS.search} size={14} />}
            classNames={{ inputWrapper: dark ? 'bg-zinc-800 border-zinc-700' : 'bg-white border-zinc-200' }}
            className="flex-1"
          />
          <Button
            isIconOnly size="sm" variant="flat"
            onPress={() => setViewMode(v => v === 'list' ? 'grid' : 'list')}
            className={dark ? 'bg-zinc-800' : 'bg-white'}
          >
            <Icon d={viewMode === 'list' ? ICONS.grid : ICONS.list} size={14} />
          </Button>
        </div>

        {/* Upload button */}
        <Button
          size="sm" color="primary" variant="flat"
          onPress={() => setShowUpload(s => !s)}
          className="font-semibold"
        >
          {showUpload ? '✕ Cancelar' : '+ Subir archivo'}
        </Button>

        {/* Upload form */}
        {showUpload && (
          <Card className={dark ? 'bg-zinc-900 border border-zinc-800' : 'bg-white border border-zinc-200'} shadow="sm">
            <CardBody className="space-y-2 py-3">
              <Select size="sm" label="Curso" selectedKeys={upForm.course_id ? [upForm.course_id] : []} onSelectionChange={k => setUpForm(p => ({ ...p, course_id: [...k][0] ?? '' }))} classNames={inputCls}>
                {courses.map(c => <SelectItem key={c.id}>{c.name}</SelectItem>)}
              </Select>
              <div className="grid grid-cols-2 gap-1">
                <Input size="sm" label="Semana" placeholder="7" value={upForm.week} onValueChange={v => setUpForm(p => ({ ...p, week: v }))} classNames={inputCls} />
                <Input size="sm" label="Contexto" placeholder="Examen" value={upForm.note} onValueChange={v => setUpForm(p => ({ ...p, note: v }))} classNames={inputCls} />
              </div>
              <input ref={fileRef} type="file" multiple style={{ display: 'none' }} onChange={e => setUpForm(p => ({ ...p, files: Array.from(e.target.files) }))} />
              <Button size="sm" variant="flat" onPress={() => fileRef.current.click()} className="w-full">
                {upForm.files.length ? `${upForm.files.length} archivo(s)` : 'Seleccionar…'}
              </Button>
              <Button size="sm" color="primary" isLoading={uploading} onPress={handleUpload} className="w-full font-semibold">
                {uploading ? 'Analizando…' : 'Subir y analizar'}
              </Button>
            </CardBody>
          </Card>
        )}

        {/* File tree */}
        <Card className={`flex-1 overflow-auto ${dark ? 'bg-zinc-900 border border-zinc-800' : 'bg-white border border-zinc-200'}`} shadow="sm">
          <CardBody className="py-2 px-1">
            {!Object.keys(tree).length && (
              <p className={`text-xs text-center py-8 font-mono ${dark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                {search ? 'Sin resultados' : 'Sin archivos subidos'}
              </p>
            )}
            {courses.map(c => {
              if (!tree[c.id]) return null;
              const cKey = `c-${c.id}`;
              const isOpen = expandedFolders[cKey] !== false; // default open
              return (
                <div key={c.id} className="mb-1">
                  {/* Course folder */}
                  <button
                    className={`w-full flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-left transition-colors ${dark ? 'hover:bg-zinc-800' : 'hover:bg-zinc-100'}`}
                    onClick={() => toggleFolder(cKey)}
                  >
                    <span style={{ color: c.color }}>{isOpen ? '▾' : '▸'}</span>
                    <Icon d={ICONS.folder} size={14} color={c.color} />
                    <span className={`text-xs font-semibold truncate ${dark ? 'text-zinc-200' : 'text-zinc-800'}`}>{c.name}</span>
                    <span className={`ml-auto text-xs ${dark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                      {Object.values(tree[c.id]).flat().length}
                    </span>
                  </button>

                  {isOpen && Object.entries(tree[c.id]).map(([wk, mats]) => {
                    const wKey = `w-${c.id}-${wk}`;
                    const wOpen = expandedFolders[wKey] !== false;
                    return (
                      <div key={wk} className="ml-3">
                        {/* Week sub-folder */}
                        <button
                          className={`w-full flex items-center gap-1.5 px-2 py-1 rounded-lg text-left transition-colors ${dark ? 'hover:bg-zinc-800' : 'hover:bg-zinc-50'}`}
                          onClick={() => toggleFolder(wKey)}
                        >
                          <span className={dark ? 'text-zinc-500' : 'text-zinc-400'}>{wOpen ? '▾' : '▸'}</span>
                          <Icon d={ICONS.folder} size={12} color={dark ? '#71717a' : '#a1a1aa'} />
                          <span className={`text-xs truncate ${dark ? 'text-zinc-400' : 'text-zinc-500'}`}>{wk}</span>
                          <span className={`ml-auto text-xs ${dark ? 'text-zinc-600' : 'text-zinc-400'}`}>{mats.length}</span>
                        </button>

                        {wOpen && mats.map(m => (
                          <button
                            key={m.id}
                            className={`w-full flex items-center gap-1.5 px-2 py-1 ml-3 rounded-lg text-left transition-colors ${
                              selected === m.id
                                ? (dark ? 'bg-blue-900/40 text-blue-300' : 'bg-blue-50 text-blue-600')
                                : (dark ? 'hover:bg-zinc-800 text-zinc-300' : 'hover:bg-zinc-50 text-zinc-700')
                            }`}
                            onClick={() => setSelected(m.id)}
                          >
                            <span className="text-sm">{FILE_EMOJI(m.file_type)}</span>
                            <span className="text-xs truncate flex-1">{m.name}</span>
                            {m.analyzing && <Spinner size={10} />}
                          </button>
                        ))}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </CardBody>
        </Card>

        {/* Stats */}
        <div className={`text-xs font-mono text-center ${dark ? 'text-zinc-600' : 'text-zinc-400'}`}>
          {filtered.length} archivo{filtered.length !== 1 ? 's' : ''}
          {search && ` · "${search}"`}
        </div>
      </div>

      {/* ── RIGHT PANEL: Detail / Grid ───────────────────────── */}
      <div className="flex-1 overflow-auto">
        {viewMode === 'list' ? (
          /* Detail view */
          selectedMat ? (
            <FileDetail
              m={selectedMat}
              course={byId(selectedMat.course_id)}
              dark={dark}
              onDownload={() => handleDownload(selectedMat)}
              onRemove={() => { onRemove(selectedMat.id); setSelected(null); notify('Archivo eliminado.', 'warning'); }}
            />
          ) : (
            <div className={`flex items-center justify-center h-full rounded-2xl border-2 border-dashed ${dark ? 'border-zinc-800 text-zinc-600' : 'border-zinc-200 text-zinc-400'}`}>
              <div className="text-center">
                <div className="text-4xl mb-3">📂</div>
                <p className="text-sm font-mono">Selecciona un archivo del árbol</p>
              </div>
            </div>
          )
        ) : (
          /* Grid view */
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {filtered.map(m => {
              const c = byId(m.course_id);
              return (
                <Card
                  key={m.id}
                  isPressable
                  onPress={() => { setSelected(m.id); setViewMode('list'); }}
                  className={`cursor-pointer transition-transform hover:scale-[1.02] ${dark ? 'bg-zinc-900 border border-zinc-800' : 'bg-white border border-zinc-200'}`}
                  shadow="sm"
                >
                  <CardBody className="p-3">
                    <div className="text-3xl mb-2 text-center">{FILE_EMOJI(m.file_type)}</div>
                    <p className={`text-xs font-semibold truncate text-center ${dark ? 'text-zinc-200' : 'text-zinc-800'}`}>{m.name}</p>
                    {c && <p className="text-xs text-center mt-1" style={{ color: c.color }}>{c.name}</p>}
                    {m.file_size && <p className={`text-xs text-center mt-0.5 font-mono ${dark ? 'text-zinc-500' : 'text-zinc-400'}`}>{fmtBytes(m.file_size)}</p>}
                    {m.analyzing && <div className="flex justify-center mt-1"><Spinner size={12} /></div>}
                  </CardBody>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ── File Detail Panel ─────────────────────────────────────────
function FileDetail({ m, course, dark, onDownload, onRemove }) {
  const [tab, setTab] = useState('info');

  return (
    <Card className={dark ? 'bg-zinc-900 border border-zinc-800 h-full' : 'bg-white border border-zinc-200 h-full'} shadow="sm">
      <CardHeader className="pb-2">
        <div className="flex items-start gap-3 w-full">
          <span className="text-4xl">{FILE_EMOJI(m.file_type)}</span>
          <div className="flex-1 min-w-0">
            <p className={`font-bold text-sm truncate ${dark ? 'text-white' : 'text-zinc-900'}`}>{m.name}</p>
            {course && <p className="text-xs mt-0.5" style={{ color: course.color }}>{course.name}</p>}
            <div className="flex gap-1.5 mt-1.5 flex-wrap">
              {m.week && <Chip size="sm" variant="flat" color="primary">Semana {m.week}</Chip>}
              {m.file_size && <Chip size="sm" variant="flat" className={dark ? 'bg-zinc-800 text-zinc-400' : 'bg-zinc-100 text-zinc-500'}>{fmtBytes(m.file_size)}</Chip>}
              {m.analyzing && <Chip size="sm" variant="flat" color="warning">Analizando…</Chip>}
              {m.analysis && !m.analyzing && <Chip size="sm" variant="flat" color="success">Analizado ✓</Chip>}
            </div>
          </div>
          <div className="flex gap-1 flex-shrink-0">
            <Tooltip content="Descargar">
              <Button isIconOnly size="sm" variant="flat" color="success" onPress={onDownload}>
                <Icon d={ICONS.download} size={14} />
              </Button>
            </Tooltip>
            <Tooltip content="Eliminar">
              <Button isIconOnly size="sm" variant="flat" color="danger" onPress={onRemove}>
                <Icon d={ICONS.trash} size={14} />
              </Button>
            </Tooltip>
          </div>
        </div>
      </CardHeader>

      <Divider />

      <CardBody className="overflow-auto">
        <Tabs
          size="sm"
          selectedKey={tab}
          onSelectionChange={setTab}
          variant="underlined"
          classNames={{ tabList: 'gap-4 mb-3' }}
        >
          <Tab key="info" title="Información">
            <div className="space-y-2">
              {m.note && (
                <div className={`p-3 rounded-xl ${dark ? 'bg-zinc-800' : 'bg-zinc-50'}`}>
                  <p className={`text-xs font-mono uppercase tracking-wider mb-1 ${dark ? 'text-zinc-500' : 'text-zinc-400'}`}>Contexto</p>
                  <p className={`text-sm ${dark ? 'text-zinc-200' : 'text-zinc-700'}`}>{m.note}</p>
                </div>
              )}
              <div className={`p-3 rounded-xl ${dark ? 'bg-zinc-800' : 'bg-zinc-50'}`}>
                <p className={`text-xs font-mono uppercase tracking-wider mb-1 ${dark ? 'text-zinc-500' : 'text-zinc-400'}`}>Metadatos</p>
                <div className={`text-xs font-mono space-y-0.5 ${dark ? 'text-zinc-300' : 'text-zinc-600'}`}>
                  <p>Tipo: {m.file_type || 'desconocido'}</p>
                  <p>Tamaño: {m.file_size ? fmtBytes(m.file_size) : 'N/A'}</p>
                  <p>Subido: {new Date(m.created_at).toLocaleDateString('es-CR', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                </div>
              </div>
            </div>
          </Tab>

          <Tab key="analysis" title="Análisis IA">
            {m.analyzing ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3">
                <Spinner size={24} />
                <p className={`text-sm ${dark ? 'text-zinc-400' : 'text-zinc-500'}`}>Analizando con Ollama…</p>
              </div>
            ) : m.analysis ? (
              <pre className={`whitespace-pre-wrap text-xs leading-relaxed font-sans ${dark ? 'text-zinc-300' : 'text-zinc-700'}`}>
                {m.analysis}
              </pre>
            ) : (
              <p className={`text-sm text-center py-8 ${dark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                Sin análisis disponible.
              </p>
            )}
          </Tab>
        </Tabs>
      </CardBody>
    </Card>
  );
}
