import { useState } from 'react';
import {
  Card, CardBody, CardHeader, Input, Select, SelectItem,
  Button, Progress, Chip, Divider, Tooltip,
} from '@nextui-org/react';
import { useApp } from '../../context/AppContext';
import { ASSIGNMENT_TYPES } from '../../lib/utils';
import { SkeletonList } from '../ui/Skeleton';

export function GradesManager({ courses, grades, loading, onAdd, onRemove, courseAvg }) {
  const { dark, notify } = useApp();

  const EMPTY = { course_id: '', name: '', score: '', max_points: '100', weight: '100', type: 'examen', type_custom: '' };
  const [form,   setForm]  = useState(EMPTY);
  const [saving, setSave]  = useState(false);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleAdd = async () => {
    const score     = parseFloat(form.score);
    const maxPoints = parseFloat(form.max_points);
    const weight    = parseFloat(form.weight);

    if (!form.course_id)                       { notify('Selecciona un curso.',                           'warning'); return; }
    if (!form.name.trim())                     { notify('Ingresa el nombre de la evaluación.',            'warning'); return; }
    if (isNaN(score) || score < 0)             { notify('La nota no puede ser negativa.',                 'warning'); return; }
    if (isNaN(maxPoints) || maxPoints <= 0)    { notify('El puntaje máximo debe ser mayor a 0.',          'warning'); return; }
    if (score > maxPoints)                     { notify(`Nota (${score}) supera el máximo (${maxPoints}).`, 'warning'); return; }
    if (isNaN(weight) || weight <= 0 || weight > 100) { notify('El peso debe ser entre 0.01 y 100%.',     'warning'); return; }

    setSave(true);
    const { error } = await onAdd({
      course_id:   form.course_id,
      name:        form.name.trim(),
      score,
      max_points:  maxPoints,
      weight,
      type:        form.type,
      type_custom: form.type === 'otro' ? (form.type_custom || null) : null,
    });
    setSave(false);
    if (error) { notify('Error: ' + error.message, 'danger'); return; }
    setForm(EMPTY);
    notify('Calificación registrada.', 'success');
  };

  if (loading) return <SkeletonList rows={3} />;

  const inputCls = { inputWrapper: dark ? 'bg-zinc-800 border-zinc-700' : 'bg-zinc-50 border-zinc-200' };

  // Live preview of the form
  const previewPct = (() => {
    const s = parseFloat(form.score), m = parseFloat(form.max_points), w = parseFloat(form.weight);
    if (isNaN(s) || isNaN(m) || isNaN(w) || m <= 0 || w <= 0) return null;
    return { raw: (s / m) * 100, contribution: (s / m) * w };
  })();

  return (
    <div className="space-y-4">
      {/* ── Add Form ──────────────────────────────────────── */}
      <Card className={dark ? 'bg-zinc-900 border border-zinc-800' : 'bg-white border border-zinc-200'} shadow="sm">
        <CardHeader className="pb-2">
          <span className={`text-xs font-bold tracking-widest uppercase ${dark ? 'text-yellow-400' : 'text-yellow-600'}`}>
            Registrar evaluación
          </span>
        </CardHeader>
        <CardBody className="space-y-3">
          {courses.length === 0 ? (
            <p className={`text-sm font-mono ${dark ? 'text-zinc-400' : 'text-zinc-500'}`}>Agrega cursos primero.</p>
          ) : (
            <>
              <Select
                label="Curso"
                size="sm"
                selectedKeys={form.course_id ? [form.course_id] : []}
                onSelectionChange={keys => set('course_id', [...keys][0] ?? '')}
                classNames={inputCls}
              >
                {courses.map(c => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </Select>

              <Input
                label="Nombre de la evaluación"
                placeholder="ej: Examen I, Proyecto Final"
                size="sm"
                value={form.name}
                onValueChange={v => set('name', v)}
                classNames={inputCls}
              />

              {/* ── 3-field score row ─────────────────────── */}
              <div className="grid grid-cols-3 gap-2">
                <Input
                  label="Nota obtenida"
                  placeholder="85"
                  type="number"
                  size="sm"
                  min={0}
                  value={form.score}
                  onValueChange={v => set('score', v)}
                  classNames={inputCls}
                  description="Puntos"
                />
                <Input
                  label="Puntaje máximo"
                  placeholder="100"
                  type="number"
                  size="sm"
                  min={0.01}
                  value={form.max_points}
                  onValueChange={v => set('max_points', v)}
                  classNames={inputCls}
                  description="Pts totales"
                />
                <Tooltip content="¿Cuánto vale esta evaluación en la nota final? Ej: un examen que vale 30% del curso → peso 30">
                  <Input
                    label="Peso en nota final"
                    placeholder="30"
                    type="number"
                    size="sm"
                    min={0.01}
                    max={100}
                    value={form.weight}
                    onValueChange={v => set('weight', v)}
                    classNames={inputCls}
                    description="% del curso"
                    endContent={<span className="text-xs text-zinc-400">%</span>}
                  />
                </Tooltip>
              </div>

              {/* Live preview */}
              {previewPct !== null && (
                <div className={`rounded-xl p-3 ${dark ? 'bg-zinc-800' : 'bg-zinc-50'}`}>
                  <div className="flex justify-between items-center mb-2">
                    <span className={`text-xs font-mono ${dark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                      Vista previa
                    </span>
                    <div className="flex gap-2">
                      <Chip size="sm" color={previewPct.raw >= 90 ? 'success' : previewPct.raw >= 70 ? 'warning' : 'danger'} variant="flat">
                        {previewPct.raw.toFixed(1)}% en el ítem
                      </Chip>
                      <Chip size="sm" color="primary" variant="flat">
                        +{previewPct.contribution.toFixed(2)}% a la nota final
                      </Chip>
                    </div>
                  </div>
                  <Progress
                    value={previewPct.raw}
                    color={previewPct.raw >= 90 ? 'success' : previewPct.raw >= 70 ? 'warning' : 'danger'}
                    size="sm"
                    className="max-w-full"
                  />
                </div>
              )}

              {/* Type selector */}
              <div className={`grid gap-2 ${form.type === 'otro' ? 'grid-cols-2' : 'grid-cols-1'}`}>
                <Select
                  label="Tipo"
                  size="sm"
                  selectedKeys={[form.type]}
                  onSelectionChange={keys => set('type', [...keys][0] ?? 'examen')}
                  classNames={inputCls}
                >
                  {ASSIGNMENT_TYPES.map(t => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </Select>
                {form.type === 'otro' && (
                  <Input
                    label="Especifica el tipo"
                    placeholder="ej: Bitácora, Laboratorio"
                    size="sm"
                    value={form.type_custom}
                    onValueChange={v => set('type_custom', v)}
                    classNames={inputCls}
                    autoFocus
                  />
                )}
              </div>

              <Button
                color="warning"
                size="sm"
                isLoading={saving}
                onPress={handleAdd}
                className="font-semibold"
              >
                Registrar evaluación
              </Button>
            </>
          )}
        </CardBody>
      </Card>

      {/* ── Per-course tables ─────────────────────────────── */}
      {courses.every(c => !grades.find(g => g.course_id === c.id)) && (
        <Card className={dark ? 'bg-zinc-900 border border-zinc-800' : 'bg-white border border-zinc-200'} shadow="sm">
          <CardBody>
            <p className={`text-sm text-center font-mono py-4 ${dark ? 'text-zinc-500' : 'text-zinc-400'}`}>
              Sin calificaciones registradas.
            </p>
          </CardBody>
        </Card>
      )}

      {courses.map(c => {
        const cGrades = grades.filter(g => g.course_id === c.id);
        if (!cGrades.length) return null;

        const avg        = courseAvg(c.id);
        const pct        = avg?.percentage ?? null;
        const totalWeight = avg?.totalWeight ?? 0;
        const earned     = avg?.earned ?? 0;
        const color      = pct === null ? 'default' : pct >= 90 ? 'success' : pct >= 70 ? 'warning' : 'danger';

        return (
          <Card key={c.id} className={dark ? 'bg-zinc-900 border border-zinc-800' : 'bg-white border border-zinc-200'} shadow="sm">
            <CardHeader className="pb-1">
              <div className="flex w-full justify-between items-center">
                <div className="flex items-center gap-2">
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: c.color, flexShrink: 0 }} />
                  <span className={`font-bold text-sm font-mono ${dark ? 'text-white' : 'text-zinc-900'}`}>{c.name}</span>
                </div>
                <div className="flex flex-col items-end gap-0.5">
                  {pct !== null && (
                    <Chip color={color} size="sm" variant="flat" className="font-mono font-bold">
                      {earned.toFixed(2)} / {totalWeight.toFixed(0)}%
                    </Chip>
                  )}
                  <span className={`text-xs font-mono ${dark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                    {totalWeight.toFixed(0)}% del curso evaluado
                  </span>
                </div>
              </div>
            </CardHeader>

            {pct !== null && (
              <div className="px-4 pb-2">
                <Progress value={Math.min(pct, 100)} color={color} size="sm" />
              </div>
            )}

            <Divider className={dark ? 'border-zinc-800' : 'border-zinc-100'} />

            <CardBody className="py-2 space-y-1">
              {cGrades.map(gr => {
                const rawPct = (parseFloat(gr.score) / parseFloat(gr.max_points ?? 100)) * 100;
                const contrib = rawPct / 100 * parseFloat(gr.weight ?? 100);
                const gc = rawPct >= 90 ? 'success' : rawPct >= 70 ? 'warning' : 'danger';
                const type = gr.type === 'otro' ? (gr.type_custom || 'Otro') : gr.type;

                return (
                  <div key={gr.id} className="flex justify-between items-center py-1.5 border-b border-zinc-100 dark:border-zinc-800 last:border-0">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`text-sm truncate ${dark ? 'text-zinc-200' : 'text-zinc-800'}`}>{gr.name}</span>
                      <Chip size="sm" variant="flat" className={`text-xs font-mono ${dark ? 'bg-zinc-800 text-zinc-400' : 'bg-zinc-100 text-zinc-500'}`}>{type}</Chip>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Tooltip content={`${rawPct.toFixed(1)}% del ítem · aporta ${contrib.toFixed(2)}% a la nota`}>
                        <span className={`text-xs font-mono font-bold`}>
                          <Chip size="sm" color={gc} variant="flat">
                            {parseFloat(gr.score)}/{parseFloat(gr.max_points ?? 100)} pts
                          </Chip>
                        </span>
                      </Tooltip>
                      <Chip size="sm" color="primary" variant="flat" className="font-mono text-xs">
                        {parseFloat(gr.weight ?? 100).toFixed(0)}%
                      </Chip>
                      <Button
                        isIconOnly
                        size="sm"
                        variant="light"
                        color="danger"
                        onPress={() => onRemove(gr.id)}
                        className="min-w-6 h-6"
                      >
                        ✕
                      </Button>
                    </div>
                  </div>
                );
              })}
            </CardBody>
          </Card>
        );
      })}
    </div>
  );
}
