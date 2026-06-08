-- Remove duplicate toolbox talk topic rows caused by the seed migration running twice.
-- Keeps the earliest-inserted copy of each title and deletes the rest.
DELETE FROM public.toolbox_talk_topics
WHERE id IN (
  SELECT id FROM (
    SELECT id,
           ROW_NUMBER() OVER (PARTITION BY title ORDER BY created_at) AS rn
    FROM public.toolbox_talk_topics
  ) t
  WHERE rn > 1
);
