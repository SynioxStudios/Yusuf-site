# Yusuf Site

Personal site for **Yusuf** (`ruling.dev`) — Roblox script & systems developer, owner of **Syniox Hub**.

Live build: static site, no framework, no build step. Open `index.html` and it runs.

## Stack

- **HTML5** — semantic sections, full meta/OG/JSON-LD for search and link previews
- **CSS** — custom properties, grid/flex layout, glass panels, scroll-driven reveal animations
- **Vanilla JavaScript** — every animation hand-written, zero dependencies, zero libraries

## Files

```
index.html          markup + all content
style.css           design system, layout, animations
script.js           particles, scroll effects, menu, form, sound engine
api/contact.js      Vercel function that relays the contact form
```

## Features

- Particle field background that reacts to the cursor
- Scroll reveal system with staggered delays
- Custom cursor, magnetic buttons, 3D tilt cards
- Full-screen menu with focus trap and keyboard support
- Animated counters, skill rings and progress bars
- Typing terminal and text-scramble text effects
- Web Audio sound effects (toggle in the top bar, no audio files)
- Contact form that posts straight to a Discord webhook
- Responsive down to 360px, respects `prefers-reduced-motion`

## Contact

Discord: [ruling.dev](https://discord.gg/DbAU5Z6HPd) · `@ruling.dev`

## Deploy

Any static host works — GitHub Pages, Vercel, Netlify, Cloudflare Pages.
Upload the files as-is to the root of the site.

---

## Contact form: keeping the Discord webhook secret

Posting straight to a Discord webhook from the browser means the webhook URL sits in `script.js`,
where anyone can read it in the developer tools and spam the channel. So the form posts to
`/api/contact` instead — a Vercel serverless function that holds the URL in an environment variable
and verifies a **Cloudflare Turnstile** token server-side before anything is delivered.

### 1. Deploy first, so you know your address

Push the repo to GitHub, import it on Vercel and deploy once. Vercel then gives you an address
like `yusuf-new-site.vercel.app`. You need that address for the next step.

### 2. Create the Turnstile widget

1. Go to [dash.cloudflare.com](https://dash.cloudflare.com) and sign in (the account is free)
2. Left menu → **Turnstile** → **Add widget**
3. Widget name: `yusuf site` · Widget mode: **Managed**
4. Under **Domains**, add the host only, without `https://` and without the path:
   `yusuf-new-site.vercel.app`
5. **Create** → copy the **Site Key** and keep the **Secret Key** open

### 3. Add the two secrets in Vercel

On the Vercel project: **Settings → Environment Variables → Add**

| Name               | Value                                  | Environment |
| ------------------ | -------------------------------------- | ----------- |
| `WEBHOOK_URL`      | your full Discord webhook URL          | Production  |
| `TURNSTILE_SECRET` | the Secret Key from the Turnstile page | Production  |

Then redeploy the project so it picks them up.

### 4. Turn it on in the code

In `script.js`, at the very top:

```js
turnstileSitekey: 'PASTE_TURNSTILE_SITE_KEY',   // <- put the Site Key here
```

Push again. The form now goes through `/api/contact`, Turnstile appears automatically, and you can
delete the `fallbackWebhook` line from the `CONFIG` block.

> To test locally, Turnstile has keys that always pass:
> site key `1x00000000000000000000AA`, secret `1x0000000000000000000000000000000AA`.

### What the function adds

- Keeps the webhook URL in a server-side variable, never in the published HTML or JS
- Verifies the Turnstile token, so bots cannot post
- Silently drops anything that fills the hidden honeypot field
- Rate limits each IP to 5 messages per hour
- Trims and length-limits every field before it reaches Discord