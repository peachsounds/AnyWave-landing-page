# Email Setup Instructions

You have two options for sending early access emails:

## Option 1: EmailJS (Easiest - No Backend Required)

1. **Sign up at [EmailJS](https://www.emailjs.com/)** (free tier: 200 emails/month)

2. **Create an Email Service:**
   - Go to Email Services → Add New Service
   - Choose Gmail, SendGrid, or another provider
   - Connect your email account

3. **Create an Email Template:**
   - Go to Email Templates → Create New Template
   - Use this template:
   ```
   Subject: Your AnyWave Early Access
   
   Welcome to AnyWave Beta!
   
   Thank you for joining our early access program.
   
   Download link: {{download_link}}
   
   Best regards,
   The PeachSounds Team
   ```
   - Template variables: `{{email}}`, `{{download_link}}`

4. **Get Your Credentials:**
   - Service ID: Found in Email Services
   - Template ID: Found in Email Templates
   - Public Key: Found in Account → API Keys

5. **Update `index.html`:**
   - Replace `YOUR_SERVICE_ID` with your Service ID
   - Replace `YOUR_TEMPLATE_ID` with your Template ID
   - Replace `YOUR_PUBLIC_KEY` with your Public Key
   - Update `DOWNLOAD_LINK` with your actual DMG download URL

## Option 2: Node.js Backend (More Control)

1. **Install dependencies:**
   ```bash
   cd landing-page
   npm install express nodemailer cors dotenv
   ```

2. **Create `.env` file:**
   ```
   EMAIL_USER=your-email@gmail.com
   EMAIL_PASSWORD=your-app-password
   DOWNLOAD_LINK=https://your-domain.com/downloads/AnyWave.dmg
   PORT=3000
   ```

3. **For Gmail:**
   - Enable 2-factor authentication
   - Generate an app-specific password: https://myaccount.google.com/apppasswords

4. **Run the server:**
   ```bash
   node backend-example.js
   ```

5. **Update `index.html`:**
   - Change the fetch URL from `/api/early-access` to `http://localhost:3000/api/early-access` (or your server URL)
   - Or deploy to Heroku, Vercel, or similar

## Alternative: Use SendGrid, Mailgun, or AWS SES

For production, consider using a professional email service:

- **SendGrid**: Free tier (100 emails/day)
- **Mailgun**: Free tier (5,000 emails/month)
- **AWS SES**: Very cheap ($0.10 per 1,000 emails)

Update the `transporter` configuration in `backend-example.js` with your service credentials.

