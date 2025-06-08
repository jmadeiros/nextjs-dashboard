-- Enable the pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Create a cron job to trigger the weekly summary every Sunday at 8 AM
-- The job will call the Supabase Edge Function we created
SELECT cron.schedule(
    'weekly-facility-summary',           -- job name
    '0 8 * * 0',                        -- cron schedule (Sundays at 8 AM)
    $$
    SELECT
      net.http_post(
        url := 'https://opulkiaxqlfpockirwyu.supabase.co/functions/v1/weekly-summary',
        headers := '{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('app.service_role_key') || '"}'::jsonb,
        body := '{}'::jsonb
      ) as request_id;
    $$
);

-- To list all cron jobs (for debugging):
-- SELECT * FROM cron.job;

-- To delete the job if needed:
-- SELECT cron.unschedule('weekly-facility-summary'); 