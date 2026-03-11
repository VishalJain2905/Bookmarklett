# Security Awareness Demo – Captcha Phishing

Static HTML/CSS/JS demo that simulates a phishing-style captcha flow (two stages, bookmarklets, localStorage, timer).

## How to run

### Option 1: Open the file in a browser (quickest)

1. Go to the project folder: `security-awareness-demo`
2. Double-click **`index.html`**  
   **or** drag `index.html` into a browser window  
   **or** from terminal: `open index.html` (macOS) / `start index.html` (Windows)

The page will load from `file://`. Captcha, timer, and localStorage will work. If anything behaves oddly (e.g. strict file protocol), use Option 2.

### Option 2: Run a local server (recommended)

From the project folder in a terminal:

**Using npx (no install):**
```bash
cd /Users/vishal/security-awareness-demo
npx -y serve .
```
Then open **http://localhost:3000** in your browser (or the URL shown in the terminal).

**Using Python 3:**
```bash
cd /Users/vishal/security-awareness-demo
python3 -m http.server 8000
```
Then open **http://localhost:8000** in your browser.

**Using Node (if you run `npm install`):**
```bash
cd /Users/vishal/security-awareness-demo
npm start
```
Then open **http://localhost:3000**.

## What you’ll see

- **Captcha** page (“Just a moment…”): Turnstile-style checkbox, “Verify you are human and not a robot”, Cloudflare-style branding.
- Click the widget → blue dots spinner → “Success!” → “Verification successful…” → **challenge popup** opens.
- **Challenge 1:** 3×3 image grid; drag the outlined tile to your bookmarks bar (bookmarklet).
- **Challenge 2:** Click the bookmarklet 15 times (counter shown) → redirect to exodus.com. Using the bookmarklet on another site opens `download.html` (PDF + redirect).

## 2captcha demo (UI reference)

The main demo UI is based on the [Cloudflare Turnstile challenge](https://2captcha.com/demo/cloudflare-turnstile-challenge) page. A separate Puppeteer + 2captcha solver example is in **`2captcha-demo/`** for testing real Turnstile solving:

```bash
cd 2captcha-demo
npm install
# Edit example.js and set your 2captcha API key (replace 'APIKEY')
npm run solve
```

- **`example.js`** – Launches Puppeteer, injects `inject.js`, opens the 2captcha Turnstile demo, intercepts `turnstile.render` params from the console, sends them to 2captcha, and calls the page’s callback with the solved token.
- **`inject.js`** – Overrides `window.turnstile.render`, captures `sitekey`, `pageurl`, `cData`, etc., logs `intercepted-params:...` for Puppeteer, and sets `window.cfCallback` for the token.

Use this as the reference for how the real Turnstile flow looks; the root **`index.html`** mimics that look for awareness training (no real Turnstile or 2captcha).

## Files

- `index.html` – Main page: Turnstile-style widget + challenge popup (drag tile, bookmarklet, 15 clicks, redirect)
- `script.js` – Flow, bookmarklet builder, timers, challenge grid
- `download.html` – PDF download + redirect to exodus.com
- `2captcha-demo/` – Puppeteer + 2captcha Turnstile solver (example.js, inject.js); UI reference for the main demo
- `assets/*` – Images, PDFs

## Deploy on Vercel

1. **Push to GitHub** (if not already):
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/YOUR_USERNAME/security-awareness-demo.git
   git push -u origin main
   ```

2. **Deploy:** Go to [vercel.com](https://vercel.com) → **Add New** → **Project** → import your repo. Leave Build Command and Output Directory empty. Click **Deploy**.

3. **Bookmarklet URL (optional):** After deploy you get a URL like `https://your-project.vercel.app`. In `index.html` you can set `<meta name="captcha-base-url" content="https://your-project.vercel.app">` so the bookmarklet uses it; if left empty, the script uses `location.origin`.
4. **Test:** Open your Vercel URL → complete the flow → add bookmarklet → test 15 clicks → redirect to exodus.com.
