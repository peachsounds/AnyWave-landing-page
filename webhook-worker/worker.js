/**
 * Lemon Squeezy → PostHog Webhook Worker
 * 
 * Receives webhooks from Lemon Squeezy and forwards events to PostHog
 * Deploy to Cloudflare Workers
 */

// PostHog configuration
const POSTHOG_API_KEY = 'phc_Diy4fB5dTnxjkxCneauukkmdVkfw1YRm6EAejL45PG3';
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
 * Merge anonymous user into identified user using PostHog's $create_alias event
 * This links the old anonymous ID to the new identified user (hashed email)
 */
async function mergeUsers(oldAnonymousId, newIdentifiedId) {
    if (!oldAnonymousId || !newIdentifiedId) {
        console.log('Cannot merge: missing oldAnonymousId or newIdentifiedId');
        return false;
    }
    
    // Don't merge if they're the same
    if (oldAnonymousId === newIdentifiedId) {
        console.log('Skipping merge: IDs are the same');
        return false;
    }
    
    console.log('Merging users:', { oldAnonymousId, newIdentifiedId });
    
    // Use $create_alias to link the anonymous ID to the identified user
    // distinct_id = the NEW primary ID (hashed email) - this stays as the main identity
    // alias = the OLD anonymous ID - this gets merged INTO the primary
    const response = await fetch(`${POSTHOG_HOST}/batch/`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            api_key: POSTHOG_API_KEY,
            batch: [
                {
                    event: '$create_alias',
                    properties: {
                        distinct_id: newIdentifiedId,
                        alias: oldAnonymousId,
                        $lib: 'cloudflare-worker'
                    },
                    timestamp: new Date().toISOString()
                }
            ]
        })
    });
    
    const responseText = await response.text();
    console.log('Alias response status:', response.status, 'body:', responseText);
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
        
        // Use the proper $identify event to merge users
        const mergeSuccess = await mergeUsers(posthogId, hashedEmail);
        console.log('Merge result:', mergeSuccess ? 'SUCCESS' : 'FAILED');
        
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
    
    // Step 3: Set user_type based on product (useful if page view didn't capture it)
    const productName = order?.first_order_item?.product_name || '';
    const isEarlyAccess = productName.toLowerCase().includes('early access');
    
    await fetch(`${POSTHOG_HOST}/capture/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            api_key: POSTHOG_API_KEY,
            event: '$set',
            distinct_id: hashedEmail,
            properties: {
                $set: {
                    user_type: isEarlyAccess ? 'early_access' : 'standard',
                    purchase_product: productName,
                    purchase_date: new Date().toISOString()
                }
            },
            timestamp: new Date().toISOString()
        })
    });
    console.log(`User type set to: ${isEarlyAccess ? 'early_access' : 'standard'}`);
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

