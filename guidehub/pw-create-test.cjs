const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  const logs = [];

  page.on('console', (msg) => {
    logs.push(`console:${msg.type()}:${msg.text().substring(0, 300)}`);
  });
  page.on('pageerror', (err) => logs.push(`pageerror:${err.message}`));
  page.on('response', async (resp) => {
    const status = resp.status();
    const url = resp.url();
    if (status >= 400) {
      const body = await resp.text().catch(() => '(empty)');
      logs.push(`response:${status}:${url.substring(0, 100)}:${body.substring(0, 200)}`);
    }
  });

  // Register
  await page.goto('http://localhost:5173/register', { waitUntil: 'networkidle' });
  const ts = Date.now();
  await page.fill('#reg-name', 'Flow Test');
  await page.fill('#reg-username', `flow2_${ts}`);
  await page.fill('#reg-email', `flow2_${ts}@example.com`);
  await page.fill('#reg-password', 'Password123!');
  await page.click('text=Create account');
  await page.waitForTimeout(4000);

  // Create - Step 1
  await page.goto('http://localhost:5173/create', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  await page.fill('textarea', 'Test content here.');
  await page.click('text=Next');
  await page.waitForTimeout(1000);

  // Step 2
  await page.click('text=Next');
  await page.waitForTimeout(1000);

  // Step 3
  await page.fill('input[placeholder="Your guide title"]', 'Test Guide 2');
  await page.fill('textarea[placeholder*="Brief description"]', 'Description 2');
  await page.click('text=Review & Publish');
  await page.waitForTimeout(1000);

  // Step 4
  await page.click('text=Create & Publish');
  await page.waitForTimeout(5000);

  console.log(JSON.stringify({ logs }, null, 2));
  await browser.close();
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
