# Supabase Edge Functions Deployment Guide

## Current Issue
The edge function deployment is failing due to an import error with `date-fns-tz` which is not available in Deno runtime.

## Steps to Deploy Edge Functions

### 1. First, ensure you're in the project directory:
```bash
cd /path/to/webinar-insight-engine
```

### 2. Install Supabase CLI if not already installed:
```bash
npm install -g supabase
```

### 3. Login to Supabase:
```bash
supabase login
```

### 4. Link your project:
```bash
supabase link --project-ref <your-project-ref>
```

### 5. Deploy the zoom-api function:
```bash
supabase functions deploy zoom-api
```

## Troubleshooting the Import Error

If you're getting the `date-fns-tz` import error, it's likely because:

1. The edge function is trying to import frontend code
2. There's a symlink or path issue in the deployment

### Quick Fix:

1. **Check for any symlinks** in the supabase/functions directory:
```bash
find supabase/functions -type l
```

2. **Clean and redeploy**:
```bash
# Remove any build artifacts
rm -rf supabase/functions/.cache
rm -rf supabase/functions/.deno

# Deploy again
supabase functions deploy zoom-api
```

3. **If the error persists**, check if there are any hardcoded paths:
```bash
grep -r "c:/Users" supabase/functions/
```

### Alternative Deployment Method:

If the standard deployment doesn't work, try deploying with the --no-verify-jwt flag for testing:

```bash
supabase functions deploy zoom-api --no-verify-jwt
```

## Verifying Deployment

After successful deployment:

1. **Check function status**:
```bash
supabase functions list
```

2. **View function logs**:
```bash
supabase functions logs zoom-api
```

3. **Test the function** from your application by running a manual sync

## Environment Variables

Make sure your edge function has access to the required environment variables:

1. Go to your Supabase Dashboard
2. Navigate to Edge Functions
3. Click on your `zoom-api` function
4. Add the following secrets if not already present:
   - `ZOOM_ACCOUNT_ID`
   - `ZOOM_CLIENT_ID`
   - `ZOOM_CLIENT_SECRET`

## Additional Notes

- Edge Functions use Deno runtime, not Node.js
- NPM packages need to be compatible with Deno or use CDN imports
- File paths in Edge Functions are relative to the function directory
- Supabase Edge Functions cannot access files outside the function directory

## If All Else Fails

1. Check the Supabase CLI logs for more details:
```bash
supabase functions deploy zoom-api --debug
```

2. Ensure your Supabase CLI is up to date:
```bash
supabase update
```

3. Try deploying from a clean clone of the repository to rule out local issues
