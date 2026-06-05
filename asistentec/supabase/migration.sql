-- ═══════════════════════════════════════════════════════════
--  AsistenTEC — Supabase Migration v1
--  Run this entire script in the Supabase SQL Editor.
-- ═══════════════════════════════════════════════════════════

-- ── Extensions ───────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── Courses ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.courses (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name       TEXT        NOT NULL CHECK (char_length(trim(name)) > 0),
  professor  TEXT,
  email      TEXT,
  color      TEXT        NOT NULL DEFAULT '#007AFF',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "courses_own" ON public.courses FOR ALL USING (auth.uid() = user_id);

-- ── Tasks ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.tasks (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id   UUID        REFERENCES public.courses(id) ON DELETE SET NULL,
  name        TEXT        NOT NULL CHECK (char_length(trim(name)) > 0),
  description TEXT,
  due_date    DATE,
  priority    TEXT        NOT NULL DEFAULT 'media'
                          CHECK (priority IN ('alta', 'media', 'baja')),
  type        TEXT        NOT NULL DEFAULT 'tarea',
  type_custom TEXT,
  done        BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tasks_own" ON public.tasks FOR ALL USING (auth.uid() = user_id);

-- ── Materials ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.materials (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id    UUID        NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  name         TEXT        NOT NULL,
  week         SMALLINT    CHECK (week IS NULL OR (week >= 1 AND week <= 52)),
  note         TEXT,
  analysis     TEXT,
  analyzing    BOOLEAN     NOT NULL DEFAULT FALSE,
  file_size    BIGINT,
  file_type    TEXT,
  storage_path TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY;
CREATE POLICY "materials_own" ON public.materials FOR ALL USING (auth.uid() = user_id);

-- ── Notes ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.notes (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id  UUID        REFERENCES public.courses(id) ON DELETE SET NULL,
  text       TEXT        NOT NULL CHECK (char_length(trim(text)) > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notes_own" ON public.notes FOR ALL USING (auth.uid() = user_id);

-- ── Grades ───────────────────────────────────────────────────
-- Scores are stored as percentages (0–100).
-- max_score represents the weight/max% allocated to this item (≤100).
CREATE TABLE IF NOT EXISTS public.grades (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id   UUID        NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  name        TEXT        NOT NULL CHECK (char_length(trim(name)) > 0),
  score       NUMERIC(5,2) NOT NULL
              CHECK (score >= 0),
  max_score   NUMERIC(5,2) NOT NULL DEFAULT 100
              CHECK (max_score > 0 AND max_score <= 100),
  CONSTRAINT  score_le_max CHECK (score <= max_score),
  type        TEXT        NOT NULL DEFAULT 'examen',
  type_custom TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.grades ENABLE ROW LEVEL SECURITY;
CREATE POLICY "grades_own" ON public.grades FOR ALL USING (auth.uid() = user_id);

-- ── Chat Messages ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role             TEXT        NOT NULL CHECK (role IN ('user', 'assistant')),
  content          TEXT        NOT NULL,
  course_filter_id UUID        REFERENCES public.courses(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "chat_own" ON public.chat_messages FOR ALL USING (auth.uid() = user_id);

-- ── User Config ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.user_config (
  user_id        UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  assistant_name TEXT        NOT NULL DEFAULT 'AsistenTEC',
  my_email       TEXT,
  webhook_url    TEXT,
  cal_hint       TEXT,
  ollama_model   TEXT        NOT NULL DEFAULT 'llama3',
  ollama_url     TEXT        NOT NULL DEFAULT 'http://localhost:11434',
  dark_mode      BOOLEAN     NOT NULL DEFAULT FALSE,
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.user_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "config_own" ON public.user_config FOR ALL USING (auth.uid() = user_id);

-- ── Auto-provision config row on signup ──────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.user_config (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ── Storage bucket (run once via SQL or Dashboard) ───────────
-- INSERT INTO storage.buckets (id, name, public)
--   VALUES ('materials', 'materials', false)
--   ON CONFLICT DO NOTHING;
--
-- CREATE POLICY "materials_storage_own" ON storage.objects
--   FOR ALL USING (
--     bucket_id = 'materials' AND
--     auth.uid()::text = (storage.foldername(name))[1]
--   );
