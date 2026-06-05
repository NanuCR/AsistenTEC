import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export function useMaterials(userId, courseFilter) {
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading]     = useState(true);

  const load = useCallback(async () => {
    if (!userId) { setMaterials([]); setLoading(false); return; }
    setLoading(true);
    let q = supabase
      .from('materials')
      .select('*')
      .eq('user_id', userId)
      .order('created_at');
    if (courseFilter) q = q.eq('course_id', courseFilter);
    const { data, error } = await q;
    if (!error && data) setMaterials(data);
    setLoading(false);
  }, [userId, courseFilter]);

  useEffect(() => { load(); }, [load]);

  const add = async (fields) => {
    const { data, error } = await supabase
      .from('materials')
      .insert({ ...fields, user_id: userId })
      .select()
      .single();
    if (!error && data) setMaterials(p => [...p, data]);
    return { data, error };
  };

  const update = async (id, patch) => {
    const { error } = await supabase.from('materials').update(patch).eq('id', id);
    if (!error) setMaterials(p => p.map(m => m.id === id ? { ...m, ...patch } : m));
    return { error };
  };

  const remove = async (id) => {
    // Attempt to delete from Storage if a path exists
    const mat = materials.find(m => m.id === id);
    if (mat?.storage_path) {
      await supabase.storage.from('materials').remove([mat.storage_path]);
    }
    const { error } = await supabase.from('materials').delete().eq('id', id);
    if (!error) setMaterials(p => p.filter(m => m.id !== id));
    return { error };
  };

  /** Upload a file to Supabase Storage and return the public path. */
  const uploadFile = async (userId, file) => {
    const ext  = file.name.split('.').pop();
    const path = `${userId}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage
      .from('materials')
      .upload(path, file, { upsert: false });
    if (error) return { path: null, error };
    return { path, error: null };
  };

  /** Get a short-lived signed URL for download. */
  const getDownloadUrl = async (storagePath) => {
    const { data, error } = await supabase.storage
      .from('materials')
      .createSignedUrl(storagePath, 60 * 5); // 5 min
    return { url: data?.signedUrl ?? null, error };
  };

  return { materials, loading, reload: load, add, update, remove, uploadFile, getDownloadUrl };
}
