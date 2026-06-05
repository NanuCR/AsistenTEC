import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export function useNotes(userId, courseFilter) {
  const [notes, setNotes]     = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!userId) { setNotes([]); setLoading(false); return; }
    setLoading(true);
    let q = supabase
      .from('notes')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (courseFilter) q = q.eq('course_id', courseFilter);
    const { data, error } = await q;
    if (!error && data) setNotes(data);
    setLoading(false);
  }, [userId, courseFilter]);

  useEffect(() => { load(); }, [load]);

  const add = async (fields) => {
    const { data, error } = await supabase
      .from('notes')
      .insert({ ...fields, user_id: userId })
      .select()
      .single();
    if (!error && data) setNotes(p => [data, ...p]);
    return { data, error };
  };

  const remove = async (id) => {
    const { error } = await supabase.from('notes').delete().eq('id', id);
    if (!error) setNotes(p => p.filter(n => n.id !== id));
    return { error };
  };

  return { notes, loading, reload: load, add, remove };
}
