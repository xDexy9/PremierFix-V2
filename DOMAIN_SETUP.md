# Setting Up Custom Domain for PremierFix

This guide provides step-by-step instructions for connecting your custom domain `premierfix.uk` to Firebase Hosting.

## Firebase Hosting Setup

1. **Login to Firebase Console**
   - Go to [https://console.firebase.google.com/](https://console.firebase.google.com/)
   - Select your `premierfix-prod` project

2. **Navigate to Hosting**
   - In the left sidebar, click on "Hosting"
   - You should see your existing Firebase app already deployed

3. **Add Custom Domain**
   - Click on "Add custom domain"
   - Enter `premierfix.uk` and click "Continue"
   - Firebase will verify domain ownership through DNS records

4. **Choose Verification Method**
   - Select "Add DNS record" for domain verification
   - Firebase will provide you with a TXT record to add to your DNS configuration
   - Copy the provided TXT record details (name and value)

## Fasthosts DNS Configuration

1. **Login to Fasthosts**
   - Go to [https://www.fasthosts.co.uk/](https://www.fasthosts.co.uk/) and login to your account
   - Navigate to your domain management section for `premierfix.uk`

2. **Access DNS Settings**
   - Find and click on "DNS Settings" or "Manage DNS" for your domain

3. **Add TXT Record for Verification**
   - Add a new TXT record using the details provided by Firebase:
     - Type: TXT
     - Name/Host: Usually `@` or the specific subdomain name Firebase provided
     - Value: The verification code provided by Firebase
     - TTL: 3600 (or default)
   - Save your changes

4. **Add A Records for Firebase Hosting**
   - Add the following A records to point your domain to Firebase hosting:
     ```
     Type: A
     Name: @
     Value: 151.101.1.195
     TTL: 3600 (or default)
     
     Type: A
     Name: @
     Value: 151.101.65.195
     TTL: 3600 (or default)
     ```
   - Note: Firebase may provide different IP addresses in their console. Always use the IPs shown in your Firebase console.

5. **Add AAAA Records (Optional for IPv6)**
   - If you want to support IPv6, add the AAAA records shown in your Firebase console

6. **Add www Subdomain (Recommended)**
   - To support `www.premierfix.uk`, add a CNAME record:
     ```
     Type: CNAME
     Name: www
     Value: premierfix.uk
     TTL: 3600 (or default)
     ```

## Verify Domain Setup

1. **Complete Verification in Firebase**
   - Return to Firebase Console
   - Click "Verify" to check if the DNS TXT record has propagated
   - Note: DNS changes can take up to 24-48 hours to propagate globally

2. **Finalize Domain Connection**
   - Once verification is complete, Firebase will provide additional A/AAAA records to add
   - Add these records to your Fasthosts DNS settings as described above
   - Click "Finish" in Firebase console

3. **Test Your Domain**
   - DNS propagation may take several hours
   - Once propagated, visit `premierfix.uk` in your browser
   - Your PremierFix application should be accessible through your custom domain

## Troubleshooting

1. **Domain Not Working After 48 Hours**
   - Verify all DNS records are correctly entered in Fasthosts
   - Use [DNS Checker](https://dnschecker.org/) to check propagation status
   - Ensure there are no conflicting DNS records

2. **SSL Certificate Issues**
   - Firebase automatically provisions SSL certificates for custom domains
   - If you see certificate warnings, wait 24 hours as certificate provisioning may take time

3. **Contact Firebase Support**
   - If issues persist, contact Firebase support through the Firebase console

## Additional Resources

- [Firebase Custom Domain Documentation](https://firebase.google.com/docs/hosting/custom-domain)
- [Fasthosts DNS Documentation](https://help.fasthosts.co.uk/app/answers/detail/a_id/1425/~/changing-dns-settings)

---

**Important Note**: Always ensure you have access to both your Firebase console and Fasthosts account before starting this process. Remember that DNS changes can take time to propagate, so plan accordingly. 