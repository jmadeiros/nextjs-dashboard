# Weekly Summary Email Setup (Supabase)

This system automatically sends a weekly facility summary email every Sunday at 8 AM using Supabase Edge Functions and pg_cron.

## 1. Deploy the Edge Function

First, make sure you have the Supabase CLI installed:

```bash
npm install -g supabase
```

Login to Supabase:

```bash
supabase login
```

Link your project (replace with your project reference):

```bash
supabase link --project-ref YOUR_PROJECT_REF
```

Deploy the Edge Function:

```bash
supabase functions deploy weekly-summary
```

## 2. Set up Environment Variables

In your Supabase dashboard, go to Project Settings > Edge Functions and add these environment variables:

- `SUPABASE_URL`: Your Supabase URL (auto-provided)
- `SUPABASE_SERVICE_ROLE_KEY`: Your service role key (auto-provided)
- `RESEND_API_KEY`: Your Resend API key for sending emails

## 3. Update Email Configuration

Edit the Edge Function (`supabase/functions/weekly-summary/index.ts`) and update:

- Line 203: Change `from: 'facility@yourdomain.com'` to your verified sender email
- Line 204: Change `to: ['facility-manager@yourdomain.com']` to your recipient email(s)

Then redeploy:

```bash
supabase functions deploy weekly-summary
```

## 4. Set up the Cron Job

Run the SQL migration to set up pg_cron:

1. Go to your Supabase dashboard
2. Open the SQL Editor
3. Replace `YOUR_SUPABASE_PROJECT_REF` in the migration file with your actual project reference
4. Run the SQL from `supabase/migrations/20240101000000_setup_weekly_summary_cron.sql`

## 5. Test the Function

You can test the function manually:

```bash
curl -X POST "https://YOUR_PROJECT_REF.supabase.co/functions/v1/weekly-summary" \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json"
```

## 6. Monitor Cron Jobs

To check if your cron job is set up correctly, run this SQL in your Supabase SQL Editor:

```sql
SELECT * FROM cron.job;
```

To see cron job execution history:

```sql
SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;
```

## Troubleshooting

- **Function not triggering**: Check that pg_cron extension is enabled and the job is scheduled
- **Email not sending**: Verify your Resend API key and sender email domain
- **Data not showing**: Ensure your database tables have the expected structure
- **Timing issues**: Remember the cron runs on UTC time

## Schedule Format

The cron schedule `0 8 * * 0` means:
- Minute: 0 (at the top of the hour)
- Hour: 8 (8 AM)
- Day of month: * (any day)
- Month: * (any month) 
- Day of week: 0 (Sunday)

To change the schedule, modify the cron expression in the SQL migration and re-run it. 