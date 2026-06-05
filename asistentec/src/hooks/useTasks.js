import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export function useTasks(userId, courseFilter) {
  const [tasks, setTasks]     = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!userId) { setTasks([]); setLoading(false); return; }
    setLoading(true);
    let q = supabase
      .from('tasks')
      .select('*')
      .eq('user_id', userId)
      .order('due_date', { nullsFirst: false });
    if (courseFilter) q = q.eq('course_id', courseFilter);
    const { data, error } = await q;
    if (!error && data) setTasks(data);
    setLoading(false);
  }, [userId, courseFilter]);

  useEffect(() => { load(); }, [load]);

  const add = async (fields) => {
    const { data, error } = await supabase
      .from('tasks')
      .insert({ ...fields, user_id: userId })
      .select()
      .single();
    if (!error && data) setTasks(p => [...p, data]);
    return { data, error };
  };

  const remove = async (id) => {
    const { error } = await supabase.from('tasks').delete().eq('id', id);
    if (!error) setTasks(p => p.filter(t => t.id !== id));
    return { error };
  };

  const toggle = async (id) => {
    const task = tasks.find(t => t.id === id);
    if (!task) return;
    const done = !task.done;
    const { error } = await supabase.from('tasks').update({ done }).eq('id', id);
    if (!error) setTasks(p => p.map(t => t.id === id ? { ...t, done } : t));
    return { error };
  };

  return { tasks, loading, reload: load, add, remove, toggle };
}
