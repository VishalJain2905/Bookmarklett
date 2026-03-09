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

- **Captcha** page with four math symbols (+, −, ×, ÷), timer, and “Mark As Done”
- Click symbols → counts update in the answer area and in **localStorage**
- Click **Mark As Done** → math question appears (e.g. `2 + 6 = ?`)
- Enter the correct answer and click **Submit** → redirect to `education.html`
- 20-second countdown; after 0, “Time’s up” or inputs are disabled

## Files

- `index.html` – Landing page (WORK WITH US → captcha)
- `captcha.html` – Verification + challenges (drag to bookmark, click 15×)
- `download.html` – Triggers PDF download, then redirects to exodus.com
- `style.css` – Styles
- `script.js` – Flow, bookmarklet, timer
- `education.html` – Education page
- `assets/*` – PDF, images, SVGs

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

3. **Bookmarklet URL (optional):** After deploy you get a URL like `https://your-project.vercel.app`. In `captcha.html` you can set `<meta name="captcha-base-url" content="https://your-project.vercel.app">` so the bookmarklet uses it; if left empty, the script uses `location.origin` so it works on the deployed URL.

4. **Test:** Open your Vercel URL → complete the flow → add bookmarklet → test 15 clicks → PDF download → redirect to exodus.com.
# Bookmarklett
