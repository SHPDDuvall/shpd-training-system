# DNS Configuration for training.shakerpd.com

The domain **training.shakerpd.com** has been added to the Vercel project. To complete the setup, you need to add the following DNS records at your domain registrar:

## Required DNS Records

### CNAME Record
| Type | Name | Value |
|------|------|-------|
| CNAME | training | 2e8ce01bfd74bb70.vercel-dns-017.com. |

### TXT Record (for verification)
| Type | Name | Value |
|------|------|-------|
| TXT | _vercel | vc-domain-verify=training.shakerpd.com,091bcb29e8f8e9adacfb |

## Instructions

1. Log in to your DNS provider (where shakerpd.com is registered)
2. Add the CNAME record pointing `training` to the Vercel DNS address
3. Add the TXT record for domain verification
4. Wait for DNS propagation (can take up to 48 hours, but usually completes within minutes)
5. Click "Refresh" on the Vercel domains page to verify the configuration

## Notes

- The domain is linked to another Vercel account, so the TXT verification record is required
- You can remove the TXT record after verification is complete
- The site will be accessible at https://training.shakerpd.com once DNS propagation is complete
