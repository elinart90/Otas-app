-- ============================================================================
-- Migration 012 — input validation hardening (corrected)
-- ============================================================================
-- Replaces the broken original. Includes:
--   * Fix for CHECK-cannot-contain-subquery (keywords now uses IMMUTABLE fn)
--   * Fix for defense_scores column name (comment, not comments)
-- ============================================================================

-- ----- Helper function for keywords array validation -----
-- CHECK constraints cannot contain inline subqueries, but they can call
-- IMMUTABLE functions. We wrap the per-element validation in a function.
CREATE OR REPLACE FUNCTION public.keywords_valid(kw text[]) RETURNS boolean
LANGUAGE sql IMMUTABLE AS $$
  SELECT
    kw IS NULL
    OR (
      coalesce(array_length(kw, 1), 0) <= 10
      AND coalesce(
        (SELECT bool_and(char_length(k) BETWEEN 1 AND 40 AND btrim(k) <> '')
         FROM unnest(kw) AS k),
        TRUE
      )
    );
$$;

-- ----- projects -----
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_name = 'projects_title_len'
  ) THEN
    ALTER TABLE public.projects
      ADD CONSTRAINT projects_title_len
      CHECK (char_length(btrim(title)) BETWEEN 5 AND 300);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_name = 'projects_abstract_len'
  ) THEN
    ALTER TABLE public.projects
      ADD CONSTRAINT projects_abstract_len
      CHECK (char_length(btrim(abstract)) BETWEEN 50 AND 5000);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_name = 'projects_academic_year_range'
  ) THEN
    ALTER TABLE public.projects
      ADD CONSTRAINT projects_academic_year_range
      CHECK (academic_year BETWEEN 2000 AND 2099);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_name = 'projects_keywords_bounds'
  ) THEN
    ALTER TABLE public.projects
      ADD CONSTRAINT projects_keywords_bounds
      CHECK (public.keywords_valid(keywords));
  END IF;
END $$;

-- ----- archives -----
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_name = 'archives_code_format'
  ) THEN
    ALTER TABLE public.archives
      ADD CONSTRAINT archives_code_format
      CHECK (archive_code ~ '^ARC-[0-9]{4}-[A-Z0-9]{3,12}$');
  END IF;
END $$;

-- ----- supervisions -----
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_name = 'supervisions_notes_len'
  ) THEN
    ALTER TABLE public.supervisions
      ADD CONSTRAINT supervisions_notes_len
      CHECK (notes IS NULL OR char_length(notes) <= 2000);
  END IF;
END $$;

-- ----- defense_sessions -----
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_name = 'defense_venue_len'
  ) THEN
    ALTER TABLE public.defense_sessions
      ADD CONSTRAINT defense_venue_len
      CHECK (venue IS NULL OR char_length(btrim(venue)) BETWEEN 2 AND 120);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_name = 'defense_decision_notes_len'
  ) THEN
    ALTER TABLE public.defense_sessions
      ADD CONSTRAINT defense_decision_notes_len
      CHECK (decision_notes IS NULL OR char_length(decision_notes) <= 2000);
  END IF;
END $$;

-- ----- defense_scores (column is `comment`, singular) -----
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_name = 'defense_scores_range'
  ) THEN
    ALTER TABLE public.defense_scores
      ADD CONSTRAINT defense_scores_range
      CHECK (score BETWEEN 0 AND 10);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_name = 'defense_scores_comment_len'
  ) THEN
    ALTER TABLE public.defense_scores
      ADD CONSTRAINT defense_scores_comment_len
      CHECK (comment IS NULL OR char_length(comment) <= 1000);
  END IF;
END $$;