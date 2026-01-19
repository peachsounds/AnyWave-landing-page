# Lemon Squeezy → PostHog Webhook Worker

This Cloudflare Worker receives webhooks from Lemon Squeezy and forwards events to PostHog for funnel tracking.

## Events Tracked

| Lemon Squeezy Event | PostHog Event | Description |
|---------------------|---------------|-------------|
| `order_created` | `checkout_completed` | User completed checkout |
| `license_key_created` | `license_key_created` | License key was generated |
| `subscription_created` | `subscription_created` | Subscription started |

## Setup Instructions

### 1. Install Wrangler CLI

```bash
npm install -g wrangler
```

### 2. Login to Cloudflare

```bash
wrangler login
```

### 3. Deploy the Worker

```bash
cd landing-page/webhook-worker
wrangler deploy
```

You'll get a URL like: `https://peachsounds-webhook.YOUR_SUBDOMAIN.workers.dev`

### 4. Set Webhook Secret (Optional but Recommended)

Get your webhook secret from Lemon Squeezy dashboard, then:

```bash
wrangler secret put LEMONSQUEEZY_WEBHOOK_SECRET
# Paste your secret when prompted
```

### 5. Configure Lemon Squeezy Webhook

1. Go to [Lemon Squeezy Dashboard](https://app.lemonsqueezy.com/settings/webhooks)
2. Click "Add Webhook"
3. Set the URL to: `https://peachsounds-webhook.YOUR_SUBDOMAIN.workers.dev/webhook/lemonsqueezy`
4. Select events:
   - ✅ `order_created`
   - ✅ `license_key_created`
   - ✅ `subscription_created` (if using subscriptions)
5. Copy the signing secret and set it via `wrangler secret put` (step 4)

### 6. Test the Webhook

You can test with a health check:

```bash
curl https://peachsounds-webhook.YOUR_SUBDOMAIN.workers.dev/health
# Should return: OK
```

## Funnel Flow

```
Landing Page                 Lemon Squeezy              Cloudflare Worker         PostHog
────────────────────────────────────────────────────────────────────────────────────────────
1. landing_page_viewed ─────────────────────────────────────────────────────────► Event
   (uuid: abc-123)

2. application_submitted ───────────────────────────────────────────────────────► Event
   (uuid → alias → hash-email)

3. Redirect to checkout ───► Checkout page
   (passes hashed_email,     (custom data stored)
    uuid in URL)

4. User completes checkout ─► order_created webhook ──► checkout_completed ────► Event
                              (includes custom data)    (distinct_id: hash-email)

5. License key generated ───► license_key_created ────► license_key_created ───► Event
                              webhook                   (distinct_id: hash-email)
```

## Debugging

View worker logs:

```bash
wrangler tail
```

Check PostHog for events with `$lib: cloudflare-worker` property.

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `LEMONSQUEEZY_WEBHOOK_SECRET` | Webhook signing secret | Recommended |

## Local Development

```bash
wrangler dev
```

Then use ngrok or similar to expose locally for webhook testing.

