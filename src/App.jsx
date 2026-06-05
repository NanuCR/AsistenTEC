import { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import { AppProvider, useApp } from './context/AppContext';
import { getTheme } from './styles/theme';

import { AuthScreen }   from './components/auth/AuthScreen';
import { Header }       from './components/layout/Header';
import { TabBar }       from './components/layout/TabBar';
import { ToastStack }   from './components/ui/Toast';

import { Dashboard }    from './components/dashboard/Dashboard';
import { CourseManager } from './components/courses/CourseManager';
import { TaskManager }  from './components/tasks/TaskManager';
import { FileManager }  from './components/files/FileManager';
import { NotesManager } from './components/notes/NotesManager';
import { CommHub }      from './components/comm/CommHub';
import { GradesManager } from './components/grades/GradesManager';
import { AsistenteChat } from './components/chat/AsistenteChat';
import { ConfigPanel }  from './components/config/ConfigPanel';

import { useCourses }   from './hooks/useCourses';
import { useTasks }     from './hooks/useTasks';
import { useMaterials } from './hooks/useMaterials';
import { useNotes }     from './hooks/useNotes';
import { useGrades }    from './hooks/useGrades';
import { useConfig }    from './hooks/useConfig';

// ── Inner app — needs AppProvider context ─────────────────────
function Inner({ session }) {
  const { dark, tab, courseFilter, updateConfig, notify, setDark } = useApp();
  const T = getTheme(dark);

  // ── Data hooks (all respect courseFilter) ─────────────────
  const { courses, loading: cLoading, add: addCourse, remove: removeCourse }      = useCourses(session.user.id);
  const { tasks,   loading: tLoading, add: addTask, remove: removeTask, toggle }  = useTasks(session.user.id, courseFilter);
  const { materials, loading: mLoading, add: addMat, update: updateMat,
          remove: removeMat, uploadFile, getDownloadUrl }                          = useMaterials(session.user.id, courseFilter);
  const { notes,   loading: nLoading, add: addNote, remove: removeNote }          = useNotes(session.user.id, courseFilter);
  const { grades,  loading: gLoading, add: addGrade, remove: removeGrade,
          courseAvg }                                                               = useGrades(session.user.id, courseFilter);
  const { config,  loading: cfLoading, save: saveConfig }                         = useConfig(session.user.id);

  // Keep context config in sync with DB config
  useEffect(() => {
    if (!cfLoading) {
      updateConfig({
        assistantName: config.assistant_name,
        myEmail:       config.my_email,
        webhookUrl:    config.webhook_url,
        calHint:       config.cal_hint,
        ollamaModel:   config.ollama_model,
        ollamaUrl:     config.ollama_url,
      });
      setDark(config.dark_mode);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cfLoading]);

  // ── Local UI state (non-persistent) ──────────────────────
  const [chatMessages,   setChatMessages]   = useState([]);
  const [pastedContent,  setPastedContent]  = useState('');
  const [pasteAnalysis,  setPasteAnalysis]  = useState('');

  const loading = cLoading || tLoading || mLoading || nLoading || gLoading || cfLoading;

  // ── Section renderer ──────────────────────────────────────
  const renderTab = () => {
    switch (tab) {
      case 'inicio':
        return <Dashboard courses={courses} tasks={tasks} materials={materials} grades={grades} loading={loading} />;

      case 'cursos':
        return <CourseManager
          courses={courses} tasks={tasks} grades={grades} materials={materials}
          loading={cLoading} onAdd={addCourse} onRemove={removeCourse}
        />;

      case 'tareas':
        return <TaskManager
          courses={courses} tasks={tasks} loading={tLoading}
          onAdd={addTask} onRemove={removeTask} onToggle={toggle}
        />;

      case 'archivos':
        return <FileManager
          userId={session.user.id}
          courses={courses} materials={materials} loading={mLoading}
          config={config}
          onAdd={addMat} onUpdate={updateMat} onRemove={removeMat}
          uploadFile={uploadFile} getDownloadUrl={getDownloadUrl}
        />;

      case 'apuntes':
        return <NotesManager
          courses={courses} notes={notes} loading={nLoading}
          onAdd={addNote} onRemove={removeNote}
        />;

      case 'comm':
        return <CommHub
          courses={courses} config={config}
          pastedContent={pastedContent} onPasteChange={setPastedContent}
          pasteAnalysis={pasteAnalysis} onPasteAnalysis={setPasteAnalysis}
        />;

      case 'notas':
        return <GradesManager
          courses={courses} grades={grades} loading={gLoading}
          onAdd={addGrade} onRemove={removeGrade} courseAvg={courseAvg}
        />;

      case 'asistentec':
        return <AsistenteChat
          courses={courses} tasks={tasks} grades={grades}
          config={config}
          messages={chatMessages} onMessages={setChatMessages}
        />;

      case 'config':
        return <ConfigPanel
          config={config} onSave={saveConfig}
          courses={courses} tasks={tasks} notes={notes} grades={grades}
        />;

      default:
        return null;
    }
  };

  return (
    <div style={{
      fontFamily: "-apple-system,'SF Pro Display',system-ui,sans-serif",
      minHeight: '100vh', background: T.bg, color: T.txt,
      transition: 'background .3s, color .3s',
    }}>
      <style>{`
        * { box-sizing: border-box; }
        input, select, textarea { font-family: inherit; }
        input::placeholder, textarea::placeholder { color: ${T.txt3}; }
        select option { background: ${T.sur}; color: ${T.txt}; }
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: ${T.brd}; border-radius: 4px; }
        button:active { opacity: .75 !important; }
        button { transition: opacity .1s; }
      `}</style>

      <Header courses={courses} tasks={tasks} config={config} />
      <TabBar />
      <ToastStack />

      <div style={{ padding: '16px 16px 48px', maxWidth: 860, margin: '0 auto' }}>
        {renderTab()}
      </div>
    </div>
  );
}

// ── Root with auth gate ───────────────────────────────────────
function AppRoot() {
  const { dark } = useApp();
  const [session, setSession] = useState(undefined); // undefined = loading

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session ?? null));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => listener.subscription.unsubscribe();
  }, []);

  // Loading splash
  if (session === undefined) {
    const T = getTheme(dark);
    return (
      <div style={{
        minHeight: '100vh', background: T.bg,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: T.mono, fontSize: 13, color: T.txt3,
      }}>
        Cargando…
      </div>
    );
  }

  if (!session) return <AuthScreen dark={dark} />;

  return <Inner session={session} />;
}

export default function App() {
  return (
    <AppProvider>
      <AppRoot />
    </AppProvider>
  );
}
