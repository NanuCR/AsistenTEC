import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export function useCourses(userId) {
  const [courses, setCourses]   = useState([]);
  const [loading, setLoading]   = useState(true);

  const load = useCallback(async () => {
    if (!userId) { setCourses([]); setLoading(false); return; }
    setLoading(true);
    const { data, error } = await supabase
      .from('courses')
      .select('*')
      .eq('user_id', userId)
      .order('created_at');
    if (!error && data) setCourses(data);
    setLoading(false);
  }, [userId]);

  useEffect(() => { load(); }, [load]);

  const add = async (fields) => {
    const { data, error } = await supabase
      .from('courses')
      .insert({ ...fields, user_id: userId })
      .select()
      .single();
    if (!error && data) setCourses(p => [...p, data]);
    return { data, error };
  };

  const remove = async (id) => {
    const { error } = await supabase.from('courses').delete().eq('id', id);
    if (!error) setCourses(p => p.filter(c => c.id !== id));
    return { error };
  };

  return { courses, loading, reload: load, add, remove };
}
