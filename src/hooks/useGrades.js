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
    const score     = parseFloat(fields.score);
    const maxPoints = parseFloat(fields.max_points ?? 100);
    const weight    = parseFloat(fields.weight ?? 100);

    if (isNaN(score) || score < 0)
      return { error: { message: 'La nota no puede ser negativa.' } };
    if (score > maxPoints)
      return { error: { message: `La nota (${score}) supera el máximo (${maxPoints} pts).` } };
    if (isNaN(maxPoints) || maxPoints <= 0)
      return { error: { message: 'El puntaje máximo debe ser mayor a 0.' } };
    if (isNaN(weight) || weight <= 0 || weight > 100)
      return { error: { message: 'El peso debe ser entre 0.01% y 100%.' } };

    const { data, error } = await supabase
      .from('grades')
      .insert({ ...fields, score, max_points: maxPoints, weight, user_id: userId })
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

  /**
   * Weighted final grade for a course.
   * Formula: Σ (score / max_points * weight) — capped at the weight each item contributes.
   * Returns { earned, totalWeight, percentage } or null if no grades.
   */
  const courseAvg = (courseId) => {
    const gs = grades.filter(g => g.course_id === courseId);
    if (!gs.length) return null;
    const totalWeight = gs.reduce((a, g) => a + parseFloat(g.weight), 0);
    const earned      = gs.reduce((a, g) => {
      const pct = parseFloat(g.score) / parseFloat(g.max_points ?? 100);
      return a + pct * parseFloat(g.weight);
    }, 0);
    return { earned, totalWeight, percentage: totalWeight > 0 ? (earned / totalWeight) * 100 : null };
  };

  return { grades, loading, reload: load, add, remove, courseAvg };
}
