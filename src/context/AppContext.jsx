import { createContext, useContext, useReducer, useState, useCallback } from 'react';

const AppCtx = createContext(null);

const INIT = {
  dark:          false,
  tab:           'inicio',
  courseFilter:  null,   // UUID of the currently filtered course (or null = all)
  config: {
    assistantName: 'AsistenTEC',
    myEmail:       '',
    webhookUrl:    '',
    calHint:       '',
    ollamaModel:   'llama3',
    ollamaUrl:     'http://localhost:11434',
    darkMode:      false,
  },
};

function reducer(s, a) {
  switch (a.type) {
    case 'SET_DARK':          return { ...s, dark: a.v };
    case 'TOGGLE_DARK':       return { ...s, dark: !s.dark };
    case 'SET_TAB':           return { ...s, tab: a.v };
    case 'SET_COURSE_FILTER': return { ...s, courseFilter: a.v };
    case 'SET_CONFIG':        return { ...s, config: { ...s.config, ...a.v } };
    default:                  return s;
  }
}

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, INIT);
  const [toasts, setToasts] = useState([]);

  const notify = useCallback((msg, kind = 'info') => {
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2);
    setToasts(p => [...p, { id, msg, kind }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 3400);
  }, []);

  const setDark           = (v)  => dispatch({ type: 'SET_DARK',          v });
  const toggleDark        = ()   => dispatch({ type: 'TOGGLE_DARK' });
  const setTab            = (v)  => dispatch({ type: 'SET_TAB',           v });
  const setCourseFilter   = (v)  => dispatch({ type: 'SET_COURSE_FILTER', v });
  const updateConfig      = (v)  => dispatch({ type: 'SET_CONFIG',        v });

  return (
    <AppCtx.Provider value={{
      ...state,
      toasts, notify,
      setDark, toggleDark,
      setTab, setCourseFilter,
      updateConfig,
    }}>
      {children}
    </AppCtx.Provider>
  );
}

export const useApp = () => {
  const ctx = useContext(AppCtx);
  if (!ctx) throw new Error('useApp must be used inside <AppProvider>');
  return ctx;
};
