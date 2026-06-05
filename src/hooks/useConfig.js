import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

const DEFAULTS = {
  assistant_name: 'AsistenTEC',
  my_email:       '',
  webhook_url:    '',
  cal_hint:       '',
  ollama_model:   'llama3',
  ollama_url:     'http://localhost:11434',
  dark_mode:      false,
};

export function useConfig(userId) {
  const [config, setConfig]   = useState(DEFAULTS);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!userId) { setLoading(false); return; }
    setLoading(true);
    const { data } = await supabase
      .from('user_config')
      .select('*')
      .eq('user_id', userId)
      .single();
    if (data) setConfig({ ...DEFAULTS, ...data });
    setLoading(false);
  }, [userId]);

  useEffect(() => { load(); }, [load]);

  const save = async (patch) => {
    const merged = { ...config, ...patch };
    setConfig(merged);
    const { error } = await supabase
      .from('user_config')
      .upsert({ ...merged, user_id: userId, updated_at: new Date().toISOString() });
    return { error };
  };

  return { config, loading, save };
}
