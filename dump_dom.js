import { chromium } from 'playwright';
import fs from 'fs';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('BROWSER_CONSOLE:', msg.text()));
  page.on('pageerror', err => console.log('BROWSER_ERROR:', err.message));

  await page.goto('http://localhost:5173/');
  
  // Wait for 2 seconds to let React render
  await page.waitForTimeout(2000);
  
  const html = await page.content();
  fs.writeFileSync('page_dump.html', html);
  
  await browser.close();
})();
