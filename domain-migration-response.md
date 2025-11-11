Hi [Name],

Thanks for reaching out. Since you're working with an external partner on the domain switch, here are some Shopify-specific considerations to keep in mind for tomorrow's launch:

**Critical Shopify-Specific Items:**

1. **Primary Domain Setting**
   - Ensure your partner sets `mwlbride.com` as the primary domain in Shopify Admin (Settings > Domains)
   - The old domain should remain connected but not as primary during the transition period
   - This ensures all Shopify-generated links (order confirmations, password resets, etc.) use the new domain

2. **Email Authentication (SPF/DKIM/DMARC)**
   - Since you're keeping the old domain active, verify email authentication records are set up for the new domain
   - Shopify Email and transactional emails need proper SPF/DKIM records on the new domain
   - This is critical to avoid email deliverability issues - we've seen merchants experience email bounces when domain authentication isn't properly configured

3. **SSL Certificate**
   - Shopify will automatically provision an SSL certificate for the new domain, but this can take a few hours
   - Verify the SSL is active before going live (you'll see a green lock icon in the browser)
   - If there are any SSL issues, they typically resolve within 24 hours, but it's worth checking

4. **Redirects & SEO**
   - Your partner should set up 301 redirects from old domain URLs to new domain URLs
   - This preserves SEO value and ensures customers/bookmarks continue to work
   - Update your sitemap.xml and submit to Google Search Console after the switch

5. **Third-Party Apps & Integrations**
   - Review any apps that might have domain-specific configurations (analytics, marketing tools, customer service platforms)
   - Some apps may need to be reconfigured with the new domain
   - Check payment gateway settings if they reference your domain

6. **Post-Launch Monitoring**
   - Test checkout flow on the new domain immediately after launch
   - Verify order confirmation emails are sending correctly
   - Monitor for any broken links or redirect issues
   - Check Google Search Console for crawl errors

**Common Issues We See:**
- Email deliverability problems when SPF/DKIM records aren't updated for the new domain
- SSL certificate delays (usually resolves within 24 hours)
- Apps that haven't been updated with the new domain causing functionality issues
- Social media links and marketing campaigns still pointing to the old domain

**If Issues Arise:**
If you encounter any problems during or after the switch, please reach out and I can help troubleshoot. Common things to check:
- Domain settings in Shopify Admin
- Email authentication records
- SSL certificate status
- Any error messages in the browser console

Since your partner is handling the technical implementation, I'd recommend confirming with them that they've addressed the above items, particularly the email authentication setup and primary domain configuration.

Good luck with the launch tomorrow! Let me know if you need any support during or after the switch.

Best regards,
Toby

