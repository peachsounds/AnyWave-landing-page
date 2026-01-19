# Fix: Change "From Email" to beta@peachsounds.com

## The Problem
EmailJS uses the "From Email" set in your **EmailJS template settings**, not the parameters you pass in code. If you're using Gmail, it will always use your Gmail address.

## Solution: Use SendGrid (Supports Custom From Address)

### Step 1: Set Up SendGrid Service in EmailJS

1. **Go to EmailJS Dashboard:** https://dashboard.emailjs.com/
2. **Email Services** → Click your current service (or create new)
3. **If using Gmail:** You need to switch to SendGrid
   - Gmail doesn't allow custom "From" addresses
   - SendGrid does allow custom "From" addresses

### Step 2: Connect SendGrid

1. **Get SendGrid API Key:**
   - Sign up at https://sendgrid.com/ (free: 100 emails/day)
   - Go to Settings → API Keys
   - Create API Key with "Mail Send" permission
   - Copy the key

2. **Add SendGrid to EmailJS:**
   - EmailJS Dashboard → Email Services → Add New Service
   - Choose "SendGrid"
   - Paste your API key
   - Save

### Step 3: Update Your Template

1. **Go to Email Templates** in EmailJS
2. **Click on your template** (template_hxm32ii)
3. **In the template editor, find "From Email" field**
4. **Change it to:** `beta@peachsounds.com`
5. **"From Name" can be:** `AnyWave`
6. **Save the template**

### Step 4: Verify Your Domain (Important!)

For `beta@peachsounds.com` to work, you need to verify your domain in SendGrid:

1. **In SendGrid Dashboard:**
   - Go to Settings → Sender Authentication → Domain Authentication
   - Click "Authenticate Your Domain"
   - Enter `peachsounds.com`
   - Follow DNS setup instructions

2. **Add DNS Records:**
   - SendGrid will give you TXT and CNAME records
   - Add them to your domain's DNS settings
   - Wait for verification (can take a few hours)

3. **Until verified:**
   - You can still send emails
   - But they might go to spam
   - Once verified, emails will be properly authenticated

### Step 5: Update Your Service ID

If you created a new SendGrid service, update the SERVICE_ID in your code:

```javascript
const EMAILJS_SERVICE_ID = 'your_new_sendgrid_service_id';
```

## Alternative: If You Must Use Gmail

If you absolutely need to use Gmail, you can:
1. Create a Gmail alias: `beta.peachsounds@gmail.com`
2. Set up email forwarding from `beta@peachsounds.com` to that Gmail
3. Use the Gmail address in EmailJS template

But this is not recommended - SendGrid is better for custom domains.

## Testing

After making changes:
1. Submit the form again
2. Check the email you receive
3. The "From" address should now be `beta@peachsounds.com`

## Quick Checklist

- [ ] SendGrid account created
- [ ] SendGrid API key generated
- [ ] SendGrid service added to EmailJS
- [ ] Template "From Email" set to `beta@peachsounds.com`
- [ ] Domain verified in SendGrid (optional but recommended)
- [ ] SERVICE_ID updated in code (if using new service)

