# Setting Up Custom Domain Email (beta@peachsounds.com)

You have several options to send emails from `beta@peachsounds.com`:

## Option 1: SendGrid with EmailJS (Recommended)

SendGrid is the easiest way to use a custom domain with EmailJS.

### Steps:

1. **Sign up for SendGrid** (free tier: 100 emails/day)
   - Go to https://sendgrid.com/
   - Create an account

2. **Verify Your Domain:**
   - Go to Settings → Sender Authentication → Domain Authentication
   - Add `peachsounds.com`
   - Follow the DNS setup instructions (add TXT and CNAME records to your domain)
   - Wait for verification (can take a few hours)

3. **Create an API Key:**
   - Go to Settings → API Keys
   - Create a new API key with "Mail Send" permissions
   - Copy the key

4. **Connect SendGrid to EmailJS:**
   - Go to EmailJS Dashboard → Email Services
   - Click "Add New Service"
   - Choose "SendGrid"
   - Enter your SendGrid API Key
   - Save

5. **Update Your Email Template:**
   - In EmailJS, edit your template
   - The "From Email" field should be set to: `beta@peachsounds.com`
   - Or use template variable: `{{from_email}}`
   - The "From Name" can be: `AnyWave` or `{{from_name}}`

6. **Test:**
   - Emails will now be sent from `beta@peachsounds.com`

## Option 2: Mailgun with EmailJS

Similar to SendGrid:

1. **Sign up for Mailgun** (free tier: 5,000 emails/month)
2. **Verify your domain** in Mailgun dashboard
3. **Get API credentials**
4. **Connect to EmailJS** using Mailgun service
5. **Set from_email** in template to `beta@peachsounds.com`

## Option 3: Backend with SMTP (Most Control)

If you have your own email server or want full control:

1. **Set up SMTP for your domain:**
   - Use your hosting provider's SMTP (if you have hosting for peachsounds.com)
   - Or use a service like Google Workspace, Microsoft 365, etc.

2. **Use the backend example:**
   - Update `backend-example.js` with your SMTP settings
   - Set the `from` field to `beta@peachsounds.com`

3. **SMTP Configuration Example:**
   ```javascript
   const transporter = nodemailer.createTransport({
       host: 'smtp.peachsounds.com', // or your SMTP server
       port: 587,
       secure: false,
       auth: {
           user: 'beta@peachsounds.com',
           pass: 'your-password'
       }
   });
   ```

## Quick Setup with SendGrid (Recommended)

**Fastest path:**
1. Sign up for SendGrid (5 minutes)
2. Verify domain (add DNS records - 10 minutes, wait for verification - up to 24 hours)
3. Connect to EmailJS (2 minutes)
4. Update template to use `beta@peachsounds.com` as from address
5. Done!

**Note:** Until your domain is verified, you can still use SendGrid but emails will come from a SendGrid address. Once verified, all emails will be from `beta@peachsounds.com`.

## Testing

After setup, test by submitting the form. Check:
- Email arrives in inbox
- "From" address shows as `beta@peachsounds.com`
- Reply-to is `beta@peachsounds.com`

