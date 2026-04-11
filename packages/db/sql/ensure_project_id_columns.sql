-- Idempotent: adds public.<table>.project_id when missing (legacy Rails / partial schemas).
-- Backfills from the first row in `projects` by id, then SET NOT NULL where the app requires it.
-- Run after ensure_projects_and_members.sql so `projects` exists.
-- Matches packages/db/src/schema.ts.

DO $$
DECLARE
  r record;
  first_project bigint;
  still_null boolean;
  has_rows boolean;
BEGIN
  SELECT p.id INTO first_project FROM public.projects p ORDER BY p.id ASC LIMIT 1;

  FOR r IN
    SELECT tbl_name, idx_name, require_not_null
    FROM (
      VALUES
        ('feedbacks'::text, 'index_feedbacks_on_project_id'::text, true),
        ('pulse_reports'::text, 'index_pulse_reports_on_project_id'::text, true),
        ('email_recipients'::text, 'index_email_recipients_on_project_id'::text, true),
        ('integrations'::text, 'index_integrations_on_project_id'::text, true),
        ('insights'::text, 'index_insights_on_project_id'::text, true),
        ('ideas'::text, 'index_ideas_on_project_id'::text, true),
        ('themes'::text, 'index_themes_on_project_id'::text, true),
        ('stakeholder_segments'::text, 'index_stakeholder_segments_on_project_id'::text, true),
        ('pm_personas'::text, 'index_pm_personas_on_project_id'::text, true),
        -- skills.project_id is nullable in Drizzle; only add the column + index, no NOT NULL.
        ('skills'::text, 'index_skills_on_project_id'::text, false)
    ) AS v(tbl_name, idx_name, require_not_null)
  LOOP
    -- Table not created yet (minimal DB) — skip until Drizzle/Rails creates it.
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = r.tbl_name
    ) THEN
      CONTINUE;
    END IF;

    -- Column already there: still create the btree index if someone hand-edited the DB.
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = r.tbl_name AND column_name = 'project_id'
    ) THEN
      EXECUTE format(
        'CREATE INDEX IF NOT EXISTS %I ON public.%I USING btree (project_id)',
        r.idx_name,
        r.tbl_name
      );
      CONTINUE;
    END IF;

    EXECUTE format('ALTER TABLE public.%I ADD COLUMN project_id bigint', r.tbl_name);

    IF first_project IS NOT NULL THEN
      EXECUTE format(
        'UPDATE public.%I SET project_id = $1 WHERE project_id IS NULL',
        r.tbl_name
      ) USING first_project;
    END IF;

    EXECUTE format(
      'SELECT EXISTS (SELECT 1 FROM public.%I LIMIT 1)',
      r.tbl_name
    ) INTO has_rows;

    IF r.require_not_null THEN
      EXECUTE format(
        'SELECT EXISTS (SELECT 1 FROM public.%I WHERE project_id IS NULL LIMIT 1)',
        r.tbl_name
      ) INTO still_null;
      IF still_null AND has_rows THEN
        RAISE EXCEPTION
          'Table % has rows but project_id could not be filled (add a project or truncate the table), then re-run yarn db:ensure-membership.',
          r.tbl_name;
      END IF;
      EXECUTE format(
        'ALTER TABLE public.%I ALTER COLUMN project_id SET NOT NULL',
        r.tbl_name
      );
    END IF;

    EXECUTE format(
      'CREATE INDEX IF NOT EXISTS %I ON public.%I USING btree (project_id)',
      r.idx_name,
      r.tbl_name
    );
  END LOOP;
END $$;
