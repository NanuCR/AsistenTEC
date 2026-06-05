let _n = 0;
export const uid = () => Date.now().toString(36) + (++_n).toString(36);

/** Days left until a date string (negative = overdue). */
export const daysLeft = (dateStr) =>
  Math.ceil((new Date(dateStr) - Date.now()) / 86_400_000);

export const todayISO = () => new Date().toISOString().slice(0, 10);

export const fmtBytes = (b) =>
  b > 1_048_576 ? `${(b / 1_048_576).toFixed(1)} MB` : `${(b / 1024).toFixed(0)} KB`;

/** Open Google Calendar "new event" URL. */
export function openGoogleCalendar(title, dateISO, description = '') {
  if (!dateISO) return;
  const d   = dateISO.replace(/-/g, '');
  const url = `https://calendar.google.com/calendar/render?action=TEMPLATE` +
    `&text=${encodeURIComponent(title)}` +
    `&dates=${d}T090000/${d}T100000` +
    `&details=${encodeURIComponent(description)}`;
  window.open(url, '_blank', 'noopener');
}

/**
 * Open native email client reliably by injecting a temporary <a> element.
 * Mitigates browser popup-blocker restrictions on `window.location` changes.
 */
export function openMailto(to, subject, body) {
  const href = `mailto:${encodeURIComponent(to)}` +
    `?subject=${encodeURIComponent(subject)}` +
    `&body=${encodeURIComponent(body)}`;
  const a = document.createElement('a');
  a.href    = href;
  a.rel     = 'noopener noreferrer';
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  setTimeout(() => document.body.removeChild(a), 200);
}

export function downloadText(filename, text) {
  const blob = new Blob([text], { type: 'text/plain' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Read a File as a base64 DataURL plus a text preview (for AI analysis).
 * Large files (>3 MB) are read only as text to avoid memory issues.
 */
export function readFileForUpload(file) {
  return new Promise((resolve) => {
    if (file.size > 3 * 1_048_576) {
      const fr = new FileReader();
      fr.onload  = (e) => resolve({ url: null, preview: (e.target.result ?? '').slice(0, 6000), size: file.size, type: file.type });
      fr.onerror = ()  => resolve({ url: null, preview: '', size: file.size, type: file.type });
      fr.readAsText(file);
    } else {
      const fr = new FileReader();
      fr.onload = (e) => {
        const url     = e.target.result;
        let preview   = '';
        if (url?.startsWith('data:text')) {
          try { preview = atob(url.split(',')[1]).slice(0, 6000); } catch { preview = '[binario]'; }
        } else {
          preview = `[Archivo: ${file.type || 'desconocido'}]`;
        }
        resolve({ url, preview, size: file.size, type: file.type });
      };
      fr.onerror = () => resolve({ url: null, preview: '', size: file.size, type: file.type });
      fr.readAsDataURL(file);
    }
  });
}

export const COURSE_COLORS = [
  '#007AFF','#34C759','#FF9500','#FF3B30',
  '#AF52DE','#5AC8FA','#FF2D55','#30D158','#FFD60A','#AC8E68',
];

export const TABS = [
  { id: 'inicio',      label: 'Inicio'       },
  { id: 'cursos',      label: 'Cursos'       },
  { id: 'tareas',      label: 'Tareas'       },
  { id: 'archivos',    label: 'Archivos'     },
  { id: 'apuntes',     label: 'Apuntes'      },
  { id: 'comm',        label: 'Comm'         },
  { id: 'notas',       label: 'Calificaciones'},
  { id: 'asistentec',  label: 'AsistenTEC'   },
  { id: 'config',      label: 'Config'       },
];

export const ASSIGNMENT_TYPES = [
  { value: 'examen',    label: 'Examen'    },
  { value: 'tarea',     label: 'Tarea'     },
  { value: 'proyecto',  label: 'Proyecto'  },
  { value: 'quiz',      label: 'Quiz'      },
  { value: 'laboratorio', label: 'Laboratorio' },
  { value: 'otro',      label: 'Otro…'     },
];
