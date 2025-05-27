# Webinar Insight Engine - Deployment Instructions

## Edge Functions Deployment

### Prerequisites
1. Install Supabase CLI:
   ```bash
   npm install -g supabase
   ```

2. Set up your Supabase project credentials:
   - Get your Project Reference ID from Supabase Dashboard
   - Get your Access Token from Supabase Dashboard (Settings > API)

### Manual Deployment

To deploy the Edge Functions manually:

```bash
# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref <your-project-ref>

# Deploy the zoom-api function
supabase functions deploy zoom-api

# Deploy the storage-init function
supabase functions deploy storage-init
```

### Automatic Deployment

The repository includes a GitHub Action workflow that automatically deploys Edge Functions when changes are pushed to the `main` branch.

To set up automatic deployment:

1. Go to your repository settings on GitHub
2. Navigate to Settings > Secrets and variables > Actions
3. Add the following secrets:
   - `SUPABASE_PROJECT_REF`: Your Supabase project reference ID
   - `SUPABASE_ACCESS_TOKEN`: Your Supabase access token

Once configured, any changes to files in `supabase/functions/` will trigger automatic deployment.

### Recent Fixes Applied

1. **Edge Function Timeout**: Increased timeout from 30s to 50s to handle large data processing
2. **Actual Duration Logging**: Added detailed logging to track actual_duration data fetching
3. **UI Warning Fix**: Fixed ResponsiveContainer warning in charts

### Troubleshooting

If you encounter issues:

1. Check Edge Function logs in Supabase Dashboard
2. Verify your Zoom API credentials are correctly configured
3. Ensure the database migrations have been applied
4. Check that the actual_duration column exists in your zoom_webinars table

### Database Migration

Make sure to run the latest migration to add the actual_duration column:

```sql
-- This migration should already be applied, but verify it exists
ALTER TABLE zoom_webinars ADD COLUMN IF NOT EXISTS actual_duration INTEGER;
```
