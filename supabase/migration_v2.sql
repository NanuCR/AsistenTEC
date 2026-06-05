-- ═══════════════════════════════════════════════════════════
--  AsistenTEC — Migration v2
--  Run this in Supabase SQL Editor AFTER migration v1.
-- ═══════════════════════════════════════════════════════════

-- Add weight column to grades (% weight in final course grade, 0-100)
ALTER TABLE public.grades
  ADD COLUMN IF NOT EXISTS weight NUMERIC(5,2) NOT NULL DEFAULT 100
    CHECK (weight > 0 AND weight <= 100);

-- Rename max_score to max_points for clarity (points scale, not %)
-- max_points = point scale of the item (e.g. 100 for a 100-point exam)
ALTER TABLE public.grades
  RENAME COLUMN max_score TO max_points;

-- Add file_content column to materials for AI context
ALTER TABLE public.materials
  ADD COLUMN IF NOT EXISTS file_content TEXT;
