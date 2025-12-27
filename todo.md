# Project TODO

## Completed
- [x] Add image upload ability to External deployment request form (like available training)
- [x] Fix build configuration for production deployment (MODULE_NOT_FOUND error)
- [x] Hide demo credentials from login page (keep only password change notice)
- [x] Restore dynamic training course count on login page (was showing "7", now hardcoded "15+")

## Email Service Migration
- [x] Switch from Brevo to SendGrid for better email deliverability
- [x] Set up SendGrid account and domain authentication
- [x] Update Edge Function to use SendGrid API
- [x] Configure SENDGRID_API_KEY in Supabase
- [x] Test email delivery to @shakerheightsoh.gov addresses
- [x] Deploy new professional HTML email template
