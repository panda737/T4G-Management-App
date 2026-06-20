-- Toolbox talk topics: support management-added topics and a "suggested" topic.
-- is_custom marks topics added in-app (editable/deletable by management/admin;
-- seeded library topics stay protected). is_suggested flags the single topic
-- management wants operators to run next (app keeps only one suggested at a time);
-- it shows with a green highlight in the topic picker.

-- suggested_at marks when the topic was suggested; a suggestion stays active until
-- the topic has been recorded 3 times (once per shift) after that timestamp, then
-- the app clears is_suggested automatically.
ALTER TABLE public.toolbox_talk_topics
  ADD COLUMN IF NOT EXISTS is_suggested boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_custom    boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS suggested_at timestamptz;

NOTIFY pgrst, 'reload schema';
