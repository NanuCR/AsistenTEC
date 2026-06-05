import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export function useGrades(userId, courseFilter) {
  const [grades, setGrades]   = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!userId) { setGrades([]); setLoading(false); return; }
    setLoading(true);
    let q = supabase
      .from('grades')
      .select('*')
      .eq('user_id', userId)
      .order('created_at');
    if (courseFilter) q = q.eq('course_id', courseFilter);
    const { data, error } = await q;
    if (!error && data) setGrades(data);
    setLoading(false);
  }, [userId, courseFilter]);

  useEffect(() => { load(); }, [load]);

  const add = async (fields) => {
    // Front-end guard: score must be 0–max_score, max_score 0–100
    const score    = parseFloat(fields.score);
    const maxScore = parseFloat(fields.max_score ?? 100);
    if (isNaN(score) || score < 0 || score > maxScore) {
      return { error: { message: 'La nota debe estar entre 0 y el puntaje máximo.' } };
    }
    if (isNaN(maxScore) || maxScore <= 0 || maxScore > 100) {
      return { error: { message: 'El puntaje máximo debe ser entre 0.01 y 100.' } };
    }
    const { data, error } = await supabase
      .from('grades')
      .insert({ ...fields, score, max_score: maxScore, user_id: userId })
      .select()
      .single();
    if (!error && data) setGrades(p => [...p, data]);
    return { data, error };
  };

  const remove = async (id) => {
    const { error } = await supabase.from('grades').delete().eq('id', id);
    if (!error) setGrades(p => p.filter(g => g.id !== id));
    return { error };
  };

  /** Weighted average as a percentage for a given course. */
  const courseAvg = (courseId) => {
    const gs = grades.filter(g => g.course_id === courseId);
    if (!gs.length) return null;
    const totalWeight  = gs.reduce((a, g) => a + parseFloat(g.max_score), 0);
    const weightedSum  = gs.reduce((a, g) => a + (parseFloat(g.score) / parseFloat(g.max_score)) * parseFloat(g.max_score), 0);
    return totalWeight > 0 ? (weightedSum / totalWeight) * 100 : null;
  };

  return { grades, loading, reload: load, add, remove, courseAvg };
}
