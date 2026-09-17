const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const SCREENS_DIR = path.join(__dirname, 'screens');
if (!fs.existsSync(SCREENS_DIR)) {
  fs.mkdirSync(SCREENS_DIR, { recursive: true });
}

async function run() {
  console.log('Launching installed Google Chrome...');
  const browser = await puppeteer.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: "new",
    defaultViewport: { width: 1280, height: 900 },
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
  });

  const page = await browser.newPage();
  console.log('Navigating to https://trial.nxtjob.ai/ ...');
  await page.goto('https://trial.nxtjob.ai/', { waitUntil: 'networkidle2', timeout: 30000 });

  await page.screenshot({ path: path.join(SCREENS_DIR, '01_landing_initial.png') });
  console.log('Saved 01_landing_initial.png');

  // Look for email input
  try {
    await page.waitForSelector('input[type="email"], input[name="identifier"], input[placeholder*="email"]', { timeout: 10000 });
    console.log('Found email input, typing givemetry7@gmail.com ...');
    const input = await page.$('input[type="email"], input[name="identifier"], input[placeholder*="email"]');
    await input.type('givemetry7@gmail.com', { delay: 50 });

    await page.screenshot({ path: path.join(SCREENS_DIR, '02_email_entered.png') });
    console.log('Saved 02_email_entered.png');

    // Click the specific email Continue button (not Google)
    console.log('Clicking the email Continue button...');
    const buttons = await page.$$('button');
    let clicked = false;
    for (const btn of buttons) {
      const text = await page.evaluate(el => el.innerText, btn);
      if (text && text.trim().toLowerCase().startsWith('continue') && !text.toLowerCase().includes('google')) {
        console.log('Found email continue button:', text);
        await btn.click();
        clicked = true;
        break;
      }
    }

    if (!clicked) {
      console.log('Fallback: pressing Enter on email input');
      await page.keyboard.press('Enter');
    }

    await new Promise(r => setTimeout(r, 4000));
    await page.screenshot({ path: path.join(SCREENS_DIR, '03_after_continue.png') });
    console.log('Saved 03_after_continue.png');

    // Check if password or code input is present
    const content = await page.content();
    console.log('Page title / text after continue:', await page.title());

    // Check for password
    const passwordInput = await page.$('input[type="password"]');
    if (passwordInput) {
      console.log('Password input detected, entering password...');
      await passwordInput.type('CareerCopilot#2026', { delay: 50 });
      await page.keyboard.press('Enter');
      await new Promise(r => setTimeout(r, 4000));
      await page.screenshot({ path: path.join(SCREENS_DIR, '04_after_password.png') });
      console.log('Saved 04_after_password.png');
    }

    // Check for verification code input
    const codeInputs = await page.$$('input[name="code"], input[autocomplete="one-time-code"], input[placeholder*="code"], input[inputmode="numeric"]');
    if (codeInputs.length === 6) {
      console.log('Found 6 digit inputs for verification code, entering 204707...');
      const codeDigits = '204707'.split('');
      for (let i = 0; i < 6; i++) {
        await codeInputs[i].type(codeDigits[i], { delay: 100 });
      }
      await new Promise(r => setTimeout(r, 4000));
      await page.screenshot({ path: path.join(SCREENS_DIR, '05_after_code_entered.png') });
      console.log('Saved 05_after_code_entered.png');
    } else if (codeInputs.length > 0) {
      console.log('Found single verification code input, entering 204707...');
      await codeInputs[0].type('204707', { delay: 100 });
      await page.keyboard.press('Enter');
      await new Promise(r => setTimeout(r, 4000));
      await page.screenshot({ path: path.join(SCREENS_DIR, '05_after_code_entered.png') });
      console.log('Saved 05_after_code_entered.png');
    }

    // Wait and capture what comes next (trial onboarding, questions, dashboard)
    await new Promise(r => setTimeout(r, 5000));
    await page.screenshot({ path: path.join(SCREENS_DIR, '06_trial_screen_after_auth.png') });
    console.log('Saved 06_trial_screen_after_auth.png');

    // Explore if there is a Welcome or Experience step
    const nextButtons = await page.$$('button');
    for (const btn of nextButtons) {
      const bText = await page.evaluate(el => el.innerText, btn);
      if (bText && (bText.includes('Start') || bText.includes('Next') || bText.includes('Continue') || bText.includes('Upload'))) {
        console.log('Clicking trial progression button:', bText);
        await btn.click();
        await new Promise(r => setTimeout(r, 4000));
        await page.screenshot({ path: path.join(SCREENS_DIR, '07_next_step.png') });
        console.log('Saved 07_next_step.png');
        break;
      }
    }

    // Capture state of document
    const visibleText = await page.evaluate(() => document.body.innerText);
    console.log('VISIBLE TEXT SUMMARY:\n', visibleText.slice(0, 800));

  } catch (err) {
    console.error('Error during automation:', err.message);
    await page.screenshot({ path: path.join(SCREENS_DIR, 'error_state.png') });
  } finally {
    await browser.close();
    console.log('Browser closed.');
  }
}

run().catch(console.error);
