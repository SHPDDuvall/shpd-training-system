# Edge Function Update - Deployment Instructions

## What Was Updated

The `send-approval-email` Edge Function has been updated to use the new sender email address from the environment variable.

### Changes Made:

1. **Added SENDER_EMAIL environment variable** in Supabase Secrets
   - Variable: `SENDER_EMAIL`
   - Value: `info@shpdtraining.com`
   - Status: ✅ Successfully added

2. **Updated Edge Function code** to use the environment variable
   - The function now reads `SENDER_EMAIL` from environment
   - Falls back to `info@shpdtraining.com` if not set
   - All other functionality remains the same (SendGrid, HTML templates, etc.)

## Deployment Options

### Option 1: Deploy via Supabase CLI (Recommended)

```bash
# Install Supabase CLI if not already installed
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref bthvzjfpmnmlismmprra

# Deploy the updated function
cd /home/ubuntu/shpd-training-system/supabase-function-update
supabase functions deploy send-approval-email
```

### Option 2: Deploy via Supabase Dashboard

1. Go to: https://supabase.com/dashboard/project/bthvzjfpmnmlismmprra/functions/send-approval-email/code
2. Click on the code editor
3. Replace the entire content with the code from `index.ts`
4. Click "Deploy updates" button

### Option 3: Manual Upload

1. Go to Edge Functions page
2. Click "Deploy a new function"
3. Upload the `index.ts` file
4. Name it `send-approval-email` (will update existing function)

## Verification

After deployment, verify the update:

1. Check the function details page
2. Look for the latest deployment timestamp
3. Test by submitting a training request
4. Verify email is sent from `info@shpdtraining.com`

## What Stays the Same

✅ **SendGrid integration** - No changes
✅ **Professional HTML templates** - No changes  
✅ **All email functionality** - No changes
✅ **API endpoints** - No changes

## What Changed

🔄 **Sender email address**: Now uses `info@shpdtraining.com`
🔄 **Configuration method**: Now uses environment variable for flexibility

## Rollback (if needed)

If you need to rollback, the previous deployment is still available in Supabase. You can:

1. Go to the function details page
2. View deployment history
3. Select a previous deployment to restore

## Support

If you encounter any issues:
- Check Supabase function logs
- Verify SENDER_EMAIL secret is set correctly
- Ensure SendGrid API key is still valid
