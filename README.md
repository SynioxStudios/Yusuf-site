# Yusuf Site

Personal site for **Yusuf** (`ruling.dev`) — Roblox script & systems developer, owner of **Syniox Hub**.

Live build: static site, no framework, no build step. Open `index.html` and it runs.

## Stack

- **HTML5** — semantic sections, full meta/OG/JSON-LD for search and link previews
- **CSS** — custom properties, grid/flex layout, glass panels, scroll-driven reveal animations
- **Vanilla JavaScript** — every animation hand-written, zero dependencies, zero libraries

## Files

```
index.html              markup + all content
style.css               design system, layout, animations
script.js               particles, scroll effects, menu, form, sound engine
robots.txt              crawl rules + sitemap pointer
sitemap.xml             section URLs for Google
manifest.webmanifest    installable-app metadata, theme colour
assets/og.png           1200x630 link-preview image, generated with System.Drawing
assets/icon.svg         app / manifest icon
api/contact.js          unused serverless variant, kept for reference only
```

## Features

- Particle field background that reacts to the cursor
- Scroll reveal system with staggered delays
- Custom cursor, magnetic buttons, 3D tilt cards
- Full-screen menu with focus trap and keyboard support (`M` toggles, `Esc` closes)
- Back-to-top ring that doubles as a live scroll percentage readout
- Hero parallax — the first screen drifts up and dissolves as you leave it
- Animated counters, skill rings and progress bars
- Typing terminal and text-scramble text effects
- Web Audio sound effects (toggle in the top bar, no audio files)
- Contact form with live character count and `Ctrl`+`Enter` to send
- Works without JavaScript — `<noscript>` strips the preloader and links to Discord
- Responsive down to 320px, respects `prefers-reduced-motion`

## Contact

Discord: [ruling.dev](https://discord.gg/DbAU5Z6HPd) · `@ruling.dev`

## Deploy

Any static host works — GitHub Pages, Vercel, Netlify, Cloudflare Pages.
Upload the files as-is to the root of the site.

---

## Getting indexed by Google

`robots.txt`, `sitemap.xml` and the `manifest.webmanifest` are already in the repo — upload them to
the site root alongside the HTML and that part is done. What is left needs your Google account, so
do these by hand:

1. Deploy the site at its real address (`https://yusuf.dev/` — or wherever the repo is served from).
2. Go to [search.google.com/search-console](https://search.google.com/search-console) → **Add property**
   → **URL prefix** → enter the address. **Domain** type needs DNS verification, so pick URL prefix
   unless you already manage DNS.
3. Verify. The easiest method is the **HTML tag**: copy the meta tag Google shows you and put it in
   `<head>` of `index.html`.
4. Paste this meta tag into `index.html` (Google gives you the exact value):
   ```html
   <meta name="google-site-verification" content="PASTE_GOOGLES_VALUE">
   ```
5. Back in Search Console → **Sitemaps** → submit `sitemap.xml`. Because it is a single-page site,
   list the section anchors (`/#story`, `/#work`, …) too if you want them indexed as separate results.
6. **URL Inspection** → paste the live URL → **Request indexing**. That is the one action that
   actually asks Google to crawl you now rather than whenever it gets around to it.

The `Person` JSON-LD block in `<head>` is already there and valid — it is what puts the "person"
rich result (and the Discord/YouTube/TikTok/Roblox profile links) under your name in Google.

> Update the domain in `robots.txt`, `sitemap.xml`, the `<link rel="canonical">` and every
> `og:url` if you end up serving from somewhere other than `yusuf.dev`. Google treats a mismatch
> between canonical and sitemap as a signal to ignore the sitemap.

---

## Contact form: how it actually works

The site is static (GitHub Pages, Cloudflare Pages, Netlify), so there is no server to relay the
form. It posts **straight to the Discord webhook from the browser**, and the webhook URL sits in the
`CONFIG` block at the top of `script.js`.

### 1. Paste your webhook URL

The webhook is already wired in `CONFIG.webhookUrl` at the top of `script.js`.

```js
var CONFIG = {
  webhookUrl: 'https://discord.com/api/webhooks/…',
  turnstileSitekey: '0x4AAAAAAFTM_22mdauosyR5'
};
```

Discord → channel settings → Integrations → Webhooks → Copy Webhook URL.

> **Rotate it.** A webhook URL is a password. If it has ever been pasted into a chat, an
> issue, a commit you pushed, or anywhere you pasted this README from — delete it
> (Discord → Integrations → Webhooks → Delete Webhook) and create a new one. The old URL
> keeps working forever, for whoever still has it.

The site key is already filled in. If you make your own Turnstile widget, add your host under
**Domains** in the dashboard or the widget will refuse to issue a token.

### What you are protected by, and what you are not

Being straight about this, because it matters:

- **Not protected:** the webhook URL. It is in `script.js`, so anyone can read it in view-source and
  post to your channel directly, bypassing the form entirely.
- **Not protected:** the Turnstile token. Verifying a token needs a secret key and a server to call
  Cloudflare with. There is no server here, so the token is never checked.
- **Mildly protected:** casual form spam. A human has to be in a browser to get past the widget.

Turnstile is wired up to **fail open**: if the script is blocked or the widget errors, the form still
sends rather than becoming unusable. A captcha you cannot debug on GitHub Pages is worse than none.

If the channel ever matters, the fix is small. `api/contact.js` is still in the repo and already does
the whole job — move the site to Vercel, set `WEBHOOK_URL` and `TURNSTILE_SECRET` in the dashboard,
and point the form back at `/api/contact`. That version keeps the URL out of the page, verifies the
token for real, and rate-limits each IP to 5 messages an hour.

### Turnstile cannot brick the form

The widget is a speed bump, not a lock — there is no server verifying the token, so refusing to
send buys nothing. Three things stop it from becoming a wall:

1. If `render()` throws, the script is blocked, or the site key is not registered for your domain
   (Cloudflare fires `error-callback` immediately), the gate switches itself off.
2. If no token arrives within `GATE_GRACE` (12s), the gate stops mattering.
3. Clicking Send while the widget is still solving **does not bounce you back with "try again"** —
   the form waits up to 6s for a token and then sends regardless. One click always does the job.

### Why the request looks like this

```js
fetch(CONFIG.webhookUrl, {
  method: 'POST',
  mode: 'cors',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(payload)
})
```

It is deliberately a **normal CORS request with real JSON**, because Discord's webhook endpoint
allows it: it echoes your `Origin` back in `Access-Control-Allow-Origin` and lists `Content-Type` in
`Access-Control-Allow-Headers`, so the preflight succeeds and the browser lets the response through.

That matters more than it looks. The obvious "workaround" is `mode: 'no-cors'` with a
safelisted `text/plain` body to dodge the preflight — **do not do that.** Discord answers that with

```
400  Expected "Content-Type" header to be one of
     {'application/x-www-form-urlencoded', 'multipart/form-data', 'application/json'}
```

and `no-cors` hides the 400 from JavaScript entirely: the promise resolves, the form reports
"Sent", and nothing ever reaches the channel. This site shipped that bug once.

Sending real JSON through CORS fixes both halves — the message arrives, and the response status
(`204` on success, `404` if the webhook was rotated away, `429` rate-limited, `5xx` Discord down)
is finally readable, so the form can tell the truth instead of guessing.

`allowed_mentions: { parse: [] }` is set on every payload so a pasted `@everyone` can never turn into
a live ping in the channel.

Also in place: a hidden honeypot field, a 2.5s page-open check, a 20s per-browser cooldown, field
trimming and length caps, and `allowed_mentions: { parse: [] }` so nobody can paste an `@everyone`
into a live channel.