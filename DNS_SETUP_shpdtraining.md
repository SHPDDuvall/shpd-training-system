# DNS Configuration for shpdtraining.com

## Required DNS Record

To connect **shpdtraining.com** to your Vercel deployment, add the following DNS record in your DreamHost DNS settings:

| Type | Name | Value |
|------|------|-------|
| **A** | **@** | **216.198.79.1** |

## Instructions

1. Log in to your **DreamHost** account
2. Go to **DNS Settings** for `shpdtraining.com`
3. Add a new **A record**:
   - **Type:** A
   - **Name/Host:** `@` (this represents the root domain)
   - **Value:** `216.198.79.1`
   - **TTL:** Default (or 60 seconds for faster propagation)
4. **Save** the record

## What This Does

- The A record points `shpdtraining.com` to Vercel's IP address
- The redirect to `www.shpdtraining.com` is already configured on Vercel
- Once DNS propagates (1-5 minutes), your site will be live at both:
  - https://shpdtraining.com
  - https://www.shpdtraining.com

## Current Status

- ✅ Domain added to Vercel project
- ✅ Redirect configured (shpdtraining.com → www.shpdtraining.com)
- ⏳ Waiting for DNS configuration
- ⏳ SSL certificate will be issued automatically after DNS verification

## Note

As part of Vercel's planned IP range expansion, you may notice "new records" mentioned. The old records of `cname.vercel-dns.com` and `76.76.21.21` will continue to work, but the new IP `216.198.79.1` is the current recommended value.

It might take some time for the DNS records to apply after you add them.
