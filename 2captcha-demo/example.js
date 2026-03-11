/**
 * Puppeteer + 2captcha Cloudflare Turnstile solver.
 * Targets: https://2captcha.com/demo/cloudflare-turnstile-challenge
 *
 * UI reference: The main demo (../index.html) mimics this page's look and flow
 * for security awareness training. This script is for testing real Turnstile solving.
 *
 * Usage:
 *   cd 2captcha-demo && npm install
 *   Set your 2captcha API key in example.js (replace 'APIKEY'), then:
 *   node example.js
 */

import { launch } from 'puppeteer';
import { Solver } from '@2captcha/captcha-solver';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const solver = new Solver('APIKEY');

const example = async () => {
  const browser = await launch({
    headless: false,
    devtools: true,
  });

  const [page] = await browser.pages();

  const preloadFile = readFileSync(join(__dirname, 'inject.js'), 'utf8');
  await page.evaluateOnNewDocument(preloadFile);

  page.on('console', async (msg) => {
    const txt = msg.text();
    if (txt.includes('intercepted-params:')) {
      const params = JSON.parse(txt.replace('intercepted-params:', ''));
      console.log(params);

      try {
        console.log('Solving the captcha...');
        const res = await solver.cloudflareTurnstile(params);
        console.log('Solved the captcha', res.id);
        console.log(res);
        await page.evaluate((token) => {
          cfCallback(token);
        }, res.data);
      } catch (e) {
        console.log(e.err);
        process.exit(1);
      }
    }
  });

  await page.goto('https://2captcha.com/demo/cloudflare-turnstile-challenge');
};

example();
