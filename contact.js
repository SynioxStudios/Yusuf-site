/**
 * Vercel serverless function — contact form relay
 *
 * Place this in /api inside your repo. Vercel picks it up automatically.
 *
 * Why it exists:
 *   1. The Discord webhook URL never reaches the browser, so nobody can copy it
 *   2. The Cloudflare Turnstile token is verified here, server-side, so bots cannot post
 *   3. Extra layer: honeypot field + per-IP rate limit + input trimming
 *
 * Set both values as environment variables in the Vercel dashboard:
 *   WEBHOOK_URL       -> your Discord webhook URL
 *   TURNSTILE_SECRET  -> the secret key from your Cloudflare Turnstile widget
 */

const WINDOW_MS = 60 * 60 * 1000;
const MAX_PER_HOUR = 5;

const hits = new Map();

function rateLimited(ip) {
  const now = Date.now();
  const list = (hits.get(ip) || []).filter((t) => now - t < WINDOW_MS);

  if (list.length >= MAX_PER_HOUR) return true;

  list.push(now);
  hits.set(ip, list);

  if (hits.size > 5000) {
    for (const [key, times] of hits) {
      if (!times.some((t) => now - t < WINDOW_MS)) hits.delete(key);
    }
  }
  return false;
}

function clean(value, max) {
  return String(value == null ? '' : value)
    .replace(/[\u2000-\u206F\u2E00-\u2E7F]/g, '')
    .trim()
    .slice(0, max);
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});

  if (clean(body.website, 100)) {
    res.status(200).json({ ok: true });
    return;
  }

  const ip =
    (req.headers['x-forwarded-for'] || '').toString().split(',')[0].trim() ||
    (req.headers['x-real-ip'] || 'unknown').toString();

  if (rateLimited(ip)) {
    res.status(429).json({ error: 'Too many messages from this connection. Try again later.' });
    return;
  }

  const secret = process.env.TURNSTILE_SECRET;

  if (secret) {
    const token = clean(body.token, 2048);

    if (!token) {
      res.status(403).json({ error: 'Verification missing. Refresh the page and try again.' });
      return;
    }

    const verify = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret, response: token, remoteip: ip }),
    });
    const result = await verify.json();

    if (!result.success) {
      res.status(403).json({ error: 'Verification failed. Refresh the page and try again.' });
      return;
    }
  }

  const name = clean(body.name, 80);
  const how = clean(body.contact, 120);
  const topic = clean(body.topic, 80);
  const message = clean(body.message, 1800);

  if (!name || message.length < 10) {
    res.status(400).json({ error: 'Name and message are required.' });
    return;
  }

  const webhook = process.env.WEBHOOK_URL;

  if (!webhook) {
    res.status(500).json({ error: 'Form is not configured yet.' });
    return;
  }

  const sent = await fetch(webhook, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: 'ruling.dev · website',
      embeds: [
        {
          title: 'New message from the website',
          color: 16750863,
          fields: [
            { name: 'From', value: name, inline: true },
            { name: 'Reach them at', value: how || '*not given*', inline: true },
            { name: 'Topic', value: topic || 'general', inline: true },
          ],
          description: message,
          footer: { text: 'sent from yusuf.dev' },
          timestamp: new Date().toISOString(),
        },
      ],
    }),
  });

  if (!sent.ok) {
    res.status(502).json({ error: 'Could not deliver the message.' });
    return;
  }

  res.status(200).json({ ok: true });
}