/**
 * Lemon Squeezy → PostHog Webhook Worker
 * 
 * Receives webhooks from Lemon Squeezy and forwards events to PostHog
 * Deploy to Cloudflare Workers
 */

// PostHog configuration
const POSTHOG_API_KEY = 'phc_dnl6DeJCzmkXoxbCBB76zohIRKJddLrBFIxsdMzbsyg';
const POSTHOG_HOST = 'https://us.i.posthog.com';

// Lemon Squeezy webhook secret (set this in Cloudflare dashboard as environment variable)
// const LEMONSQUEEZY_WEBHOOK_SECRET = env.LEMONSQUEEZY_WEBHOOK_SECRET;

/**
 * SHA-256 hash function (matches the JS landing page implementation)
 */
async function hashEmail(email) {
    const normalized = email.toLowerCase().trim();
    const encoder = new TextEncoder();
    const data = encoder.encode(normalized);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Verify Lemon Squeezy webhook signature
 */
async function verifySignature(payload, signature, secret) {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
        'raw',
        encoder.encode(secret),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
    );
    
    const signatureBuffer = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
    const expectedSignature = Array.from(new Uint8Array(signatureBuffer))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
    
    return signature === expectedSignature;
}

/**
 * Send event to PostHog
 */
async function sendToPostHog(event, distinctId, properties) {
    const response = await fetch(`${POSTHOG_HOST}/capture/`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            api_key: POSTHOG_API_KEY,
            event: event,
            distinct_id: distinctId,
            properties: {
                ...properties,
                $lib: 'cloudflare-worker'
            },
            timestamp: new Date().toISOString()
        })
    });
    
    return response.ok;
}

/**
 * Main webhook handler
 */
async function handleWebhook(request, env) {
    // Only accept POST requests
    if (request.method !== 'POST') {
        return new Response('Method not allowed', { status: 405 });
    }
    
    try {
        const payload = await request.text();
        const signature = request.headers.get('X-Signature');
        
        // Verify webhook signature (optional but recommended)
        if (env.LEMONSQUEEZY_WEBHOOK_SECRET && signature) {
            const isValid = await verifySignature(payload, signature, env.LEMONSQUEEZY_WEBHOOK_SECRET);
            if (!isValid) {
                console.error('Invalid webhook signature');
                return new Response('Invalid signature', { status: 401 });
            }
        }
        
        const data = JSON.parse(payload);
        const eventName = data.meta?.event_name;
        
        console.log('Received Lemon Squeezy event:', eventName);
        
        // Handle different Lemon Squeezy events
        if (eventName === 'order_created') {
            await handleOrderCreated(data);
        } else if (eventName === 'subscription_created') {
            await handleSubscriptionCreated(data);
        } else if (eventName === 'license_key_created') {
            await handleLicenseKeyCreated(data);
        }
        
        return new Response('OK', { status: 200 });
        
    } catch (error) {
        console.error('Webhook error:', error);
        return new Response('Internal error', { status: 500 });
    }
}

/**
 * Create alias in PostHog to connect old anonymous ID to new identified ID
 * This merges the anonymous user's history into the identified user's profile
 */
async function createAlias(oldAnonymousId, newIdentifiedId) {
    if (!oldAnonymousId || !newIdentifiedId) {
        console.log('Cannot create alias: missing oldAnonymousId or newIdentifiedId');
        return false;
    }
    
    // Don't alias if they're the same
    if (oldAnonymousId === newIdentifiedId) {
        console.log('Skipping alias: IDs are the same');
        return false;
    }
    
    console.log('Creating alias:', { oldAnonymousId, newIdentifiedId });
    
    const response = await fetch(`${POSTHOG_HOST}/capture/`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            api_key: POSTHOG_API_KEY,
            event: '$create_alias',
            distinct_id: newIdentifiedId,  // The new "main" identity (hashed email)
            properties: {
                alias: oldAnonymousId,     // The old anonymous ID to merge in
                $lib: 'cloudflare-worker'
            },
            timestamp: new Date().toISOString()
        })
    });
    
    console.log('Alias response status:', response.status);
    return response.ok;
}

/**
 * Handle order_created event (for one-time purchases or lead magnets)
 */
async function handleOrderCreated(data) {
    const order = data.data?.attributes;
    const email = order?.user_email;
    
    // Lemon Squeezy can put custom data in different places - check all of them
    const metaCustomData = data.meta?.custom_data || {};
    const orderCustomData = order?.custom_data || {};
    const firstOrderItemCustomData = order?.first_order_item?.custom_data || {};
    
    // Log all possible locations to debug
    console.log('=== DEBUG: Custom Data Locations ===');
    console.log('meta.custom_data:', JSON.stringify(metaCustomData));
    console.log('data.attributes.custom_data:', JSON.stringify(orderCustomData));
    console.log('first_order_item.custom_data:', JSON.stringify(firstOrderItemCustomData));
    
    if (!email) {
        console.error('No email in order');
        return;
    }
    
    const hashedEmail = await hashEmail(email);
    
    // Get PostHog anonymous ID - check all possible locations
    const posthogId = metaCustomData.posthog_id 
        || orderCustomData.posthog_id 
        || firstOrderItemCustomData.posthog_id 
        || null;
    
    console.log('=== Extracted Values ===');
    console.log('hashedEmail:', hashedEmail);
    console.log('posthogId:', posthogId);
    
    // Step 1: If we have the anonymous PostHog ID, merge it with the hashed email
    if (posthogId && posthogId !== hashedEmail) {
        console.log('Merging users: connecting OLD anonymous ID to NEW hashed email...');
        console.log(`  OLD (anonymous): ${posthogId}`);
        console.log(`  NEW (identified): ${hashedEmail}`);
        
        // Method 1: Create alias (old → new)
        const aliasSuccess = await createAlias(posthogId, hashedEmail);
        console.log('Alias result:', aliasSuccess ? 'SUCCESS' : 'FAILED');
        
        // Method 2: Also send $identify from the anonymous ID's perspective
        // This tells PostHog "the anonymous user is now identified as hashed email"
        const identifyResponse = await fetch(`${POSTHOG_HOST}/capture/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                api_key: POSTHOG_API_KEY,
                event: '$identify',
                distinct_id: hashedEmail,
                properties: {
                    $anon_distinct_id: posthogId,
                    $lib: 'cloudflare-worker'
                },
                timestamp: new Date().toISOString()
            })
        });
        console.log('Identify result:', identifyResponse.ok ? 'SUCCESS' : 'FAILED');
        
    } else if (!posthogId) {
        console.log('No posthog_id found in any custom_data location - cannot merge');
    }
    
    // Step 2: Send checkout_completed event (using hashed email as distinct_id)
    const properties = {
        order_id: data.data?.id,
        order_number: order?.order_number,
        total: order?.total,
        currency: order?.currency,
        status: order?.status,
        product_name: order?.first_order_item?.product_name,
        variant_name: order?.first_order_item?.variant_name,
        // Include anonymous PostHog ID for reference
        anonymous_posthog_id: posthogId,
        // Include hashed email for verification
        hashed_email: hashedEmail
    };
    
    console.log('Sending checkout_completed to PostHog with distinct_id:', hashedEmail);
    
    const success = await sendToPostHog('checkout_completed', hashedEmail, properties);
    
    if (success) {
        console.log('PostHog checkout_completed event sent successfully');
    } else {
        console.error('Failed to send PostHog event');
    }
}

/**
 * Handle subscription_created event
 */
async function handleSubscriptionCreated(data) {
    const subscription = data.data?.attributes;
    const email = subscription?.user_email;
    
    if (!email) return;
    
    const hashedEmail = await hashEmail(email);
    
    const properties = {
        subscription_id: data.data?.id,
        status: subscription?.status,
        product_name: subscription?.product_name,
        variant_name: subscription?.variant_name,
        hashed_email: hashedEmail
    };
    
    await sendToPostHog('subscription_created', hashedEmail, properties);
}

/**
 * Handle license_key_created event
 */
async function handleLicenseKeyCreated(data) {
    const license = data.data?.attributes;
    const email = license?.user_email;
    
    if (!email) return;
    
    const hashedEmail = await hashEmail(email);
    
    const properties = {
        license_id: data.data?.id,
        license_key: license?.key,  // The actual license key
        status: license?.status,
        hashed_email: hashedEmail
    };
    
    await sendToPostHog('license_key_created', hashedEmail, properties);
}

/**
 * Cloudflare Worker entry point
 */
export default {
    async fetch(request, env, ctx) {
        const url = new URL(request.url);
        
        // Health check endpoint
        if (url.pathname === '/health') {
            return new Response('OK', { status: 200 });
        }
        
        // Webhook endpoint
        if (url.pathname === '/webhook/lemonsqueezy') {
            return handleWebhook(request, env);
        }
        
        return new Response('Not found', { status: 404 });
    }
};

